/**
 * Embedding Generation & Storage
 *
 * Generates embeddings using OpenAI's text-embedding-3-small model,
 * batches them, and stores to the Embedding table via Drizzle.
 * Uses upsert (ON CONFLICT DO UPDATE) for idempotent re-embedding.
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { embeddings, type EmbeddingSourceType } from '../db/schema';
import { getOpenAIClient } from './openai';
import { chunkDocument, chunkMarkdownDocument, chunkInterviewMessages, type Chunk } from './chunking';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 100; // OpenAI allows up to 2048 inputs, but 100 is optimal for throughput

export interface EmbeddingInput {
  projectId: string;
  sourceType: EmbeddingSourceType;
  sourceId: string;
  content: string;
  /** Use 'markdown' for reports, 'interview' for messages, 'plain' for everything else */
  contentType?: 'plain' | 'markdown' | 'interview';
  /** Pre-structured messages for interview content type */
  messages?: Array<{ role: string; content: string }>;
  /** Extra metadata to store with each chunk */
  metadata?: Record<string, unknown>;
}

export interface EmbeddingResult {
  chunksCreated: number;
  sourceType: EmbeddingSourceType;
  sourceId: string;
}

/**
 * Generate embeddings for a single source and store them in the database.
 * Uses upsert to handle re-embedding gracefully.
 */
export async function generateAndStoreEmbeddings(
  input: EmbeddingInput
): Promise<EmbeddingResult> {
  const { projectId, sourceType, sourceId, content, contentType = 'plain', messages, metadata } = input;

  // Skip empty content
  if (!content && !messages?.length) {
    return { chunksCreated: 0, sourceType, sourceId };
  }

  // Chunk the content based on type
  let chunks: Chunk[];
  if (contentType === 'interview' && messages?.length) {
    chunks = chunkInterviewMessages(messages);
  } else if (contentType === 'markdown') {
    chunks = chunkMarkdownDocument(content);
  } else {
    chunks = chunkDocument(content);
  }

  if (chunks.length === 0) {
    return { chunksCreated: 0, sourceType, sourceId };
  }

  // Generate embeddings in batches
  const allEmbeddings = await generateEmbeddingsBatch(chunks.map(c => c.content));

  // Delete existing embeddings for this source (clean re-embed)
  await db.delete(embeddings).where(
    and(
      eq(embeddings.sourceType, sourceType),
      eq(embeddings.sourceId, sourceId),
    )
  );

  // Insert new embeddings in batches
  const insertBatchSize = 50;
  for (let i = 0; i < chunks.length; i += insertBatchSize) {
    const batch = chunks.slice(i, i + insertBatchSize);
    const batchEmbeddings = allEmbeddings.slice(i, i + insertBatchSize);

    await db.insert(embeddings).values(
      batch.map((chunk, idx) => ({
        projectId,
        sourceType,
        sourceId,
        chunkIndex: i + idx,
        content: chunk.content,
        embedding: batchEmbeddings[idx],
        metadata: {
          ...metadata,
          ...(chunk.metadata.sectionHeader ? { sectionHeader: chunk.metadata.sectionHeader } : {}),
          startChar: chunk.metadata.startChar,
          endChar: chunk.metadata.endChar,
          model: EMBEDDING_MODEL,
        },
      }))
    );
  }

  console.log(`[Embeddings] Stored ${chunks.length} chunks for ${sourceType}:${sourceId}`);
  return { chunksCreated: chunks.length, sourceType, sourceId };
}

/**
 * Generate embeddings for multiple sources (e.g., after a research pipeline completes).
 */
export async function generateEmbeddingsForProject(
  inputs: EmbeddingInput[]
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  for (const input of inputs) {
    try {
      const result = await generateAndStoreEmbeddings(input);
      results.push(result);
    } catch (error) {
      console.error(
        `[Embeddings] Failed to embed ${input.sourceType}:${input.sourceId}:`,
        error instanceof Error ? error.message : error
      );
      results.push({ chunksCreated: 0, sourceType: input.sourceType, sourceId: input.sourceId });
    }
  }

  return results;
}

/**
 * Delete all embeddings for a specific source (used before re-embedding).
 */
export async function deleteEmbeddingsForSource(
  sourceType: EmbeddingSourceType,
  sourceId: string
): Promise<number> {
  const result = await db.delete(embeddings).where(
    and(
      eq(embeddings.sourceType, sourceType),
      eq(embeddings.sourceId, sourceId),
    )
  ).returning({ id: embeddings.id });

  return result.length;
}

/**
 * Delete all embeddings for a project.
 */
export async function deleteEmbeddingsForProject(projectId: string): Promise<number> {
  const result = await db.delete(embeddings).where(
    eq(embeddings.projectId, projectId)
  ).returning({ id: embeddings.id });

  return result.length;
}

/**
 * Generate a single embedding vector for a query string.
 * Used by vector-search for query embedding.
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
  });
  return response.data[0].embedding;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Generate embeddings for an array of text chunks using OpenAI's API.
 * Handles batching automatically.
 */
async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const openai = getOpenAIClient();
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    for (const item of response.data) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}
