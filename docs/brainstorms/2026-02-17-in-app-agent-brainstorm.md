# In-App AI Agent - Brainstorm

**Date:** 2026-02-17
**Status:** Ready for planning

---

## What We're Building

An always-on AI agent embedded in the Forge Automation app as a **persistent sidebar chat**. The agent is context-aware of the current page/project and powered by a **specialist worker architecture** — a thin Claude-powered orchestrator routes user requests to dedicated workers that handle heavy lifting.

This is not just a chatbot. It's a **business intelligence copilot** that:
- Answers questions about research data and reports
- Generates new content blocks appended to reports (not inline editing)
- Monitors market and validation signals on a schedule
- Proactively generates task lists, ad creative, and weekly digests
- Guides users through the product and helps engineer better prompts
- Supports custom alert conditions per project

**Access:** PRO+ subscribers only (upgrade prompt for FREE tier)

### Agent Capabilities (Full Vision)

| Capability | Description | Delivery |
|-----------|-------------|----------|
| **Q&A** | Answer questions about any project's research, reports, market data | On-demand (chat) |
| **Report Content Generation** | Generate new content blocks added to a dedicated "Agent Insights" section | On-demand (chat) |
| **Product Guidance** | Explain features, suggest next steps, help with project descriptions | On-demand (chat) |
| **Prompt Engineering** | Help users craft better descriptions for higher-quality AI outputs | On-demand (chat) |
| **Task Generation** | Actionable next steps derived from research insights | Hybrid (proactive + on-demand) |
| **Ad Creative** | Facebook/Google ad copy, social posts, email sequences | Hybrid (proactive + on-demand) |
| **Market Monitoring** | Track competitor launches, trending keywords, news mentions | Proactive (scheduled) |
| **Validation Monitoring** | Monitor Reddit/HN/Twitter for pain-point discussions | Proactive (scheduled) |
| **Custom Alerts** | User-defined watch conditions (e.g., "alert if competitor raises funding") | Proactive (scheduled) |
| **Weekly Digest** | Summary of all signals, suggested tasks, draft creatives | Proactive (scheduled) |

---

## Why This Approach

### Architecture: Agent + Specialist Workers

```
User message (WebSocket)
    |
Agent Orchestrator (Claude tool-use, lightweight)
    | routes to...
+------------------+-------------------+------------------+-------------------+
| Research Analyst  | Content Generator | Creative Studio  | Market Monitor    |
| (RAG + Q&A)      | (report blocks)   | (ad copy, tasks) | (scheduled jobs)  |
+------------------+-------------------+------------------+-------------------+
    ^ each is a BullMQ worker with its own prompt chain + model selection
```

**Why workers over a monolithic agent:**
1. **Matches existing patterns** - Spark pipeline already uses this (spark-demand, spark-tam, spark-competitors as parallel specialists)
2. **Independent scaling** - Market Monitor runs on a schedule without touching the chat agent
3. **Model flexibility** - Claude for orchestration, cheaper models for monitoring, specialized for creative
4. **Testability** - Each worker independently testable with its own inputs/outputs
5. **Failure isolation** - If the creative worker fails, Q&A still works

### Staying TypeScript

Evaluated Python/LangGraph/Temporal/FastAPI stack (see attached image). Staying TypeScript because:
- Existing stack handles everything needed (tRPC, BullMQ, provider abstractions)
- No rewrite tax - build on 4500+ lines of battle-tested AI pipeline code
- BullMQ already provides durable execution (replaces Temporal)
- Provider abstractions already support multi-model routing
- Single language across the full stack (web + mobile + server)

### Stack Comparison: Image Recommendation vs. Our Approach

| Recommended (Image) | Our Equivalent | Notes |
|---------------------|----------------|-------|
| LangGraph (Python) | Custom TS orchestrator + BullMQ workers | Already have multi-step pipeline patterns |
| Temporal.io | BullMQ | Already deployed, handles retries + durable execution |
| FastAPI (Python) | tRPC (TypeScript) | Already deployed, type-safe end-to-end |
| Postgres + pgvector | Supabase + pgvector | **Adding pgvector** - Supabase supports natively |
| Redis | Redis (via BullMQ) | Already deployed |
| LangSmith | Token tracker + SLA tracker | Already have basic observability; can add LangSmith later |
| Kubernetes (EKS) | Vercel + BullMQ workers | Current deployment target |

### Key Stack Additions

