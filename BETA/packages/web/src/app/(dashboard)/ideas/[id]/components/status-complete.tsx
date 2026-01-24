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
import { MarketSizing } from './market-sizing';
import type { MarketSizingData } from '@forge/shared';
import { MarketAnalysis, type MarketAnalysisData } from './market-analysis';
import { WhyNowSection, type WhyNowData } from './why-now-section';
import { ProofSignals, type ProofSignalsData } from './proof-signals';
import { SocialProofSection, type SocialProofData } from './social-proof-section';
import { CompetitorsSection, type Competitor } from './competitors-section';
import { PainPointsSection, type PainPoint } from './pain-points-section';
import { TechStackSection } from './tech-stack-section';
import type { TechStackData } from '@forge/shared';
import { ChevronRight, MessageSquare, Download, Share2, Trash2 } from 'lucide-react';
import { useDashboardConfig } from '@/hooks/use-dashboard-config';

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

// Score justification types (matching backend ResearchScores)
interface ScoreWithJustification {
  score: number;
  justification: string;
  confidence: 'high' | 'medium' | 'low';
}

interface ScoreJustifications {
  opportunity: ScoreWithJustification;
  problem: ScoreWithJustification;
  feasibility: ScoreWithJustification;
  whyNow: ScoreWithJustification;
}

interface ScoreMetadata {
  passCount: number;
  maxDeviation: number;
  averageConfidence: number;
  flagged: boolean;
  flagReason?: string;
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
  // Score justifications and metadata
  scoreJustifications?: ScoreJustifications | unknown | null;
  scoreMetadata?: ScoreMetadata | unknown | null;
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
  marketSizing?: MarketSizingData | unknown | null;
  techStack?: TechStackData | unknown | null;
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
  const panes = useDashboardConfig();
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
      {panes.userStory.visible && (
        <UserStory
          userStory={research?.userStory as UserStoryData | null | undefined}
          title={panes.userStory.title}
          subtitle={panes.userStory.subtitle}
        />
      )}

      {/* 2. Downloads */}
      {panes.downloads.visible && (
        <DownloadsSection
          ideaId={idea.id}
          hasResearch={research?.status === 'COMPLETE'}
          title={panes.downloads.title}
          subtitle={panes.downloads.subtitle}
        />
      )}

      {/* 3. Score Cards (single row) */}
      {panes.scoreCards.visible && (
        <ScoreCards
          opportunityScore={research?.opportunityScore}
          problemScore={research?.problemScore}
          feasibilityScore={research?.feasibilityScore}
          whyNowScore={research?.whyNowScore}
          scoreJustifications={research?.scoreJustifications as ScoreJustifications | null | undefined}
          scoreMetadata={research?.scoreMetadata as ScoreMetadata | null | undefined}
          layout="horizontal"
          title={panes.scoreCards.title}
          subtitle={panes.scoreCards.subtitle}
        />
      )}

      {/* 4. Market Sizing (TAM/SAM/SOM) */}
      {panes.marketSizing.visible && (
        <MarketSizing
          marketSizing={research?.marketSizing as MarketSizingData | null | undefined}
          title={panes.marketSizing.title}
          subtitle={panes.marketSizing.subtitle}
        />
      )}

      {/* 5. Keyword Chart (full width) */}
      {panes.keywordChart.visible && (
        <KeywordChart
          keywordTrends={research?.keywordTrends as KeywordTrend[] | null | undefined}
          title={panes.keywordChart.title}
          subtitle={panes.keywordChart.subtitle}
        />
      )}

      {/* 6. Business Fit */}
      {panes.businessFit.visible && (
        <BusinessFit
          revenuePotential={research?.revenuePotential as RevenuePotential | null | undefined}
          executionDifficulty={research?.executionDifficulty as ExecutionDifficulty | null | undefined}
          gtmClarity={research?.gtmClarity as GTMClarity | null | undefined}
          founderFit={research?.founderFit as FounderFit | null | undefined}
          title={panes.businessFit.title}
          subtitle={panes.businessFit.subtitle}
        />
      )}

