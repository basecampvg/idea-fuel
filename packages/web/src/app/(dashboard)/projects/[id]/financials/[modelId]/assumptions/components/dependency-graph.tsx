'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { ConnectionLines } from './connection-lines';
import type { AssumptionCategory, AssumptionConfidence } from '@forge/shared';

interface AssumptionNode {
  key: string;
  name: string;
  category: AssumptionCategory;
  confidence: AssumptionConfidence;
  dependsOn: string[];
  value: string | null;
}

// Static section labels for the right column
const SECTION_LABELS: Record<string, string> = {
  executiveSummary: 'Executive Summary',
  problem: 'Problem',
  solution: 'Solution',
  marketSize: 'Market Size',
  pricingStrategy: 'Pricing Strategy',
  customerAcquisition: 'Customer Acquisition',
  financialProjections: 'Financial Projections',
  costStructure: 'Cost Structure',
  revenueStreams: 'Revenue Streams',
  marketingStrategy: 'Marketing Strategy',
  competitiveAdvantage: 'Competitive Advantage',
};

const CONFIDENCE_COLORS: Record<AssumptionConfidence, string> = {
  USER: 'border-l-primary',
  RESEARCHED: 'border-l-green-500',
  AI_ESTIMATE: 'border-l-amber-500',
  CALCULATED: 'border-l-violet-400',
};

interface DependencyGraphProps {
  assumptions: AssumptionNode[];
  impactMap: Record<string, string[]>;
  onClose: () => void;
}

const NODE_HEIGHT = 32;
const NODE_GAP = 6;
const LEFT_COL_WIDTH = 200;
const RIGHT_COL_WIDTH = 180;
const GAP_BETWEEN = 160;

export function DependencyGraph({ assumptions, impactMap, onClose }: DependencyGraphProps) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Collect all sections that are impacted
  const sections = useMemo(() => {
    const sectionSet = new Set<string>();
    for (const a of assumptions) {
      const impacts = impactMap[a.key] ?? [];
      for (const s of impacts) sectionSet.add(s);
    }
    return [...sectionSet].sort();
  }, [assumptions, impactMap]);

  // Build connection list
  const connections = useMemo(() => {
    const conns: { fromIndex: number; toIndex: number; isDirect: boolean }[] = [];
    for (let i = 0; i < assumptions.length; i++) {
      const impacts = impactMap[assumptions[i].key] ?? [];
      for (const sectionKey of impacts) {
        const sectionIdx = sections.indexOf(sectionKey);
        if (sectionIdx >= 0) {
          conns.push({ fromIndex: i, toIndex: sectionIdx, isDirect: true });
        }
      }
    }
    return conns;
  }, [assumptions, impactMap, sections]);

  // Compute node positions
  const leftPositions = useMemo(() =>
    assumptions.map((_, i) => ({
      x: LEFT_COL_WIDTH,
      y: i * (NODE_HEIGHT + NODE_GAP) + NODE_HEIGHT / 2,
    })),
  [assumptions]);

  const rightPositions = useMemo(() =>
    sections.map((_, i) => ({
      x: LEFT_COL_WIDTH + GAP_BETWEEN,
      y: i * (NODE_HEIGHT + NODE_GAP) + NODE_HEIGHT / 2,
    })),
  [sections]);

  // Highlight logic
  const { highlightedLeft, highlightedRight } = useMemo(() => {
    const hl = new Set<number>();
    const hr = new Set<number>();

    if (selectedLeft !== null) {
      hl.add(selectedLeft);
      const impacts = impactMap[assumptions[selectedLeft].key] ?? [];
      for (const s of impacts) {
        const idx = sections.indexOf(s);
        if (idx >= 0) hr.add(idx);
      }
    }

    if (selectedRight !== null) {
      hr.add(selectedRight);
      const sectionKey = sections[selectedRight];
      for (let i = 0; i < assumptions.length; i++) {
        const impacts = impactMap[assumptions[i].key] ?? [];
        if (impacts.includes(sectionKey)) hl.add(i);
      }
    }

    return { highlightedLeft: hl, highlightedRight: hr };
  }, [selectedLeft, selectedRight, assumptions, impactMap, sections]);

  const handleLeftClick = useCallback((idx: number) => {
    setSelectedLeft((prev) => (prev === idx ? null : idx));
    setSelectedRight(null);
  }, []);

  const handleRightClick = useCallback((idx: number) => {
    setSelectedRight((prev) => (prev === idx ? null : idx));
    setSelectedLeft(null);
  }, []);

  const totalHeight = Math.max(
    assumptions.length * (NODE_HEIGHT + NODE_GAP),
    sections.length * (NODE_HEIGHT + NODE_GAP),
  );
  const totalWidth = LEFT_COL_WIDTH + GAP_BETWEEN + RIGHT_COL_WIDTH;

  const hasHighlight = highlightedLeft.size > 0 || highlightedRight.size > 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Dependency Graph</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Click an assumption or section to trace connections
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Graph */}
      <div ref={containerRef} className="p-6 overflow-x-auto">
        <div className="relative" style={{ width: totalWidth, height: totalHeight }}>
          {/* SVG connections */}
          <ConnectionLines
            connections={connections}
            leftPositions={leftPositions}
            rightPositions={rightPositions}
            highlightedLeft={highlightedLeft}
            highlightedRight={highlightedRight}
            width={totalWidth}
            height={totalHeight}
          />

          {/* Left column: Assumptions */}
          {assumptions.map((a, i) => {
            const dimmed = hasHighlight && !highlightedLeft.has(i);
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => handleLeftClick(i)}
                className={`
                  absolute left-0 flex items-center px-2.5 rounded-md border border-border
                  text-xs font-medium transition-all duration-150 truncate
                  hover:border-foreground/20
                  ${CONFIDENCE_COLORS[a.confidence]} border-l-[3px]
                  ${highlightedLeft.has(i) ? 'bg-primary/10 border-primary/30' : 'bg-card'}
                  ${dimmed ? 'opacity-25' : ''}
                `}
                style={{
                  top: i * (NODE_HEIGHT + NODE_GAP),
                  width: LEFT_COL_WIDTH - 8,
                  height: NODE_HEIGHT,
                }}
              >
                {a.name}
              </button>
            );
          })}

          {/* Right column: Report sections */}
          {sections.map((sectionKey, i) => {
            const dimmed = hasHighlight && !highlightedRight.has(i);
            return (
              <button
                key={sectionKey}
                type="button"
                onClick={() => handleRightClick(i)}
                className={`
                  absolute flex items-center px-2.5 rounded-md border border-border
                  text-xs font-medium transition-all duration-150 truncate
                  hover:border-foreground/20
                  ${highlightedRight.has(i) ? 'bg-primary/10 border-primary/30' : 'bg-card'}
                  ${dimmed ? 'opacity-25' : ''}
                `}
                style={{
                  left: LEFT_COL_WIDTH + GAP_BETWEEN,
                  top: i * (NODE_HEIGHT + NODE_GAP),
                  width: RIGHT_COL_WIDTH,
                  height: NODE_HEIGHT,
                }}
              >
                {SECTION_LABELS[sectionKey] ?? sectionKey}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
