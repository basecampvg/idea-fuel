'use client';

interface ComparisonRow {
  key: string;
  name: string;
  category?: string;
  values: Record<string, { value: string | null; name: string }>;
}

interface ScenarioComparisonProps {
  scenarioIds: string[];
  comparison: ComparisonRow[];
}

export function ScenarioComparison({ scenarioIds, comparison }: ScenarioComparisonProps) {
  if (comparison.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground/60">
        No assumptions to compare.
      </div>
    );
  }

  // Get scenario names from first row
  const scenarioNames = scenarioIds.map((id) => {
    const firstRow = comparison[0];
    return firstRow?.values[id]?.name ?? id.slice(0, 8);
  });

  // Group by category
  const categories = new Map<string, ComparisonRow[]>();
  for (const row of comparison) {
    const cat = row.category ?? 'Other';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(row);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pl-3 pr-4 text-xs font-medium text-muted-foreground/60 w-[200px]">
              Assumption
            </th>
            {scenarioNames.map((name, i) => (
              <th key={scenarioIds[i]} className="text-right py-2 px-3 text-xs font-medium text-muted-foreground/60">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from(categories.entries()).map(([category, rows]) => (
            <CategoryGroup
              key={category}
              category={category}
              rows={rows}
              scenarioIds={scenarioIds}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoryGroup({
  category,
  rows,
  scenarioIds,
}: {
  category: string;
  rows: ComparisonRow[];
  scenarioIds: string[];
}) {
  return (
    <>
      <tr>
        <td
          colSpan={scenarioIds.length + 1}
          className="py-2 pl-3 text-xs font-semibold text-muted-foreground/80 bg-muted/20"
        >
          {category}
        </td>
      </tr>
      {rows.map((row) => {
        const vals = scenarioIds.map((id) => row.values[id]?.value ?? '—');
        const allSame = vals.every((v) => v === vals[0]);

        return (
          <tr key={row.key} className="border-b border-border/30 hover:bg-muted/10">
            <td className="py-1.5 pl-6 pr-4 text-muted-foreground">{row.name}</td>
            {vals.map((val, i) => (
              <td
                key={scenarioIds[i]}
                className={`py-1.5 px-3 text-right font-mono tabular-nums text-xs ${
                  allSame ? 'text-muted-foreground/60' : 'text-foreground font-medium'
                }`}
              >
                {val}
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}
