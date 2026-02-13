/**
 * Provider Registry and Factory
 *
 * Central export point for all providers (Brave Search, Anthropic, OpenAI)
 * Provides factory functions for provider selection based on configuration
 */

import type { SearchProvider, AIProvider, ProviderConfig } from './types';
import { getBraveSearchProvider } from './brave';
import { getAnthropicProvider } from './anthropic';
import { getOpenAIProvider, openaiSearch } from './openai';
import { configService } from '../services/config';
import type { SubscriptionTier } from '@forge/shared';

// Re-export types
export * from './types';

// Re-export provider getters
export { getBraveSearchProvider } from './brave';
export { getAnthropicProvider } from './anthropic';
export { getOpenAIProvider, openaiSearch } from './openai';

// ============================================================================
// Provider Registry
// ============================================================================

const searchProviders = new Map<string, SearchProvider>();
const aiProviders = new Map<string, AIProvider>();

// Initialize providers (lazy loaded)
function initializeProviders() {
  if (searchProviders.size === 0) {
    try {
      searchProviders.set('brave', getBraveSearchProvider());
    } catch (error) {
      console.warn('[Providers] Brave Search not available:', error);
    }

    try {
      searchProviders.set('openai', openaiSearch);
    } catch (error) {
      console.warn('[Providers] OpenAI Search not available:', error);
    }
  }

  if (aiProviders.size === 0) {
    try {
      aiProviders.set('openai', getOpenAIProvider());
    } catch (error) {
      console.warn('[Providers] OpenAI not available:', error);
    }

    try {
      aiProviders.set('anthropic', getAnthropicProvider());
    } catch (error) {
      console.warn('[Providers] Anthropic not available:', error);
    }
  }
}

// ============================================================================
// Provider Factory Functions
// ============================================================================

/**
 * Get search provider based on configuration
 * Falls back to OpenAI if primary provider is unavailable
 */
export function getSearchProvider(): SearchProvider {
  initializeProviders();

  const providerName = configService.isInitialized()
    ? configService.getString('search.provider', 'brave')
    : 'brave';

  const provider = searchProviders.get(providerName);

  if (provider) {
    return provider;
  }

  // Fallback to OpenAI search
  console.warn(`[Providers] ${providerName} search not available, falling back to OpenAI`);
  return openaiSearch;
}

/**
 * Get AI provider for research tasks
 */
export function getResearchProvider(tier?: SubscriptionTier): AIProvider {
  initializeProviders();

  // Check tier-specific override
  if (tier && configService.isInitialized()) {
    const override = configService.getString(`ai.research.provider.${tier}`, '');
    if (override) {
      const provider = aiProviders.get(override);
      if (provider) return provider;
    }
  }

  // Default provider
  const providerName = configService.isInitialized()
    ? configService.getString('ai.research.provider', 'openai')
    : 'openai';

  const provider = aiProviders.get(providerName);

  if (provider) {
    return provider;
  }

  // Fallback to OpenAI
  console.warn(`[Providers] ${providerName} not available for research, falling back to OpenAI`);
  return getOpenAIProvider();
}

/**
 * Get AI provider for extraction tasks
 */
export function getExtractionProvider(tier?: SubscriptionTier): AIProvider {
  initializeProviders();

  // Check tier-specific override
  if (tier && configService.isInitialized()) {
    const override = configService.getString(`ai.extraction.provider.${tier}`, '');
    if (override) {
      const provider = aiProviders.get(override);
      if (provider) return provider;
    }
  }

  // Default provider
  const providerName = configService.isInitialized()
    ? configService.getString('ai.extraction.provider', 'anthropic')
    : 'anthropic';

  const provider = aiProviders.get(providerName);

  if (provider) {
    return provider;
  }

  // Fallback to OpenAI
  console.warn(`[Providers] ${providerName} not available for extraction, falling back to OpenAI`);
  return getOpenAIProvider();
}

