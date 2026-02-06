# Claude Context: Forge Automation Project

## Project Overview

**Project Name:** Forge Automation
**Purpose:** Stabilize existing n8n cloud automation workflows, then migrate to Next.js + BullMQ stack
**Current Phase:** BETA app development (web + mobile)

## Architecture

### Current Setup (Monorepo)
```
Forge Automation/
├── BETA/                   # ACTIVE - Current development
│   ├── packages/
│   │   ├── web/            # Next.js 15 + React 19 web app
│   │   ├── mobile/         # Expo SDK 52 + React Native mobile app
│   │   ├── server/         # tRPC + Prisma backend
│   │   └── shared/         # Shared TypeScript code
│   ├── skills/             # Claude skills for BETA development
│   │   └── frontend-design/ # UI/UX design guidelines
│   ├── package.json        # Root monorepo config
│   ├── pnpm-workspace.yaml
│   └── .npmrc              # pnpm configuration
├── MVP/                    # Legacy - Previous iteration
│   ├── packages/
│   │   ├── web/
│   │   ├── mobile/
│   │   └── shared/
│   └── ...
├── skills/                 # n8n-specific Claude skills
├── workflows/              # n8n workflow exports
├── CLAUDE.md               # This file
└── README.md
```

---

## BETA Tech Stack (Active Development)

### Frontend - Web
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js | 15.x |
| UI Library | React | 19.x |
| Styling | Tailwind CSS | 4.x |
| Type Safety | TypeScript | 5.7+ |
| API Client | tRPC + React Query | 11.x / 5.x |
| Auth | Auth.js (NextAuth v5) | 5.0 beta |

### Frontend - Mobile
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Expo | SDK 52 |
| UI Library | React Native | 0.76.9 |
| Styling | NativeWind | 4.x |
| Type Safety | TypeScript | 5.7+ |
| API Client | tRPC + React Query | 11.x / 5.x |
| Auth | expo-auth-session | 6.x |
| Storage | expo-secure-store | 14.x |

### Backend
| Component | Technology | Version |
|-----------|------------|---------|
| API Layer | tRPC | 11.x |
| ORM | Prisma | 6.x |
| Database | PostgreSQL | via Supabase |
| Auth | Auth.js | 5.0 beta |

### Monorepo Configuration
- **Package Manager:** pnpm 9.15+
- **Workspace:** pnpm workspaces
- **React Version:** 19.x (unified across web + mobile)
- **TypeScript:** Strict mode, skipLibCheck enabled

### Key Configuration Notes
1. **React 19 in Mobile:** Using `expo.install.exclude` in package.json to bypass Expo SDK 52's React 18 requirement
2. **Type Hoisting:** `.npmrc` configured to prevent `@types/react` hoisting conflicts
3. **Monorepo Paths:** TypeScript path aliases in each package's tsconfig.json

---

## Backend API Structure

### tRPC Routers (packages/server/src/routers/)

| Router | Endpoints | Description |
|--------|-----------|-------------|
| `project` | `list`, `get`, `create`, `update`, `updateCanvas`, `delete` | Project CRUD + canvas editing |
| `user` | `me`, `update`, `stats`, `subscription` | User profile and stats |
| `idea` | `list`, `get`, `create`, `update`, `delete`, `startInterview`, `startResearch` | Idea CRUD + workflow triggers |
| `interview` | `get`, `listByIdea`, `getActive`, `resume`, `addMessage`, `addAssistantMessage`, `complete`, `abandon`, `markExpired`, `heartbeat` | Interview chat management |
| `report` | `list`, `listByIdea`, `get`, `generate`, `regenerate`, `update`, `delete`, `generateAll` | Report generation and management |
| `research` | `get`, `getByIdea`, `getProgress`, `start`, `cancel`, `updatePhase`, `markFailed` | Research pipeline tracking |

### Database Models (Prisma)

