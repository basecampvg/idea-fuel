/**
 * Vector Search — pgvector similarity search using Drizzle native queries
 *
 * Uses cosineDistance() from drizzle-orm for similarity ranking.
 * Filters by projectId and optional sourceTypes for scoped search.
 */

import { sql, and, eq, inArray, gt, desc } from 'drizzle-orm';
import { cosineDistance } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { embeddings, type EmbeddingSourceType } from '../db/schema';
import { generateQueryEmbedding } from './embeddings';

export interface SearchOptions {
  projectId: string;
  query: string;
  limit?: number;
  threshold?: number;
  sourceTypes?: EmbeddingSourceType[];
}

export interface SearchResult {
  id: string;
  sourceType: EmbeddingSourceType;
  sourceId: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown> | null;
  chunkIndex: number;
}

/**
 * Search project embeddings by semantic similarity.
 *
 * Generates an embedding for the query string, then uses pgvector's
 * cosine distance operator to find the most similar chunks.
 */
export async function searchProjectEmbeddings(
  options: SearchOptions
): Promise<SearchResult[]> {
  const {
    projectId,
    query,
    limit = 8,
    threshold = 0.7,
    sourceTypes,
  } = options;

  // Generate embedding for the search query
  const queryEmbedding = await generateQueryEmbedding(query);

  // Build the similarity expression: 1 - cosineDistance
  const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, queryEmbedding)})`;

  // Build WHERE conditions
  const conditions = [
    eq(embeddings.projectId, projectId),
    gt(similarity, threshold),
  ];

  if (sourceTypes && sourceTypes.length > 0) {
    conditions.push(inArray(embeddings.sourceType, sourceTypes));
  }

  // Execute the query
  const results = await db
    .select({
      id: embeddings.id,
      sourceType: embeddings.sourceType,
      sourceId: embeddings.sourceId,
      content: embeddings.content,
      similarity,
      metadata: embeddings.metadata,
      chunkIndex: embeddings.chunkIndex,
    })
    .from(embeddings)
    .where(and(...conditions))
    .orderBy(desc(similarity))
    .limit(limit);

  return results.map(r => ({
    ...r,
    similarity: Number(r.similarity),
  }));
}

/**
 * Get all embedding chunk counts grouped by source type for a project.
 * Useful for the agent to understand what data is available.
 */
export async function getProjectEmbeddingStats(projectId: string): Promise<
  Array<{ sourceType: EmbeddingSourceType; count: number }>
> {
  const results = await db
    .select({
      sourceType: embeddings.sourceType,
      count: sql<number>`count(*)::int`,
    })
    .from(embeddings)
    .where(eq(embeddings.projectId, projectId))
    .groupBy(embeddings.sourceType);

  return results;
}
