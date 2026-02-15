---
title: "Fix SWOT Opus Bottleneck + Remove Routing Fallback"
type: fix
date: 2026-02-15
source: docs/brainstorms/2026-02-15-tier1-timeout-fixes-brainstorm.md
---

# Fix SWOT Opus Bottleneck + Remove Routing Fallback

## Overview

Two surgical changes to eliminate active timeout sources in the research pipeline's Phase 3:

1. **Switch `extractSWOT()` from Opus to Sonnet** — SWOT on Opus takes 8-12 minutes, blocking the entire Phase 3 parallel block. Everything else finishes in 1-2 minutes.
2. **Remove `maxTokens > 20000 → Opus` fallback** — dead code today but a footgun for any future task type. Makes Sonnet the universal default.

## Problem Statement

Phase 3 runs 4 tasks in parallel via `Promise.allSettled`. SWOT on Opus 4.6 is the bottleneck:

| Task | Model | Time |
|------|-------|------|
| `extractScores` (3 passes) | GPT-5.2 | ~1-2 min |
| `extractBusinessMetrics` | GPT-5.2 | ~1 min |
| `extractMarketSizing` | GPT-5.2 | ~1 min |
| **`extractSWOT`** | **Opus 4.6** | **8-12 min** |

The `maxTokens > 20000` fallback in `selectModel()` was the root cause of the original `extractInsights` timeout (commit `ec08186`). While that specific case was patched, the rule remains as a silent trap for future call sites.

## Proposed Solution

### Change 1: Route SWOT to Sonnet

