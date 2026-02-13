# Research Pipeline Improvements - Brainstorm

**Date:** 2026-02-12
**Status:** Ready for Planning
**Estimated Effort:** 2-3 weeks
**Expected Impact:** 40-50% cost reduction, 30-35% speed improvement, maintained/improved quality

---

## What We're Building

A redesigned research pipeline with **provider-agnostic abstractions** that integrates:

1. **Brave Search API** for cost-effective social proof scraping (Reddit, Facebook, Twitter)
2. **Anthropic Claude models** for quality improvements in extraction, synthesis, and generation
3. **Targeted parallelization** in extraction/generation phases for speed gains

### Goals

- **Cost Reduction:** 40-50% lower cost per research run ($15-20 → $8-12)
- **Speed Improvement:** 30-35% faster pipeline (45-60min → 30-40min)
- **Quality Enhancement:** Better business plans via Claude Opus, more reliable extraction via Claude Sonnet
- **Configurability:** Per-tier, per-phase provider selection with configurable fallbacks

### Non-Goals (Scope Boundaries)

- ❌ Replacing sequential deep research (keeping for quality/coherence)
- ❌ Building self-optimizing orchestration layer (Approach 3 - future consideration)
- ❌ Removing OpenAI entirely (maintaining as fallback/alternative)

---

## Why This Approach (Approach 2: Hybrid Pipeline Redesign)

### Problem Statement

Current pipeline has three pain points:

1. **High Cost:** o3-deep-research with web_search_preview for social proof is expensive (~$15/call)
2. **Limited Speed:** 45-60 minute SLAs are too long for user experience
3. **Poor Configurability:** Hard to A/B test models or customize per-tier without code changes

### Why Not Alternatives?

**Approach 1 (Incremental Enhancement):**
- ❌ Limited speed gains (no parallelization)
- ❌ Configuration bloat (too many feature flags)
- ✅ Lower risk, but doesn't address speed/configurability pain points

**Approach 3 (Multi-Provider Orchestration):**
- ❌ Over-engineering for current needs
- ❌ 4-6 week implementation vs 2-3 weeks
- ❌ May introduce unpredictability
- ✅ Future-proof, but premature optimization

**Approach 2 (Hybrid Redesign):**
- ✅ Addresses all three pain points (cost, speed, configurability)
- ✅ Clean architecture enables future flexibility
- ✅ Balanced effort/reward ratio
- ✅ Maintains quality via configurable fallbacks

---

## Key Decisions

### 1. Provider Abstraction Layer

**Decision:** Create `SearchProvider` and `AIProvider` interfaces with multiple implementations.

**Rationale:**
- Decouples pipeline logic from specific providers
- Easy to add new providers (GPT-6, Claude 4, etc.) without touching pipeline code
- Enables A/B testing and gradual rollout

**Implementations:**
```typescript
// Search Providers
- OpenAISearchProvider (web_search_preview tool)
- BraveSearchProvider (Brave Web Search API)

// AI Providers
- OpenAIProvider (o3/o4-mini deep research, GPT-5.2 extraction/generation)
- AnthropicProvider (Claude 3.7 Sonnet/Opus)
```

### 2. Brave Search Integration Strategy

**Decision:** Configurable fallback - try Brave Search first, fall back to OpenAI if insufficient data.

**Rationale:**
- Optimize for cost (Brave is ~$0.01/query vs OpenAI ~$15/call)
- Maintain quality via fallback to proven OpenAI web search
- Quality threshold: If Brave returns <5 posts or <500 words, trigger fallback

**Implementation:**
```typescript
async function fetchSocialProof(input, tier) {
  // Try Brave Search first
  const braveResults = await braveSearch.searchSocial(query, platforms);

  // Check quality threshold
  if (braveResults.posts.length >= 5 && wordCount(braveResults) >= 500) {
    // Use Claude to synthesize Brave results
    return await claude.synthesizeSocialProof(braveResults, tier);
  }

  // Fallback to OpenAI web_search_preview
  console.warn('Brave Search insufficient, falling back to OpenAI');
  return await openai.fetchSocialProofWithWebSearch(input, tier);
}
```