| Addition | Purpose | Why |
|----------|---------|-----|
| **pgvector (Supabase)** | Vector search for RAG over all project data | Supabase supports natively, no new infrastructure |
| **Claude tool-use API** | Agent orchestration with structured tool calling | Best reasoning + tool-use for the conversational layer |
| **WebSocket layer** | Real-time streaming + proactive notifications | Token-by-token streaming, push alerts from monitoring |
| **Conversation storage** | Persistent per-project chat threads in Postgres | Agent builds context over time |

---

## Key Decisions

1. **Stay TypeScript** - No Python/LangGraph migration. Build agent layer on existing tRPC/BullMQ/Drizzle stack.
2. **Claude (Anthropic) for conversational layer** - Best reasoning and tool-use API for the orchestrator. Existing provider abstraction already supports Anthropic.
3. **Specialist worker architecture** - Thin orchestrator + heavy BullMQ workers. Matches existing spark-* pattern.
4. **Persistent sidebar chat** - Always-available, context-aware of current page/project. Each project gets its own conversation thread.
5. **Persistent per-project memory** - Conversations stored in DB, agent builds context over time.
6. **pgvector for RAG** - Enable semantic search over ALL project data (reports, research, interviews, notes, SerpAPI results). Supabase native.
7. **Additive report content** - Agent generates new content blocks added to a dedicated "Agent Insights" section. Does NOT modify original report content. Preview + confirm before adding.
8. **Pipeline-integrated embeddings** - Generate embeddings at the end of research/report pipelines. Agent always has data ready.
9. **WebSocket streaming** - Real-time token-by-token response streaming. Also enables proactive push notifications for monitoring alerts.
10. **PRO+ only** - Agent is a premium feature. FREE users see locked state with upgrade prompt.
11. **Web first, mobile follows** - Build for Next.js first. Design shared types/WebSocket layer so mobile (Expo bottom sheet) can be added quickly.
12. **Hybrid delivery** - On-demand via chat + proactive scheduled digests/alerts.
13. **Incremental rollout** - Phase 1 ships Q&A + Content Generation only. Monitoring and creative come later.

---

## Phasing Plan

### Phase 1: Foundation + Q&A + Content Generation
**Goal:** Working agent that can answer questions and add content to reports

- Agent orchestrator service (Claude tool-use API)
- WebSocket server for streaming responses
- Sidebar chat UI component (persistent, context-aware)
- Conversation persistence (new DB table, per-project threads)
- pgvector setup on Supabase
- Embedding pipeline (integrated into research + report generation)
- **Research Analyst Worker** - RAG over all project data (reports, research, interviews, notes)
- **Content Generator Worker** - Generate new blocks for "Agent Insights" section with preview + confirm
- Product guidance from embedded knowledge base
- PRO+ subscription gate

### Phase 2: Creative + Tasks
- **Creative Studio Worker** - Ad copy (Facebook, Google), social posts, email sequences
- **Task Generator Worker** - Actionable next steps from research insights
- Prompt engineering assistant (help users write better project descriptions)
- On-demand + proactive suggestion generation

### Phase 3: Monitoring + Proactive
- **Market Monitor Worker** - BullMQ repeatable jobs for competitor/trend tracking
- **Validation Monitor Worker** - Social signal scanning (Reddit, HN, Twitter)
- Custom alert conditions (user-defined watch rules stored in DB)
- Push notifications via WebSocket for real-time alerts
- Notification center UI
- Weekly digest generation and delivery

### Phase 4: Intelligence + Mobile
- Mobile agent (Expo bottom sheet / dedicated chat screen)
- Cross-project insights ("your idea X has similar competitors to idea Y")
- Conversation summarization for long-running threads
- Agent learns user preferences over time
- "What-if" scenario modeling

---

## Design Details

### Report Content Generation Flow

```
User: "Write a competitive summary for Notion"
    |
Agent Orchestrator: routes to Content Generator Worker
    |
Content Generator: generates content block using RAG context
    |
Agent: streams preview in chat sidebar
    |
User: clicks "Add to Report"
    |
System: appends block to "Agent Insights" section of the report
```

- Original report content is **never modified** by the agent
- All agent-generated content lives in a dedicated "Agent Insights" section
- Each block has metadata (timestamp, prompt used, source data)
- User can reorder/delete agent blocks manually

### RAG Architecture

**What gets embedded (everything):**
- Report sections (per-section chunks)
- Synthesized research insights
- Interview transcripts (per-message chunks)
- Project notes
- SerpAPI trend data
- Raw deep research responses

