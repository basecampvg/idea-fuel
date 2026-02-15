# Research Pipeline - Full Breakdown

## Pipeline Overview

```
User clicks "Start Research"
        ↓
[Phase 1] DEEP_RESEARCH ── o3-deep-research (PRO) / o4-mini-deep-research (FREE)
        ↓
[Phase 2] SOCIAL_RESEARCH ── Brave Search + Claude Sonnet extraction
        ↓
[Phase 3] SYNTHESIS ── Claude Sonnet + GPT-5.2 extraction (parallel)
        ↓
[Phase 4] REPORT_GENERATION ── Claude Sonnet generation (parallel)
        ↓
Research Complete → stored in DB
```

---

## Input (What Starts the Pipeline)

The pipeline receives a `ResearchInput`:

| Field | Type | Source |
|-------|------|--------|
| `ideaTitle` | string | Project title |
| `ideaDescription` | string | Project description |
| `interviewData` | Partial\<InterviewDataPoints\> | Structured data from AI interview |
| `interviewMessages` | Array\<{role, content}\> | Full interview conversation history |
| `canvasContext` | string (optional) | Founder's notes snapshot |

The router (`packages/server/src/routers/research.ts`) creates/resumes a Research record, then enqueues a BullMQ job.

---

## Phase 1: Deep Research (30-60+ min)

**File:** `packages/server/src/services/research-ai.ts` (lines 335-673)

**Model:**
- `o3-deep-research-2025-06-26` (PRO/ENTERPRISE tier)
- `o4-mini-deep-research-2025-06-26` (FREE tier)

**How it works:** `runChunkedDeepResearch()` fires **5 sequential focused research calls**, each with a different domain focus, with **2-minute delays** between chunks to stay under the 200k TPM rate limit.

| Chunk | Focus | Target Domains | Progress |
|-------|-------|----------------|----------|
| 1 | Market Analysis | Market research + startup sites | 5-10% |
| 2 | Competitor Research | Competitor + startup sites | 10-15% |
| 3 | Customer Pain Points | Reddit, Twitter, HackerNews, forums | 15-20% |
| 4 | Timing & Validation | Market domains | 20-25% |
| 5 | Market Sizing (TAM/SAM/SOM) | Statista, IBISWorld, GrandView, McKinsey, BCG | 25-30% |

**Config:** 50,000 max output tokens per chunk, 60-min timeout, 15s polling interval, 3 retry attempts with exponential backoff.

**Query expansion** (`packages/server/src/lib/query-expansion.ts`) runs in parallel during chunks 2-5, generating variations from 3 sources: 17 deterministic templates (free), LLM-generated keywords, and SerpAPI rising queries (budget-permitting).

**Output** (`DeepResearchOutput`):

```typescript
{
  rawReport: string            // Full research document with findings
  citations: [{title, url, snippet}]  // Source references
  sources: string[]            // Unique source URLs
  searchQueriesUsed: string[]  // Queries the model actually executed
}
```

**Resume support:** If a chunk fails, `existingChunks` lets the pipeline skip already-completed chunks on retry.

---

## Phase 2: Social Research (3-5 min)

**Provider:** Brave Search (primary) with OpenAI web_search_preview fallback

**How it works:** Searches social platforms for real user pain points, complaints, and demand signals related to the idea. Extracts structured posts with sentiment analysis.

**Fallback triggers:** If Brave returns < 5 posts or < 500 total words, falls back to OpenAI search.

**Output** (`SocialProof`):

```typescript
{
  posts: [{
    platform: 'reddit' | 'twitter' | 'hackernews' | 'indiehackers' | 'producthunt' | ...
    author: string
    content: string
    url: string
    engagement: { likes, comments, upvotes, shares }
    sentiment: 'positive' | 'negative' | 'neutral'
    relevanceScore: number  // 1-10
    date: string
  }]
  summary: string
  painPointsValidated: string[]
  demandSignals: string[]
  sources: string[]
}
```

---

## Phase 3: Synthesis / Extraction (2-5 min)

**Models:** Claude Sonnet (Anthropic) for insight extraction, GPT-5.2 for scoring

Runs **4 parallel extractions** against the raw deep research:

### 3a. `extractInsights()` — Claude Sonnet, 25,000 tokens

**Output** (`SynthesizedInsights`):

- **marketAnalysis** — size, growth, trends, opportunities, threats, dynamics, key metrics, adjacent markets
- **competitors** — name, description, strengths, weaknesses, positioning, funding, revenue, pricing, vulnerability
- **painPoints** — problem, severity, current solutions, gaps, affected segment, frequency, cost of inaction, emotional impact, evidence quotes
- **positioning** — UVP, target audience, differentiators, messaging pillars, ICP, competitive positioning
- **whyNow** — market triggers, timing factors, urgency score (0-100), window of opportunity, catalysts
- **proofSignals** — demand indicators, validation opportunities, risk factors, validation experiments
- **keywords** — primary, secondary, long-tail

### 3b. `extractScores()` — GPT-5.2, 4,000 tokens × 3 passes

Runs **3 independent scoring passes** and averages them for reliability:

| Score | Range | What it measures |
|-------|-------|-----------------|
| `opportunityScore` | 0-100 | Overall market opportunity |
| `problemScore` | 0-100 | How real/painful the problem is |
| `feasibilityScore` | 0-100 | How buildable/executable |
| `whyNowScore` | 0-100 | Timing and urgency |

If deviation > 15 points between passes, the result is **flagged as unreliable**. Metadata includes `passCount`, `maxDeviation`, `averageConfidence`.

### 3c. `extractBusinessMetrics()` — GPT-5.2, 4,000 tokens