### 3. Claude Model Assignment by Phase

**Decision:** Use Claude strategically for phases where it excels, keep OpenAI for others.

| Phase | Task | Model Choice | Rationale |
|-------|------|--------------|-----------|
| **Phase 1** | Deep Research (5 chunks) | **Configurable:** o3-deep-research (default) OR Claude 3.7 Opus + Brave Search | o3-deep-research has native web_search tool; Claude + Brave is experimental alternative |
| **Phase 2** | Social Proof Synthesis | **Claude 3.7 Sonnet** | Cheaper + faster than o3 for synthesis task; Brave provides raw data |
| **Phase 3** | Insights Extraction | **Claude 3.7 Sonnet** | Excellent at structured extraction, reliable JSON parsing |
| **Phase 3** | Score Calculation | **Claude 3.7 Sonnet** | Multi-pass scoring benefits from Claude's consistency |
| **Phase 3** | Business Metrics | **Claude 3.7 Sonnet** | Structured extraction with complex reasoning |
| **Phase 3** | Market Sizing (TAM/SAM/SOM) | **Claude 3.7 Sonnet** | Numerical reasoning + structured output |
| **Phase 4** | User Story | **Claude 3.7 Sonnet** | Creative narrative, good quality at lower cost than Opus |
| **Phase 4** | Value Ladder | **Claude 3.7 Sonnet** | Strategic positioning, structured output |
| **Phase 4** | Action Prompts | **Claude 3.7 Sonnet** | Copywriting, prompt engineering |
| **Phase 4** | Tech Stack | **Claude 3.7 Sonnet** | Technical recommendations with reasoning |
| **Phase 4** | Business Plan | **Claude 3.7 Opus** | Long-form coherent writing - Claude's strongest use case |

**Cost Comparison:**
- **Current:** 10 GPT-5.2 calls (~$2-3) + 1 o3-deep-research social proof call (~$15) = **~$17-18/run**
- **New:** 10 Claude Sonnet calls (~$1-1.50) + 1 Claude Opus call (~$2) + Brave Search (~$0.05) = **~$3-4/run**
- **Savings:** ~$13-14/run (75% reduction in extraction/generation costs)

### 4. Phase 3/4 Parallelization

**Decision:** Run independent extraction and generation tasks in parallel.

**Phase 3 Parallelization (4 concurrent tasks):**
```typescript
const [insights, scores, metrics, marketSizing] = await Promise.all([
  extractInsights(deepResearch, tier),        // Claude Sonnet
  extractScores(deepResearch, tier),          // Claude Sonnet
  extractBusinessMetrics(deepResearch, tier), // Claude Sonnet
  extractMarketSizing(deepResearch, tier),    // Claude Sonnet
]);
```

**Phase 4 Parallelization (5 concurrent tasks):**
```typescript
const [userStory, valueLadder, actionPrompts, techStack] = await Promise.all([
  generateUserStory(insights, tier),       // Claude Sonnet
  generateValueLadder(insights, tier),     // Claude Sonnet
  generateActionPrompts(insights, tier),   // Claude Sonnet
  generateTechStack(insights, tier),       // Claude Sonnet
]);

// Business plan runs last (needs above artifacts)
const businessPlan = await generateBusinessPlan(
  insights, scores, metrics, marketSizing,
  userStory, valueLadder, techStack, tier
); // Claude Opus
```

**Impact:**
- **Current:** Phase 3 = ~15-20min sequential, Phase 4 = ~20-25min sequential
- **New:** Phase 3 = ~5-8min parallel, Phase 4 = ~8-12min parallel
- **Savings:** ~30-35 minutes total (50% reduction in Phase 3/4 time)

### 5. Tier-Based Provider Matrix

**Decision:** Different provider combinations per subscription tier.

