---
title: "Break-Even Analysis"
description: "Use IdeaFuel's break-even analysis to find the month your startup becomes profitable and communicate runway needs to investors."
keywords: "startup break even analysis, break even point calculator, startup profitability timeline"
category: "financial-modeling"
og:title: "Break-Even Analysis in IdeaFuel"
og:description: "Find out when your startup turns profitable with IdeaFuel's automated break-even analysis and use it to plan funding and impress investors."
structured_data:
  type: "Article"
canonical: "/docs/user-guide/financial-modeling/break-even/"
---

# Break-Even Analysis

**Break-even analysis** determines the point at which your startup's total revenue equals its total costs — the month you stop losing money and start generating profit. IdeaFuel calculates this automatically from your financial model.

> "In a nutshell" — Your break-even month tells you how long you need to fund losses before the business sustains itself. It drives funding decisions, pricing strategy, and investor confidence.

## What Break-Even Tells You

The break-even point answers three critical questions:

- **How much runway do you need?** If break-even is month 18, you need at least 18 months of funding to survive.
- **Is your business model viable?** A break-even point beyond year 5 may signal that your cost structure or pricing needs rethinking.
- **How sensitive is profitability to your assumptions?** Small changes in price or churn can shift break-even by months. Use [scenarios](/docs/user-guide/financial-modeling/scenarios/) to test this.

## How IdeaFuel Calculates Break-Even

IdeaFuel analyzes your [P&L projections](/docs/user-guide/financial-modeling/statements/) month by month and identifies the first period where cumulative net income turns positive. The calculation accounts for:

- All revenue streams defined in your [pricing assumptions](/docs/user-guide/financial-modeling/assumptions/#pricing)
- Fixed and variable costs
- Customer acquisition and churn dynamics
- Funding inflows from investment rounds or loans

The result appears on your model dashboard as a highlighted month with a visual chart showing the crossover point.

## Fixed vs. Variable Costs

Understanding your cost structure is essential to interpreting break-even:

### Fixed Costs

Expenses that stay constant regardless of sales volume — rent, salaries, software subscriptions, insurance. These create a baseline that revenue must exceed every month.

### Variable Costs

Expenses that scale with revenue — cost of goods sold, transaction fees, shipping, sales commissions. Higher revenue brings higher variable costs, which means your break-even point depends on your **gross margin**, not just total revenue.

> **Tip:** Reducing fixed costs moves your break-even earlier. Improving gross margin (by lowering variable costs or raising prices) has the same effect. Test both approaches with [what-if analysis](/docs/user-guide/financial-modeling/scenarios/#running-what-if-analysis).

## Revenue Model Considerations

Your revenue model significantly affects when you break even:

- **Subscription (SaaS)** — Recurring revenue compounds over time, but high upfront acquisition costs can delay break-even. Watch your CAC payback period alongside break-even.
- **One-time sales (E-commerce, Retail)** — Each sale must individually contribute margin. Break-even depends heavily on volume and repeat purchase rates.
- **Project-based (Services, Freelancer)** — Revenue is lumpy. Break-even may fluctuate month to month. Focus on the trend rather than a single crossover point.
- **Marketplace** — Both supply and demand sides have acquisition costs. Break-even often comes later but scales faster once network effects kick in.

> **Note:** IdeaFuel's industry templates pre-configure the revenue model that best fits your business type. You can adjust it in the [assumptions editor](/docs/user-guide/financial-modeling/assumptions/).

## Using Break-Even in Investor Conversations

Investors will ask about your path to profitability. Here is how to present break-even effectively:

1. **Lead with the number.** "We reach break-even in month 14 under our base scenario."
2. **Show the range.** Present break-even across your [optimistic, base, and pessimistic scenarios](/docs/user-guide/financial-modeling/scenarios/) — for example, months 10, 14, and 22.
3. **Connect it to funding.** "We are raising 18 months of runway, which gives us a 4-month buffer beyond our base-case break-even."
4. **Explain the drivers.** Highlight the two or three assumptions (price, churn, acquisition cost) that most affect the timeline.

> **Tip:** Export your break-even chart as part of a [PDF report](/docs/user-guide/financial-modeling/exporting/) for a polished presentation, or share the interactive [Excel workbook](/docs/user-guide/financial-modeling/exporting/) so investors can explore the numbers themselves.

A credible break-even analysis signals that you understand your unit economics and have a realistic path to sustainability.
