---
title: "Parallelize Phase 1 Deep Research + Prompt Rewriting Pre-step"
type: feat
date: 2026-02-15
source: docs/brainstorms/2026-02-15-phase1-parallelization-brainstorm.md
---

# Parallelize Phase 1 Deep Research + Prompt Rewriting Pre-step

## Overview

Phase 1 (deep research) is the pipeline's biggest bottleneck: 5 sequential chunks with 2-minute delays = 30-60+ minutes. Each chunk already uses background mode with polling, so OpenAI handles queuing server-side. Switching from a sequential `for` loop to `Promise.allSettled` across all 5 chunks cuts Phase 1 to the wall-clock time of the slowest single chunk (5-15 minutes).

Additionally: fix a bug where the 5th chunk (`marketsizing`) is silently dropped from the final report, pre-compute query expansion before all chunks, and add a GPT-4.1 prompt rewriting pre-step.

## Problem Statement

```
Current Phase 1 timeline (30-60+ min):
  Chunk 0 ──[2min]── Chunk 1 ──[2min]── Chunk 2 ──[2min]── Chunk 3 ──[2min]── Chunk 4
  5-10 min    delay   5-10 min   delay   5-10 min   delay   5-10 min   delay   5-10 min
```

- 8 minutes of pure dead time from inter-chunk delays
- Each chunk can queue independently on OpenAI's side
- Query expansion only benefits chunks 1-4 (chunk 0 starts without it)
- `combineChunkResults()` silently drops the `marketsizing` chunk output
- Worker's regex re-extraction also misses `marketsizing`

## Proposed Solution

### 1. Pre-compute query expansion + prompt rewriting (~5-10 sec)

Before firing any deep research:
1. Run `expandQueries()` to get template + SerpAPI expansions (~2-5 sec)
2. Run a GPT-4.1 call to rewrite the 5 chunk prompts into focused research briefs (~3-5 sec)
   - Inputs: ideaTitle, ideaDescription, interviewData, interviewMessages, canvasContext, expansion queries
   - Output: 5 tailored research briefs (one per chunk) with specific search angles

These two can run in parallel since they don't depend on each other.

### 2. Fire all 5 chunks in parallel

Replace the sequential `for` loop (lines 594-662) with `Promise.allSettled`:

```typescript
// Pre-filter to only chunks that need to run (resume support)
const chunksToRun = RESEARCH_CHUNKS.filter(chunk => !results[chunk.id]);

const chunkPromises = chunksToRun.map(chunk =>
  runSingleResearchChunk(
    ideaTitle, ideaDescription, interviewData, interviewContext,
    chunk, model, expansionContext, canvasContext, rewrittenBrief[chunk.id]
  ).then(result => ({ chunkId: chunk.id, result }))
);

const settled = await Promise.allSettled(chunkPromises);
```

Each chunk writes its result to `results[chunk.id]` independently. Failed chunks can be retried without re-running successful ones.

### 3. Fix marketsizing bug

Add `marketsizing` handling to both:
- `combineChunkResults()` (line 758-775) — add the missing `if (results.marketsizing)` block
- Worker regex extraction (lines 144-151) — add regex for `## Market Sizing`

### 4. Update progress reporting

Current progress reports each chunk's start/end sequentially (5-10%, 10-15%, etc.). With parallel execution, progress should reflect aggregate completion: report `(completedChunks / totalChunks) * 30%` as each chunk finishes.

## Technical Approach

### Files to Modify

| File | Changes |
|------|---------|
| [research-ai.ts](packages/server/src/services/research-ai.ts) | Rewrite `runChunkedDeepResearch()`, fix `combineChunkResults()`, add `rewriteResearchBriefs()` |
| [researchPipelineWorker.ts](packages/server/src/jobs/workers/researchPipelineWorker.ts) | Add `marketsizing` regex extraction |

### New Function: `rewriteResearchBriefs()`

```typescript
// packages/server/src/services/research-ai.ts

async function rewriteResearchBriefs(
  input: ResearchInput,
  chunks: typeof RESEARCH_CHUNKS,
  expansionContext: string
): Promise<Record<string, string>> {
  // GPT-4.1 rewrites each chunk's focus into a tailored research brief
  // incorporating interview data, canvas notes, and expansion queries
}
```

**Model:** `gpt-4.1` via direct OpenAI call (not the Anthropic provider)
**Max tokens:** ~2,000 (5 briefs × ~400 words each)
**Temperature:** 0.3

