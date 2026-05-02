# Handoff — Thought Property Restructure + Cluster Questions

**Date:** 2026-05-02
**Author:** Claude (continuing from a long autonomous session)
**Purpose:** Pick up cleanly in a new session.

---

## TL;DR — where we are

1. **Restructure shipped.** PR #15 merged, migration applied to prod, Vercel + Railway deployed. Production is live on the new schema (`Idea` instead of `Project`, `Thought.kind` instead of `purpose`, etc.).
2. **EAS build #52 is in TestFlight processing.** Apple's hands. Will land in TestFlight on the user's phone whenever Apple finishes processing.
3. **PR #16 (small fixes) is pushed but NOT merged.** Has 3 commits: vocab fix (`Untitled Note` → `Untitled Thought`), cluster cache invalidation on autosave, always-on Crystallize CTA + inline placement, plus the saved research doc.
4. **PR #17 (cluster Questions feature) is implemented but NOT pushed.** 8 commits on branch `matt/cluster-questions-feature` (off main). Has working-tree residue from a botched stash recovery — needs cleanup before push.

---

## Open PRs / branches

### PR #15 — `matt/thought-property-restructure` ✅ MERGED
Squash-merged 2026-05-01 as commit `65a3daf` on `main`. Don't reopen.

### PR #16 — `matt/cluster-thought-vocab-and-cache-fix` 🔄 OPEN, NOT MERGED
- URL: https://github.com/basecampvg/idea-fuel/pull/16
- Branch off `main`, pushed
- 3 commits:
  - `d869eb7` fix: cluster screen vocab + stale cache after adding/editing thought
  - `75715b8` mobile cluster: always-on Crystallize CTA + inline placement
- Adds the research doc `docs/superpowers/research/2026-05-02-idea-development-questions.md`
- **Action when ready:** merge → triggers EAS build with the fixes for testing

### PR #17 — `matt/cluster-questions-feature` 🔧 LOCAL ONLY
- Branch is OFF main, NOT pushed yet
- 8 commits implementing the cluster Questions feature
- Type-checks clean across server/shared/mobile
- Migration `0026_cluster_questions.sql` is created but not applied
- **Has uncommitted residue from a stash recovery** — see "Cleanup needed" below

---

## What got built

### Restructure (shipped)
- `Project` → `Idea` rename (table, router, types, UI). 43 rows preserved through rename.
- `Thought.purpose` → `Thought.kind` (`thought` | `note`, default `thought`). 3 thoughts backfilled to `note` from prior `purpose='note'`.
- Dropped `Thought.maturity_*` columns and `promoted_project_id`. 12 thoughts lost their `maturity_level` value (intentional per spec).
- `crystallizedIdeas` table dropped (was empty); 11 columns merged into `Idea` table.
- Added `validation_status` enum (`draft | in_validation | validated | killed | returned`).
- Cluster maturity computed from 5-component readiness score; auto-triggered synthesis worker on milestones (5/8/12 thoughts, readiness 0.5/0.7).
- Mobile: capture flow without purpose picker, "File as note" affordance, Thoughts/Notes/All filter, cluster detail with SynthesisPanel + TensionList, Crystallize preview screen with editable 5 fields, Vault rebuilt for Idea entity.
- Single-thought `thought.promote()` flow killed; crystallization is cluster-only.

### PR #16 fixes
- "Untitled Note" → "Untitled Thought" placeholder in cluster detail
- `useNoteAutoSave` now invalidates `cluster.get` on save (so cluster reflects new content without manual refresh)
- `CrystallizeCTA` is always visible (drops the hidden `exploring` state and the secondary "Keep growing" label) — outline when not ready, filled red when ready, single label "Crystallize"
- CTA moved from absolute-positioned overlay to inline in the FlatList footer (no longer blocks scrolled content)

### PR #17 (Questions feature, ready to push)
Brand idea: Always-on questions panel that asks questions to spark deeper thought rather than suggesting completions. The system surfaces; the user decides.

Implementation grounded in the research doc (Mom Test, JTBD, Customer Development, Graham, IDEO, Wallas, etc.).

**Backend:**
- `ThoughtCluster.questions` JSONB column + migration `0026_cluster_questions.sql`
- `services/cluster-questions.ts` — `generateClusterQuestions(ctx)` with stage detection (early/forming/ready) and a 2-call architecture: generate → validate
- Validator runs each candidate question against the heuristic ("concrete > hypothetical, past-tense > future, open > closed, non-leading") and rewrites failing ones
- `cluster-actions.ts` adds `runGenerateQuestions(clusterId, userId)` runner
- `cluster.generateQuestions` tRPC procedure (manual trigger)
- `clusterSynthesisWorker` auto-triggers on milestones: `thoughts:5`, `readiness:0.5`, `readiness:0.7` — keeps questions fresh as cluster grows
- `thought.create` now persists optional `title` (used for question-prompted thoughts so the question is preserved as context)

