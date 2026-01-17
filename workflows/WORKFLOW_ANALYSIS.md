# n8n Workflow Analysis - Forge Session

## Overview

The **Forge Session** workflow is a 62-node automation that handles:
1. AI-powered business discovery interviews
2. Multi-source market research
3. Document generation (8 different reports)
4. Final delivery via email and Google Docs

---

## Workflow Phases

### Phase 1: Entry & Routing (Nodes 00-02)
- **00_Webhook_Entry**: Receives HTTP requests
- **01_Parse_Input**: Extracts action, session_id, message, email, idea_description
- **02_Route_Action**: Routes to:
  - `start` → Initialize new session
  - `message` → Continue interview
  - `force_end` → End interview early
  - `research` → Start research phase
  - Default → Error response

### Phase 2: Session Initialization (Nodes 03)
When action = `start`:
1. **03a_Initialize_State**: Creates session with 31 data fields
2. **03b_Save_Initial_State**: Persists to n8n Data Table
3. **03c_Generate_Opening**: Creates greeting message
4. **03d_Respond_Start**: Returns session_id + opening message

### Phase 3: Interview Chat Loop (Nodes 04-09)
When action = `message`:
1. **04a_Load_State**: Retrieves session from Data Table
2. **04b_Prepare_Context**: Calculates confidence, gaps, phase
3. **04c_Check_Must_End**: If turn >= 5, force end
4. **05_AI_Agent**: GPT-5.2 with tools:
   - `extract_data`: Captures business info from responses
   - `end_interview`: Triggers interview completion
5. **06_Process_Agent_Response**: Parses AI output
6. **07_Save_State**: Persists updated state
7. **08_Check_Should_End**: Routes to continue or complete
8. **09_Respond_Continue**: Returns AI response to user

### Phase 4: Interview Completion (Nodes 10-13)
When interview ends (naturally or forced):
1. **10a_Load_For_Force_End**: Gets session data
2. **10b_Prepare_Force_End**: Prepares for summary
3. **11_Generate_Summary**: Creates interview summary
4. **12_Save_Interview_Complete**: Marks as complete
5. **13_Respond_Complete**: Returns final message

### Phase 5: Research Pipeline (Nodes 14-22)
When action = `research`:
1. **14_Generate_Queries**: AI generates targeted search queries
2. **15_Parse_Queries**: Extracts query categories
3. **16_Split_Research**: Fans out to parallel research

**Parallel Research Nodes (17-19):**
- **Tavily** (8 queries): Market, Competitors, Customer, Business Model, Trends, Why Now, Proof Signals, Keywords
- **Apify** (Reddit): Scrapes relevant subreddits
- **SerpAPI** (Google Trends): Gets trend data

4. **21_Merge**: Combines all research results
5. **22_Consolidate**: Formats for synthesis

### Phase 6: AI Synthesis (Nodes 23-24)
1. **23_Synthesis**: GPT synthesizes all research into insights
2. **24_Parse**: Extracts structured data

### Phase 7: Document Generation (Nodes 25-28)
**25_Split_Docs** fans out to 8 parallel document generators:

| Node | Document Type |
|------|---------------|
| 26a_Business_Plan | Full business plan (13 sections) |
| 26b_Positioning | Brand positioning & GTM strategy |
| 26c_Competitive | Competitive analysis with SWOT |
| 26d_Why_Now | Market timing analysis |
| 26e_Proof_Signals | Demand validation evidence |
| 26f_Keywords_SEO | SEO keyword strategy |
| 26g_Customer_Profile | Detailed customer persona |
| 26h_Value_Equation | Value proposition analysis |

**28_Combine**: Merges all documents

### Phase 8: Final Output (Nodes 32-34)
1. **32_Save_Final**: Saves completed package
2. **33_Gmail**: Sends email with results
3. **Create/Update a document**: Exports to Google Docs
4. **34_Done**: Marks workflow complete

---

## Data Model

### Interview Data Points (31 fields)

**Core Idea:**
- idea_core, idea_name

**Customer & Problem:**
- customer_segment, customer_demographics, customer_pain_intensity
- customer_hangouts, problem_statement, problem_severity

**Solution:**
- solution_description, solution_key_features, solution_unique_mechanism

**Competition:**
- competitors_direct, differentiation, competitive_advantage
- biggest_competitor_weakness

**Business Model:**
- revenue_model, pricing_strategy, price_point

**Go-to-Market:**
- gtm_channels, gtm_first_customers, marketing_strategy
- target_search_terms

**Why Now / Market Timing:**
- why_now_triggers, market_timing_factors

**Founder:**
- founder_background, founder_relevant_experience, founder_unfair_advantage

**Funding & Validation:**
- funding_needs, funding_stage, existing_traction, validation_done

### Research Query Categories
- Market size/TAM
- Competitors
- Customer demographics
- Business model/pricing
- Industry trends
- Why now triggers
- Proof signals (Reddit, forums)
- SEO keywords
- Google Trends terms

---

## External Services Required

| Service | Purpose | n8n Node Count |
|---------|---------|----------------|
| OpenAI (GPT-5.2) | Interview AI, Query Gen, Doc Gen | 10 |
| Tavily | Web search for research | 8 |
| Apify | Reddit scraping | 2 |
| SerpAPI | Google Trends | 1 |
| Google Docs | Document export | 2 |
| Gmail | Email delivery | 1 |
| n8n Data Tables | Session state persistence | 4 |

---

## AI System Prompts

### Interview Agent Prompt
```
You are a friendly business advisor conducting a discovery interview...

Turn: {{ current_turn }} / 5
Phase: {{ phase }}
Confidence: {{ confidence_score }}%

KEY TOPICS TO EXPLORE:
- Customer: Who they are, where they hang out online, their pain intensity
- Competition: Direct competitors, their weaknesses, your differentiation
- Why Now: What market changes make this the right time?
- Validation: Any traction, tests, or proof of demand?
- Search Terms: What would customers search for to find this solution?

RULES:
1. Ask ONE question per response
2. Acknowledge their answer first
3. Target high-value gaps
4. Warm, professional tone
5. Be curious about market timing and competitive landscape

After responding, call extract_data with any info learned.
When confidence >= 80% and can_end, call end_interview.
```

### Research Query Generator Prompt
Generates structured JSON with queries for:
- Tavily (5 market research queries)
- Why Now (3 timing queries)
- Proof Signals (3 validation queries)
- Keywords (4 SEO queries)
- Reddit (subreddits + search terms)
- Google Trends (2 terms)
- HackerNews (1 query)

---

## Migration Notes for BETA

### Replace n8n Data Tables with:
- PostgreSQL via Prisma (already configured)
- Session state in `Interview.messages` JSON field
- Collected data in `Research` model

### Replace n8n Webhook with:
- Next.js API Routes + tRPC procedures
- Socket.io for real-time chat streaming

### Replace n8n AI Nodes with:
- Vercel AI SDK with OpenAI provider
- Structured tool calling for extract_data/end_interview

### Replace External Services:
- Tavily → Keep (or replace with Serper/SerpAPI)
- Apify Reddit → Consider direct Reddit API or keep Apify
- SerpAPI → Keep for Google Trends
- Google Docs → @react-pdf/renderer for PDF generation
- Gmail → Resend or SendGrid for email

### Job Queue (BullMQ) for:
- Research pipeline (parallel queries)
- Document generation (8 parallel jobs)
- Email delivery
