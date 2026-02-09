'use client';

import { trpc } from '@/lib/trpc/client';

interface ConfigItem {
  key: string;
  value: unknown;
}

export interface PaneConfig {
  visible: boolean;
  title: string;
  subtitle: string;
}

export interface DashboardPaneConfig {
  userStory: PaneConfig;
  downloads: PaneConfig;
  scoreCards: PaneConfig;
  marketSizing: PaneConfig;
  keywordChart: PaneConfig;
  businessFit: PaneConfig;
  techStack: PaneConfig;
  offerSection: PaneConfig;
  actionPrompts: PaneConfig;
  marketAnalysis: PaneConfig;
  whyNow: PaneConfig;
  proofSignals: PaneConfig;
  socialProof: PaneConfig;
  competitors: PaneConfig;
  painPoints: PaneConfig;
  isLoading: boolean;
}

// Default titles for each pane
const DEFAULT_TITLES: Record<string, string> = {
  userStory: 'The Story',
  downloads: 'Downloads',
  scoreCards: 'Idea Scores',
  marketSizing: 'Market Sizing',
  keywordChart: 'Keyword Trends',
  businessFit: 'Business Fit',
  techStack: 'Tech Stack',
  offerSection: 'Offer',
  actionPrompts: 'Action Prompts',
  marketAnalysis: 'Market Analysis',
  whyNow: 'Why Now',
  proofSignals: 'Proof Signals',
  socialProof: 'Social Proof',
  competitors: 'Competitors',
  painPoints: 'Pain Points',
};

// Default visibility (offerSection is false by default)
const DEFAULT_VISIBILITY: Record<string, boolean> = {
  userStory: true,
  downloads: true,
  scoreCards: true,
  marketSizing: true,
  keywordChart: true,
  businessFit: true,
  techStack: true,
  offerSection: false,
  actionPrompts: true,
  marketAnalysis: true,
  whyNow: true,
  proofSignals: true,
  socialProof: true,
  competitors: true,
  painPoints: true,
};

export function useDashboardConfig(): DashboardPaneConfig {
  const { data: configs, isLoading } = trpc.admin.list.useQuery();

  const getConfigValue = (key: string): unknown => {
    const dashboardConfigs = configs?.dashboard as ConfigItem[] | undefined;
    const config = dashboardConfigs?.find((c) => c.key === key);
    return config?.value;
  };

  const getPaneConfig = (paneKey: string): PaneConfig => {
    const visibleValue = getConfigValue(`dashboard.panes.${paneKey}`);
    const titleValue = getConfigValue(`dashboard.panes.${paneKey}.title`);
    const subtitleValue = getConfigValue(`dashboard.panes.${paneKey}.subtitle`);

    return {
      visible: visibleValue !== undefined ? visibleValue !== false : DEFAULT_VISIBILITY[paneKey] ?? true,
      title: (titleValue as string) || DEFAULT_TITLES[paneKey] || paneKey,
      subtitle: (subtitleValue as string) || '',
    };
  };

  return {
    userStory: getPaneConfig('userStory'),
    downloads: getPaneConfig('downloads'),
    scoreCards: getPaneConfig('scoreCards'),
    marketSizing: getPaneConfig('marketSizing'),
    keywordChart: getPaneConfig('keywordChart'),
    businessFit: getPaneConfig('businessFit'),
    techStack: getPaneConfig('techStack'),
    offerSection: getPaneConfig('offerSection'),
    actionPrompts: getPaneConfig('actionPrompts'),
    marketAnalysis: getPaneConfig('marketAnalysis'),
    whyNow: getPaneConfig('whyNow'),
    proofSignals: getPaneConfig('proofSignals'),
    socialProof: getPaneConfig('socialProof'),
    competitors: getPaneConfig('competitors'),
    painPoints: getPaneConfig('painPoints'),
    isLoading,
  };
}
