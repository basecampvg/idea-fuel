---
title: Research Pipeline Provider Abstractions
type: feat
date: 2026-02-12
brainstorm: docs/brainstorms/2026-02-12-research-pipeline-improvements-brainstorm.md
estimated_effort: 2-3 weeks
expected_impact: 40-50% cost reduction, 30-35% speed improvement
---

# Research Pipeline Provider Abstractions

## Overview

Redesign the research pipeline with **provider-agnostic abstractions** that enable integration of Brave Search API and Anthropic Claude models alongside existing OpenAI services. This hybrid approach maintains quality while achieving significant cost and speed improvements through strategic provider selection and targeted parallelization.

**Key Components:**
1. Provider abstraction layer (`SearchProvider`, `AIProvider` interfaces)
2. Brave Search integration for cost-effective social proof scraping
3. Anthropic Claude models for extraction, synthesis, and business plan generation
4. Parallelization of Phase 3 (extraction) and Phase 4 (generation) tasks
5. Configurable fallback strategies per tier (FREE/PRO/ENTERPRISE)

**Impact:**
- **Cost:** $15-20/run → $8-12/run (40-50% reduction)
- **Speed:** 45-60min → 30-40min (30-35% reduction)
- **Quality:** Maintained or improved via Claude Opus business plans

---

## Problem Statement / Motivation

### Current Pain Points

1. **High Cost:** Social proof phase uses expensive o3-deep-research with web_search_preview (~$15/call)
2. **Limited Speed:** 45-60 minute pipeline SLAs are too long for good user experience
3. **Poor Configurability:** Difficult to A/B test models or customize per-tier without code changes

### Why Now?

- Brave Search API offers 98% cost reduction for social scraping (~$0.01/query vs ~$15/call)
- Claude 3.7 models (Sonnet/Opus) provide better quality for specific tasks (extraction, long-form writing)
- Current sequential architecture creates bottlenecks that parallelization can eliminate
- Config service infrastructure is mature and ready to support multi-provider configuration

### Business Impact

- **FREE tier:** Becomes viable at $8-10/run (currently loss-leader at $15-20)
- **PRO tier:** Better margins enable feature expansion
- **User satisfaction:** Faster pipelines improve perceived quality, reduce abandonment

---

## Proposed Solution

### Architecture: Hybrid Pipeline Redesign

Create provider-agnostic abstractions that decouple pipeline logic from specific AI/search providers, enabling:
- **Runtime provider selection** via config service (no code deploys needed)
- **Graceful fallback** when primary providers fail or return low-quality results
- **Cost optimization** through strategic provider assignment by task type
- **Quality enhancement** by using each provider's strengths

### Provider Abstraction Layer

**Interfaces:**

```typescript
// packages/server/src/providers/types.ts

export interface SearchProvider {
  name: string; // 'brave' | 'openai' | 'serpapi'

  search(query: string, options?: {
    domains?: string[];
    maxResults?: number;
  }): Promise<SearchResult[]>;

  searchSocial(query: string, platforms: string[]): Promise<{
    posts: SocialProofPost[];
    totalResults: number;
    sources: string[];
  }>;
}

export interface AIProvider {
  name: string; // 'openai' | 'anthropic'

  // Deep research (web search + synthesis)
  research(prompt: string, options: {
    searchProvider?: SearchProvider;
    background?: boolean;
    maxTokens?: number;
  }): Promise<{
    output: string;
    citations: string[];
    reasoning?: string;
  }>;

  // Structured extraction (JSON output)
  extract<T>(prompt: string, schema: z.ZodSchema<T>, options?: {
    maxTokens?: number;
  }): Promise<T>;

  // Creative generation (long-form text)
  generate(prompt: string, options?: {
    maxTokens?: number;
    temperature?: number;
  }): Promise<string>;
}
```

**Implementations:**

1. **BraveSearchProvider** - Web search with domain filtering (mirrors `serpapi.ts` pattern)
2. **OpenAISearchProvider** - Existing `web_search_preview` tool wrapper
3. **OpenAIProvider** - Existing o3/o4-mini/GPT-5.2 wrapper
4. **AnthropicProvider** - Claude 3.7 Sonnet/Opus integration

