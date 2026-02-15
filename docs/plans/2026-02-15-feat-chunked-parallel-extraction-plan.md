---
title: "feat: Chunked Parallel Extraction"
type: feat
date: 2026-02-15
---

# feat: Chunked Parallel Extraction

## Overview

Split the monolithic `extractInsights()` function into 4 parallel per-chunk extraction calls. Currently, all 5 deep research chunks are combined into a single ~125K character prompt sent to one Anthropic Sonnet call that extracts ALL 7 schema sections at once. This is the primary synthesis bottleneck — large prompt, slow, timeout-prone.

Since deep research already produces 5 focused chunks (market, competitors, painpoints, timing, marketsizing), each chunk should extract its own relevant schema sections independently and in parallel. The 5th chunk (marketsizing) already has a dedicated `extractMarketSizing()` function, so only 4 new extraction calls are needed.

## Problem Statement

**Current flow:**
```
5 parallel deep research chunks → combineChunkResults() → 125K char string
  → extractInsights() → 1 call, 125K input, 50K max output, Sonnet
  → 10+ seconds, timeout risk, attention degradation on later fields
```

**Issues:**
1. **Prompt size**: 125K chars forces the model to spread attention across 7 unrelated extraction dimensions
2. **Single point of failure**: One failed extraction loses ALL 7 sections
3. **No granular resume**: If extraction fails, must re-extract everything
4. **Wasted context**: Each schema section only needs ~25K chars of relevant research, not all 125K

## Proposed Solution

```
5 parallel deep research chunks (each ~25K chars)
  → 4 parallel extraction calls on Sonnet:
      market chunk       → { marketAnalysis, keywords }
      competitors chunk  → { competitors[], positioning }
      painpoints chunk   → { painPoints[] }
      timing chunk       → { whyNow, proofSignals }
  → mergeChunkInsights() → SynthesizedInsights (same shape)
  → downstream functions unchanged
```

**Chunk → Schema Mapping:**

| Chunk | Input Size | Extracts | Rationale |
|-------|-----------|----------|-----------|
| `market` | ~25K | `marketAnalysis` + `keywords` | Market data → market analysis + industry keywords/SEO terms |
| `competitors` | ~25K | `competitors[]` + `positioning` | Competitor profiles → competitor list + positioning/differentiation (needs competitor awareness for "Unlike X, we...") |
| `painpoints` | ~25K | `painPoints[]` | Customer voice → pain point extraction (standalone, needs full attention on evidence/severity) |
| `timing` | ~25K | `whyNow` + `proofSignals` | Timing triggers → why-now analysis + demand validation signals |
| `marketsizing` | ~25K | _(skip)_ | Already has dedicated `extractMarketSizing()` in Phase 3 parallel block |

## Technical Approach

### Files to Modify

| File | Changes |
|------|---------|
| `packages/server/src/services/research-schemas.ts` | Add 4 per-chunk Zod schemas derived from existing `InsightsSchema` |
| `packages/server/src/services/research-ai.ts` | Add 4 extraction functions + `extractInsightsParallel()` orchestrator + `mergeChunkInsights()` + modify `runChunkedDeepResearch()` return type |
| `packages/web/src/app/(dashboard)/projects/[id]/components/status-researching.tsx` | Update SYNTHESIS sub-tasks to reflect 4 parallel extractions |
| `packages/shared/src/constants/index.ts` | Update phase descriptions if needed |

### Phase 1: Per-Chunk Schemas (`research-schemas.ts`)

Derive sub-schemas from existing `InsightsSchema.shape` to prevent schema drift:

```typescript
// research-schemas.ts

// Per-chunk extraction schemas (derived from InsightsSchema to prevent drift)
export const MarketChunkSchema = z.object({
  marketAnalysis: InsightsSchema.shape.marketAnalysis,
  keywords: InsightsSchema.shape.keywords,
});

export const CompetitorsChunkSchema = z.object({
  competitors: InsightsSchema.shape.competitors,
  positioning: InsightsSchema.shape.positioning,
});

export const PainPointsChunkSchema = z.object({
  painPoints: InsightsSchema.shape.painPoints,
});

export const TimingChunkSchema = z.object({
  whyNow: InsightsSchema.shape.whyNow,
  proofSignals: InsightsSchema.shape.proofSignals,
});
```

### Phase 2: Per-Chunk Extraction Functions (`research-ai.ts`)

4 new functions, each following the existing `extractSWOT`/`extractBusinessMetrics` pattern:

```typescript
// research-ai.ts

async function extractChunkMarket(
  chunkText: string, input: ResearchInput, tier: SubscriptionTier
): Promise<z.infer<typeof MarketChunkSchema>>

async function extractChunkCompetitors(
  chunkText: string, input: ResearchInput, tier: SubscriptionTier
): Promise<z.infer<typeof CompetitorsChunkSchema>>

async function extractChunkPainPoints(
  chunkText: string, input: ResearchInput, tier: SubscriptionTier
): Promise<z.infer<typeof PainPointsChunkSchema>>

async function extractChunkTiming(
  chunkText: string, input: ResearchInput, tier: SubscriptionTier
): Promise<z.infer<typeof TimingChunkSchema>>
```

**Each function:**
- Receives the raw chunk text (~25K chars) + idea title/description for context
- Uses `getExtractionProvider(tier).extract()` with its per-chunk Zod schema
- `maxTokens: 12000` (vs 50K for the monolith — each section is ~2-4K output)
- `temperature: 0.2` (same as current)
- `task: 'extraction'` (routes to Sonnet via existing `selectModel()`)
- Wrapped in `withExponentialBackoff` with 3 attempts (same retry pattern as current `extractInsights`)
- Focused prompt with schema template only for its assigned sections

