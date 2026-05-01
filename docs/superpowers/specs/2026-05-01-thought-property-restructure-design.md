# Thought Property Restructure — Design

**Date:** 2026-05-01
**Status:** Draft, pending review
**Branch (proposed):** `matt/thought-property-restructure`

---

## 1. Belief

> A thought is not an idea. An idea is what forms when enough thoughts collide.

The product must enforce this in the schema, not just in copy. Today, users can self-declare a thought as an "idea" at capture time (`purpose: 'idea' | 'note'`) and self-declare its `maturityLevel`. Both of those choices contradict the brand: ideas can't be declared, only grown. Maturity can't be set, only observed.

This restructure removes the user-declared property layer from thoughts, finishes a half-built `CrystallizedIdea` architecture, and renames `Project` → `Idea` so vocabulary stays consistent end-to-end.

---

## 2. Decisions (locked in conversation)

| # | Decision | Rationale |
|---|---|---|
| 1 | Replace `Thought.purpose` (`idea | note`) with `Thought.kind` (`thought | note`, default `thought`). Default capture path requires zero decision. "File as note" is an opt-out affordance for utility captures (bug logs, todos), framed as filing not idea-evaluation. | Brand-protected default + a release valve for non-ideation captures without forcing the user to declare idea-worthiness. |
| 2 | Drop `Thought.maturityLevel`, `maturityNotes`, `maturityHistory` entirely from thoughts. Maturity moves to **clusters**, computed by AI. | User-declared maturity is the same lie at a different layer. Per-thought maturity adds noise without driving behavior. |
| 3 | Full code rename `Project` → `Idea` (table, router, types, UI). | Vocabulary is brand-load-bearing. UI-only rename leaks. |
| 4 | Collapse `crystallizedIdeas` table into the renamed `ideas` table. One entity, one name. | Two-table split for one user-facing concept is accidental complexity (table sat dormant). |
| 5 | Kill `thought.promote()` (single-thought → Project). Crystallization is **cluster-only**. | "An idea forms when enough thoughts collide." Single-thought promote is brand-incompatible. |
| 6 | Replace `purpose='idea'` gate (collision detection + resurfacing) with: (a) no semantic gate — every thought eligible, plus (b) minimum content length filter. | Brand: trust the user. Length is mechanical, not semantic. |
| 7 | Keep both `validationStatus` (user workflow) and existing `cardResult.verdict` (AI scoring output) on Idea. They're orthogonal. | Different concerns. |
| 8 | Sketch tab (Gemini image generator) untouched. Independent from thought→idea pipeline. | Already standalone — no change needed. |
| 9 | Cluster `clusterMaturity` (`exploring | forming | ready`) becomes auto-computed and surfaced on cluster cards. | Per-thought maturity moves here, computed from cluster signals. |

---

## 3. Schema Changes

### 3.1 `Thought` table — fields removed

```diff
  thoughts (
    id, title, content, thoughtType, typeSource, tags, aiTags,
-   purpose,                  -- DROP (idea|note user-declared)
+   kind TEXT DEFAULT 'thought' NOT NULL,  -- ADD ('thought'|'note', filing distinction)
-   maturityLevel,            -- DROP: moves to cluster
-   maturityNotes,            -- DROP: violates "system computes, doesn't ask"
-   maturityHistory,          -- DROP: no longer tracked at thought level
    confidenceLevel,
    -- resurfacing fields stay (nextSurfaceAt, dismissStreak, etc.)
    -- connection fields stay (clusterId, collisionIds, etc.)
    -- refinement fields stay (refinedTitle, refinedDescription, refinedTags)
-   promotedProjectId,        -- DROP: thought.promote() flow being removed
    ...
  )
```

### 3.2 `Project` → `Idea` rename + merge with `CrystallizedIdea`

Drop `crystallizedIdeas` table. Add its fields directly to the renamed `ideas` table.

```diff
- projects → ideas
  ideas (
    id, userId, createdAt, updatedAt,
    title, description, notes,
    status, mode, businessContext,
    cardResult,                              -- existing AI verdict (proceed/watchlist/drop)

+   -- merged from crystallizedIdeas:
+   problemStatement TEXT,
+   targetAudience TEXT,
+   proposedSolution TEXT,
+   uniqueAngle TEXT,
+   pricingHypothesis TEXT,
+   sparkAnswers JSONB,
+   sparkSessionId TEXT,
+   sourceClusterId TEXT REFERENCES thoughtClusters(id) ON DELETE SET NULL,
+   sourceThoughtIds TEXT[] DEFAULT '{}',
+   crystallizedAt TIMESTAMP,
+   crystallizedBy TEXT NOT NULL,

+   -- new workflow status:
+   validationStatus TEXT DEFAULT 'draft' NOT NULL,  -- draft|in_validation|validated|killed|returned

-   promoted, promotedAt   -- DROP: vestigial from single-thought-promote
  )

- crystallizedIdeas table  -- DROP entirely (merged into ideas)
```