**Embedding timing:** Pipeline-integrated
- End of research pipeline: embed research + interview + notes
- End of report generation: embed report sections
- On project notes update: re-embed notes

**Search flow:**
1. User asks question in chat
2. Agent extracts search query from user message
3. pgvector similarity search over project's embeddings
4. Top-K results injected as context into Claude prompt
5. Claude generates grounded answer with citations

### WebSocket Architecture

```
Client (Next.js) <--WebSocket--> Server (tRPC/WS adapter)
    |                                    |
    | connect(projectId, userId)         | authenticate + subscribe
    | sendMessage(content)               | route to orchestrator
    | onStream(token)                    | stream response tokens
    | onNotification(alert)              | push monitoring alerts
    | onDigest(summary)                  | push weekly digest
```

- Authenticated via session token
- Scoped to project (one connection per active project)
- Handles: streaming responses, push notifications, typing indicators
- Fallback: SSE if WebSocket unavailable

---

## Resolved Questions

1. **Report editing granularity** - RESOLVED: Additive only. Agent generates new content blocks in an "Agent Insights" section. No inline editing of original content.
2. **Embedding strategy** - RESOLVED: Everything (reports, research, interviews, notes, SerpAPI). Pipeline-integrated timing.
3. **Mobile support** - RESOLVED: Web first, mobile follows. Shared types and WebSocket layer designed for both platforms.
4. **Streaming** - RESOLVED: WebSocket for real-time streaming + proactive push. SSE fallback.
5. **Access control** - RESOLVED: PRO+ only. FREE tier sees locked state with upgrade prompt.

## Remaining Open Questions

1. **Monitor frequency** - How often should market monitoring run? Daily? Weekly? Per-project or global?
2. **Conversation context window** - How many past messages should the agent see? Full history? Last N messages + summary? Affects cost and quality.
3. **Embedding model** - Which embedding model? OpenAI text-embedding-3-small (cheap, good) vs. text-embedding-3-large (better, pricier)?
4. **Rate limiting** - How many agent messages per day for PRO users? Unlimited for ENTERPRISE?
5. **Content block format** - Should agent-generated blocks be plain text, markdown, or structured JSONB matching report format?

---

## Technical Notes

### Existing Infrastructure to Leverage
- `packages/server/src/providers/` - Multi-provider abstraction (Anthropic already supported)
- `packages/server/src/jobs/` - BullMQ job queue with workers
- `packages/server/src/lib/deep-research.ts` - Polling, retry, error classification patterns
- `packages/server/src/services/research-schemas.ts` - Zod schemas for structured AI outputs
- `packages/server/src/lib/token-tracker.ts` - Usage monitoring
- `packages/server/src/lib/serpapi.ts` - SerpAPI integration for trend monitoring

### New Infrastructure Needed
- pgvector extension on Supabase (enable in dashboard)
- Embedding pipeline service (generate + store embeddings)
- WebSocket server (ws or Socket.io, integrated with tRPC)
- Conversation table + Agent Insights table in Drizzle schema
- Agent orchestrator service (Claude tool-use)
- Specialist worker services (Research Analyst, Content Generator)
- Sidebar chat React component
- Agent Insights report section component

### Database Additions (Drizzle)

```
AgentConversation
  - id, projectId, userId
  - messages (JSONB array: {role, content, timestamp, toolCalls?})
  - summary (text, for context compression)
  - messageCount (int)
  - createdAt, updatedAt

AgentInsight
  - id, reportId, projectId
  - content (text/JSONB)
  - prompt (text, what the user asked)
  - sourceEmbeddingIds (JSONB array)
  - order (int, for display ordering)
  - createdAt

AgentAlert (Phase 3)
  - id, projectId, userId
  - conditions (JSONB: {type, keywords, threshold, etc.})
  - schedule (cron string)
  - lastRunAt, nextRunAt
  - status (ACTIVE, PAUSED, TRIGGERED)
  - results (JSONB array of past triggers)

AgentDigest (Phase 3)
  - id, projectId, userId
  - content (JSONB: {signals, tasks, creatives})
  - period (DAILY, WEEKLY)
  - generatedAt, deliveredAt

Embedding
  - id, projectId
  - sourceType (REPORT, RESEARCH, INTERVIEW, NOTES, SERPAPI)
  - sourceId (reference to source record)
  - chunkIndex (int, for multi-chunk sources)
  - content (text, the chunk text)
  - vector (vector(1536) or vector(3072) depending on model)
  - metadata (JSONB)
  - createdAt
```
