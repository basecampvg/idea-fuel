# Idea Development Questions — Research Synthesis

**Date:** 2026-05-02
**Purpose:** Ground-truth research used to design the cluster Questions feature. AI-generated question templates pull from these frameworks rather than being invented from scratch.

## Key Sources

- **Rob Fitzpatrick, *The Mom Test*** — "Talk about their life, not your idea." Heuristic for distinguishing real-information questions from hypothetical-opinion questions.
- **Steve Blank, Customer Development** — Separates problem-validation from solution-validation; "get out of the building."
- **Clayton Christensen, Jobs to be Done** — "What job is this person hiring the product to do?" Best questions: "What were you doing right before?" and "What did you try that didn't work?"
- **Paul Graham, "How to Get Startup Ideas"** — "Live in the future, then build what's missing." Key test: "Why hasn't this been done already?"
- **Toyota 5 Whys** — Recursive depth-drilling for problem causation.
- **IDEO "How Might We"** — Tim Brown: "*how* assumes there are solutions, *might* gives permission to fail, *we* makes it collaborative."
- **De Bono, Six Thinking Hats** — Parallel-thinking modes for structural variety.
- **SCAMPER** — Substitute/Combine/Adapt/Modify/Put-to-other-uses/Eliminate/Reverse.
- **Charles Eames** — "What are the boundaries? What is the discipline?" (constraint-finding).
- **Pixar Braintrust (Catmull, *Creativity, Inc.*)** — Diagnostic, not prescriptive. "The Braintrust has no authority."
- **J.P. Guilford** — Divergent (early) vs convergent (late) thinking.
- **Graham Wallas** — Preparation, incubation, illumination, verification stages.

## Question Categories

### Problem-Deepening
Anchor in past behavior, not future intention.
- "When was the last time this happened to you? What did you do?" (Mom Test)
- "Why does this problem exist? What's underneath it?" (5 Whys)
- "Who is hurt most by this, and who barely notices?"
- "What's the workaround people use today? Why isn't it good enough?"
- "Is this a vitamin or a painkiller? How do you know?"

### Audience-Sharpening
A good audience answer names a person, a context, and a moment, not a demographic.
- "Describe the last specific person you saw struggling with this. What were they doing right before?" (JTBD)
- "Who has this problem so badly they're already paying to solve it badly?"
- "If only 100 people in the world could use this, who would they be?"
- "Who would be furious if this disappeared tomorrow?"
- "Who explicitly does *not* have this problem? Why not?"

### Solution-Shaping (without leading)
Don't propose a solution; propose a constraint that makes the solution obvious.
- "What would have to be true for the simplest version of this to work?"
- "What's the smallest version of this that would still be useful to one real person?"
- "What does the user *not* want this to do?"
- "If you couldn't build software, how would you solve this?"
- SCAMPER: "What could you eliminate from existing solutions and still have something valuable?"

### Differentiation / "Why Now?"
A real differentiation answer points to a specific shift (tech, regulation, behavior, cost curve), not a feature list.
- "Why hasn't this been solved already? What changed?"
- "What do you believe about this that smart people would disagree with?" (Thiel)
- "Who has tried this and failed? What did they get wrong?"
- "What unfair advantage do you have here that others don't?"
- "Why now and not five years ago or five years from now?"

### Validation / Cheap Tests
A good validation question proposes a test with a binary outcome and a short timeline.
- "What would have to be true for this to be a huge business?"
- "What's the cheapest experiment that could kill this idea this week?"
- "What evidence would change your mind?" (Popper)
- "If you charged for this tomorrow, who would pay and how much?"
- "What would a skeptic ask first?"

### Contradiction-Surfacing
Don't force resolution; ask the user to decide if the contradiction is real or apparent.
- "You said X earlier and Y now. Which is more true, or are these the same thing seen differently?"
- "If both are true, what's the higher-level idea that contains both?"
- "Which assumption are you most attached to that you have the least evidence for?"

### Constraint-Finding
Good constraints clarify; they don't just complain.
- "What is the boundary of this problem? What is *not* part of it?" (Eames)
- "What's the tightest constraint right now: time, money, audience access, technical feasibility, or your own conviction?"
- "If you had to ship this in two weeks with no money, what would you cut?"

## Good Question Heuristic

