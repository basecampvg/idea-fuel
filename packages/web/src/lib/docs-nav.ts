export interface NavItem {
  title: string;
  slug: string[];
  href: string;
  children?: NavItem[];
}

// Navigation structure matching the docs file layout
export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Getting Started',
    slug: ['getting-started'],
    href: '/docs/getting-started',
  },
  {
    title: 'Interview Modes',
    slug: ['interview-modes'],
    href: '/docs/interview-modes',
  },
  {
    title: 'Research Engine',
    slug: ['research-engine'],
    href: '/docs/research-engine',
  },
  {
    title: 'Reports',
    slug: ['reports'],
    href: '/docs/reports',
    children: [
      { title: 'Business Plan', slug: ['reports', 'business-plan'], href: '/docs/reports/business-plan' },
      { title: 'Positioning', slug: ['reports', 'positioning'], href: '/docs/reports/positioning' },
      { title: 'Competitive Analysis', slug: ['reports', 'competitive-analysis'], href: '/docs/reports/competitive-analysis' },
      { title: 'Why Now', slug: ['reports', 'why-now'], href: '/docs/reports/why-now' },
      { title: 'Proof Signals', slug: ['reports', 'proof-signals'], href: '/docs/reports/proof-signals' },
      { title: 'Keywords & SEO', slug: ['reports', 'keywords-seo'], href: '/docs/reports/keywords-seo' },
      { title: 'Customer Profile', slug: ['reports', 'customer-profile'], href: '/docs/reports/customer-profile' },
      { title: 'Value Equation', slug: ['reports', 'value-equation'], href: '/docs/reports/value-equation' },
      { title: 'Go-to-Market', slug: ['reports', 'go-to-market'], href: '/docs/reports/go-to-market' },
    ],
  },
  {
    title: 'Financial Modeling',
    slug: ['financial-modeling'],
    href: '/docs/financial-modeling',
    children: [
      { title: 'Creating a Model', slug: ['financial-modeling', 'creating-a-model'], href: '/docs/financial-modeling/creating-a-model' },
      { title: 'Assumptions', slug: ['financial-modeling', 'assumptions'], href: '/docs/financial-modeling/assumptions' },
      { title: 'Scenarios', slug: ['financial-modeling', 'scenarios'], href: '/docs/financial-modeling/scenarios' },
      { title: 'Statements', slug: ['financial-modeling', 'statements'], href: '/docs/financial-modeling/statements' },
      { title: 'Break-Even', slug: ['financial-modeling', 'break-even'], href: '/docs/financial-modeling/break-even' },
      { title: 'Exporting', slug: ['financial-modeling', 'exporting'], href: '/docs/financial-modeling/exporting' },
      { title: 'Industry Templates', slug: ['financial-modeling', 'industry-templates'], href: '/docs/financial-modeling/industry-templates' },
    ],
  },
  {
    title: 'AI Agent',
    slug: ['ai-agent'],
    href: '/docs/ai-agent',
  },
  {
    title: 'Business Plan PDF',
    slug: ['business-plan-pdf'],
    href: '/docs/business-plan-pdf',
  },
  {
    title: 'Daily Trend Pick',
    slug: ['daily-trend-pick'],
    href: '/docs/daily-trend-pick',
  },
  {
    title: 'Subscription Plans',
    slug: ['subscription-plans'],
    href: '/docs/subscription-plans',
  },
  {
    title: 'Account Settings',
    slug: ['account-settings'],
    href: '/docs/account-settings',
  },
  {
    title: 'FAQ',
    slug: ['faq'],
    href: '/docs/faq',
  },
  {
    title: 'Learn',
    slug: ['learn'],
    href: '/docs/learn',
    children: [
      { title: 'Validate a Business Idea', slug: ['learn', 'validate-business-idea'], href: '/docs/learn/validate-business-idea' },
      { title: 'Is My Idea Good?', slug: ['learn', 'is-my-business-idea-good'], href: '/docs/learn/is-my-business-idea-good' },
      { title: 'AI Business Plan Generators', slug: ['learn', 'ai-business-plan-generator'], href: '/docs/learn/ai-business-plan-generator' },
      { title: 'Market Research Cost', slug: ['learn', 'market-research-cost'], href: '/docs/learn/market-research-cost' },
      { title: 'Competitive Analysis', slug: ['learn', 'competitive-analysis-how-to'], href: '/docs/learn/competitive-analysis-how-to' },
    ],
  },
];