The prompt asks GPT-4.1 to output a JSON object keyed by chunk ID, where each value is a rewritten research brief that:
- Incorporates specific founder context from interview/canvas
- Adds targeted search angles from the expansion queries
- Narrows the focus based on what the founder actually cares about
- Keeps the original chunk's domain focus intact

### Implementation Phases

#### Phase 1: Bug fix + parallel execution (core change)

1. Fix `combineChunkResults()` — add `marketsizing` section
2. Fix worker regex — add `marketsizing` extraction
3. Rewrite `runChunkedDeepResearch()`:
   - Move query expansion to run first (await it before firing chunks)
   - Replace `for` loop with `Promise.allSettled`
   - Remove `INTER_CHUNK_DELAY_MS` and `sleep()` usage
   - Update progress reporting for parallel execution
   - Keep resume support (filter out already-completed chunks)
   - Save intermediate results as each chunk completes (not just at loop end)
4. Update JSDoc and comments

#### Phase 2: Prompt rewriting pre-step

5. Create `rewriteResearchBriefs()` function
6. Wire it into `runChunkedDeepResearch()` before the parallel block
7. Pass rewritten briefs to `runSingleResearchChunk()` — either replace the `focus` field or append as additional context
8. Handle failure gracefully (if rewriting fails, fall back to original chunk prompts)

## Acceptance Criteria

- [x] All 5 deep research chunks fire simultaneously via `Promise.allSettled`
- [x] No inter-chunk delays remain (removed `INTER_CHUNK_DELAY_MS` usage)
- [x] Query expansion runs and completes before any chunks fire
- [x] `marketsizing` chunk output appears in final `rawReport` (bug fix)
- [x] `marketsizing` chunk is extractable by worker's regex on resume
- [x] Resume support works: only re-fires chunks missing from `results`
- [x] Progress reports correctly during parallel execution
- [x] GPT-4.1 prompt rewriting runs before deep research, outputs 5 briefs
- [x] If prompt rewriting fails, falls back to original chunk prompts (non-fatal)
- [x] Intermediate results saved as each parallel chunk completes
- [x] `pnpm type-check` passes

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Phase 1 time | 30-60+ min (sequential) | 5-15 min (parallel) |
| Inter-chunk dead time | 8 min (4 × 2 min delays) | 0 |
| Market sizing data | Lost (bug) | Included in report |
| Query expansion coverage | Chunks 1-4 | All 5 chunks |
| Research prompt quality | Generic focus strings | GPT-4.1 rewritten briefs |

## Dependencies & Risks

### Rate limits (200k TPM)

The 2-minute delays existed for rate limit recovery. With background mode, OpenAI handles queuing server-side. Risk: if all 5 chunks hit TPM simultaneously, OpenAI may queue some internally (adding latency but not causing errors). Mitigation: background mode handles this transparently.

### Chunk failure isolation

If 1 of 5 parallel chunks fails, `Promise.allSettled` captures the failure without aborting the other 4. The function should retry failed chunks individually before giving up.

### GPT-4.1 availability

If GPT-4.1 is unavailable or the rewriting call fails, the pipeline must fall back gracefully to the original chunk prompts. This pre-step is an enhancement, not a requirement.

### Progress callback during parallel execution

The current `onProgress` callback may be called from multiple chunks simultaneously. Ensure the worker's database update is safe for concurrent writes (Drizzle's `update().set().where()` is atomic per row).

## References

- **Brainstorm:** [2026-02-15-phase1-parallelization-brainstorm.md](../brainstorms/2026-02-15-phase1-parallelization-brainstorm.md)
- **Analysis:** [pipeline-analysis-v3.md](../pipeline-analysis-v3.md) — "Phase 1 Optimization: Parallel Deep Research"
- **Current code:** [research-ai.ts:542-674](packages/server/src/services/research-ai.ts#L542-L674) — `runChunkedDeepResearch()`
- **Bug location:** [research-ai.ts:758-775](packages/server/src/services/research-ai.ts#L758-L775) — `combineChunkResults()` missing marketsizing
- **Worker bug:** [researchPipelineWorker.ts:144-151](packages/server/src/jobs/workers/researchPipelineWorker.ts#L144-L151) — missing marketsizing regex
- **Background mode:** [deep-research.ts:625-640](packages/server/src/lib/deep-research.ts#L625-L640) — `runDeepResearchWithPolling()`
- **Query expansion:** [query-expansion.ts](packages/server/src/lib/query-expansion.ts)