### Provider Assignment Matrix

| Phase | Task | Model Choice | Rationale |
|-------|------|--------------|-----------|
| **Phase 1** | Deep Research (5 chunks) | o3-deep-research (default) OR Claude Opus + Brave (experimental) | o3 has native web_search; Claude+Brave is alternative |
| **Phase 2** | Social Proof Synthesis | **Brave Search** + Claude Sonnet | 90% cost reduction, Claude synthesis quality |
| **Phase 3** | Insights Extraction | **Claude Sonnet** | Excellent structured extraction, reliable JSON |
| **Phase 3** | Score Calculation | **Claude Sonnet** | Consistency across multi-pass scoring |
| **Phase 3** | Business Metrics | **Claude Sonnet** | Structured extraction with numerical reasoning |
| **Phase 3** | Market Sizing | **Claude Sonnet** | TAM/SAM/SOM with sources |
| **Phase 4** | User Story | **Claude Sonnet** | Creative narrative at lower cost |
| **Phase 4** | Value Ladder | **Claude Sonnet** | Strategic positioning |
| **Phase 4** | Action Prompts | **Claude Sonnet** | Copywriting quality |
| **Phase 4** | Tech Stack | **Claude Sonnet** | Technical recommendations |
| **Phase 4** | Business Plan | **Claude Opus** | Long-form coherent writing (Claude's strength) |

### Fallback Strategy

**Social Proof Phase:**
```typescript
async function fetchSocialProof(input, tier) {
  // Try Brave Search first (cost optimization)
  const braveResults = await braveSearch.searchSocial(query, platforms);

  // Quality threshold validation
  if (braveResults.posts.length >= 5 && wordCount(braveResults) >= 500) {
    // Use Claude Sonnet to synthesize Brave results
    return await anthropic.extract(synthesisPrompt, SocialProofSchema);
  }

  // Fallback to OpenAI web_search_preview (quality guarantee)
  console.warn('Brave Search insufficient, falling back to OpenAI');
  return await openai.research(query, {
    searchProvider: openaiSearch,
    background: true
  });
}
```

**Extraction/Generation Phase:**
```typescript
async function extractWithFallback<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  tier: SubscriptionTier
): Promise<T> {
  const primaryProvider = getProviderForTier(tier); // 'anthropic' | 'openai'

  try {
    return await providers[primaryProvider].extract(prompt, schema);
  } catch (error) {
    console.warn(`${primaryProvider} extraction failed, falling back to OpenAI`);
    return await providers.openai.extract(prompt, schema);
  }
}
```

### Parallelization Strategy

**Phase 3: Extraction (4 concurrent tasks)**
```typescript
const [insights, scores, metrics, marketSizing] = await Promise.all([
  extractInsights(deepResearch, tier),        // Claude Sonnet
  extractScores(deepResearch, tier),          // Claude Sonnet
  extractBusinessMetrics(deepResearch, tier), // Claude Sonnet
  extractMarketSizing(deepResearch, tier),    // Claude Sonnet
].map(task => withExponentialBackoff(() => task, { maxAttempts: 3 })));
```

**Phase 4: Generation (4 concurrent, 1 sequential)**
```typescript
// Parallel batch 1
const [userStory, valueLadder, actionPrompts, techStack] = await Promise.all([
  generateUserStory(insights, tier),       // Claude Sonnet
  generateValueLadder(insights, tier),     // Claude Sonnet
  generateActionPrompts(insights, tier),   // Claude Sonnet
  generateTechStack(insights, tier),       // Claude Sonnet
].map(task => withExponentialBackoff(() => task, { maxAttempts: 3 })));

// Sequential (requires above artifacts)
const businessPlan = await withExponentialBackoff(
  () => generateBusinessPlan({
    insights, scores, metrics, marketSizing,
    userStory, valueLadder, techStack, tier
  }),
  { maxAttempts: 3 }
); // Claude Opus
```

---

## Technical Considerations

### Architecture Impacts

**New Directory Structure:**
```
packages/server/src/
├── providers/
│   ├── index.ts              # Factory functions, provider registry
│   ├── types.ts              # Provider interfaces
│   ├── openai/
│   │   ├── index.ts          # OpenAIProvider + OpenAISearchProvider
│   │   └── converters.ts     # Response format converters
│   ├── anthropic/
│   │   ├── index.ts          # AnthropicProvider implementation
│   │   └── converters.ts     # Response format converters
│   └── brave/
│       └── index.ts          # BraveSearchProvider implementation
├── lib/
│   ├── brave-search.ts       # Brave Search API client
│   ├── anthropic.ts          # Anthropic SDK client wrapper
│   └── provider-factory.ts   # Provider selection logic
```

**Modified Files:**
- `packages/server/src/services/research-ai.ts` - Use provider factory instead of direct SDK calls
- `packages/server/src/services/spark-ai.ts` - Use provider factory
- `packages/server/src/services/config.ts` - Add provider config keys
- `packages/server/src/lib/token-tracker.ts` - Make provider-agnostic
- `.env.example` - Add `BRAVE_SEARCH_API_KEY`, `ANTHROPIC_API_KEY`

### Performance Implications

**Speed Improvements:**
- Phase 2 (Social Proof): 15min → 5min (Brave API + Claude synthesis vs o3 web search)
- Phase 3 (Extraction): 15-20min → 5-8min (4 concurrent tasks)
- Phase 4 (Generation): 20-25min → 8-12min (4 concurrent tasks)
- **Total:** 50-60min → 30-35min (35% reduction)

**Cost Analysis:**
| Component | Current Cost | New Cost | Savings |
|-----------|-------------|----------|---------|
| Social Proof (Phase 2) | $15 (o3 web search) | $1.50 (Brave + Claude Sonnet) | 90% |
| Extraction (Phase 3) | $2-3 (GPT-5.2 x4) | $1-1.50 (Claude Sonnet x4) | 40% |
| Generation (Phase 4) | $0.50-1 (GPT-5.2 x5) | $2 (Claude Sonnet x4 + Opus x1) | -100% (cost increase) |
| **Total per run** | **$17.50-19** | **$8.50-11** | **50%** |

*Note: Phase 4 cost increase is offset by quality improvement (Claude Opus business plans) and speed gains from parallelization*

### Security Considerations

**API Key Management:**
- Store in `.env` file (not committed to repo)
- Add to `.env.example` with placeholder values
- Validate presence at startup (fail fast if missing)

**Rate Limiting:**
- Brave Search: 15,000 queries/month on free tier (monitor usage)
- Anthropic: Standard rate limits (tier-based)
- Implement circuit breaker pattern for provider health monitoring

**Error Exposure:**
- Don't leak API keys in error messages
- Classify errors before logging (strip sensitive data)
- Use `ResponseParseError` pattern to capture raw responses safely

### Dependencies

**New NPM Packages:**
```json
{
  "@anthropic-ai/sdk": "^0.30.0",
  "zod": "^3.22.0" // Already installed, but verify version
}
```

**Environment Variables:**
```bash
BRAVE_SEARCH_API_KEY=your_brave_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**External Services:**
- Brave Search API (https://api.search.brave.com/)
- Anthropic API (https://api.anthropic.com/)

### Migration Strategy

**Phase 1: Foundation (No User Impact)**
- Create provider interfaces
- Implement BraveSearchProvider + AnthropicProvider
- Add config keys (default to existing OpenAI providers)
- Write unit tests

**Phase 2: Gradual Rollout**
- Deploy with feature flags disabled (existing behavior)
- Enable for FREE tier first (lowest risk)
- Monitor quality metrics for 3-7 days
- Enable for PRO tier if metrics are positive
- Enable for ENTERPRISE tier last

**Phase 3: Optimization**
- A/B test provider combinations
- Tune quality thresholds for fallback triggers
- Optimize parallel execution batch sizes

---

## Acceptance Criteria

### Functional Requirements

#### Provider Abstraction Layer
- [x] `SearchProvider` interface defined in [providers/types.ts](providers/types.ts)
- [x] `AIProvider` interface defined in [providers/types.ts](providers/types.ts)
- [x] `BraveSearchProvider` implementation in [providers/brave/index.ts](providers/brave/index.ts)
- [x] `AnthropicProvider` implementation in [providers/anthropic/index.ts](providers/anthropic/index.ts)
- [x] `OpenAIProvider` wrapper implementation in [providers/openai/index.ts](providers/openai/index.ts)
- [x] Provider factory function in [providers/index.ts](providers/index.ts)
- [x] Provider config keys added to config.ts

#### Social Proof Phase Refactor
- [ ] `fetchSocialProof()` uses `SearchProvider` interface
- [ ] Quality threshold validation (minimum 5 posts, 500 words)
- [ ] Configurable fallback (Brave → OpenAI) working correctly
- [ ] Claude Sonnet synthesis of Brave Search results
- [ ] Cost tracking for Brave API calls (integrated with token-tracker.ts)

#### Extraction Phase Refactor
- [ ] `extractInsights()` uses `AIProvider.extract()` with Zod schema
- [ ] `extractScores()` uses `AIProvider.extract()` with Zod schema
- [ ] `extractBusinessMetrics()` uses `AIProvider.extract()` with Zod schema
- [ ] `extractMarketSizing()` uses `AIProvider.extract()` with Zod schema
- [ ] All 4 extraction tasks run in parallel via `Promise.all()`
- [ ] Retry logic wraps each parallel task (3 attempts with exponential backoff)

#### Generation Phase Refactor
- [ ] `generateUserStory()` uses `AIProvider.generate()`
- [ ] `generateValueLadder()` uses `AIProvider.generate()`
- [ ] `generateActionPrompts()` uses `AIProvider.generate()`
- [ ] `generateTechStack()` uses `AIProvider.generate()`
- [ ] `generateBusinessPlan()` uses `AIProvider.generate()` with Claude Opus
- [ ] First 4 generation tasks run in parallel
- [ ] Business plan runs sequentially after parallel tasks complete

#### Configuration & Tier Support
- [x] Config keys added to `config.ts` (`ai.search.provider`, `ai.extraction.provider`, `ai.generation.provider`)
- [x] Environment variables added to `.env.example` (BRAVE_SEARCH_API_KEY, ANTHROPIC_API_KEY)
- [ ] Tier-based provider matrix implemented (FREE/PRO/ENTERPRISE)
- [ ] Provider selection configurable via admin UI (no code deploy needed)
- [ ] Feature flags for gradual rollout (`BRAVE_SEARCH_ENABLED`, `ANTHROPIC_ENABLED`)

### Non-Functional Requirements

#### Performance
- [ ] Average pipeline time <40 minutes for PRO tier (baseline: 50-60min)
- [ ] Phase 3 parallelization achieves 60% time reduction (baseline: 15-20min → target: 5-8min)
- [ ] Phase 4 parallelization achieves 60% time reduction (baseline: 20-25min → target: 8-12min)

#### Cost
- [ ] Average cost per run <$12 across all tiers (baseline: $17.50-19)
- [ ] FREE tier cost: $8-10/run
- [ ] PRO tier cost: $10-12/run
- [ ] ENTERPRISE tier cost: $12-15/run

#### Quality
- [ ] Social proof quality: 10-15 posts per run (baseline: 8-12)
- [ ] Extraction accuracy: 95% JSON parse success (baseline: 85%)
- [ ] Business plan quality: 4.5/5 user rating (baseline: 4.2/5)
- [ ] Opportunity score consistency: ±8 points std dev (baseline: ±12 points)

#### Reliability
- [ ] 99.5% successful research runs (handle provider outages gracefully)
- [ ] 98% fallback success rate (Brave → OpenAI fallback)
- [ ] 95% completion rate for partial failures (e.g., 3/4 extraction tasks succeed)
- [ ] <0.5% research runs require manual intervention

### Quality Gates

- [ ] All unit tests passing (minimum 80% code coverage for new provider code)
- [ ] Integration tests passing for Brave Search + Anthropic providers
- [ ] Manual testing: 10 end-to-end research runs across all tiers
- [ ] Code review approved by at least 1 reviewer
- [ ] Documentation updated (CLAUDE.md changelog, README if needed)

---

## Success Metrics

### Cost Metrics (Target: 40-50% reduction)

**Baseline:** $15-20 per research run
**Target:** $8-12 per research run

**Measurement:**
```typescript
// Track in token-tracker.ts
interface ResearchCostMetrics {
  phase1_deepResearch: number;
  phase2_socialProof: number;
  phase3_extraction: number;
  phase4_generation: number;
  total: number;
  provider: {
    openai: number;
    anthropic: number;
    brave: number;
  };
}
```

**KPIs:**
- Average cost per run <$12 across all tiers
- FREE tier profitable (cost + overhead <$10)
- PRO tier margin improvement of 20%+

### Speed Metrics (Target: 30-35% reduction)

**Baseline:** 45-60 minutes per run
**Target:** 30-40 minutes per run

**Breakdown:**
- Phase 1 (Deep Research): 50min → 48min (reduce delays)
- Phase 2 (Social Proof): 15min → 5min (Brave + Claude)
- Phase 3 (Extraction): 15-20min → 5-8min (parallelization)
- Phase 4 (Generation): 20-25min → 8-12min (parallelization)

**KPIs:**
- P50 pipeline time <35 minutes for PRO tier
- P95 pipeline time <45 minutes for PRO tier
- User abandonment rate reduction of 15%+

### Quality Metrics (Target: maintain or improve)

**Social Proof Quality:**
- Baseline: 8-12 posts per run, 70% validation rate
- Target: 10-15 posts per run, 75% validation rate

**Extraction Accuracy:**
- Baseline: 85% JSON parse success, 2% hallucination rate
- Target: 95% parse success, <1% hallucination rate

**Business Plan Quality:**
- Baseline: 4.2/5 user rating, 3500 words average
- Target: 4.5/5 user rating, 4000 words average

**Measurement:**
```typescript
// Add to research record
interface QualityMetrics {
  socialProofPostCount: number;
  extractionParseSuccessRate: number;
  businessPlanWordCount: number;
  userRating: number; // 1-5 scale
  opportunityScoreStdDev: number;
}
```

**KPIs:**
- User satisfaction (NPS) increase of 10+ points for PRO tier
- Report regeneration rate <5% (users satisfied on first generation)

### Reliability Metrics

**Provider Uptime:**
- Target: 99.5% successful research runs
- Fallback success rate: 98%

**Partial Failure Recovery:**
- Target: 95% completion with 1-2 task failures
- Retry success rate: 90%

**KPIs:**
- <0.5% research runs require manual intervention or refunds
- Provider health monitoring dashboard shows real-time status

---

## Dependencies & Risks

### Technical Dependencies

**External APIs:**
- Brave Search API account + API key
- Anthropic API account + API key
- Both providers must have acceptable rate limits and pricing

**Internal Prerequisites:**
- Config service must be initialized before provider selection
- Token tracker must support multi-provider usage tracking
- Error handling must classify provider-specific errors

**NPM Dependencies:**
```json
{
  "@anthropic-ai/sdk": "^0.30.0"  // NEW
}
```

### Risks & Mitigation

#### Risk 1: Brave Search Coverage Insufficient
**Likelihood:** Medium
**Impact:** High (blocks social proof cost savings)

**Mitigation:**
- Run manual tests on 20+ business ideas before committing to implementation
- Set conservative quality thresholds (5 posts, 500 words) with fallback to OpenAI
- Monitor fallback rate; if >30%, investigate Brave Search query optimization

#### Risk 2: Claude Quality Below GPT-5.2
**Likelihood:** Low
**Impact:** High (user satisfaction drops)

**Mitigation:**
- A/B test Claude vs GPT-5.2 on 50 business plans before full rollout
- Use blind testing (remove provider attribution) for quality comparison
- Keep GPT-5.2 as fallback option in config

#### Risk 3: Parallel Execution Introduces Bugs
**Likelihood:** Medium
**Impact:** Medium (partial failures, inconsistent data)

**Mitigation:**
- Wrap each parallel task with `withExponentialBackoff()` retry logic
- Implement graceful degradation (continue with partial results)
- Add comprehensive logging for debugging parallel execution issues
- Write integration tests that simulate parallel task failures

#### Risk 4: API Rate Limits Hit During Peak
**Likelihood:** Medium
**Impact:** Medium (pipeline failures during busy periods)

**Mitigation:**
- Monitor Brave Search usage against 15,000/month free tier limit
- Implement rate limit detection and automatic throttling
- Add circuit breaker pattern to prevent cascading failures
- Upgrade to paid Brave Search tier if usage approaches limit

#### Risk 5: Migration Breaks Existing Research Runs
**Likelihood:** Low
**Impact:** High (user-facing failures)

**Mitigation:**
- Deploy with feature flags disabled (existing behavior)
- Gradual rollout: FREE → PRO → ENTERPRISE tiers
- Monitor error rates and quality metrics for 3-7 days per tier
- Keep rollback option (disable feature flags, redeploy)

### Blockers

**Hard Blockers (Cannot Proceed Without):**
- Brave Search API access (requires sign-up, credit card for paid tier)
- Anthropic API access (requires sign-up, credit card)
- Approval to modify core research pipeline (high-risk change)

**Soft Blockers (Can Work Around):**
- Testing infrastructure for integration tests (can use manual testing initially)
- Admin UI for provider configuration (can use direct database updates temporarily)

---

## Implementation Phases

### Phase 1: Foundation (Days 1-3)
**Goal:** Create provider abstraction layer and client implementations

**Tasks:**
1. Create provider interfaces (`SearchProvider`, `AIProvider`) in [providers/types.ts](providers/types.ts)
2. Implement `BraveSearchProvider` in [providers/brave/index.ts](providers/brave/index.ts)
3. Implement `AnthropicProvider` in [providers/anthropic/index.ts](providers/anthropic/index.ts)
4. Wrap existing OpenAI code in `OpenAIProvider` interface
5. Add config keys to `config.ts` (default to OpenAI)
6. Add environment variables to `.env.example`
7. Write unit tests for each provider

**Deliverables:**
- ✅ All provider implementations passing unit tests
- ✅ Config keys deployed (feature flags disabled)
- ✅ Environment variables documented

### Phase 2: Social Proof Refactor (Days 4-6)
**Goal:** Migrate social proof phase to Brave Search + Claude synthesis

**Tasks:**
1. Refactor `fetchSocialProof()` to use `SearchProvider` interface
2. Implement quality threshold validation
3. Implement configurable fallback logic (Brave → OpenAI)
4. Update prompts for Claude Sonnet synthesis
5. Add cost tracking to `token-tracker.ts`
6. Manual testing: 20 research runs, measure quality and cost
7. A/B test: 10 runs with Brave, 10 runs with OpenAI (compare results)

**Deliverables:**
- ✅ `fetchSocialProof()` supports both Brave and OpenAI
- ✅ Cost comparison data (expected: 90% reduction)
- ✅ Quality comparison data (expected: maintained or improved)

### Phase 3: Extraction Refactor (Days 7-10)
**Goal:** Migrate extraction tasks to Claude Sonnet with parallelization

**Tasks:**
1. Refactor extraction functions to use `AIProvider.extract()`:
   - `extractInsights()`
   - `extractScores()`
   - `extractBusinessMetrics()`
   - `extractMarketSizing()`
2. Add Zod schemas for all extraction outputs (if not already present)
3. Implement `Promise.all()` parallelization with retry wrappers
4. Update prompts for Claude's structured output format
5. Manual testing: 10 research runs, measure speed and quality
6. Compare extraction accuracy vs GPT-5.2 baseline

**Deliverables:**
- ✅ All 4 extraction tasks use `AIProvider` interface
- ✅ Parallel execution working (measured 60% speed improvement)
- ✅ Zod validation on all outputs
- ✅ Quality metrics match or exceed GPT-5.2 baseline

### Phase 4: Generation Refactor (Days 11-14)
**Goal:** Migrate generation tasks to Claude Sonnet/Opus with parallelization

**Tasks:**
1. Refactor generation functions to use `AIProvider.generate()`:
   - `generateUserStory()` → Claude Sonnet
   - `generateValueLadder()` → Claude Sonnet
   - `generateActionPrompts()` → Claude Sonnet
   - `generateTechStack()` → Claude Sonnet
   - `generateBusinessPlan()` → Claude Opus
2. Update prompts for Claude's conversational style
3. Implement parallel execution for first 4 tasks
4. Run business plan generation sequentially (requires artifacts from parallel tasks)
5. Manual testing: 10 research runs, blind quality comparison
6. User testing: 5 stakeholders rate business plans (Claude vs GPT-5.2, unlabeled)

**Deliverables:**
- ✅ All 5 generation tasks use `AIProvider` interface
- ✅ Parallel execution working (measured 60% speed improvement)
- ✅ Business plan quality meets or exceeds GPT-5.2 baseline
- ✅ Stakeholder approval on Claude Opus business plans

### Phase 5: Testing & Rollout (Days 15-21)
**Goal:** Comprehensive testing, optimization, and gradual production rollout

**Tasks:**
1. End-to-end testing: 50 research runs (mix of FREE/PRO/ENTERPRISE, diverse topics)
2. Cost analysis: Calculate actual cost per run, compare to projections
3. Speed analysis: Calculate actual pipeline time, compare to projections
4. Quality validation: Calculate metrics (post count, parse success, user ratings)
5. Tune quality thresholds for Brave Search fallback (optimize fallback rate)
6. Create admin dashboard for provider performance monitoring
7. Gradual rollout:
   - Day 15-17: Enable for FREE tier, monitor metrics
   - Day 18-20: Enable for PRO tier (if FREE tier metrics are good)
   - Day 21: Enable for ENTERPRISE tier (if PRO tier metrics are good)
8. Document learnings in CLAUDE.md changelog

**Deliverables:**
- ✅ Performance benchmarks documented
- ✅ Cost analysis per tier (FREE/PRO/ENTERPRISE)
- ✅ Quality validation report
- ✅ Admin dashboard deployed
- ✅ Gradual rollout completed (all tiers enabled)
- ✅ CLAUDE.md updated with implementation notes

---

## References & Research

### Internal References

**Codebase Patterns:**
- Provider initialization: [packages/server/src/lib/openai.ts:12-31](packages/server/src/lib/openai.ts#L12-L31)
- SerpAPI integration (template for Brave Search): [packages/server/src/lib/serpapi.ts:164-183](packages/server/src/lib/serpapi.ts#L164-L183)
- Exponential backoff retry: [packages/server/src/lib/deep-research.ts:107-195](packages/server/src/lib/deep-research.ts#L107-L195)
- Background polling pattern: [packages/server/src/lib/deep-research.ts:405-640](packages/server/src/lib/deep-research.ts#L405-L640)
- Config service usage: [packages/server/src/services/config.ts:727-759](packages/server/src/services/config.ts#L727-L759)
- Parallel deep research example: [packages/server/src/services/spark-ai.ts](packages/server/src/services/spark-ai.ts)

**Institutional Learnings:**
- Tier-based AI presets (feature flag approach): CLAUDE.md changelog 2026-01-18
- Parallel execution with retry logic: CLAUDE.md changelog 2026-01-22
- Flexible response parsing: CLAUDE.md changelog 2026-01-20
- SerpAPI query expansion patterns: CLAUDE.md changelog 2026-01-26

**Related Work:**
- Brainstorm document: [docs/brainstorms/2026-02-12-research-pipeline-improvements-brainstorm.md](docs/brainstorms/2026-02-12-research-pipeline-improvements-brainstorm.md)
- Deep research best practices: `deep-research-BP.md` (referenced in CLAUDE.md)

### External References

**API Documentation:**
- [Brave Search API Docs](https://api.search.brave.com/app/documentation/web-search/get-started)
- [Anthropic API Docs](https://docs.anthropic.com/en/api/getting-started)
- [Anthropic Claude 3.7 Models](https://docs.anthropic.com/en/docs/models-overview)

**Best Practices:**
- Provider abstraction patterns (from repo research)
- Multi-provider fallback strategies (from learnings research)
- Parallel execution safety (from Spark pipeline implementation)

---

## Open Questions

### Technical Questions

1. **Brave Search Rate Limits:**
   - Free tier: 15,000 queries/month - is this sufficient for current user base?
   - Paid tier pricing: $X/month for Y queries - when should we upgrade?
   - Rate limit error codes: How to detect and handle gracefully?

2. **Claude Context Window:**
   - Claude 3.7 has 200k context window - will entire deep research output fit?
   - Should we chunk business plan generation if context exceeds limits?
   - How to handle "Claude is busy" errors during peak times (circuit breaker)?

3. **Search Quality Validation:**
   - Are quality thresholds (5 posts, 500 words) optimal? Should we tune based on tier?
   - Should we validate citation quality (check if URLs are accessible)?
   - How to detect when Brave Search fails silently (returns irrelevant results)?

4. **Provider Selection Logic:**
   - Should FREE tier get option to upgrade to paid providers on-demand?
   - Should we auto-downgrade from Claude Opus → Sonnet if budget is tight?
   - How to handle provider outages (automatic failover vs manual intervention)?

5. **Parallel Execution Safety:**
   - Do we need rate limit coordination for parallel Claude API calls?
   - How to handle partial failures (e.g., 3/4 extraction tasks succeed - use partial data or fail entire phase)?
   - Should we implement circuit breaker pattern for provider health monitoring?

### Business Questions

6. **Cost Allocation:**
   - Should we expose provider choice to users (e.g., "Use Claude Opus for +$5")?
   - Or keep provider selection invisible and tier-based?
   - How to communicate cost savings to users (marketing angle)?

7. **Quality Perception:**
   - Will users notice/care about Claude vs GPT-5.2 for business plans?
   - Should we A/B test and let users choose preferred style?
   - How to brand the "Claude-powered" reports (or keep provider anonymous)?

8. **Rollout Strategy:**
   - Gradual rollout by tier (FREE → PRO → ENTERPRISE) or by feature (social proof → extraction → generation)?
   - How long to run A/B tests before full cutover (3 days? 7 days? 14 days)?
   - What's the rollback plan if quality metrics drop?

### Validation Required

9. **Brave Search Coverage (CRITICAL):**
   - Does Brave have good Reddit/Facebook indexing? (manual testing required)
   - Can it find niche communities (e.g., /r/SaaS, indie hacker forums)?
   - How fresh is the data (real-time vs days/weeks old)?

10. **Claude vs GPT-5.2 Quality (CRITICAL):**
    - Will Claude's business plans be noticeably better? (blind testing required)
    - Is Claude's extraction more reliable (fewer hallucinations)?
    - Does Claude's style match user expectations (conversational vs formal)?

---

## Notes

**Implementation Order:**
Follow the 5-phase approach strictly - Foundation → Social Proof → Extraction → Generation → Testing. Each phase builds on the previous, and rushing ahead will create technical debt.

**Feature Flags:**
All changes should be gated by feature flags (`BRAVE_SEARCH_ENABLED`, `ANTHROPIC_ENABLED`) to enable safe rollout and instant rollback if needed.

**Quality Monitoring:**
Set up automated quality monitoring dashboards from Day 1 of Phase 5 rollout. Watch for:
- Fallback rate (should be <30%)
- Extraction parse success rate (should be >90%)
- User ratings (should maintain or improve)
- Cost per run (should decrease by 40-50%)

**User Communication:**
If provider selection is visible to users, prepare clear messaging:
- "Powered by Claude AI" badge on business plans
- Tooltip explaining cost/quality tradeoffs
- Transparency about fallback strategy
