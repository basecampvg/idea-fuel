/**
 * Business Plan AI Generation Service
 *
 * Generates structured business plan prose from research data using Sonnet 4.5.
 * Returns a typed JSON object (not markdown) that the frontend renders with
 * charts and visual components.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { LoadedFinancialData } from './financial-model-loader';
import type { StatementData } from '@forge/shared';

const SONNET_MODEL = 'claude-sonnet-4-5-20250929';

// ============================================================================
// TYPES
// ============================================================================

export interface FinancialAssumption {
  key: string;
  name: string;
  value: number;
  unit: string | null;
  category: string;
  confidence: string;
}

export interface MonthlyPLDataPoint {
  period: string;
  revenue: number;
  costs: number;
  profit: number;
}

export interface FinancialProjections {
  // Always present (backward compatible)
  year1: { revenue: number; costs: number; profit: number };
  year2: { revenue: number; costs: number; profit: number };
  year3: { revenue: number; costs: number; profit: number };
  breakEvenMonth: number;
  assumptions: string[];

  // Present when model-backed (optional for backward compat)
  source?: 'model' | 'ai_estimate';
  modelId?: string;
  templateSlug?: string;
  richAssumptions?: FinancialAssumption[];
  monthlyPL?: MonthlyPLDataPoint[];
  breakEvenDetail?: {
    revenueModel: string;
    breakEvenPoint: number;
    breakEvenUnit: string;
    trajectory: Array<{
      month: number;
      revenue: number;
      totalCosts: number;
      profit: number;
      cumulativeProfit: number;
    }>;
  };
}

export interface BusinessPlanProse {
  executiveSummary: string;
  problemNarrative: string;
  solutionNarrative: string;
  marketNarrative: string;
  competitiveNarrative: string;
  businessModelNarrative: string;
  gtmStrategy: string;
  customerProfile: string;
  financialNarrative: string;
  financialProjections: FinancialProjections;
  productRoadmap: string;
  teamOperations: string;
  riskAnalysis: string;
  fundingRequirements: string;
  exitStrategy: string;
}

interface ResearchContext {
  ideaTitle: string;
  ideaDescription: string;
  rawResearchSummary: string;
  marketAnalysis: unknown;
  competitors: unknown;
  painPoints: unknown;
  positioning: unknown;
  whyNow: unknown;
  proofSignals: unknown;
  keywords: unknown;
  scores: {
    opportunity?: number | null;
    problem?: number | null;
    feasibility?: number | null;
    whyNow?: number | null;
  };
  scoreJustifications: unknown;
  metrics: {
    revenuePotential: unknown;
    executionDifficulty: unknown;
    gtmClarity: unknown;
    founderFit: unknown;
  };
  marketSizing: unknown;
  socialProof: unknown;
  userStory: unknown;
  valueLadder: unknown;
  techStack: unknown;
  financialModelData?: LoadedFinancialData | null;
}

// ============================================================================
// SUMMARIZATION
// ============================================================================

const RAW_REPORT_SUMMARIZE_THRESHOLD = 30_000; // chars

export async function summarizeRawResearch(rawReport: string): Promise<string> {
  if (rawReport.length <= RAW_REPORT_SUMMARIZE_THRESHOLD) {
    return rawReport;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const client = new Anthropic({ apiKey, timeout: 300_000 });

  try {
    const response = await client.messages.create({
      model: SONNET_MODEL,
      max_tokens: 8000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `You are a research analyst. Summarize the following deep research report into a comprehensive but concise briefing document. Preserve ALL key data points, statistics, market figures, competitor names, and specific findings. Do not lose any quantitative data or named entities. Target ~5000 words.

RESEARCH REPORT:
${rawReport}

Write your summary now:`,
      }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock?.text ?? rawReport.slice(0, RAW_REPORT_SUMMARIZE_THRESHOLD);
  } catch (error) {
    console.error('[BusinessPlan] Summarization failed, using truncated report:', error);
    return rawReport.slice(0, RAW_REPORT_SUMMARIZE_THRESHOLD);
  }
}

// ============================================================================
// GENERATION
// ============================================================================

export async function generateBusinessPlanProse(
  context: ResearchContext
): Promise<BusinessPlanProse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const client = new Anthropic({ apiKey, timeout: 600_000, maxRetries: 2 });

  const dataContext = buildDataContext(context);

  const systemPrompt = `You are a senior strategy consultant who has helped raise over $500M in venture funding. You write business plans that close deals. Every sentence must earn its place — if it doesn't move an investor closer to writing a check, cut it.

Your writing style:
- Lead with the number, not the narrative. "$4.2B TAM growing at 23% CAGR" beats "The market is large and growing."
- Use power language: "captures", "dominates", "exploits", "defensible", "asymmetric advantage"
- Frame everything as an opportunity with urgency — why NOW, why THIS team, why THIS approach wins
- Quantify everything possible. Vague claims destroy credibility.
- Write like a pitch deck narrative — punchy, confident, data-dense

You MUST respond with a valid JSON object matching the exact schema specified. No markdown, no extra text — only the JSON object.`;

  const userPrompt = `Using ALL of the research data provided below, generate a comprehensive, investor-ready business plan for the following business idea.

BUSINESS IDEA: ${context.ideaTitle}
DESCRIPTION: ${context.ideaDescription}

=== RESEARCH DATA ===
${dataContext}
=== END RESEARCH DATA ===

Respond with a JSON object matching this exact schema. Each narrative section should be 1-2 focused paragraphs — concise, data-rich, zero filler. Every paragraph must contain at least one specific number, metric, or data point. Write to persuade an investor scanning this in 5 minutes.

VISUAL FORMAT RULES: The frontend renders these as rich visual cards. To maximize visual impact:
- Use bullet points (with "- " prefix) liberally for lists, comparisons, and key takeaways
- Use "**bold**" markdown for key metrics, names, and emphasis
- Structure content so it reads well in short visual blocks, not walls of text
- Lead each section with the most important insight or number
- For sections with tables/charts already rendered by the UI (Problem, Market, Competitive, Business Model, Financial), keep prose shorter — the visuals carry the weight

{
  "executiveSummary": "1-2 punchy paragraphs: core value prop, target market size, revenue model, why this wins. Should stand alone as a pitch.",
  "problemNarrative": "1 paragraph + bullet points: articulate the problem with evidence from pain points and demand signals. Keep brief — a pain points table is shown alongside this.",
  "solutionNarrative": "1-2 paragraphs: how the solution addresses key pain points. Include the user story. Explain the unique approach with bullet points for features.",
  "marketNarrative": "1 paragraph + bullet points: market analysis, growth drivers, segments. Keep brief — TAM/SAM/SOM cards are shown alongside this.",
  "competitiveNarrative": "1 paragraph + bullet points: competitive positioning, defensible advantages. Keep brief — a competitor table is shown alongside this.",
  "businessModelNarrative": "1-2 paragraphs + bullet points: revenue model, pricing strategy, unit economics. A pricing tier table is shown alongside this.",
  "gtmStrategy": "1-2 paragraphs with bullet points: launch channels, acquisition strategy, first 90 days, key milestones. Use a numbered list for the phased approach.",
  "customerProfile": "1-2 paragraphs with bullet points: ideal customer segments, demographics, psychographics, buying behavior. Use bullet points for persona attributes.",
  "financialNarrative": "1 paragraph: brief commentary on projections and key assumptions. Keep short — a financial chart is shown alongside this.",
  "financialProjections": {
    "year1": { "revenue": <number in dollars>, "costs": <number>, "profit": <number (can be negative)> },
    "year2": { "revenue": <number>, "costs": <number>, "profit": <number> },
    "year3": { "revenue": <number>, "costs": <number>, "profit": <number> },
    "breakEvenMonth": <number 1-36>,
    "assumptions": ["assumption 1", "assumption 2", "assumption 3", "assumption 4", "assumption 5"]
  },
  "productRoadmap": "Use bullet points or numbered phases: MVP scope, 6-month milestones, 12-month vision. List concrete features per phase.",
  "teamOperations": "1 paragraph + bullet points: key roles needed, org structure, operational requirements. List critical hires.",
  "riskAnalysis": "Use bullet points: top 5 risks, each with severity and mitigation strategy. Format as '**Risk**: description — **Mitigation**: action'.",
  "fundingRequirements": "1 paragraph + bullet points: funding amount, use of funds breakdown, target milestones. Use a bulleted allocation list.",
  "exitStrategy": "1 paragraph + bullet points: potential exit paths, comparable exits, timeline, target acquirers or IPO scenario."
}

${context.financialModelData
    ? `CRITICAL: A computed financial model is included in the research data under "FINANCIAL MODEL (COMPUTED)". You MUST use the exact P&L numbers from that section for your financialProjections output. Aggregate the monthly (Y1-M1 through Y1-M12) and quarterly (Y2-Q1 through Y2-Q4) periods into annual totals. The break-even month comes directly from the model. For assumptions, extract the top 5 most impactful assumptions from the model data. Write the financialNarrative to reference these real computed figures.`
    : `IMPORTANT: Use REAL numbers for financial projections based on the market sizing, revenue potential, and business model data. Ground all financial estimates in the research data. The numbers must be plausible for a startup in this space.`}

Respond ONLY with the JSON object. No markdown code fences, no explanation.`;

  const response = await client.messages.create({
    model: SONNET_MODEL,
    max_tokens: 32000,
    temperature: 1.0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from model');
  }

  // Parse the JSON response — strip any markdown code fences if the model adds them
  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  let parsed: BusinessPlanProse;
  try {
    parsed = JSON.parse(jsonText) as BusinessPlanProse;
  } catch (err) {
    throw new Error(
      `Business plan model returned non-JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Validate required fields
  if (!parsed.executiveSummary || !parsed.financialProjections) {
    throw new Error('Business plan response missing required fields');
  }

  // Post-process: override AI projections with computed financial model data
  if (context.financialModelData) {
    const fd = context.financialModelData;
    const pl = fd.statements.pl;
    const annuals = aggregateAnnualTotals(pl, fd.forecastYears);

    parsed.financialProjections.year1 = annuals.year1;
    parsed.financialProjections.year2 = annuals.year2;
    parsed.financialProjections.year3 = annuals.year3;
    parsed.financialProjections.breakEvenMonth = fd.breakEven.breakEvenMonth;
    parsed.financialProjections.source = 'model';
    parsed.financialProjections.modelId = fd.modelId;
    parsed.financialProjections.templateSlug = fd.templateSlug;

    // Monthly P&L trajectory
    parsed.financialProjections.monthlyPL = pl.periods.map((period, i) => {
      const revenue = findLineValue(pl, 'revenue', i) ?? 0;
      const profit = findLineValue(pl, 'net_income', i) ?? 0;
      return { period, revenue, costs: revenue - profit, profit };
    });

    // Break-even detail
    parsed.financialProjections.breakEvenDetail = {
      revenueModel: fd.breakEven.revenueModel,
      breakEvenPoint: fd.breakEven.breakEvenPoint,
      breakEvenUnit: fd.breakEven.breakEvenUnit,
      trajectory: fd.breakEven.trajectory,
    };

    // Rich assumptions
    parsed.financialProjections.richAssumptions = fd.assumptionRows
      .filter((r) => r.numericValue != null)
      .map((r) => ({
        key: r.key,
        name: r.name,
        value: parseFloat(r.numericValue!),
        unit: r.unit,
        category: r.category,
        confidence: r.confidence,
      }));
  } else {
    parsed.financialProjections.source = 'ai_estimate';
  }

  return parsed;
}

// ============================================================================
// HELPERS — Annual aggregation from period-level P&L
// ============================================================================

function findLineValue(
  statement: StatementData,
  key: string,
  periodIdx: number,
): number | null {
  const line = statement.lines.find((l) => l.key === key);
  return line ? (line.values[periodIdx] ?? null) : null;
}

function aggregateAnnualTotals(
  pl: StatementData,
  forecastYears: number,
): {
  year1: { revenue: number; costs: number; profit: number };
  year2: { revenue: number; costs: number; profit: number };
  year3: { revenue: number; costs: number; profit: number };
} {
  const revValues = pl.lines.find((l) => l.key === 'revenue')?.values ?? [];
  const profitValues = pl.lines.find((l) => l.key === 'net_income')?.values ?? [];

  const sum = (arr: number[], start: number, end: number) =>
    arr.slice(start, end).reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);

  const y1Rev = Math.round(sum(revValues, 0, 12));
  const y1Profit = Math.round(sum(profitValues, 0, 12));

  const y2Rev = Math.round(sum(revValues, 12, 16));
  const y2Profit = Math.round(sum(profitValues, 12, 16));

  const y3Rev = forecastYears >= 3 ? Math.round(revValues[16] ?? 0) : 0;
  const y3Profit = forecastYears >= 3 ? Math.round(profitValues[16] ?? 0) : 0;

  return {
    year1: { revenue: y1Rev, costs: y1Rev - y1Profit, profit: y1Profit },
    year2: { revenue: y2Rev, costs: y2Rev - y2Profit, profit: y2Profit },
    year3: { revenue: y3Rev, costs: y3Rev - y3Profit, profit: y3Profit },
  };
}

// ============================================================================
// HELPERS — Data context builder
// ============================================================================

function buildDataContext(ctx: ResearchContext): string {
  const sections: string[] = [];

  if (ctx.rawResearchSummary) {
    sections.push(`## DEEP RESEARCH\n${ctx.rawResearchSummary}`);
  }
  if (ctx.marketAnalysis) {
    sections.push(`## SYNTHESIZED MARKET ANALYSIS\n${JSON.stringify(ctx.marketAnalysis, null, 2)}`);
  }
  if (ctx.competitors) {
    sections.push(`## COMPETITIVE LANDSCAPE\n${JSON.stringify(ctx.competitors, null, 2)}`);
  }
  if (ctx.painPoints) {
    sections.push(`## CUSTOMER PAIN POINTS\n${JSON.stringify(ctx.painPoints, null, 2)}`);
  }
  if (ctx.positioning) {
    sections.push(`## POSITIONING & VALUE PROPOSITION\n${JSON.stringify(ctx.positioning, null, 2)}`);
  }
  if (ctx.whyNow) {
    sections.push(`## WHY NOW / MARKET TIMING\n${JSON.stringify(ctx.whyNow, null, 2)}`);
  }
  if (ctx.proofSignals) {
    sections.push(`## PROOF SIGNALS & DEMAND INDICATORS\n${JSON.stringify(ctx.proofSignals, null, 2)}`);
  }
  if (ctx.scores.opportunity != null) {
    sections.push(`## SCORES\n${JSON.stringify(ctx.scores, null, 2)}`);
  }
  if (ctx.scoreJustifications) {
    sections.push(`## SCORE JUSTIFICATIONS\n${JSON.stringify(ctx.scoreJustifications, null, 2)}`);
  }
  if (ctx.metrics.revenuePotential) {
    sections.push(`## BUSINESS METRICS\n${JSON.stringify(ctx.metrics, null, 2)}`);
  }
  if (ctx.marketSizing) {
    sections.push(`## MARKET SIZING (TAM/SAM/SOM)\n${JSON.stringify(ctx.marketSizing, null, 2)}`);
  }
  if (ctx.socialProof) {
    sections.push(`## SOCIAL PROOF & DEMAND VALIDATION\n${JSON.stringify(ctx.socialProof, null, 2)}`);
  }
  if (ctx.userStory) {
    sections.push(`## USER STORY\n${JSON.stringify(ctx.userStory, null, 2)}`);
  }
  if (ctx.valueLadder) {
    sections.push(`## VALUE LADDER / PRICING TIERS\n${JSON.stringify(ctx.valueLadder, null, 2)}`);
  }
  if (ctx.techStack) {
    sections.push(`## TECH STACK RECOMMENDATIONS\n${JSON.stringify(ctx.techStack, null, 2)}`);
  }

  if (ctx.financialModelData) {
    const fd = ctx.financialModelData;
    const pl = fd.statements.pl;

    // Summarize P&L subtotals/totals for the AI (saves tokens)
    const plSummary = pl.lines
      .filter((l) => l.isSubtotal || l.isTotal)
      .map((l) => ({ key: l.key, name: l.name, values: l.values }));

    // Group assumptions by category (cap at 20 to manage token budget)
    const assumptionsByCategory: Record<
      string,
      Array<{ name: string; value: number; unit: string | null; confidence: string }>
    > = {};
    for (const row of fd.assumptionRows) {
      const numVal = row.numericValue ? parseFloat(row.numericValue) : NaN;
      if (isNaN(numVal)) continue;
      if (!assumptionsByCategory[row.category]) assumptionsByCategory[row.category] = [];
      assumptionsByCategory[row.category].push({
        name: row.name,
        value: numVal,
        unit: row.unit,
        confidence: row.confidence,
      });
    }
    let totalSent = 0;
    const cappedAssumptions: typeof assumptionsByCategory = {};
    for (const [cat, items] of Object.entries(assumptionsByCategory)) {
      if (totalSent >= 20) break;
      const toTake = items.slice(0, 20 - totalSent);
      cappedAssumptions[cat] = toTake;
      totalSent += toTake.length;
    }

    sections.push(`## FINANCIAL MODEL (COMPUTED — USE THESE NUMBERS)
Template: ${fd.templateSlug}
Forecast Years: ${fd.forecastYears}
Revenue Model: ${fd.breakEven.revenueModel}
Break-Even Month: ${fd.breakEven.breakEvenMonth === -1 ? 'Not reached in 60 months' : fd.breakEven.breakEvenMonth}
Break-Even Point: ${fd.breakEven.breakEvenPoint} ${fd.breakEven.breakEvenUnit}

### P&L Summary (periods: ${pl.periods.join(', ')})
${JSON.stringify(plSummary, null, 2)}

### Key Assumptions by Category
${JSON.stringify(cappedAssumptions, null, 2)}

IMPORTANT: The financial projections above are computed from a validated financial model. Use these EXACT numbers for the financialProjections JSON output. Aggregate monthly/quarterly periods into annual totals for year1/year2/year3.`);
  }

  return sections.join('\n\n');
}
