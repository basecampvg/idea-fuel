# Research Requirements by Report Type

This document defines what research data is required to generate each of the 10 report types at different tiers.

---

## Overview

### Research Pipeline Data Sources

| Source | Tool/API | Data Type | Rate Limits |
|--------|----------|-----------|-------------|
| Web Search | Tavily | Market data, competitor info, trends | ~100 queries/day |
| Social Listening | Apify (Reddit) | Community sentiment, pain points | ~50 scrapes/day |
| Search Trends | SerpAPI | Google Trends, keyword volume | ~100 queries/day |
| News/PR | Tavily | Recent news, press releases | Included in Tavily |

### Research Query Categories (from n8n workflow)

1. **Market** - TAM/SAM/SOM, industry size, growth rates
2. **Competitors** - Direct competitors, features, pricing
3. **Customers** - Demographics, psychographics, behaviors
4. **Trends** - Industry trends, technology shifts
5. **Why Now** - Market timing triggers, regulatory changes
6. **Proof Signals** - Reddit mentions, forum discussions, search volume
7. **Keywords** - SEO opportunities, search terms, content gaps

---

## Report 1: Business Plan

**Purpose:** Comprehensive business plan with executive summary, market analysis, and financials.

### Research Requirements

| Data Point | Source | Priority | BASIC | PRO | FULL |
|------------|--------|----------|-------|-----|------|
| Market Size (TAM/SAM/SOM) | Tavily | High | ✓ | ✓ | ✓ |
| Market Growth Rate | Tavily | High | ✓ | ✓ | ✓ |
| Industry Trends | Tavily | Medium | - | ✓ | ✓ |
| Competitor Overview | Tavily | High | ✓ | ✓ | ✓ |
| Competitor Pricing | Tavily | Medium | - | ✓ | ✓ |
| Target Customer Demographics | Interview + Tavily | High | ✓ | ✓ | ✓ |
| Revenue Model Benchmarks | Tavily | Medium | - | ✓ | ✓ |
| Regulatory Landscape | Tavily | Low | - | - | ✓ |
| Funding Landscape | Tavily | Low | - | - | ✓ |

### Sections by Tier

**BASIC (5 sections):**
- Executive Summary
- Problem & Solution
- Target Market Overview
- Basic Competitive Landscape
- Revenue Model

**PRO (9 sections):**
- All BASIC sections
- Detailed Market Analysis
- Go-to-Market Strategy
- Financial Projections (3-year)
- Team & Operations

**FULL (13 sections):**
- All PRO sections
- Industry Trends Deep Dive
- Risk Analysis & Mitigation
- Funding Requirements & Use
- Appendix with Data Sources

---

## Report 2: Positioning Statement

**Purpose:** Brand positioning, messaging framework, and differentiation strategy.

### Research Requirements

| Data Point | Source | Priority | BASIC | PRO | FULL |
|------------|--------|----------|-------|-----|------|
| Competitor Messaging | Tavily | High | ✓ | ✓ | ✓ |
| Competitor Positioning | Tavily | High | ✓ | ✓ | ✓ |
| Target Audience Pain Points | Interview + Reddit | High | ✓ | ✓ | ✓ |
| Industry Language/Jargon | Tavily + Reddit | Medium | - | ✓ | ✓ |
| Brand Perception (competitors) | Reddit | Medium | - | ✓ | ✓ |
| Messaging Gaps | Tavily | Medium | - | - | ✓ |
| Tone/Voice Examples | Tavily | Low | - | - | ✓ |

### Sections by Tier

**BASIC (4 sections):**
- Positioning Statement (one-liner)
- Target Audience Definition
- Key Differentiators
- Value Proposition

**PRO (7 sections):**
- All BASIC sections
- Messaging Framework
- Competitive Positioning Map
- Elevator Pitch Variations