**Mobile:**
- New `QuestionsPanel` component renders questions inline in cluster footer
- Tap a question → navigates to capture screen with `?prompt=<question>&clusterId=<id>`
- Capture screen reads URL params, displays question above input as muted card, saves with `title=question` and `clusterId` set, navigates back to cluster
- "Ask more questions" button refreshes via `cluster.generateQuestions` mutation

**Cost bound:** ~$0.002 per generation (2 Haiku calls), bounded by milestones — ~6 generations per cluster lifetime.

---

## What's pending

### Cleanup needed (do FIRST when resuming)
The Questions branch has residue from a stash recovery the implementer did mid-task:

```
git status (on matt/cluster-questions-feature)
 M packages/server/src/scripts/blog-content/post-01-business-plan-generator.ts
 M packages/server/src/scripts/blog-content/post-02-best-ai-tools-business.ts
 ... (10 blog post files modified)
?? packages/mobile/src/components/thought/MaturityPicker.tsx       ← was deleted intentionally
?? packages/mobile/src/components/thought/PurposePicker.tsx        ← was deleted intentionally
```

**These are NOT in any commit on the branch.** The blog post modifications are unrelated work (probably from a separate `matt/landing-page` stash that got popped accidentally). The Maturity/Purpose pickers were intentionally deleted in PR #15 — these are reappearing copies.

**Recommended cleanup:**
```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel
git checkout -- packages/server/src/scripts/blog-content/
rm packages/mobile/src/components/thought/MaturityPicker.tsx
rm packages/mobile/src/components/thought/PurposePicker.tsx
git status   # should be clean
```

If the blog post modifications were YOUR in-progress work, recover from the reflog instead — the original stash is gone but the blob hashes may still exist:
```bash
git fsck --unreachable --no-reflogs | head
# or
git stash list
```

### Then push + PR
```bash
git push -u origin matt/cluster-questions-feature
gh pr create --base main --title "Cluster Questions: research-grounded prompts that spark deeper thought" --body "<see template below>"
```

PR description template is at the bottom of this doc.

