---
title: "feat: Front-Loaded Query Intelligence for Trend Validation"
type: feat
date: 2026-02-06
brainstorm: docs/brainstorms/2026-02-06-trend-validation-robustness-brainstorm.md
---

# feat: Front-Loaded Query Intelligence for Trend Validation

## Overview

Both the Spark (quick validation) and full research pipelines consistently return thin, sparse results — not because of errors, but because search queries are too literal and don't cover enough angles. This feature adds a front-loaded query expansion system that generates richer search variations before any data gathering begins, adds per-section data quality scoring, and surfaces confidence indicators to users.

## Problem Statement

**Current behavior:** The Spark pipeline generates 6 keyword phrases + 10-20 synonyms via a single GPT-4o-mini call, then passes them verbatim to 3 parallel deep research calls. The full research pipeline relies entirely on the deep research model to generate its own queries. Neither pipeline expands queries, checks result quality, or reports confidence.

**Symptoms:**
- Reddit/Facebook/competitor sections frequently return 0-2 results when 5-10+ exist online
- Users can manually find relevant data that the pipelines missed
- No way for users to know if results are well-supported or sparse
- SerpAPI has expansion functions (`fetchRelatedRisingQueries`, `getTrendingExpanded`) that are only wired to Daily Pick, not to either pipeline

**Root causes:**
1. Queries are too literal — miss colloquial phrasing, adjacent problems, industry jargon
2. No multi-angle querying — single query per concept instead of 5-8 variations
3. No quality assessment — thin results accepted silently
4. Existing expansion infrastructure unused by validation pipelines

## Proposed Solution

### Architecture: Enhanced Keyword Generation + Shared Expansion Module

**Design decision:** Enhance the existing `generateSparkKeywords()` function (not a separate pre-step) to reduce pipeline complexity, avoid a second GPT-4o-mini call, and keep the status flow unchanged. Create a shared `query-expansion.ts` module that both pipelines use with different configurations.

```
BEFORE:
  generateSparkKeywords() → 6 phrases + 15 synonyms + query_plan
  ↓
  3x deep research (exact queries)

AFTER:
  generateSparkKeywords() → 6 phrases + 15 synonyms + query_plan + expanded_queries
  ↓
  expandQueries() → templates + SerpAPI rising queries (if budget allows)
  ↓
  3x deep research (enriched with expanded queries)
  ↓
  computeQualityScores() → per-section confidence
```

### Component Overview

| Component | File | Purpose |
|-----------|------|---------|
| Query Expansion Module | `server/src/lib/query-expansion.ts` (NEW) | Template expansion + SerpAPI enrichment |
| Enhanced Keywords | `server/src/services/spark-ai.ts` (MODIFY) | Expand GPT-4o-mini prompt to generate more variations |
| SerpAPI Budget Tracker | `server/src/lib/serpapi-budget.ts` (NEW) | Redis-based daily usage counter |
| Quality Scoring | `server/src/lib/quality-scoring.ts` (NEW) | Thin-result detection + confidence computation |
| Spark Integration | `server/src/services/spark-demand.ts` (MODIFY) | Pass expanded queries to deep research |
| Spark Integration | `server/src/services/spark-tam.ts` (MODIFY) | Pass expanded queries to deep research |
| Spark Integration | `server/src/services/spark-competitors.ts` (MODIFY) | Pass expanded queries to deep research |
| Research Integration | `server/src/services/research-ai.ts` (MODIFY) | Inject expanded queries into prompt |
| Shared Types | `shared/src/types/index.ts` (MODIFY) | Add quality score types |
| Shared Validators | `shared/src/validators/index.ts` (MODIFY) | Add quality score schemas |
| Web UI | `web/src/app/.../spark-results.tsx` (MODIFY) | Confidence indicators |
| Mobile UI | `mobile/src/components/analysis/SparkResultsSection.tsx` (MODIFY) | Confidence indicators |

---

## Technical Approach

### Phase 1: Query Expansion Module

**New file:** `packages/server/src/lib/query-expansion.ts`

**Template expansion** — deterministic patterns applied to each keyword phrase:

