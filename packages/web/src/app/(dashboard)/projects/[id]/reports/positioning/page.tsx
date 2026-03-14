'use client';

import { useProject } from '../../components/use-project-section';
import { trpc } from '@/lib/trpc/client';
import ReactMarkdown from 'react-markdown';
import {
  Target,
  Loader2,
  AlertCircle,
  Crosshair,
  Fingerprint,
  Layers,
  Users,
  LayoutGrid,
  Quote,
  MessageSquare,
  Mic2,
  Sparkles,
  TrendingUp,
  Palette,
  PaintBucket,
  Megaphone,
  Download,
  Check,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { COVER_VARIANTS, type CoverStyleId } from './components/cover-variants';

// ============================================================================
// Types (mirroring PositioningReport from server)
// ============================================================================

interface ValuePillar {
  theme: string;
  attributes: string[];
  customerBenefit: string;
  proof: string;
}

interface CustomerPersona {
  name: string;
  role: string;
  demographics: string;
  psychographics: string;
  painPoints: string[];
  goals: string[];
  buyingTriggers: string[];
  dayInTheLife: string;
}

interface MessagingFramework {
  headline: string;
  subheadline: string;
  elevatorPitch: string;
  objectionHandlers: Array<{ objection: string; response: string }>;
}

interface ChannelMessage {
  channel: string;
  headline: string;
  subheadline: string;
  cta: string;
  rationale: string;
}

interface PositioningReport {
  competitiveAlternatives: string;
  uniqueAttributes: string;
  valuePillars: ValuePillar[];
  targetAudience: string;
  customerPersona: CustomerPersona;
  marketCategory: string;
  positioningStatement: string;
  competitivePositioning: string;
  tagline: string;
  keyMessages: string[];
  messagingFramework: MessagingFramework;
  brandVoice: string;
  brandPersonality: string[];
  trendLayer: string;
  visualStyle?: string;
  toneGuidelines?: string[];
  brandColors?: string[];
  channelMessaging?: ChannelMessage[];
}

// ============================================================================
// Helpers
// ============================================================================

function parsePositioning(raw: string | unknown | null): PositioningReport | null {
  if (!raw) return null;
  try {
    const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// ============================================================================
// Section Components
// ============================================================================

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h2 className="font-display text-lg font-extrabold uppercase text-foreground">{title}</h2>
    </div>
  );
}

function ProseBlock({ text }: { text: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground [&_strong]:text-foreground [&_li]:my-0.5">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-background border border-border p-6 print:break-inside-avoid">
      <SectionHeader icon={icon} title={title} />
      {children}
    </section>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function PositioningReportPage() {
  const { project, isLoading: projectLoading } = useProject();
  const utils = trpc.useUtils();
  const research = project?.research as Record<string, unknown> | null | undefined;
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const currentCoverStyle = (research?.positioningCoverStyle as string) ?? '1';

  // Fetch positioning report for this project
  const { data: reports } = trpc.report.listByProject.useQuery(
    { projectId: project?.id ?? '', limit: 50 },
    { enabled: !!project?.id },
  );

  const positioningReport = reports?.find((r) => r.type === 'POSITIONING');

  const coverStyleMutation = trpc.research.updatePositioningCoverStyle.useMutation({
    onSuccess: () => {
      utils.project.get.invalidate();
    },
  });

  const handleExportPdf = useCallback(() => {
    if (!project?.id) return;
    window.open(
      `/print/positioning/${project.id}?cover=${currentCoverStyle}&autoprint=true`,
      '_blank',
    );
  }, [project?.id, currentCoverStyle]);

  const generateMutation = trpc.report.generate.useMutation({
    onSuccess: () => {
      utils.report.listByProject.invalidate();
    },
    onError: (err) => {
      setTriggerError(err.message);
    },
  });

  // Poll for updates when report is generating
  const isGenerating = positioningReport?.status === 'GENERATING';
  trpc.report.listByProject.useQuery(
    { projectId: project?.id ?? '', limit: 50 },
    {
      enabled: isGenerating,
      refetchInterval: isGenerating ? 5000 : false,
    },
  );

  // Loading
  if (projectLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No research or research not complete
  if (!research || research.status !== 'COMPLETE') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
          <Target className="w-7 h-7 text-accent/50" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Positioning Strategy</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Your research must be complete before generating a positioning report.
        </p>
      </div>
    );
  }

  // Currently generating
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Generating Positioning Strategy</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Analyzing competitive alternatives, mapping value themes, and crafting your positioning.
          This typically takes 2-4 minutes.
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Processing...
        </div>
      </div>
    );
  }

  // Failed
  if (positioningReport?.status === 'FAILED') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Generation Failed</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          An error occurred while generating the positioning report.
        </p>
      </div>
    );
  }

  // Has positioning report — render the full report
  if (positioningReport?.status === 'COMPLETE') {
    const data = parsePositioning(positioningReport.content);

    if (!data) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="w-7 h-7 text-destructive mb-4" />
          <p className="text-sm text-muted-foreground">Failed to parse positioning report data.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6" id="positioning-report">
        {/* Report Header */}
        <div className="rounded-2xl bg-background border border-border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl font-extrabold text-foreground">
                  {project?.title ?? 'Positioning Strategy'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Positioning Strategy &middot; Generated by Forge AI
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowCoverPicker(!showCoverPicker)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Palette className="w-4 h-4" />
                  Cover Style
                </button>

                {showCoverPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCoverPicker(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 w-[480px] rounded-xl border border-border bg-card p-4 shadow-xl">
                      <p className="text-xs font-medium text-muted-foreground mb-3">Choose PDF cover design</p>
                      <div className="grid grid-cols-4 gap-3">
                        {COVER_VARIANTS.map(({ id, name, Component }) => {
                          const isSelected = currentCoverStyle === id;
                          return (
                            <button
                              key={id}
                              onClick={() => {
                                coverStyleMutation.mutate({
                                  researchId: research!.id as string,
                                  coverStyle: id as CoverStyleId,
                                });
                                setShowCoverPicker(false);
                              }}
                              className={`group relative rounded-lg overflow-hidden border-2 transition-all ${
                                isSelected
                                  ? 'border-primary ring-2 ring-primary/20'
                                  : 'border-border hover:border-muted-foreground/30'
                              }`}
                            >
                              <div style={{ aspectRatio: '210 / 297' }} className="relative">
                                <div className="absolute inset-0" style={{ fontSize: '4px' }}>
                                  <Component
                                    title={project?.title ?? 'Positioning Strategy'}
                                    subtitle={project?.description as string | undefined}
                                  />
                                </div>
                                {isSelected && (
                                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] text-center py-1.5 text-muted-foreground font-medium truncate px-1">
                                {name}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={handleExportPdf}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Tagline */}
        {data.tagline && (
          <div className="rounded-2xl bg-background border border-border p-6 text-center">
            <p className="text-xs font-mono uppercase tracking-[3px] text-muted-foreground mb-2">Tagline</p>
            <p className="font-display text-xl font-bold text-primary">
              &ldquo;{data.tagline}&rdquo;
            </p>
          </div>
        )}

        {/* Positioning Statement */}
        <Section icon={Target} title="Positioning Statement">
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-5">
            <ProseBlock text={data.positioningStatement} />
          </div>
        </Section>

        {/* Competitive Alternatives */}
        <Section icon={Crosshair} title="Competitive Alternatives">
          <ProseBlock text={data.competitiveAlternatives} />
        </Section>

        {/* Unique Attributes */}
        <Section icon={Fingerprint} title="Unique Attributes">
          <ProseBlock text={data.uniqueAttributes} />
        </Section>

        {/* Value Pillars */}
        {data.valuePillars && data.valuePillars.length > 0 && (
          <Section icon={Layers} title="Value Pillars">
            <div className="space-y-4">
              {data.valuePillars.map((pillar, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-display text-base font-bold text-foreground mb-3">
                    {i + 1}. {pillar.theme}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Unique Attributes</p>
                      <ul className="space-y-1">
                        {pillar.attributes.map((attr, j) => (
                          <li key={j} className="text-sm text-foreground/80 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            {attr}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Customer Benefit</p>
                      <p className="text-sm text-foreground/80">{pillar.customerBenefit}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Evidence</p>
                    <p className="text-xs text-muted-foreground italic">{pillar.proof}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Target Audience */}
        <Section icon={Users} title="Target Audience">
          <ProseBlock text={data.targetAudience} />
        </Section>

        {/* Customer Persona */}
        {data.customerPersona && (
          <Section icon={Users} title="Ideal Customer Profile">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="font-display text-base font-bold text-foreground">{data.customerPersona.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {data.customerPersona.role}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Demographics</p>
                  <p className="text-sm text-foreground/80">{data.customerPersona.demographics}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Psychographics</p>
                  <p className="text-sm text-foreground/80">{data.customerPersona.psychographics}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Pain Points</p>
                  <ul className="space-y-1">
                    {data.customerPersona.painPoints.map((p, i) => (
                      <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Goals</p>
                  <ul className="space-y-1">
                    {data.customerPersona.goals.map((g, i) => (
                      <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-t border-border pt-4 mb-4">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Buying Triggers</p>
                <ul className="space-y-1">
                  {data.customerPersona.buyingTriggers.map((t, i) => (
                    <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {data.customerPersona.dayInTheLife && (
                <div className="border-t border-border pt-4">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">A Day in Their Life</p>
                  <p className="text-sm text-muted-foreground italic">{data.customerPersona.dayInTheLife}</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Market Category */}
        <Section icon={LayoutGrid} title="Market Category">
          <ProseBlock text={data.marketCategory} />
        </Section>

        {/* Competitive Positioning */}
        <Section icon={Crosshair} title="Competitive Positioning">
          <ProseBlock text={data.competitivePositioning} />
        </Section>

        {/* Messaging Framework */}
        {data.messagingFramework && (
          <Section icon={MessageSquare} title="Messaging Framework">
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-5 mb-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Headline</p>
              <p className="font-display text-base font-bold text-foreground mb-3">{data.messagingFramework.headline}</p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Subheadline</p>
              <p className="text-sm text-foreground/80 mb-3">{data.messagingFramework.subheadline}</p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Elevator Pitch</p>
              <p className="text-sm text-muted-foreground italic">{data.messagingFramework.elevatorPitch}</p>
            </div>

            {data.messagingFramework.objectionHandlers && data.messagingFramework.objectionHandlers.length > 0 && (
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Objection Handlers</p>
                <div className="space-y-2">
                  {data.messagingFramework.objectionHandlers.map((h, i) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <p className="text-xs font-medium text-destructive/80 mb-1">
                        Objection: {h.objection}
                      </p>
                      <p className="text-xs text-emerald-500/80">
                        Response: {h.response}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Key Messages */}
        {data.keyMessages && data.keyMessages.length > 0 && (
          <Section icon={Quote} title="Key Messages">
            <ol className="space-y-2">
              {data.keyMessages.map((msg, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-xs font-mono text-primary font-bold mt-0.5">{i + 1}.</span>
                  <p className="text-sm text-foreground/80">{msg}</p>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Brand Voice */}
        <Section icon={Mic2} title="Brand Voice">
          <ProseBlock text={data.brandVoice} />
        </Section>

        {/* Brand Personality */}
        {data.brandPersonality && data.brandPersonality.length > 0 && (
          <Section icon={Sparkles} title="Brand Personality">
            <ul className="space-y-1.5">
              {data.brandPersonality.map((trait, i) => (
                <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  {trait}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Trend Layer */}
        <Section icon={TrendingUp} title="Market Trend Layer">
          <div className="rounded-xl border border-border bg-card p-5">
            <ProseBlock text={data.trendLayer} />
          </div>
        </Section>

        {/* Visual Style (PRO/FULL) */}
        {data.visualStyle && (
          <Section icon={PaintBucket} title="Visual Style">
            <ProseBlock text={data.visualStyle} />
          </Section>
        )}

        {/* Brand Colors (PRO/FULL) */}
        {data.brandColors && data.brandColors.length > 0 && (
          <Section icon={Palette} title="Brand Colors">
            <ul className="space-y-1.5">
              {data.brandColors.map((color, i) => (
                <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  {color}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Tone Guidelines (PRO/FULL) */}
        {data.toneGuidelines && data.toneGuidelines.length > 0 && (
          <Section icon={Mic2} title="Tone Guidelines">
            <ol className="space-y-2">
              {data.toneGuidelines.map((g, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-xs font-mono text-primary font-bold mt-0.5">{i + 1}.</span>
                  <p className="text-sm text-foreground/80">{g}</p>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Channel Messaging (FULL) */}
        {data.channelMessaging && data.channelMessaging.length > 0 && (
          <Section icon={Megaphone} title="Channel Messaging Strategy">
            <div className="space-y-3">
              {data.channelMessaging.map((ch, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-display text-sm font-bold text-foreground mb-3">{ch.channel}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Headline</p>
                      <p className="text-sm font-medium text-foreground/80">{ch.headline}</p>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 mt-2">Subheadline</p>
                      <p className="text-sm text-foreground/80">{ch.subheadline}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Call to Action</p>
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {ch.cta}
                      </span>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 mt-2">Rationale</p>
                      <p className="text-xs text-muted-foreground italic">{ch.rationale}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4">
          Generated by Forge AI &middot; {new Date().toLocaleDateString()}
        </div>
      </div>
    );
  }

  // Ready to generate (no report yet, research complete)
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Target className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Generate Positioning Strategy</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        Build a comprehensive positioning strategy from your research data.
        This typically takes 2-4 minutes.
      </p>

      {triggerError && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 max-w-sm">
          <p className="text-xs text-destructive">{triggerError}</p>
        </div>
      )}

      <button
        onClick={() => {
          setTriggerError(null);
          generateMutation.mutate({ projectId: project!.id, type: 'POSITIONING' });
        }}
        disabled={generateMutation.isPending}
        className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Starting...
          </>
        ) : (
          'Generate Positioning Strategy'
        )}
      </button>
    </div>
  );
}