| Tier | Deep Research | Social Proof | Extraction/Generation | Cost/Run | Quality |
|------|---------------|--------------|----------------------|----------|---------|
| **FREE** | o4-mini-deep-research | Brave + Claude Sonnet | Claude Sonnet (all tasks) | ~$8-10 | Good |
| **PRO** | o3-deep-research (default) OR Claude Opus + Brave (experimental) | Brave + Claude Sonnet | Claude Sonnet (extraction) + Claude Opus (business plan) | ~$12-15 | Excellent |
| **ENTERPRISE** | o3-deep-research (default) OR Claude Opus + Brave (experimental) | Brave + Claude Opus | Claude Opus (all tasks) | ~$18-22 | Premium |

**Configuration:**
```typescript
// packages/server/src/services/config.ts
{
  key: 'ai.deepResearch.provider',
  value: 'openai', // 'openai' | 'anthropic'
  type: 'SELECT',
  options: [
    { value: 'openai', label: 'OpenAI (o3/o4-mini with web_search)' },
    { value: 'anthropic', label: 'Anthropic (Claude Opus + Brave Search)' },
  ],
}

{
  key: 'ai.extraction.provider',
  value: 'anthropic', // 'openai' | 'anthropic'
  type: 'SELECT',
}

{
  key: 'ai.generation.provider',
  value: 'anthropic', // 'openai' | 'anthropic'
  type: 'SELECT',
}

{
  key: 'search.socialProof.provider',
  value: 'brave', // 'brave' | 'openai' | 'fallback'
  type: 'SELECT',
}
```

---

## Architecture Details

### File Structure (New Files)

```
packages/server/src/
├── lib/
│   ├── brave-search.ts          # NEW - Brave Search API client
│   ├── anthropic.ts              # NEW - Anthropic API client
│   ├── search-provider.ts        # NEW - SearchProvider interface + implementations
│   └── ai-provider.ts            # NEW - AIProvider interface + implementations
├── services/
│   ├── research-ai.ts            # MODIFIED - Use provider abstractions
│   └── config.ts                 # MODIFIED - Add provider config keys
└── types/
    └── providers.ts              # NEW - Provider interfaces and types
```

### Provider Interfaces

```typescript
// packages/server/src/types/providers.ts

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  timestamp?: string;
  platform?: 'reddit' | 'twitter' | 'facebook' | 'linkedin' | 'hackernews' | 'indiehackers' | 'producthunt';
}

export interface SearchProvider {
  name: string; // 'brave' | 'openai'

  // General web search
  search(query: string, options?: {
    domains?: string[];
    maxResults?: number;
  }): Promise<SearchResult[]>;

  // Social platform-specific search
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

  // Structured extraction
  extract<T>(prompt: string, schema: z.ZodSchema<T>, options?: {
    maxTokens?: number;
  }): Promise<T>;

  // Creative generation
  generate(prompt: string, options?: {
    maxTokens?: number;
    temperature?: number;
  }): Promise<string>;
}
```

### Brave Search Implementation

