import { PrismaClient, ConfigType } from '@prisma/client';

// =============================================================================
// DEFAULT CONFIGURATION VALUES
// =============================================================================

export interface ConfigDefinition {
  key: string;
  value: unknown;
  type: ConfigType;
  category: string;
  label: string;
  description?: string;
  options?: Array<{ value: string; label: string }>;
}

// All default configurations
export const DEFAULT_CONFIGS: ConfigDefinition[] = [
  // =========================================================================
  // AI Models
  // =========================================================================
  {
    key: 'ai.interview.model',
    value: 'gpt-5.2',
    type: 'SELECT',
    category: 'ai',
    label: 'Interview Model',
    description: 'Model used for interview conversations',
    options: [
      { value: 'gpt-5.2', label: 'GPT-5.2' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'o3', label: 'o3' },
    ],
  },
  {
    key: 'ai.research.model',
    value: 'gpt-5.2',
    type: 'SELECT',
    category: 'ai',
    label: 'Research Synthesis Model',
    description: 'Model used for research synthesis and report writing',
    options: [
      { value: 'gpt-5.2', label: 'GPT-5.2' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'gpt-4o', label: 'GPT-4o' },
    ],
  },
  {
    key: 'ai.deepResearch.model',
    value: 'o3-deep-research-2025-06-26',
    type: 'SELECT',
    category: 'ai',
    label: 'Deep Research Model',
    description: 'Model for comprehensive market research (PRO/ENTERPRISE)',
    options: [
      { value: 'o3-deep-research-2025-06-26', label: 'o3-deep-research' },
      { value: 'o4-mini-deep-research-2025-06-26', label: 'o4-mini-deep-research' },
    ],
  },
  {
    key: 'ai.deepResearch.modelMini',
    value: 'o4-mini-deep-research-2025-06-26',
    type: 'SELECT',
    category: 'ai',
    label: 'Deep Research Model (Budget)',
    description: 'Budget model for deep research (FREE tier)',
    options: [
      { value: 'o4-mini-deep-research-2025-06-26', label: 'o4-mini-deep-research' },
      { value: 'o3-deep-research-2025-06-26', label: 'o3-deep-research' },
    ],
  },
  {
    key: 'ai.deepResearch.enabled',
    value: true,
    type: 'BOOLEAN',
    category: 'ai',
    label: 'Enable Deep Research',
    description: 'Use o3-deep-research pipeline (disable for legacy GPT-5.2 only)',
  },

  // =========================================================================
  // AI Parameters
  // =========================================================================
  {
    key: 'ai.params.temperature',
    value: 0.7,
    type: 'NUMBER',
    category: 'ai',
    label: 'Default Temperature',
    description: 'AI temperature setting (0.0-2.0)',
  },
  {
    key: 'ai.params.maxTokens',
    value: 4096,
    type: 'NUMBER',
    category: 'ai',
    label: 'Max Tokens',
    description: 'Maximum tokens per AI response',
  },
  {
    key: 'ai.params.reasoningEnabled',
    value: true,
    type: 'BOOLEAN',
    category: 'ai',
    label: 'Enable GPT-5.2 Reasoning',
    description: 'Use reasoning.effort parameter for GPT-5.2',
  },

  // =========================================================================
  // Interview Settings
  // =========================================================================
  {
    key: 'interview.maxTurns.lightning',
    value: 0,
    type: 'NUMBER',
    category: 'interview',
    label: 'Max Turns (Lightning)',
    description: 'Maximum conversation turns for Lightning mode',
  },
  {
    key: 'interview.maxTurns.light',
    value: 10,
    type: 'NUMBER',
    category: 'interview',
    label: 'Max Turns (Light)',
    description: 'Maximum conversation turns for Light mode',
  },
  {
    key: 'interview.maxTurns.inDepth',
    value: 65,
    type: 'NUMBER',
    category: 'interview',
    label: 'Max Turns (In-Depth)',
    description: 'Maximum conversation turns for In-Depth mode',
  },
  {
    key: 'interview.confidence.light',
    value: 80,
    type: 'NUMBER',
    category: 'interview',
    label: 'Confidence Threshold (Light)',
    description: 'Confidence % needed to complete Light interview',
  },
  {
    key: 'interview.confidence.inDepth',
    value: 90,
    type: 'NUMBER',
    category: 'interview',
    label: 'Confidence Threshold (In-Depth)',
    description: 'Confidence % needed to complete In-Depth interview',
  },

  // =========================================================================
  // Research Settings
  // =========================================================================
  {
    key: 'research.scoring.passCount',
    value: 3,
    type: 'NUMBER',
    category: 'research',
    label: 'Scoring Pass Count',
    description: 'Number of scoring passes for reliability',
  },
  {
    key: 'research.scoring.deviationThreshold',
    value: 15,
    type: 'NUMBER',
    category: 'research',
    label: 'Deviation Threshold',
    description: 'Max acceptable score deviation between passes',
  },
  {
    key: 'research.keywords.minVolume',
    value: 500,
    type: 'NUMBER',
    category: 'research',
    label: 'Min Keyword Volume',
    description: 'Minimum search volume for keywords',
  },
  {
    key: 'research.keywords.maxKeywords',
    value: 10,
    type: 'NUMBER',
    category: 'research',
    label: 'Max Keywords',
    description: 'Maximum keywords to return',
  },
  {
    key: 'research.timeout',
    value: 3600000,
    type: 'NUMBER',
    category: 'research',
    label: 'Research Timeout (ms)',
    description: 'Timeout for deep research API calls',
  },

  // =========================================================================
  // Research SLA Configuration (per best practices)
  // =========================================================================
  {
    key: 'research.sla.deepResearch',
    value: 1800000,
    type: 'NUMBER',
    category: 'research',
    label: 'Deep Research SLA (ms)',
    description: 'Maximum time for deep research phase (30 min default)',
  },
  {
    key: 'research.sla.socialResearch',
    value: 900000,
    type: 'NUMBER',
    category: 'research',
    label: 'Social Research SLA (ms)',
    description: 'Maximum time for social research phase (15 min default)',
  },
  {
    key: 'research.sla.synthesis',
    value: 300000,
    type: 'NUMBER',
    category: 'research',
    label: 'Synthesis SLA (ms)',
    description: 'Maximum time for synthesis phase (5 min default)',
  },
  {
    key: 'research.sla.reportGeneration',
    value: 300000,
    type: 'NUMBER',
    category: 'research',
    label: 'Report Generation SLA (ms)',
    description: 'Maximum time for report generation phase (5 min default)',
  },
  {
    key: 'research.sla.total',
    value: 2700000,
    type: 'NUMBER',
    category: 'research',
    label: 'Total Research SLA (ms)',
    description: 'Maximum total time for entire research pipeline (45 min default)',
  },

  // =========================================================================
  // Tier Limits
  // =========================================================================
  {
    key: 'limits.free.maxIdeas',
    value: 3,
    type: 'NUMBER',
    category: 'limits',
    label: 'Max Ideas (FREE)',
    description: 'Maximum ideas for FREE tier users',
  },
  {
    key: 'limits.free.maxReports',
    value: 5,
    type: 'NUMBER',
    category: 'limits',
    label: 'Max Reports (FREE)',
    description: 'Maximum reports per idea for FREE tier',
  },
  {
    key: 'limits.pro.maxIdeas',
    value: 20,
    type: 'NUMBER',
    category: 'limits',
    label: 'Max Ideas (PRO)',
    description: 'Maximum ideas for PRO tier users',
  },
  {
    key: 'limits.pro.maxReports',
    value: 10,
    type: 'NUMBER',
    category: 'limits',
    label: 'Max Reports (PRO)',
    description: 'Maximum reports per idea for PRO tier',
  },

  // =========================================================================
  // Feature Flags
  // =========================================================================
  {
    key: 'features.testMode',
    value: false,
    type: 'BOOLEAN',
    category: 'features',
    label: 'Test Mode',
    description: 'Enable test mode globally (mock data, reduced API calls)',
  },
  {
    key: 'features.mockAI',
    value: false,
    type: 'BOOLEAN',
    category: 'features',
    label: 'Mock AI Responses',
    description: 'Use mock AI responses instead of real API calls',
  },
  {
    key: 'features.socialProof',
    value: true,
    type: 'BOOLEAN',
    category: 'features',
    label: 'Social Proof Research',
    description: 'Enable social proof web search',
  },
  {
    key: 'features.serpApi',
    value: true,
    type: 'BOOLEAN',
    category: 'features',
    label: 'SerpAPI Keywords',
    description: 'Enable SerpAPI for Google Trends keyword data',
  },

  // =========================================================================
  // Search Domains
  // =========================================================================
  {
    key: 'domains.social',
    value: [
      'reddit.com',
      'twitter.com',
      'x.com',
      'news.ycombinator.com',
      'indiehackers.com',
      'producthunt.com',
      'facebook.com',
      'linkedin.com',
    ],
    type: 'JSON',
    category: 'domains',
    label: 'Social Proof Domains',
    description: 'Domains for social proof web search',
  },
  {
    key: 'domains.market',
    value: [
      'statista.com',
      'ibisworld.com',
      'grandviewresearch.com',
      'mckinsey.com',
      'bcg.com',
      'bain.com',
      'hbr.org',
      'forbes.com',
      'techcrunch.com',
      'bloomberg.com',
      'reuters.com',
      'ft.com',
      'wsj.com',
    ],
    type: 'JSON',
    category: 'domains',
    label: 'Market Research Domains',
    description: 'Domains for market research web search',
  },
  {
    key: 'domains.competitor',
    value: [
      'g2.com',
      'capterra.com',
      'trustpilot.com',
      'crunchbase.com',
      'similarweb.com',
      'pitchbook.com',
      'builtwith.com',
      'stackshare.io',
    ],
    type: 'JSON',
    category: 'domains',
    label: 'Competitor Research Domains',
    description: 'Domains for competitor research web search',
  },

  // =========================================================================
  // Analytics & Tracking
  // =========================================================================
  {
    key: 'analytics.facebookPixelId',
    value: '',
    type: 'STRING',
    category: 'analytics',
    label: 'Facebook Pixel ID',
    description: 'Your Facebook Pixel ID for conversion tracking (e.g., 123456789012345)',
  },
  {
    key: 'analytics.googleTagSnippet',
    value: '',
    type: 'STRING',
    category: 'analytics',
    label: 'Google Tag Snippet',
    description: 'Your Google Tag (gtag.js) code snippet - paste the full script',
  },
  {
    key: 'analytics.enabled',
    value: false,
    type: 'BOOLEAN',
    category: 'analytics',
    label: 'Enable Analytics',
    description: 'Enable analytics tracking scripts on the frontend',
  },
];