**File:** [research-ai.ts:2676](packages/server/src/services/research-ai.ts#L2676)

Change `task: 'swot'` to `task: 'extraction'` at the call site. This routes through the existing `sonnetTasks` check in `selectModel()`.

Also enrich the SWOT prompt to compensate for the smaller model — add explicit quadrant definitions, evidence requirements, and output format guidance. The current prompt is already well-structured but can be tightened.

**Why change the task string (not `selectModel`)?**
- Keeps `selectModel()` clean — extraction is what SWOT does (structured JSON from research data)
- No need to maintain a separate `'swot'` task routing path
- If we ever want Opus SWOT back, just change the task string

### Change 2: Remove `maxTokens` Fallback

**File:** [anthropic/index.ts:204-206](packages/server/src/providers/anthropic/index.ts#L204-L206)

Delete the `maxTokens > 20000 → Opus` conditional block. After this, `selectModel()` becomes:

```typescript
private selectModel(options?: AIRequestOptions): string {
  const opusTasks: AIRequestOptions['task'][] = ['generation', 'business-plan'];
  if (options?.task && opusTasks.includes(options.task)) {
    return this.OPUS_MODEL;
  }
  return this.SONNET_MODEL;
}
```

**Why this is safe:** Audit of all 7 call sites confirms every one provides an explicit `task` value handled by either `opusTasks` or `sonnetTasks` before the fallback. The fallback is dead code today:

| Call Site | `task` | `maxTokens` | Routed By |
|-----------|--------|-------------|-----------|
| `extractInsights` | `'extraction'` | 50,000 | `sonnetTasks` |
| `extractScores` | `'scoring'` | 8,000 | `sonnetTasks` |
| `extractBusinessMetrics` | `'extraction'` | 12,000 | `sonnetTasks` |
| `extractSWOT` | `'swot'` → `'extraction'` | 8,000 | `sonnetTasks` (after Change 1) |
| `extractMarketSizing` | `'extraction'` | 16,000 | `sonnetTasks` |
| `generateUserStory` | `'generation'` | 12,000 | `opusTasks` |
| `generateBusinessPlan` | `'business-plan'` | 50,000 | `opusTasks` |

### Change 3: Cleanup

- Remove `'swot'` from `opusTasks` array (line 191) — no longer used
- Remove the `sonnetTasks` array and check entirely — with the fallback gone, everything that isn't in `opusTasks` defaults to Sonnet anyway. No need for two lists.
- Optionally remove `'swot'` from the `AIRequestOptions['task']` union type in [types.ts:99](packages/server/src/providers/types.ts#L99)
- Update JSDoc on `extractSWOT()` (line 2619) — remove "Uses Opus 4.6" comment

## Technical Considerations

### SWOT Prompt Enrichment

The current prompt is ~15K chars of research context + structured insights summary. The schema is trivial (4 arrays of 3-8 strings). To maintain quality on Sonnet:

- Add explicit scoring criteria for each quadrant item (data-backed, specific, actionable)
- Add negative examples ("Do NOT include generic items like 'growing market demand'")
- Add a "think step by step" preamble to encourage analytical reasoning before output
- Keep `temperature: 0.2` for deterministic extraction

### Rollback Path

If SWOT quality degrades on Sonnet:
1. Change `task: 'extraction'` back to `task: 'swot'` on line 2676
2. Add `'swot'` back to `opusTasks` in `selectModel()`
3. No schema, database, or frontend changes needed

### No Migration Needed

- Database schema unchanged (SWOT is stored as JSONB, same shape)
- Frontend rendering unchanged (same `SWOTSchema` output)
- PDF generation unchanged (same interface)
- No new env vars, no new dependencies

## Acceptance Criteria

- [x] `extractSWOT()` routes to Sonnet 4.5 (verify via console log "Using provider: anthropic" + model)
- [x] `selectModel()` no longer has `maxTokens > 20000` fallback
- [x] `selectModel()` has only two paths: `opusTasks` → Opus, everything else → Sonnet
- [x] `opusTasks` contains only `['generation', 'business-plan']`
- [x] SWOT prompt is enriched with explicit quadrant criteria and anti-generic instructions
- [x] Existing SWOT output format unchanged (4 arrays of 3-8 strings)
- [x] JSDoc and comments updated to reflect Sonnet routing

## Implementation Steps

### Step 1: Simplify `selectModel()` (~5 min)

**File:** `packages/server/src/providers/anthropic/index.ts`

1. Remove `'swot'` from `opusTasks` (line 191)
2. Delete the `sonnetTasks` array and its `if` block (lines 196-201)
3. Delete the `maxTokens > 20000` fallback block (lines 204-206)
4. Result: 2-path function — `opusTasks` check, then Sonnet default

### Step 2: Update `extractSWOT()` call site (~2 min)

**File:** `packages/server/src/services/research-ai.ts`

1. Change `task: 'swot'` to `task: 'extraction'` on line 2676
2. Update JSDoc comment on line 2619

### Step 3: Enrich SWOT prompt (~10 min)

**File:** `packages/server/src/services/research-ai.ts`

Enhance the prompt in `extractSWOT()` (lines 2636-2673) with:
- Stronger quadrant definitions with examples of good vs bad items
- Explicit instruction to cite evidence from the research data
- Anti-generic guardrails ("each item must reference specific data points")
- Brief reasoning preamble

### Step 4: Optional type cleanup (~2 min)

**File:** `packages/server/src/providers/types.ts`

- Remove `'swot'` from `AIRequestOptions['task']` union if desired
- This is optional — keeping it doesn't cause issues, removing it prevents accidental reuse

### Step 5: Smoke test (~5 min)

- Run `pnpm type-check` to verify no TypeScript errors
- Grep for any remaining references to `'swot'` task string to confirm cleanup is complete
- Verify the console log in `extractSWOT()` shows the correct provider/model

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Phase 3 wall time | 8-12 min | 1-2 min |
| SWOT extraction cost | ~$0.50-1.00 (Opus) | ~$0.05-0.10 (Sonnet) |
| Future misroute risk | Any >20K task silently → Opus | Only explicit `opusTasks` → Opus |

## References

- **Brainstorm:** [2026-02-15-tier1-timeout-fixes-brainstorm.md](../brainstorms/2026-02-15-tier1-timeout-fixes-brainstorm.md)
- **Analysis:** [pipeline-analysis-v3.md](../pipeline-analysis-v3.md) — sections "Critical Fix: Model Routing Bug" and "SWOT Analysis: Test on Sonnet"
- **Prior fix:** Commit `ec08186` — routed `extractInsights` to Sonnet
- **Related brainstorm:** [2026-02-15-parallel-extraction-pipeline-brainstorm.md](../brainstorms/2026-02-15-parallel-extraction-pipeline-brainstorm.md) — splitting `extractInsights` into 7 calls (separate work)
