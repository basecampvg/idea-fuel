# Research Pipeline: Architectural Analysis & Optimization Plan (v3)

## Executive Summary

Your pipeline is well-structured with solid fundamentals — phase-based execution, Zod validation, resume support, and parallel extraction in Phases 3-4. Analysis identified **two categories of issues**: the immediate timeout-causing routing bug in Phase 3, and broader architectural improvements for speed, quality, and resilience.

The most urgent fix is a model routing bug where `extractInsights()` silently routes to Opus 4.6 instead of Sonnet due to a missing task type in `selectModel()`. This single bug is responsible for your current timeout failures. Beyond that, restructuring Phase 1 from 5 sequential deep research calls to 2-3 parallel calls with background mode will cut total pipeline time by 50-60%.

Infrastructure note: This pipeline runs on **Railway + Redis + BullMQ**. Railway-specific constraints (particularly the ~5-minute POST request timeout and lack of native background worker support) are factored into all recommendations below.

> **Correction Note (v3):** Your pipeline overview doc lists `extractInsights()` at 25,000 max tokens, but the actual code calls with `maxTokens: 50000`. This report uses 50,000 as the ground truth. If the code has since been changed to 25,000, the routing bug analysis still applies (25,000 > 20,000 triggers the Opus fallback), but the Opus bottleneck severity is reduced. Verify which value is current in `research-ai.ts`.

---

## Critical Fix: Model Routing Bug (Do This Now)

### Root Cause

In `anthropic/index.ts:189-209`, the `selectModel()` logic is:

1. If task is `generation`, `business-plan`, or `swot` → Opus
2. If task is `scoring` → Sonnet
3. If `maxTokens > 20000` → Opus (fallback)
4. Default → Sonnet

`extractInsights()` calls with `task: 'extraction'` and `maxTokens: 50000`. Since `'extraction'` isn't in either task list, it falls through to rule 3 — and 50,000 > 20,000 routes it to **Opus 4.6** (slowest, most expensive model) when it should be on **Sonnet** (5-10x faster, purpose-built for extraction).

Result: A 141,820-character prompt with 50k max output processed by Opus times out at ~15 minutes.

### Compounding Issue

The `isRetryable` check in `extractInsights` doesn't catch `APIConnectionTimeoutError`, so timeout failures are treated as permanent — zero retry attempts on the most timeout-prone call in the pipeline.

### Fix (Three Changes)

**1. Flip the `selectModel()` default to Sonnet:**

The current "maxTokens > 20,000 → Opus" rule is a fail-open design — any future task type requesting more than 20k tokens will silently route to Opus unless explicitly added to a task list. Flip the logic so Sonnet is the safe default and you opt *in* to Opus:

```typescript
function selectModel(task: string, maxTokens: number): Model {
  const opusTasks = new Set(['generation', 'business-plan', 'swot']);
  if (opusTasks.has(task)) return OPUS;
  return SONNET; // Everything else defaults to the fast path
}
```

**2. Add `APIConnectionTimeoutError` to retry logic:**

```typescript
const isRetryable = (error: unknown): boolean => {
  if (error instanceof APIConnectionTimeoutError) return true;
  if (error instanceof APIConnectionError) return true;
  // ...existing checks
};
```

**3. Audit all task strings:**

Grep every `task:` value passed to `selectModel()` across the codebase and compare against the Opus and Sonnet task lists. Surface any other silent misroutes before they hit production.

---

## Phase 3 Current State (Corrected)

Phase 3 currently runs **5 parallel extractions** (not 4 as listed in the pipeline overview doc, which omitted SWOT):

| Task | Model | Max Tokens | Source |
|------|-------|------------|--------|
| `extractInsights()` | Sonnet (intended) / Opus (actual bug) | 50,000 (code) / 25,000 (doc) | `research-ai.ts` |
| `extractSWOT()` | Opus 4.6 (intentional) | ~4,000 | `research-ai.ts:2628` |
| `extractScores()` | GPT-5.2 × 3 sequential passes | 4,000 each | `research-ai.ts` |
| `extractBusinessMetrics()` | GPT-5.2 | 4,000 | `research-ai.ts` |
| `extractMarketSizing()` | GPT-5.2 | 4,000 | `research-ai.ts` |