**FULL (10 sections):**
- All PRO sections
- Brand Voice Guidelines
- Objection Handling Scripts
- Positioning Evolution Strategy

---

## Report 3: Competitive Analysis

**Purpose:** SWOT analysis, competitor profiles, and feature comparison.

### Research Requirements

| Data Point | Source | Priority | BASIC | PRO | FULL |
|------------|--------|----------|-------|-----|------|
| Direct Competitors (3-5) | Tavily | High | ✓ | ✓ | ✓ |
| Indirect Competitors | Tavily | Medium | - | ✓ | ✓ |
| Competitor Features | Tavily | High | ✓ | ✓ | ✓ |
| Competitor Pricing | Tavily | High | ✓ | ✓ | ✓ |
| Competitor Weaknesses | Reddit + Tavily | High | ✓ | ✓ | ✓ |
| Competitor Funding | Tavily | Low | - | - | ✓ |
| Market Share Estimates | Tavily | Medium | - | ✓ | ✓ |
| Competitor Reviews | Reddit | Medium | - | ✓ | ✓ |
| Competitive Trends | Tavily | Low | - | - | ✓ |

### Sections by Tier

**BASIC (4 sections):**
- Competitor Overview (3 profiles)
- Feature Comparison Table
- Basic SWOT
- Key Differentiators

**PRO (7 sections):**
- All BASIC sections
- Detailed Competitor Profiles (5+)
- Pricing Analysis
- Competitive Positioning Matrix

**FULL (11 sections):**
- All PRO sections
- Market Share Analysis
- Competitor Trajectory Predictions
- Competitive Response Strategy
- Win/Loss Analysis Framework

---

## Report 4: Why Now Analysis

**Purpose:** Market timing analysis and urgency factors.

### Research Requirements

| Data Point | Source | Priority | BASIC | PRO | FULL |
|------------|--------|----------|-------|-----|------|
| Market Triggers | Tavily | High | ✓ | ✓ | ✓ |
| Technology Shifts | Tavily | High | ✓ | ✓ | ✓ |
| Regulatory Changes | Tavily | Medium | - | ✓ | ✓ |
| Consumer Behavior Trends | Tavily + Reddit | High | ✓ | ✓ | ✓ |
| Economic Factors | Tavily | Medium | - | ✓ | ✓ |
| Recent News/Events | Tavily | High | ✓ | ✓ | ✓ |
| Competitor Timing | Tavily | Medium | - | ✓ | ✓ |
| Historical Context | Tavily | Low | - | - | ✓ |
| Future Predictions | Tavily | Low | - | - | ✓ |

### Sections by Tier

**BASIC (4 sections):**
- Market Timing Summary
- Key Triggers (3-5)
- Technology Enablers
- Urgency Score (1-10)

**PRO (7 sections):**
- All BASIC sections
- Regulatory Tailwinds
- Consumer Shift Analysis
- Competitive Window Analysis

**FULL (10 sections):**
- All PRO sections
- Historical Pattern Analysis
- Timing Risk Assessment
- Future Scenario Planning

---

## Report 5: Proof Signals

**Purpose:** Demand validation evidence from research.

### Research Requirements

| Data Point | Source | Priority | BASIC | PRO | FULL |
|------------|--------|----------|-------|-----|------|
| Reddit Mentions | Apify (Reddit) | High | ✓ | ✓ | ✓ |
| Forum Discussions | Tavily | High | ✓ | ✓ | ✓ |
| Search Volume Trends | SerpAPI | High | ✓ | ✓ | ✓ |
| Competitor Traction | Tavily | High | ✓ | ✓ | ✓ |
| Related Product Success | Tavily | Medium | - | ✓ | ✓ |
| Sentiment Analysis | Reddit | Medium | - | ✓ | ✓ |
| Community Size | Reddit | Medium | - | ✓ | ✓ |
| Willingness to Pay Signals | Reddit | Low | - | - | ✓ |
| Market Validation Examples | Tavily | Low | - | - | ✓ |

