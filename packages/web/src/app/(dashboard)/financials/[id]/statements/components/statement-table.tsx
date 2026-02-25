'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

type PeriodView = 'monthly' | 'quarterly' | 'annual';

interface StatementLine {
  key: string;
  name: string;
  values: number[];
  isSubtotal?: boolean;
  isTotal?: boolean;
}

interface StatementTableProps {
  lines: StatementLine[];
  periods: string[];
  periodView: PeriodView;
}

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

/**
 * Filter periods based on the selected view.
 * Monthly: Y1-M* periods
 * Quarterly: Y2-Q* periods
 * Annual: Y* periods (one per year)
 */
function filterPeriods(
  periods: string[],
  lines: StatementLine[],
  view: PeriodView,
): { labels: string[]; values: (line: StatementLine) => number[] } {
  switch (view) {
    case 'monthly': {
      const indices = periods
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => p.startsWith('Y1-M'));
      return {
        labels: indices.map(({ p }) => p.replace('Y1-', '')),
        values: (line) => indices.map(({ i }) => line.values[i] ?? 0),
      };
    }
    case 'quarterly': {
      const indices = periods
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => p.includes('-Q'));
      return {
        labels: indices.map(({ p }) => p),
        values: (line) => indices.map(({ i }) => line.values[i] ?? 0),
      };
    }
    case 'annual': {
      // Aggregate: Y1 = sum of months, Y2 = sum of quarters, Y3+ = direct
      const yearMap = new Map<string, number[]>();
      for (let i = 0; i < periods.length; i++) {
        const p = periods[i];
        const year = p.match(/^Y(\d+)/)?.[1];
        if (!year) continue;
        const key = `Y${year}`;
        if (!yearMap.has(key)) yearMap.set(key, []);
        yearMap.get(key)!.push(i);
      }
      const entries = Array.from(yearMap.entries());
      return {
        labels: entries.map(([k]) => k),
        values: (line) =>
          entries.map(([, indices]) =>
            indices.reduce((sum, i) => sum + (line.values[i] ?? 0), 0),
          ),
      };
    }
  }
}

export function StatementTable({ lines, periods, periodView }: StatementTableProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const { labels, values: getValues } = useMemo(
    () => filterPeriods(periods, lines, periodView),
    [periods, lines, periodView],
  );

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (lines.length === 0 || labels.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground/60">
        No data available for this statement.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pl-3 pr-4 text-xs font-medium text-muted-foreground/60 w-[200px] sticky left-0 bg-card z-10">
              Line Item
            </th>
            {labels.map((label) => (
              <th
                key={label}
                className="text-right py-2 px-2 text-xs font-medium text-muted-foreground/60 min-w-[80px]"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const isGroupHeader = line.isSubtotal || line.isTotal;
            const isCollapsed = collapsedGroups.has(line.key);
            const lineValues = getValues(line);

            return (
              <tr
                key={line.key}
                className={`
                  border-b border-border/50 transition-colors
                  ${line.isTotal ? 'bg-muted/20 font-semibold' : ''}
                  ${line.isSubtotal ? 'font-medium' : ''}
                  ${!isGroupHeader ? 'hover:bg-muted/10' : ''}
                `}
              >
                <td className="py-2 pl-3 pr-4 sticky left-0 bg-card z-10">
                  <div className="flex items-center gap-1">
                    {isGroupHeader ? (
                      <button
                        onClick={() => toggleGroup(line.key)}
                        className="flex items-center gap-1 text-foreground"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className={line.isTotal ? 'text-foreground' : ''}>
                          {line.name}
                        </span>
                      </button>
                    ) : (
                      <span className="pl-4 text-muted-foreground">{line.name}</span>
                    )}
                  </div>
                </td>
                {lineValues.map((val, i) => (
                  <td
                    key={labels[i]}
                    className={`
                      py-2 px-2 text-right font-mono tabular-nums text-xs
                      ${val < 0 ? 'text-red-400' : 'text-foreground'}
                      ${line.isTotal ? 'font-semibold' : ''}
                      ${line.isSubtotal ? 'font-medium' : ''}
                    `}
                  >
                    {val < 0 ? `(${formatCurrency(Math.abs(val))})` : formatCurrency(val)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
