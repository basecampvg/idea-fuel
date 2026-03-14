/**
 * Positioning Report AI Generation Service
 *
 * Generates a thorough positioning strategy report using a rigorous 5-component
 * sequential methodology: competitive alternatives → unique attributes →
 * value themes → target customers → market category.
 *
 * Returns a typed JSON object that the frontend renders with rich sections
 * and the PDF template renders as a multi-page report.
 */

import Anthropic from '@anthropic-ai/sdk';

const SONNET_MODEL = 'claude-sonnet-4-5-20250929';

// ============================================================================
// TYPES
// ============================================================================

export interface PositioningContext {
  ideaTitle: string;
  ideaDescription: string;
  rawResearchSummary: string;
  positioning: unknown;
  competitors: unknown;
  painPoints: unknown;
  marketAnalysis: unknown;
  whyNow: unknown;
  proofSignals: unknown;
}

export interface ValuePillar {
  theme: string;
  attributes: string[];
  customerBenefit: string;
  proof: string;
}

export interface CustomerPersona {
  name: string;
  role: string;
  demographics: string;
  psychographics: string;
  painPoints: string[];
  goals: string[];
  buyingTriggers: string[];
  dayInTheLife: string;
}

export interface MessagingFramework {
  headline: string;
  subheadline: string;
  elevatorPitch: string;
  objectionHandlers: Array<{ objection: string; response: string }>;
}

export interface ChannelMessage {
  channel: string;
  headline: string;
  subheadline: string;
  cta: string;
  rationale: string;
}

export interface PositioningReport {
  // Strategic Foundation (5-component analysis)
  competitiveAlternatives: string;
  uniqueAttributes: string;
  valuePillars: ValuePillar[];

  // Target Customer
  targetAudience: string;
  customerPersona: CustomerPersona;

  // Market Category & Positioning
  marketCategory: string;
  positioningStatement: string;
  competitivePositioning: string;

  // Messaging Framework
  tagline: string;
  keyMessages: string[];
  messagingFramework: MessagingFramework;

  // Brand Expression
  brandVoice: string;
  brandPersonality: string[];

  // Trend Layer
  trendLayer: string;

  // PRO tier
  visualStyle?: string;
  toneGuidelines?: string[];
  brandColors?: string[];

  // FULL tier
  channelMessaging?: ChannelMessage[];
}

// ============================================================================
// GENERATION
// ============================================================================