```typescript
// packages/server/src/lib/brave-search.ts

import { SearchProvider, SearchResult } from '../types/providers';

interface BraveSearchConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
}

class BraveSearchProvider implements SearchProvider {
  name = 'brave' as const;
  private config: BraveSearchConfig;

  constructor() {
    this.config = {
      apiKey: process.env.BRAVE_SEARCH_API_KEY!,
      baseUrl: 'https://api.search.brave.com/res/v1',
      timeout: 30000,
    };
  }

  async search(query: string, options?: {
    domains?: string[];
    maxResults?: number;
  }): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      count: String(options?.maxResults || 20),
    });

    // Add site: filter for domain restriction
    if (options?.domains && options.domains.length > 0) {
      const siteFilter = options.domains.map(d => `site:${d}`).join(' OR ');
      params.set('q', `${query} (${siteFilter})`);
    }

    const response = await fetch(`${this.config.baseUrl}/web/search?${params}`, {
      headers: {
        'X-Subscription-Token': this.config.apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status}`);
    }

    const data = await response.json();
    return this.parseWebResults(data);
  }

  async searchSocial(query: string, platforms: string[]): Promise<{
    posts: SocialProofPost[];
    totalResults: number;
    sources: string[];
  }> {
    const platformDomains = {
      reddit: 'reddit.com',
      twitter: 'twitter.com',
      facebook: 'facebook.com',
      linkedin: 'linkedin.com',
      hackernews: 'news.ycombinator.com',
      indiehackers: 'indiehackers.com',
      producthunt: 'producthunt.com',
    };

    const domains = platforms.map(p => platformDomains[p]).filter(Boolean);
    const results = await this.search(query, { domains, maxResults: 50 });

    // Convert SearchResult[] to SocialProofPost[]
    const posts: SocialProofPost[] = results.map(r => ({
      platform: this.detectPlatform(r.url),
      author: 'Anonymous', // Brave doesn't provide author info
      content: r.snippet,
      url: r.url,
      timestamp: r.timestamp || new Date().toISOString(),
      engagement: null, // Brave doesn't provide engagement metrics
    }));

    return {
      posts,
      totalResults: results.length,
      sources: [...new Set(results.map(r => r.url))],
    };
  }

  private parseWebResults(data: any): SearchResult[] {
    return (data.web?.results || []).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
      timestamp: r.age, // Brave provides relative age
    }));
  }

  private detectPlatform(url: string): string {
    if (url.includes('reddit.com')) return 'reddit';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('news.ycombinator.com')) return 'hackernews';
    if (url.includes('indiehackers.com')) return 'indiehackers';
    if (url.includes('producthunt.com')) return 'producthunt';
    return 'unknown';
  }
}

export const braveSearch = new BraveSearchProvider();
```

### Anthropic Client Implementation

```typescript
// packages/server/src/lib/anthropic.ts

import Anthropic from '@anthropic-ai/sdk';
import { AIProvider } from '../types/providers';
import { z } from 'zod';

let _anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 600000, // 10 minutes
      maxRetries: 2,
    });
  }
  return _anthropic;
}

export class AnthropicProvider implements AIProvider {
  name = 'anthropic' as const;
  private client: Anthropic;

  constructor() {
    this.client = getAnthropicClient();
  }

  async research(prompt: string, options: {
    searchProvider?: SearchProvider;
    background?: boolean;
    maxTokens?: number;
  }): Promise<{
    output: string;
    citations: string[];
    reasoning?: string;
  }> {
    // If searchProvider provided, do multi-step: search → synthesize
    if (options.searchProvider) {
      // Extract search queries from prompt
      const queries = await this.extractSearchQueries(prompt);

      // Run searches
      const searchResults = await Promise.all(
        queries.map(q => options.searchProvider!.search(q))
      );

      // Synthesize results
      const context = this.formatSearchResults(searchResults.flat());
      return await this.synthesize(prompt, context, options.maxTokens);
    }

    // Direct generation (no search)
    return await this.generate(prompt, { maxTokens: options.maxTokens });
  }

  async extract<T>(prompt: string, schema: z.ZodSchema<T>, options?: {
    maxTokens?: number;
  }): Promise<T> {
    const response = await this.client.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: options?.maxTokens || 16000,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a structured data extraction assistant. Output valid JSON matching the requested schema.',
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    // Parse and validate JSON
    const rawJson = this.extractJson(content.text);
    return schema.parse(rawJson);
  }

