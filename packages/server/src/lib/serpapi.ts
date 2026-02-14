/**
 * SerpAPI Client for Google Trends data
 *
 * Used to fetch real search trend data for keyword research and market validation.
 * Replaces AI-generated synthetic data with actual Google Trends information.
 *
 * @see https://serpapi.com/google-trends-api
 */

// SerpAPI Response Types
export interface SerpApiTrendsResponse {
  search_metadata: {
    id: string;
    status: string;
    json_endpoint: string;
    created_at: string;
    processed_at: string;
    google_trends_url: string;
    raw_html_file: string;
    prettify_html_file: string;
    total_time_taken: number;
  };
  search_parameters: {
    engine: string;
    q: string;
    data_type: string;
    date?: string;
    tz?: string;
    geo?: string;
  };
  interest_over_time?: {
    timeline_data: TimelineDataPoint[];
    averages?: number[];
  };
  compared_breakdown_by_region?: RegionData[];
  interest_by_region?: RegionData[];
  related_topics?: {
    rising?: RelatedItem[];
    top?: RelatedItem[];
  };
  related_queries?: {
    rising?: RelatedItem[];
    top?: RelatedItem[];
  };
  error?: string;
}

export interface TimelineDataPoint {
  date: string;
  timestamp?: string;
  values: {
    query: string;
    value: string;
    extracted_value: number;
  }[];
}

export interface RegionData {
  location: string;
  max_value_index?: number;
  value?: string;
  extracted_value?: number;
  values?: {
    query: string;
    value: string;
    extracted_value: number;
  }[];
}

export interface RelatedItem {
  query?: string;
  topic?: {
    title: string;
    type: string;
  };
  value: string;
  extracted_value?: number;
  link?: string;
}

// Simplified types for our application
export interface TrendData {
  keyword: string;
  interestOverTime: {
    date: string;
    value: number;
  }[];
  averageInterest: number;
  relatedQueries: {
    query: string;
    value: number;
    type: 'rising' | 'top';
  }[];
  relatedTopics: {
    title: string;
    type: string;
    value: number;
    category: 'rising' | 'top';
  }[];
  regionInterest: {
    location: string;
    value: number;
  }[];
}

export interface TrendComparison {
  keywords: string[];
  timelineData: {
    date: string;
    values: { keyword: string; value: number }[];
  }[];
  summary: {
    keyword: string;
    averageInterest: number;
    peakInterest: number;
    trend: 'rising' | 'stable' | 'declining';
  }[];
}

// Configuration
const SERPAPI_BASE_URL = 'https://serpapi.com/search';

/**
 * Parse SerpAPI date format to ISO string
 * Handles formats like: "Jan 2025", "Jan 8 – 14, 2023", "2025-01"
 */
function parseSerpApiDate(dateStr: string): string {
  // Try ISO format first (already valid)
  if (/^\d{4}-\d{2}/.test(dateStr)) {
    return dateStr;
  }

  // Handle "Month Year" format (e.g., "Jan 2025")
  const monthYearMatch = dateStr.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const [, month, year] = monthYearMatch;
    const monthIndex = new Date(`${month} 1, 2000`).getMonth();
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  }

  // Handle cross-month date range (e.g., "Dec 26, 2021 – Jan 1, 2022") - use start date
  const crossMonthRange = dateStr.match(/^([A-Za-z]+)\s+(\d+),\s*(\d{4})\s*[–-]/);
  if (crossMonthRange) {
    const [, month, day, year] = crossMonthRange;
    const monthIndex = new Date(`${month} 1, 2000`).getMonth();
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Handle same-month date range (e.g., "Jan 8 – 14, 2023") - use start date
  const rangeMatch = dateStr.match(/^([A-Za-z]+)\s+(\d+)\s*[–-]/);
  if (rangeMatch) {
    const yearMatch = dateStr.match(/(\d{4})/);
    if (yearMatch) {
      const [, month, day] = rangeMatch;
      const year = yearMatch[1];
      const monthIndex = new Date(`${month} 1, 2000`).getMonth();
      return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Fallback: try native parsing
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  // Last resort: return current date
  console.warn(`[SerpAPI] Could not parse date: "${dateStr}"`);
  return new Date().toISOString().split('T')[0];
}

interface SerpApiConfig {
  apiKey: string;
  timeout?: number;
}

/**
 * Get SerpAPI configuration from environment
 */
function getConfig(): SerpApiConfig {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    throw new Error('SERPAPI_API_KEY environment variable is not set');
  }

  return {
    apiKey,
    timeout: 30000, // 30 second timeout
  };
}

/**
 * Build URL with query parameters
 */
function buildUrl(params: Record<string, string | number | undefined>): string {
  const url = new URL(SERPAPI_BASE_URL);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });

  return url.toString();
}

