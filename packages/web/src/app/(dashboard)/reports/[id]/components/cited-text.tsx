'use client';

import { useMemo } from 'react';
import { CitationMarker } from './citation-marker';
import type { ReportCitation } from '@forge/shared';

interface CitedTextProps {
  text: string;
  citations: ReportCitation[];
}

interface TextSegment {
  text: string;
  citation?: { citation: ReportCitation; index: number };
}

/**
 * Renders text with inline citation markers.
 * Matches citation claims against the text content and inserts
 * superscript markers at each match location.
 */
export function CitedText({ text, citations }: CitedTextProps) {
  const segments = useMemo(() => buildSegments(text, citations), [text, citations]);

  if (segments.length === 0) return <>{text}</>;

  return (
    <>
      {segments.map((segment, i) => (
        <span key={i}>
          {segment.text}
          {segment.citation && (
            <CitationMarker
              citation={segment.citation.citation}
              index={segment.citation.index}
            />
          )}
        </span>
      ))}
    </>
  );
}

function buildSegments(text: string, citations: ReportCitation[]): TextSegment[] {
  if (citations.length === 0) return [{ text }];

  // Find all matches with their positions
  const matches: Array<{ start: number; end: number; citation: ReportCitation; index: number }> = [];

  for (let i = 0; i < citations.length; i++) {
    const citation = citations[i];
    const claim = citation.claim;
    // Case-insensitive search
    const lowerText = text.toLowerCase();
    const lowerClaim = claim.toLowerCase();
    const pos = lowerText.indexOf(lowerClaim);

    if (pos !== -1) {
      matches.push({
        start: pos,
        end: pos + claim.length,
        citation,
        index: i,
      });
    }
  }

  if (matches.length === 0) return [{ text }];

  // Sort by position, remove overlaps (keep first)
  matches.sort((a, b) => a.start - b.start);
  const nonOverlapping: typeof matches = [];
  for (const match of matches) {
    const last = nonOverlapping[nonOverlapping.length - 1];
    if (!last || match.start >= last.end) {
      nonOverlapping.push(match);
    }
  }

  // Build segments
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of nonOverlapping) {
    // Text before match
    if (match.start > cursor) {
      segments.push({ text: text.slice(cursor, match.start) });
    }
    // Matched claim text + citation marker
    segments.push({
      text: text.slice(match.start, match.end),
      citation: { citation: match.citation, index: match.index },
    });
    cursor = match.end;
  }

  // Remaining text
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}
