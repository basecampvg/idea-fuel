# Financial Modeling & Forecasting Tool — Brainstorm

**Date:** 2026-02-24
**Status:** Ready for planning

---

## What We're Building

A financial modeling and forecasting module within IdeationLab that serves two entry points:

1. **Add-on to Idea Evaluation** — receives research data (TAM/SAM/SOM, CAC, unit economics, pricing, revenue model, cost estimates) from the idea evaluation pipeline and uses it to seed financial model assumptions automatically.
2. **Standalone tool** — allows existing business owners to build financial models from scratch via industry templates or a guided wizard, independent of the idea evaluation flow.

Lives within the forge-automation monorepo as a new module. Routes under `/projects/[id]/financials` for the add-on flow and a dedicated standalone entry for direct access.

### Core Capabilities (MVP — Phase 1)

- **Financial Forecasting Models:** P&L (Income Statement), Balance Sheet, Cash Flow Statement — standard 3-statement model with linked formulas. 5-year horizon: monthly for Year 1, quarterly for Year 2, annual for Years 3-5.
- **Budgeting Tool:** Budget creation and tracking with read-only QuickBooks/Xero import for actuals comparison (budget-vs-actual). ERP integration included in MVP.
- **Scenario & Analysis Tools:** What-if analysis, break-even analysis, scenario comparison (best/base/worst case), sensitivity analysis
- **Knowledge-Level Modes:** Three tiers — Beginner (guided, plain language, ~10 high-level inputs), Standard (typical financial inputs with explanations), Expert (full line-item control, custom formulas, all parameters exposed)
- **Excel Export:** Fully interactive workbook with named ranges, real formulas, data validation, linked sheets, and scenario toggles — user can change assumptions in Excel and models recalculate
- **Presentation Outputs:** PDF (via @react-pdf/renderer) and editable PowerPoint (via pptxgenjs). Native Google Slides API deferred to Phase 2.
- **Industry Templates (10+):** SaaS, E-commerce, Professional Services, Restaurant/Food, Retail, Construction, Healthcare/Medical, Real Estate, Manufacturing, Non-profit, Freelancer/Solo, **AI/Agent Businesses** (with API cost structures, compute costs, token usage modeling)
- **Auto-save with named snapshots** for version comparison (e.g., "Q1 Forecast" vs "Post-Funding")
- **All features available to all users** with usage-based limits (number of models, forecast periods, export frequency) rather than feature gating
- **USD only** for MVP. Multi-currency deferred.
- **Web only** for MVP. Mobile deferred.
- **Single user per model** for MVP. Collaboration deferred.

### Advanced Capabilities (Phase 2+)

- **M&A Modeling:** Merger & acquisition analysis, accretion/dilution, synergy modeling
- **LBO Analysis:** Leveraged buyout models with debt schedules, returns analysis
- **Synthetic Data Modeling:** AI-generated market scenarios and stress testing
- **In-Browser Spreadsheet View:** Expert mode gets a Handsontable/SheetJS-style grid for direct cell editing
- **Native Google Slides Export:** Via Google Slides API with additional OAuth scope
- **Two-Way ERP Sync:** If QuickBooks/Xero APIs ever support budget writes, or via Journal Entry workaround
- **Multi-currency support**
- **Mobile read-only dashboards**
- **View sharing** (read-only links for team members/investors)

---

## Why This Approach

### Architecture: Calculation Engine + AI Narratives (A + C Hybrid)

**Calculation Engine (Core)**
- Server-side engine extending the existing formula engine (`math.js`) and cascade engine (DAG-based dependency propagation) from the `feat/assumptions-and-financials` branch
- Cherry-pick and extend: adopt formula engine, cascade engine, and confidence engine as foundations; extend for time-series data, financial functions (PMT, IRR, NPV), and hierarchical line items
- The existing 24 default assumptions become the "SaaS Startup" industry template
- Composable model templates define the structure of each financial model type
- Formula-aware data model tracks all cell relationships — this powers the fully interactive Excel export (writes real Excel formulas, not baked values)
- Deterministic and auditable — same inputs always produce same outputs

**AI Layer (Narratives + Assistance)**
- Seeds initial assumptions from research pipeline data (TAM, CAC, unit economics, pricing, revenue model, growth rates)
- Generates narrative content for investor presentations (executive summary, market opportunity sections, financial highlights)
- Explains financial concepts to Beginner-mode users in plain language
- Powers the presentation output generation (PDF and slides)
- Leverages existing Claude/GPT infrastructure already in the stack

**Spreadsheet View (Deferred to Phase 2)**
- Expert mode in MVP uses well-designed forms, not a browser spreadsheet
- Phase 2 adds in-browser spreadsheet component for Expert users who want direct cell editing
- Excel export works from day one because the engine knows all formulas

### Why Not Other Approaches

- **Spreadsheet-in-browser as primary UI:** Intimidating for Beginners, hard to maintain three knowledge modes, licensing costs for commercial libraries. Deferred to Phase 2 for Expert mode only.
- **AI-generated models as primary:** Non-deterministic — same inputs can produce different numbers. Unauditable. Users can't trust AI math for investor presentations without manual verification. AI is great for narratives but not for the core calculation engine.

