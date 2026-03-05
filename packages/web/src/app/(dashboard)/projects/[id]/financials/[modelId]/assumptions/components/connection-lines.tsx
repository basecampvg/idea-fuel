'use client';

import { memo } from 'react';

interface Connection {
  fromIndex: number;
  toIndex: number;
  isDirect: boolean;
}

interface ConnectionLinesProps {
  connections: Connection[];
  leftPositions: { x: number; y: number }[];
  rightPositions: { x: number; y: number }[];
  highlightedLeft: Set<number>;
  highlightedRight: Set<number>;
  width: number;
  height: number;
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

export const ConnectionLines = memo(function ConnectionLines({
  connections,
  leftPositions,
  rightPositions,
  highlightedLeft,
  highlightedRight,
  width,
  height,
}: ConnectionLinesProps) {
  const hasHighlight = highlightedLeft.size > 0 || highlightedRight.size > 0;

  return (
    <svg
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      {connections.map((conn, i) => {
        const from = leftPositions[conn.fromIndex];
        const to = rightPositions[conn.toIndex];
        if (!from || !to) return null;

        const isHighlighted = highlightedLeft.has(conn.fromIndex) || highlightedRight.has(conn.toIndex);
        const dimmed = hasHighlight && !isHighlighted;

        return (
          <path
            key={i}
            d={bezierPath(from.x, from.y, to.x, to.y)}
            fill="none"
            stroke={dimmed ? 'hsl(var(--border))' : 'hsl(var(--primary))'}
            strokeWidth={isHighlighted ? 2 : 1}
            strokeDasharray={conn.isDirect ? undefined : '4 3'}
            opacity={dimmed ? 0.15 : isHighlighted ? 0.8 : 0.3}
            className="transition-all duration-200"
          />
        );
      })}
    </svg>
  );
});