/**
 * Fetch Google Trends data for a single keyword
 */
export async function getTrendData(
  keyword: string,
  options: {
    geo?: string;        // Country code (e.g., 'US', 'GB')
    timeRange?: string;  // e.g., 'today 12-m' for past 12 months
    category?: number;   // Category ID
  } = {}
): Promise<TrendData> {
  const config = getConfig();

  const url = buildUrl({
    engine: 'google_trends',
    q: keyword,
    data_type: 'TIMESERIES',
    date: options.timeRange || 'today 12-m',
    geo: options.geo,
    cat: options.category,
    api_key: config.apiKey,
  });

  const response = await fetch(url, {
    signal: AbortSignal.timeout(config.timeout || 30000),
  });

  if (!response.ok) {
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch {
      errorBody = '(unable to read response body)';
    }
    console.error(`[SerpAPI] getTrendData(single) request failed:`, {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
      keyword,
      geo: options.geo,
    });
    throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = (await response.json()) as SerpApiTrendsResponse;

  if (data.error) {
    console.error(`[SerpAPI] getTrendData(single) API error:`, { error: data.error, keyword });
    throw new Error(`SerpAPI error: ${data.error}`);
  }

  // Parse interest over time (normalize dates to ISO format)
  const interestOverTime = (data.interest_over_time?.timeline_data || []).map((point) => ({
    date: parseSerpApiDate(point.date),
    value: point.values[0]?.extracted_value || 0,
  }));

  // Calculate average interest
  const values = interestOverTime.map((p) => p.value);
  const averageInterest = values.length > 0
    ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    : 0;

  // Now fetch related queries and topics
  const relatedData = await fetchRelatedData(keyword, options, config);

  return {
    keyword,
    interestOverTime,
    averageInterest,
    relatedQueries: relatedData.queries,
    relatedTopics: relatedData.topics,
    regionInterest: relatedData.regions,
  };
}

/**
 * Fetch related queries, topics, and regional interest
 */
async function fetchRelatedData(
  keyword: string,
  options: { geo?: string; timeRange?: string; category?: number },
  config: SerpApiConfig
): Promise<{
  queries: TrendData['relatedQueries'];
  topics: TrendData['relatedTopics'];
  regions: TrendData['regionInterest'];
}> {
  // Fetch related queries
  const queriesUrl = buildUrl({
    engine: 'google_trends',
    q: keyword,
    data_type: 'RELATED_QUERIES',
    date: options.timeRange || 'today 12-m',
    geo: options.geo,
    cat: options.category,
    api_key: config.apiKey,
  });

  const queriesResponse = await fetch(queriesUrl, {
    signal: AbortSignal.timeout(config.timeout || 30000),
  });

  const queriesData = (await queriesResponse.json()) as SerpApiTrendsResponse;

  const queries: TrendData['relatedQueries'] = [];

  // Add rising queries
  queriesData.related_queries?.rising?.forEach((item) => {
    if (item.query) {
      queries.push({
        query: item.query,
        value: item.extracted_value || 0,
        type: 'rising',
      });
    }
  });

  // Add top queries
  queriesData.related_queries?.top?.forEach((item) => {
    if (item.query) {
      queries.push({
        query: item.query,
        value: item.extracted_value || 0,
        type: 'top',
      });
    }
  });

  // Fetch related topics
  const topicsUrl = buildUrl({
    engine: 'google_trends',
    q: keyword,
    data_type: 'RELATED_TOPICS',
    date: options.timeRange || 'today 12-m',
    geo: options.geo,
    cat: options.category,
    api_key: config.apiKey,
  });

  const topicsResponse = await fetch(topicsUrl, {
    signal: AbortSignal.timeout(config.timeout || 30000),
  });

  const topicsData = (await topicsResponse.json()) as SerpApiTrendsResponse;

  const topics: TrendData['relatedTopics'] = [];

  // Add rising topics
  topicsData.related_topics?.rising?.forEach((item) => {
    if (item.topic) {
      topics.push({
        title: item.topic.title,
        type: item.topic.type,
        value: item.extracted_value || 0,
        category: 'rising',
      });
    }
  });

  // Add top topics
  topicsData.related_topics?.top?.forEach((item) => {
    if (item.topic) {
      topics.push({
        title: item.topic.title,
        type: item.topic.type,
        value: item.extracted_value || 0,
        category: 'top',
      });
    }
  });

  // Fetch regional interest
  const regionsUrl = buildUrl({
    engine: 'google_trends',
    q: keyword,
    data_type: 'GEO_MAP',
    date: options.timeRange || 'today 12-m',
    geo: options.geo,
    cat: options.category,
    api_key: config.apiKey,
  });

  const regionsResponse = await fetch(regionsUrl, {
    signal: AbortSignal.timeout(config.timeout || 30000),
  });

  const regionsData = (await regionsResponse.json()) as SerpApiTrendsResponse;

  const regions: TrendData['regionInterest'] = (regionsData.interest_by_region || [])
    .slice(0, 10) // Top 10 regions
    .map((region) => ({
      location: region.location,
      value: region.extracted_value || 0,
    }));

  return { queries, topics, regions };
}

/**
 * Compare multiple keywords in Google Trends
 */
export async function compareTrends(
  keywords: string[],
  options: {
    geo?: string;
    timeRange?: string;
    category?: number;
  } = {}
): Promise<TrendComparison> {
  if (keywords.length === 0) {
    throw new Error('At least one keyword is required');
  }

  if (keywords.length > 5) {
    throw new Error('Maximum 5 keywords can be compared at once');
  }

  const config = getConfig();

  // Join keywords with comma for comparison
  const query = keywords.join(',');

  const url = buildUrl({
    engine: 'google_trends',
    q: query,
    data_type: 'TIMESERIES',
    date: options.timeRange || 'today 12-m',
    geo: options.geo,
    cat: options.category,
    api_key: config.apiKey,
  });

  const response = await fetch(url, {
    signal: AbortSignal.timeout(config.timeout || 30000),
  });

  if (!response.ok) {
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch {
      errorBody = '(unable to read response body)';
    }
    console.error(`[SerpAPI] getTrendData request failed:`, {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
      query,
      geo: options.geo,
    });
    throw new Error(`SerpAPI getTrendData request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = (await response.json()) as SerpApiTrendsResponse;

  if (data.error) {
    console.error(`[SerpAPI] getTrendData API error:`, { error: data.error, query, geo: options.geo });
    throw new Error(`SerpAPI error: ${data.error}`);
  }

  // Parse timeline data (normalize dates to ISO format)
  const timelineData = (data.interest_over_time?.timeline_data || []).map((point) => ({
    date: parseSerpApiDate(point.date),
    values: point.values.map((v) => ({
      keyword: v.query,
      value: v.extracted_value,
    })),
  }));

  // Calculate summary for each keyword
  const summary = keywords.map((keyword) => {
    const keywordValues = timelineData
      .flatMap((t) => t.values)
      .filter((v) => v.keyword.toLowerCase() === keyword.toLowerCase())
      .map((v) => v.value);

    const averageInterest = keywordValues.length > 0
      ? Math.round(keywordValues.reduce((a, b) => a + b, 0) / keywordValues.length)
      : 0;

    const peakInterest = keywordValues.length > 0
      ? Math.max(...keywordValues)
      : 0;

    // Determine trend by comparing first half to second half
    const halfPoint = Math.floor(keywordValues.length / 2);
    const firstHalf = keywordValues.slice(0, halfPoint);
    const secondHalf = keywordValues.slice(halfPoint);

    const firstAvg = firstHalf.length > 0
      ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      : 0;
    const secondAvg = secondHalf.length > 0
      ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      : 0;

    let trend: 'rising' | 'stable' | 'declining';
    const change = ((secondAvg - firstAvg) / (firstAvg || 1)) * 100;

    if (change > 10) {
      trend = 'rising';
    } else if (change < -10) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    return {
      keyword,
      averageInterest,
      peakInterest,
      trend,
    };
  });

  return {
    keywords,
    timelineData,
    summary,
  };
}

// Default categories for business-relevant trends (excludes Sports, Entertainment)
// See: https://serpapi.com/google-trends-api for category IDs
export const DEFAULT_TREND_CATEGORIES = [
  5,   // Technology
  8,   // Science
  12,  // Business
  45,  // Health
  7,   // Finance
  13,  // Computers & Electronics
  29,  // Home & Garden
  66,  // Food & Drink
];

/**
 * Get trending searches for a specific country
 *
 * Uses the new SerpAPI Trending Now endpoint (2024+).
 * @see https://serpapi.com/google-trends-trending-now
 *
 * @param geo - Country code (e.g., 'US')
 * @param options.hours - Hours of trending data: 4, 24, 48, or 168 (default: 24)
 * @param options.category - Category ID to filter by (see DEFAULT_TREND_CATEGORIES)
 * @param options.onlyActive - Filter to only active trending searches
 */
export async function getTrendingNow(
  geo: string = 'US',
  options: {
    hours?: 4 | 24 | 48 | 168; // Hours of trending data
    category?: number; // Category ID for filtering
    onlyActive?: boolean; // Filter to active trends only
  } = {}
): Promise<{
  trending: {
    title: string;
    traffic: string;
    articles: { title: string; url: string }[];
  }[];
}> {
  const config = getConfig();

  const urlParams: Record<string, string | number | undefined> = {
    engine: 'google_trends_trending_now',
    geo,
    api_key: config.apiKey,
  };

  // Add hours parameter (default: 24)
  if (options.hours) {
    urlParams.hours = options.hours;
  }

  // Add category filter (new param name is category_id)
  if (options.category !== undefined) {
    urlParams.category_id = options.category;
  }

  // Add only_active filter (string 'true' for URL param)
  if (options.onlyActive) {
    urlParams.only_active = 'true';
  }

  const url = buildUrl(urlParams);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(config.timeout || 30000),
  });

  if (!response.ok) {
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch {
      errorBody = '(unable to read response body)';
    }
    console.error(`[SerpAPI] getTrendingNow request failed:`, {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
      geo,
      hours: options.hours,
      category: options.category,
    });
    throw new Error(`SerpAPI getTrendingNow request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = (await response.json()) as {
    trending_searches?: {
      query?: string;
      traffic?: string;
      articles?: { title?: string; link?: string }[];
    }[];
  };

  // Parse trending data - NO artificial limit, return all results from API
  const trending = (data.trending_searches || []).map((item: {
    query?: string;
    traffic?: string;
    articles?: { title?: string; link?: string }[];
  }) => ({
    title: item.query || '',
    traffic: item.traffic || '0',
    articles: (item.articles || []).slice(0, 3).map((a: { title?: string; link?: string }) => ({
      title: a.title || '',
      url: a.link || '',
    })),
  }));

  console.log(`[SerpAPI] getTrendingNow returned ${trending.length} results (geo=${geo}, hours=${options.hours || 24}, category=${options.category ?? 'all'})`);

  return { trending };
}

/**
 * Get expanded trending data by combining multiple sources:
 * 1. Short-term trending (4 hours) - most recent spikes
 * 2. Medium-term trending (24 hours) - today's trends
 * 3. Longer-term trending (168 hours / 7 days) - broader coverage
 * 4. Related queries for top trending items
 *
 * Returns deduplicated list of all queries found.
 *
 * NOTE: Historical date-based fetching removed - SerpAPI deprecated that endpoint.
 * Now uses hours parameter: 4, 24, 48, or 168.
 *
 * @param options.categories - Category IDs to fetch (default: DEFAULT_TREND_CATEGORIES)
 *                            Set to empty array [] to fetch all categories (no filter)
 * @param options.hours - Which hour windows to fetch (default: [24, 168])
 */
export async function getTrendingExpanded(
  geo: string = 'US',
  options: {
    relatedQueriesForTopN?: number; // Fetch related queries for top N trending (default: 10)
    timeRange?: string; // Time range for related queries (default: 'today 3-m')
    categories?: number[]; // Category IDs (default: DEFAULT_TREND_CATEGORIES, [] for all)
    hours?: (4 | 24 | 48 | 168)[]; // Hour windows to fetch (default: [24, 168])
  } = {}
): Promise<{
  queries: string[];
  sources: {
    trending: number; // Combined trending results
    related: number;
  };
}> {
  const relatedQueriesForTopN = options.relatedQueriesForTopN ?? 10;
  const timeRange = options.timeRange ?? 'today 3-m';
  // Default to business-relevant categories; empty array means no filter
  const categories = options.categories ?? DEFAULT_TREND_CATEGORIES;
  // Default: fetch 24h and 7-day trends
  const hoursWindows = options.hours ?? [24, 168];
  const config = getConfig();

  const allQueries = new Set<string>();
  const sources = { trending: 0, related: 0 };

  // Helper to fetch trending with optional category filter
  const fetchTrendingForHours = async (hours: 4 | 24 | 48 | 168) => {
    if (categories.length === 0) {
      // No category filter - single fetch
      try {
        const result = await getTrendingNow(geo, { hours });
        for (const item of result.trending) {
          if (item.title) {
            allQueries.add(item.title.toLowerCase());
            sources.trending++;
          }
        }
      } catch (error) {
        console.warn(`[SerpAPI] Failed to fetch ${hours}h trending:`, error);
      }
    } else {
      // Fetch each category separately and merge
      for (const category of categories) {
        try {
          const result = await getTrendingNow(geo, { hours, category });
          for (const item of result.trending) {
            if (item.title) {
              allQueries.add(item.title.toLowerCase());
              sources.trending++;
            }
          }
        } catch (error) {
          console.warn(`[SerpAPI] Failed to fetch ${hours}h trending for category ${category}:`, error);
        }
      }
    }
  };

  console.log(`[SerpAPI] getTrendingExpanded using categories: ${categories.length > 0 ? categories.join(', ') : 'all'}, hours: ${hoursWindows.join(', ')}`);

  // Fetch trending for each time window
  for (const hours of hoursWindows) {
    await fetchTrendingForHours(hours);
  }

  // Fetch related queries for top N trending items
  const topQueries = Array.from(allQueries).slice(0, relatedQueriesForTopN);

  for (const query of topQueries) {
    try {
      const relatedData = await fetchRelatedData(
        query,
        { geo, timeRange },
        config
      );

      for (const related of relatedData.queries) {
        if (related.query) {
          allQueries.add(related.query.toLowerCase());
          sources.related++;
        }
      }
    } catch (error) {
      console.warn(`[SerpAPI] Failed to fetch related queries for "${query}":`, error);
    }
  }

  console.log(`[SerpAPI] getTrendingExpanded found ${allQueries.size} unique queries:`, sources);

  return {
    queries: Array.from(allQueries),
    sources,
  };
}

/**
 * Fetch related rising queries for multiple seed queries
 * Used for Stage 1.75 expansion - find more pain-point queries from filtered candidates
 *
 * @param queries - Seed queries to expand (typically filtered candidates)
 * @param options.geo - Country code
 * @param options.timeRange - Time range for related queries
 * @returns Deduplicated list of all rising related queries found
 */
export async function fetchRelatedRisingQueries(
  queries: string[],
  options: {
    geo?: string;
    timeRange?: string;
  } = {}
): Promise<{
  queries: string[];
  bySource: Map<string, string[]>;
}> {
  const config = getConfig();
  const geo = options.geo || 'US';
  const timeRange = options.timeRange || 'today 3-m';

  const allRelated = new Set<string>();
  const bySource = new Map<string, string[]>();

  console.log(`[SerpAPI] fetchRelatedRisingQueries expanding ${queries.length} seed queries (parallel)...`);

  // Fire all SerpAPI calls in parallel instead of sequentially
  const results = await Promise.allSettled(
    queries.map(async (query) => {
      const relatedData = await fetchRelatedData(
        query,
        { geo, timeRange },
        config
      );
      const risingQueries = relatedData.queries
        .filter((r) => r.type === 'rising' && r.query)
        .map((r) => r.query!.toLowerCase());
      return { query, risingQueries };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.risingQueries.length > 0) {
      bySource.set(result.value.query, result.value.risingQueries);
      for (const rq of result.value.risingQueries) {
        allRelated.add(rq);
      }
    } else if (result.status === 'rejected') {
      console.warn(`[SerpAPI] Failed to fetch related rising queries:`, result.reason);
    }
  }

  console.log(`[SerpAPI] fetchRelatedRisingQueries found ${allRelated.size} unique rising queries from ${bySource.size} seeds`);

  return {
    queries: Array.from(allRelated),
    bySource,
  };
}

// =============================================================================
// SEED-BASED QUERIES WITH GROWTH VALUES
// =============================================================================

/**
 * Query with growth data for early filtering
 */
export interface GrowthQuery {
  query: string;
  growth: number; // extracted_value from SerpAPI (e.g., 250 = 250% growth, 4950 = "Breakout")
  source: string; // which seed keyword this came from
}

/**
 * Fetch related rising queries for seed keywords WITH growth values preserved
 *
 * Unlike fetchRelatedRisingQueries(), this function keeps the growth percentage
 * from SerpAPI's extracted_value field, enabling early growth-based filtering.
 *
 * @param seedKeywords - Commercial seed keywords to expand
 * @param options.geo - Country code (default: US)
 * @param options.timeRange - Time range for related queries (default: today 3-m)
 * @returns Deduplicated queries with growth values and source mapping
 */
export async function fetchSeedRelatedQueries(
  seedKeywords: string[],
  options: {
    geo?: string;
    timeRange?: string;
  } = {}
): Promise<{
  queries: GrowthQuery[];
  sources: Map<string, GrowthQuery[]>;
}> {
  const config = getConfig();
  const geo = options.geo || 'US';
  const timeRange = options.timeRange || 'today 3-m';

  const allQueries = new Map<string, GrowthQuery>(); // Dedupe by query string
  const sources = new Map<string, GrowthQuery[]>();

  console.log(`[SerpAPI] fetchSeedRelatedQueries expanding ${seedKeywords.length} seed keywords...`);

  for (const seed of seedKeywords) {
    try {
      // Fetch related queries for this seed
      const url = buildUrl({
        engine: 'google_trends',
        q: seed,
        data_type: 'RELATED_QUERIES',
        date: timeRange,
        geo,
        api_key: config.apiKey,
      });

      const response = await fetch(url, {
        signal: AbortSignal.timeout(config.timeout || 30000),
      });

      if (!response.ok) {
        console.warn(`[SerpAPI] Failed to fetch related queries for seed "${seed}": ${response.status}`);
        continue;
      }

      const data = (await response.json()) as SerpApiTrendsResponse;

      // Extract RISING queries with growth values
      const risingQueries: GrowthQuery[] = [];
      for (const item of data.related_queries?.rising || []) {
        if (item.query) {
          // Rising queries have growth by definition - if extracted_value is missing, assume 200% (2x)
          // SerpAPI sometimes returns 0 or undefined for valid rising queries
          const growthValue = item.extracted_value && item.extracted_value > 0 ? item.extracted_value : 200;
          const growthQuery: GrowthQuery = {
            query: item.query.toLowerCase(),
            growth: growthValue,
            source: seed,
          };
          risingQueries.push(growthQuery);

          // Dedupe: keep highest growth value if query seen from multiple seeds
          const existing = allQueries.get(growthQuery.query);
          if (!existing || growthQuery.growth > existing.growth) {
            allQueries.set(growthQuery.query, growthQuery);
          }
        }
      }

      if (risingQueries.length > 0) {
        sources.set(seed, risingQueries);
      }

      console.log(`[SerpAPI] Seed "${seed}": found ${risingQueries.length} rising queries`);
    } catch (error) {
      console.warn(`[SerpAPI] Failed to fetch related queries for seed "${seed}":`, error);
    }
  }

  const results = Array.from(allQueries.values());
  console.log(`[SerpAPI] fetchSeedRelatedQueries found ${results.length} unique queries from ${sources.size} seeds`);

  return {
    queries: results,
    sources,
  };
}

/**
 * Batch fetch trend data for multiple keywords using a single API call
 *
 * Uses SerpAPI's multi-keyword comparison feature (comma-separated q parameter)
 * which is more efficient than individual requests.
 *
 * @see https://serpapi.com/google-trends-api - "Interest over time chart accepts both single and multiple queries per search"
 */
export async function batchGetTrendData(
  keywords: string[],
  options: {
    geo?: string;
    timeRange?: string;
    category?: number;
    delayMs?: number; // Only used if we need to split into batches
  } = {}
): Promise<Map<string, TrendData | Error>> {
  const results = new Map<string, TrendData | Error>();

  if (keywords.length === 0) {
    return results;
  }

  const config = getConfig();
  const delayMs = options.delayMs || 500;

  // SerpAPI allows up to 5 keywords per comparison request
  const MAX_KEYWORDS_PER_REQUEST = 5;
  const batches: string[][] = [];

  for (let i = 0; i < keywords.length; i += MAX_KEYWORDS_PER_REQUEST) {
    batches.push(keywords.slice(i, i + MAX_KEYWORDS_PER_REQUEST));
  }

  console.log(`[SerpAPI] Fetching ${keywords.length} keywords in ${batches.length} batch(es)`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    try {
      // Use comma-separated query for multiple keywords in one request
      const query = batch.join(',');

      const url = buildUrl({
        engine: 'google_trends',
        q: query,
        data_type: 'TIMESERIES',
        date: options.timeRange || 'today 12-m',
        geo: options.geo,
        cat: options.category,
        api_key: config.apiKey,
      });

      console.log(`[SerpAPI] Batch ${batchIndex + 1}/${batches.length}: Fetching ${batch.length} keywords`);

      const response = await fetch(url, {
        signal: AbortSignal.timeout(180000), // 3 minute timeout per batch (5-year data takes longer)
      });

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          errorBody = '(unable to read response body)';
        }
        console.error(`[SerpAPI] Batch ${batchIndex + 1} request failed:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
          keywords: batch,
          geo: options.geo,
        });
        throw new Error(`SerpAPI batch request failed: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data = (await response.json()) as SerpApiTrendsResponse;

      if (data.error) {
        console.error(`[SerpAPI] Batch ${batchIndex + 1} API error:`, { error: data.error, keywords: batch });
        throw new Error(`SerpAPI error: ${data.error}`);
      }

      // Parse timeline data for each keyword in the batch
      const timelineData = data.interest_over_time?.timeline_data || [];

      // Process each keyword's data from the combined response
      for (const keyword of batch) {
        // Extract this keyword's values from the timeline (normalize dates to ISO format)
        const interestOverTime = timelineData.map((point) => {
          // Find this keyword's value in the values array
          const keywordValue = point.values.find(
            (v) => v.query.toLowerCase() === keyword.toLowerCase()
          );
          return {
            date: parseSerpApiDate(point.date),
            value: keywordValue?.extracted_value || 0,
          };
        });

        // Calculate average interest
        const values = interestOverTime.map((p) => p.value);
        const averageInterest = values.length > 0
          ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
          : 0;

        results.set(keyword, {
          keyword,
          interestOverTime,
          averageInterest,
          relatedQueries: [], // Skip related data for batch requests to save API calls
          relatedTopics: [],
          regionInterest: [],
        });
      }

      console.log(`[SerpAPI] Batch ${batchIndex + 1} complete: ${batch.length} keywords processed`);

    } catch (error) {
      // If batch request fails, mark all keywords in batch as errors
      console.error(`[SerpAPI] Batch ${batchIndex + 1} failed:`, error);
      for (const keyword of batch) {
        results.set(keyword, error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Add delay between batches (except for last one)
    if (batchIndex < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Check if SerpAPI is configured and available
 */
export function isSerpApiConfigured(): boolean {
  return !!process.env.SERPAPI_API_KEY;
}

// =============================================================================
// SERP SNAPSHOT FOR DAILY TREND PICK
// =============================================================================

/**
 * Parsed SERP snapshot for purchase signal analysis
 */
export interface SerpSnapshotParsed {
  adsCount: number;
  shoppingPresent: boolean;
  topStoriesPresent: boolean;
  topDomains: string[];
  snippetsSample: { title: string; snippet: string; url?: string }[];
  rawFeatures?: Record<string, unknown>;
}

/**
 * Fetch SERP snapshot for purchase signal analysis
 * Used by Daily Trend Pick to assess commercial intent
 */
export async function fetchSerpSnapshot(
  query: string,
  options: {
    geo?: string;
    device?: 'desktop' | 'mobile';
  } = {}
): Promise<SerpSnapshotParsed> {
  const config = getConfig();
  const geo = options.geo || 'us';
  const device = options.device || 'desktop';

  const url = buildUrl({
    engine: 'google',
    q: query,
    location: geo.toLowerCase() === 'us' ? 'United States' : geo,
    device,
    api_key: config.apiKey,
  });

  const response = await fetch(url, {
    signal: AbortSignal.timeout(config.timeout || 30000),
  });

  if (!response.ok) {
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch {
      errorBody = '(unable to read response body)';
    }
    console.error(`[SerpAPI] SERP request failed for query "${query}":`, {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
      geo,
      device,
    });
    throw new Error(`SerpAPI SERP request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json() as {
    ads?: Array<{ title?: string; link?: string }>;
    shopping_results?: unknown[];
    top_stories?: unknown[];
    organic_results?: Array<{
      title?: string;
      snippet?: string;
      link?: string;
      displayed_link?: string;
    }>;
    knowledge_graph?: unknown;
    answer_box?: unknown;
    local_results?: unknown;
  };

  // Extract ads count
  const adsCount = data.ads?.length || 0;

  // Check for shopping presence
  const shoppingPresent = Array.isArray(data.shopping_results) && data.shopping_results.length > 0;

  // Check for top stories (news)
  const topStoriesPresent = Array.isArray(data.top_stories) && data.top_stories.length > 0;

  // Extract top domains from organic results
  const topDomains: string[] = [];
  if (data.organic_results) {
    for (const result of data.organic_results.slice(0, 10)) {
      if (result.displayed_link) {
        // Extract domain from displayed link
        const domain = result.displayed_link.replace(/^https?:\/\//, '').split('/')[0];
        if (domain && !topDomains.includes(domain)) {
          topDomains.push(domain);
        }
      } else if (result.link) {
        try {
          const domain = new URL(result.link).hostname;
          if (!topDomains.includes(domain)) {
            topDomains.push(domain);
          }
        } catch {
          // Skip invalid URLs
        }
      }
    }
  }

  // Extract snippet samples (top 5)
  const snippetsSample: SerpSnapshotParsed['snippetsSample'] = [];
  if (data.organic_results) {
    for (const result of data.organic_results.slice(0, 5)) {
      snippetsSample.push({
        title: result.title || '',
        snippet: result.snippet || '',
        url: result.link,
      });
    }
  }

  // Collect raw features for additional analysis
  const rawFeatures: Record<string, unknown> = {};
  if (data.knowledge_graph) rawFeatures.knowledge_graph = true;
  if (data.answer_box) rawFeatures.answer_box = true;
  if (data.local_results) rawFeatures.local_results = true;

  return {
    adsCount,
    shoppingPresent,
    topStoriesPresent,
    topDomains,
    snippetsSample,
    rawFeatures: Object.keys(rawFeatures).length > 0 ? rawFeatures : undefined,
  };
}
