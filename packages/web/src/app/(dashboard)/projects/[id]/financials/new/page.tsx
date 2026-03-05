'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Spinner } from '@/components/ui/spinner';
import {
  ArrowLeft,
  ArrowRight,
  Monitor,
  ShoppingCart,
  Briefcase,
  LayoutGrid,
  Check,
} from 'lucide-react';

type KnowledgeLevel = 'BEGINNER' | 'STANDARD' | 'EXPERT';

const categoryIcons: Record<string, React.ReactNode> = {
  TECH: <Monitor className="w-6 h-6" />,
  RETAIL: <ShoppingCart className="w-6 h-6" />,
  SERVICES: <Briefcase className="w-6 h-6" />,
  GENERAL: <LayoutGrid className="w-6 h-6" />,
};

const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  TECH: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
  RETAIL: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  SERVICES: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  GENERAL: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
};

const knowledgeLevels: { value: KnowledgeLevel; label: string; description: string }[] = [
  { value: 'BEGINNER', label: 'Beginner', description: '~10 key assumptions. Best for quick estimates.' },
  { value: 'STANDARD', label: 'Standard', description: '~25-40 assumptions. Good balance of detail.' },
  { value: 'EXPERT', label: 'Expert', description: '75+ assumptions. Full financial detail.' },
];

