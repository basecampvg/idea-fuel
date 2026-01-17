# Claude Context: Forge Automation Project

## Project Overview

**Project Name:** Forge Automation
**Purpose:** Stabilize existing n8n cloud automation workflows, then migrate to Next.js + BullMQ stack
**Current Phase:** n8n workflow stabilization

## Architecture

### Current Setup (Monorepo)
```
Forge Automation/
├── MVP/                    # Application code
│   ├── packages/
│   │   ├── web/            # Next.js 16 web app
│   │   ├── mobile/         # Expo React Native app
│   │   └── shared/         # Shared TypeScript code
│   ├── package.json
│   ├── pnpm-workspace.yaml
│   └── pnpm-lock.yaml
├── skills/                 # n8n-specific Claude skills
├── workflows/              # n8n workflow exports
├── CLAUDE.md               # This file
└── README.md
```

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

### Local Development
```bash
# Navigate to MVP folder first
cd MVP

# Run web dev server
pnpm dev:web

# Run mobile dev server
pnpm dev:mobile

# Type check all packages
pnpm type-check
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

- **MCP Access:** Use MCP server to fetch workflow data
- **Priority:** Focus on stabilization before migration
- **Documentation:** Keep this file updated as we discover workflow details
- **Approach:** Analyze workflows systematically, identify issues, propose fixes

