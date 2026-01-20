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
| `Idea` | Business idea entries |
| `Interview` | AI interview sessions with message history |
| `Research` | Background research pipeline state |
| `Report` | Generated business reports |

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
- `BETA/packages/mobile/src/app/` - Expo Router screens
- `BETA/packages/server/src/routers/` - tRPC API routers
- `BETA/packages/shared/src/` - Shared types and utilities
- `BETA/packages/server/prisma/schema.prisma` - Database schema

### n8n Integration
- **MCP Access:** Use MCP server to fetch workflow data
- **Instance:** https://ideatomation.app.n8n.cloud
- **Documentation:** Keep this file updated as we discover workflow details

### Legacy
- `MVP/` contains previous iteration - reference only