  async generate(prompt: string, options?: {
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-3-7-opus-20250219', // Use Opus for generation
      max_tokens: options?.maxTokens || 16000,
      temperature: options?.temperature || 1.0,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    return content.text;
  }

  private async extractSearchQueries(prompt: string): Promise<string[]> {
    // Use Claude to extract 3-5 search queries from research prompt
    const response = await this.client.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Extract 3-5 web search queries from this research prompt:\n\n${prompt}\n\nOutput as JSON array: ["query1", "query2", ...]`,
      }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return [];

    const json = this.extractJson(content.text);
    return Array.isArray(json) ? json : [];
  }

  private formatSearchResults(results: SearchResult[]): string {
    return results.map((r, i) =>
      `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}\n`
    ).join('\n');
  }

  private async synthesize(prompt: string, context: string, maxTokens?: number): Promise<{
    output: string;
    citations: string[];
    reasoning?: string;
  }> {
    const response = await this.client.messages.create({
      model: 'claude-3-7-opus-20250219',
      max_tokens: maxTokens || 50000,
      messages: [{
        role: 'user',
        content: `${prompt}\n\n# Search Results\n\n${context}\n\nSynthesize the above search results to answer the research question. Include inline citations like [1], [2].`,
      }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    // Extract citations (e.g., [1], [2], [3])
    const citations = [...new Set(
      (content.text.match(/\[(\d+)\]/g) || []).map(m => m.replace(/\[|\]/g, ''))
    )];

    return {
      output: content.text,
      citations,
      reasoning: response.stop_reason === 'end_turn' ? 'complete' : 'partial',
    };
  }

  private extractJson(text: string): any {
    // Extract JSON from markdown code blocks or raw text
    const jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n```/) || text.match(/```\s*\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text;
    return JSON.parse(jsonStr.trim());
  }
}

export const anthropic = new AnthropicProvider();
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goals:** Set up provider abstractions and Brave Search integration.

**Tasks:**
1. Create provider interfaces (`SearchProvider`, `AIProvider`)
2. Implement `BraveSearchProvider` with unit tests
3. Implement `AnthropicProvider` with unit tests
4. Add config keys to `config.ts`
5. Add environment variables (`BRAVE_SEARCH_API_KEY`, `ANTHROPIC_API_KEY`)
6. Write integration tests for Brave Search social proof

**Deliverables:**
- ✅ `brave-search.ts` with full implementation
- ✅ `anthropic.ts` with full implementation
- ✅ `providers.ts` with interfaces
- ✅ Config service updated with provider toggles
- ✅ Unit + integration tests passing

### Phase 2: Social Proof Refactor (Week 1-2)

**Goals:** Migrate `fetchSocialProof()` to use Brave Search with Claude synthesis.

**Tasks:**
1. Refactor `fetchSocialProof()` to use `SearchProvider` interface
2. Implement configurable fallback logic (Brave → OpenAI)
3. Add quality threshold checks (minimum posts, word count)
4. Update social proof prompt for Claude Sonnet synthesis
5. Add cost tracking for Brave API calls
6. A/B test against existing OpenAI approach

**Deliverables:**
- ✅ `fetchSocialProof()` supports both Brave and OpenAI providers
- ✅ Quality thresholds configurable via `config.ts`
- ✅ Cost comparison data (Brave vs OpenAI)
- ✅ Quality comparison data (post count, validation accuracy)

### Phase 3: Extraction Refactor (Week 2)

**Goals:** Migrate Phase 3 extraction tasks to Claude Sonnet with parallelization.

**Tasks:**
1. Refactor extraction functions to use `AIProvider` interface:
   - `extractInsights()`
   - `extractScores()`
   - `extractBusinessMetrics()`
   - `extractMarketSizing()`
2. Update prompts for Claude's structured output format
3. Implement `Promise.all()` parallelization
4. Add Zod schemas for all extraction outputs
5. Compare quality vs GPT-5.2 baseline

**Deliverables:**
- ✅ All 4 extraction tasks use `AIProvider`
- ✅ Parallel execution working (measured speed improvement)
- ✅ Zod validation on all outputs
- ✅ Quality metrics match or exceed GPT-5.2 baseline

### Phase 4: Generation Refactor (Week 2-3)

**Goals:** Migrate Phase 4 generation tasks to Claude Sonnet/Opus with parallelization.

