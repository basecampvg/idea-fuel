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

  // Handle date range format (e.g., "Jan 8 – 14, 2023") - use start date
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
    throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as SerpApiTrendsResponse;

  if (data.error) {
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
    throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as SerpApiTrendsResponse;

  if (data.error) {
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

/**
 * Get trending searches for a specific country
 */
export async function getTrendingNow(
  geo: string = 'US'
): Promise<{
  trending: {
    title: string;
    traffic: string;
    articles: { title: string; url: string }[];
  }[];
}> {
  const config = getConfig();

  const url = buildUrl({
    engine: 'google_trends_trending_now',
    geo,
    api_key: config.apiKey,
  });

  const response = await fetch(url, {
    signal: AbortSignal.timeout(config.timeout || 30000),
  });

  if (!response.ok) {
    throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    trending_searches?: {
      query?: string;
      traffic?: string;
      articles?: { title?: string; link?: string }[];
    }[];
  };

  // Parse trending data
  const trending = (data.trending_searches || []).slice(0, 20).map((item: {
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

  return { trending };
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
        throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as SerpApiTrendsResponse;

      if (data.error) {
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