### 3.3 `ThoughtCluster` — wire up dormant fields

No new fields. The existing fields finally get used:

- `clusterMaturity` (`exploring | forming | ready`) — computed, not user-set
- `readinessScore` (double) — computed
- `dimensionCoverage` (JSONB) — computed (which idea dimensions have coverage from member thoughts)
- `themes`, `tensions`, `gaps`, `synthesis` — populated by the existing `summarize`/`identifyGaps`/`findContradictions`/`generateBrief` AI actions (currently they return data but don't persist)

### 3.4 FK / table renames cascade

- `thoughtAttachments` may reference projectId — rename column or leave (will verify in plan).
- `projectAttachments` → `ideaAttachments` (full rename).
- `sparkCard.projectId`, `customerInterview.projectId` → `ideaId`.
- `notes` table alias → no change (still aliases `thoughts`).
- `sandboxes` alias → no change (still aliases `thoughtClusters`).

---

## 4. Behavioral Changes

### 4.1 Capture flow

Today: user picks Idea or Note via bottom sheet, then types, then saves.

After: user types, saves. Saves as `kind='thought'` by default. AI auto-classifies `thoughtType` async. Embedding + collision detection async. No purpose picker. No friction.

**"File as note" affordance:** A small inline label below the input — `File as note`. Tapping it before save sets `kind='note'`. Optional, never required, invisible until the user looks for it. Framing matters: it's a filing action, not an idea-quality evaluation.

**Eligibility gates replaced:**
- Collision detection: today gated on `purpose='idea'`. After: gated on `kind='thought' AND content.length >= 20`. Notes never embed (cost saving).
- Resurfacing: today gated on `purpose='idea'`. After: gated on `kind='thought' AND content.length >= 20`. Score formula gets a small penalty for `thoughtType='observation'` to keep passive scribbles from dominating the resurface feed.
- AI auto-classification (`thoughtType`): only runs for `kind='thought'`. Notes have no thoughtType.
- Cluster eligibility: only `kind='thought'` can be added to clusters.

**Convertible:** Thought ↔ Note can be swapped at any time via the detail view. On thought → note conversion, queued embedding/classification jobs are cancelled. On note → thought, jobs are enqueued.

### 4.2 Thought detail view

Property chip bar shows exactly four chips (when `kind='thought'`):
1. **Type** (AI auto-detected, user override available)
2. **Confidence** (`untested | researched | validated`, user-set, default `untested`)
3. **Cluster** (`+ Add to cluster` ghost when unset)
4. **Labels** (freeform tags)

For `kind='note'`, the chip bar shows only **Labels** — no Type, Confidence, or Cluster (they're idea-engine concepts and notes are exempt).

Detail view also has a kebab action: **Convert to note** (when `thought`) or **Convert to thought** (when `note`).

Removed: Idea/Note toggle, Maturity picker.

### 4.2.1 Thoughts tab filter

Top-right of the Thoughts tab gets a 3-position filter: **Thoughts | Notes | All**. Default: Thoughts. Notes don't pollute the idea stream by default. Filter state persists across app sessions per user.

### 4.3 Cluster card + cluster detail

Cluster card now shows a maturity dot/ring tied to `clusterMaturity` plus thought count.

`clusterMaturity` auto-computation:

| Status | Trigger |
|---|---|
| `exploring` | Default. < 5 thoughts, OR no AI synthesis run yet. |
| `forming` | ≥ 5 thoughts AND at least one of {summarize, identifyGaps, findContradictions, generateBrief} has been run AND persisted. |
| `ready` | `readinessScore > 0.7`. |

`readinessScore` formula (computed on cluster mutation events):

```
readinessScore =
    0.30 * thoughtDiversityScore       // distinct thoughtType count / 5
  + 0.25 * dimensionCoverageScore       // dimensions with evidence / 5
  + 0.20 * synthesisDepthScore          // synthesis tools run / 4 (counted: summarize, identifyGaps, findContradictions, generateBrief)
  + 0.15 * tensionResolutionScore       // resolved contradictions / total contradictions
  + 0.10 * connectionDensityScore       // cross-thought collision count / thoughtCount, capped at 1
```

`dimensionCoverage` JSONB stores `{ problem: bool, audience: bool, solution: bool, angle: bool, pricing: bool }` — which of the 5 idea dimensions have evidence from cluster thoughts. Computed by extending the existing `summarize` AI call to also tag each thought with the dimension(s) it speaks to; aggregated and persisted onto the cluster row. Refreshed any time `summarize` runs.

`extractTodos` does **not** count toward synthesis depth (it's a productivity action, not idea-shape work).

Cluster detail view gets a primary **Crystallize** CTA, styled by status:
- `exploring`: hidden
- `forming`: secondary styling, "Keep growing"
- `ready`: primary red CTA, "Crystallize"

### 4.4 Crystallization flow (the moment)

User taps Crystallize on a `ready` cluster:

1. AI extracts the 5 fields (`problemStatement`, `targetAudience`, `proposedSolution`, `uniqueAngle`, `pricingHypothesis`) from cluster thoughts via existing `synthesizeIdea()` (extended). Single Haiku call.
2. Mobile shows a "Crystallize Preview" screen — 5 editable fields pre-filled with AI extractions.
3. User confirms. New row inserted into `ideas` with crystallization fields + `validationStatus = 'draft'` + provenance (`sourceClusterId`, `sourceThoughtIds`).
4. User navigated to Vault tab with new Idea visible.
5. **Source cluster and thoughts are NOT deleted.** A cluster can be crystallized multiple times.

### 4.5 Vault

Vault remains the Idea home. UI updates to surface crystallization-era fields:

- Idea card displays: title, first line of `problemStatement`, validation status badge, `cardResult.verdict` badge (if scored), crystallized date, source thought count + time span.
- Idea detail shows all 5 fields plus link back to source cluster ("View source cluster").
- "Back to cluster" action sets `validationStatus = 'returned'` and re-opens source cluster. Idea is preserved (not deleted).
- Empty state: "Your crystallized ideas live here. Start by growing thoughts in the Thoughts tab."

### 4.6 Removed user-facing actions

- Purpose picker on capture
- Maturity picker on thought detail
- "Promote to Idea" via single thought (entire `thought.promote()` flow gone)

### 4.7 Renamed tRPC procedures

- `cluster.promoteToIdea` → `cluster.crystallize` (extended to extract 5 fields + insert into `ideas` with provenance)
- `project.*` → `idea.*` everywhere
- `note.*` aliases stay (mobile still uses some), but type defs reflect the new schema

### 4.8 Cluster AI Actions (synthesis tools)

The 6 existing cluster AI actions are reorganized by purpose. Most become auto-triggered. The user retains manual override. Crystallize is removed from the menu and elevated to a primary CTA.

**Persistence (all six actions get this — currently they return data and discard it):**

| Action | Persisted to |
|---|---|
| `summarize` | `cluster.synthesis` (text). Also extended to write `cluster.dimensionCoverage` (JSONB) — tags each thought into one of {problem, audience, solution, angle, pricing}, aggregates onto cluster. |
| `identifyGaps` | `cluster.gaps` (JSONB array of `{ id, text }`) |
| `findContradictions` | `cluster.tensions` (JSONB array of `{ id, text, resolvedAt: timestamp \| null }`) |
| `generateBrief` | New `cluster.brief` (text) field — add column. |
| `extractTodos` | Not persisted on cluster; returned to client only. |
| `crystallize` | Inserts into `ideas` table (new). |

**Auto-trigger schedule (background worker `clusterSynthesisWorker`, debounced 5 min after last cluster mutation):**

| Trigger | Action |
|---|---|
| Cluster reaches 5 thoughts | `summarize` + `identifyGaps` |
| Cluster reaches 8 thoughts | `findContradictions` |
| Cluster reaches 12 thoughts (and every +5 after) | re-run `summarize` |
| `readinessScore` crosses 0.5 | `generateBrief` |
| `readinessScore` crosses 0.7 (status → `ready`) | re-run all four for freshness; surface in-app prompt: "Your [cluster name] cluster is ready to crystallize." |

**Manual triggers (always available):**

- All 4 synthesis tools re-runnable on demand from the cluster AI menu.
- `extractTodos` is manual-only (utility, not ideation).
- `crystallize` is manual-only (the user's moment of intent).

**UI hierarchy in cluster detail:**

- **Primary CTA at bottom**: Crystallize button. Hidden when `exploring`, secondary styling when `forming`, primary red CTA when `ready`. Removed from the AI menu.
- **AI menu (sparkle icon)**: 5 actions remain — Summarize, Find Tensions, Find Gaps, Generate Brief, Extract Todos. Visually grouped: "Synthesis" (top 4) and "Utility" (Extract Todos).
- **Persisted output displayed inline**: cluster detail renders the latest `synthesis`, `gaps`, `tensions`, `brief` content automatically. No re-fetch needed.

**Tension resolution UX:**

Each entry in `cluster.tensions` has a `resolvedAt` field. Tap a tension to mark resolved. Resolved tensions move to a "Resolved" subgroup in the UI. Resolution counts toward `readinessScore.tensionResolutionScore`.

**UI string renames:**

- "Promote to Idea" → "Crystallize"
- "Contradictions" → "Find Tensions" (matches brand brief vocabulary)
- Rocket icon on Crystallize → replace with a brand-aligned icon (sparkle/seed/crystal — TBD in implementation)

---

## 5. Data Migration

A single migration runs in this order:

1. **Migrate `purpose` → `kind`**: Add `thoughts.kind TEXT DEFAULT 'thought' NOT NULL`. Backfill: `kind = 'note'` where `purpose = 'note'`, else `'thought'`. Existing notes preserve their notes-iness.
2. **Drop columns**: `thoughts.purpose`, `thoughts.maturityLevel`, `thoughts.maturityNotes`, `thoughts.maturityHistory`, `thoughts.promotedProjectId`.
3. **Rename**: `projects` table → `ideas`. Cascade to all FKs (`projectAttachments`, `sparkCard.projectId`, `customerInterview.projectId`, etc.).
4. **Add columns**: 11 new columns on `ideas` from `crystallizedIdeas` schema + `validationStatus`.
5. **Backfill from `crystallizedIdeas`**: For any rows in `crystallizedIdeas`, copy fields onto matching `ideas.id` row joining on `crystallizedIdeas.projectId = ideas.id` (column wasn't renamed, just the parent table). In production today this table is empty, so this is defensive only.
6. **Drop `crystallizedIdeas`** table.
7. **Drop legacy columns**: `ideas.promoted`, `ideas.promotedAt`.
8. **Add `cluster.brief TEXT`** column (for `generateBrief` persistence).
9. **Backfill `clusterMaturity`** for existing clusters: apply Section 4.3 rules retroactively.
10. **Backfill `readinessScore`** for existing clusters: compute and persist.
11. **Backfill embeddings for existing `kind='thought'`** thoughts that don't have one: enqueue background job, run at low priority. Notes are skipped.

Note: existing thoughts with `purpose='note'` will become resurfacing-eligible. Embedding generation will be triggered lazily on first resurface check (per cost strategy decision 6c-style optimization, deferred from new captures).

---

## 6. Cost Implications

Removing the `purpose='idea'` gate means every `kind='thought'` capture (over 20 chars) generates an embedding + Haiku classification. Notes (`kind='note'`) skip both — they don't enter the engine.

Estimated per-thought cost:
- Embedding (Voyage / OpenAI): ~$0.00002
- Haiku classification: ~$0.0005
- Total: <$0.001 per thought

For a power user capturing 50 thoughts/day, this is ~$0.05/day or ~$1.50/month — within tier pricing tolerances per existing pricing model.

Cluster auto-synthesis costs (per cluster, over its lifetime from 0 → 20 thoughts): ~6 Haiku calls × ~$0.001 = ~$0.006 per cluster. Bounded by milestone, not capture rate.

**Throttle**: existing daily/monthly quota checks remain in place; this restructure doesn't change the quota math, just removes the meaning-based filter and adds the kind-based exemption.

---

## 7. Out of Scope

- Voice memo / transcription wiring (columns exist, unused; separate feature)
- Onboarding copy rewrite (separate copy task)
- Sketch tab (independent feature; untouched)
- New AI features at cluster level (existing 6 are enough)
- "What's New" in-app explainer modal
- Analytics events cleanup (handle in a follow-up sweep)

---

## 8. Risks & Open Questions

- **Embedding cost surge for existing notes**: Existing `purpose='note'` thoughts that haven't been embedded need embeddings on first resurface check. For users with many old notes, this is a one-time cost spike. Mitigation: backfill in a controlled background job, not on user request.
- **Mobile cache invalidation**: Per memory, `note.*` and `thought.*` tRPC paths cache separately. Any schema-derived type change must invalidate both. The plan must include a cache-key sweep.
- **`cluster.promoteToIdea` rename is breaking**: Mobile sandbox detail screen calls the old name. Ship the new name behind a temporary alias (`promoteToIdea` → forwards to `crystallize`) for one mobile release, then remove.
- **"Returned" validation status UX**: When a user returns an Idea to its cluster, what happens to the Idea row? Decision in spec: keep the row, set status to `returned`, re-open cluster. User can re-crystallize, which creates a *new* Idea row (variants are valid).
- **`clusterMaturity` performance**: Recomputing on every thought add/remove + every AI synthesis run. If this becomes a hot path, move to debounced async job. Initial implementation: synchronous on mutation.

---

## 9. Validation

The spec is correct if, after implementation:

- A user opens the app, types a thought, hits save. No purpose picker appears. Thought lands in Thoughts tab within 200ms. AI type is filled in within 5s.
- Maturity nowhere in the thought detail view.
- Cluster cards show a status indicator. Status updates when thoughts are added or AI tools are run.
- Tapping Crystallize on a `ready` cluster surfaces 5 editable fields, confirms create an Idea visible in Vault.
- Vault Idea cards show provenance and validation status.
- The single-thought "Promote" action is gone from anywhere it appeared.
- Old captured thoughts still appear, untouched, in the user's stream.