      {/* 7. Tech Stack */}
      {panes.techStack.visible && (
        <TechStackSection
          techStack={research?.techStack as TechStackData | null | undefined}
          title={panes.techStack.title}
          subtitle={panes.techStack.subtitle}
        />
      )}

      {/* 8. Offer + Action Prompts */}
      {(panes.offerSection.visible || panes.actionPrompts.visible) && (
        <div className={`grid grid-cols-1 ${panes.offerSection.visible && panes.actionPrompts.visible ? 'lg:grid-cols-2' : ''} gap-5`}>
          {panes.offerSection.visible && (
            <OfferSection
              offerTiers={research?.valueLadder as OfferTier[] | null | undefined}
              ideaTitle={idea.title}
              title={panes.offerSection.title}
              subtitle={panes.offerSection.subtitle}
            />
          )}
          {panes.actionPrompts.visible && (
            <ActionPrompts
              actionPrompts={research?.actionPrompts as ActionPrompt[] | null | undefined}
              ideaTitle={idea.title}
              title={panes.actionPrompts.title}
              subtitle={panes.actionPrompts.subtitle}
            />
          )}
        </div>
      )}

      {/* 8. Market Analysis */}
      {panes.marketAnalysis.visible && (
        <MarketAnalysis
          marketAnalysis={research?.marketAnalysis as MarketAnalysisData | null | undefined}
          title={panes.marketAnalysis.title}
          subtitle={panes.marketAnalysis.subtitle}
        />
      )}

      {/* 9. Why Now */}
      {panes.whyNow.visible && (
        <WhyNowSection
          whyNow={research?.whyNow as WhyNowData | null | undefined}
          title={panes.whyNow.title}
          subtitle={panes.whyNow.subtitle}
        />
      )}

      {/* 10. Proof Signals */}
      {panes.proofSignals.visible && (
        <ProofSignals
          proofSignals={research?.proofSignals as ProofSignalsData | null | undefined}
          title={panes.proofSignals.title}
          subtitle={panes.proofSignals.subtitle}
        />
      )}

      {/* 11. Social Proof */}
      {panes.socialProof.visible && (
        <SocialProofSection
          socialProof={research?.socialProof as SocialProofData | null | undefined}
          title={panes.socialProof.title}
          subtitle={panes.socialProof.subtitle}
        />
      )}

      {/* 12. Competitors */}
      {panes.competitors.visible && (
        <CompetitorsSection
          competitors={research?.competitors as Competitor[] | null | undefined}
          title={panes.competitors.title}
          subtitle={panes.competitors.subtitle}
        />
      )}

      {/* 13. Pain Points */}
      {panes.painPoints.visible && (
        <PainPointsSection
          painPoints={research?.painPoints as PainPoint[] | null | undefined}
          title={panes.painPoints.title}
          subtitle={panes.painPoints.subtitle}
        />
      )}

      {/* 14. Reports Grid */}
      {reports.length > 0 && (
        <div className="rounded-2xl bg-background border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Your Reports</h2>
            <Link
              href={`/ideas/${idea.id}/reports`}
              className="flex items-center gap-1 text-sm text-accent hover:opacity-80 transition-opacity"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <ReportGrid reports={reports} ideaId={idea.id} />
        </div>
      )}

      {/* 15. Interview Summary */}
      {completedInterview && (
        <div className="rounded-2xl bg-background border border-border p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#22c55e]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Interview Summary</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
          <div className="flex gap-4 mt-4 pt-4 border-t border-border">
            <Link
              href={`/ideas/${idea.id}/interview`}
              className="flex items-center gap-1 text-sm text-accent hover:opacity-80 transition-opacity"
            >
              <span>View Full Interview</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => startInterview.mutate({ ideaId: idea.id, mode: 'IN_DEPTH' })}
              disabled={startInterview.isPending}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Start Another
            </button>
          </div>
        </div>
      )}

      {/* 16. Actions */}
      <div className="rounded-2xl bg-background border border-border p-5">
        <div className="flex flex-wrap gap-3">
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-card border border-border text-muted-foreground opacity-50 cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export All
          </button>
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-card border border-border text-muted-foreground opacity-50 cursor-not-allowed"
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
