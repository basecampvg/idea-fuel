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
import { ChevronRight, MessageSquare, Trash2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useDashboardConfig } from '@/hooks/use-dashboard-config';
import { NextStepPromotion } from './next-step-promotion';
import { BusinessPlanSection } from './business-plan-section';
import { getResearchJourneyState, type InterviewMode } from '@forge/shared';

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
  revenueModel?: string;
  timeToFirstRevenue?: string;
  unitEconomics?: string;
}

interface ExecutionDifficulty {
  rating: 'easy' | 'moderate' | 'hard';
  factors: string[];
  soloFriendly: boolean;
  mvpTimeEstimate?: string;
  criticalPath?: string[];
  biggestRisk?: string;
}

interface GTMClarity {
  rating: 'clear' | 'moderate' | 'unclear';
  channels: string[];
  confidence: number;
  primaryChannel?: string;
  estimatedCAC?: string;
  firstMilestone?: string;
}

interface FounderFit {
  percentage: number;
  strengths: string[];
  gaps: string[];
  criticalSkillNeeded?: string;
  recommendedFirstHire?: string;
}

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
  id: string;
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
  opportunityScore?: number | null;
  problemScore?: number | null;
  feasibilityScore?: number | null;
  whyNowScore?: number | null;
  scoreJustifications?: ScoreJustifications | unknown | null;
  scoreMetadata?: ScoreMetadata | unknown | null;
  revenuePotential?: RevenuePotential | unknown | null;
  executionDifficulty?: ExecutionDifficulty | unknown | null;
  gtmClarity?: GTMClarity | unknown | null;
  founderFit?: FounderFit | unknown | null;
  keywordTrends?: KeywordTrend[] | unknown | null;
  valueLadder?: OfferTier[] | unknown | null;
  actionPrompts?: ActionPrompt[] | unknown | null;
  userStory?: UserStoryData | unknown | null;
  socialProof?: SocialProofData | unknown | null;
  marketSizing?: MarketSizingData | unknown | null;
  techStack?: TechStackData | unknown | null;
  businessPlan?: string | unknown | null;
}

interface StatusCompleteProps {
  project: {
    id: string;
    title: string;
    interviews?: Interview[];
    reports?: Report[];
    research?: Research | null;
  };
  onDelete: () => void;
  isDeleting: boolean;
}

