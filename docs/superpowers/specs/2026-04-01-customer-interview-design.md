# Customer Interview Tool — Design Spec

## Overview

A shareable, Typeform-style interview form that lets IdeaFuel founders collect real customer feedback to validate their business ideas. AI generates targeted questions based on available project context, and responses feed into the research pipeline as first-party signal.

## Problem

IdeaFuel's current validation flow relies on desk research and AI-led founder interviews. There is no mechanism for founders to gather structured feedback from real potential customers. Customer discovery interviews are a critical validation step — they surface pain points, workarounds, and willingness-to-pay signals that desk research cannot capture.

## Solution

A self-serve interview form (like Typeform) that founders generate from the draft project page, share via link, and collect responses from real people. Responses feed into the deep research pipeline and can also generate a standalone PDF report.

---

## Data Model

### `CustomerInterview` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | text, PK | nanoid |
| `projectId` | text, FK → Project | |
| `userId` | text, FK → User | |
| `uuid` | text, unique | Shareable link slug |
| `title` | text | AI-generated, e.g., "Customer Discovery: Pet Care SaaS" |
| `questions` | jsonb | Ordered array of `{ id, text, type, required, options? }` — `options` is a string array, only for MULTIPLE_CHOICE |
| `gating` | enum: `PUBLIC`, `PASSWORD`, `NDA` | Access control type |
| `password` | text, nullable | bcrypt-hashed, only for PASSWORD gating |
| `status` | enum: `DRAFT`, `PUBLISHED`, `CLOSED` | |
| `waitlistEnabled` | boolean, default true | |
| `newsletterEnabled` | boolean, default true | |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**Question types:** `FREE_TEXT`, `SCALE`, `MULTIPLE_CHOICE`, `YES_NO`

### `InterviewResponse` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | text, PK | nanoid |
| `customerInterviewId` | text, FK → CustomerInterview | |
| `sessionToken` | text | UUID from cookie, for duplicate prevention |
| `answers` | jsonb | Array of `{ questionId, value }` |
| `respondentName` | text, nullable | |
| `respondentEmail` | text, nullable | |
| `joinedWaitlist` | boolean | |
| `joinedNewsletter` | boolean | |
| `completedAt` | timestamp | |
| `createdAt` | timestamp | |

**Unique constraint:** `(customerInterviewId, sessionToken)` — prevents duplicate submissions.

### `NdaSignature` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | text, PK | nanoid |
| `customerInterviewId` | text, FK → CustomerInterview | |
| `interviewResponseId` | text, FK → InterviewResponse, nullable | Linked after form completion |
| `fullName` | text | |
| `email` | text | |
| `signature` | text | Base64 drawn signature or typed name |
| `ipAddress` | text | |
| `signedAt` | timestamp | |

### Enum updates

- Add `CUSTOMER_DISCOVERY` to the existing `ReportType` enum.
- New enums: `CustomerInterviewGating` (`PUBLIC`, `PASSWORD`, `NDA`), `CustomerInterviewStatus` (`DRAFT`, `PUBLISHED`, `CLOSED`), `QuestionType` (`FREE_TEXT`, `SCALE`, `MULTIPLE_CHOICE`, `YES_NO`).

---

## AI Question Generation

### Trigger

User clicks "Customer Interview" from the draft project page (web) or "Talk to Customers" from the card result screen (mobile).

### Input — adapts to available context

- **Project description only** → broad discovery questions
- **After Spark card result** → questions informed by market signals from cardResult
- **After founder interview** → questions targeted at specific pain points and assumptions surfaced during the AI interview

### Output

8-12 questions, ordered in this flow:

1. **Context** (1-2) — role, responsibility, relevance screening
2. **Problem exploration** (2-3) — "Tell me about the last time..." style, probing specific pain points
3. **Current workaround** (1-2) — how they solve it today, what they've tried
4. **Pain severity & impact** (1-2) — frequency, cost in time/money, frustration level (SCALE type)
5. **Willingness to act** (1-2) — paid for solutions before, who decides, budget
6. **Commitment** (1) — interest in beta/early access (YES_NO type)

### Behavior

- Questions are fixed once published (no editing for MVP).
- "Regenerate" replaces all questions with a fresh set.
- Preview is shown before publishing.

---

## Shareable Link & Gating

### URL

`ideafuel.app/i/<uuid>` — public Next.js route, no auth required.

### Gating flows

- **PUBLIC** — Form loads immediately, no barrier.
- **PASSWORD** — Password prompt before the form. Password is bcrypt-hashed in the database. Founder sets password when publishing.
- **NDA** — Standard IdeaFuel NDA text displayed with fields for full name, email, and signature pad (draw or type). Signature + IP + timestamp stored for legal defensibility. On sign, NDA record is created and interviewee proceeds to the form.

