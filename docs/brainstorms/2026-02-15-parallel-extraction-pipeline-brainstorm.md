# Parallel Extraction Pipeline

**Date:** 2026-02-15
**Status:** Ready for planning

## What We're Building

Refactor the monolithic `extractInsights()` function into 7 parallel, per-field extraction calls. Currently a single 141K-char prompt is sent to Opus 4.6 asking for ALL structured fields at once, which takes >10 minutes and times out. Splitting into focused calls enables parallel execution on Sonnet 4.5, better error isolation, and granular resume.

## Why This Approach

- **Timeout fix**: No single call handles 141K input + 50K output on Opus anymore
- **Parallelism**: 7 calls run simultaneously instead of 1 sequential mega-call
- **Sonnet compatible**: Each call outputs ~2-4K tokens, well within Sonnet's 16K limit
- **Error isolation**: One failed extraction doesn't lose the other 6
- **Granular resume**: Only re-run failed extractions on retry, not all 7
- **Cost reduction**: Sonnet is cheaper than Opus for extraction tasks

## Key Decisions

### 1. Context scope: Full report for all calls
Every extraction call receives the full raw research report. Simpler than section-targeting, and the main gains (parallelism, Sonnet, error isolation) still apply. Cross-cutting fields like `positioning` and `keywords` naturally need multi-section context.

### 2. Grouping: 7 individual calls
One call per top-level field in `SynthesizedInsights`:
1. `marketAnalysis`
2. `competitors`
3. `painPoints`
4. `positioning`
5. `whyNow`
6. `proofSignals`
7. `keywords`

### 3. Phase structure: Two-step (unchanged pattern)
- **Step 1**: 7 insight extractions in parallel via `Promise.allSettled`
- **Step 2**: Reassemble into `SynthesizedInsights`, then scores+metrics+sizing+SWOT in parallel (existing pattern)

Downstream functions (extractScores, generateUserStory, etc.) continue receiving the same `SynthesizedInsights` object. No changes needed outside Phase 3 Step 1.

### 4. Resume: Granular per-field
- Merge each completed field into the existing `synthesizedInsights` JSONB column as it finishes
- On resume, check which top-level keys exist and only re-run missing ones
- Zero schema/migration changes needed

### 5. Model selection
- All 7 extraction calls use Sonnet 4.5 (`task: 'extraction'`, maxTokens ~8000-12000 each)
- The existing Sonnet override in `selectModel()` already handles this
- Opus no longer needed for extraction

## Architecture

```
Phase 3 (current):
  extractInsights(fullReport) -------- 10+ min, Opus, timeout risk -------> SynthesizedInsights
  then: scores + metrics + sizing + SWOT in parallel

Phase 3 (proposed):
  Promise.allSettled([               ---- ~2-3 min total, Sonnet, parallel --->
    extractMarketAnalysis(fullReport),
    extractCompetitors(fullReport),
    extractPainPoints(fullReport),
    extractPositioning(fullReport),
    extractWhyNow(fullReport),
    extractProofSignals(fullReport),
    extractKeywords(fullReport),
  ])
  reassemble into SynthesizedInsights
  then: scores + metrics + sizing + SWOT in parallel (unchanged)
```

## Open Questions

None - ready for planning.
