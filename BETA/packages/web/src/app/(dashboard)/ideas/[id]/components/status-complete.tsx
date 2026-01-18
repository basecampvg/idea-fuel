'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { INTERVIEW_MODE_LABELS } from '@forge/shared';
import { ReportGrid } from './report-grid';
import { ScoreCards } from './score-cards';
import { BusinessFit } from './business-fit';
import { KeywordChart, type KeywordTrend } from './keyword-chart';
import { OfferSection, type OfferTier } from './offer-section';
import { ActionPrompts, type ActionPrompt } from './action-prompts';
import { UserStory, type UserStoryData } from './user-story';
import { DownloadsSection } from './download-card';
import { MarketAnalysis, type MarketAnalysisData } from './market-analysis';
import { WhyNowSection, type WhyNowData } from './why-now-section';
import { ProofSignals, type ProofSignalsData } from './proof-signals';
import { SocialProofSection, type SocialProofData } from './social-proof-section';
import { CompetitorsSection, type Competitor } from './competitors-section';
import { PainPointsSection, type PainPoint } from './pain-points-section';
import { ChevronRight, MessageSquare, Download, Share2, Trash2 } from 'lucide-react';

interface Interview {
  id: string;
  mode: string;
  status: string;
  confidenceScore: number;
  createdAt: Date;
}

interface Report {
  id: string;
  type: string;
  tier: string;
  title: string;
  status: string;
  createdAt: Date;
}

interface RevenuePotential {
  rating: 'high' | 'medium' | 'low';
  estimate: string;
  confidence: number;
}

interface ExecutionDifficulty {
  rating: 'easy' | 'medium' | 'hard';
  factors: string[];
  soloFriendly: boolean;
}

interface GTMClarity {
  rating: 'strong' | 'moderate' | 'weak';
  channels: string[];
  confidence: number;
}

interface FounderFit {
  percentage: number;
  strengths: string[];
  gaps: string[];
}

interface Research {
  status: string;
  currentPhase: string;
  progress: number;
  marketAnalysis?: MarketAnalysisData | unknown | null;
  competitors?: Competitor[] | unknown | null;
  painPoints?: PainPoint[] | unknown | null;
  keywords?: unknown;
  positioning?: unknown;
  whyNow?: WhyNowData | unknown | null;
  proofSignals?: ProofSignalsData | unknown | null;
  // Dashboard scores
  opportunityScore?: number | null;
  problemScore?: number | null;
  feasibilityScore?: number | null;
  whyNowScore?: number | null;
  // Business fit metrics (Json from Prisma)
  revenuePotential?: RevenuePotential | unknown | null;
  executionDifficulty?: ExecutionDifficulty | unknown | null;
  gtmClarity?: GTMClarity | unknown | null;
  founderFit?: FounderFit | unknown | null;
  // Additional data (Json from Prisma)
  keywordTrends?: KeywordTrend[] | unknown | null;
  valueLadder?: OfferTier[] | unknown | null;
  actionPrompts?: ActionPrompt[] | unknown | null;
  // New fields
  userStory?: UserStoryData | unknown | null;
  socialProof?: SocialProofData | unknown | null;
}

interface StatusCompleteProps {
  idea: {
    id: string;
    title: string;
    interviews?: Interview[];
    reports?: Report[];
    research?: Research | null;
  };
  onDelete: () => void;
  isDeleting: boolean;
}