/**
 * Get AI provider for generation tasks
 */
export function getGenerationProvider(tier?: SubscriptionTier): AIProvider {
  initializeProviders();

  // Check tier-specific override
  if (tier && configService.isInitialized()) {
    const override = configService.getString(`ai.generation.provider.${tier}`, '');
    if (override) {
      const provider = aiProviders.get(override);
      if (provider) return provider;
    }
  }

  // Default provider
  const providerName = configService.isInitialized()
    ? configService.getString('ai.generation.provider', 'anthropic')
    : 'anthropic';

  const provider = aiProviders.get(providerName);

  if (provider) {
    return provider;
  }

  // Fallback to OpenAI
  console.warn(`[Providers] ${providerName} not available for generation, falling back to OpenAI`);
  return getOpenAIProvider();
}

/**
 * Get AI provider specifically for business plan generation
 * Business plans benefit most from Claude Opus's long-form writing
 */
export function getBusinessPlanProvider(tier?: SubscriptionTier): AIProvider {
  initializeProviders();

  // Check tier-specific override
  if (tier && configService.isInitialized()) {
    const override = configService.getString(`ai.businessPlan.provider.${tier}`, '');
    if (override) {
      const provider = aiProviders.get(override);
      if (provider) return provider;
    }
  }

  // Default to Anthropic for business plans (Claude Opus excels at long-form writing)
  const providerName = configService.isInitialized()
    ? configService.getString('ai.businessPlan.provider', 'anthropic')
    : 'anthropic';

  const provider = aiProviders.get(providerName);

  if (provider) {
    return provider;
  }

  // Fallback to OpenAI
  console.warn(`[Providers] ${providerName} not available for business plan, falling back to OpenAI`);
  return getOpenAIProvider();
}

// ============================================================================
// Provider Health Checks
// ============================================================================

/**
 * Check health of all providers
 * Useful for monitoring and diagnostics
 */
export async function checkAllProvidersHealth() {
  initializeProviders();

  const results = {
    search: {} as Record<string, any>,
    ai: {} as Record<string, any>,
  };

  // Check search providers
  for (const [name, provider] of searchProviders.entries()) {
    try {
      results.search[name] = await provider.healthCheck();
    } catch (error) {
      results.search[name] = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  // Check AI providers
  for (const [name, provider] of aiProviders.entries()) {
    try {
      results.ai[name] = await provider.healthCheck();
    } catch (error) {
      results.ai[name] = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  return results;
}

// ============================================================================
// Provider Configuration Helpers
// ============================================================================

/**
 * Get current provider configuration
 */
export function getProviderConfig(): ProviderConfig {
  return {
    search: {
      default: configService.isInitialized()
        ? (configService.getString('search.provider', 'brave') as 'brave' | 'openai' | 'serpapi')
        : 'brave',
      fallback: configService.isInitialized()
        ? (configService.getString('search.fallback.provider', 'openai') as 'openai' | 'serpapi')
        : 'openai',
      qualityThreshold: {
        minPosts: configService.isInitialized()
          ? configService.getNumber('search.fallback.minPosts', 5)
          : 5,
        minWordCount: configService.isInitialized()
          ? configService.getNumber('search.fallback.minWordCount', 500)
          : 500,
      },
    },
    ai: {
      research: configService.isInitialized()
        ? (configService.getString('ai.research.provider', 'openai') as 'openai' | 'anthropic')
        : 'openai',
      extraction: configService.isInitialized()
        ? (configService.getString('ai.extraction.provider', 'anthropic') as 'openai' | 'anthropic')
        : 'anthropic',
      generation: configService.isInitialized()
        ? (configService.getString('ai.generation.provider', 'anthropic') as 'openai' | 'anthropic')
        : 'anthropic',
      businessPlan: configService.isInitialized()
        ? (configService.getString('ai.businessPlan.provider', 'anthropic') as 'openai' | 'anthropic')
        : 'anthropic',
    },
  };
}
