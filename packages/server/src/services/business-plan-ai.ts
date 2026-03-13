/**
 * Business Plan AI Generation Service
 *
 * Generates structured business plan prose from research data using Sonnet 4.5.
 * Returns a typed JSON object (not markdown) that the frontend renders with
 * charts and visual components.
 */

import Anthropic from '@anthropic-ai/sdk';

const SONNET_MODEL = 'claude-sonnet-4-5-20250929';

// ============================================================================
// TYPES
// ============================================================================

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
  financialProjections: {
    year1: { revenue: number; costs: number; profit: number };
    year2: { revenue: number; costs: number; profit: number };
    year3: { revenue: number; costs: number; profit: number };
    breakEvenMonth: number;
    assumptions: string[];
  };
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

IMPORTANT: Use REAL numbers for financial projections based on the market sizing, revenue potential, and business model data. Ground all financial estimates in the research data. The numbers must be plausible for a startup in this space.

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

  const parsed = JSON.parse(jsonText) as BusinessPlanProse;

  // Validate required fields
  if (!parsed.executiveSummary || !parsed.financialProjections) {
    throw new Error('Business plan response missing required fields');
  }

  return parsed;
}

// ============================================================================
// HELPERS
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

  return sections.join('\n\n');
}