```
Problem-framing:     "{kw} problems", "{kw} frustrations", "{kw} complaints"
Solution-seeking:    "how to {kw}", "best {kw}", "{kw} alternatives", "{kw} tools"
Comparison:          "{kw} vs", "{kw} comparison", "{kw} reviews"
Purchase intent:     "best {kw} 2026", "{kw} pricing", "{kw} free"
Platform-specific:   "site:reddit.com {kw}", "{kw} facebook group"
Question-form:       "why is {kw}", "can I {kw}", "is there a way to {kw}"
Pain-point:          "tired of {kw}", "{kw} sucks", "{kw} broken"
```

Apply to top 2-3 keyword phrases (not all 6) to keep query count manageable. Target: ~20-30 template-derived queries.

**SerpAPI enrichment** — wire existing `fetchRelatedRisingQueries()` from `serpapi.ts`:

- Pass top 3 keyword phrases to `fetchRelatedRisingQueries()`
- Returns rising related queries with growth percentages
- Only runs if SerpAPI daily budget permits (checked via budget tracker)
- Target: 5-15 additional queries from SerpAPI

**Deduplication:**
- Normalize all queries: lowercase, trim, collapse whitespace
- Use `Map<string, QueryVariation>` to dedupe by normalized form
- Preserve source metadata (template, serp_rising, llm_generated)

**Fallback chain:**
1. Templates always run (zero-cost, deterministic)
2. SerpAPI runs if budget permits → skip gracefully if rate-limited or budget exhausted
3. Result: minimum ~20 queries (templates only), maximum ~45 queries (templates + SerpAPI)

**Configuration interface:**

```typescript
interface ExpansionConfig {
  maxTemplateQueries: number;     // default: 30
  maxSerpApiQueries: number;      // default: 15
  serpApiEnabled: boolean;        // default: true, false when budget exhausted
  timeoutMs: number;              // default: 60000 (60s max for expansion)
  phrasesToExpand: number;        // default: 3 (expand top N phrases)
}
```

### Phase 2: Enhanced `generateSparkKeywords()`

**File:** `packages/server/src/services/spark-ai.ts` (line 84)

Modify the existing GPT-4o-mini prompt to produce richer output:

**Current output:** 6 phrases + 10-20 synonyms + query_plan (general/reddit/facebook)

**Enhanced output:** Same structure + new `expanded_queries` field:

```typescript
interface SparkKeywords {
  phrases: string[];           // 6 keyword phrases (unchanged)
  synonyms: string[];          // 10-20 synonyms (unchanged)
  query_plan: {                // (unchanged)
    general_search: string[];
    reddit_search: string[];
    facebook_groups_search: string[];
  };
  expanded_queries: string[];  // NEW: 10-15 LLM-generated variations
  expansion_notes: string;     // NEW: brief explanation of angles covered
}
```

**Enhanced prompt additions** (append to existing system prompt):

```
Additionally, generate 10-15 expanded search query variations that cover:
- How real people discuss this topic (colloquial phrasing, slang)
- Adjacent problems that indicate demand (what people complain about)
- Industry-specific jargon and technical terminology
- Question-form queries people type into Google
- Competitor comparison queries
Return these in an "expanded_queries" array.
```

This adds ~0 extra cost (same GPT-4o-mini call, just more output tokens) and ~1-2s extra latency.

### Phase 3: SerpAPI Budget Tracker

**New file:** `packages/server/src/lib/serpapi-budget.ts`

Uses existing Redis client from `packages/server/src/lib/redis.ts`.

**Mechanism:**
- Redis key: `serpapi:usage:{YYYY-MM-DD}` with 24h TTL
- `INCR` on every SerpAPI call across the entire app
- `getRemainingBudget()` checks current count vs daily limit
- Daily limit configurable via env var `SERPAPI_DAILY_LIMIT` (default: 100)

**Budget allocation:**
- Reserve 60% for Daily Pick (it runs first, automated)
- Reserve 40% for user-triggered pipelines (Spark + Research)
- When user pipeline budget exhausted: skip SerpAPI expansion, use templates + LLM only
- Log budget status for admin visibility