### Apply migration when ready
Migration `0026_cluster_questions.sql` adds one column (`questions` jsonb default `[]`). Idempotent (`IF NOT EXISTS`). Run via direct psql to bypass drizzle journal sync issues, matching 0024/0025 precedent:

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel
set -a && source .env && set +a
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f packages/server/drizzle/0026_cluster_questions.sql
```

This requires explicit user authorization per auto-mode safety rules.

### EAS build for testing
After PR #16 merges, the new mobile fixes need an EAS build:
```bash
cd packages/mobile
eas build --platform ios --profile testflight --non-interactive --auto-submit
```

Build #52 (already in TestFlight) does NOT have the PR #16 fixes. Need build #53.

---

## Decisions made (locked)

1. **Always-on Crystallize CTA, no gating.** User decides when to crystallize. System surfaces what's missing via Questions panel; never disables the action.
2. **Questions, not Suggestions.** "Questions activate the user; suggestions just inform them." Brand-aligned: ideas are grown.
3. **Research-grounded templates.** Built on Mom Test (Fitzpatrick), JTBD (Christensen), Customer Development (Blank), Graham essays, IDEO "How Might We," 5 Whys, SCAMPER, Eames, Pixar Braintrust, Wallas, Guilford. Templates live in the AI service prompt, not as static strings — the model adopts the voice from the framework names.
4. **Stage-aware:** divergent (early), mixed (forming), convergent (ready). Detected from `readinessScore` and `thoughtCount`.
5. **Self-check validator:** every generated question passes a heuristic check (past-tense, concrete, open, non-leading) or gets rewritten. Cheap second Haiku call.
6. **Auto-triggered on cluster milestones.** Same milestones as other synthesis tools (5/8/12 thoughts, readiness 0.5/0.7). Don't run on every page load.
7. **Tap a question → capture screen with prompt prefilled.** Question becomes the new thought's `title`, user's answer becomes `content`. Auto-pinned to source cluster.
8. **`project: ideaRouter` and `projects = ideas` aliases stay for one mobile release.** 4 mobile files still use `trpc.project.*` — migrate before removing aliases.

## Decisions still open

- **When to merge PR #17.** Probably after PR #16 is in TestFlight and verified. Don't bundle two unrelated UX changes in the same test cycle.
- **Whether question generation should ever run synchronously** (e.g., when user opens a cluster that has no questions yet). Currently relies on worker triggers — first-load could feel empty until a milestone fires. Acceptable for v1.
- **Whether to add a "dismiss this question" UX.** Currently the user can ignore them; if they want to remove one explicitly, that's a future enhancement.
- **Whether to upgrade `dimensionCoverage` from heuristic to AI-tagged.** Currently set as a side-effect of `summarize`; could be its own pass.

---

## Key file references

### Specs / plans / research
- `docs/superpowers/specs/2026-05-01-thought-property-restructure-design.md` — the original spec
- `docs/superpowers/plans/2026-05-01-thought-property-restructure.md` — the original implementation plan
- `docs/superpowers/research/2026-05-02-idea-development-questions.md` — research synthesis grounding the Questions feature

### Brand context
- `IdeaFuel_Brand_Brief_Launch_Playbook.md` — the brand thesis. "A thought is not an idea." All design decisions trace back here.
- `CLAUDE.md` (repo root) — repo conventions, commands, deployment notes

### Auto-memory
- `~/.claude/projects/-Users-mattjones-Documents-IdeaFuel/memory/MEMORY.md` — institutional knowledge, including some entries about this work session

### Migration files
- `packages/server/drizzle/0025_thought_property_restructure.sql` — applied 2026-05-01
- `packages/server/drizzle/0026_cluster_questions.sql` — staged, NOT applied

### Drizzle journal note
The drizzle-kit journal is out of sync with the live DB (multiple migrations were applied out-of-band per `RECONCILIATION.md`). This means `pnpm db:migrate` will try to re-run old migrations. Use direct psql for hand-rolled SQL, matching 0024/0025/0026 precedent.

---

## How to resume in a new session

1. **`cd` into the repo:** `/Users/mattjones/Documents/IdeaFuel/idea-fuel`
2. **Read this handoff doc** (you're doing it)
3. **Read the brand brief** and the spec for context: `IdeaFuel_Brand_Brief_Launch_Playbook.md` + `docs/superpowers/specs/2026-05-01-thought-property-restructure-design.md`
4. **Check git state:** `git branch -a` to see open branches, `gh pr list` to see open PRs
5. **Decide next action.** Most likely path: clean working tree → push Questions branch → open PR #17 → wait for user to test PR #16 in TestFlight → decide on Questions PR merge timing.

---

## Open user-facing questions (for next session)

1. **Did EAS build #52 install successfully and pass the smoke tests?** (capture flow, kind filter, cluster detail, vault, etc.)
2. **Did PR #16 merge?** If so, was build #53 cut?
3. **What did the user think of the Questions feature design** when they read the research summary?
4. **Are there other bugs the user found** in TestFlight beyond the cluster CTA position + Untitled Note?

---

## PR #17 description template

When you're ready to push and open the PR, use this:

```markdown
## Why

A thought-cluster needs more than synthesis output to grow into an idea — it needs prompts that spark deeper thought. Suggestions inform; questions activate. This adds a Questions panel to cluster detail that surfaces AI-generated, research-grounded questions tailored to what the cluster already contains and what's missing.

Brand-aligned: the system surfaces, the user decides. Crystallize is always available; questions help the user decide they're ready (or notice what they're missing).

## Research grounding

`docs/superpowers/research/2026-05-02-idea-development-questions.md` synthesizes Mom Test, JTBD, Customer Development, Graham essays, IDEO "How Might We," 5 Whys, SCAMPER, Eames, Pixar Braintrust, Wallas, and Guilford into 7 question categories with stage-aware templates. Every generated question passes a heuristic validator before display.

## What changed

**Backend:**
- `ThoughtCluster.questions` JSONB column + migration `0026`
- `services/cluster-questions.ts` — `generateClusterQuestions` with 2-call architecture (generate → validate)
- `runGenerateQuestions` runner in `cluster-actions.ts`
- `cluster.generateQuestions` tRPC procedure
- `clusterSynthesisWorker` triggers questions generation on milestones (5 thoughts, readiness 0.5, readiness 0.7)
- `thought.create` now persists optional `title` (for question-prompted thoughts)

**Mobile:**
- `QuestionsPanel` component in cluster detail footer (between Tensions and Crystallize)
- Capture screen reads `?prompt=<question>&clusterId=<id>` URL params, displays question above input
- "Ask more questions" button refreshes the panel

## Test plan
- [ ] Add 5 thoughts to a cluster → wait 5 min → questions appear
- [ ] Tap a question → capture screen shows the question above the input
- [ ] Type answer → save → returns to cluster, new thought has question as title
- [ ] "Ask more questions" → fresh questions appear within 5s
- [ ] Push readiness past 0.7 → questions become more convergent
- [ ] Empty cluster → QuestionsPanel renders nothing

## Apply migration before merging

`packages/server/drizzle/0026_cluster_questions.sql` adds one nullable column. Idempotent. Run via direct psql against prod with explicit confirmation.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
