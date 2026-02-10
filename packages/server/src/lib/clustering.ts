/**
 * Clustering Module for Daily Trend Pick
 *
 * Implements deterministic clustering using OpenAI embeddings:
 * - Cosine similarity matrix
 * - Agglomerative clustering with fixed threshold
 * - Canonical query selection
 * - Title generation
 */

import { getOpenAIClient } from './openai';

const openai = new Proxy({} as ReturnType<typeof getOpenAIClient>, {
  get(_target, prop) {
    return (getOpenAIClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Clustering configuration
const SIMILARITY_THRESHOLD = 0.70; // Cosine similarity threshold for clustering (lowered from 0.82 for diverse trending queries)
const MIN_CLUSTER_SIZE = 1; // Allow single queries to compete (they just won't have cluster reinforcement)
const MAX_CLUSTER_SIZE = 20;
const TARGET_MIN_SIZE = 3;
const TARGET_MAX_SIZE = 10;

export interface ClusterResult {
  title: string;
  canonicalQuery: string;
  memberQueries: string[];
}

/**
 * Get embeddings for a list of queries
 */
async function getEmbeddings(queries: string[]): Promise<Map<string, number[]>> {
  const embeddings = new Map<string, number[]>();

  // Batch requests (OpenAI allows up to 2048 inputs)
  const batchSize = 100;
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    });

    for (let j = 0; j < batch.length; j++) {
      embeddings.set(batch[j], response.data[j].embedding);
    }
  }

  return embeddings;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

/**
 * Build similarity matrix for all queries
 */
function buildSimilarityMatrix(
  queries: string[],
  embeddings: Map<string, number[]>
): number[][] {
  const n = queries.length;
  const matrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else {
        const embA = embeddings.get(queries[i]);
        const embB = embeddings.get(queries[j]);
        if (embA && embB) {
          const sim = cosineSimilarity(embA, embB);
          matrix[i][j] = sim;
          matrix[j][i] = sim;
        }
      }
    }
  }

  return matrix;
}

/**
 * Agglomerative clustering with single-linkage
 */
function agglomerativeClustering(
  queries: string[],
  similarityMatrix: number[][],
  threshold: number
): string[][] {
  const n = queries.length;

  // Each query starts in its own cluster
  let clusters: Set<number>[] = queries.map((_, i) => new Set([i]));

  // Keep merging until no pair exceeds threshold
  let merged = true;
  while (merged) {
    merged = false;

    // Find the most similar pair of clusters
    let bestI = -1;
    let bestJ = -1;
    let bestSim = threshold;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        // Calculate average linkage similarity
        let totalSim = 0;
        let count = 0;
        for (const a of clusters[i]) {
          for (const b of clusters[j]) {
            totalSim += similarityMatrix[a][b];
            count++;
          }
        }
        const avgSim = totalSim / count;

        // Check if this would create a valid-sized cluster
        const mergedSize = clusters[i].size + clusters[j].size;
        if (mergedSize <= MAX_CLUSTER_SIZE && avgSim > bestSim) {
          bestSim = avgSim;
          bestI = i;
          bestJ = j;
        }
      }
    }

    // Merge the best pair if found
    if (bestI !== -1 && bestJ !== -1) {
      for (const idx of clusters[bestJ]) {
        clusters[bestI].add(idx);
      }
      clusters.splice(bestJ, 1);
      merged = true;
    }
  }

  // Convert back to query strings
  return clusters.map((cluster) =>
    Array.from(cluster).map((idx) => queries[idx])
  );
}

/**
 * Select canonical query for a cluster
 * Uses the medoid (query with lowest average distance to others)
 */
function selectCanonicalQuery(
  members: string[],
  embeddings: Map<string, number[]>
): string {
  if (members.length === 1) return members[0];

  let bestQuery = members[0];
  let bestAvgDistance = Infinity;

  for (const query of members) {
    const embedding = embeddings.get(query);
    if (!embedding) continue;

    let totalDistance = 0;
    for (const other of members) {
      if (other === query) continue;
      const otherEmb = embeddings.get(other);
      if (otherEmb) {
        // Distance = 1 - similarity
        totalDistance += 1 - cosineSimilarity(embedding, otherEmb);
      }
    }

    const avgDistance = totalDistance / (members.length - 1);
    if (avgDistance < bestAvgDistance) {
      bestAvgDistance = avgDistance;
      bestQuery = query;
    }
  }

  return bestQuery;
}

/**
 * Generate cluster title from member queries
 * Uses simple heuristic: extract common words/ngrams
 */
function generateClusterTitle(members: string[]): string {
  if (members.length === 1) return members[0];

  // Tokenize all queries
  const allTokens = members.flatMap((q) =>
    q
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );

  // Count token frequency
  const tokenCounts = new Map<string, number>();
  for (const token of allTokens) {
    tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
  }

  // Find tokens that appear in at least 40% of queries
  const threshold = Math.ceil(members.length * 0.4);
  const commonTokens = Array.from(tokenCounts.entries())
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([token]) => token);

  if (commonTokens.length > 0) {
    // Capitalize first letter
    const title = commonTokens.join(' ');
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  // Fallback: use shortest query
  const shortest = members.reduce((a, b) => (a.length <= b.length ? a : b));
  return shortest.charAt(0).toUpperCase() + shortest.slice(1);
}

/**
 * Main clustering function
 * Sorts inputs lexicographically for determinism
 */
export async function clusterQueries(
  queries: string[],
  options: {
    threshold?: number;
  } = {}
): Promise<ClusterResult[]> {
  if (queries.length === 0) return [];

  const threshold = options.threshold ?? SIMILARITY_THRESHOLD;

  // Sort lexicographically for determinism
  const sortedQueries = [...queries].sort();

  // Get embeddings
  console.log(`[Clustering] Getting embeddings for ${sortedQueries.length} queries...`);
  const embeddings = await getEmbeddings(sortedQueries);

  // Build similarity matrix
  console.log('[Clustering] Building similarity matrix...');
  const similarityMatrix = buildSimilarityMatrix(sortedQueries, embeddings);

  // Perform clustering
  console.log(`[Clustering] Clustering with threshold ${threshold}...`);
  const rawClusters = agglomerativeClustering(
    sortedQueries,
    similarityMatrix,
    threshold
  );

  // Filter clusters by minimum size
  const validClusters = rawClusters.filter(
    (cluster) => cluster.length >= MIN_CLUSTER_SIZE
  );

  console.log(
    `[Clustering] Found ${validClusters.length} clusters (from ${rawClusters.length} raw)`
  );

  // Build final cluster results
  const results: ClusterResult[] = validClusters.map((members) => ({
    title: generateClusterTitle(members),
    canonicalQuery: selectCanonicalQuery(members, embeddings),
    memberQueries: members,
  }));

  return results;
}

/**
 * Get cluster size penalty for scoring
 */
export function getClusterSizePenalty(size: number): number {
  if (size < TARGET_MIN_SIZE) return -10;
  if (size > TARGET_MAX_SIZE) return -5;
  return 0;
}