A question is **high-quality** if it:
- Asks about the past, not the future ("When did you last…" beats "Would you ever…")
- Is concrete, not hypothetical
- Is open, not closed (cannot be answered with yes/no)
- Doesn't contain its own answer (no "Wouldn't it be great if…")
- Forces a story or a number, not an opinion
- Targets one thing (no compound questions)
- Is answerable from lived experience

A question is **low-quality** if it:
- Begins with "Don't you think…" or "Wouldn't…" (leading)
- Asks the user to predict their own future behavior
- Is a disguised pitch
- Is so abstract it gets a generic answer
- Has been asked already in the same session in different form

Fitzpatrick's gut check: *"Compliments and fluff are the two most dangerous types of bad data."* If a question is likely to elicit either, rewrite it.

## Canonical Templates by Dimension × Stage

Templates use `{cluster_summary}` and `{thought_excerpt}` as injection points. Stage detection: **early** = <5 thoughts, **forming** = 5-15 thoughts mixed types, **ready** = readinessScore ≥ 0.7.

### problemStatement
- *Early:* "When was the last time you ran into this yourself? What were you actually doing?"
- *Early:* "Who else have you watched struggle with this in a specific moment?"
- *Forming:* "Why does this problem exist in the first place? What's underneath it?"
- *Forming:* "Is this a daily papercut or a once-a-year crisis?"
- *Ready:* "If you described this problem to someone who has it, in their words not yours, what would you say?"

### targetAudience
- *Early:* "Picture one specific person who has this problem. What were they doing right before they hit it?"
- *Early:* "Who already pays money to solve this badly?"
- *Forming:* "If only 100 people in the world could use what you build, who would they be?"
- *Forming:* "Who would notice within a week if this disappeared?"
- *Ready:* "Can you name a real person who fits this audience and you could show this to next week?"

### proposedSolution
- *Early:* "If you couldn't write any code, how would you solve this for one person manually?"
- *Early:* "What does the simplest possible version look like?"
- *Forming:* "What could you eliminate from existing solutions and still have something valuable?" (SCAMPER)
- *Forming:* "What does the user notice in the first 30 seconds?"
- *Ready:* "What's the one core action this product enables? If a user does only that, are they better off?"

### uniqueAngle
- *Early:* "What do you believe about this space that smart people would disagree with?" (Thiel)
- *Early:* "Why hasn't this been solved already? What changed recently?"
- *Forming:* "What unfair advantage do you have here? Knowledge, access, taste, obsession?"
- *Forming:* "What's the obvious version of this idea, and what's the non-obvious version?"
- *Ready:* "If a competitor copied your features tomorrow, what would still be true about you that they couldn't copy?"

### pricingHypothesis
- *Early:* "What do these people already pay for that's adjacent to this?"
- *Early:* "Is the value measured in time saved, money made, money saved, or something else?"
- *Forming:* "If this saved someone an hour a week, what's that worth to them in dollars?"
- *Forming:* "Would they pay monthly, per use, or once?"
- *Ready:* "If you charged $X tomorrow, who would say yes, and what's X?"

### Cross-cutting (any dimension)
- *Contradiction:* "Earlier you wrote: \"{thought_a}\". Now: \"{thought_b}\". Same thing seen differently, or in tension?"
- *Constraint:* "What's the tightest constraint here right now: audience access, conviction, feasibility, or money?"
- *Validation:* "What's the cheapest test you could run this week that would tell you you're wrong?"

## When NOT to Ask a Question

- **Cluster too sparse (<3 thoughts)** — feels like an interrogation; offer a capture-prompt instead
- **User just resolved a tension** — let it breathe; Wallas's *illumination* needs space
- **Same dimension was just questioned** — rotate dimensions
- **User is in flow** (3+ thoughts in 5 min) — wait for 60s+ pause
- **Dimension is intentionally empty** — meta-question ("Is this a gap?") beats fill-the-gap
- **Cluster is too contradictory** — surface the contradiction first
- **User dismissed last question** — lower frequency for this cluster
- **User wrote a question themselves** — let them sit with it, or reframe (IDEO "How Might We")
- **Late-stage ready cluster** — match Guilford's mode: convergent, not divergent. Best move may be "you have enough to crystallize" not another question.

## Self-Check Validator

Every AI-generated question should pass:

> "Is this question (a) about past behavior, (b) open-ended, (c) non-leading, (d) answerable from lived experience? If no to any, rewrite."

Cheap to run, catches most failure modes.