### Sections by Tier

**BASIC (4 sections):**
- Demand Score (1-10)
- Top Community Signals (5)
- Search Trend Summary
- Validation Highlights

**PRO (7 sections):**
- All BASIC sections
- Sentiment Analysis
- Competitor Traction Evidence
- Community Deep Dive

**FULL (10 sections):**
- All PRO sections
- Willingness to Pay Analysis
- Market Validation Case Studies
- Signal Tracking Recommendations

---

## Report 6: Keywords & SEO Strategy

**Purpose:** Search strategy and content opportunities.

### Research Requirements

| Data Point | Source | Priority | BASIC | PRO | FULL |
|------------|--------|----------|-------|-----|------|
| Primary Keywords | SerpAPI | High | ✓ | ✓ | ✓ |
| Long-tail Keywords | SerpAPI | High | ✓ | ✓ | ✓ |
| Search Volume | SerpAPI | High | ✓ | ✓ | ✓ |
| Keyword Difficulty | SerpAPI | Medium | - | ✓ | ✓ |
| Competitor Keywords | SerpAPI + Tavily | Medium | - | ✓ | ✓ |
| Content Gaps | Tavily | Medium | - | ✓ | ✓ |
| Search Intent Analysis | SerpAPI | Medium | - | ✓ | ✓ |
| Trending Topics | Google Trends | Low | - | - | ✓ |
| SERP Feature Opportunities | SerpAPI | Low | - | - | ✓ |

### Sections by Tier

**BASIC (4 sections):**
- Top 10 Primary Keywords
- Top 20 Long-tail Keywords
- Search Volume Summary
- Quick Win Opportunities

**PRO (8 sections):**
- All BASIC sections
- Keyword Difficulty Analysis
- Competitor Keyword Gaps
- Content Topic Clusters
- Search Intent Breakdown

**FULL (12 sections):**
- All PRO sections
- SERP Feature Strategy
- Content Calendar Framework
- Technical SEO Checklist
- Link Building Opportunities

---

## Report 7: Customer Profile

**Purpose:** Detailed persona with demographics and psychographics.

### Research Requirements

| Data Point | Source | Priority | BASIC | PRO | FULL |
|------------|--------|----------|-------|-----|------|
| Demographics | Interview + Tavily | High | ✓ | ✓ | ✓ |
| Psychographics | Reddit | High | ✓ | ✓ | ✓ |
| Pain Points | Interview + Reddit | High | ✓ | ✓ | ✓ |
| Buying Behavior | Tavily + Reddit | Medium | - | ✓ | ✓ |
| Online Hangouts | Reddit | High | ✓ | ✓ | ✓ |
| Decision Making Process | Reddit | Medium | - | ✓ | ✓ |
| Objections/Concerns | Reddit | Medium | - | ✓ | ✓ |
| Influencers/Authorities | Tavily | Low | - | - | ✓ |
| Customer Journey Map | Interview + Tavily | Low | - | - | ✓ |

### Sections by Tier

**BASIC (5 sections):**
- Persona Overview
- Demographics Summary
- Top 5 Pain Points
- Where They Hang Out
- Basic Messaging Hooks

**PRO (8 sections):**
- All BASIC sections
- Psychographic Deep Dive
- Buying Decision Process
- Objections & Concerns

**FULL (12 sections):**
- All PRO sections
- Customer Journey Map
- Influencer/Authority Analysis
- Persona Variations (3+)
- Interview Question Bank

---

## Report 8: Value Equation

**Purpose:** Value proposition breakdown and benefits analysis.

### Research Requirements