export function StatusComplete({ project, onDelete, isDeleting }: StatusCompleteProps) {
  const router = useRouter();
  const panes = useDashboardConfig();
  const completedInterview = project.interviews?.find((i) => i.status === 'COMPLETE');
  const reports = project.reports || [];
  const research = project.research;

  const utils = trpc.useUtils();
  const [backfillResult, setBackfillResult] = useState<{ backfilled: string[]; failed: string[]; message: string } | null>(null);

  const startInterview = trpc.project.startInterview.useMutation({
    onSuccess: () => {
      router.push(`/projects/${project.id}/interview`);
    },
  });

  const backfill = trpc.research.backfill.useMutation({
    onSuccess: (data) => {
      setBackfillResult(data);
      utils.project.get.invalidate({ id: project.id });
    },
  });

  const hasMissingFields = research && research.status === 'COMPLETE' && (
    !research.marketSizing || !research.techStack || !research.userStory ||
    !research.valueLadder || !research.actionPrompts ||
    research.opportunityScore == null || !research.revenuePotential
  );

  const journeyState = getResearchJourneyState({
    project: { status: 'COMPLETE' },
    interview: completedInterview ? {
      mode: completedInterview.mode as InterviewMode,
      status: completedInterview.status as 'IN_PROGRESS' | 'COMPLETE' | 'ABANDONED',
    } : null,
    research: research ? {
      sparkStatus: null,
      sparkResult: null,
      status: research.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED',
    } : null,
  });

  // Carry forward the engine choice from the most recent interview
  const latestEngine = (project.interviews?.[0] as { researchEngine?: string } | undefined)?.researchEngine || 'OPENAI';

  const handleStartMode = (mode: InterviewMode) => {
    startInterview.mutate({ projectId: project.id, mode, researchEngine: latestEngine as 'OPENAI' | 'PERPLEXITY' });
  };

  const researchStats = {
    competitors: Array.isArray(research?.competitors) ? research.competitors.length : 0,
    painPoints: Array.isArray(research?.painPoints) ? research.painPoints.length : 0,
    keywords: Array.isArray(research?.keywords) ? research.keywords.length : 0,
  };

  return (
    <div className="space-y-5">
      {journeyState === 'LIGHT_COMPLETE' && (
        <NextStepPromotion
          projectId={project.id}
          journeyState={journeyState}
          onStartMode={handleStartMode}
          isStarting={startInterview.isPending}
        />
      )}

      {panes.userStory.visible && (
        <UserStory
          userStory={research?.userStory as UserStoryData | null | undefined}
          title={panes.userStory.title}
          subtitle={panes.userStory.subtitle}
        />
      )}

      <BusinessPlanSection
        businessPlan={research?.businessPlan as string | null | undefined}
      />

      {panes.scoreCards.visible && (
        <ScoreCards
          opportunityScore={research?.opportunityScore}
          problemScore={research?.problemScore}
          feasibilityScore={research?.feasibilityScore}
          whyNowScore={research?.whyNowScore}
          scoreJustifications={research?.scoreJustifications as ScoreJustifications | null | undefined}
          scoreMetadata={research?.scoreMetadata as ScoreMetadata | null | undefined}
          title={panes.scoreCards.title}
          subtitle={panes.scoreCards.subtitle}
        />
      )}

      {panes.marketSizing.visible && (
        <MarketSizing
          marketSizing={research?.marketSizing as MarketSizingData | null | undefined}
          title={panes.marketSizing.title}
          subtitle={panes.marketSizing.subtitle}
        />
      )}

      {panes.keywordChart.visible && (
        <KeywordChart
          keywordTrends={research?.keywordTrends as KeywordTrend[] | null | undefined}
          title={panes.keywordChart.title}
          subtitle={panes.keywordChart.subtitle}
        />
      )}

      {panes.businessFit.visible && (
        <BusinessFit
          revenuePotential={research?.revenuePotential as RevenuePotential | null | undefined}
          executionDifficulty={research?.executionDifficulty as ExecutionDifficulty | null | undefined}
          gtmClarity={research?.gtmClarity as GTMClarity | null | undefined}
          founderFit={research?.founderFit as FounderFit | null | undefined}
          title={panes.businessFit.title}
        />
      )}

      {panes.techStack.visible && (
        <TechStackSection
          techStack={research?.techStack as TechStackData | null | undefined}
          title={panes.techStack.title}
          subtitle={panes.techStack.subtitle}
        />
      )}

      {(panes.offerSection.visible || panes.actionPrompts.visible) && (
        <div className={`grid grid-cols-1 ${panes.offerSection.visible && panes.actionPrompts.visible ? 'lg:grid-cols-2' : ''} gap-5`}>
          {panes.offerSection.visible && (
            <OfferSection
              offerTiers={research?.valueLadder as OfferTier[] | null | undefined}
              ideaTitle={project.title}
              title={panes.offerSection.title}
              subtitle={panes.offerSection.subtitle}
            />
          )}
          {panes.actionPrompts.visible && (
            <ActionPrompts
              actionPrompts={research?.actionPrompts as ActionPrompt[] | null | undefined}
              ideaTitle={project.title}
              title={panes.actionPrompts.title}
              subtitle={panes.actionPrompts.subtitle}
            />
          )}
        </div>
      )}

      {panes.marketAnalysis.visible && (
        <MarketAnalysis
          marketAnalysis={research?.marketAnalysis as MarketAnalysisData | null | undefined}
          title={panes.marketAnalysis.title}
          subtitle={panes.marketAnalysis.subtitle}
        />
      )}

      {panes.whyNow.visible && (
        <WhyNowSection
          whyNow={research?.whyNow as WhyNowData | null | undefined}
          title={panes.whyNow.title}
          subtitle={panes.whyNow.subtitle}
        />
      )}

      {panes.proofSignals.visible && (
        <ProofSignals
          proofSignals={research?.proofSignals as ProofSignalsData | null | undefined}
          title={panes.proofSignals.title}
          subtitle={panes.proofSignals.subtitle}
        />
      )}

      {panes.socialProof.visible && (
        <SocialProofSection
          socialProof={research?.socialProof as SocialProofData | null | undefined}
          title={panes.socialProof.title}
          subtitle={panes.socialProof.subtitle}
        />
      )}

      {panes.competitors.visible && (
        <CompetitorsSection
          competitors={research?.competitors as Competitor[] | null | undefined}
          title={panes.competitors.title}
          subtitle={panes.competitors.subtitle}
        />
      )}

      {panes.painPoints.visible && (
        <PainPointsSection
          painPoints={research?.painPoints as PainPoint[] | null | undefined}
          title={panes.painPoints.title}
          subtitle={panes.painPoints.subtitle}
        />
      )}

      {reports.length > 0 && (
        <div className="rounded-2xl bg-background border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Your Reports</h2>
            <Link
              href={`/projects/${project.id}/reports`}
              className="flex items-center gap-1 text-sm text-accent hover:opacity-80 transition-opacity"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <ReportGrid reports={reports} projectId={project.id} />
        </div>
      )}

      {completedInterview && (
        <div className="rounded-2xl bg-background border border-border p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Interview Summary</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                  {INTERVIEW_MODE_LABELS[completedInterview.mode] || completedInterview.mode}
                </span>
                <span>·</span>
                <span>Confidence: {completedInterview.confidenceScore}</span>
                <span>·</span>
                <span>{new Date(completedInterview.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-4 pt-4 border-t border-border">
            <Link
              href={`/projects/${project.id}/interview`}
              className="flex items-center gap-1 text-sm text-accent hover:opacity-80 transition-opacity"
            >
              <span>View Full Interview</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => startInterview.mutate({ projectId: project.id, mode: 'IN_DEPTH', researchEngine: latestEngine as 'OPENAI' | 'PERPLEXITY' })}
              disabled={startInterview.isPending}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Start Another
            </button>
          </div>
        </div>
      )}

      {hasMissingFields && (
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Some analysis sections are incomplete</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[
                  !research.marketSizing && 'Market Sizing',
                  !research.techStack && 'Tech Stack',
                  !research.userStory && 'User Story',
                  !research.valueLadder && 'Value Ladder',
                  !research.actionPrompts && 'Action Prompts',
                  research.opportunityScore == null && 'Scores',
                  !research.revenuePotential && 'Business Metrics',
                ].filter(Boolean).join(', ')} missing
              </p>
              {backfillResult && (
                <p className={`text-xs mt-1 ${backfillResult.failed.length > 0 ? 'text-red-400' : 'text-primary'}`}>
                  {backfillResult.message}
                </p>
              )}
            </div>
            <button
              onClick={() => research?.id && backfill.mutate({ researchId: research.id })}
              disabled={backfill.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-primary/10 border border-primary/30 text-primary/50 hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${backfill.isPending ? 'animate-spin' : ''}`} />
              {backfill.isPending ? 'Repairing...' : 'Repair Data'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-background border border-border p-5">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-[#ef4444]/30 text-red-400 hover:bg-[#ef4444]/10 transition-colors disabled:opacity-50 ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Deleting...' : 'Delete Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