---

## Key Decisions

1. **Same repo, new module** — Lives within the forge-automation monorepo. Shares auth, database, UI components, tRPC patterns, and AI infrastructure.

2. **Part of IdeationLab brand** — Not a separate product. Integrated as a section within the existing app. Routes under the project context for add-on, standalone entry for direct access.

3. **MVP scope: Forecasting + Budgeting + ERP** — Core 3-statement forecasting with QuickBooks/Xero read-only import for budget-vs-actual. Scenario analysis, break-even, and what-if included. M&A, LBO, and synthetic data modeling deferred to Phase 2.

4. **Standalone entry: Templates + Guided Wizard** — Both options available. Templates for quick start (10+ industry templates including AI/Agent businesses). Guided wizard for more customization. Add-on users get assumptions auto-seeded from research data.

5. **Three knowledge modes: Beginner, Standard, Expert** — Beginner shows ~10 high-level inputs with plain language. Standard shows typical financial inputs with explanations. Expert exposes all line items, custom formulas, and granular controls.

6. **ERP: Read-only import in MVP** — Pull actuals from QuickBooks/Xero via OAuth popup to display budget-vs-actual comparisons. Budgets/forecasts live in the tool only. Neither QuickBooks nor Xero API supports writing budget data. Silver tier ($300/mo) required for QuickBooks production API access.

7. **5-year forecast horizon** — Monthly for Year 1, quarterly for Year 2, annual for Years 3-5. Standard investor/lender expectation. Beginner mode can default to 3 years.

8. **Excel export: Fully interactive workbook** — Named ranges, real formulas, data validation dropdowns, linked sheets (P&L, BS, Cash Flow), scenario toggles. User can change assumptions in Excel and models recalculate. Powered by the calculation engine's formula-aware data model.

9. **Presentation: PDF + PowerPoint** — PDF via @react-pdf/renderer for direct sharing. PowerPoint via pptxgenjs for customization (opens in PowerPoint, Google Slides, or Keynote). Native Google Slides API deferred to Phase 2.

10. **All features, usage limits** — No feature gating by tier. All model types available to all users. Usage limits on number of models, forecast periods, export frequency.

11. **Calculation engine: A + C Hybrid** — Deterministic server-side engine for all math. AI for narratives, explanations, and assumption seeding. Spreadsheet-in-browser deferred to Phase 2.

12. **Cherry-pick & extend existing branch** — Adopt formula engine (math.js), cascade engine (DAG), and confidence engine from `feat/assumptions-and-financials`. Extend for time-series, financial functions, hierarchies. The 24 existing assumptions become the SaaS Startup template.

13. **Auto-save with snapshots** — Auto-save current state. Users can create named snapshots for point-in-time comparison.

14. **USD only, web only, single user** — For MVP. Multi-currency, mobile, and collaboration deferred.

---

## Existing Branch Assessment

### What to Keep from `feat/assumptions-and-financials`

