/**
 * Document Chunking for Embedding Pipeline
 *
 * Splits text into overlapping chunks for vector embedding.
 * Uses sentence-boundary-aware splitting for better semantic coherence.
 */

export interface Chunk {
  content: string;
  metadata: {
    startChar: number;
    endChar: number;
    sectionHeader?: string;
  };
}

export interface ChunkOptions {
  maxChunkSize?: number;  // Default: 1500 chars
  overlap?: number;       // Default: 300 chars
}

const DEFAULT_MAX_CHUNK_SIZE = 1500;
const DEFAULT_OVERLAP = 300;

/**
 * Chunk a document into overlapping segments.
 * Prefers splitting at sentence boundaries (. ! ? \n\n) to preserve meaning.
 */
export function chunkDocument(text: string, options?: ChunkOptions): Chunk[] {
  const maxSize = options?.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE;
  const overlap = options?.overlap ?? DEFAULT_OVERLAP;

  if (!text || text.trim().length === 0) return [];
  if (text.length <= maxSize) {
    return [{ content: text.trim(), metadata: { startChar: 0, endChar: text.length } }];
  }

  const chunks: Chunk[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);

    // If not at the end, try to find a good break point
    if (end < text.length) {
      const breakPoint = findBreakPoint(text, start, end);
      if (breakPoint > start) {
        end = breakPoint;
      }
    }

    const content = text.slice(start, end).trim();
    if (content.length > 0) {
      chunks.push({
        content,
        metadata: { startChar: start, endChar: end },
      });
    }

    // Move forward by (chunk size - overlap) to create overlapping windows
    start = end - overlap;
    if (start >= text.length) break;
    // Ensure we always make forward progress
    if (start <= chunks[chunks.length - 1]?.metadata.startChar) {
      start = end;
    }
  }

  return chunks;
}

/**
 * Chunk a Markdown document by sections, then sub-chunk large sections.
 * Preserves section headers in metadata for citation.
 */
export function chunkMarkdownDocument(markdown: string, options?: ChunkOptions): Chunk[] {
  const maxSize = options?.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE;
  const sections = splitByMarkdownHeaders(markdown);
  const chunks: Chunk[] = [];

  for (const section of sections) {
    if (section.content.length <= maxSize) {
      chunks.push({
        content: section.content.trim(),
        metadata: {
          startChar: section.startChar,
          endChar: section.startChar + section.content.length,
          sectionHeader: section.header,
        },
      });
    } else {
      // Sub-chunk large sections
      const subChunks = chunkDocument(section.content, options);
      for (const sub of subChunks) {
        chunks.push({
          content: sub.content,
          metadata: {
            startChar: section.startChar + sub.metadata.startChar,
            endChar: section.startChar + sub.metadata.endChar,
            sectionHeader: section.header,
          },
        });
      }
    }
  }

  return chunks.filter(c => c.content.length > 0);
}

/**
 * Chunk interview messages by conversation turns.
 * Each chunk is one user-assistant exchange.
 */
export function chunkInterviewMessages(
  messages: Array<{ role: string; content: string }>
): Chunk[] {
  const chunks: Chunk[] = [];
  let currentChunk = '';
  let startChar = 0;
  let charOffset = 0;

  for (const msg of messages) {
    const formatted = `${msg.role}: ${msg.content}\n\n`;
    currentChunk += formatted;

    // Flush after each assistant response (one full exchange)
    if (msg.role === 'assistant' && currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: { startChar, endChar: charOffset + formatted.length },
      });
      startChar = charOffset + formatted.length;
      currentChunk = '';
    }
    charOffset += formatted.length;
  }

  // Flush remaining
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: { startChar, endChar: charOffset },
    });
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function findBreakPoint(text: string, start: number, maxEnd: number): number {
  // Search backwards from maxEnd for a good break point
  const searchRegion = text.slice(start, maxEnd);

  // Priority: paragraph break (\n\n)
  const paragraphBreak = searchRegion.lastIndexOf('\n\n');
  if (paragraphBreak > searchRegion.length * 0.5) {
    return start + paragraphBreak + 2;
  }

  // Then: sentence end (. ! ?)
  const sentenceEnd = findLastSentenceEnd(searchRegion);
  if (sentenceEnd > searchRegion.length * 0.5) {
    return start + sentenceEnd;
  }

  // Then: line break
  const lineBreak = searchRegion.lastIndexOf('\n');
  if (lineBreak > searchRegion.length * 0.5) {
    return start + lineBreak + 1;
  }

  // Fallback: word boundary
  const wordBreak = searchRegion.lastIndexOf(' ');
  if (wordBreak > searchRegion.length * 0.5) {
    return start + wordBreak + 1;
  }

  return maxEnd;
}

function findLastSentenceEnd(text: string): number {
  // Match sentence-ending punctuation followed by space or end
  const matches = [...text.matchAll(/[.!?]\s/g)];
  if (matches.length === 0) return -1;
  const last = matches[matches.length - 1];
  return (last.index ?? -1) + 2;  // Include the space after punctuation
}

interface MarkdownSection {
  header?: string;
  content: string;
  startChar: number;
}

function splitByMarkdownHeaders(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const headerRegex = /^(#{1,3})\s+(.+)$/gm;
  let lastIndex = 0;
  let lastHeader: string | undefined;

  let match;
  while ((match = headerRegex.exec(markdown)) !== null) {
    // Push content before this header
    if (match.index > lastIndex) {
      const content = markdown.slice(lastIndex, match.index);
      if (content.trim().length > 0) {
        sections.push({ header: lastHeader, content, startChar: lastIndex });
      }
    }
    lastHeader = match[2];
    lastIndex = match.index;
  }

  // Push remaining content
  if (lastIndex < markdown.length) {
    const content = markdown.slice(lastIndex);
    if (content.trim().length > 0) {
      sections.push({ header: lastHeader, content, startChar: lastIndex });
    }
  }

  return sections;
}
