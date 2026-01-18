'use client';

import { Download, FileText, Loader2 } from 'lucide-react';
import { REPORT_TYPE_LABELS } from '@forge/shared';

interface DownloadCardProps {
  type: string;
  ideaId: string;
  status?: 'ready' | 'generating' | 'locked';
}

const REPORT_ICONS: Record<string, string> = {
  BUSINESS_PLAN: '📋',
  POSITIONING: '🎯',
  COMPETITIVE_ANALYSIS: '⚔️',
};

export function DownloadCard({ type, ideaId, status = 'ready' }: DownloadCardProps) {
  const label = REPORT_TYPE_LABELS[type] || type;
  const icon = REPORT_ICONS[type] || '📄';

  const handleDownload = () => {
    // TODO: Implement actual download - generate PDF and download
    console.log(`Downloading ${type} for idea ${ideaId}`);
    // For now, this is a placeholder
    alert(`PDF generation coming soon! This will download the ${label} report.`);
  };

  if (status === 'locked') {
    return (
      <div className="p-4 rounded-xl bg-[#1a1a24] border border-[#1e1e2a] opacity-50 cursor-not-allowed">
        <div className="flex items-center gap-3">
          <span className="text-2xl grayscale">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#6a6a7a] truncate">{label}</p>
            <p className="text-xs text-[#4a4a5a]">Locked</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'generating') {
    return (
      <div className="p-4 rounded-xl bg-[#1a1a24] border border-[#1e1e2a]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{label}</p>
            <div className="flex items-center gap-1 text-xs text-[#6a6a7a]">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Generating...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleDownload}
      className="w-full p-4 rounded-xl bg-[#1a1a24] border border-[#1e1e2a] hover:border-[#00d4ff]/30 hover:bg-[#1a1a24]/80 transition-all group text-left"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{label}</p>
          <p className="text-xs text-[#6a6a7a]">PDF Ready</p>
        </div>
        <Download className="w-4 h-4 text-[#6a6a7a] group-hover:text-[#00d4ff] transition-colors" />
      </div>
    </button>
  );
}

interface DownloadsSectionProps {
  ideaId: string;
  hasResearch?: boolean;
}

export function DownloadsSection({ ideaId, hasResearch = true }: DownloadsSectionProps) {
  const status = hasResearch ? 'ready' : 'locked';

  return (
    <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2a] p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#00d4ff]/20 flex items-center justify-center">
          <FileText className="w-5 h-5 text-[#00d4ff]" />
        </div>
        <h2 className="text-base font-semibold text-white">Download Reports</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <DownloadCard type="BUSINESS_PLAN" ideaId={ideaId} status={status} />
        <DownloadCard type="POSITIONING" ideaId={ideaId} status={status} />
        <DownloadCard type="COMPETITIVE_ANALYSIS" ideaId={ideaId} status={status} />
      </div>
    </div>
  );
}