**Output** (`BusinessMetrics`):

- **revenuePotential** — rating, estimate, confidence, revenue model, time to first revenue, unit economics
- **executionDifficulty** — rating (easy/moderate/hard), factors, solo-friendly, MVP time estimate, critical path
- **gtmClarity** — rating (clear/moderate/unclear), channels, primary channel, estimated CAC
- **founderFit** — percentage (0-100), strengths, gaps, critical skill needed, recommended first hire

### 3d. `extractMarketSizing()` — GPT-5.2, 4,000 tokens

**Output** (`MarketSizingData`):

- **TAM/SAM/SOM** — value, formatted value, growth rate, confidence, timeframe
- **segments** — name, size, growth potential, priority
- **assumptions** — per level, with confidence and impact
- **sources** — type, URL, value
- **methodology** — explanation of how sizing was calculated

All outputs validated against Zod schemas in `packages/server/src/services/research-schemas.ts`.

---

## Phase 4: Report Generation (2-3 min)

**Model:** Claude Sonnet (Anthropic), 2,000-4,000 tokens each

Runs **4 parallel generations**:

| Function | Output | Tokens |
|----------|--------|--------|
| `generateUserStory()` | Scenario, protagonist, problem, solution, outcome, day-in-the-life narrative | 2,000 |
| `generateValueLadder()` | Pricing tiers (lead magnet → frontend → core → backend) with features + target customer | 2,000 |
| `generateActionPrompts()` | Ready-to-use action items (validate, build MVP, launch) with full prompts | 4,000 |
| `generateTechStack()` | Technology recommendations, architecture overview, complexity rating | 2,000 |

---

## Model Usage Summary

| Phase | Model | Purpose | Tokens |
|-------|-------|---------|--------|
| 1 - Deep Research | `o3-deep-research` / `o4-mini-deep-research` | Web research with real search | ~250k (50k × 5 chunks) |
| 2 - Social | Brave Search + Claude Sonnet | Search + extraction | Variable |
| 3 - Insights | Claude Sonnet (Anthropic) | Structured extraction | 25,000 |
| 3 - Scores | GPT-5.2 | 3-pass scoring | 12,000 (4k × 3) |
| 3 - Metrics | GPT-5.2 | Business metrics | 4,000 |
| 3 - Sizing | GPT-5.2 | TAM/SAM/SOM | 4,000 |
| 4 - Generation | Claude Sonnet (Anthropic) | Creative content | ~10,000 |
| **Total** | | | **~300-400k tokens** |

---

## Error Handling & Resilience

- **Error classification:** timeout, rate_limit, transient (502/503/504), api_error, parse_error, sla_exceeded
- **Retry:** `withExponentialBackoff()` — 3-5 attempts, 2-120s delay, ±20% jitter
- **SLA tracking:** Deep research 50min, social 20min, synthesis 10min, generation 10min, **total 90min**
- **Resume:** Pipeline detects which phases have data and skips completed ones
- **Backfill:** `research.backfill()` endpoint re-runs only missing Phase 4 outputs without re-running expensive Phases 1-3

---

## Timing

| Phase | Typical Duration | Why |
|-------|-----------------|-----|
| Deep Research | 30-60+ min | o3 does real web search, 5 chunks with 2-min gaps |
| Social Research | 3-5 min | Parallel web searches |
| Synthesis | 2-5 min | 4 parallel extractions |
| Report Generation | 2-3 min | 4 parallel generations |
| **Total** | **37-73+ min** | Dominated by Phase 1 |

---

## Key File Reference

| File | Purpose |
|------|---------|
| `packages/server/src/services/research-ai.ts` | Main orchestration (~4500 lines) |
| `packages/server/src/services/research-schemas.ts` | Zod validation schemas |
| `packages/server/src/routers/research.ts` | tRPC endpoints, BullMQ job queueing |
| `packages/server/src/lib/deep-research.ts` | Polling, background mode utilities |
| `packages/server/src/lib/query-expansion.ts` | Query variation generation |
| `packages/server/src/lib/serpapi.ts` | Google Trends + rising queries |
| `packages/server/src/lib/quality-scoring.ts` | Data quality assessment |
| `packages/server/src/services/config.ts` | SLA and model configuration |

---

## Database Storage

The Research record stores all phase outputs as JSONB columns:

```
// Phase 1
rawDeepResearch        → DeepResearchOutput

// Phase 2
socialProof            → SocialProof

// Phase 3
synthesizedInsights    → SynthesizedInsights
opportunityScore       → number (0-100)
problemScore           → number (0-100)
feasibilityScore       → number (0-100)
whyNowScore            → number (0-100)
scoreJustifications    → ResearchScores['justifications']
scoreMetadata          → ResearchScores['metadata']
revenuePotential       → BusinessMetrics.revenuePotential
executionDifficulty    → BusinessMetrics.executionDifficulty
gtmClarity             → BusinessMetrics.gtmClarity
founderFit             → BusinessMetrics.founderFit
marketSizing           → MarketSizingData

// Phase 4
userStory              → UserStory
valueLadder            → OfferTier[]
actionPrompts          → ActionPrompt[]
techStack              → TechStackData

// Denormalized (from synthesizedInsights for faster reads)
marketAnalysis, competitors, painPoints, positioning, whyNow, proofSignals, keywords

// Metadata
status                 → IN_PROGRESS | COMPLETE | FAILED
currentPhase           → DEEP_RESEARCH | SOCIAL_RESEARCH | SYNTHESIS | REPORT_GENERATION | COMPLETE
progress               → 0-100
notesSnapshot          → string
startedAt, completedAt → Date
errorMessage, errorPhase → string (if FAILED)
retryCount             → number
```