| Model | Purpose |
|-------|---------|
| `User` | User accounts with subscription tiers |
| `Account` | OAuth provider accounts (Auth.js) |
| `Session` | User sessions (Auth.js) |
| `Project` | Top-level container; owns canvas (JSON blocks) and one Idea |
| `Idea` | Business idea entries (belongs to Project) |
| `Interview` | AI interview sessions with message history |
| `Research` | Background research pipeline state |
| `Report` | Generated business reports |
| `CanvasSnapshot` | Frozen canvas state captured when research starts |

### Interview Modes
- **LIGHTNING** - No interview, AI generates from description only
- **LIGHT** - Quick discovery, 5 turns max
- **IN_DEPTH** - Comprehensive, 15 turns max

### Report Tiers (determined by Interview Mode + Subscription)
- **BASIC** - Core insights (LIGHTNING or FREE+LIGHT)
- **PRO** - Enhanced analysis (PRO+LIGHT or FREE+IN_DEPTH)
- **FULL** - Comprehensive (PRO/ENTERPRISE+IN_DEPTH)

### Environment Variables
See `.env.example` for complete list. Key requirements:
- `DATABASE_URL` / `DIRECT_URL` - Supabase PostgreSQL
- `AUTH_SECRET` - Auth.js encryption key
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `OPENAI_API_KEY` - For AI interview/report generation
- `OPENAI_USE_GPT52_PARAMS` - Enable GPT-5.2 reasoning/verbosity params (true/false)
- `SERPAPI_API_KEY` - For Google Trends keyword data

### n8n Automation (Cloud Hosted)

**Platform:** n8n.cloud
**Instance URL:** https://ideatomation.app.n8n.cloud
**Access:** MCP (Model Context Protocol) instance + API
**API Status:** ✅ Configured in `.mcp.json`
**Automation Types:**
- API integrations
- Data processing/ETL pipelines
- Webhook/event-driven automation

---

## n8n Workflows Documentation

### Workflow 1: [Workflow Name]
**Status:** 🔄 Needs Stabilization
**Trigger Type:** [Webhook/Schedule/Manual/Event]
**Description:** [What does this workflow do?]

**Nodes/Steps:**
1. [Node type] - [Purpose]
2. [Node type] - [Purpose]
3. ...

**External Systems Connected:**
- [API/Service Name] - [Purpose]
- [Database/Storage] - [Purpose]

**Current Issues:**
- [ ] [Issue description]
- [ ] [Issue description]

**Environment Variables:**
- `VARIABLE_NAME` - [Description]

**Error Handling:**
- [Current error handling approach]
- [Known failure points]

---

### Workflow 2: [Workflow Name]
[Same structure as above]

---

## Known Stability Issues

