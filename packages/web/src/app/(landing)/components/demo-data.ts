export interface DemoOutput {
  ideaTitle: string;
  marketSize: { value: string; growth: string };
  competitors: Array<{
    name: string;
    description: string;
    threat: 'high' | 'medium' | 'low';
  }>;
  timingVerdict: {
    label: string;
    color: 'green' | 'yellow' | 'red';
    reasoning: string;
  };
  viabilityScore: number;
}

interface DemoExample {
  keywords: string[];
  output: DemoOutput;
}

const examples: DemoExample[] = [
  {
    keywords: ['crm', 'bed', 'breakfast', 'bnb', 'b&b', 'hotel', 'hospitality', 'inn', 'lodge'],
    output: {
      ideaTitle: 'Custom CRM for the Bed & Breakfast Industry',
      marketSize: { value: '$4.8B', growth: '12.3% CAGR' },
      competitors: [
        {
          name: 'Little Hotelier',
          description: 'Property management for small accommodations',
          threat: 'high',
        },
        {
          name: 'Guesty',
          description: 'Multi-channel vacation rental management',
          threat: 'medium',
        },
        {
          name: 'Lodgify',
          description: 'Vacation rental website builder + bookings',
          threat: 'medium',
        },
      ],
      timingVerdict: {
        label: 'Strong Timing',
        color: 'green',
        reasoning:
          'Post-pandemic travel boom + independent B&Bs growing 18% YoY. Legacy tools are dated.',
      },
      viabilityScore: 78,
    },
  },
  {
    keywords: ['meal', 'planning', 'food', 'recipe', 'nutrition', 'diet', 'cooking', 'grocery'],
    output: {
      ideaTitle: 'AI-Powered Meal Planning App',
      marketSize: { value: '$6.2B', growth: '15.7% CAGR' },
      competitors: [
        {
          name: 'Mealime',
          description: 'Personalized meal plans with grocery lists',
          threat: 'high',
        },
        {
          name: 'Eat This Much',
          description: 'Automatic meal planner based on calories and diet',
          threat: 'medium',
        },
        {
          name: 'Whisk',
          description: 'Smart recipe saving with shopping integration',
          threat: 'low',
        },
      ],
      timingVerdict: {
        label: 'Good Timing',
        color: 'green',
        reasoning:
          'Health-conscious consumer spending up 22%. AI personalization is a clear differentiator.',
      },
      viabilityScore: 72,
    },
  },
  {
    keywords: ['fitness', 'coaching', 'workout', 'exercise', 'training', 'gym', 'health', 'wellness', 'personal trainer'],
    output: {
      ideaTitle: 'Personalized Fitness Coaching Platform',
      marketSize: { value: '$11.6B', growth: '18.1% CAGR' },
      competitors: [
        {
          name: 'Future',
          description: '1-on-1 digital personal training',
          threat: 'high',
        },
        {
          name: 'Trainerize',
          description: 'Platform for fitness coaches to manage clients',
          threat: 'high',
        },
        {
          name: 'Caliber',
          description: 'AI-driven strength training app',
          threat: 'medium',
        },
      ],
      timingVerdict: {
        label: 'Competitive',
        color: 'yellow',
        reasoning:
          'Large market but saturated. Needs strong differentiation — niche verticals or AI advantage.',
      },
      viabilityScore: 61,
    },
  },
];

const fallbackOutput: DemoOutput = {
  ideaTitle: 'Sample Analysis',
  marketSize: { value: '$3.1B', growth: '9.4% CAGR' },
  competitors: [
    {
      name: 'Market Leader A',
      description: 'Established incumbent with broad feature set',
      threat: 'high',
    },
    {
      name: 'Emerging Startup B',
      description: 'Venture-backed challenger with modern UX',
      threat: 'medium',
    },
    {
      name: 'Niche Player C',
      description: 'Focused solution serving a specific segment',
      threat: 'low',
    },
  ],
  timingVerdict: {
    label: 'Moderate Timing',
    color: 'yellow',
    reasoning:
      'Market conditions are favorable. Deeper analysis needed to confirm demand signals.',
  },
  viabilityScore: 65,
};

export const suggestionPills = [
  'CRM for bed & breakfasts',
  'AI meal planning app',
  'Fitness coaching platform',
];

export function matchDemoOutput(input: string): { output: DemoOutput; isFallback: boolean } {
  const words = input.toLowerCase().split(/\s+/);

  let bestMatch: DemoExample | null = null;
  let bestScore = 0;

  for (const example of examples) {
    const score = example.keywords.filter((kw) =>
      words.some((word) => word.includes(kw) || kw.includes(word))
    ).length;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = example;
    }
  }

  // Need at least 1 keyword match (lowered from 2 for single-word inputs like "CRM")
  if (bestMatch && bestScore >= 1) {
    return { output: bestMatch.output, isFallback: false };
  }

  return { output: fallbackOutput, isFallback: true };
}