**Tasks:**
1. Refactor generation functions to use `AIProvider` interface:
   - `generateUserStory()` → Claude Sonnet
   - `generateValueLadder()` → Claude Sonnet
   - `generateActionPrompts()` → Claude Sonnet
   - `generateTechStack()` → Claude Sonnet
   - `generateBusinessPlan()` → Claude Opus
2. Update prompts for Claude's style (more conversational, less JSON-y)
3. Implement parallel execution for first 4 tasks
4. Run business plan generation last with all context
5. Quality comparison vs GPT-5.2 baseline

**Deliverables:**
- ✅ All 5 generation tasks use `AIProvider`
- ✅ Parallel execution working (measured speed improvement)
- ✅ Business plan quality meets or exceeds GPT-5.2 baseline
- ✅ User story and creative outputs validated by stakeholders

### Phase 5: Testing & Optimization (Week 3)

**Goals:** Comprehensive testing, cost validation, and fine-tuning.

**Tasks:**
1. Run 50 end-to-end research pipelines (mix of tiers and topics)
2. Measure cost per run (target: <$12 average)
3. Measure speed per run (target: <40 min average)
4. Validate quality scores (target: match or exceed baseline)
5. Tune quality thresholds for Brave Search fallback
6. Document cost/quality/speed tradeoffs per tier
7. Create admin dashboard for provider performance monitoring

**Deliverables:**
- ✅ Performance benchmarks documented
- ✅ Cost analysis per tier (FREE/PRO/ENTERPRISE)
- ✅ Quality validation report
- ✅ Admin dashboard for provider metrics
- ✅ Rollout plan (gradual tier-by-tier rollout)

---

## Open Questions

### Technical Questions

1. **Brave Search Rate Limits:**
   - What are Brave Search API rate limits? (need to check docs)
   - Do we need request throttling/queuing?
   - How to handle rate limit errors gracefully?

2. **Claude Context Window:**
   - Claude 3.7 has 200k context window - can we fit entire deep research output?
   - Should we chunk business plan generation if context exceeds limits?
   - How to handle "Claude is busy" errors during peak times?

3. **Search Quality Validation:**
   - What minimum thresholds for Brave Search quality? (current plan: 5 posts, 500 words)
   - Should we validate citation quality (e.g., check if URLs are accessible)?
   - How to detect when Brave Search fails silently (returns irrelevant results)?

4. **Provider Selection Logic:**
   - Should FREE tier get option to upgrade to paid providers on-demand?
   - Should we auto-downgrade from Claude Opus → Sonnet if budget is tight?
   - How to handle provider outages (automatic failover)?

5. **Parallel Execution Safety:**
   - Do we need rate limit coordination for parallel Claude API calls?
   - How to handle partial failures (e.g., 3/4 extraction tasks succeed)?
   - Should we implement circuit breaker pattern for provider health?

### Business Questions

6. **Cost Allocation:**
   - Should we expose provider choice to users (e.g., "Use Claude for +$5")?
   - Or keep provider selection invisible and tier-based?
   - How to communicate cost savings to users (marketing angle)?

7. **Quality Perception:**
   - Will users notice/care about Claude vs GPT-5.2 for business plans?
   - Should we A/B test and let users choose preferred style?
   - How to brand the "Claude-powered" reports?

8. **Rollout Strategy:**
   - Gradual rollout by tier (FREE → PRO → ENTERPRISE)?
   - Or by feature (social proof → extraction → generation)?
   - How long to run A/B tests before full cutover?

### Unknowns to Validate

9. **Brave Search Coverage:**
   - Does Brave have good Reddit/Facebook indexing? (need to test)
   - Can it find niche communities (e.g., /r/SaaS, indie hacker forums)?
   - How fresh is the data (real-time vs days/weeks old)?

10. **Claude vs GPT-5.2 Quality:**
    - Will Claude's business plans be noticeably better? (need blind testing)
    - Is Claude's extraction more reliable (fewer hallucinations)?
    - Does Claude's style match user expectations?

---

## Success Metrics

### Cost Metrics (Target: 40-50% reduction)

