import { db } from '../src/db/drizzle';
import { blogPosts, users } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

// =============================================================================
// STEP 1: Remove all old mockup/seed blog posts
// =============================================================================
const mockSlugs = [
  'validate-your-startup-idea-before-writing-code',
  'competitor-analysis-framework-for-founders',
  'financial-projections-early-stage-startups',
  'ai-tools-for-market-research-2026',
  'business-plan-dead-or-evolved',
];

// =============================================================================
// STEP 2: The real blog post — TipTap JSON format
// =============================================================================
const tamSamSomPost = {
  slug: 'tam-sam-som-explained',
  title: 'TAM SAM SOM Explained: How to Size Your Market Before You Build',
  description: 'Learn what TAM, SAM, and SOM mean, how to calculate each one, and why market sizing is the first step to validating any business idea. Includes real examples and a free framework.',
  tags: ['Market Sizing', 'Validation', 'Startup Strategy', 'Business Planning'],
  status: 'PUBLISHED' as const,
  publishedAt: new Date(),
  content: {
    type: 'doc',
    content: [
      // ======================================================================
      // INTRO
      // ======================================================================
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Every founder loves to throw around market size numbers. "It\'s a $50 billion market!" Cool. You\'re not getting $50 billion. You\'re not even getting $50 thousand — unless you understand three letters that most people use wrong: TAM, SAM, and SOM.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Here\'s what usually happens. Someone has a business idea. They Google the industry size, find a big number from a Statista report, slap it on a pitch deck slide, and feel validated. "See? There\'s a huge market!" Meanwhile, their actual addressable opportunity might be 0.001% of that number. They just don\'t know it yet, because they\'ve never heard of TAM SAM SOM — or they\'ve heard of it and treated it as a formality instead of what it actually is: the single most important reality check for any business idea.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'This guide will teach you what TAM, SAM, and SOM actually mean, how to calculate each one with real numbers, and why the smallest number in the framework — your SOM — is the only one that determines whether your business can pay rent.',
          },
        ],
      },

      // ======================================================================
      // H2: What Are TAM, SAM, and SOM?
      // ======================================================================
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'What Are TAM, SAM, and SOM?' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'TAM SAM SOM is a market sizing framework that breaks a market into three concentric layers. Think of it as a bullseye. The outer ring is massive and mostly irrelevant to you. The inner ring is the only one that matters.',
          },
        ],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'TAM (Total Addressable Market)' },
                  { type: 'text', text: ' — The total revenue opportunity if you captured 100% of the market with zero competition. It\'s a theoretical ceiling, not a goal.' },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'SAM (Serviceable Addressable Market)' },
                  { type: 'text', text: ' — The slice of TAM that your product can actually serve, filtered by geography, customer segment, and product scope.' },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'SOM (Serviceable Obtainable Market)' },
                  { type: 'text', text: ' — The portion of SAM you can realistically capture in the next 1–3 years, given your resources, competition, and go-to-market strategy.' },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Most people fixate on TAM because it\'s the biggest, most impressive number. That\'s exactly why it\'s the least useful. TAM is a vanity metric for founders. SOM is the reality metric. If your SOM can\'t support your salary, the TAM doesn\'t matter.',
          },
        ],
      },

      // ======================================================================
      // H2: Why TAM SAM SOM Matters
      // ======================================================================
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Why TAM SAM SOM Matters (Even If You\'re Bootstrapping)' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'The conventional wisdom is that TAM SAM SOM is something you do for investors. Put it on slide 7 of the pitch deck, show a big number, move on. That\'s backwards. Market sizing isn\'t investor theater — it\'s founder survival.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Here\'s why. Every business decision you make — pricing, positioning, channels, hiring — depends on the size and shape of your market. Charge too much and your SOM shrinks to nothing. Charge too little and the market might be too small to build a business. Target too broadly and you\'ll waste money marketing to people who\'ll never buy. Target too narrowly and you\'ll cap your growth.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'TAM SAM SOM forces you to think through these tradeoffs before you\'ve spent a dollar. It\'s the cheapest strategy exercise in existence. Skip it, and you\'re essentially saying: "I\'m going to bet months of my life on a market I haven\'t bothered to measure."',
          },
        ],
      },

      // ======================================================================
      // H2: How to Calculate TAM
      // ======================================================================
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'How to Calculate TAM (Total Addressable Market)' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'There are two approaches to calculating your total addressable market, and the best founders use both.',
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Top-Down Approach' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Start with industry reports and work backward. If Grand View Research says the global project management software market is $7.1 billion, that\'s your starting TAM for a PM tool. The advantage: it\'s fast and uses authoritative data. The disadvantage: industry reports often define markets broadly, so your TAM might include segments you\'ll never compete in.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Sources for top-down TAM: Statista, IBISWorld, Grand View Research, Allied Market Research, Google "industry market size + year."',
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Bottom-Up Approach' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Start with unit economics and scale up. How many potential customers exist? What would each one pay annually? Multiply. If there are 2.5 million e-commerce businesses in the US and you\'d charge $29/month, your bottom-up TAM is 2.5M × $348 = $870 million. This approach is more credible because it\'s built from your actual business model, not someone else\'s market definition.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            marks: [{ type: 'bold' }],
            text: 'Pro tip: When your top-down and bottom-up TAM numbers are in the same ballpark, you know your math is solid. When they\'re wildly different, dig into why.',
          },
        ],
      },

      // ======================================================================
      // H2: How to Calculate SAM
      // ======================================================================
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'How to Calculate SAM (Serviceable Addressable Market)' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Your SAM is where TAM meets reality. Apply filters based on who your product actually serves. The most common filters:',
          },
        ],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Geography' }, { type: 'text', text: ' — Are you US-only? English-speaking markets? Global?' }] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Customer segment' }, { type: 'text', text: ' — Enterprise? SMB? Consumer? Which industry verticals?' }] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Product scope' }, { type: 'text', text: ' — Your product doesn\'t do everything. Which use cases does it cover?' }] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Price point' }, { type: 'text', text: ' — Your pricing automatically excludes segments that can\'t or won\'t pay at your level.' }] }],
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Let\'s continue the example. Your TAM for e-commerce inventory tools is $870M. But you\'re building specifically for Shopify stores doing $100K–$5M in annual revenue, US-only. There are roughly 300,000 of those. At $29/month, your SAM is 300K × $348 = $104 million.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Notice what happened. Your market just went from $870 million to $104 million. That\'s not bad news — it\'s honest news. And honesty is what keeps you from building the wrong thing for the wrong people.',
          },
        ],
      },

      // ======================================================================
      // H2: How to Calculate SOM
      // ======================================================================
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'How to Calculate SOM (Serviceable Obtainable Market)' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'SOM is the number that actually determines whether this is a business or a fantasy. It answers: given your team, your budget, your competition, and your go-to-market strategy, how much of that $104M SAM can you realistically capture in the first 1–3 years?',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Most startups capture between 1% and 5% of their SAM in the first few years. The honest ones admit this. The delusional ones put 10–20% on their pitch decks and wonder why investors raise eyebrows.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'To calculate your SOM, work from your go-to-market plan:',
          },
        ],
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'How many customers can you acquire per month through your planned channels? (Be conservative.)' }] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'What\'s your expected churn rate? (Subtract customers you lose.)' }] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Multiply net customers by annual revenue per customer.' }] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Project over 1–3 years.' }] }],
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'In our example: if you acquire 50 customers/month with 3% monthly churn, after year one you\'d have roughly 420 active customers generating ~$146K ARR. That\'s about 0.14% of SAM. Sounds small? Good. That\'s what real looks like. If the unit economics work at that scale, you have a business. If they don\'t, no amount of TAM will save you.',
          },
        ],
      },

      // ======================================================================
      // H2: Real-World TAM SAM SOM Example
      // ======================================================================
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Real-World TAM SAM SOM Example: AI Meal Planning App' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Let\'s walk through a complete TAM SAM SOM analysis for a realistic business idea: an AI-powered meal planning app for busy parents.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', marks: [{ type: 'bold' }], text: 'TAM: ' },
          { type: 'text', text: 'The US meal planning and food tech market is approximately $2.1 billion (Statista, 2025). This includes all meal planning apps, recipe platforms, and meal kit services targeting consumers. That\'s the theoretical ceiling — every dollar spent on meal planning solutions.' },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', marks: [{ type: 'bold' }], text: 'SAM: ' },
          { type: 'text', text: 'Our app targets parents with children under 12, in dual-income households, with household income above $60K. That\'s roughly 18 million US households. At $9.99/month, SAM = 18M × $120/year = $2.16 billion. Wait — that\'s bigger than TAM? That happens when your bottom-up TAM uses a different definition than the industry report. Adjust: realistically, ~15% of those households actively use meal planning tools, giving us a SAM of 2.7M households × $120 = $324 million.' },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', marks: [{ type: 'bold' }], text: 'SOM: ' },
          { type: 'text', text: 'As a pre-launch startup with a $5K/month marketing budget, we project 200 new users/month through content marketing and app store optimization, with 5% monthly churn. Year 1 SOM: ~1,600 active subscribers × $120 = $192K ARR. That\'s 0.06% of SAM. Tiny, but enough to validate the model and fund growth.' },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Notice the progression: $2.1B → $324M → $192K. That\'s not depressing — it\'s clarifying. Now you know exactly what you\'re building toward and what it takes to get there.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '(If you want to see this kind of analysis run on your own idea, IdeaFuel\'s Spark pipeline generates a market sizing snapshot in about two minutes. It\'s a fast way to gut-check whether the numbers hold up before you go deeper.)',
          },
        ],
      },

      // ======================================================================
      // H2: Common Mistakes
      // ======================================================================
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'The 5 TAM SAM SOM Mistakes That Kill Credibility' }],
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'Using TAM as your market size.' },
                  { type: 'text', text: ' Saying "we\'re in a $50B market" without acknowledging that your slice is 0.001% of that is the fastest way to lose credibility with anyone who\'s built a business. TAM is context, not opportunity.' },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'Top-down only.' },
                  { type: 'text', text: ' If your entire market sizing comes from one industry report and a percentage assumption, you\'re guessing. Always cross-check with bottom-up math. The exercise of counting actual potential customers and multiplying by price reveals assumptions top-down analysis hides.' },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'Ignoring competition in SOM.' },
                  { type: 'text', text: ' Your SOM isn\'t just "SAM minus some percentage." It needs to account for specific competitors, their market share, their distribution advantages, and why customers would switch to you. Hand-waving here is obvious.' },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'Static analysis.' },
                  { type: 'text', text: ' Markets move. Your TAM SAM SOM from January is probably wrong by June. Revisit it quarterly, especially after you\'ve launched and have real customer data to replace your assumptions.' },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'Confusing revenue TAM with profit TAM.' },
                  { type: 'text', text: ' A $1 billion market with 3% margins is very different from a $200 million market with 80% margins. Size isn\'t everything — structure matters.' },
                ],
              },
            ],
          },
        ],
      },

      // ======================================================================
      // H2: TAM SAM SOM and Your Validation Process
      // ======================================================================
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'How TAM SAM SOM Fits Into Your Validation Process' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Market sizing is step one of a broader validation process, not the whole thing. TAM SAM SOM tells you whether the opportunity is big enough. It doesn\'t tell you whether customers will buy, whether your product is good, or whether your team can execute. For that, you need the full validation stack:',
          },
        ],
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Market sizing (TAM SAM SOM)' }, { type: 'text', text: ' — Is the opportunity big enough? You\'re here now.' }] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Competitive analysis' }, { type: 'text', text: ' — Who else is in this market and where are the gaps?' }] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Customer discovery' }, { type: 'text', text: ' — Do real people confirm this problem and want this solution?' }] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Financial modeling' }, { type: 'text', text: ' — Do the unit economics work at your SOM scale?' }] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Go/no-go decision' }, { type: 'text', text: ' — Based on all evidence, should you build this or walk away?' }] }],
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'The power of this sequence is that each step can kill a bad idea before you invest further. If your TAM SAM SOM reveals a market too small to support your goals, you just saved yourself months of research on a dead-end opportunity.',
          },
        ],
      },

      // ======================================================================
      // H2: Tools for Market Sizing
      // ======================================================================
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Tools for Calculating TAM SAM SOM' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'You don\'t need a strategy consultant or an MBA to size a market. Here\'s the toolkit:',
          },
        ],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'For TAM (industry data): ' }, { type: 'text', text: 'Statista, IBISWorld, Grand View Research, Census Bureau, Bureau of Labor Statistics. Google Scholar for academic market analyses.' }] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'For SAM (customer segmentation): ' }, { type: 'text', text: 'Census data for demographics, SimilarWeb for competitor traffic, LinkedIn Sales Navigator for B2B audience sizing, Facebook Ads Manager for consumer audience sizing.' }] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'For SOM (realistic capture): ' }, { type: 'text', text: 'Competitor revenue estimates (Crunchbase, PitchBook), your own go-to-market model, customer acquisition benchmarks for your industry.' }] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'For all three at once: ' }, { type: 'text', text: 'IdeaFuel pulls from multiple data sources and structures the output into TAM, SAM, and SOM estimates as part of a broader validation report. If you\'d rather spend a weekend building instead of researching, it\'s worth running your idea through the Spark pipeline to get a baseline before doing the manual deep-dive.' }] }],
          },
        ],
      },

      // ======================================================================
      // H2: The Peter Thiel Question
      // ======================================================================
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'The Contrarian Take: Why a Small SOM Can Be a Good Sign' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Here\'s something most market sizing guides won\'t tell you: a small SOM in a large TAM is often the best possible starting position.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Peter Thiel argues that the best startups dominate a small market first, then expand. Amazon started with books. Facebook started with Harvard students. PayPal started with eBay power sellers. They didn\'t try to capture the whole TAM on day one. They found a niche where they could be the obvious best choice, owned it completely, then expanded outward.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'So when your SOM calculation comes back small, don\'t panic. Ask instead: "Can I be the dominant player in this niche?" If yes, and if the TAM gives you room to expand, you might be looking at exactly the kind of opportunity that the biggest companies are built on. The founders who try to boil the ocean from day one are the ones who drown.',
          },
        ],
      },

      // ======================================================================
      // H2: Step-by-Step Calculation
      // ======================================================================
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'TAM SAM SOM Calculation: The 5-Step Process' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Here\'s the exact process to calculate your TAM, SAM, and SOM. You can do this in a weekend.',
          },
        ],
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'Define your product boundaries.' },
                  { type: 'text', text: ' What problem does it solve? What does it NOT do? Be specific — "project management" is too broad; "visual project tracking for marketing teams" is useful.' },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'Calculate TAM two ways.' },
                  { type: 'text', text: ' Top-down from industry reports AND bottom-up from unit economics. If they\'re within 2x of each other, you\'re in the right ballpark.' },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'Apply SAM filters.' },
                  { type: 'text', text: ' Geography, customer segment, price sensitivity, product scope. Each filter should reduce your TAM by a measurable amount with a clear rationale.' },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'Model your SOM.' },
                  { type: 'text', text: ' Build a simple spreadsheet: monthly customer acquisition × net retention × annual revenue per customer × 1–3 years. Use conservative assumptions. If it works conservative, it\'ll work in reality.' },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'Sanity check against competitors.' },
                  { type: 'text', text: ' Look at competitor revenue (Crunchbase, LinkedIn headcount as a proxy, pricing page analysis). If the #3 player in your space does $5M ARR and you\'re projecting $10M in year 2 as a startup, your SOM is probably too aggressive.' },
                ],
              },
            ],
          },
        ],
      },

      // ======================================================================
      // CONCLUSION
      // ======================================================================
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Size the Market, Then Validate the Idea' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'TAM SAM SOM isn\'t a pitch deck exercise. It\'s a thinking tool. It forces you to move from "this feels like a big opportunity" to "here\'s exactly how big the opportunity is, who it serves, and what I can realistically capture." That shift — from intuition to evidence — is what separates founders who build real businesses from founders who build expensive hobbies.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'The framework is simple: TAM is the total market. SAM is your slice. SOM is what you\'ll actually get. And if you\'re honest about all three, you\'ll either find an opportunity worth pursuing — or save yourself from one that isn\'t. Both outcomes are wins.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Market sizing is step one. Validation is the full journey. Once you know the opportunity is big enough, the next step is proving that customers will pay for your solution — through competitive analysis, customer discovery, and financial modeling.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'If you want to see what this looks like in practice, run your idea through IdeaFuel\'s Spark pipeline. It\'ll generate a market sizing snapshot, competitive landscape, and initial validation score in a few minutes — enough to know whether it\'s worth going deeper. Think of it as the gut-check before the deep-dive.',
          },
        ],
      },
    ],
  },
};