| Component | Verdict | Key Extensions Needed |
|---|---|---|
| Formula Engine (math.js wrapper) | **Keep & extend** | Add financial functions (PMT, PV, FV, IRR, NPV, XIRR), time-series support, conditionals (IF), aggregation (SUM) |
| Cascade Engine (Kahn's DAG) | **Keep & extend** | Increase depth limit (10→50), add vectorized updates for monthly projections, batch cascade |
| Confidence Engine | **Keep & extend** | Add source-based weighting, context-aware staleness |
| 24 Default Assumptions | **Keep as SaaS template** | Becomes first industry template. Add 10+ more industry templates. |
| Assumption DB Schema | **Extend** | Add: parent_assumption_id (hierarchy), numeric_value, model_version, scenario_id, display_order |
| tRPC Router | **Extend** | Add: delete, bulk import, scenario support, template instantiation |
| UI Components | **Keep & extend** | Add: tree view for hierarchies, scenario selector, batch editing |
| Tests | **Must add** | Zero test coverage exists. Must add comprehensive tests before expanding scope. |

### Critical Gaps to Fill

1. **Financial functions** — PMT, PV, FV, IRR, NPV, XIRR for loan modeling and investment analysis
2. **Time-series support** — Engine currently handles single values only, needs 60-month arrays
3. **Line-item hierarchy** — "Total Revenue = Product A + Product B + Services" parent-child relationships
4. **Scenario isolation** — Parallel assumption sets for best/base/worst case comparison
5. **Test coverage** — No tests exist for any engine. Must add before extending.

---

## Data Flow: Add-on Entry Point

```
Research Pipeline Complete
        |
        v
Auto-seed Assumptions from Research Data:
  - price_point, revenue_model, pricing_strategy --> Revenue assumptions
  - TAM/SAM/SOM values, CAGR --> Market sizing assumptions
  - estimatedCAC, conversion rate --> Acquisition assumptions
  - unit economics, LTV --> Retention assumptions
  - tech stack monthly costs, team size --> Operating expense assumptions
  - execution difficulty, MVP timeline --> Timeline assumptions
        |
        v
User Reviews & Adjusts Assumptions (knowledge-level appropriate UI)
        |
        v
Calculation Engine Produces Models (P&L, BS, Cash Flow)
        |
        v
Outputs: In-app dashboard, Excel workbook, PDF, Slides
```

## Data Flow: Standalone Entry Point

```
User Selects Industry Template OR Starts Guided Wizard
        |
        v
Template: Pre-filled industry assumptions --> User customizes
Wizard: Step-by-step financial input collection (~15-25 questions)
        |
        v
Optional: Connect QuickBooks/Xero for actuals import
        |
        v
Calculation Engine Produces Models (P&L, BS, Cash Flow)
        |
        v
Outputs: In-app dashboard, Excel workbook, PDF, Slides
```

---

## Industry Templates (10+ at Launch)

Each template includes pre-filled assumptions, industry-standard cost structures, typical revenue models, and relevant line items.

1. **SaaS / Software** — Subscription revenue, MRR/ARR, churn, CAC, LTV, hosting costs
2. **AI / Agent Businesses** — API costs (per-token pricing), compute costs, model hosting, inference scaling, usage-based revenue
3. **E-commerce** — COGS, shipping, inventory, marketplace fees, return rates, seasonal adjustments
4. **Professional Services** — Billable hours, utilization rates, per-project pricing, contractor costs
5. **Restaurant / Food** — Food cost percentage, labor, rent, seasonal traffic, delivery platform fees
6. **Retail** — Inventory turns, shrinkage, rent per sqft, seasonal demand, markdown rates
7. **Construction** — Project-based revenue, materials, labor, equipment, bonding costs
8. **Healthcare / Medical** — Patient volume, insurance reimbursement, equipment amortization, compliance costs
9. **Real Estate** — Rental income, occupancy rates, cap rates, property management, maintenance reserves
10. **Manufacturing** — Bill of materials, production capacity, yield rates, equipment depreciation
11. **Non-profit** — Grants, donations, program costs, fundraising efficiency, overhead ratios
12. **Freelancer / Solo** — Hourly/project rates, utilization, minimal overhead, self-employment taxes

---

## QuickBooks / Xero Integration Details

### User Experience
- OAuth popup: user logs into QuickBooks/Xero and grants read permission
- App imports: Chart of Accounts, P&L report, Balance Sheet report, Cash Flow report
- Data displayed as "Actuals" alongside user's budget/forecast for comparison
- Refresh actuals on demand or on a schedule

### Technical Constraints
- **QuickBooks API**: Silver tier required ($300/mo). 10 req/sec rate limit. Budget entity is read-only.
- **Xero API**: 60 req/min rate limit (more restrictive). Budget entity also read-only.
- **Build estimate**: 4-6 weeks for read-only import with both QuickBooks and Xero
- **Webhook support**: QuickBooks webhooks batched every ~5 min (not real-time). Use for incremental sync.

---

## Technical Notes

### Existing Infrastructure to Leverage

- **Formula engine** (`math.js` wrapper) — hardened, with compilation caching and AST dependency extraction
- **Cascade engine** (Kahn's topological sort) — DAG-based auto-recalculation when assumptions change
- **Confidence engine** — tracks AI-estimated, user-input, validated, or calculated confidence levels
- **tRPC + Zod** for type-safe API with validation
- **BullMQ + Redis** for long-running computations (model generation, Excel building)
- **@react-pdf/renderer** for PDF generation
- **Recharts** for data visualization
- **Drizzle ORM + Supabase (PostgreSQL)** for data persistence
- **AI providers** (Claude, GPT) via Vercel AI SDK for narrative generation
- **NextAuth v5** with Google OAuth for authentication

### New Infrastructure Needed

- **ExcelJS** (or SheetJS) — fully interactive workbook export with real formulas
- **pptxgenjs** — PowerPoint slide deck generation
- **QuickBooks Node SDK + Xero Node SDK** — ERP read-only import via OAuth
- **Financial functions library** — PMT, PV, FV, IRR, NPV, XIRR (custom or via financial.js)
- **Model template system** — declarative JSON definitions of financial model structures
- **New database tables** — financial models, scenarios, model snapshots, ERP connections, budget line items

### Database Schema Extensions

```
New tables:
  - FinancialModel (id, projectId, templateId, name, knowledgeLevel, forecastHorizon, status)
  - Scenario (id, modelId, name, isBase, assumptions JSONB)
  - ModelSnapshot (id, modelId, name, snapshotData JSONB, createdAt)
  - ERPConnection (id, userId, provider, accessToken, refreshToken, realmId, lastSyncAt)
  - BudgetLineItem (id, modelId, category, name, budgetValues JSONB, actualValues JSONB)
  - IndustryTemplate (id, slug, name, description, assumptions JSONB, lineItems JSONB)

Extensions to existing Assumption table:
  - parent_assumption_id (for hierarchy)
  - numeric_value DECIMAL (for efficient queries)
  - scenario_id FK (for scenario isolation)
  - display_order INTEGER (for UI ordering)
  - model_id FK (for multi-model support)
```