- **Baseline Cost:** $15-20 per research run
- **Target Cost:** $8-12 per research run
- **Breakdown:**
  - Phase 2 (Social Proof): $15 → $1.50 (90% reduction via Brave + Claude)
  - Phase 3 (Extraction): $2-3 → $1-1.50 (40% reduction via Claude Sonnet)
  - Phase 4 (Generation): $0.50-1 → $2 (increase due to Claude Opus for business plan, but offset by parallel speed gains)

**KPI:** Average cost per run <$12 across all tiers.

### Speed Metrics (Target: 30-35% reduction)

- **Baseline Speed:** 45-60 minutes per run
- **Target Speed:** 30-40 minutes per run
- **Breakdown:**
  - Phase 1 (Deep Research): 50min → 48min (reduce delays 2min → 1min)
  - Phase 2 (Social Proof): 15min → 5min (Brave API + Claude synthesis vs o3 web search)
  - Phase 3 (Extraction): 15-20min → 5-8min (parallel execution)
  - Phase 4 (Generation): 20-25min → 8-12min (parallel execution)

**KPI:** Average pipeline time <40 minutes for PRO tier.

### Quality Metrics (Target: maintain or improve)

- **Social Proof Quality:**
  - Baseline: 8-12 posts per run, 70% validation rate
  - Target: 10-15 posts per run, 75% validation rate (Brave finds more niche content)

- **Extraction Accuracy:**
  - Baseline: 85% structured output parse success, 2% hallucination rate
  - Target: 95% parse success (Claude structured output), <1% hallucination rate

- **Business Plan Quality:**
  - Baseline: 4.2/5 average user rating, 3500 words average length
  - Target: 4.5/5 average user rating (Claude Opus writing quality), 4000 words length

- **Overall Opportunity Score Consistency:**
  - Baseline: ±12 points standard deviation across 3 scoring passes
  - Target: ±8 points (Claude's consistency improves multi-pass scoring)

**KPI:** User satisfaction (NPS) increases by 10+ points for PRO tier.

### Reliability Metrics

- **Provider Uptime:**
  - Target: 99.5% successful research runs (handle provider outages gracefully)
  - Fallback success rate: 98% (Brave → OpenAI fallback works reliably)

- **Partial Failure Recovery:**
  - Target: 95% of runs complete even if 1-2 parallel tasks fail
  - Retry success rate: 90% (exponential backoff recovers from transient errors)

**KPI:** <0.5% research runs require manual intervention or refunds.

### Configurability Metrics

- **Admin Flexibility:**
  - Can change provider per phase without code deploy
  - Can A/B test providers with 1-click toggle
  - Can view real-time cost/quality dashboards per provider

- **Tier Customization:**
  - FREE/PRO/ENTERPRISE have distinct provider matrices
  - Can adjust quality thresholds per tier (e.g., FREE has higher Brave fallback threshold)

**KPI:** 100% of provider changes deployable via config service (no code changes needed).

---

## Next Steps

1. **Review & Approve:** Stakeholder sign-off on this brainstorm
2. **Create Implementation Plan:** Break down into detailed stories/tasks (use `/workflows:plan`)
3. **Set Up Providers:** Get Brave Search API key, Anthropic API key, set up test accounts
4. **Spike Brave Search Quality:** Run manual tests of Brave Search for Reddit/Facebook coverage
5. **Spike Claude Quality:** Test Claude 3.7 Opus on sample business plan prompts vs GPT-5.2 baseline
6. **Begin Phase 1:** Implement provider abstractions and clients

---

## References

- [Brave Search API Docs](https://api.search.brave.com/app/documentation/web-search/get-started)
- [Anthropic API Docs](https://docs.anthropic.com/en/api/getting-started)
- [Current Pipeline Architecture](../CLAUDE.md#backend-api-structure)
- [Deep Research Best Practices](../deep-research-BP.md)
- [Repository Research Report](#) (from repo-research-analyst agent)