export async function generatePositioningReport(
  context: PositioningContext,
  tier: 'BASIC' | 'PRO' | 'FULL'
): Promise<PositioningReport> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const client = new Anthropic({ apiKey, timeout: 300_000, maxRetries: 2 });

  const dataContext = buildPositioningContext(context);

  const systemPrompt = `You are a positioning strategist who has helped hundreds of companies — from early-stage startups to growth-stage scale-ups — find their winning market position. You follow a rigorous, evidence-based positioning methodology that builds each component sequentially. Each step depends on the previous one.

METHODOLOGY — work through these 5 components IN ORDER:

1. COMPETITIVE ALTERNATIVES
   The foundation of all positioning. Ask: "What would the best-fit customers for this product do if it didn't exist?"
   Go far beyond direct competitors. Real competitive alternatives include:
   - Manual processes, spreadsheets, cobbled-together tool stacks
   - Hiring someone (intern, contractor, full-time employee)
   - Using a product from a completely different category
   - Building a custom internal solution
   - Doing nothing / living with the pain / status quo
   These are what customers ACTUALLY compare against when evaluating. A startup's biggest competitor is often Excel or "hire an intern," not another SaaS product.
   Ground every alternative in evidence from the research data — competitor weaknesses, pain point gaps, forum complaints, current workarounds.

2. UNIQUE ATTRIBUTES
   What does this product have or do that NONE of the competitive alternatives identified in Step 1 have?
   Include: features, capabilities, delivery model, business model, IP, proprietary data, expertise, community, speed advantages, cost structure advantages.
   Be ruthlessly honest — only truly unique attributes count. If a competitor also has it, it's not unique. Every attribute must have proof or a clear basis in the research data.
   List ALL unique attributes without judging them yet — even seemingly small ones can map to significant value.

3. VALUE THEMES
   Translate each unique attribute into a customer outcome using this chain:
   Unique Attribute → Customer Benefit → Measurable Value
   Then group related benefits into 2-4 "value clusters" or themes. Each theme should have:
   - A clear name that resonates with buyers
   - The specific attributes that drive it
   - The outcome the customer experiences (in their language, not yours)
   - Evidence from the research (demand signals, pain point severity, willingness-to-pay clues)
   Customers buy outcomes, not features. A feature that "saves 3 hours per week" is a benefit. "Reclaim your Mondays to focus on strategy instead of data entry" is a value theme.

4. TARGET CUSTOMER SEGMENTS
   Who cares MOST about the specific value themes from Step 3? These are best-fit customers — they:
   - Experience the problem acutely and frequently
   - Have tried and been frustrated by the competitive alternatives
   - Would buy quickly once they understand the value
   - Would become evangelists and refer others
   - Experience instant comprehension of the product's purpose
   Describe them by their characteristics, context, and triggers — not by broad demographics.
   This is NOT "everyone who could use it." Casting too wide a net makes every differentiator seem weak.
   The goal is to identify the customers for whom your unique value is a must-have, not a nice-to-have.

5. MARKET CATEGORY
   The frame of reference you choose triggers instant assumptions in the buyer's mind about: who your competitors are, what features you should have, what you should cost, and who the product is for. Choose the category that makes YOUR unique value immediately obvious.

   Three positioning styles — pick ONE and justify it:
   a) Head-to-Head: Compete directly in an existing, well-understood category.
      Only works if you can demonstrably outperform the leader on the dimension the market cares about most. Requires significant resources. Best when your differentiators are clear within the existing category.
   b) Big Fish, Small Pond: Dominate a specific sub-segment of an existing category.
      Pick a niche where your unique strengths are their must-have requirements. Lets you leverage existing category understanding while carving out a defensible position. Often the best choice for startups. You can expand later.
   c) Create a New Category: Define a new market space entirely.
      Only use when existing categories trigger WRONG assumptions about your product — when being placed in any existing category would confuse buyers more than it helps. Carries the heavy burden of educating the market about what the category even IS before you can sell. Most companies underestimate this cost.

   Default to an existing category (a or b) unless there is a compelling reason not to. The educational cost of category creation is enormous.

TREND LAYER: Identify a market trend that reinforces the positioning and adds urgency for the target customer. The trend should make the positioning feel timely and inevitable. But NEVER let the trend define or replace the positioning — it amplifies, not replaces. Establish the category first, then layer the trend on top.

KEY PRINCIPLES:
- Positioning is CONTEXT — like the opening scene of a movie. It sets expectations before the customer engages with product details. Good positioning triggers assumptions that are TRUE. Bad positioning creates constant misunderstandings.
- Market categories are powerful shortcuts for how customers group solutions. Choosing the right one reduces marketing burden by leveraging existing mental models. Choosing the wrong one means fighting misaligned expectations forever.
- "What would customers do without you?" is fundamentally different from "Who are your competitors?" The former reveals the real decision context.
- Target best-fit customers who get MAXIMUM value, not the broadest possible audience. A feature that creates problems in one context delivers tremendous value in another.
- Positioning is NOT messaging. It is the strategic foundation that messaging, taglines, sales pitches, website copy, and content strategy flow FROM. Get positioning right first; messaging follows naturally.
- Every claim needs evidence. Use specific data, named competitors, real findings from the research. No hand-waving.

WRITING STYLE:
- Lead with the strategic insight, not the obvious observation
- Use specific data points, named competitors, real evidence from the research
- Write narratives that a founder could hand directly to their marketing team and start executing
- Be direct and opinionated — take a clear position on the best strategy and defend it
- No filler, no hedging, no "it depends" — make definitive recommendations with reasoning
- Use **bold** markdown for key terms, names, and metrics
- Use bullet points (- prefix) for lists and structured analysis
- Every narrative section should be 2-3 substantial paragraphs with specific evidence

You MUST respond with a valid JSON object matching the exact schema specified. No markdown code fences, no extra text — only the JSON object.`;

  const tierInstructions = buildTierInstructions(tier);

  const userPrompt = `Develop a comprehensive positioning strategy for the following business idea using ALL of the research data provided below.

BUSINESS IDEA: ${context.ideaTitle}
DESCRIPTION: ${context.ideaDescription}

=== RESEARCH DATA ===
${dataContext}
=== END RESEARCH DATA ===

Work through the 5-component methodology sequentially. Each section must reference specific findings from the research data — competitor names, pain point evidence, market data, demand signals. No generic advice.

${tierInstructions}

Respond with a JSON object matching this exact schema:

{
  "competitiveAlternatives": "2-3 paragraphs + bullets: What customers do today without this product. Go beyond named competitors — include manual processes, spreadsheets, hiring, cobbled tools, status quo. Reference specific competitor weaknesses and pain point gaps from the research. This is the FOUNDATION of the positioning.",

  "uniqueAttributes": "1-2 paragraphs + bulleted attribute list: What this product has/does that NONE of the competitive alternatives have. Each attribute tied to proof from the research. Be specific and honest — only truly unique attributes.",

  "valuePillars": [
    {
      "theme": "<string: value cluster name that resonates with buyers>",
      "attributes": ["<string: unique attribute that drives this value>", "..."],
      "customerBenefit": "<string: outcome the customer experiences, in their language>",
      "proof": "<string: evidence from research — demand signals, pain severity, willingness-to-pay clues>"
    }
  ],

  "targetAudience": "2-3 paragraphs: Who cares MOST about the value themes above. Describe their characteristics, context, and triggers. Why these customers and not others. Reference pain point data, affected segments, and buying behavior from the research.",

  "customerPersona": {
    "name": "<string: named persona, e.g. 'Sarah the Operations Lead'>",
    "role": "<string: job title and function>",
    "demographics": "<string: company size, industry, role seniority, budget authority>",
    "psychographics": "<string: motivations, fears, decision-making style, risk tolerance>",
    "painPoints": ["<string: specific pain tied to competitive alternatives>", "..."],
    "goals": ["<string: what success looks like for them>", "..."],
    "buyingTriggers": ["<string: event or context that creates purchase intent>", "..."],
    "dayInTheLife": "<string: 1-2 paragraph narrative of their current workflow and frustrations>"
  },

  "marketCategory": "2-3 paragraphs: Which positioning style was chosen (Head-to-Head, Big Fish/Small Pond, or Create New Category) and WHY. What assumptions does this category trigger? Why does it make this product's value immediately obvious? What are the implications for pricing, competitive comparisons, and buyer expectations?",

  "positioningStatement": "1-2 paragraphs: The synthesized positioning — derived from all 5 components above. A clear, specific declaration of who this product is for, what it does differently, and why it matters. NOT a template — a strategic narrative that could open a sales deck.",

  "competitivePositioning": "2-3 paragraphs + bullets: Strategic positioning AGAINST the competitive alternatives. How this product wins, where it's strongest, which alternative's weaknesses it exploits. Include the anchor benefit and proof point. Name specific competitors and explain the advantage against each.",

  "tagline": "<string: single line — the sharpest expression of the positioning>",

  "keyMessages": ["<string: 1-2 sentence provable claim that flows directly from a value pillar>", "... (5-7 messages)"],

  "messagingFramework": {
    "headline": "<string: primary one-line headline for the product>",
    "subheadline": "<string: supporting statement that adds specificity>",
    "elevatorPitch": "<string: 2-3 sentence pitch that a founder could deliver cold>",
    "objectionHandlers": [
      { "objection": "<string: common objection from target buyer>", "response": "<string: evidence-based response>" },
      "... (4-6 objection/response pairs)"
    ]
  },

  "brandVoice": "1-2 paragraphs: How the brand should sound — tone, vocabulary, energy level. Derived from the target customer and market category. Include specific do/don't examples and explain WHY this voice resonates with the target audience.",

  "brandPersonality": ["<string: personality trait — e.g. 'Confident but not arrogant: we back every claim with data'>", "... (4-6 traits with brief rationale)"],

  "trendLayer": "1-2 paragraphs: Which market trend reinforces the positioning and adds urgency. How to leverage it in messaging without letting it define the product. Why it matters specifically to the target customer right now."${tier !== 'BASIC' ? `,

  "visualStyle": "<string: 1-2 paragraphs describing recommended visual direction — aesthetic, imagery style, design principles that reinforce the positioning>",
  "toneGuidelines": ["<string: specific tone guideline with example — e.g. 'Use active voice: Say \\'Automate your pipeline\\' not \\'Your pipeline can be automated\\'>", "... (5-7 guidelines)"],
  "brandColors": ["<string: recommended brand color with hex and rationale — e.g. '#2563EB Deep Blue — conveys trust and authority for enterprise buyers'>", "... (3-5 colors)"]` : ''}${tier === 'FULL' ? `,

  "channelMessaging": [
    {
      "channel": "<string: specific channel — e.g. 'LinkedIn Ads', 'Product Hunt Launch', 'Cold Email'>",
      "headline": "<string: channel-adapted headline>",
      "subheadline": "<string: channel-adapted supporting statement>",
      "cta": "<string: channel-specific call to action>",
      "rationale": "<string: why this channel for this audience and how the messaging adapts>"
    },
    "... (5-7 channels)"
  ]` : ''}
}

CRITICAL: Use ONLY data from the research. Every narrative must reference specific findings — named competitors, specific pain points, market data, demand signals. Generic positioning advice is worthless. Be specific, be opinionated, be evidence-based.

Respond ONLY with the JSON object. No markdown code fences, no explanation.`;

  console.log('[PositioningAI] Generating positioning report...');
  console.log('[PositioningAI] Data context length:', dataContext.length, 'chars');
  console.log('[PositioningAI] Tier:', tier);

  const response = await client.messages.create({
    model: SONNET_MODEL,
    max_tokens: 16000,
    temperature: 1.0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from model');
  }

  // Parse JSON — strip markdown code fences if the model adds them
  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed = JSON.parse(jsonText) as PositioningReport;

  // Validate required fields
  if (!parsed.positioningStatement || !parsed.competitiveAlternatives) {
    throw new Error('Positioning report missing required fields (positioningStatement, competitiveAlternatives)');
  }

  console.log('[PositioningAI] Report generated successfully');
  console.log('[PositioningAI] Sections:', Object.keys(parsed).length);
  console.log('[PositioningAI] Value pillars:', parsed.valuePillars?.length ?? 0);

  return parsed;
}

