'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface ScoreRadarProps {
  scores: {
    opportunity?: number | null;
    problem?: number | null;
    feasibility?: number | null;
    whyNow?: number | null;
  };
}

export function ScoreRadar({ scores }: ScoreRadarProps) {
  const data = [
    { subject: 'Opportunity', value: scores.opportunity ?? 0 },
    { subject: 'Problem', value: scores.problem ?? 0 },
    { subject: 'Feasibility', value: scores.feasibility ?? 0 },
    { subject: 'Timing', value: scores.whyNow ?? 0 },
  ];

  const avgScore = Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length);

  return (
    <div className="flex items-center gap-4">
      <div className="h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: 'hsl(var(--chart-axis))', fontSize: 10 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--chart-tooltip-bg))',
                borderColor: 'hsl(var(--chart-tooltip-border))',
                borderRadius: '8px',
                color: 'hsl(var(--chart-tooltip-text))',
              }}
              formatter={(value) => [`${value ?? 0}/100`, 'Score']}
            />
            <Radar
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        <div>
          <p className="font-display text-3xl font-black text-primary">{avgScore}</p>
          <p className="text-xs text-muted-foreground">Average Score</p>
        </div>
        {data.map((d) => (
          <div key={d.subject} className="flex items-center gap-2 text-xs">
            <span className="font-mono font-bold text-foreground tabular-nums w-6">{d.value}</span>
            <span className="text-muted-foreground">{d.subject}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
