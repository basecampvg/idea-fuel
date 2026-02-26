/**
 * Financial Narrator Service
 *
 * Uses Claude to generate narrative sections for financial model exports.
 * Adapts tone based on purpose (investor pitch, loan application, internal planning).
 *
 * Follows existing retry pattern from the Anthropic provider.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ComputedStatements, StatementData } from '@forge/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExportPurpose = 'investor' | 'loan' | 'internal';

export interface NarrativeInput {
  modelName: string;
  scenarioName: string;
  forecastYears: number;
  statements: ComputedStatements;
  assumptions: Array<{
    key: string;
    name: string;
    value: string | null;
    category: string;
    valueType: string;
  }>;
  purpose: ExportPurpose;
  breakEven?: {
    breakEvenPoint: number;
    breakEvenMonth: number | null;
    cumulativePL36: number;
  } | null;
}

export interface NarrativeOutput {
  executiveSummary: string;
  revenueAnalysis: string;
  costAnalysis: string;
  cashPosition: string;
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

const TONE_MAP: Record<ExportPurpose, string> = {
  investor: 'Confident, forward-looking, emphasizing growth potential and market opportunity. Use investor-friendly language (runway, burn rate, unit economics, TAM).',
  loan: 'Conservative, data-driven, emphasizing stability, cash flow coverage, and debt service capacity. Use lending terminology (DSCR, collateral, working capital).',
  internal: 'Balanced, analytical, highlighting key assumptions and risks alongside opportunities. Use clear business language.',
};

function buildPrompt(input: NarrativeInput): string {
  const { statements, assumptions, purpose, modelName, forecastYears, breakEven } = input;

  // Summarize key financial data
  const pl = statements.pl;
  const cf = statements.cf;
  const lastIdx = pl.periods.length - 1;
  const revLine = pl.lines.find((l) => l.key === 'total_revenue' || l.key === 'revenue');
  const niLine = pl.lines.find((l) => l.key === 'net_income');
  const cashLine = cf.lines.find((l) => l.key === 'ending_cash');

  const y1Revenue = revLine?.values.slice(0, 12).reduce((s, v) => s + v, 0) ?? 0;
  const totalRevenue = revLine?.values.reduce((s, v) => s + v, 0) ?? 0;
  const finalNI = niLine?.values[lastIdx] ?? 0;
  const finalCash = cashLine?.values[lastIdx] ?? 0;

  // Top assumptions
  const topAssumptions = assumptions
    .slice(0, 15)
    .map((a) => `  - ${a.name}: ${a.value ?? 'N/A'} (${a.valueType})`)
    .join('\n');

  return `You are a financial analyst writing narrative sections for a ${forecastYears}-year financial model called "${modelName}".

PURPOSE: ${purpose === 'investor' ? 'Investor Presentation' : purpose === 'loan' ? 'Loan Application' : 'Internal Planning'}
TONE: ${TONE_MAP[purpose]}

KEY FINANCIAL DATA:
- Year 1 Revenue: $${Math.round(y1Revenue).toLocaleString()}
- Total ${forecastYears}-Year Revenue: $${Math.round(totalRevenue).toLocaleString()}
- Final Period Net Income: $${Math.round(finalNI).toLocaleString()}
- Ending Cash Balance: $${Math.round(finalCash).toLocaleString()}
${breakEven ? `- Break-Even: ${breakEven.breakEvenMonth !== null ? `Month ${breakEven.breakEvenMonth}` : 'Not achieved in 36 months'}` : ''}
${breakEven ? `- 36-Month Cumulative P&L: $${Math.round(breakEven.cumulativePL36).toLocaleString()}` : ''}

KEY ASSUMPTIONS:
${topAssumptions}

Generate exactly 4 narrative sections in JSON format:
{
  "executiveSummary": "2-3 paragraphs summarizing the financial story, key metrics, and outlook.",
  "revenueAnalysis": "1-2 paragraphs explaining revenue drivers, growth trajectory, and assumptions.",
  "costAnalysis": "1-2 paragraphs breaking down cost structure and efficiency metrics.",
  "cashPosition": "1-2 paragraphs explaining burn rate, runway, funding needs, and cash outlook."
}

RULES:
- Use specific numbers from the data, not vague language.
- Do not invent metrics not provided.
- Keep each section concise (100-200 words each).
- Return ONLY the JSON object, no markdown fences.`;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    _client = new Anthropic({ apiKey, timeout: 120000, maxRetries: 2 });
  }
  return _client;
}

/**
 * Generate narrative sections for a financial model export.
 * Returns structured narratives or a fallback set if AI is unavailable.
 */
export async function generateNarratives(input: NarrativeInput): Promise<NarrativeOutput> {
  const prompt = buildPrompt(input);

  try {
    const client = getClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse JSON response
    const parsed = JSON.parse(text) as NarrativeOutput;

    // Validate all fields exist
    if (!parsed.executiveSummary || !parsed.revenueAnalysis || !parsed.costAnalysis || !parsed.cashPosition) {
      throw new Error('Missing required narrative sections');
    }

    return parsed;
  } catch (error) {
    console.warn('[financial-narrator] AI narrative generation failed, using fallback:', error);
    return buildFallbackNarratives(input);
  }
}

/**
 * Fallback narratives when AI is unavailable.
 */
function buildFallbackNarratives(input: NarrativeInput): NarrativeOutput {
  const { modelName, forecastYears, statements } = input;
  const revLine = statements.pl.lines.find((l) => l.key === 'total_revenue' || l.key === 'revenue');
  const totalRev = revLine?.values.reduce((s, v) => s + v, 0) ?? 0;

  return {
    executiveSummary: `${modelName} projects ${forecastYears} years of financial performance. The model projects cumulative revenue of $${Math.round(totalRev).toLocaleString()} over the forecast period. Detailed assumptions and line-item breakdowns are provided in the following sections.`,
    revenueAnalysis: `Revenue projections are based on the assumptions outlined in this model. See the Income Statement for period-by-period detail.`,
    costAnalysis: `Cost structure and operating expenses are detailed in the Income Statement. Key cost drivers are documented in the Assumptions section.`,
    cashPosition: `Cash flow projections incorporate operating, investing, and financing activities. See the Cash Flow Statement for detailed period-by-period analysis.`,
  };
}
