const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 'dev-user-id-12345';

  // 1. CAPTURED - just an idea, no interview
  const idea1 = await prisma.idea.create({
    data: {
      title: 'AI-Powered Recipe Generator',
      description: 'An app that generates personalized recipes based on ingredients you have at home, dietary restrictions, and taste preferences. Uses AI to suggest creative combinations and provides step-by-step cooking instructions with video tutorials.',
      status: 'CAPTURED',
      userId,
    }
  });
  console.log('Created CAPTURED idea:', idea1.id);

  // 2. INTERVIEWING - has an active interview
  const idea2 = await prisma.idea.create({
    data: {
      title: 'Subscription Box for Pet Owners',
      description: 'Monthly subscription boxes tailored to specific pet breeds and ages. Includes toys, treats, and health supplements. Uses AI to personalize based on pet behavior and preferences reported by owners.',
      status: 'INTERVIEWING',
      userId,
    }
  });
  await prisma.interview.create({
    data: {
      ideaId: idea2.id,
      userId,
      mode: 'IN_DEPTH',
      status: 'IN_PROGRESS',
      currentTurn: 4,
      maxTurns: 15,
      confidenceScore: 35,
      messages: JSON.stringify([
        { role: 'assistant', content: 'Tell me about your pet subscription box idea.' },
        { role: 'user', content: 'I want to create personalized boxes for different pet breeds.' },
        { role: 'assistant', content: 'What makes your approach unique?' },
        { role: 'user', content: 'AI-driven personalization based on pet behavior.' }
      ]),
    }
  });
  console.log('Created INTERVIEWING idea:', idea2.id);

  // 3. RESEARCHING - interview done, research in progress
  const idea3 = await prisma.idea.create({
    data: {
      title: 'Remote Team Building Platform',
      description: 'A platform for remote teams to do virtual team building activities, escape rooms, and collaborative games. Includes analytics on team engagement and suggestions for improving team dynamics.',
      status: 'RESEARCHING',
      userId,
    }
  });
  await prisma.interview.create({
    data: {
      ideaId: idea3.id,
      userId,
      mode: 'IN_DEPTH',
      status: 'COMPLETE',
      currentTurn: 15,
      maxTurns: 15,
      confidenceScore: 78,
      messages: JSON.stringify([]),
    }
  });
  await prisma.research.create({
    data: {
      ideaId: idea3.id,
      status: 'IN_PROGRESS',
      currentPhase: 'DATA_COLLECTION',
      progress: 42,
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    }
  });
  console.log('Created RESEARCHING idea:', idea3.id);

  // 4. COMPLETE - everything done with reports
  const idea4 = await prisma.idea.create({
    data: {
      title: 'Sustainable Fashion Marketplace',
      description: 'An online marketplace connecting eco-conscious consumers with sustainable fashion brands. Features carbon footprint tracking, material sourcing transparency, and a rewards program for sustainable choices.',
      status: 'COMPLETE',
      userId,
    }
  });
  await prisma.interview.create({
    data: {
      ideaId: idea4.id,
      userId,
      mode: 'IN_DEPTH',
      status: 'COMPLETE',
      currentTurn: 15,
      maxTurns: 15,
      confidenceScore: 92,
      messages: JSON.stringify([]),
    }
  });
  await prisma.research.create({
    data: {
      ideaId: idea4.id,
      status: 'COMPLETE',
      currentPhase: 'COMPLETE',
      progress: 100,
      startedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      completedAt: new Date(),
      competitors: JSON.stringify([
        { name: 'ThredUp', type: 'direct', threat: 'high' },
        { name: 'Poshmark', type: 'direct', threat: 'high' },
        { name: 'Depop', type: 'direct', threat: 'medium' },
        { name: 'Vinted', type: 'direct', threat: 'medium' },
        { name: 'The RealReal', type: 'indirect', threat: 'low' },
      ]),
      painPoints: JSON.stringify([
        'Greenwashing concerns',
        'High prices for sustainable options',
        'Limited selection in smaller sizes',
        'Difficulty verifying sustainability claims',
        'Lack of transparency in supply chain',
      ]),
      keywords: JSON.stringify([
        'sustainable fashion',
        'eco-friendly clothing',
        'ethical brands',
        'secondhand clothing',
        'circular fashion',
      ]),
      // Dashboard Scores (0-100)
      opportunityScore: 78,
      problemScore: 85,
      feasibilityScore: 72,
      whyNowScore: 91,
      // Business Fit Metrics
      revenuePotential: JSON.stringify({
        rating: 'high',
        estimate: '$50K-200K/mo',
        confidence: 0.82,
      }),
      executionDifficulty: JSON.stringify({
        rating: 'medium',
        factors: ['marketplace two-sided', 'brand partnerships needed', 'verification system'],
        soloFriendly: false,
      }),
      gtmClarity: JSON.stringify({
        rating: 'strong',
        channels: ['Instagram', 'TikTok', 'Influencer partnerships', 'SEO'],
        confidence: 0.88,
      }),
      founderFit: JSON.stringify({
        percentage: 85,
        strengths: ['E-commerce experience', 'Fashion industry knowledge', 'Marketing skills'],
        gaps: ['Supply chain expertise', 'Brand partnerships'],
      }),
      // Keyword Trends
      keywordTrends: JSON.stringify([
        { keyword: 'sustainable fashion', volume: 74000, growth: 23, trend: [45000, 48000, 52000, 55000, 58000, 62000, 65000, 68000, 70000, 72000, 73000, 74000] },
        { keyword: 'eco-friendly clothing', volume: 33100, growth: 31, trend: [18000, 20000, 22000, 24000, 26000, 28000, 29000, 30000, 31000, 32000, 32500, 33100] },
        { keyword: 'ethical brands', volume: 18100, growth: 18, trend: [12000, 12500, 13000, 14000, 15000, 15500, 16000, 16500, 17000, 17500, 18000, 18100] },
        { keyword: 'secondhand clothing', volume: 49500, growth: 45, trend: [22000, 26000, 30000, 34000, 38000, 40000, 42000, 44000, 46000, 47500, 48500, 49500] },
        { keyword: 'circular fashion', volume: 12400, growth: 67, trend: [4000, 5000, 6000, 7000, 8000, 8500, 9500, 10000, 11000, 11500, 12000, 12400] },
      ]),
      // Value Ladder
      valueLadder: JSON.stringify([
        { tier: 'entry', name: 'Browser', price: 'Free', features: ['Browse listings', 'Save favorites', 'Basic filters'] },
        { tier: 'core', name: 'Seller', price: '$9.99/mo', features: ['List items', 'Analytics dashboard', 'Sustainability badges'] },
        { tier: 'premium', name: 'Pro Seller', price: '$29.99/mo', features: ['Featured listings', 'Advanced analytics', 'Priority support', 'Bulk upload'] },
        { tier: 'vip', name: 'Brand Partner', price: 'Custom', features: ['Verified brand status', 'Dedicated account manager', 'API access', 'White-label options'] },
      ]),
      // Action Prompts
      actionPrompts: JSON.stringify([
        {
          id: 'landing',
          title: 'Build my sustainable fashion landing page',
          description: 'Generate a conversion-optimized landing page highlighting eco-conscious values',
          prompt: 'Build a landing page for my sustainable fashion marketplace: {ideaTitle}. Emphasize transparency, carbon footprint tracking, and rewards for sustainable choices. Target eco-conscious millennials and Gen Z.',
          category: 'landing',
          icon: '💻',
        },
        {
          id: 'email',
          title: 'Write my sustainability-focused email sequence',
          description: '5-email welcome series educating users about sustainable fashion',
          prompt: 'Write a 5-email welcome sequence for {ideaTitle}. Focus on educating about sustainable fashion, greenwashing red flags, and how our platform ensures authenticity.',
          category: 'email',
          icon: '📝',
        },
        {
          id: 'social',
          title: 'Create eco-fashion content calendar',
          description: '30 days of TikTok/Instagram content around sustainability',
          prompt: 'Create a 30-day social media content calendar for {ideaTitle}. Include educational content about circular fashion, brand spotlights, and styling tips using sustainable pieces.',
          category: 'social',
          icon: '📱',
        },
        {
          id: 'ads',
          title: 'Generate sustainability-focused ad copy',
          description: 'Facebook and Instagram ads targeting eco-conscious shoppers',
          prompt: 'Generate 5 variations of ad copy for {ideaTitle}. Target eco-conscious shoppers frustrated with greenwashing. Highlight transparency, carbon tracking, and verified sustainable brands.',
          category: 'ads',
          icon: '🎯',
        },
      ]),
    }
  });
  // Create some reports
  const reportTypes = ['BUSINESS_PLAN', 'POSITIONING', 'COMPETITIVE_ANALYSIS', 'CUSTOMER_PROFILE', 'GO_TO_MARKET'];
  for (const type of reportTypes) {
    await prisma.report.create({
      data: {
        ideaId: idea4.id,
        userId,
        type,
        tier: 'PRO',
        title: type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        status: 'COMPLETE',
        content: 'Sample report content...',
        sections: JSON.stringify(['overview', 'analysis', 'recommendations']),
      }
    });
  }
  console.log('Created COMPLETE idea:', idea4.id);

  console.log('\nAll test ideas created successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
