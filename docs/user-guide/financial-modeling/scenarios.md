---
title: "Scenario Analysis"
description: "Create and compare financial scenarios in IdeaFuel to stress-test your startup model with optimistic, pessimistic, and custom what-if cases."
keywords: "financial scenario analysis tool, startup scenario planning, what-if analysis financial model"
category: "financial-modeling"
og:title: "Scenario Analysis in IdeaFuel"
og:description: "Compare optimistic, pessimistic, and custom what-if scenarios side by side to stress-test your startup financial model."
structured_data:
  type: "Article"
canonical: "/docs/user-guide/financial-modeling/scenarios/"
---

# Scenario Analysis

**Scenario analysis** lets you create alternative versions of your financial model by adjusting key assumptions, so you can see how different outcomes affect revenue, costs, and cash position without changing your original forecast.

> "In a nutshell" — Every model starts with a base scenario. Add optimistic, pessimistic, or custom what-if scenarios to explore the range of possible outcomes and prepare for investor questions.

## Why Scenarios Matter

No forecast is certain. Scenarios help you:

- **Bound your risk.** See the worst case so you know how much runway you need.
- **Quantify upside.** Show investors what happens if growth accelerates.
- **Test decisions.** Model the impact of hiring faster, raising prices, or entering a new market before you commit.

## Your Base Scenario

When you [create a model](/docs/user-guide/financial-modeling/creating-a-model/), IdeaFuel generates a **base scenario** from your current [assumptions](/docs/user-guide/financial-modeling/assumptions/). This is your best-estimate forecast. All other scenarios branch from it — they inherit the base assumptions and let you override specific values.

## Creating Scenarios

1. Open your model and go to the **Scenarios** tab.
2. Click **New Scenario**.
3. Choose a preset type or start from scratch:
   - **Optimistic** — Pre-adjusts growth rates up and churn rates down.
   - **Pessimistic** — Pre-adjusts growth rates down and costs up.
   - **Custom** — A blank slate where you override any assumptions you want.
4. Name your scenario (e.g., "Delayed Launch" or "Premium Pricing").
5. Edit the assumptions you want to change. Unchanged values stay linked to the base scenario.
6. Click **Save**. IdeaFuel recalculates all [financial statements](/docs/user-guide/financial-modeling/statements/) and [break-even](/docs/user-guide/financial-modeling/break-even/) for the new scenario.

> **Tip:** You can create unlimited scenarios on Pro and Enterprise plans. Free accounts include the base scenario only.

## Comparing Scenarios Side by Side

Open the **Compare** view to see two or more scenarios in a single table. IdeaFuel highlights the differences so you can spot the key drivers:

- Revenue and expense totals per period
- Break-even month for each scenario
- Cumulative cash position over time
- Percentage variance from the base case

Use the comparison chart to visualize how revenue and cash diverge across scenarios over your five-year horizon.

## Running What-If Analysis

What-if analysis is a lightweight way to test a single change without creating a full scenario:

1. On the model dashboard, click **What-If**.
2. Select an assumption (e.g., monthly churn rate).
3. Drag the slider or type a new value.
4. Watch the key metrics — revenue, cash, break-even — update in real time.

If you like the result, promote the what-if into a saved scenario with one click.

> **Note:** What-if changes are temporary. If you navigate away without saving, they revert to the base scenario values.

## When to Use Scenarios

| Situation | Recommended Scenarios |
|---|---|
| Investor pitch | Base + Optimistic + Pessimistic |
| Strategic planning | Base + 2-3 custom what-ifs |
| Pricing decision | Base + one scenario per price point |
| Hiring plan | Base + "Hire Fast" + "Lean Team" |

Investors expect to see at least three scenarios. Presenting a range demonstrates that you understand the uncertainty in your business and have thought through contingencies.

## Next Steps

- Review your [assumptions](/docs/user-guide/financial-modeling/assumptions/) to make sure your base scenario is solid before branching.
- Learn how scenarios appear in your [exported reports](/docs/user-guide/financial-modeling/exporting/) — Excel exports include scenario toggle sheets, and PDFs include AI-generated narrative comparisons.