### High Priority
1. **[Issue Title]**
   - **Severity:** Critical/High/Medium/Low
   - **Workflow:** [Workflow name]
   - **Description:** [What's broken]
   - **Impact:** [Business impact]
   - **Proposed Fix:** [How to fix]

### Medium Priority
[Same structure]

### Low Priority
[Same structure]

---

## External Dependencies

### APIs & Services
1. **[Service Name]**
   - **Purpose:** [Why used]
   - **Authentication:** [Type]
   - **Rate Limits:** [If applicable]
   - **Documentation:** [URL]

### Data Sources
1. **[Database/Storage Name]**
   - **Type:** [PostgreSQL/MongoDB/etc.]
   - **Connection:** [How accessed]
   - **Schema Notes:** [Important details]

---

## Environment Configuration

### n8n Cloud Environment Variables
```
# Example structure - fill in actual variables
N8N_WEBHOOK_URL=https://...
API_KEY_SERVICE_1=...
DATABASE_URL=...
```

### Secrets Management
- [Where secrets are stored]
- [How to rotate secrets]

---

## Data Flow Architecture

```
[Source System]
    ↓
[n8n Workflow: Data Ingestion]
    ↓
[Processing/Transformation]
    ↓
[Destination System]
```

[Add detailed flow diagrams]

---

## Migration Plan (Next.js + BullMQ)

### Phase 1: Stabilization (Current)
- [ ] Document all n8n workflows
- [ ] Fix critical bugs
- [ ] Improve error handling
- [ ] Add monitoring/logging
- [ ] Optimize performance

### Phase 2: Design
- [ ] Design Next.js API routes
- [ ] Design BullMQ job queues
- [ ] Plan database schema
- [ ] Define migration strategy

### Phase 3: Implementation
- [ ] Build Next.js backend
- [ ] Implement BullMQ workers
- [ ] Migrate workflows one by one
- [ ] Testing & validation

### Phase 4: Cutover
- [ ] Run parallel systems
- [ ] Validate data consistency
- [ ] Switch traffic
- [ ] Decommission n8n

---

## Testing & Validation

### Test Scenarios
1. **[Scenario Name]**
   - **Input:** [Test data]
   - **Expected Output:** [Result]
   - **Current Result:** [Pass/Fail]

### Monitoring
- **n8n Execution Logs:** [Where to find]
- **Error Notifications:** [How configured]
- **Performance Metrics:** [What to track]

---

## Useful Commands

### n8n Cloud
```bash
# Export workflow via API
curl -X GET "https://api.n8n.cloud/api/v1/workflows/{id}" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# List all workflows
curl -X GET "https://api.n8n.cloud/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}"
```

### Local Development (BETA)
```bash
# Navigate to BETA folder first
cd BETA

# Run web dev server
pnpm dev:web

# Run mobile dev server (Expo)
pnpm dev:mobile
# Or directly: cd packages/mobile && pnpm dev

# Run all dev servers in parallel
pnpm dev

# Type check all packages
pnpm type-check

# Database commands
pnpm db:generate   # Generate Prisma client
pnpm db:push       # Push schema to database
pnpm db:migrate    # Run migrations
pnpm db:studio     # Open Prisma Studio
```

### Mobile App (Expo)
```bash
cd BETA/packages/mobile

# Start Expo dev server
pnpm dev

# Platform-specific
pnpm android   # Start Android
pnpm ios       # Start iOS
pnpm web       # Start web version

# Check Expo configuration
npx expo-doctor
```

---

## MCP Server Configuration

### n8n-mcp Server
**Repository:** https://github.com/czlonkowski/n8n-mcp
**Status:** ✅ INSTALLED
**Purpose:** Provides tool-based access to n8n operations (node search, workflow validation, templates)

**Available Operations:**
- Node searching across 525+ supported nodes
- Workflow validation (minimal/runtime/ai-friendly/strict profiles)
- Template access from 2,653+ examples
- Configuration guidance for node dependencies

**Configuration File:** `.mcp.json` (project root)
**Run Command:** `npx -y n8n-mcp`
**Environment Variables:**
- `MCP_MODE=stdio` - Required for Claude Desktop integration
- `LOG_LEVEL=error` - Minimal logging
- `DISABLE_CONSOLE_OUTPUT=true` - Prevent JSON parsing errors

### n8n Skills Installation

**Repository:** https://github.com/czlonkowski/n8n-skills
**Status:** ✅ INSTALLED

**Installed Skills (7 total):**
1. **n8n Expression Syntax** - Teaches {{}} patterns and variable access
2. **n8n MCP Tools Expert** - Guides effective use of n8n-mcp server (HIGHEST PRIORITY)
3. **n8n Workflow Patterns** - Five proven architectural approaches
4. **n8n Validation Expert** - Interprets validation errors
5. **n8n Node Configuration** - Operation-aware setup guidance
6. **n8n Code JavaScript** - JS coding within Code nodes
7. **n8n Code Python** - Python coding patterns

**Installation Location:** `./skills/` (project root)

**Available Skills:**
- See [skills/README.md](skills/README.md) for detailed descriptions

**Testing:**
- "Find me a Slack node" → Activates MCP Tools Expert
- "Build a webhook workflow" → Activates Workflow Patterns
- "Why is validation failing?" → Activates Validation Expert

---

## Questions & Decisions

### Open Questions
1. [Question about workflow logic]
2. [Question about data handling]
3. [Question about error scenarios]

### Design Decisions
1. **[Decision Topic]**
   - **Decision:** [What was decided]
   - **Rationale:** [Why]
   - **Date:** [When]

---

## Resources

### Documentation
- [n8n Cloud Dashboard](https://app.n8n.cloud/)
- [n8n Documentation](https://docs.n8n.io/)
- [Internal Wiki/Docs] [If any]

### Team Contacts
- [Who knows about these workflows]
- [Who to ask for credentials]

---

## Change Log

### 2026-02-06
- ✅ **Project + Canvas Architecture** - Top-level Project entity with rich canvas workspace
  - **New Models:** `Project` (owns canvas JSON blocks + one Idea), `CanvasSnapshot` (frozen canvas at research start)
  - **New Router:** `project.ts` — CRUD + `updateCanvas` + audit logging
  - **Canvas System:** Structured blocks (section, note, subIdea, link) with drag-to-reorder, auto-save, predefined sections
  - **Shared Types:** `CanvasBlock` discriminated union, `serializeCanvasForAI()` for AI context injection
  - **Web Frontend:** `/projects` list page, `/projects/[id]` detail with canvas editor, sidebar migrated to show projects
  - **Mobile Frontend:** Vault screen updated to query projects with derived status (Draft/Active/Complete)
  - **AI Pipeline:** Canvas context injected into deep research, chunked research, and Spark pipeline prompts
  - **Key Files:**
    - `packages/server/src/routers/project.ts` — Project router
    - `packages/server/prisma/schema.prisma` — Project + CanvasSnapshot models
    - `packages/shared/src/utils/canvas-serializer.ts` — AI serialization
    - `packages/shared/src/validators/index.ts` — Canvas/project Zod schemas
    - `packages/web/src/app/(dashboard)/projects/` — Web project pages
    - `packages/web/src/components/layout/project-mini-card.tsx` — Sidebar card
    - `packages/web/src/lib/project-status.ts` — Derived status config

### 2026-01-26 (In Progress)
- 🔄 **Daily Pick Feature** - Automated trending topic to business idea pipeline
  - **Concept:** Daily automated pipeline that identifies a single high-potential business idea from trending searches
  - **New Files:**
    - `packages/server/src/routers/dailyPick.ts` - Daily pick router
    - `packages/server/src/lib/clustering.ts` - Topic clustering algorithm
    - `packages/server/src/lib/intentFormFilter.ts` - Pain-point/question filter
    - `packages/server/src/lib/normalizeQuery.ts` - Query normalization
    - `packages/server/src/lib/scoring.ts` - Opportunity scoring
    - `packages/server/src/lib/winner.ts` - Winner selection logic
    - `packages/server/src/jobs/` - Background job processing
    - `packages/shared/src/schemas/` - Validation schemas
    - `packages/web/src/app/(dashboard)/daily-pick/` - Web UI
    - `packages/mobile/src/app/(tabs)/daily-pick/` - Mobile UI
  - **Database Changes:** Added `DailyPick`, `TrendingQuery` models to Prisma schema
  - **SerpAPI Enhancements:**
    - Extended `serpapi.ts` with Google Trends Trending Now API
    - Related Queries (rising) expansion
    - Intent-form filtering (pain-point phrasing detection)
    - Category filtering for business/tech/health
  - **Architecture:** Post-filter + expand via related rising queries + then enrich
- 📋 **Batch API Plan** - Drafted integration plan for 50% cost reduction
  - Plan documented in `batch-plan.md`
  - Two-phase batch submission strategy (Phase 1-2 deep research, Phase 3-4 extraction)
  - Estimated savings: ~$7.90 per research (50%)

### 2026-01-24
- ✅ **Spark AI Pipeline** - Rapid market analysis service
  - **New Services:**
    - `spark-ai.ts` - Main Spark orchestration (858 lines)
    - `spark-competitors.ts` - Competitor analysis
    - `spark-demand.ts` - Demand validation
    - `spark-tam.ts` - TAM/SAM/SOM market sizing
  - **Token Tracking:** Added `token-tracker.ts` for usage monitoring
  - **Testing:** Added vitest configuration and initial tests (`market-sizing.test.ts`)
- ✅ **Mobile App Overhaul** - Complete UI redesign
  - Restructured ideas routes with folder-based layout (`/ideas/[id]/`, `/ideas/new`)
  - New components: `BottomSheet`, `CollapsibleSection`, `GlobalHeader`, `ProgressMeter`
  - 14 new analysis section components for research results display
  - Updated tailwind config with custom theme
  - Sign-in page redesign
  - Dashboard, reports, settings UI refresh
- ✅ **Web Enhancements**
  - Spark progress tracking and results components
  - Market sizing section with TAM/SAM/SOM visualization
  - Tech stack section
  - Enhanced admin page with system diagnostics
  - Dashboard configuration hook
- ✅ **PDF Custom Fonts** - Inter font family support for PDF generation
- ✅ **Research AI Enhancements** - Improved token tracking and extraction
- ✅ **Shared Types Expansion** - New types for Spark analysis results

### 2026-01-22
- ✅ **Spark Pipeline Model Settings Audit** - Error reduction for o4-mini-deep-research
  - **Issue:** Spark pipeline missing retry logic, low token limits causing `status: incomplete`
  - **Changes to `spark-ai.ts`:**
    - Added `withExponentialBackoff` around `runDeepResearchWithPolling` (3 attempts)
    - Increased `maxOutputTokens`: 25,000 → 50,000 (matches default)
    - Changed `reasoningSummary`: `'detailed'` → `'auto'` (balances token budget)
    - Increased `pollIntervalMs`: 10s → 15s (matches research-ai.ts)
    - Increased `maxWaitMs`: 30min → 60min (matches research-ai.ts)
    - Added retry to `repairSparkResult` gpt-4o-mini call (3 attempts)
    - Added `trackUsageFromResponse` for keyword generation and JSON repair
  - **Compatibility:** All changes verified against OpenAI docs and existing research-ai.ts patterns
  - **Plan file:** `~/.claude/plans/glittery-doodling-willow.md`

### 2026-01-20
- ✅ **Deep Research Best Practices Implementation** - Full 6-phase overhaul
  - Implemented per `deep-research-BP.md` guidelines for o3-deep-research model
  - **Phase 1: Background Mode + Polling** (core fix)
    - Added `runDeepResearchWithPolling()` for background API calls
    - Added `startBackgroundResearch()` and `pollForCompletion()` utilities
    - 10-15 second polling interval, 30-45 minute SLAs
    - Eliminates long-lived connection timeouts
  - **Phase 2: Token Limits Increased** (prevents truncation)
    - `extractInsights()`: 3,500 → 25,000 tokens
    - `synthesizeInsights()`: 3,000 → 15,000 tokens
    - Deep research chunks: Added 50,000 token default
  - **Phase 3: Exponential Backoff Retries**
    - Added `withExponentialBackoff()` utility with jitter
    - Handles 502/503/504, rate limits, connection resets
    - 3 attempts for deep research, 5 for extraction calls
  - **Phase 4: Discriminated Error Handling**
    - `classifyResearchError()` categorizes errors by type
    - Types: timeout, rate_limit, transient, api_error, parse_error, sla_exceeded
    - Enhanced logging with `logResearchError()`
  - **Phase 5: Response Validation Fix** (root cause)
    - Added `extractResponseContent()` unified parser
    - Handles both `output_text` and `output[]` array formats
    - `ResponseParseError` class with raw response capture
  - **Phase 6: SLA Management**
    - `SlaTracker` class for phase/total time tracking
    - Configurable SLAs via `config.ts` (research.sla.*)
    - Default: 30min deep research, 15min social, 5min synthesis/reports, 45min total
  - **Files Modified:**
    - `packages/server/src/lib/deep-research.ts` - Polling, background mode
    - `packages/server/src/lib/openai.ts` - Re-exported retry utility
    - `packages/server/src/services/research-ai.ts` - All extraction/pipeline changes
    - `packages/server/src/routers/research.ts` - SLA tracking, error classification
    - `packages/server/src/services/config.ts` - SLA configuration keys
- 🔧 **Research Pipeline Error Tracking Fix** - Fixed hardcoded `errorPhase` bug
  - **File:** `packages/server/src/routers/research.ts` (lines 244-384)
  - Added `currentPhase` variable to track active phase during pipeline execution
  - Error handler now uses tracked phase instead of hardcoded `'SYNTHESIS'`
  - Added timing info to error logs (`Pipeline failed at phase: X after Y seconds`)
- ✅ **Previous Issue RESOLVED:** `extractInsights()` empty `output_text`
  - Root cause: Response format mismatch + low token limits
  - Fixed with unified response parser and 25k token limit

### 2026-01-18
- ✅ **OpenAI Responses API Migration** - Migrated from Chat Completions to Responses API
  - All 12 API calls migrated (`interview-ai.ts`: 3, `research-ai.ts`: 9)
  - Enables GPT-5.2 `reasoning.effort` and `text.verbosity` parameters
  - Tier-based AI presets (FREE/PRO/ENTERPRISE) for quality scaling
  - Feature flag: `OPENAI_USE_GPT52_PARAMS` in `.env` (true/false)
  - Fixed JSON truncation in `generateActionPrompts` (increased to 4000 tokens)
- ✅ **Environment Variable Loading Fixed** - Monorepo `.env` loading
  - Web package: Added `dotenv-cli` to load `BETA/.env` via dev script
  - Server package: Added `--env-file` flag to tsx dev script
  - Single `.env` file at `BETA/.env` now works for all packages
- ✅ **OpenAI Package Updated** - Updated to latest version (^6.16.0)

### 2026-01-17
- ✅ **Home Page Redesign** - New dark theme UI for web dashboard
  - Dark theme with animated gradient background (cycles bright/dark)
  - Narrow icon-only sidebar (Logo, +, Vault, Discover, Settings, More)
  - Centered idea input with Forge/Save buttons
  - Report type indicators (Business Plan, Positioning, etc.)
  - Pink/magenta accent color scheme
  - Removed header for cleaner look
- ✅ **Database Connected** - Supabase PostgreSQL configured
  - Project: `wvacfynzguprqlzyukzx` (us-west-2)
  - Tables created and verified
  - OpenAI API key configured
- ✅ **Mobile App Complete** - Expo SDK 52 + React Native mobile app
  - All screens: Dashboard, Ideas, Reports, Settings, Interview chat
  - tRPC client connecting to shared backend
  - Google OAuth via expo-auth-session
  - NativeWind (Tailwind CSS) styling
  - React 19 with type-checking passing
- ✅ **React 19 Unified** - Both web and mobile now use React 19
  - Configured `expo.install.exclude` for React packages
  - Fixed `.npmrc` to prevent type hoisting conflicts
  - All type-checks passing across monorepo
- ✅ **Backend Verification** - Server package fully implemented
  - Prisma schema complete (User, Idea, Interview, Report, Research)
  - All tRPC routers implemented (user, idea, interview, report, research)
  - Auth.js configured with Google OAuth + Prisma adapter
  - tRPC API routes connected in Next.js
  - Created `.env.example` with all required environment variables
  - Prisma client generates successfully
- ✅ **Database Connected** - Supabase PostgreSQL configured
  - Project: `wvacfynzguprqlzyukzx` (us-west-2)
  - Tables created: User, Account, Session, VerificationToken, Interview, Idea, Report, Research
  - Connection pooling via Transaction pooler (port 6543)
  - Direct connection for migrations (port 5432)
  - `.env` configured in both root and packages/server

### 2026-01-16
- ✅ **BETA Web App Complete** - Next.js 15 + React 19 web application
  - Dashboard with stats and recent ideas
  - Ideas CRUD with status management
  - AI Interview chat interface (real-time)
  - Reports list with document generation
  - Settings page with theme toggle
  - tRPC + React Query for API calls
  - Auth.js v5 for authentication
  - Tailwind CSS v4 styling

### 2026-01-15
- Created CLAUDE.md for workflow documentation
- Documented project structure and migration plan
- Set up context for n8n workflow stabilization
- ✅ Installed n8n-mcp MCP server with configuration in `.mcp.json`
- ✅ Installed 7 n8n-skills to `~/.claude/skills/`
- ✅ Configured n8n API credentials for ideatomation.app.n8n.cloud instance
- ✅ Organized n8n skills into project-local `./skills/` folder
- Ready to begin n8n workflow analysis and stabilization

---

## Notes for Claude

### CRITICAL: Frontend Design Guidelines
**ALWAYS reference `BETA/skills/frontend-design/frontend-design.md` before any UI-related work.**

When building or modifying any frontend components, pages, or interfaces (web or mobile):
1. Read the frontend-design skill file first
2. Apply its principles: bold aesthetic choices, distinctive typography, cohesive color themes, intentional motion
3. AVOID generic AI aesthetics (Inter font, purple gradients, predictable layouts)
4. Commit to a clear design direction and execute with precision

### Active Development (BETA)
- **Working Directory:** `BETA/` is the active codebase
- **Monorepo:** pnpm workspaces with 4 packages (web, mobile, server, shared)
- **React Version:** 19.x across all packages
- **Type Checking:** Run `pnpm type-check` from BETA root

### Key Files to Know
- `BETA/packages/web/src/app/` - Next.js App Router pages
- `BETA/packages/web/src/app/(dashboard)/projects/` - Project list + detail pages with canvas editor
- `BETA/packages/mobile/src/app/` - Expo Router screens
- `BETA/packages/server/src/routers/` - tRPC API routers
- `BETA/packages/server/src/routers/project.ts` - Project CRUD + canvas update router
- `BETA/packages/shared/src/` - Shared types and utilities
- `BETA/packages/shared/src/utils/canvas-serializer.ts` - Canvas → markdown for AI prompts
- `BETA/packages/server/prisma/schema.prisma` - Database schema

### n8n Integration
- **MCP Access:** Use MCP server to fetch workflow data
- **Instance:** https://ideatomation.app.n8n.cloud
- **Documentation:** Keep this file updated as we discover workflow details

### Legacy
- `MVP/` contains previous iteration - reference only

---

## Post-Change Checklist

**Run this checklist after any significant code changes to catch common issues:**

### Database / Prisma Changes
If you modified `schema.prisma` (added/changed enums, models, or fields):
- [ ] Run `pnpm db:push` to sync schema to database (or `pnpm db:migrate` for production)
- [ ] Run `pnpm db:generate` to regenerate Prisma client
- [ ] Verify no "invalid input value for enum" errors at runtime

### TypeScript / Types Changes
If you modified types in `shared/types` or `shared/constants`:
- [ ] Run `pnpm type-check` from BETA root to verify all packages compile
- [ ] Check that Prisma types align with shared types (especially enums)
- [ ] Verify frontend components consuming changed types still work

### API / Router Changes
If you modified tRPC routers or added new endpoints:
- [ ] Verify endpoint is accessible from frontend (web and/or mobile)
- [ ] Check error handling returns appropriate messages
- [ ] Test with both authenticated and unauthenticated requests (if applicable)

### AI Pipeline Changes
If you modified interview-ai.ts, research-ai.ts, or spark-ai.ts:
- [ ] Verify token limits are appropriate (check for truncation)
- [ ] Confirm retry logic is in place for API calls
- [ ] Test with a real idea to verify end-to-end flow
- [ ] Check that progress/status updates work correctly

### Feature Flags / Rollback
For significant changes:
- [ ] Add a feature flag at top of file for easy rollback (e.g., `const USE_NEW_PIPELINE = true`)
- [ ] Keep legacy code path available until change is verified in production
- [ ] Document the feature flag in the Change Log

### Common Error Patterns
| Error | Likely Cause | Fix |
|-------|--------------|-----|
| `invalid input value for enum "X"` | Prisma schema not synced | `pnpm db:push` |
| `Type '"X"' is not assignable to type` | Prisma client not regenerated | `pnpm db:generate` |
| `EPERM: operation not permitted` (Windows) | File locked by VS Code/TS server | Close IDE, retry, or delete `.prisma/client` folder |
| `output_text is empty` | Token limit too low or response parsing issue | Increase maxOutputTokens, check response format |
| `status: incomplete` | Deep research timeout or token exhaustion | Add retry logic, increase timeouts |

