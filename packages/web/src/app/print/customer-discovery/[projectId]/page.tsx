'use client';

import { trpc } from '@/lib/trpc/client';
import ReactMarkdown from 'react-markdown';
import { Loader2 } from 'lucide-react';
import { useSearchParams, useParams } from 'next/navigation';
import { useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

interface CustomerDiscoverySections {
  responseOverview: string;
  painValidation: string;
  severityAndFrequency: string;
  workaroundAnalysis: string;
  willingnessToPay: string;
  keyQuotes: string;
  researchDelta: string;
  confidenceUpdate: string;
  recommendedNextSteps: string;
}

// ============================================================================
// Helpers
// ============================================================================

function parseSections(raw: unknown): CustomerDiscoverySections | null {
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

export default function CustomerDiscoveryPrintPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const searchParams = useSearchParams();
  const autoprint = searchParams.get('autoprint') === 'true';

  const { data: project, isLoading: projectLoading } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: !!projectId },
  );

  const { data: reports, isLoading: reportsLoading } = trpc.report.listByProject.useQuery(
    { projectId, limit: 50 },
    { enabled: !!projectId },
  );

  const discoveryReport = reports?.find(
    (r) => r.type === 'CUSTOMER_DISCOVERY' && r.status === 'COMPLETE',
  );

  useEffect(() => {
    if (autoprint && !projectLoading && !reportsLoading && discoveryReport) {
      const timer = setTimeout(() => window.print(), 1500);
      return () => clearTimeout(timer);
    }
  }, [autoprint, projectLoading, reportsLoading, discoveryReport]);

  if (projectLoading || reportsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!discoveryReport) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <p className="text-neutral-400">No customer discovery report available.</p>
      </div>
    );
  }

  const data = parseSections(discoveryReport.sections);
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <p className="text-neutral-400">Failed to parse customer discovery report data.</p>
      </div>
    );
  }

  // Build sections in order
  const sections: { number: number; title: string; text: string }[] = [];
  let sectionNum = 0;

  const sectionDefs: { key: keyof CustomerDiscoverySections; title: string }[] = [
    { key: 'responseOverview', title: 'Response Overview' },
    { key: 'painValidation', title: 'Pain Validation' },
    { key: 'severityAndFrequency', title: 'Severity & Frequency' },
    { key: 'workaroundAnalysis', title: 'Workaround Analysis' },
    { key: 'willingnessToPay', title: 'Willingness to Pay' },
    { key: 'keyQuotes', title: 'Key Quotes' },
    { key: 'researchDelta', title: 'Research Delta' },
    { key: 'confidenceUpdate', title: 'Confidence Update' },
    { key: 'recommendedNextSteps', title: 'Recommended Next Steps' },
  ];

  for (const def of sectionDefs) {
    const text = data[def.key];
    if (text) {
      sectionNum++;
      sections.push({ number: sectionNum, title: def.title, text });
    }
  }

  return (
    <div id="customer-discovery-report" className="print-document bg-white text-neutral-900 min-h-screen">
      <style>{`
        @media print {
          @page :first {
            size: A4;
            margin: 0;
          }
          @page {
            size: A4;
            margin: 14mm 18mm;
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
          .print-section p {
            orphans: 3;
            widows: 3;
            break-inside: avoid;
          }
          .print-section li {
            break-inside: avoid;
          }
        }

        /* Screen preview styling */
        .print-document {
          max-width: 800px;
          margin: 0 auto;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>

      {/* Cover */}
      <div className="print-cover-page flex flex-col justify-center items-center min-h-screen px-16 bg-neutral-950">
        <div className="w-24 h-1 bg-red-500 mb-8" />
        <p className="text-xs font-mono uppercase tracking-[4px] text-neutral-500 mb-4">
          Customer Discovery Report
        </p>
        <h1 className="text-3xl font-black text-white text-center mb-4">
          {project?.title ?? 'Customer Discovery'}
        </h1>
        <p className="mt-6 text-sm text-neutral-500">Generated by IdeaFuel</p>
        <p className="mt-1 text-xs text-neutral-600">ideafuel.ai</p>
      </div>

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
          <div className="print-section px-16 py-14">
            <SectionTitle number={s.number} title={s.title} />
            <Prose text={s.text} />
          </div>
        </div>
      ))}

      {/* Footer / Back page */}
      <PageBreak />
      <div className="flex flex-col justify-center items-center min-h-[100vh] px-16 bg-neutral-950">
        <div className="w-24 h-1 bg-red-500 mb-6" />
        <p className="text-2xl font-bold text-neutral-200">
          <span className="text-red-500">IDEA</span>FUEL
        </p>
        <p className="mt-3 text-sm text-neutral-500">
          Generated by IdeaFuel — ideafuel.ai
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