### Form experience

1. Gating screen (if PASSWORD or NDA)
2. Welcome screen — interview title + brief context ("We're researching [topic] and would love your perspective. Takes ~5 minutes.")
3. Questions — one at a time, Typeform-style, progress bar at top
4. Contact capture — name, email (optional for PUBLIC, pre-filled from NDA for NDA gating)
5. Waitlist/newsletter opt-in checkboxes
6. Thank you screen — option to join waitlist and newsletter

### Link states

- `DRAFT` — link returns 404
- `PUBLISHED` — form is live
- `CLOSED` — link returns "this interview is closed" message

---

## Bot & Duplicate Protection

- **Duplicate prevention:** On form load, generate a `sessionToken` (UUID stored in cookie). Server checks for existing response with same `(customerInterviewId, sessionToken)` before accepting submission. If duplicate, redirect to thank you screen.
- **Cloudflare Turnstile** on form submission. Score below threshold rejects.
- **Honeypot field** — hidden input that bots fill but humans don't.
- **Minimum completion time** — if all questions answered in under 10 seconds, reject.

---

## Response Viewing & AI Synthesis

### Individual response view

- List of all responses sorted by most recent
- Each shows: respondent name/email (if provided), completion timestamp, answers question-by-question
- Filter by waitlist opt-in, newsletter opt-in
- Export to CSV

### AI synthesis — `CUSTOMER_DISCOVERY` report

**Trigger:** Manual, from project dashboard. Available once 3+ responses exist.

**Input:**
- All interview responses
- The questions themselves (for context)
- Existing research data if available (synthesized insights, pain points, competitors, positioning)

**Report sections:**
1. Response Overview — count, completion rate, respondent demographics
2. Pain Validation — which pain points were confirmed, denied, or newly discovered
3. Severity & Frequency — aggregated scale responses with distribution
4. Workaround Analysis — how people currently solve it, common tools/methods
5. Willingness to Pay — budget signals, decision-maker patterns
6. Key Quotes — verbatim answers that strongly support or challenge the thesis
7. Research Delta — what customer interviews revealed that desk research missed (if research exists)
8. Confidence Update — revised assessment of the opportunity
9. Recommended Next Steps — pivot, proceed, dig deeper on X

**PDF generation:** Same React-PDF pipeline used for business plans. Available from project dashboard (web) and mobile report viewer.

**Re-synthesis:** Founder can regenerate as more responses come in. Replaces previous report (no versioning for MVP).

---

## Flow & Integration

### Draft page is the hub

The draft project page is the foundational area for idea prep. All paths start here:

- **Spark** — Quick validation (no interview)
- **In-Depth Interview** — 15+ questions (AI with founder)
- **Light Interview** — 5 questions (AI with founder)
- **Customer Interview** — Shareable form for real customer feedback

These can be done in any order or combination. The Customer Interview option can also be triggered later from the project dashboard after research, but the primary UX pushes users through draft as the prep workspace.

### Web flow

1. Draft project page → "Customer Interview" card
2. AI generates questions from available context (project description, card result, founder interview data)
3. Preview questions → select gating (PUBLIC/PASSWORD/NDA) → Publish
4. Shareable link with copy button, response count visible on project page
5. View individual responses, generate standalone PDF report (3+ responses)
6. "Start Research" pulls in customer interview responses alongside all other signal

### Mobile flow

1. Quick Validate → Card Result screen
2. **"Talk to Customers"** button (new, alongside "Go Deeper" and "Refine")
3. AI generates questions from cardResult data
4. Preview → select gating → Publish
5. Share link via native share sheet
6. View response count, individual responses
7. Trigger AI synthesis / PDF report
8. "Go Deeper" passes cardResult + customer interview responses into research pipeline

### Research pipeline integration

- `startResearch` accepts an optional `customerInterviewId`
- During DEEP_RESEARCH and SYNTHESIS phases, customer responses are included in the AI context
- All downstream reports (pain points, positioning, competitive analysis, etc.) are informed by real customer signal

### Public form (respondent experience)

- `ideafuel.app/i/<uuid>` — web-only, opens in any browser
- No IdeaFuel account needed for respondents
- Mobile-responsive design
- Gating → Welcome → Questions (one at a time, progress bar) → Contact capture → Waitlist/newsletter → Thank you

---

## Out of Scope (MVP)

- Question editing after generation (regenerate only)
- Interview versioning (v2, v3)
- Duplicate detection beyond session cookie
- Branching/conditional question logic
- Multiple active customer interviews per project (one at a time; create a new one after closing the previous)
- Anonymous response option for NDA-gated interviews (name/email required)
- Real-time notification when responses come in