// ============================================================================
// HELPERS
// ============================================================================

function buildPositioningContext(ctx: PositioningContext): string {
  const sections: string[] = [];

  if (ctx.rawResearchSummary) {
    sections.push(`## DEEP RESEARCH\n${ctx.rawResearchSummary}`);
  }
  if (ctx.competitors) {
    sections.push(`## COMPETITIVE LANDSCAPE\n${JSON.stringify(ctx.competitors, null, 2)}`);
  }
  if (ctx.painPoints) {
    sections.push(`## CUSTOMER PAIN POINTS\n${JSON.stringify(ctx.painPoints, null, 2)}`);
  }
  if (ctx.positioning) {
    sections.push(`## EXISTING POSITIONING ANALYSIS\n${JSON.stringify(ctx.positioning, null, 2)}`);
  }
  if (ctx.marketAnalysis) {
    sections.push(`## MARKET ANALYSIS\n${JSON.stringify(ctx.marketAnalysis, null, 2)}`);
  }
  if (ctx.whyNow) {
    sections.push(`## WHY NOW / MARKET TIMING\n${JSON.stringify(ctx.whyNow, null, 2)}`);
  }
  if (ctx.proofSignals) {
    sections.push(`## PROOF SIGNALS & DEMAND INDICATORS\n${JSON.stringify(ctx.proofSignals, null, 2)}`);
  }

  return sections.join('\n\n');
}

function buildTierInstructions(tier: 'BASIC' | 'PRO' | 'FULL'): string {
  switch (tier) {
    case 'BASIC':
      return 'Generate the core positioning sections only (competitiveAlternatives through trendLayer). Do NOT include visualStyle, toneGuidelines, brandColors, or channelMessaging.';
    case 'PRO':
      return 'Generate all core positioning sections PLUS visualStyle, toneGuidelines, and brandColors. Do NOT include channelMessaging.';
    case 'FULL':
      return 'Generate ALL sections including visualStyle, toneGuidelines, brandColors, AND channelMessaging (5-7 channels with tailored messaging for each).';
  }
}