export function StatusComplete({ idea, onDelete, isDeleting }: StatusCompleteProps) {
  const router = useRouter();
  const completedInterview = idea.interviews?.find((i) => i.status === 'COMPLETE');
  const reports = idea.reports || [];
  const research = idea.research;

  const startInterview = trpc.idea.startInterview.useMutation({
    onSuccess: () => {
      router.push(`/ideas/${idea.id}/interview`);
    },
  });

  // Calculate research stats
  const researchStats = {
    competitors: Array.isArray(research?.competitors) ? research.competitors.length : 0,
    painPoints: Array.isArray(research?.painPoints) ? research.painPoints.length : 0,
    keywords: Array.isArray(research?.keywords) ? research.keywords.length : 0,
  };

  return (
    <div className="space-y-5">
      {/* 1. User Story */}
      <UserStory userStory={research?.userStory as UserStoryData | null | undefined} />

      {/* 2. Downloads */}
      <DownloadsSection ideaId={idea.id} hasResearch={research?.status === 'COMPLETE'} />

      {/* 3. Keyword Chart + Scores/BusinessFit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <KeywordChart keywordTrends={research?.keywordTrends as KeywordTrend[] | null | undefined} />
        <div className="space-y-5">
          <ScoreCards
            opportunityScore={research?.opportunityScore}
            problemScore={research?.problemScore}
            feasibilityScore={research?.feasibilityScore}
            whyNowScore={research?.whyNowScore}
          />
          <BusinessFit
            revenuePotential={research?.revenuePotential as RevenuePotential | null | undefined}
            executionDifficulty={research?.executionDifficulty as ExecutionDifficulty | null | undefined}
            gtmClarity={research?.gtmClarity as GTMClarity | null | undefined}
            founderFit={research?.founderFit as FounderFit | null | undefined}
          />
        </div>
      </div>

      {/* 4. Offer + Action Prompts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <OfferSection offerTiers={research?.valueLadder as OfferTier[] | null | undefined} ideaTitle={idea.title} />
        <ActionPrompts actionPrompts={research?.actionPrompts as ActionPrompt[] | null | undefined} ideaTitle={idea.title} />
      </div>

      {/* 5. Market Analysis */}
      <MarketAnalysis marketAnalysis={research?.marketAnalysis as MarketAnalysisData | null | undefined} />

      {/* 6. Why Now */}
      <WhyNowSection whyNow={research?.whyNow as WhyNowData | null | undefined} />

      {/* 7. Proof Signals */}
      <ProofSignals proofSignals={research?.proofSignals as ProofSignalsData | null | undefined} />

      {/* 8. Social Proof */}
      <SocialProofSection socialProof={research?.socialProof as SocialProofData | null | undefined} />

      {/* 9. Competitors */}
      <CompetitorsSection competitors={research?.competitors as Competitor[] | null | undefined} />

      {/* 10. Pain Points */}
      <PainPointsSection painPoints={research?.painPoints as PainPoint[] | null | undefined} />

      {/* 11. Reports Grid */}
      {reports.length > 0 && (
        <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2a] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Your Reports</h2>
            <Link
              href={`/ideas/${idea.id}/reports`}
              className="flex items-center gap-1 text-sm text-[#00d4ff] hover:opacity-80 transition-opacity"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <ReportGrid reports={reports} ideaId={idea.id} />
        </div>
      )}

      {/* 12. Interview Summary */}
      {completedInterview && (
        <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2a] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#22c55e]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Interview Summary</h2>
              <div className="flex items-center gap-2 text-sm text-[#a0a0b0]">
                <span className="px-2 py-0.5 rounded-full bg-[#22c55e]/20 text-[#22c55e] text-xs font-medium">
                  {INTERVIEW_MODE_LABELS[completedInterview.mode] || completedInterview.mode}
                </span>
                <span>•</span>
                <span>Confidence: {completedInterview.confidenceScore}</span>
                <span>•</span>
                <span>{new Date(completedInterview.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-4 pt-4 border-t border-[#1e1e2a]">
            <Link
              href={`/ideas/${idea.id}/interview`}
              className="flex items-center gap-1 text-sm text-[#00d4ff] hover:opacity-80 transition-opacity"
            >
              <span>View Full Interview</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => startInterview.mutate({ ideaId: idea.id, mode: 'IN_DEPTH' })}
              disabled={startInterview.isPending}
              className="text-sm text-[#6a6a7a] hover:text-white transition-colors disabled:opacity-50"
            >
              Start Another
            </button>
          </div>
        </div>
      )}

      {/* 13. Actions */}
      <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2a] p-5">
        <div className="flex flex-wrap gap-3">
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-[#1a1a24] border border-[#1e1e2a] text-[#6a6a7a] opacity-50 cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export All
          </button>
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-[#1a1a24] border border-[#1e1e2a] text-[#6a6a7a] opacity-50 cursor-not-allowed"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors disabled:opacity-50 ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Deleting...' : 'Delete Idea'}
          </button>
        </div>
      </div>
    </div>
  );
}