**Integration points:**
- `serpapi.ts` — increment counter on every API call (add to existing `fetchFromSerpApi()`)
- `query-expansion.ts` — check remaining budget before calling SerpAPI expansion
- `dailyTrendPickJob.ts` — check budget allocation before running

### Phase 4: Quality Scoring Module

**New file:** `packages/server/src/lib/quality-scoring.ts`

**Thin-result thresholds:**

| Section | Thin (Low) | Moderate (Medium) | Rich (High) |
|---------|------------|-------------------|-------------|
| Demand (Reddit) | 0-1 threads | 2-3 threads | 4+ threads |
| Demand (Facebook) | 0 groups | 1 group | 2+ groups with fit_score >= 2 |
| Demand (WTP clues) | 0 clues | 1-2 clues | 3+ clues |
| TAM | base = 0 or no citations | 1-2 citations | 3+ citations with named sources |
| Competitors | 0-1 found | 2-3 found | 4+ with strengths/weaknesses |
| Trend Signal | "unknown" | "flat" or "declining" | "rising" with dated evidence |

**Quality score computation:**

```typescript
interface SectionQuality {
  section: string;              // "demand" | "tam" | "competitors" | "trends"
  confidence: "high" | "medium" | "low";
  queriesRun: number;
  resultsFound: number;
  details: string;              // "8 Reddit threads, 3 Facebook groups"
}

interface DataQualityReport {
  overall: "high" | "medium" | "low";
  sections: SectionQuality[];
  summary: string;              // "Strong demand signals, moderate market sizing"
  queriedTopics: string[];      // Expanded queries used (for transparency)
}
```

**Overall confidence rules:**
- ALL sections high → overall high
- ANY section low → overall medium (unless 2+ sections low → overall low)
- Override: if demand + TAM both low → overall low regardless

**Integration:** Called after parallel research calls complete (before synthesis). Quality report is:
1. Passed to synthesis prompt as enhanced `dataQualityContext`
2. Stored in `sparkResult` JSON blob
3. Returned to frontend via existing tRPC queries

### Phase 5: Spark Pipeline Integration

**Files to modify:**
- `spark-ai.ts` — orchestration changes
- `spark-demand.ts` — accept expanded queries
- `spark-tam.ts` — accept expanded queries
- `spark-competitors.ts` — accept expanded queries

**Changes to `spark-ai.ts` `runSparkPipeline()`:**

1. After `generateSparkKeywords()` (line ~127):
   - Call `expandQueries()` with top 3 phrases + keywords
   - Merge expanded queries with existing query_plan
   - Save expanded keywords to `sparkKeywords` Prisma field (enables retry without re-expansion)

2. Pass expanded queries to parallel calls (lines ~486-490):
   - `runDemandResearch(keywords, expandedQueries)` — inject expanded Reddit/Facebook queries into prompt
   - `runTamResearch(keywords, expandedQueries)` — inject expanded market queries into prompt
   - `runCompetitorResearch(keywords, expandedQueries)` — inject expanded competitor queries into prompt

3. After `Promise.allSettled()` (line ~500):
   - Call `computeQualityScores()` with all three results
   - Replace string-based `dataQualityContext` with structured `DataQualityReport`
   - Pass both to synthesis

4. After synthesis (line ~555):
   - Attach `data_quality` to the saved `sparkResult`

**Changes to sub-services (demand, tam, competitors):**

Each service's deep research prompt gets an additional section:

```
## ADDITIONAL SEARCH ANGLES
In addition to the specific queries above, also explore these validated search variations
to ensure comprehensive coverage:
- [expanded query 1]
- [expanded query 2]
...
```

This guides the deep research model to search more broadly while keeping the existing prompt structure intact.

### Phase 6: Full Research Pipeline Integration

**File:** `packages/server/src/services/research-ai.ts`

**Lighter integration** since `o3-deep-research` does its own web searching:

1. Before `runDeepResearch()` (line ~282):
   - Call `expandQueries()` with idea description
   - Generate template + LLM variations (skip SerpAPI to preserve budget for Spark)

2. Inject into the `userQuery` parameter (line ~283):
   - Append "## SUGGESTED SEARCH ANGLES" section with expanded queries
   - The deep research model treats these as additional hints, not strict instructions

