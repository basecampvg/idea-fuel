'use client';

import { Check, Database, Sparkles, FileText, Save, Loader2 } from 'lucide-react';

const BP_STEPS = [
  { key: 'LOADING_DATA', label: 'Loading research data', icon: Database },
  { key: 'SUMMARIZING', label: 'Summarizing research', icon: Sparkles },
  { key: 'WRITING', label: 'Writing business plan', icon: FileText },
  { key: 'SAVING', label: 'Saving results', icon: Save },
] as const;

const STEP_PROGRESS: Record<string, number> = {
  LOADING_DATA: 10,
  SUMMARIZING: 30,
  WRITING: 55,
  SAVING: 90,
};

interface GenerationStepperProps {
  subStatus: string | null;
}

export function GenerationStepper({ subStatus }: GenerationStepperProps) {
  const currentIndex = BP_STEPS.findIndex((s) => s.key === subStatus);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  const progress = subStatus ? (STEP_PROGRESS[subStatus] ?? 10) : 5;

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Generating Business Plan</h2>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {BP_STEPS.map((step, index) => {
            const isComplete = index < activeIndex;
            const isCurrent = index === activeIndex;
            const Icon = step.icon;

            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-primary/10 border border-primary/30'
                    : isComplete
                    ? 'bg-primary/5 border border-transparent'
                    : 'bg-card border border-transparent opacity-50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isComplete
                      ? 'bg-primary/20'
                      : isCurrent
                      ? 'bg-primary/20'
                      : 'bg-muted'
                  }`}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4 text-primary" strokeWidth={3} />
                  ) : (
                    <Icon
                      className={`w-4 h-4 ${
                        isCurrent ? 'text-primary/70' : 'text-muted-foreground/70'
                      }`}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      isComplete
                        ? 'text-primary'
                        : isCurrent
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </p>
                  {isCurrent && (
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-primary/20">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300 animate-pulse"
                        style={{ width: '60%' }}
                      />
                    </div>
                  )}
                </div>

                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                    isComplete
                      ? 'bg-primary/20 text-primary'
                      : isCurrent
                      ? 'bg-primary/20 text-primary/70'
                      : 'text-muted-foreground/70'
                  }`}
                >
                  {isComplete ? 'Done' : isCurrent ? 'Running' : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>This typically takes 2-5 minutes.</span>
        </div>
      </div>
    </div>
  );
}