SWOT is fully wired: `SWOTSchema` in `research-schemas.ts:294`, persisted via `researchPipelineWorker.ts:228`, rendered in `report-content.tsx` under the `COMPETITIVE_ANALYSIS` section group, and exported via `competitive-analysis.tsx:307-339` with color-coded quadrant layout.

The Opus SWOT call is the **slowest task in the Phase 3 parallel block**, setting the floor for the entire group. Everything else finishes in 1-2 minutes while SWOT on Opus can take 8-12 minutes.

### Phase 3 Restructure: Split extractInsights() for Quality + Speed

**Why Splitting Improves Quality (Not Just Speed)**

The current `extractInsights()` asks a single model call to extract market analysis, competitors, pain points, positioning, why-now signals, proof signals, *and* keywords — all in one 50k-token output. LLMs exhibit attention degradation on very long outputs: the quality of the 15th extracted competitor is measurably worse than the 3rd. The model starts pattern-matching and filling slots rather than genuinely analyzing the source material.

Splitting into focused calls gives each call the **full raw deep research as input context** (same 141k chars) but a narrower extraction mandate. The model dedicates its full attention budget to 2-3 related dimensions instead of spreading thin across 7.

**Recommended Split**

| Call | Focus | Why Grouped | Max Tokens |
|------|-------|-------------|------------|
| A | Market Analysis + Why Now + Proof Signals | All market-level reasoning, interconnected | ~15,000 |
| B | Competitors + Positioning + Keywords | Competitive landscape is one coherent analysis | ~15,000 |
| C | Pain Points (standalone) | Needs deep attention to severity, evidence, emotional impact | ~15,000 |

All three run in parallel on Sonnet. Each gets a richer, more specific system prompt than the current generic extraction prompt — the narrower scope frees up prompt budget for detailed instructions.

Example for Call B:
> *For each competitor, analyze: their actual pricing (not just tiers), their specific technical architecture choices, what their users complain about on G2/Reddit/HackerNews, where their positioning leaves gaps, and what would make a customer switch away from them. Rate the vulnerability of each competitor on a 1-10 scale with justification.*

That level of specificity in a 7-way extraction prompt would get lost. In a focused call, the model actually follows it.

**Reconciliation Step**

After the three parallel extractions merge, add a lightweight reconciliation call (~2,000 tokens, ~10 seconds) that checks for consistency across outputs. For example: if Call B identifies a competitor that Call A's market analysis doesn't mention, or if Call C surfaces a pain point that contradicts Call A's market opportunity assessment.

**SWOT Analysis: Test on Sonnet**

`extractSWOT()` currently runs on Opus for "cross-chunk reasoning." It's the slowest task in the Phase 3 parallel block and sets the floor for the entire group. The task is structured analytical work (mapping findings to S/W/O/T quadrants), not open-ended creative generation. Sonnet handles this well with a clear framework prompt.

Recommendation: Switch SWOT to Sonnet with a richer framework prompt. The task is formulaic enough that Sonnet handles it well — compensate with prompt specificity rather than a bigger model. This removes the Opus bottleneck from Phase 3 entirely. If you notice quality degradation in production, you can always revert.

**Phase 3 Proposed State: 9 Parallel Tasks**

| Task | Model | Tokens |
|------|-------|--------|
| Insights A (Market/Why/Proof) | Sonnet | ~15,000 |
| Insights B (Comp/Position/Keywords) | Sonnet | ~15,000 |
| Insights C (Pain Points) | Sonnet | ~15,000 |
| SWOT | Sonnet | ~4,000 |
| Score Pass 1 | GPT-5.2 | 4,000 |
| Score Pass 2 | GPT-5.2 | 4,000 |
| Score Pass 3 | GPT-5.2 | 4,000 |
| Business Metrics | GPT-5.2 | 4,000 |
| Market Sizing | GPT-5.2 | 4,000 |

Followed by a reconciliation step (~10 sec).

---

## Phase 1 Optimization: Parallel Deep Research

### Current Problem

`runChunkedDeepResearch()` fires 5 sequential focused research calls with 2-minute delays between chunks. Total Phase 1 time: 30-60+ minutes. Each call can get stuck in OpenAI's queue for 10-45 minutes, and the delays add 8-10 minutes of pure dead time.

### Switch to Background Mode