// =============================================================================
// CONFIG SERVICE
// =============================================================================

export class ConfigService {
  private cache: Map<string, unknown> = new Map();
  private metadataCache: Map<string, { type: ConfigType; category: string; label: string }> = new Map();
  private lastRefresh: Date | null = null;
  private prisma: PrismaClient | null = null;
  private initialized = false;

  /**
   * Initialize the config service with a Prisma client.
   * Must be called before using other methods.
   */
  async init(prisma: PrismaClient): Promise<void> {
    this.prisma = prisma;
    await this.refresh();
    this.initialized = true;
    console.log('[ConfigService] Initialized with', this.cache.size, 'configs');
  }

  /**
   * Get a config value with type safety.
   * Falls back to default value if not in cache or DB.
   */
  get<T>(key: string, defaultValue: T): T {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }
    // Check defaults
    const defaultConfig = DEFAULT_CONFIGS.find((c) => c.key === key);
    if (defaultConfig) {
      return defaultConfig.value as T;
    }
    return defaultValue;
  }

  /**
   * Get a numeric config value.
   */
  getNumber(key: string, defaultValue: number): number {
    const value = this.get(key, defaultValue);
    return typeof value === 'number' ? value : defaultValue;
  }

  /**
   * Get a boolean config value.
   */
  getBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.get(key, defaultValue);
    return typeof value === 'boolean' ? value : defaultValue;
  }

  /**
   * Get a string config value.
   */
  getString(key: string, defaultValue: string): string {
    const value = this.get(key, defaultValue);
    return typeof value === 'string' ? value : defaultValue;
  }

  /**
   * Get a JSON array config value.
   */
  getArray<T>(key: string, defaultValue: T[]): T[] {
    const value = this.get(key, defaultValue);
    return Array.isArray(value) ? value : defaultValue;
  }

  /**
   * Set a config value (writes to DB + updates cache).
   * Creates audit log entry.
   */
  async set(key: string, value: unknown, userId?: string, reason?: string): Promise<void> {
    if (!this.prisma) {
      throw new Error('ConfigService not initialized');
    }

    const oldValue = this.cache.get(key);
    const defaultConfig = DEFAULT_CONFIGS.find((c) => c.key === key);

    // Upsert the config
    await this.prisma.adminConfig.upsert({
      where: { key },
      update: {
        value: value as object,
        updatedBy: userId,
      },
      create: {
        key,
        value: value as object,
        type: defaultConfig?.type || 'STRING',
        category: defaultConfig?.category || 'other',
        label: defaultConfig?.label || key,
        description: defaultConfig?.description,
        options: defaultConfig?.options as object | undefined,
        updatedBy: userId,
      },
    });

    // Create audit log
    await this.prisma.configAuditLog.create({
      data: {
        configKey: key,
        oldValue: oldValue as object | undefined,
        newValue: value as object,
        changedBy: userId || 'system',
        reason,
      },
    });

    // Update cache
    this.cache.set(key, value);
    console.log(`[ConfigService] Set ${key} = ${JSON.stringify(value)}`);
  }

  /**
   * Refresh cache from database.
   */
  async refresh(): Promise<void> {
    if (!this.prisma) {
      throw new Error('ConfigService not initialized');
    }

    const configs = await this.prisma.adminConfig.findMany();

    this.cache.clear();
    this.metadataCache.clear();

    for (const config of configs) {
      this.cache.set(config.key, config.value);
      this.metadataCache.set(config.key, {
        type: config.type,
        category: config.category,
        label: config.label,
      });
    }

    // Add defaults for any missing configs
    for (const defaultConfig of DEFAULT_CONFIGS) {
      if (!this.cache.has(defaultConfig.key)) {
        this.cache.set(defaultConfig.key, defaultConfig.value);
      }
    }

    this.lastRefresh = new Date();
    console.log(`[ConfigService] Refreshed ${configs.length} configs from DB`);
  }

  /**
   * Get all configs grouped by category.
   */
  async getAllByCategory(): Promise<Record<string, Array<{
    key: string;
    value: unknown;
    type: ConfigType;
    label: string;
    description?: string;
    options?: Array<{ value: string; label: string }>;
  }>>> {
    if (!this.prisma) {
      throw new Error('ConfigService not initialized');
    }

    const dbConfigs = await this.prisma.adminConfig.findMany({
      orderBy: { key: 'asc' },
    });

    // Create a map of DB configs for quick lookup
    const dbConfigMap = new Map(dbConfigs.map((c) => [c.key, c]));

    // Group all configs by category
    const result: Record<string, Array<{
      key: string;
      value: unknown;
      type: ConfigType;
      label: string;
      description?: string;
      options?: Array<{ value: string; label: string }>;
    }>> = {};

    for (const defaultConfig of DEFAULT_CONFIGS) {
      const dbConfig = dbConfigMap.get(defaultConfig.key);
      const category = defaultConfig.category;

      if (!result[category]) {
        result[category] = [];
      }

      result[category].push({
        key: defaultConfig.key,
        value: dbConfig?.value ?? defaultConfig.value,
        type: defaultConfig.type,
        label: defaultConfig.label,
        description: defaultConfig.description,
        options: defaultConfig.options,
      });
    }

    return result;
  }

  /**
   * Seed default values into the database (if not exists).
   */
  async seedDefaults(): Promise<number> {
    if (!this.prisma) {
      throw new Error('ConfigService not initialized');
    }

    let seeded = 0;

    for (const config of DEFAULT_CONFIGS) {
      const existing = await this.prisma.adminConfig.findUnique({
        where: { key: config.key },
      });

      if (!existing) {
        await this.prisma.adminConfig.create({
          data: {
            key: config.key,
            value: config.value as object,
            type: config.type,
            category: config.category,
            label: config.label,
            description: config.description,
            options: config.options as object | undefined,
            updatedBy: 'system',
          },
        });
        seeded++;
      }
    }

    if (seeded > 0) {
      console.log(`[ConfigService] Seeded ${seeded} default configs`);
      await this.refresh();
    }

    return seeded;
  }

  /**
   * Reset a category to default values.
   */
  async resetCategory(category: string, userId?: string): Promise<number> {
    if (!this.prisma) {
      throw new Error('ConfigService not initialized');
    }

    const categoryDefaults = DEFAULT_CONFIGS.filter((c) => c.category === category);
    let reset = 0;

    for (const config of categoryDefaults) {
      await this.set(config.key, config.value, userId, `Reset to default`);
      reset++;
    }

    return reset;
  }

  /**
   * Get audit log entries.
   */
  async getAuditLog(options?: { key?: string; limit?: number }) {
    if (!this.prisma) {
      throw new Error('ConfigService not initialized');
    }

    return this.prisma.configAuditLog.findMany({
      where: options?.key ? { configKey: options.key } : undefined,
      orderBy: { changedAt: 'desc' },
      take: options?.limit || 50,
    });
  }

  /**
   * Check if service is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get last refresh time.
   */
  getLastRefresh(): Date | null {
    return this.lastRefresh;
  }
}

// Singleton instance
export const configService = new ConfigService();