3. For chunked research (lines ~439-546):
   - Each chunk gets chunk-relevant expanded queries
   - Market chunk → market-oriented expansions
   - Competitor chunk → competitor-oriented expansions
   - Pain point chunk → problem-framing expansions

4. After extraction phases:
   - Compute quality scores for extracted data
   - Store in report metadata

### Phase 7: Shared Type Updates

**File:** `packages/shared/src/types/index.ts`

Add types:

```typescript
export interface SectionQuality {
  section: string;
  confidence: "high" | "medium" | "low";
  queriesRun: number;
  resultsFound: number;
  details: string;
}

export interface DataQualityReport {
  overall: "high" | "medium" | "low";
  sections: SectionQuality[];
  summary: string;
  queriedTopics: string[];
}
```

Extend `SparkResult`:

```typescript
export interface SparkResult {
  // ... existing fields ...
  data_quality?: DataQualityReport;  // NEW
}
```

Extend `SparkKeywords`:

```typescript
export interface SparkKeywords {
  // ... existing fields ...
  expanded_queries?: string[];       // NEW
  expansion_notes?: string;          // NEW
}
```

**File:** `packages/shared/src/validators/index.ts`

Add Zod schemas for new types:

```typescript
export const sectionQualitySchema = z.object({
  section: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  queriesRun: z.number(),
  resultsFound: z.number(),
  details: z.string(),
});

export const dataQualityReportSchema = z.object({
  overall: z.enum(["high", "medium", "low"]),
  sections: z.array(sectionQualitySchema),
  summary: z.string(),
  queriedTopics: z.array(z.string()),
});
```

### Phase 8: Frontend — Web Confidence Indicators

**File:** `packages/web/src/app/(dashboard)/ideas/[id]/components/spark-results.tsx`

**Per-section confidence badges:**
- Small colored dot/badge next to each section header
- Green = high confidence, Amber = medium, Red = low
- Hover reveals tooltip: "8 Reddit threads found from 12 queries"

**Data Coverage summary card** (top of Spark results):
- Overall confidence indicator
- "Searched 32 queries across Reddit, Facebook, market databases"
- Expandable "Search Strategy" section showing all expanded queries used

**Low-confidence callout:**
- If overall confidence is "low", show a subtle banner:
  "Limited data found. Consider adding more detail to your idea description."

### Phase 9: Frontend — Mobile Confidence Indicators

**File:** `packages/mobile/src/components/analysis/SparkResultsSection.tsx`

Adapted for mobile constraints:
- Colored dot next to section headers (same as web)
- Tap to expand quality details (no hover on mobile)
- Overall confidence shown as a small chip at top of results
- Simpler "Search Strategy" view (collapsible list)

---

## Acceptance Criteria

### Functional Requirements

- [x] Query expansion generates 20-45 search variations from an idea description
- [x] Template patterns produce deterministic baseline queries for any topic
- [x] LLM expansion (via enhanced `generateSparkKeywords()`) adds topic-specific colloquial variations
- [x] SerpAPI rising queries are fetched when budget permits, skipped gracefully when not
- [x] Expanded queries are injected into all 3 Spark sub-service deep research prompts
- [x] Expanded queries are injected into full research pipeline prompts
- [x] Per-section quality scores are computed after each pipeline run
- [x] Quality scores are persisted in `sparkResult` JSON blob
- [x] Quality scores are returned via tRPC to frontends
- [x] Web UI shows per-section confidence badges with hover details
- [x] Mobile UI shows per-section confidence badges with tap-to-expand
- [x] Overall confidence indicator shown at top of results
- [x] "Search Strategy" section shows what queries were used (collapsible)
- [x] SerpAPI daily budget is tracked in Redis
- [x] Budget exhaustion falls back gracefully to templates + LLM only
- [x] Expanded queries are saved to Prisma so retries skip re-expansion

### Non-Functional Requirements

- [x] Query expansion completes within 60 seconds
- [x] No increase in deep research call count (same 3 parallel calls for Spark)
- [x] SerpAPI budget tracker adds < 5ms overhead per call
- [x] Quality scoring adds < 100ms to pipeline completion
- [x] Fallback chain works: templates + SerpAPI + LLM → templates + LLM → templates only