export default function NewFinancialModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const [step, setStep] = useState<'template' | 'configure'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [modelName, setModelName] = useState('');
  const [knowledgeLevel, setKnowledgeLevel] = useState<KnowledgeLevel>('BEGINNER');
  const [forecastYears, setForecastYears] = useState(5);
  const [isCreating, setIsCreating] = useState(false);

  const { data: templates, isLoading: templatesLoading } = trpc.financial.listTemplates.useQuery(undefined, { staleTime: 300_000 });
  const createMutation = trpc.financial.create.useMutation({
    onSuccess: (data) => {
      router.push(`/projects/${projectId}/financials/${data.model.id}`);
    },
    onError: () => {
      setIsCreating(false);
    },
  });

  const handleSelectTemplate = (slug: string) => {
    setSelectedTemplate(slug);
    const tpl = templates?.find((t) => t.slug === slug);
    if (tpl && !modelName) {
      setModelName(`My ${tpl.name} Model`);
    }
    setStep('configure');
  };

  const handleCreate = () => {
    if (!modelName.trim()) return;
    setIsCreating(true);
    createMutation.mutate({
      name: modelName.trim(),
      templateSlug: selectedTemplate ?? undefined,
      projectId,
      knowledgeLevel,
      forecastYears,
    });
  };

  const selectedTpl = templates?.find((t) => t.slug === selectedTemplate);

  return (
    <div className="w-full max-w-[960px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/projects/${projectId}/financials`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Models
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Create Financial Model</h1>
        <p className="mt-1 text-sm text-muted-foreground/60">
          {step === 'template'
            ? 'Choose a template to get started with pre-built assumptions'
            : 'Configure your model settings'}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-3 mb-8">
        <StepBadge number={1} label="Template" active={step === 'template'} completed={step === 'configure'} />
        <div className="h-px flex-1 bg-border" />
        <StepBadge number={2} label="Configure" active={step === 'configure'} completed={false} />
      </div>

      {/* Step 1: Template Gallery */}
      {step === 'template' && (
        <div>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates?.map((template) => {
                const colors = categoryColors[template.category] ?? categoryColors.GENERAL;
                const icon = categoryIcons[template.category] ?? categoryIcons.GENERAL;

                return (
                  <button
                    key={template.slug}
                    onClick={() => handleSelectTemplate(template.slug)}
                    className={`
                      group text-left p-5 rounded-2xl border transition-all duration-200
                      bg-card hover:bg-card/80 hover:scale-[1.02] hover:shadow-lg
                      ${colors.border}
                    `}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${colors.bg} ${colors.text} flex-shrink-0`}>
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {template.name}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground/70 line-clamp-2">
                          {template.description}
                        </p>
                        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground/50">
                          <span>{template.assumptionCounts.beginner} beginner assumptions</span>
                          <span className="text-border">|</span>
                          <span>{template.assumptionCounts.expert} expert</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}

              {/* Blank model option */}
              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  if (!modelName) setModelName('My Financial Model');
                  setStep('configure');
                }}
                className="
                  group text-left p-5 rounded-2xl border border-dashed border-border
                  transition-all duration-200 hover:border-primary/30 hover:bg-card/50
                "
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-muted/30 text-muted-foreground flex-shrink-0">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      Blank Model
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      Start from scratch with no pre-filled assumptions
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 'configure' && (
        <div className="space-y-6">
          {/* Back to templates */}
          <button
            onClick={() => setStep('template')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Change template
          </button>

          {/* Selected template info */}
          {selectedTpl && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className={`p-2 rounded-lg ${(categoryColors[selectedTpl.category] ?? categoryColors.GENERAL).bg} ${(categoryColors[selectedTpl.category] ?? categoryColors.GENERAL).text}`}>
                {categoryIcons[selectedTpl.category] ?? categoryIcons.GENERAL}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{selectedTpl.name}</p>
                <p className="text-xs text-muted-foreground/60">{selectedTpl.description}</p>
              </div>
            </div>
          )}

          {/* Model Name */}
          <div>
            <label htmlFor="model-name" className="block text-sm font-medium text-foreground mb-2">
              Model Name
            </label>
            <input
              id="model-name"
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g. My SaaS Startup"
              className="
                w-full px-4 py-2.5 rounded-xl border border-border bg-card
                text-sm text-foreground placeholder:text-muted-foreground/40
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                transition-all
              "
            />
          </div>

          {/* Knowledge Level */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Detail Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {knowledgeLevels.map((level) => {
                const isSelected = knowledgeLevel === level.value;
                const assumptionCount = selectedTpl
                  ? selectedTpl.assumptionCounts[level.value.toLowerCase() as 'beginner' | 'standard' | 'expert']
                  : null;

                return (
                  <button
                    key={level.value}
                    onClick={() => setKnowledgeLevel(level.value)}
                    className={`
                      p-4 rounded-xl border text-left transition-all
                      ${isSelected
                        ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border bg-card hover:border-border/80 hover:bg-card/80'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {level.label}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground/60">{level.description}</p>
                    {assumptionCount != null && (
                      <p className="mt-1.5 text-xs text-muted-foreground/40">
                        {assumptionCount} assumptions
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Forecast Years */}
          <div>
            <label htmlFor="forecast-years" className="block text-sm font-medium text-foreground mb-2">
              Forecast Period
            </label>
            <div className="flex items-center gap-3">
              {[3, 5, 7, 10].map((years) => (
                <button
                  key={years}
                  onClick={() => setForecastYears(years)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${forecastYears === years
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }
                  `}
                >
                  {years} years
                </button>
              ))}
            </div>
          </div>

          {/* Error display */}
          {createMutation.error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {createMutation.error.message}
            </div>
          )}

          {/* Create Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleCreate}
              disabled={isCreating || !modelName.trim()}
              className="
                inline-flex items-center gap-2 px-6 py-2.5
                bg-primary text-primary-foreground text-sm font-medium
                rounded-xl
                shadow-[0_0_20px_hsl(var(--primary)/0.3)]
                hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]
                transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isCreating ? (
                <>
                  <Spinner size="sm" />
                  Creating...
                </>
              ) : (
                <>
                  Create Model
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepBadge({ number, label, active, completed }: { number: number; label: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`
          w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all
          ${completed
            ? 'bg-primary text-primary-foreground'
            : active
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'bg-muted text-muted-foreground'
          }
        `}
      >
        {completed ? <Check className="w-3.5 h-3.5" /> : number}
      </div>
      <span className={`text-sm font-medium ${active || completed ? 'text-foreground' : 'text-muted-foreground/50'}`}>
        {label}
      </span>
    </div>
  );
}
