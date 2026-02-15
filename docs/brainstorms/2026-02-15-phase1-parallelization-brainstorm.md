# Phase 1 Parallelization + Prompt Rewriting

**Date:** 2026-02-15
**Status:** Ready for planning
**Source:** `docs/pipeline-analysis-v3.md` Tier 2 recommendations

## What We're Building

Parallelize Phase 1 deep research (5 sequential chunks with 2-min delays → 5 parallel chunks via background mode), add a prompt rewriting pre-step using GPT-4.1, pre-compute query expansion before all chunks, and fix the `marketsizing` chunk being silently dropped.

## Why This Approach

Phase 1 is the biggest time sink in the pipeline: 5 sequential deep research calls with 2-minute delays between them = 30-60+ minutes. Each chunk already uses background mode (`background: true`) with polling, so OpenAI handles queuing server-side. Removing the sequential loop and delays cuts Phase 1 to the wall-clock time of the slowest single chunk (typically 5-15 minutes).

## Key Decisions

### 1. Keep 5 chunks, fire all in parallel

- Keep existing chunk definitions, prompts, domain filtering — minimal code change
- Replace the `for` loop + delay with `Promise.allSettled` across all 5 chunks
- Background mode means OpenAI handles rate limiting/queuing internally
- The 2-minute inter-chunk delay was for 200k TPM recovery — background mode makes this unnecessary

### 2. Pre-compute query expansion before all chunks

- Currently: expansion runs concurrently with chunk 0, blocks chunk 1
- New: await `expandQueries()` first (~2-5 sec), then inject results into all 5 chunk prompts
- Every chunk benefits from expansion context, not just chunks 1-4
- Small upfront cost, better research quality across the board

### 3. Social research stays sequential

- Analysis doc claimed social research is independent of Phase 1, but code shows `fetchSocialProof()` requires `deepResearch.rawReport` as context
- Keep it running after Phase 1 completes — simpler, no function restructuring needed
- Future optimization: could split into search + synthesize steps, but not worth the complexity now

### 4. Prompt rewriting pre-step (GPT-4.1)

- New ~5 sec step before deep research: GPT-4.1 rewrites chunk prompts using all available context
- Inputs: ideaTitle, ideaDescription, interviewData, interviewMessages, notesSnapshot (canvasContext)
- Output: 5 focused research briefs (one per chunk) with tailored search angles
- Benefits: better research quality, incorporates founder notes that currently aren't used in chunk prompts

### 5. Fix marketsizing bug

- `combineChunkResults()` handles `market`, `competitors`, `painpoints`, `timing` but silently drops `marketsizing`
- The worker's regex re-extraction also misses marketsizing
- Fix: add `marketsizing` handling to both `combineChunkResults()` and the worker's regex parsing

### 6. Resume support update

- Current resume tracks completed chunks by ID in a `Record<string, string>` — already works for parallel execution
- Each parallel chunk writes its result to its own key independently
- On resume: check which chunk IDs have results, only re-fire missing ones via `Promise.allSettled`
- No schema changes needed

## Architecture

```
Current Phase 1 (30-60+ min):
  Chunk 0 (market)        ──── [2 min] ──── Chunk 1 (competitors) ──── [2 min] ──── ...
  └── query expansion (concurrent with chunk 0, blocks chunk 1)

Proposed Phase 1 (~5-15 min):
  [Pre-step: Query Expansion + Prompt Rewriting]    (~5 sec)
    └── expandQueries() → rewriteResearchBriefs(GPT-4.1)
                 ↓
  [Parallel Block via Promise.allSettled]
    Chunk 0: Market Analysis        ─┐
    Chunk 1: Competitor Research     ─┤
    Chunk 2: Customer Pain Points    ─┼── all fire simultaneously
    Chunk 3: Timing & Validation     ─┤    (background mode + polling)
    Chunk 4: Market Sizing           ─┘
                 ↓
  combineChunkResults() → DeepResearchOutput
```

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Phase 1 time | 30-60+ min (sequential) | 5-15 min (parallel, wall-clock of slowest chunk) |
| Inter-chunk delays | 8 min total (4 × 2 min) | 0 |
| Query expansion coverage | Chunks 1-4 only | All 5 chunks |
| Market sizing data | Silently dropped (bug) | Included in final report |
| Research prompt quality | Generic chunk prompts | GPT-4.1 rewritten briefs with founder context |

## Open Questions

None — ready for planning.
