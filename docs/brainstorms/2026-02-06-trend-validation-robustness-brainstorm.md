# Brainstorm: Trend Validation Data Robustness

**Date:** 2026-02-06
**Status:** Ready for planning

---

## What We're Building

An enhanced query strategy and data quality layer for both the Spark and full research pipelines. The core problem: API calls succeed but return thin, sparse results because queries are too literal, miss colloquial phrasing, and don't cover enough angles. Users can't tell why results are weak.

### The Solution: Front-Loaded Query Intelligence + Data Quality Transparency

**Before any data gathering**, generate a rich set of search variations using a hybrid approach:

1. **Template-based expansion** — Deterministic patterns that always work:
   - `"[topic] problems"`, `"how to [topic]"`, `"[topic] vs alternatives"`
   - `"[topic] reddit"`, `"best [topic] 2026"`, `"why is [topic] hard"`
   - `"[topic] complaints"`, `"[topic] wishlist"`, `"tired of [topic]"`
   - Platform-specific: `site:reddit.com [topic]`, `"[topic] facebook group"`

2. **LLM-generated variations** (GPT-4o-mini, fast + cheap) — Topic-specific phrasing humans would actually use:
   - Colloquial reformulations ("how people actually talk about this")
   - Adjacent problem framings
   - Industry jargon and niche terminology
   - Question-form queries ("Can I...", "Is there a way to...")

3. **Parallel execution** — Run expanded queries across SerpAPI and deep research simultaneously, with reasonable limits (8-12 queries per section, balanced for cost)

4. **User-facing data quality scores** — Each report section shows:
   - Confidence indicator (how well-supported the data is)
   - Sources found vs searched
   - Signal strength per data type (e.g., "Reddit: 8 threads, Facebook: 3 groups, Trends: rising")

---

## Why This Approach

**Front-loading over retry loops** because:
- Simpler architecture — one pass through the pipeline, no feedback loops
- Parallel execution means latency doesn't increase linearly with query count
- Deterministic templates guarantee baseline coverage
- LLM expansion handles the creative/topic-specific phrasing that templates miss

**Hybrid query generation** because:
- Templates alone can't handle niche topics or industry-specific language
- LLM alone is unpredictable and adds latency for patterns that are always the same
- Combining both gives reliable baseline + creative upside

**User-facing transparency** because:
- Users should know how well-supported each insight is
- Confidence scores set appropriate expectations
- Builds trust — shows the work behind the analysis

---

## Key Decisions

1. **Approach: Front-load queries** — Generate many variations upfront, run in parallel, aggregate results (not retry loops)
2. **Query method: Hybrid templates + LLM** — Deterministic templates for reliable patterns, GPT-4o-mini for topic-specific creative variations
3. **Scope: Both pipelines** — Apply to Spark (quick validation) AND full research pipeline
4. **Transparency: User-facing** — Show confidence scores and data coverage directly in report UI
5. **Cost/speed: Balanced** — Quality is priority but with reasonable parallelism (8-12 queries per section) and cost awareness (cache, batch, use cheap models for expansion)

---

## Open Questions

1. **Query limits per section** — Exactly how many parallel queries per data type? Needs testing to find the sweet spot between quality and cost.
2. **Confidence score design** — What does the UI indicator look like? Simple color (green/yellow/red)? Percentage? Bar chart?
3. **Caching strategy** — Should expanded queries be cached per topic? SerpAPI results have natural cache windows.
4. **Deduplication** — When multiple queries return overlapping results (e.g., same Reddit thread from different queries), how to merge/deduplicate cleanly.
5. **Spark vs Research differentiation** — Should Spark (quick validation) use fewer expanded queries than the full pipeline to stay fast?
6. **Failure threshold** — If after expanded queries a section is still thin, should there be a fallback (broader queries, different time window) or just show the low confidence score?