| Data Point | Source | Priority | BASIC | PRO | FULL |
|------------|--------|----------|-------|-----|------|
| Core Value Proposition | Interview | High | ✓ | ✓ | ✓ |
| Competitor Value Props | Tavily | High | ✓ | ✓ | ✓ |
| Customer Desired Outcomes | Reddit | High | ✓ | ✓ | ✓ |
| Pain Point Severity | Interview + Reddit | Medium | - | ✓ | ✓ |
| Time/Effort Savings | Interview | Medium | - | ✓ | ✓ |
| Risk Reduction Factors | Interview + Reddit | Medium | - | ✓ | ✓ |
| Emotional Benefits | Reddit | Low | - | - | ✓ |
| ROI Calculations | Tavily | Low | - | - | ✓ |

### Sections by Tier

**BASIC (4 sections):**
- Value Proposition Statement
- Key Benefits (5-7)
- Differentiators
- Basic Value Formula

**PRO (7 sections):**
- All BASIC sections
- Pain Point → Solution Mapping
- Time/Effort Savings Analysis
- Risk Reduction Framework

**FULL (10 sections):**
- All PRO sections
- Emotional Benefits Analysis
- ROI Calculator Template
- Value Storytelling Framework

---

## Report 9: Value Ladder

**Purpose:** Product/service tier strategy and pricing tiers.

### Research Requirements

| Data Point | Source | Priority | BASIC | PRO | FULL |
|------------|--------|----------|-------|-----|------|
| Competitor Pricing Tiers | Tavily | High | ✓ | ✓ | ✓ |
| Feature Prioritization | Interview + Reddit | High | ✓ | ✓ | ✓ |
| Willingness to Pay | Reddit | High | ✓ | ✓ | ✓ |
| Upsell Patterns (industry) | Tavily | Medium | - | ✓ | ✓ |
| Entry Point Analysis | Interview | Medium | - | ✓ | ✓ |
| Premium Feature Demand | Reddit | Medium | - | ✓ | ✓ |
| Pricing Psychology | Tavily | Low | - | - | ✓ |
| Conversion Benchmarks | Tavily | Low | - | - | ✓ |

### Sections by Tier

**BASIC (4 sections):**
- Recommended Tier Structure (3 tiers)
- Feature Distribution
- Basic Pricing Guidance
- Entry Offer Concept

**PRO (7 sections):**
- All BASIC sections
- Upsell/Cross-sell Strategy
- Feature Unlocking Strategy
- Pricing Benchmarks

**FULL (10 sections):**
- All PRO sections
- Pricing Psychology Application
- Conversion Optimization Tips
- Revenue Maximization Model

---

## Report 10: Go-to-Market Strategy

**Purpose:** Launch timeline, channel strategy, and acquisition plan.

### Research Requirements

| Data Point | Source | Priority | BASIC | PRO | FULL |
|------------|--------|----------|-------|-----|------|
| Channel Effectiveness | Tavily | High | ✓ | ✓ | ✓ |
| Competitor GTM Strategies | Tavily | High | ✓ | ✓ | ✓ |
| Customer Acquisition Channels | Interview + Tavily | High | ✓ | ✓ | ✓ |
| Community Presence | Reddit | High | ✓ | ✓ | ✓ |
| Content Strategy (industry) | Tavily | Medium | - | ✓ | ✓ |
| Partnership Opportunities | Tavily | Medium | - | ✓ | ✓ |
| Launch Case Studies | Tavily | Low | - | - | ✓ |
| CAC Benchmarks | Tavily | Low | - | - | ✓ |
| Growth Hacking Tactics | Tavily | Low | - | - | ✓ |

### Sections by Tier

**BASIC (5 sections):**
- GTM Summary
- Top 3 Acquisition Channels
- 30/60/90 Day Timeline
- First 100 Customers Plan
- Key Metrics to Track

**PRO (9 sections):**
- All BASIC sections
- Detailed Channel Strategy
- Content Marketing Plan
- Partnership Framework
- Community Building Strategy

**FULL (13 sections):**
- All PRO sections
- Paid Acquisition Strategy
- Growth Experiments Playbook
- Launch Checklist
- Post-Launch Optimization

