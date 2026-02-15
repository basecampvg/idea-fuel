# Tier 1 Timeout Fixes: SWOT Model Switch + Routing Fallback Removal

**Date:** 2026-02-15
**Status:** Ready for planning
**Source:** `docs/pipeline-analysis-v3.md` gap analysis

## What We're Building

Two targeted changes to eliminate active timeout sources in the research pipeline:

1. **Switch SWOT extraction from Opus to Sonnet** — removes the 8-12 minute bottleneck from the Phase 3 parallel block
2. **Remove `maxTokens > 20000 → Opus` fallback rule** — prevents future tasks from silently routing to the slowest model

## Why These Changes

### SWOT on Opus is the Phase 3 bottleneck

Phase 3 runs 4 tasks in parallel via `Promise.allSettled`:
- `extractScores` (GPT-5.2, 3 parallel passes) — ~1-2 min
- `extractBusinessMetrics` (GPT-5.2) — ~1 min
- `extractMarketSizing` (GPT-5.2) — ~1 min
- `extractSWOT` (Opus 4.6) — **8-12 min**

The entire Phase 3 block waits for the slowest call. SWOT is structured analytical work (mapping findings to S/W/O/T quadrants with evidence), not open-ended creative generation. Sonnet handles this well with a clear framework prompt.

### The routing fallback is a footgun

`selectModel()` in `anthropic/index.ts` has this rule at line 204-206:
```typescript
if (options?.maxTokens && options.maxTokens > 20000) {
  return this.OPUS_MODEL;
}
```

This was the *root cause* of the original `extractInsights` timeout (commit `ec08186`). While that specific case was fixed by adding `'extraction'` to `sonnetTasks`, the rule remains — any new task type requesting >20K tokens will silently route to Opus unless explicitly listed. Removing it makes Sonnet the safe default everywhere.

## Key Decisions

### 1. SWOT model: Sonnet 4.5 with enriched prompt

- Remove `'swot'` from `opusTasks` array in `selectModel()`
- Enrich the SWOT prompt with a clearer framework to compensate for the smaller model
- The prompt should explicitly instruct structured quadrant analysis with evidence requirements
- If quality drops noticeably, easy to revert by adding `'swot'` back to `opusTasks`

### 2. Routing fallback: Remove entirely

- Delete the `maxTokens > 20000 → Opus` conditional block
- After removal, `selectModel()` logic becomes:
  1. If task is in `opusTasks` → Opus
  2. Everything else → Sonnet (default)
- This is the "fail-safe" design the analysis recommends: opt *in* to Opus, never fall *into* it

### 3. Remaining opusTasks after changes

After removing `'swot'`, the Opus tasks list becomes:
- `'generation'` — creative report generation (user story, value ladder, etc.)
- `'business-plan'` — business plan synthesis

These are genuinely creative/reasoning-heavy tasks where Opus quality matters.

## Scope

### In scope
- Modify `selectModel()` in `packages/server/src/providers/anthropic/index.ts`
- Enrich SWOT prompt in `extractSWOT()` in `packages/server/src/services/research-ai.ts`
- Audit all `task:` strings across codebase to confirm no other misroutes

### Out of scope (separate brainstorm exists)
- Splitting `extractInsights()` into parallel calls (see `2026-02-15-parallel-extraction-pipeline-brainstorm.md`)
- Phase 1 parallelization (Tier 2)
- Perplexity integration (Tier 2)

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Phase 3 wall time | 8-12 min (SWOT bottleneck) | 1-2 min (all tasks similar speed) |
| Future misroute risk | Any >20K task silently hits Opus | Only explicit opusTasks hit Opus |
| Opus cost in Phase 3 | ~$0.50-1.00 per SWOT call | $0 (Sonnet is ~10x cheaper) |

## Open Questions

None — ready for planning.
