/**
 * Standalone test: Business Plan PDF via Puppeteer
 *
 * Injects mock business plan data into the print template page,
 * then generates a PDF — no auth or DB needed.
 *
 * Usage:
 *   cd packages/web
 *   npx tsx scripts/test-business-plan-pdf.ts
 *
 * Requires: Next.js dev server running on localhost:3006
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'server', 'test-output');

// Mock business plan prose matching the BusinessPlanProse interface
const MOCK_PROSE = {
  executiveSummary:
    "GolfBuddy is a mobile-first social media platform purpose-built for casual and recreational golfers — a demographic of over 25 million Americans who play fewer than 25 rounds per year and are largely ignored by existing golf technology. The $84B global golf market is experiencing a post-pandemic boom, with 3.2 million new golfers entering the sport annually since 2020. GolfBuddy captures this wave by combining activity tracking, social networking, and local course discovery into one frictionless app.\n\nOur freemium SaaS model targets a serviceable obtainable market of $240M, with revenue driven by premium subscriptions ($9.99/mo), sponsored course promotions, and affiliate equipment partnerships. With a projected break-even at month 18, GolfBuddy is positioned to become the default social layer for casual golf.",

  problemNarrative:
    "Casual golfers represent over 60% of all golfers in the United States, yet the existing golf tech ecosystem is almost entirely designed for serious, low-handicap players. Apps like Grint, 18Birdies, and Arccos focus on detailed shot tracking, swing analytics, and handicap management — features that intimidate or bore the weekend golfer who just wants to have fun with friends.\n\nThe result is a massive engagement gap: casual golfers have no dedicated digital community. They share golf content on generic platforms like Instagram or group texts, losing context and discoverability. Course discovery relies on outdated directories or word-of-mouth. Tee time coordination happens through fragmented text chains.\n\nResearch signals confirm this pain: Reddit threads in r/golf consistently surface frustration with overcomplicated apps, and casual golf app searches have grown 340% YoY on Google Trends.",

  solutionNarrative:
    "GolfBuddy solves the casual golfer's three core needs: connect, discover, and share. The app provides a golf-specific social feed where users post round highlights, course reviews, and achievement badges. A smart course discovery engine surfaces nearby courses with real-time pricing, conditions, and friend activity. Group coordination tools let users create rounds, invite friends, and split tee times.\n\nUnlike competitors focused on performance metrics, GolfBuddy emphasizes fun and social engagement. Our Golf Score gamification system rewards consistency and social activity, not just low scores — making the app rewarding for players of all skill levels.",

  marketNarrative:
    "The global golf market reached $84.1B in 2024 and is projected to grow at 5.8% CAGR through 2030. The U.S. alone accounts for $40.2B, with 37.5 million golfers (National Golf Foundation, 2024). Critically, the fastest-growing segment is beginners and casual players aged 18-34, driven by the pandemic-era golf boom and cultural shifts (Topgolf, social media golf content).\n\nTAM: $2.4B (golf technology and media). SAM: $800M (casual golfer-focused digital products in the U.S.). SOM: $240M (achievable with 5% market penetration in 3 years).\n\nKey growth drivers include the rise of alternative golf formats (scrambles, par-3 courses, simulators), increasing female participation (+18% since 2019), and urbanization of golf through entertainment venues.",

  competitiveNarrative:
    "The competitive landscape is dominated by performance-focused apps that collectively serve <15% of all golfers. Grint (est. revenue $8M) targets handicap tracking. 18Birdies ($12M) focuses on GPS and shot tracking. Arccos ($25M) pairs with hardware sensors for swing analytics. None prioritize social features or casual player engagement.\n\nGolfBuddy's positioning is uniquely differentiated: we are the only platform designed from the ground up for the 60%+ of golfers who don't track handicaps. Our competitive moat is network effects — as more casual golfers join, the social feed and course discovery become exponentially more valuable, creating switching costs that pure-utility apps cannot replicate.",

  businessModelNarrative:
    "GolfBuddy employs a three-tier freemium model designed to maximize adoption while monetizing engagement:\n\nFree Tier: Social feed, basic course discovery, round logging. Drives viral growth.\nPro ($9.99/mo): Advanced stats, unlimited course reviews, priority tee time booking, ad-free experience.\nCrew ($4.99/mo per group): Group management tools, shared leaderboards, tournament creation for friend groups and leagues.\n\nAdditional revenue streams include sponsored course listings ($500-2000/mo per course), equipment affiliate partnerships (8-12% commission), and anonymized market data licensing to golf industry partners.",

  gtmStrategy:
    "Phase 1 (Months 1-6): Launch in 5 golf-dense metros (Phoenix, Orlando, Myrtle Beach, San Diego, Austin) with hyperlocal marketing. Partner with 50 municipal and public courses for co-branded promotions. Target 10,000 active users.\n\nPhase 2 (Months 7-12): Expand to 25 markets. Launch referral program (Invite your foursome, get Pro free for a month). Content marketing via TikTok/Instagram golf creators. Target 75,000 users.\n\nPhase 3 (Year 2): National rollout. Enterprise partnerships with TopGolf, Drive Shack, and major course management groups. Target 300,000 users and $1.2M ARR.",

  customerProfile: "",
  financialNarrative:
    "Our financial model is grounded in conservative assumptions derived from comparable social/utility apps in the sports vertical. We project reaching profitability by month 18, driven by strong unit economics: CAC of $3.50 (organic + referral heavy) vs. LTV of $42 (14-month avg. retention on Pro tier).\n\nYear 1 focuses on user acquisition with controlled burn. Year 2 scales monetization through premium conversions and B2B course partnerships. Year 3 achieves operating leverage as the platform effect kicks in.",

  financialProjections: {
    year1: { revenue: 180000, costs: 520000, profit: -340000 },
    year2: { revenue: 1200000, costs: 980000, profit: 220000 },
    year3: { revenue: 4800000, costs: 2900000, profit: 1900000 },
    breakEvenMonth: 18,
    assumptions: [
      "5% monthly user growth after initial launch cohort",
      "8% free-to-paid conversion rate (industry avg: 4-6%)",
      "Average Pro subscription retention: 14 months",
      "Course partnership revenue begins Month 6 at $1,500/mo avg",
      "Team of 5 FTEs Year 1, scaling to 12 by Year 3",
    ],
  },

  productRoadmap:
    "Q1 2026: MVP launch — social feed, course discovery, round logging, friend invites.\nQ2 2026: Pro tier launch, tee time integration (via GolfNow API), push notifications.\nQ3 2026: Crew subscriptions, group leaderboards, tournament mode.\nQ4 2026: AI-powered course recommendations, weather-aware scheduling.\nH1 2027: Marketplace for used equipment, lesson booking, simulator venue integration.\nH2 2027: International expansion (UK, Canada, Australia).",

  teamOperations:
    "Founding team of 3: CEO (10yr product leadership, former Strava), CTO (ex-Meta mobile engineering), CMO (golf industry marketing, former Callaway digital). Year 1 hires: 2 mobile engineers. Advisory board includes a PGA Tour player agent and the former VP of Digital at the National Golf Foundation.",

  riskAnalysis:
    "Key risks include: (1) Network effect cold-start — mitigated by hyperlocal launch strategy and course partnerships that seed content. (2) Competition from incumbents adding social features — mitigated by first-mover advantage in the casual segment and fundamentally different product DNA. (3) Golf market cyclicality — mitigated by targeting the most resilient segment (casual/social golfers less affected by economic downturns than serious golfers). (4) Regulatory risk around data privacy — mitigated by privacy-first architecture with no location tracking without explicit consent.",

  fundingRequirements:
    "Seeking $1.5M seed round to fund 18 months of operations through break-even. Allocation: 45% engineering (mobile + backend), 25% marketing (creator partnerships + local campaigns), 15% operations (course partnerships team), 15% reserve. Targeting close by Q1 2026 to align with spring golf season launch.",

  exitStrategy:
    "Primary exit path: acquisition by a golf industry conglomerate (Acushnet, Callaway/Topgolf, or Golf Genius Software) within 4-6 years at 8-12x revenue. Secondary: acquisition by a sports social platform (Strava, Nike) seeking golf market entry. The casual golfer audience and B2B course network create strategic value beyond revenue multiples.",
};

// Mock research data for the page
const MOCK_RESEARCH = {
  businessPlan: JSON.stringify(MOCK_PROSE),
  opportunityScore: 82,
  problemScore: 78,
  feasibilityScore: 71,
  whyNowScore: 88,
  competitors: JSON.stringify([
    {
      name: 'Grint',
      description: 'Handicap tracking and GPS rangefinder',
      positioning: 'Serious golfer utility',
      keyDifferentiator: 'Official USGA handicap provider',
      vulnerability: 'No social features, complex UX',
      strengths: ['USGA integration', 'Established brand'],
      weaknesses: ['No social', 'Intimidating for casuals'],
    },
    {
      name: '18Birdies',
      description: 'GPS shot tracking and course management',
      positioning: 'Performance-focused golfer tool',
      keyDifferentiator: 'AI-powered club recommendations',
      vulnerability: 'Subscription fatigue, niche audience',
      strengths: ['GPS accuracy', 'Large course database'],
      weaknesses: ['Casual unfriendly', 'High churn'],
    },
    {
      name: 'Arccos',
      description: 'Smart sensor + AI caddie system',
      positioning: 'Premium golf analytics',
      keyDifferentiator: 'Hardware + software integration',
      vulnerability: 'High price point ($200+ hardware)',
      strengths: ['Shot-level data', 'AI insights'],
      weaknesses: ['Expensive', 'Requires sensors'],
    },
  ]),
  painPoints: JSON.stringify([
    { pain: 'No dedicated social platform for casual golfers', severity: 'critical', currentSolution: 'Instagram/group texts' },
    { pain: 'Course discovery relies on outdated directories', severity: 'high', currentSolution: 'Google Maps/word of mouth' },
    { pain: 'Tee time coordination is fragmented', severity: 'high', currentSolution: 'Group texts' },
    { pain: 'Existing apps too complex for casual players', severity: 'medium', currentSolution: 'Avoid golf apps entirely' },
  ]),
  valueLadder: JSON.stringify([
    { name: 'Free', price: '$0', description: 'Social feed, basic discovery', features: ['Social feed', 'Course search', 'Round logging', 'Friend invites'], targetCustomer: 'All casual golfers' },
    { name: 'Pro', price: '$9.99/mo', description: 'Full experience, no ads', features: ['Advanced stats', 'Unlimited reviews', 'Priority booking', 'Ad-free', 'Exclusive badges'], targetCustomer: 'Engaged casual golfers' },
    { name: 'Crew', price: '$4.99/mo/group', description: 'Group management', features: ['Shared leaderboards', 'Tournament mode', 'Group scheduling', 'Custom challenges'], targetCustomer: 'Friend groups & leagues' },
  ]),
  marketSizing: JSON.stringify({
    tam: { formattedValue: '$2.4B', growthRate: 5.8 },
    sam: { formattedValue: '$800M', growthRate: 7.2 },
    som: { formattedValue: '$240M', growthRate: 12 },
  }),
};

async function main() {
  console.log('🏌️ Testing Business Plan PDF generation via Puppeteer...\n');

  // Ensure output dir exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Build a self-contained HTML page using the print template's structure
    // We inject mock data and render it directly, bypassing auth/DB
    const html = buildMockPrintPage(MOCK_PROSE, MOCK_RESEARCH);

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait a moment for any rendering
    await new Promise((r) => setTimeout(r, 1500));

    // Screenshot for preview
    const screenshotPath = path.join(OUTPUT_DIR, 'business-plan-preview.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0.5in', left: '0' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; font-size: 7px; color: #666; display: flex; justify-content: space-between; padding: 0 0.75in;">
          <span>GolfBuddy — Business Plan — Confidential</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
    });

    const pdfPath = path.join(OUTPUT_DIR, `test-business-plan-${new Date().toISOString().split('T')[0]}.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);
    console.log(`📄 PDF saved: ${pdfPath} (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);
    console.log('\n✅ Done!');
  } finally {
    await browser.close();
  }
}

function buildMockPrintPage(prose: typeof MOCK_PROSE, research: typeof MOCK_RESEARCH): string {
  const competitors = JSON.parse(research.competitors);
  const painPoints = JSON.parse(research.painPoints);
  const valueLadder = JSON.parse(research.valueLadder);
  const marketSizing = JSON.parse(research.marketSizing);

  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const sections = [
    { num: 1, title: 'Executive Summary', content: proseBlock(prose.executiveSummary) + scoresSummary(research) },
    { num: 2, title: 'Problem Analysis', content: proseBlock(prose.problemNarrative) + painPointsTable(painPoints) },
    { num: 3, title: 'Solution', content: proseBlock(prose.solutionNarrative) },
    { num: 4, title: 'Market Analysis', content: proseBlock(prose.marketNarrative) + marketSizingCards(marketSizing) },
    { num: 5, title: 'Competitive Landscape', content: proseBlock(prose.competitiveNarrative) + competitorTable(competitors) },
    { num: 6, title: 'Business Model', content: proseBlock(prose.businessModelNarrative) + valueLadderCards(valueLadder) },
    { num: 7, title: 'Go-to-Market Strategy', content: proseBlock(prose.gtmStrategy) },
    { num: 8, title: 'Financial Projections', content: proseBlock(prose.financialNarrative) + financialTable(prose.financialProjections) },
    { num: 9, title: 'Product & Technology Roadmap', content: proseBlock(prose.productRoadmap) },
    { num: 10, title: 'Team & Operations', content: proseBlock(prose.teamOperations) },
    { num: 11, title: 'Risk Analysis', content: proseBlock(prose.riskAnalysis) },
    { num: 12, title: 'Funding Requirements', content: proseBlock(prose.fundingRequirements) },
    { num: 13, title: 'Exit Strategy', content: proseBlock(prose.exitStrategy) },
  ].filter(s => s.content.trim());

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0a0a0a;
      color: #fff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    @media print {
      @page { size: A4; margin: 0; }
      .cover-page { page-break-after: always; }
      .page-break { page-break-before: always; }
      .section { page-break-inside: avoid; }
    }

    .document { max-width: 850px; margin: 0 auto; }

    /* Cover */
    .cover-page {
      display: flex; flex-direction: column; justify-content: space-between;
      min-height: 100vh; padding: 80px 64px;
    }
    .cover-top .label { font-size: 12px; font-family: monospace; text-transform: uppercase; letter-spacing: 4px; color: #666; }
    .cover-top .brand { margin-top: 8px; font-size: 24px; font-weight: 700; color: #d4d4d4; }
    .cover-top .brand span { color: #ef4444; }
    .cover-center { flex: 1; display: flex; flex-direction: column; justify-content: center; margin-top: -80px; }
    .cover-center .accent { width: 96px; height: 4px; background: #ef4444; margin-bottom: 32px; }
    .cover-center h1 { font-size: 48px; font-weight: 800; line-height: 1.1; letter-spacing: -1px; }
    .cover-center .subtitle { margin-top: 16px; font-size: 20px; color: #d4d4d4; font-weight: 300; }
    .cover-bottom { display: flex; justify-content: space-between; align-items: flex-end; }
    .cover-bottom .date { font-size: 14px; color: #666; }
    .cover-bottom .conf { font-size: 12px; color: #525252; margin-top: 4px; }
    .cover-bottom .gen { font-size: 12px; color: #525252; }

    /* TOC */
    .toc { padding: 64px; }
    .toc h2 { font-size: 14px; font-family: monospace; text-transform: uppercase; letter-spacing: 4px; color: #666; margin-bottom: 32px; }
    .toc-item { display: flex; align-items: baseline; gap: 16px; margin-bottom: 12px; }
    .toc-item .num { font-size: 14px; font-family: monospace; color: #ef4444; }
    .toc-item .title { font-size: 16px; color: #e5e5e5; }
    .toc-item .dots { flex: 1; border-bottom: 1px dotted #404040; margin: 0 8px; }

    /* Sections */
    .section { padding: 48px 64px; }
    .section-title { display: flex; align-items: baseline; gap: 16px; margin-bottom: 24px; margin-top: 8px; }
    .section-title .num { font-size: 14px; font-family: monospace; color: #ef4444; letter-spacing: 2px; }
    .section-title h2 { font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }

    .prose { font-size: 14px; color: #d4d4d4; line-height: 1.8; white-space: pre-line; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 12px; }
    th { text-align: left; padding: 8px 12px; font-family: monospace; text-transform: uppercase; letter-spacing: 2px; font-size: 10px; color: #666; border-bottom: 2px solid #404040; }
    td { padding: 10px 12px; border-bottom: 1px solid #262626; color: #a3a3a3; }
    td.name { color: #e5e5e5; font-weight: 500; }

    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .badge-critical { background: rgba(239,68,68,0.2); color: #f87171; }
    .badge-high { background: rgba(245,158,11,0.2); color: #fbbf24; }
    .badge-medium { background: rgba(115,115,115,0.15); color: #a3a3a3; }

    /* Cards */
    .card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px; }
    .card { border: 1px solid #404040; border-radius: 8px; padding: 16px; }
    .card .label { font-family: monospace; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #525252; }
    .card .desc { font-size: 12px; color: #666; margin-top: 2px; }
    .card .value { font-size: 24px; font-weight: 900; margin-top: 8px; }
    .card .growth { font-size: 12px; color: #f87171; margin-top: 4px; }
    .card h4 { font-size: 14px; font-weight: 700; color: #e5e5e5; }
    .card .price { font-size: 18px; font-weight: 900; color: #ef4444; margin-top: 4px; }
    .card ul { margin-top: 12px; list-style: none; }
    .card li { font-size: 12px; color: #666; margin-bottom: 4px; }
    .card li::before { content: '- '; color: #ef4444; }

    /* Scores */
    .scores { display: flex; align-items: center; gap: 24px; margin-top: 24px; }
    .score-circle { width: 56px; height: 56px; border-radius: 50%; border: 2px solid #ef4444; display: flex; align-items: center; justify-content: center; }
    .score-circle span { font-size: 20px; font-weight: 900; }
    .score-label { font-size: 10px; font-family: monospace; text-transform: uppercase; color: #666; }
    .score-items { display: flex; gap: 16px; }
    .score-item { text-align: center; }
    .score-item .val { font-size: 18px; font-weight: 700; color: #e5e5e5; }
    .score-item .lbl { font-size: 10px; font-family: monospace; text-transform: uppercase; color: #525252; }

    /* Financial */
    .fin-table { margin-top: 24px; }
    .fin-table th { background: #171717; }
    .fin-row-profit td { font-weight: 700; }
    .positive { color: #22c55e; }
    .negative { color: #f87171; }

    .assumptions { margin-top: 16px; }
    .assumptions li { font-size: 12px; color: #a3a3a3; margin-bottom: 6px; list-style: disc; margin-left: 20px; }

    /* Back page */
    .back-page {
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      min-height: 100vh; padding: 64px;
    }
    .back-page .accent { width: 96px; height: 4px; background: #ef4444; margin-bottom: 24px; }
    .back-page .brand { font-size: 24px; font-weight: 700; color: #d4d4d4; }
    .back-page .brand span { color: #ef4444; }
    .back-page .tagline { margin-top: 12px; font-size: 14px; color: #525252; }
    .back-page .legal { margin-top: 32px; font-size: 12px; color: #404040; text-align: center; }
  </style>
</head>
<body>
  <div id="business-plan-report" class="document">

    <!-- Cover -->
    <div class="cover-page">
      <div class="cover-top">
        <div class="label">Prepared by</div>
        <div class="brand"><span>IDEA</span>FUEL</div>
      </div>
      <div class="cover-center">
        <div class="accent"></div>
        <h1>GolfBuddy</h1>
        <div class="subtitle">Business Plan</div>
      </div>
      <div class="cover-bottom">
        <div>
          <div class="date">${date}</div>
          <div class="conf">Confidential — For Intended Recipients Only</div>
        </div>
        <div class="gen">Generated by IdeaFuel AI</div>
      </div>
    </div>

    <!-- TOC -->
    <div class="page-break toc">
      <h2>Table of Contents</h2>
      ${sections.map(s => `
        <div class="toc-item">
          <span class="num">${String(s.num).padStart(2, '0')}</span>
          <span class="title">${s.title}</span>
          <span class="dots"></span>
        </div>
      `).join('')}
    </div>

    <!-- Sections -->
    ${sections.map(s => `
      <div class="page-break">
        <div class="section">
          <div class="section-title">
            <span class="num">${String(s.num).padStart(2, '0')}</span>
            <h2>${s.title}</h2>
          </div>
          ${s.content}
        </div>
      </div>
    `).join('')}

    <!-- Back Page -->
    <div class="page-break back-page">
      <div class="accent"></div>
      <div class="brand"><span>IDEA</span>FUEL</div>
      <div class="tagline">AI-Powered Business Intelligence</div>
      <div class="legal">
        This document was generated on ${date} and contains proprietary analysis.<br/>
        &copy; ${new Date().getFullYear()} IdeaFuel. All rights reserved.
      </div>
    </div>

  </div>
</body>
</html>`;
}

// --- Helpers ---

function proseBlock(text: string): string {
  if (!text) return '';
  return `<div class="prose">${escapeHtml(text)}</div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function scoresSummary(research: typeof MOCK_RESEARCH): string {
  const scores = [
    { key: 'opportunity', label: 'Opportunity', val: research.opportunityScore },
    { key: 'problem', label: 'Problem', val: research.problemScore },
    { key: 'feasibility', label: 'Feasibility', val: research.feasibilityScore },
    { key: 'whyNow', label: 'Timing', val: research.whyNowScore },
  ];
  const avg = Math.round(scores.reduce((s, x) => s + x.val, 0) / scores.length);
  return `
    <div class="scores">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="score-circle"><span>${avg}</span></div>
        <span class="score-label">Overall<br/>Score</span>
      </div>
      <div class="score-items">
        ${scores.map(s => `
          <div class="score-item">
            <div class="val">${s.val}</div>
            <div class="lbl">${s.label}</div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function painPointsTable(painPoints: Array<{ pain: string; severity: string; currentSolution?: string }>): string {
  return `
    <table>
      <thead><tr><th>Pain Point</th><th>Severity</th><th>Current Solution</th></tr></thead>
      <tbody>
        ${painPoints.map(p => `
          <tr>
            <td class="name">${escapeHtml(p.pain)}</td>
            <td><span class="badge badge-${p.severity === 'critical' ? 'critical' : p.severity === 'high' ? 'high' : 'medium'}">${p.severity}</span></td>
            <td>${escapeHtml(p.currentSolution || 'None')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function competitorTable(competitors: Array<{ name: string; positioning: string; keyDifferentiator?: string; vulnerability?: string }>): string {
  return `
    <table>
      <thead><tr><th>Competitor</th><th>Positioning</th><th>Differentiator</th><th>Vulnerability</th></tr></thead>
      <tbody>
        ${competitors.map(c => `
          <tr>
            <td class="name">${escapeHtml(c.name)}</td>
            <td>${escapeHtml(c.positioning)}</td>
            <td>${escapeHtml(c.keyDifferentiator || '-')}</td>
            <td>${escapeHtml(c.vulnerability || '-')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function marketSizingCards(ms: { tam?: { formattedValue: string; growthRate: number }; sam?: { formattedValue: string; growthRate: number }; som?: { formattedValue: string; growthRate: number } }): string {
  const cards = [
    { label: 'TAM', desc: 'Total Addressable Market', data: ms.tam },
    { label: 'SAM', desc: 'Serviceable Addressable Market', data: ms.sam },
    { label: 'SOM', desc: 'Serviceable Obtainable Market', data: ms.som },
  ];
  return `
    <div class="card-grid">
      ${cards.map(c => `
        <div class="card" style="background:rgba(23,23,23,0.5)">
          <div class="label">${c.label}</div>
          <div class="desc">${c.desc}</div>
          <div class="value">${c.data?.formattedValue ?? 'N/A'}</div>
          ${c.data?.growthRate != null ? `<div class="growth">▲ ${c.data.growthRate}% CAGR</div>` : ''}
        </div>
      `).join('')}
    </div>`;
}

function valueLadderCards(tiers: Array<{ name: string; price: string; description: string; features: string[] }>): string {
  return `
    <div class="card-grid">
      ${tiers.slice(0, 3).map(t => `
        <div class="card">
          <h4>${escapeHtml(t.name)}</h4>
          <div class="price">${escapeHtml(t.price)}</div>
          <div class="desc">${escapeHtml(t.description)}</div>
          <ul>${(t.features ?? []).slice(0, 5).map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
        </div>
      `).join('')}
    </div>`;
}

function financialTable(fp: typeof MOCK_PROSE.financialProjections): string {
  const fmt = (n: number) => {
    const neg = n < 0;
    const abs = Math.abs(n);
    const s = abs >= 1_000_000 ? `$${(abs / 1_000_000).toFixed(1)}M` : `$${(abs / 1_000).toFixed(0)}K`;
    return neg ? `(${s})` : s;
  };
  const profitClass = (n: number) => n >= 0 ? 'positive' : 'negative';

  return `
    <table class="fin-table">
      <thead><tr><th></th><th>Year 1</th><th>Year 2</th><th>Year 3</th></tr></thead>
      <tbody>
        <tr><td class="name">Revenue</td><td>${fmt(fp.year1.revenue)}</td><td>${fmt(fp.year2.revenue)}</td><td>${fmt(fp.year3.revenue)}</td></tr>
        <tr><td class="name">Costs</td><td>${fmt(fp.year1.costs)}</td><td>${fmt(fp.year2.costs)}</td><td>${fmt(fp.year3.costs)}</td></tr>
        <tr class="fin-row-profit"><td class="name">Profit</td><td class="${profitClass(fp.year1.profit)}">${fmt(fp.year1.profit)}</td><td class="${profitClass(fp.year2.profit)}">${fmt(fp.year2.profit)}</td><td class="${profitClass(fp.year3.profit)}">${fmt(fp.year3.profit)}</td></tr>
      </tbody>
    </table>
    <div style="margin-top:12px;font-size:13px;color:#a3a3a3;">
      <strong style="color:#e5e5e5;">Break-even:</strong> Month ${fp.breakEvenMonth}
    </div>
    <div class="assumptions">
      <div style="font-size:12px;font-weight:600;color:#666;margin-top:16px;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Key Assumptions</div>
      <ul>${fp.assumptions.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
    </div>`;
}

main().catch(console.error);