---

## Research Query Templates

### Tavily Queries (Per Category)

```javascript
const tavilyQueries = {
  market: [
    "{industry} market size 2024 TAM SAM SOM",
    "{industry} market growth rate forecast",
    "{industry} industry trends analysis",
  ],
  competitors: [
    "{product_type} competitors comparison",
    "{competitor_name} pricing features review",
    "{product_type} market leaders analysis",
  ],
  customers: [
    "{target_audience} demographics psychographics",
    "{target_audience} buying behavior patterns",
    "{target_audience} pain points challenges",
  ],
  trends: [
    "{industry} emerging trends 2024",
    "{industry} technology shifts disruption",
    "{industry} future predictions",
  ],
  whyNow: [
    "{industry} regulatory changes new laws",
    "{industry} recent news developments",
    "{industry} market timing opportunity",
  ],
  gtm: [
    "{product_type} marketing channels effectiveness",
    "{product_type} customer acquisition strategies",
    "{industry} launch strategies case studies",
  ],
  keywords: [
    "{product_type} keywords search volume",
    "{industry} content marketing opportunities",
    "{product_type} SEO strategy",
  ],
};
```

### Reddit Queries (via Apify)

```javascript
const redditQueries = {
  subreddits: [
    "r/{industry}",
    "r/Entrepreneur",
    "r/startups",
    "r/SideProject",
    // Dynamic based on interview data
  ],
  searchTerms: [
    "{problem_statement}",
    "{product_type} recommendation",
    "{competitor_name} alternative",
    "{pain_point} solution",
  ],
};
```

### Google Trends Queries (via SerpAPI)

```javascript
const googleTrendsQueries = [
  "{primary_keyword}",
  "{product_type}",
  "{competitor_name}",
];
```

---

## Research Pipeline Timing

| Phase | Duration | Queries |
|-------|----------|---------|
| Query Generation | 5 min | AI generates all queries |
| Market Research (Tavily) | 45 min | 8-12 queries, rate limited |
| Competitor Research (Tavily) | 45 min | 8-12 queries |
| Customer Research (Tavily) | 30 min | 5-8 queries |
| Proof Signals (Reddit/Apify) | 60 min | 5-10 subreddits |
| Trends (SerpAPI) | 15 min | 3-5 trend queries |
| Synthesis | 45 min | AI consolidation |
| Report Generation | 90 min | 10 reports x ~9 min each |
| **Total** | **~5.5 hours** | |

---

## AI Model Recommendations

### By Task Type

| Task | Recommended Model | Rationale |
|------|-------------------|-----------|
| Interview Agent | GPT-4 Turbo | Best conversational quality, tool calling |
| Query Generation | GPT-4 Turbo | Precise, follows instructions |
| Data Synthesis | Claude 3 Opus | Best for long-context analysis |
| Report Generation | Claude 3 Sonnet | Good balance of quality/cost |
| Report Enhancement | GPT-4 Turbo | Polish and formatting |

### Cost Optimization

| Model | Use Case | Approx. Cost per Session |
|-------|----------|-------------------------|
| GPT-4 Turbo | Interview (5 turns avg) | ~$0.50 |
| GPT-4 Turbo | Query Generation | ~$0.10 |
| Claude 3 Opus | Synthesis (100K context) | ~$1.50 |
| Claude 3 Sonnet | 10 Reports | ~$2.00 |
| **Total per session** | | **~$4-5** |

---

## Implementation Notes

1. **Rate Limiting**: Implement exponential backoff for API calls
2. **Caching**: Cache research results for 24 hours to allow regeneration without re-research
3. **Error Handling**: If a research source fails, continue with available data and note gaps
4. **Quality Thresholds**: Set minimum data requirements per report; if not met, warn user
5. **Progressive Delivery**: Allow users to view reports as they complete (not all-or-nothing)