### Phase 3: Orchestrator + Merge (`research-ai.ts`)

```typescript
// Orchestrator: replaces extractInsights() call in pipeline
export async function extractInsightsParallel(
  chunkResults: Record<string, string>,
  input: ResearchInput,
  tier: SubscriptionTier
): Promise<SynthesizedInsights> {
  const results = await Promise.allSettled([
    chunkResults.market     ? extractChunkMarket(chunkResults.market, input, tier)       : null,
    chunkResults.competitors? extractChunkCompetitors(chunkResults.competitors, input, tier): null,
    chunkResults.painpoints ? extractChunkPainPoints(chunkResults.painpoints, input, tier) : null,
    chunkResults.timing     ? extractChunkTiming(chunkResults.timing, input, tier)        : null,
  ]);

  return mergeChunkInsights(results);
}

// Merge: assembles partial results into full SynthesizedInsights
function mergeChunkInsights(results: PromiseSettledResult<...>[]): SynthesizedInsights {
  // Extract fulfilled values, use fallback defaults for rejected
  // Assemble into single SynthesizedInsights object
  // Log which extractions succeeded/failed
}
```

### Phase 4: Return Chunk Results from Deep Research

Modify `runChunkedDeepResearch()` to return individual chunk results alongside the combined report:

```typescript
// Current return type
interface DeepResearchOutput {
  rawReport: string;
  citations: Citation[];
  sources: string[];
  searchQueriesUsed: string[];
}

// Add chunkResults to the return
// Option: Extend DeepResearchOutput with optional chunkResults
interface DeepResearchOutput {
  rawReport: string;             // Combined report (still needed by downstream functions)
  citations: Citation[];
  sources: string[];
  searchQueriesUsed: string[];
  chunkResults?: Record<string, string>;  // NEW: individual chunk texts
}
```

In `runChunkedDeepResearch()` (line 795-801), add `chunkResults: results` to the return object.

### Phase 5: Update Pipeline Orchestration

In the main pipeline function (line 4961-4969), replace:

```typescript
// OLD
insights = await extractInsights(deepResearch, input, tier);

// NEW
if (deepResearch.chunkResults && Object.keys(deepResearch.chunkResults).length > 0) {
  insights = await extractInsightsParallel(deepResearch.chunkResults, input, tier);
} else {
  // Fallback for legacy data or missing chunks
  insights = await extractInsights(deepResearch, input, tier);
}
```

### Phase 6: Frontend Progress Updates (`status-researching.tsx`)

Update SYNTHESIS phase sub-tasks to reflect parallel extraction:

```typescript
SYNTHESIS: [
  'Extracting market analysis',
  'Extracting competitor profiles',
  'Extracting pain points & timing',
  'Calculating opportunity scores',
],
```

Update `getActiveSubTask()` progress thresholds for SYNTHESIS phase.

## Acceptance Criteria

- [x] 4 per-chunk Zod schemas added to `research-schemas.ts`, derived from `InsightsSchema.shape`
- [x] 4 per-chunk extraction functions added to `research-ai.ts` following existing patterns
- [x] `extractInsightsParallel()` orchestrator runs 4 calls via `Promise.allSettled`
- [x] `mergeChunkInsights()` assembles partial results into valid `SynthesizedInsights`
- [x] `runChunkedDeepResearch()` returns `chunkResults` alongside `rawReport`
- [x] Pipeline uses `extractInsightsParallel()` when chunk results are available
- [x] Fallback to monolithic `extractInsights()` when chunk results unavailable
- [x] Each per-chunk prompt is ~25K chars (not 125K)
- [x] All downstream functions (extractScores, extractBusinessMetrics, generateUserStory, etc.) work unchanged
- [x] Frontend SYNTHESIS sub-tasks updated to reflect parallel extraction
- [x] `pnpm type-check` passes
- [x] Partial failure handling: if 1-2 chunk extractions fail, pipeline continues with available data + sensible defaults for missing sections

## Error Handling

**Partial failure strategy:**
- Use `Promise.allSettled` (not `Promise.all`) — same pattern as existing Phase 3/4
- If a chunk extraction fails, use empty/default values for those sections:
  - `marketAnalysis`: empty arrays for trends/opportunities/threats, empty strings for size/growth
  - `competitors`: empty array
  - `painPoints`: empty array
  - `positioning`: generic defaults based on idea title/description
  - `whyNow`: empty arrays, urgencyScore: 50
  - `proofSignals`: empty arrays
  - `keywords`: empty arrays
- Log failures with chunk name for debugging
- Pipeline continues — downstream functions already handle sparse data gracefully

**Resume support:**
- Individual chunk results are already persisted via `onProgress` callbacks during deep research
- If extraction fails mid-way and pipeline resumes, all chunk texts are available from `existingResearch.researchChunks.chunkResults`
- Future enhancement: persist each successful extraction result independently for true per-field resume (not in this PR)

## References

- **Brainstorm:** `docs/brainstorms/2026-02-15-parallel-extraction-pipeline-brainstorm.md`
- **Pipeline analysis:** `docs/pipeline-analysis-v3.md` (Phase 3 section)
- **Current extraction:** `packages/server/src/services/research-ai.ts:1719-1928`
- **Chunk definitions:** `packages/server/src/services/research-ai.ts:472-513`
- **Schemas:** `packages/server/src/services/research-schemas.ts:12-133`
- **Provider abstraction:** `packages/server/src/providers/anthropic/index.ts:109-165`
- **Model routing (already fixed):** `packages/server/src/providers/anthropic/index.ts:189-198`
- **PR #9 (parallel deep research):** `feat/parallel-deep-research` branch
