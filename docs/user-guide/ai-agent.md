---
title: "AI Agent"
description: "Your per-project AI business idea assistant. Ask research questions, refine your idea, clarify reports, and brainstorm — all grounded in your actual project data."
keywords: "AI business idea assistant, AI research assistant, business idea chatbot, idea validation AI"
category: "AI Agent"
og:title: "AI Agent — Your Context-Aware Business Assistant | IdeaFuel"
og:description: "Chat with an AI that knows your research, reports, financials, and interviews. Get answers grounded in your project data, not generic advice."
structured_data:
  type: "SoftwareApplication"
canonical: "/docs/user-guide/ai-agent"
---

# AI Agent

**The AI Agent** is a per-project conversational assistant that has full context on your research, reports, interviews, and financial data. Unlike generic AI chatbots, every answer it gives is grounded in the specific data IdeaFuel has gathered and generated for your project.

> Think of the AI Agent as a co-founder who has read every report, studied every interview transcript, and memorized your financial model — and is always available to talk through your next move.

## What you can ask

The AI Agent handles five broad categories of questions. You can mix and match freely within a single conversation.

### Research questions

Ask about your target market, customer segments, regulatory landscape, or anything else the research phase uncovered. The agent pulls from your completed research and interview data to give answers specific to your idea.

### Report clarifications

Confused by a finding in your SPARK, LIGHT, or IN_DEPTH report? Ask the agent to explain it, provide additional context, or break down the methodology behind a specific score or recommendation.

### Idea refinement

Use the agent to pressure-test your positioning, explore pivots, or narrow your target audience. It can suggest adjustments based on the competitive landscape and market data in your project.

### Market questions

Ask about market size, growth trends, customer willingness to pay, or competitive dynamics. The agent synthesizes data from your reports and research to give grounded estimates rather than guesses.

### Brainstorming

Need feature ideas, pricing strategies, go-to-market angles, or partnership opportunities? The agent draws on your project data to suggest options that fit your specific market and business model.

## How it works

The AI Agent uses retrieval-augmented generation (RAG) over all of your project data. Here is what that means in practice:

1. **Your question goes in.** You type a question or prompt in the agent chat panel within your project.
2. **Relevant context gets retrieved.** The system searches across your research results, interview transcripts, generated reports, and financial model data to find the most relevant pieces of information.
3. **The AI generates a grounded answer.** The language model produces a response that references and builds on your actual project data — not generic internet knowledge.
4. **Sources are cited.** When the agent references specific data, it tells you where that data came from (e.g., "According to your LIGHT report's competitive analysis..." or "Based on your interview responses about pricing...").

> **Note:** The agent only has access to data within the current project. It cannot see other projects in your account or data from other users.

## Example conversations

Here are five prompts that show what the agent can do, along with the type of output you can expect.

### Prompt 1: Market sizing

> "Based on my research, what's the estimated total addressable market for this idea, and what assumptions drive that number?"

**Expected output:** A dollar figure or range with a breakdown of the assumptions (target customer count, average revenue per customer, geographic scope) drawn from your research and reports.

### Prompt 2: Competitive positioning

> "How does my idea differentiate from the top 3 competitors identified in my LIGHT report?"

**Expected output:** A comparison table or narrative highlighting where your concept has advantages, where competitors are stronger, and where the market has gaps you could fill.

### Prompt 3: Financial sanity check

> "My financial model assumes 5% monthly churn. Is that realistic based on what my research says about this market?"

**Expected output:** An assessment of your churn assumption against industry benchmarks and any relevant data from your research, with a suggested range if the current number seems off.

### Prompt 4: Go-to-market brainstorm

> "Suggest 3 go-to-market strategies I haven't considered, based on my target audience and competitive landscape."

**Expected output:** Three concrete strategies with reasoning tied to your specific customer segments, competitive gaps, and business model.

### Prompt 5: Risk identification

> "What are the biggest risks to this business that my reports haven't fully addressed?"

**Expected output:** A prioritized list of risks (regulatory, market timing, execution, funding) with brief explanations of why each matters for your specific idea.

## Tips for better results

Follow these guidelines to get the most useful answers from the AI Agent.

### Be specific

Instead of "Tell me about my market," try "What's the average customer acquisition cost for businesses targeting the same segment as mine?" Specific questions produce specific, actionable answers.

### Reference report sections

Point the agent to particular sections of your reports. "In the competitive landscape section of my IN_DEPTH report, you mention a gap in enterprise pricing — can you elaborate on how I could exploit that?" gives the agent a clear anchor point.

### Ask follow-ups

The agent remembers the full conversation within a session. Build on previous answers: "You mentioned three customer segments — which one has the highest willingness to pay based on my interview data?"

### Challenge assumptions

Push back on the agent's answers. "That churn estimate seems low — what would happen to my unit economics if churn were 2x higher?" The agent will recalculate and adjust its reasoning.

### Keep questions within scope

The agent excels when questions relate to your project data. Asking "What's the GDP of France?" will get a generic answer. Asking "How does the European market opportunity compare to the US for my idea?" will get a data-grounded one.

## Saving insights

When the AI Agent surfaces a useful insight, you can save it directly to your reports. Click the **Save to Report** button on any agent response to attach that insight as a note on the relevant report section. Saved insights appear in your reports with an "AI Agent" badge so you can distinguish them from the original generated content.

> **Tip:** Save important insights as you go rather than at the end of a long conversation. It is easier to capture context in the moment.

## Availability

> **Pro Feature:** The AI Agent is available to PRO ($29/mo) and ENTERPRISE ($99/mo) subscribers. FREE plan users can see the agent panel but cannot send messages. PRO subscribers get enhanced AI quality, while ENTERPRISE subscribers get premium AI with the highest-quality responses.

## Related docs

- [Reports](/docs/user-guide/reports/) — Understand the reports the agent draws from
- [Financial Modeling](/docs/user-guide/financial-modeling/) — Learn about the financial data the agent can reference
- [Interview Modes](/docs/user-guide/interview-modes) — How interviews feed into the agent's knowledge base
- [Business Plan PDF](/docs/user-guide/business-plan-pdf) — Generate a full business plan after refining your idea with the agent
