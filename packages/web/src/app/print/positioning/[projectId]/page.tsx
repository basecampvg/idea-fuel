'use client';

import { trpc } from '@/lib/trpc/client';
import { getCoverComponent } from '@/app/(dashboard)/projects/[id]/reports/positioning/components/cover-variants';
import ReactMarkdown from 'react-markdown';
import { Loader2 } from 'lucide-react';
import { useSearchParams, useParams } from 'next/navigation';
import { useEffect } from 'react';

// ============================================================================
// Types
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

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================================================
// Print Components
// ============================================================================

function CoverPage({ title, subtitle, coverStyle }: { title: string; subtitle?: string; coverStyle: string }) {
  const CoverComponent = getCoverComponent(coverStyle);
  return (
    <div className="print-cover-page min-h-[100vh]" style={{ fontSize: '16px' }}>
      <CoverComponent title={title} subtitle={subtitle} />
    </div>
  );
}

function SectionTitle({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-6 mt-2">
      <span className="text-sm font-mono text-red-600 tracking-wider">
        {String(number).padStart(2, '0')}
      </span>
      <h2 className="text-2xl font-extrabold text-neutral-900 uppercase tracking-wide">
        {title}
      </h2>
    </div>
  );
}

function Prose({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="prose prose-sm max-w-none text-neutral-700 leading-relaxed [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-neutral-900 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-neutral-900 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-neutral-800 [&_strong]:text-neutral-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-neutral-700 [&_p]:mb-3">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

function PageBreak() {
  return <div className="print-page-break" />;
}

// ============================================================================
// Main Print Page
// ============================================================================

export default function PositioningPrintPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const searchParams = useSearchParams();
  const coverStyle = searchParams.get('cover') ?? '1';
  const autoprint = searchParams.get('autoprint') === 'true';

  const { data: project, isLoading: projectLoading } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: !!projectId },
  );

  // Fetch positioning report
  const { data: reports, isLoading: reportsLoading } = trpc.report.listByProject.useQuery(
    { projectId, limit: 50 },
    { enabled: !!projectId },
  );

  const positioningReport = reports?.find((r) => r.type === 'POSITIONING' && r.status === 'COMPLETE');

  useEffect(() => {
    if (autoprint && !projectLoading && !reportsLoading && positioningReport) {
      const timer = setTimeout(() => window.print(), 1500);
      return () => clearTimeout(timer);
    }
  }, [autoprint, projectLoading, reportsLoading, positioningReport]);

  if (projectLoading || reportsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!positioningReport) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <p className="text-neutral-400">No positioning report available.</p>
      </div>
    );
  }

  const data = parsePositioning(positioningReport.content);
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <p className="text-neutral-400">Failed to parse positioning report data.</p>
      </div>
    );
  }

  // Build sections
  const sections: { number: number; title: string; content: React.ReactNode }[] = [];
  let sectionNum = 0;

  // Positioning Statement + Tagline
  if (data.positioningStatement) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Positioning Statement',
      content: (
        <>
          {data.tagline && (
            <div className="mb-6 py-4 px-5 rounded-lg bg-neutral-50 border border-neutral-200 text-center">
              <p className="text-[10px] font-mono uppercase tracking-[3px] text-neutral-500 mb-1">Tagline</p>
              <p className="text-lg font-bold text-red-600">&ldquo;{data.tagline}&rdquo;</p>
            </div>
          )}
          <Prose text={data.positioningStatement} />
        </>
      ),
    });
  }

  // Competitive Alternatives
  if (data.competitiveAlternatives) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Competitive Alternatives',
      content: <Prose text={data.competitiveAlternatives} />,
    });
  }

  // Unique Attributes
  if (data.uniqueAttributes) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Unique Attributes',
      content: <Prose text={data.uniqueAttributes} />,
    });
  }

  // Value Pillars
  if (data.valuePillars && data.valuePillars.length > 0) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Value Pillars',
      content: (
        <div className="space-y-6">
          {data.valuePillars.map((pillar, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 p-5">
              <h3 className="text-base font-bold text-neutral-900 mb-3">
                {i + 1}. {pillar.theme}
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Unique Attributes</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {pillar.attributes.map((attr, j) => (
                      <li key={j} className="text-xs text-neutral-700">{attr}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Customer Benefit</p>
                  <p className="text-xs text-neutral-700">{pillar.customerBenefit}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-neutral-100">
                <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Evidence</p>
                <p className="text-xs text-neutral-500 italic">{pillar.proof}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    });
  }

  // Target Audience
  if (data.targetAudience) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Target Audience',
      content: <Prose text={data.targetAudience} />,
    });
  }

  // Customer Persona
  if (data.customerPersona) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Ideal Customer Profile',
      content: (
        <div className="rounded-lg border border-neutral-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-base font-bold text-neutral-900">{data.customerPersona.name}</h3>
            <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium">
              {data.customerPersona.role}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Demographics</p>
              <p className="text-xs text-neutral-700">{data.customerPersona.demographics}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Psychographics</p>
              <p className="text-xs text-neutral-700">{data.customerPersona.psychographics}</p>
            </div>
          </div>
          <div className="border-t border-neutral-100 pt-4 grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Pain Points</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {data.customerPersona.painPoints.map((p, i) => (
                  <li key={i} className="text-xs text-neutral-700">{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Goals</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {data.customerPersona.goals.map((g, i) => (
                  <li key={i} className="text-xs text-neutral-700">{g}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-100 pt-4 mb-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Buying Triggers</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {data.customerPersona.buyingTriggers.map((t, i) => (
                <li key={i} className="text-xs text-neutral-700">{t}</li>
              ))}
            </ul>
          </div>
          {data.customerPersona.dayInTheLife && (
            <div className="border-t border-neutral-100 pt-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">A Day in Their Life</p>
              <p className="text-xs text-neutral-600 italic">{data.customerPersona.dayInTheLife}</p>
            </div>
          )}
        </div>
      ),
    });
  }

  // Market Category
  if (data.marketCategory) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Market Category',
      content: <Prose text={data.marketCategory} />,
    });
  }

  // Competitive Positioning
  if (data.competitivePositioning) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Competitive Positioning',
      content: <Prose text={data.competitivePositioning} />,
    });
  }

  // Messaging Framework
  if (data.messagingFramework) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Messaging Framework',
      content: (
        <>
          <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-5 mb-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Headline</p>
            <p className="text-base font-bold text-neutral-900 mb-3">{data.messagingFramework.headline}</p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Subheadline</p>
            <p className="text-sm text-neutral-700 mb-3">{data.messagingFramework.subheadline}</p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Elevator Pitch</p>
            <p className="text-sm text-neutral-600 italic">{data.messagingFramework.elevatorPitch}</p>
          </div>
          {data.messagingFramework.objectionHandlers && data.messagingFramework.objectionHandlers.length > 0 && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">Objection Handlers</p>
              <div className="space-y-2">
                {data.messagingFramework.objectionHandlers.map((h, i) => (
                  <div key={i} className="rounded-lg border border-neutral-200 p-3">
                    <p className="text-xs font-medium text-red-700 mb-1">Objection: {h.objection}</p>
                    <p className="text-xs text-emerald-700">Response: {h.response}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ),
    });
  }

  // Key Messages
  if (data.keyMessages && data.keyMessages.length > 0) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Key Messages',
      content: (
        <ol className="list-decimal pl-5 space-y-2">
          {data.keyMessages.map((msg, i) => (
            <li key={i} className="text-sm text-neutral-700">{msg}</li>
          ))}
        </ol>
      ),
    });
  }

  // Brand Voice
  if (data.brandVoice) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Brand Voice',
      content: <Prose text={data.brandVoice} />,
    });
  }

  // Brand Personality
  if (data.brandPersonality && data.brandPersonality.length > 0) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Brand Personality',
      content: (
        <ul className="list-disc pl-5 space-y-1.5">
          {data.brandPersonality.map((trait, i) => (
            <li key={i} className="text-sm text-neutral-700">{trait}</li>
          ))}
        </ul>
      ),
    });
  }

  // Trend Layer
  if (data.trendLayer) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Market Trend Layer',
      content: <Prose text={data.trendLayer} />,
    });
  }

  // Visual Style (PRO/FULL)
  if (data.visualStyle) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Visual Style',
      content: <Prose text={data.visualStyle} />,
    });
  }

  // Brand Colors (PRO/FULL)
  if (data.brandColors && data.brandColors.length > 0) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Brand Colors',
      content: (
        <ul className="list-disc pl-5 space-y-1.5">
          {data.brandColors.map((color, i) => (
            <li key={i} className="text-sm text-neutral-700">{color}</li>
          ))}
        </ul>
      ),
    });
  }

  // Tone Guidelines (PRO/FULL)
  if (data.toneGuidelines && data.toneGuidelines.length > 0) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Tone Guidelines',
      content: (
        <ol className="list-decimal pl-5 space-y-2">
          {data.toneGuidelines.map((g, i) => (
            <li key={i} className="text-sm text-neutral-700">{g}</li>
          ))}
        </ol>
      ),
    });
  }

  // Channel Messaging (FULL)
  if (data.channelMessaging && data.channelMessaging.length > 0) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Channel Messaging Strategy',
      content: (
        <div className="space-y-4">
          {data.channelMessaging.map((ch, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 p-5">
              <h3 className="text-sm font-bold text-neutral-900 mb-3">{ch.channel}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Headline</p>
                  <p className="text-xs font-medium text-neutral-800">{ch.headline}</p>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1 mt-2">Subheadline</p>
                  <p className="text-xs text-neutral-700">{ch.subheadline}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Call to Action</p>
                  <span className="inline-block px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-xs font-medium">
                    {ch.cta}
                  </span>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1 mt-2">Rationale</p>
                  <p className="text-xs text-neutral-500 italic">{ch.rationale}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    });
  }

  return (
    <div id="positioning-report" className="print-document bg-white text-neutral-900 min-h-screen">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-cover-page {
            page-break-after: always;
          }
          .print-page-break {
            page-break-before: always;
          }
          .print-section {
            page-break-inside: avoid;
          }
        }

        /* Screen preview styling */
        .print-document {
          max-width: 850px;
          margin: 0 auto;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>

      {/* Cover Page */}
      <CoverPage
        title={project?.title ?? 'Positioning Strategy'}
        subtitle={project?.description as string | undefined}
        coverStyle={coverStyle}
      />

      {/* Table of Contents */}
      <div className="px-16 py-16">
        <h2 className="text-sm font-mono uppercase tracking-[4px] text-neutral-400 mb-8">
          Table of Contents
        </h2>
        <div className="space-y-3">
          {sections.map((s) => (
            <div key={s.number} className="flex items-baseline gap-4">
              <span className="text-sm font-mono text-red-600">{String(s.number).padStart(2, '0')}</span>
              <span className="text-base text-neutral-800">{s.title}</span>
              <span className="flex-1 border-b border-dotted border-neutral-300 mx-2" />
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      {sections.map((s) => (
        <div key={s.number}>
          <PageBreak />
          <div className="print-section px-16 py-12">
            <SectionTitle number={s.number} title={s.title} />
            {s.content}
          </div>
        </div>
      ))}

      {/* Back page */}
      <PageBreak />
      <div className="flex flex-col justify-center items-center min-h-[100vh] px-16 bg-neutral-950">
        <div className="w-24 h-1 bg-red-500 mb-6" />
        <p className="text-2xl font-bold text-neutral-200">
          <span className="text-red-500">IDEA</span>FUEL
        </p>
        <p className="mt-3 text-sm text-neutral-500">
          AI-Powered Business Intelligence
        </p>
        <p className="mt-8 text-xs text-neutral-600">
          This document was generated on {formatDate(new Date())} and contains proprietary analysis.
        </p>
        <p className="mt-1 text-xs text-neutral-600">
          &copy; {new Date().getFullYear()} IdeaFuel. All rights reserved.
        </p>
      </div>
    </div>
  );
}
