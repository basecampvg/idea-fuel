'use client';

import { useState } from 'react';
import { Download, FileText, Loader2, Target, Swords, AlertCircle, type LucideIcon } from 'lucide-react';
import { REPORT_TYPE_LABELS } from '@forge/shared';
import { trpc } from '@/lib/trpc/client';

interface DownloadCardProps {
  type: string;
  projectId: string;
  status?: 'ready' | 'generating' | 'locked';
}

const REPORT_ICONS: Record<string, LucideIcon> = {
  BUSINESS_PLAN: FileText,
  POSITIONING: Target,
  COMPETITIVE_ANALYSIS: Swords,
};

type ReportType =
  | 'BUSINESS_PLAN'
  | 'POSITIONING'
  | 'COMPETITIVE_ANALYSIS'
  | 'WHY_NOW'
  | 'PROOF_SIGNALS'
  | 'KEYWORDS_SEO'
  | 'CUSTOMER_PROFILE'
  | 'VALUE_EQUATION'
  | 'VALUE_LADDER'
  | 'GO_TO_MARKET';

export function DownloadCard({ type, projectId, status = 'ready' }: DownloadCardProps) {
  const label = REPORT_TYPE_LABELS[type] || type;
  const Icon = REPORT_ICONS[type] || FileText;
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadPDF = trpc.report.downloadPDF.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and trigger download
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setIsDownloading(false);
      setError(null);
    },
    onError: (err) => {
      console.error('PDF download error:', err);
      setError(err.message || 'Failed to generate PDF');
      setIsDownloading(false);
    },
  });

  const handleDownload = () => {
    setIsDownloading(true);
    setError(null);
    downloadPDF.mutate({
      projectId,
      reportType: type as ReportType,
    });
  };

  if (status === 'locked') {
    return (
      <div className="p-4 rounded-xl bg-card border border-border opacity-50 cursor-not-allowed">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <Icon className="w-5 h-5 text-muted-foreground/70" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
            <p className="text-xs text-muted-foreground/70">Locked</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'generating' || isDownloading) {
    return (
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{label}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{isDownloading ? 'Generating PDF...' : 'Generating...'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <button
        onClick={handleDownload}
        className="w-full p-4 rounded-xl bg-card border border-red-500/30 hover:border-red-500/50 hover:bg-card/80 transition-all group text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{label}</p>
            <p className="text-xs text-red-400">Error - Click to retry</p>
          </div>
          <Download className="w-4 h-4 text-muted-foreground group-hover:text-red-400 transition-colors" />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      className="w-full p-4 rounded-xl bg-card border border-border hover:border-accent/30 hover:bg-card/80 transition-all group text-left"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:scale-105 transition-transform">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{label}</p>
          <p className="text-xs text-muted-foreground">PDF Ready</p>
        </div>
        <Download className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
      </div>
    </button>
  );
}

interface DownloadsSectionProps {
  projectId: string;
  hasResearch?: boolean;
  title?: string;
  subtitle?: string;
}

export function DownloadsSection({ projectId, hasResearch = true, title = 'Download Reports', subtitle }: DownloadsSectionProps) {
  const status = hasResearch ? 'ready' : 'locked';

  return (
    <div className="rounded-2xl bg-background border border-border p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <FileText className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <DownloadCard type="BUSINESS_PLAN" projectId={projectId} status={status} />
        <DownloadCard type="POSITIONING" projectId={projectId} status={status} />
        <DownloadCard type="COMPETITIVE_ANALYSIS" projectId={projectId} status={status} />
      </div>
    </div>
  );
}