OpenAI explicitly recommends background mode for deep research. It eliminates HTTP-level timeouts entirely — you fire the request with `background: true`, receive a response ID, and either poll or receive a webhook when complete.

**Existing infrastructure:** `packages/server/src/lib/deep-research.ts` already contains polling and background mode utilities. Evaluate what's already implemented before building new infrastructure — this may reduce Phase B implementation effort significantly. If polling is already functional, the main work is wiring it into the parallel call pattern and adding webhook support for completion notifications.

**Railway-specific consideration:** Your webhook endpoint must respond quickly (well under Railway's ~5-minute POST timeout). The webhook handler should do nothing more than write the response ID and status to Redis/DB, then return 200. The actual processing of results happens in the BullMQ worker, not in the webhook handler.

```
Webhook receives completion → writes to Redis → returns 200 (< 1 second)
BullMQ worker polls Redis → picks up completed results → continues pipeline
```

### Consolidate to 3 Parallel Calls

| Call | Focus | Combines Old Chunks |
|------|-------|---------------------|
| A | Market & Competitive Landscape | Chunks 1 + 2 |
| B | Customer Validation & Timing | Chunks 3 + 4 |
| C | Market Sizing & Financial Data | Chunk 5 |

Fire all three in parallel using background mode. Use `max_tool_calls` as a soft hint (community reports indicate it can be ignored by deep research models — design timeouts as if it doesn't exist).

**Rate limit concern:** The 200k TPM limit was the reason for the 2-minute gaps. With background mode, OpenAI handles queueing internally. If still concerned, stagger calls by 30 seconds rather than 2 minutes.

**Expected time savings:** 10-25 minutes parallel vs. 30-60+ minutes sequential (50-70% reduction).

### Run Social Research Concurrently

Phase 2 (Social Research) uses `ideaTitle`, `ideaDescription`, and `interviewData` as inputs — none of which come from Phase 1. Fire it immediately when the pipeline starts, concurrent with deep research. Eliminates 3-5 minutes from the critical path.

**Social Research fallback thresholds:** Brave Search returns results first; if < 5 posts or < 500 total words, falls back to OpenAI `web_search_preview`. These are tuned values — preserve them in the parallel architecture.

### Query Expansion Rethink

`query-expansion.ts` currently runs during chunks 2-5, feeding variations into subsequent chunks. Sources: 17 deterministic templates (free), LLM-generated keywords, and SerpAPI rising queries (budget-permitting, via `serpapi.ts`). With parallel calls, there are no subsequent chunks. Options:

- **Pre-compute:** Run query expansion before all three parallel calls (as part of the prompt rewriting step) and distribute relevant expansions to each call upfront.
- **Independent expansion:** Let each parallel call include its own expansion instructions in the prompt, expanding independently within its domain.

Recommend the pre-compute approach since it's cleaner and lets you use the interview data to generate more targeted expansions.

### Add Prompt Rewriting Pre-Step

OpenAI's own ChatGPT Deep Research uses a 3-step process: clarification, prompt rewriting (via GPT-4.1), then deep research. The API omits the first two steps.

Add a lightweight rewriting step using a fast model (GPT-4.1 or Claude Haiku, ~5 seconds) that expands the user's idea description into 3 focused research briefs — one per parallel deep research call. This step should incorporate all available input context: `ideaTitle`, `ideaDescription`, `interviewData`, `interviewMessages`, and critically **`canvasContext`** (founder's notes snapshot) when present. Canvas notes are high-signal founder context that should directly inform research brief generation — e.g., a founder noting "we're targeting enterprise, not SMB" should steer all three research calls accordingly.

---

## Error Handling & Resilience (Expanded)

### Error Classification Strategy

Your pipeline classifies six error types: `timeout`, `rate_limit`, `transient` (502/503/504), `api_error`, `parse_error`, `sla_exceeded`. The current report addresses timeout and rate_limit; here's how to handle all six:

| Error Type | Current Handling | Recommended |
|------------|-----------------|-------------|
| `timeout` | Not retried (bug) | Add `APIConnectionTimeoutError` to `isRetryable`; retry 3× |
| `rate_limit` | Exponential backoff | Add jitter; backoff from 429 `retry-after` header |
| `transient` (502/503/504) | Exponential backoff | Same, with circuit breaker after 5 consecutive failures |
| `api_error` | Fail | Retry once; if persistent, log payload for debugging |
| `parse_error` | Fail | Retry with nudged prompt (add "respond ONLY with valid JSON"); fall back to different model on 2nd failure |
| `sla_exceeded` | Logged | Trigger circuit breaker cascade (see below) |

**`parse_error` deserves special attention.** When Zod validation fails on a model response, the current behavior is to fail the task. Better approach: retry the same call with a prompt suffix nudging the model toward valid output (e.g., "Your response must conform exactly to this JSON schema: ..."). If it fails again, try the same prompt on a different model (e.g., Sonnet → GPT-5.2 or vice versa). Different models fail on different schema edge cases. Only fail after both retries fail.

### Circuit Breakers with Model Fallback

Current: exponential backoff with 3 retries, but a stuck deep research call can burn 60+ minutes.

Recommended tiered approach, designed within the existing **50-minute deep research SLA**:

- **0-15 min:** Wait for o3-deep-research
- **15-20 min:** Fire a parallel hedge request to o4-mini-deep-research
- **20-25 min:** Use whichever completes first (prefer o3)
- **25-40 min:** Fall back to o3 with `web_search` (non-deep-research) + your own search aggregation
- **40-50 min:** Accept degraded results from whatever completed; do not exceed the 50-min SLA

The **total pipeline SLA is 90 minutes** (deep research 50min, social 20min, synthesis 10min, generation 10min). Circuit breaker thresholds should be calibrated against these existing SLAs, not chosen arbitrarily.

### Partial Failure Strategy for Parallel Deep Research

With 3 parallel calls, if Call B fails but A and C succeed:

1. Retry Call B independently up to 3 times (holding A and C's results)
2. Fall back to o4-mini-deep-research for Call B
3. Only deliver partial report (with sections marked incomplete) as a last resort

### Resume Support Update

Current resume logic detects which sequential phases have data and skips completed ones. With parallel calls within Phase 1, track completion per call:

```typescript
{
  deepResearchCallA: 'complete',   // Market & Competitive
  deepResearchCallB: 'failed',     // Customer & Timing  
  deepResearchCallC: 'complete',   // Market Sizing
  socialResearch: 'complete'
}
```

Resume only reruns the failed call.

**`notesSnapshot` consideration:** The DB stores a `notesSnapshot` alongside research results. On pipeline resume after failure, check whether `canvasContext` has changed since `notesSnapshot` was captured. If the founder updated their notes between the failure and the resume, you may want to re-fire the prompt rewriting step and affected research calls rather than resuming with stale context. At minimum, update `notesSnapshot` to the latest `canvasContext` on resume.

### Scoring Pass Optimization

Current: `extractScores()` runs 3 independent GPT-5.2 passes sequentially, averages them. If deviation > 15, flags as unreliable.

Improvements:
- Run the 3 scoring passes in **parallel** (saves ~60-70% of scoring time)
- If deviation > 15, automatically run 2 additional passes and use **median** instead of mean (self-healing rather than just flagging)
- Consider 2 passes normally, third only on disagreement (conditional compute)

---

## Quality Improvements

### Extend Existing Quality Scoring

`packages/server/src/lib/quality-scoring.ts` already implements data quality assessment. Rather than building a new quality gate from scratch, extend this existing module with additional checks:

- **Source quality weighting:** Score deep research sources by authority (primary sources > aggregators > forums)
- **Coverage completeness:** Check whether all 7 extraction dimensions received adequate source material
- **Contradiction detection:** Flag when market sizing data contradicts competitor revenue data
- **Confidence calibration:** Compare `quality-scoring.ts` confidence outputs against actual score deviations from `extractScores()`

This integrates naturally with the existing pipeline rather than bolting on a separate quality system.

### Cross-Validation Layer

After deep research and social proof both complete, add a brief cross-referencing step (~2,000 tokens, ~15 seconds) where the synthesis model checks whether deep research claims are corroborated by actual social proof data.

Output:
- **Confirmed findings** — supported by both sources
- **Research-only findings** — deep research found it, no social corroboration
- **Social-only findings** — real user complaints not captured in market research
- **Contradictions** — between the two sources

### Final Report Quality Gate

After Phase 4 generation, add a lightweight quality check using a fast model (~10 seconds) that reviews the assembled report for:
- Internal consistency (do scores match the narrative?)
- Completeness (are all sections populated?)
- Citation coverage (are key claims backed by sources?)
- Readability and coherence

If the quality gate fails, flag specific sections for regeneration rather than failing the entire pipeline.

### Progressive Delivery

Stream intermediate results to users as each phase/chunk completes:
- Show social proof results as soon as Phase 2 completes
- Display partial findings from completed deep research calls
- Show scores as they're computed
- Generate report sections as data becomes available

This doesn't reduce actual time but dramatically reduces perceived wait time.

---

## Perplexity Sonar Deep Research: Provider Evaluation

### Overview

Perplexity's Sonar Deep Research API is a potential alternative or complement to OpenAI's o3-deep-research for your Phase 1 web research. It autonomously searches across hundreds of sources, synthesizes findings, and returns structured reports with inline citations — functionally similar to what your pipeline does with o3-deep-research today.

### Key Capabilities

Sonar Deep Research autonomously plans multi-step research workflows, executing searches, reading pages, evaluating source quality, and refining its approach as it gathers information. It returns structured responses with inline citations, search results metadata, and reasoning traces. Key features relevant to your pipeline:

- **128K context length** — handles large, complex research prompts
- **Exhaustive multi-source research** — searches hundreds of sources per query (sample response showed 28 citations and 21 search queries for a single request)
- **Built-in citations** — returns `citations[]` array with URLs, plus `search_results[]` with titles, URLs, dates, and snippets
- **Reasoning effort control** — `reasoning_effort` parameter (`low`/`medium`/`high`) lets you trade speed for depth
- **Async API** — supports background processing via `POST /async/chat/completions` with polling via `GET /async/chat/completions/{request_id}`
- **No training on customer data** — relevant for sensitive startup research

### Speed Advantage

This is Perplexity's strongest differentiator for your use case. Reports from developers indicate most deep research tasks complete in under 3 minutes, compared to OpenAI's o3-deep-research which routinely takes 5-20+ minutes per call. A sample request with `reasoning_effort: "low"` completed a comprehensive heavy industry analysis with 39 sources, 14 search queries, and 7,000 output tokens. Even at `medium`/`high` effort, Perplexity's architecture (multi-LLM ensemble on Cerebras hardware) is substantially faster than OpenAI's deep research.

For your pipeline where Phase 1 currently takes 30-60+ minutes across 5 sequential calls, switching to 3 parallel Perplexity deep research calls could reduce Phase 1 to **3-10 minutes total** — a dramatically larger improvement than parallelizing o3-deep-research alone (10-25 minutes).

### Pricing

Perplexity Sonar Deep Research pricing has multiple cost components:

| Component | Cost |
|-----------|------|
| Input tokens | $2 / 1M tokens |
| Output tokens | $8 / 1M tokens |
| Citation tokens | $2 / 1M tokens |
| Reasoning tokens | $3 / 1M tokens |
| Search queries | $5 / 1K queries |

A sample comprehensive research request (quantum computing industry analysis) cost **$0.82 total**: $0.00 input, $0.09 output (11.4K tokens), $0.04 citation (19K tokens), $0.58 reasoning (194K tokens), $0.11 search (21 queries).

For your pipeline running 3 parallel deep research calls per report, estimated cost per report: **$1.50-3.00** for Phase 1 on Perplexity, depending on reasoning effort level. Compare this against o3-deep-research pricing for your current 5-chunk approach.

### Rate Limits

Rate limits depend on usage tier and are notably restrictive for deep research:

| Tier | Deep Research RPM | Async POST RPM |
|------|-------------------|----------------|
| Tier 1 | 5 | 5 |
| Tier 2 | 10 | 10 |
| Tier 3 | 20 | 20 |

At Tier 1 (5 RPM), you can fire 3 parallel calls per pipeline run with 2 RPM headroom. At scale with concurrent users, this becomes a bottleneck — if 2 users start research simultaneously, you'd exceed the limit. Plan for Tier 2+ or implement request queuing.

### Known Issues

A recent bug report (January 2026) on the Perplexity community forum describes the async API returning `IN_PROGRESS` status for 30-40 minutes even though the actual computation completed in ~2 minutes. The `completed_at` timestamp showed a 2-minute window, but the polling endpoint didn't reflect this until much later. This is a polling infrastructure bug, not a computation speed issue, but it would negate Perplexity's speed advantage until resolved. Verify whether this has been fixed before committing to the async API path.

### Integration Approach

Perplexity uses an OpenAI-compatible chat completions API, making integration straightforward:

```typescript
const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'sonar-deep-research',
    messages: [{ role: 'user', content: researchPrompt }],
    reasoning_effort: 'medium' // low | medium | high
  })
});
```

The response includes `citations`, `search_results`, and `usage` (with cost breakdown) — all of which map cleanly onto your existing `DeepResearchOutput` schema (`rawReport`, `citations`, `sources`).

### Recommendation: Dual-Provider Strategy

Rather than replacing OpenAI deep research entirely, use Perplexity as a **complement and fallback**:

**Option A — Perplexity as primary, OpenAI as fallback:**
- Fire all 3 parallel research calls on Perplexity Sonar Deep Research
- If any call fails or returns insufficient results (< threshold word count), retry on o3-deep-research
- Expected Phase 1 time: 3-10 minutes (down from 30-60+)
- Risk: Perplexity's research depth may not match o3 for niche startup domains

**Option B — Parallel hedge (best quality, higher cost):**
- Fire Perplexity + OpenAI simultaneously for each research call
- Use whichever completes first as primary, merge unique findings from the slower one when it completes
- Best possible quality and speed, but doubles API cost for Phase 1
- Only viable if Phase 1 cost is a small fraction of total pipeline value

**Option C — Tier-based routing:**
- PRO users: o3-deep-research (highest quality, slower)
- FREE users: Already use o4-mini-deep-research; consider switching to Perplexity Sonar Deep Research for faster results and potentially better quality than o4-mini
- This aligns with your existing tier-based model selection

**Recommended approach:** Start with Option C (tier-based routing) — switch FREE users from o4-mini to Perplexity Sonar Deep Research immediately, since it's likely faster and higher quality than o4-mini at comparable cost. Monitor source quality and output depth for the first 50 reports. Once confident, move PRO users to Option A (Perplexity primary, OpenAI fallback) for the speed gains. If quality gaps emerge in specific domains (e.g., market sizing from proprietary databases like Statista/IBISWorld), keep OpenAI for those specific calls and use Perplexity for the rest.

---

## Railway-Specific Considerations

### POST Request Timeout (~5 minutes)

Railway enforces an approximately 5-minute timeout on POST requests. This affects:
- **Webhook endpoints:** Must respond quickly. Write results to Redis/DB and return 200 immediately. Never process deep research results inline in the webhook handler.
- **API endpoints:** If your tRPC endpoints trigger research synchronously before responding, ensure they enqueue to BullMQ and return immediately with a job ID.

This does **not** affect BullMQ workers, which run as long-lived processes independent of HTTP request timeouts.

### Redis Memory Management

Your research pipeline stores substantial data in Redis (job payloads include 141k+ character prompts and large JSON outputs). Key considerations:
- Set `maxmemory-policy=noeviction` on Railway Redis (BullMQ requirement — eviction causes silent data loss and broken job state)
- Configure `removeOnComplete` and `removeOnFail` with reasonable retention (e.g., keep last 100 completed jobs, not all of them) to prevent unbounded memory growth
- Monitor Redis memory usage — large research payloads can accumulate quickly, especially during retries
- Consider storing large payloads (raw deep research output) in your database rather than in Redis job data, passing only a reference ID in the job payload

### Worker Resilience on Railway

Railway can restart deployments during deploys or scaling events. Implement graceful shutdown:

```typescript
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing worker...`);
  await worker.close(); // Waits for current job to complete
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
```

Set `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` to give in-flight jobs time to complete (e.g., 300 seconds for Phase 3/4 work, though this won't help if Phase 1 is mid-flight — resume support handles that case).

### Separate Worker Service

Railway has no built-in background worker type. If you're running your BullMQ worker in the same service as your API server, consider splitting into two Railway services:
- **API service:** Handles HTTP requests, enqueues jobs
- **Worker service:** Runs BullMQ workers, processes pipeline jobs

This gives you independent scaling, deploys, and resource allocation. Your worker can have higher memory/CPU limits without affecting API latency.

---

## Revised Pipeline Architecture

```
User clicks "Start Research"
        ↓
[Pre-processing] Prompt Rewriting + Query Expansion — GPT-4.1 (~5 sec)
  Inputs: ideaTitle, ideaDescription, interviewData, interviewMessages, canvasContext
  Output: 3 focused research briefs + expanded queries
  Side effect: Store canvasContext as notesSnapshot in DB
        ↓
    ┌───────────────────────────┐
    │      PARALLEL BLOCK        │
    ├───────────────────────────┤
    │ Deep Research A (bg mode)  │  Market + Competitive
    │ Deep Research B (bg mode)  │  Customer + Timing
    │ Deep Research C (bg mode)  │  Market Sizing
    │ Social Research            │  Brave Search + Claude Sonnet
    │                            │  (fallback: OpenAI if <5 posts or <500 words)
    └──────────┬────────────────┘
               ↓ (webhook/poll completion)
    [Cross-Validation] Deep Research ↔ Social Proof (~15 sec)
               ↓
    ┌───────────────────────────┐
    │  PARALLEL EXTRACT (9 tasks) │
    ├───────────────────────────┤
    │ Insights A (Market/Why)    │  Sonnet — ~15k tokens
    │ Insights B (Comp/Position) │  Sonnet — ~15k tokens
    │ Insights C (Pain Points)   │  Sonnet — ~15k tokens
    │ SWOT                       │  Sonnet
    │ Scores (3 parallel passes) │  GPT-5.2
    │ Business Metrics           │  GPT-5.2
    │ Market Sizing              │  GPT-5.2
    └──────────┬────────────────┘
               ↓ (reconciliation ~10 sec)
    ┌───────────────────────────┐
    │     PARALLEL GENERATE      │
    ├───────────────────────────┤
    │ User Story                 │  Sonnet
    │ Value Ladder               │  Sonnet
    │ Action Prompts             │  Sonnet
    │ Tech Stack                 │  Sonnet
    └──────────┬────────────────┘
               ↓
    [Quality Gate] Extends quality-scoring.ts (~10 sec)
               ↓
    Research Complete → stored in DB
```

### Expected Timing

| Phase | Current | Optimized (OpenAI) | Optimized (Perplexity) |
|-------|---------|-------------------|----------------------|
| Prompt Rewriting | N/A | ~5 sec | ~5 sec |
| Deep Research | 30-60+ min (sequential) | 10-25 min (parallel bg mode) | 3-10 min |
| Social Research | 3-5 min (after DR) | 0 min (parallel with DR) | 0 min (parallel) |
| Cross-Validation | N/A | ~15 sec | ~15 sec |
| Synthesis/Extraction | 2-5 min (Opus bottleneck) | 1-2 min (all Sonnet, parallel) | 1-2 min |
| Report Generation | 2-3 min | 2-3 min | 2-3 min |
| Quality Gate | N/A | ~10 sec | ~10 sec |
| **Total** | **37-73+ min** | **13-30 min** | **6-15 min** |

---

## BullMQ Architecture: Flows

Restructure the pipeline to use BullMQ's Flow (parent-child) pattern for better fault isolation:

```
Research Pipeline (parent — waits for all children)
│
├── Phase 1+2 Group
│   ├── Deep Research Call A (child)
│   ├── Deep Research Call B (child)
│   ├── Deep Research Call C (child)
│   └── Social Research (child)
│
├── Cross-Validation (runs when Phase 1+2 group completes)
│
├── Phase 3 Group
│   ├── Insights Extraction A (child)
│   ├── Insights Extraction B (child)
│   ├── Insights Extraction C (child)
│   ├── SWOT Extraction (child)
│   ├── Score Pass 1 (child)
│   ├── Score Pass 2 (child)
│   ├── Score Pass 3 (child)
│   ├── Business Metrics (child)
│   └── Market Sizing (child)
│
├── Reconciliation (runs when Phase 3 group completes)
│
├── Phase 4 Group
│   ├── User Story (child)
│   ├── Value Ladder (child)
│   ├── Action Prompts (child)
│   └── Tech Stack (child)
│
└── Quality Gate (runs when Phase 4 completes)
```

Benefits:
- Each child job has independent retry/timeout logic
- Failed children retry without rerunning siblings
- Better observability — you see exactly which sub-task failed
- Workers can process children across Railway service replicas

---

## Key File Reference

| File | Purpose | Report References |
|------|---------|-------------------|
| `packages/server/src/services/research-ai.ts` | Main orchestration (~4500 lines) | Routing bug, extractInsights, extractSWOT |
| `packages/server/src/services/research-schemas.ts` | Zod validation (SWOTSchema at :294) | parse_error retry strategy |
| `packages/server/src/routers/research.ts` | tRPC endpoints, BullMQ job queueing | Async enqueue pattern |
| `packages/server/src/lib/deep-research.ts` | Polling, background mode utilities | **Already has bg mode infra** |
| `packages/server/src/lib/query-expansion.ts` | Query variation generation (3 sources) | Pre-compute for parallel |
| `packages/server/src/lib/serpapi.ts` | Google Trends + rising queries | Budget-dependent expansion |
| `packages/server/src/lib/quality-scoring.ts` | Data quality assessment | **Extend, don't rebuild** |
| `packages/server/src/services/config.ts` | SLA and model configuration | SLA thresholds for circuit breakers |
| `anthropic/index.ts:189-209` | Model routing logic | **Bug location** |

---

## Implementation Priority

### Phase A — Immediate (fixes current timeouts)
1. Fix `selectModel()` routing — flip default to Sonnet, opt-in to Opus
2. Add `APIConnectionTimeoutError` to `isRetryable`
3. Audit all task strings for other silent misroutes
4. Switch SWOT to Sonnet with enriched prompt

### Phase B — Next sprint (speed + resilience)
5. Evaluate existing `deep-research.ts` background mode utilities; extend as needed
6. Switch deep research to background mode + webhooks/polling
7. Parallelize deep research (5 sequential → 3 parallel)
8. Run social research concurrently with deep research
9. Parallelize scoring passes
10. Reduce Redis payload size (store raw research in DB, pass reference IDs)
11. Integrate Perplexity Sonar Deep Research for FREE tier

### Phase C — Following sprint (quality + architecture)
12. Add prompt rewriting pre-step (incorporating canvasContext)
13. Split `extractInsights()` into 3 focused parallel calls
14. Add cross-validation layer
15. Extend `quality-scoring.ts` with quality gate checks
16. Add `parse_error` retry-with-nudge strategy
17. Restructure to BullMQ Flows
18. Implement circuit breakers calibrated to existing SLAs
19. Add timing telemetry + alerting

### Phase D — Polish
20. Progressive delivery (streaming intermediate results)
21. Separate API and worker Railway services
22. Graceful shutdown handling
23. Dead letter queues and monitoring dashboard
24. Migrate PRO tier to Perplexity primary + OpenAI fallback
25. notesSnapshot staleness check on resume

Each phase builds on the previous. Phase A alone should eliminate your current timeout failures. Phase B should cut total pipeline time by 50%+. Phases C and D improve output quality and operational maturity.

---

## Appendix: Discrepancies Between Pipeline Doc and Report

For transparency, here are the discrepancies identified between your pipeline overview markdown and this report, and how each was resolved:

| # | Issue | Resolution |
|---|-------|------------|
| 1 | Doc says extractInsights uses 25,000 tokens; code uses 50,000 | Report uses 50,000 (code is ground truth); added correction note |
| 2 | Doc says "4 parallel extractions" in Phase 3; SWOT makes it 5 | Report corrected to 5 current / 9 proposed |
| 3 | `deep-research.ts` has existing bg mode utilities | Report now references it; reduces Phase B effort estimate |
| 4 | `quality-scoring.ts` already exists | Report recommends extending it rather than building new |
| 5 | Social research fallback thresholds (<5 posts / <500 words) | Added to Phase 1 section |
| 6 | `canvasContext` input never addressed | Incorporated into prompt rewriting step |
| 7 | Existing SLAs (DR 50min, total 90min) not used in circuit breakers | Circuit breaker thresholds now calibrated to SLAs |
| 8 | Error classification (`parse_error`, `sla_exceeded`) underused | Full error handling table added |
| 9 | `notesSnapshot` DB column unaddressed | Added staleness check on resume |