// =============================================================================
// EXECUTE
// =============================================================================
async function main() {
  console.log('Step 1: Removing mockup blog posts...\n');

  const deleted = await db
    .delete(blogPosts)
    .where(inArray(blogPosts.slug, mockSlugs))
    .returning({ id: blogPosts.id, slug: blogPosts.slug });

  for (const d of deleted) {
    console.log(`  Deleted: ${d.slug}`);
  }
  console.log(`  Total removed: ${deleted.length}\n`);

  console.log('Step 2: Publishing TAM SAM SOM article...\n');

  // Find the first user to use as author
  const author = await db.query.users.findFirst({
    columns: { id: true, name: true },
  });

  if (!author) {
    console.error('No users found. Please create a user first.');
    process.exit(1);
  }

  console.log(`  Author: ${author.name} (${author.id})`);

  // Check if slug already exists
  const existing = await db.query.blogPosts.findFirst({
    where: eq(blogPosts.slug, tamSamSomPost.slug),
    columns: { id: true },
  });

  if (existing) {
    // Update existing
    await db
      .update(blogPosts)
      .set({
        ...tamSamSomPost,
        authorId: author.id,
        readingTime: '12 min read',
        wordCount: 2500,
      })
      .where(eq(blogPosts.id, existing.id));
    console.log(`  Updated existing post: "${tamSamSomPost.title}"`);
  } else {
    // Insert new
    await db.insert(blogPosts).values({
      ...tamSamSomPost,
      authorId: author.id,
      readingTime: '12 min read',
      wordCount: 2500,
    });
    console.log(`  Created: "${tamSamSomPost.title}"`);
  }

  console.log('\nDone! Visit /blog to see the post.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  });