### Quality Gates

- [x] Type-check passes: `pnpm type-check` from BETA root
- [x] Shared types are consistent between server, web, and mobile
- [ ] All existing Spark pipeline tests still pass
- [ ] Manual test: run Spark on 3 diverse ideas, verify expanded queries appear in results
- [ ] Manual test: exhaust SerpAPI budget, verify graceful fallback

---

## Success Metrics

- **Primary:** Average Reddit threads found per Spark run increases from ~1-2 to ~4-6
- **Primary:** Users can see confidence indicators for every report section
- **Secondary:** Percentage of "thin result" sections (0-1 data points) decreases by 50%+
- **Secondary:** No increase in pipeline error rate
- **Cost:** LLM expansion adds < $0.01 per run (same GPT-4o-mini call). SerpAPI adds 3-6 calls per run.

## Dependencies & Prerequisites

- Redis must be available for SerpAPI budget tracking (already configured in `packages/server/src/lib/redis.ts`)
- SerpAPI key must be configured (already in `.env`)
- No new external dependencies needed
- No Prisma schema changes needed (quality data stored in existing JSON fields)

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SerpAPI rate limit hit during expansion | Medium - expansion degrades to templates only | High | Budget tracker + graceful fallback |
| LLM generates irrelevant/adversarial queries | Low - deep research model filters internally | Low | Sanitize: max length, block obvious injection patterns |
| Expanded queries still return thin results | Medium - same problem, more cost | Medium | Quality scores surface the issue; user can refine description |
| Added latency for Spark | Medium - "quick" validation feels slower | Medium | 60s timeout on expansion; LLM expansion adds only ~2s (same call) |
| SerpAPI budget contention with Daily Pick | High - user pipelines starved | Medium | 60/40 budget split; Daily Pick runs early morning |

## Implementation Phases

### Phase 1: Foundation (query-expansion.ts + serpapi-budget.ts + quality-scoring.ts)
- New modules with no pipeline integration yet
- Unit testable in isolation
- Types added to shared package

### Phase 2: Spark Integration (spark-ai.ts + sub-services)
- Wire expansion into Spark pipeline
- Wire quality scoring after parallel calls
- Save to sparkResult

### Phase 3: Research Integration (research-ai.ts)
- Lighter integration — inject into prompts
- Add quality scoring to extraction phase

### Phase 4: Frontend (web + mobile)
- Confidence badges per section
- Data coverage summary
- Search strategy transparency

## Open Questions from SpecFlow Analysis

1. **Tier-based expansion depth** — Should FREE users get template-only expansion while PRO/ENTERPRISE get full expansion? (Recommendation: YES — saves SerpAPI budget and differentiates tiers)
2. **Re-expansion on retry** — If Spark fails at synthesis, should retry re-expand? (Recommendation: NO — cache expanded queries in sparkKeywords field)
3. **SerpAPI parallel vs sequential** — Current `fetchRelatedRisingQueries()` runs sequentially. Parallelize? (Recommendation: Keep sequential with 60s total timeout to respect rate limits)

## References

### Internal
- Brainstorm: [2026-02-06-trend-validation-robustness-brainstorm.md](../brainstorms/2026-02-06-trend-validation-robustness-brainstorm.md)
- Spark pipeline: [spark-ai.ts](../../packages/server/src/services/spark-ai.ts) (main orchestration)
- Research pipeline: [research-ai.ts](../../packages/server/src/services/research-ai.ts)
- SerpAPI client: [serpapi.ts](../../packages/server/src/lib/serpapi.ts) (has unused expansion functions)
- Shared types: [types/index.ts](../../packages/shared/src/types/index.ts)
- Deep research BP: [deep-research-BP.md](../../deep-research-BP.md)
- Batch API plan: [batch-plan.md](../../batch-plan.md)

### Patterns to Follow
- Existing retry logic: `withExponentialBackoff()` in `deep-research.ts`
- Existing SerpAPI batching: `batchGetTrendData()` in `serpapi.ts`
- Existing quality context: `dataQualityContext` string in `spark-ai.ts:502-512`
- Redis usage: `packages/server/src/lib/redis.ts`
