'use client';

import { BarChart3 } from 'lucide-react';

export default function BusinessPlanReportPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <BarChart3 className="w-7 h-7 text-accent/50" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Business Plan</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        Coming soon. This report will provide a comprehensive business plan for your idea.
      </p>
    </div>
  );
}
