# @forge/server

Backend server package for Forge Automation BETA.

## Tech Stack

- **tRPC** - Type-safe API layer
- **Prisma** - Database ORM
- **OpenAI** - AI models (GPT-5.2, o3-deep-research)
- **TypeScript** - Type safety

## Scripts

```bash
pnpm dev          # Start dev server with hot reload
pnpm build        # Build TypeScript
pnpm type-check   # Type check without emitting
pnpm test         # Run tests in watch mode
pnpm test:run     # Run tests once
pnpm test:coverage # Run tests with coverage
```

## Database Commands

```bash
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open Prisma Studio
```

---

## Handling Incomplete Responses / max_output_tokens

### Problem

Reasoning models (GPT-5.2, o3) can consume output token budget on hidden reasoning before producing visible JSON. When `max_output_tokens` is hit, the response may have `status: incomplete` with little/no visible content.

**Error:** `Failed to extract market sizing: no content found in response (status: incomplete)`

### Root Cause

The OpenAI Responses API returns `status: incomplete` when:
- The model's reasoning/tool planning consumes most of the output token budget
- The `max_output_tokens` limit is reached before visible content is generated
- Higher reasoning effort (`xhigh`) increases token consumption on hidden reasoning

### Solution

The market sizing extraction (`extractMarketSizing` in `research-ai.ts`) implements a multi-layer fix:

#### 1. AI Preset Changes (Primary Prevention)

For JSON mode outputs, reasoning effort is capped at `high` instead of `xhigh`:

```typescript
// In openai.ts
extractMarketSizing: {
  FREE: { reasoning: 'medium', verbosity: 'low' },
  PRO: { reasoning: 'medium', verbosity: 'low' },
  ENTERPRISE: { reasoning: 'high', verbosity: 'low' },  // Was xhigh
}
```

#### 2. Adaptive Token Limits

Token budget scales with input size:

| Input Size | Reasoning | Token Limit |
|------------|-----------|-------------|
| Small (<10k chars) | medium/high | 12,000 |
| Large (>10k chars) | medium/high | 16,000 |
| Any | xhigh | 18,000+ |

Maximum cap: 25,000 tokens

#### 3. Constrained Prompts

Output size is bounded by enforcing exact counts:

- segments: EXACTLY 3 items (2 on final retry)
- geographicBreakdown: EXACTLY 3 items
- assumptions: EXACTLY 9 items (3 per level)
- sources: MAX 6 items (4 on final retry)
- descriptions: MAX 20 words (12 on final retry)
- methodology: MAX 2 sentences

#### 4. Retry Strategy

When a response fails (incomplete, empty, parse error, validation error):

| Attempt | Token Adjustment | Reasoning | Prompt |
|---------|------------------|-----------|--------|
| 1 | Adaptive (12k-18k) | downgraded from xhigh | Standard constraints |
| 2 | +50% (up to 25k) | downgrade one step | Add "Return ONLY JSON" |
| 3 | Same high limit | medium | Tighter constraints |

#### 5. Resilient Parsing

- Extracts text from all response locations (`output_text`, `output[]` array, legacy `choices[]`)
- JSON isolation fallback: finds first `{` to last `}` if direct parse fails
- Does NOT do aggressive JSON repair (fails cleanly instead)

#### 6. Validation

Before accepting a response, validates:
- Required keys present: `tam`, `sam`, `som`, `segments`, `assumptions`, `sources`, `methodology`
- Numeric fields are numbers
- Confidence is `high|medium|low`
- Values are in millions USD (warns if > 1M millions)

### Telemetry

Each call logs:
- Response ID
- Status + incomplete_details
- Token usage (input/output/total)
- Config (max_output_tokens, reasoning effort)
- Raw text length
- Parse success/failure reason

Example log output:
```
[Extract Market Sizing] === TELEMETRY ===
  Attempt: 1/3
  Response ID: resp_abc123
  Status: incomplete
  Usage: input=2000, output=8000, total=10000
  WARNING: output_tokens equals max_output_tokens (may indicate truncation)
  Config: max_output_tokens=8000, reasoning=high
  Raw text length: 0
  Parse success: false
  Failure reason: incomplete_response
  Incomplete details: {"reason":"max_output_tokens"}
[Extract Market Sizing] === END TELEMETRY ===
```

### Configuration

Token limits and reasoning defaults in `research-ai.ts`:

```typescript
const MARKET_SIZING_BASE_TOKENS = 12000;
const MARKET_SIZING_MAX_TOKENS = 25000;

const REASONING_DOWNGRADE = {
  'xhigh': 'high',
  'high': 'medium',
  'medium': 'medium',
  'low': 'low',
  'none': 'none',
};
```

### Testing

Run market sizing tests:

```bash
pnpm test src/services/__tests__/market-sizing.test.ts
```

Tests cover:
- Valid JSON parsing
- JSON isolation from wrapped text
- Incomplete response retry trigger
- Partial JSON handling
- Missing key validation
- Telemetry logging
