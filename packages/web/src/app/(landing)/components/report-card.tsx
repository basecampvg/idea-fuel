'use client';

import { TrendingUp, Shield, Target, Lightbulb, BarChart3, Search, Users, Swords, Layers, Cpu, Zap, MessageSquare, FileText, Crosshair, Brain } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ReportCardData {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tags: string[];
}

export const REPORT_CARDS: ReportCardData[] = [
  {
    icon: BarChart3,
    title: 'MARKET ANALYSIS',
    subtitle: "What you're walking into",
    tags: ['Market Stage', 'Entry Barriers', 'Adjacent Opportunities', 'Growth Trends', 'Consolidation Level', 'Regulatory Environment'],
  },
  {
    icon: TrendingUp,
    title: 'MARKET SIZING',
    subtitle: 'TAM, SAM, SOM breakdown',
    tags: ['Total Addressable', 'Growth Rates', 'Confidence Ratings', 'Market Segments', 'Assumptions', 'Sources'],
  },
  {
    icon: Zap,
    title: 'WHY NOW',
    subtitle: 'Timing & market triggers',
    tags: ['Market Triggers', 'Timing Factors', 'Urgency Score', 'Window of Opportunity', 'Catalyst Impact'],
  },
  {
    icon: Search,
    title: 'KEYWORD TRENDS',
    subtitle: 'Search demand signals',
    tags: ['Primary Keywords', 'Long-tail Keywords', 'Rising Queries', 'Search Volume', 'Secondary Keywords'],
  },
  {
    icon: Shield,
    title: 'PROOF SIGNALS',
    subtitle: 'Evidence of real demand',
    tags: ['Demand Indicators', 'Community Signal', 'Spending Signal', 'Validation Experiments', 'Risk Mitigation'],
  },
  {
    icon: Users,
    title: 'SOCIAL PROOF',
    subtitle: 'What people are saying',
    tags: ['Community Sentiment', 'Real Conversations', 'Evidence Quotes', 'Thread Analysis'],
  },
  {
    icon: Target,
    title: 'PAIN POINTS',
    subtitle: 'Problems ranked by severity',
    tags: ['Current Solutions', 'Solution Gaps', 'Affected Segments', 'Frequency', 'Cost of Inaction'],
  },
  {
    icon: Swords,
    title: 'COMPETITORS',
    subtitle: 'Full competitive landscape',
    tags: ['Strengths & Weaknesses', 'Positioning', 'Funding Stage', 'Pricing Model', 'Vulnerability'],
  },
  {
    icon: Layers,
    title: 'VALUE LADDER',
    subtitle: 'Pricing & offer strategy',
    tags: ['Pricing Tiers', 'Features per Tier', 'Target Customer', 'Pricing Strategy'],
  },
  {
    icon: Cpu,
    title: 'TECH STACK',
    subtitle: 'Build recommendations',
    tags: ['Recommendations', 'Alternatives', 'Architecture', 'Estimated Complexity'],
  },
  {
    icon: Lightbulb,
    title: 'ACTION PROMPTS',
    subtitle: 'Prioritized next steps',
    tags: ['Timeline', 'Required Resources', 'Priority Actions', 'Quick Wins'],
  },
  {
    icon: MessageSquare,
    title: 'INTERVIEW SUMMARY',
    subtitle: 'Key insights extracted',
    tags: ['Conversation Recap', 'Core Insights', 'Themes Identified'],
  },
  {
    icon: FileText,
    title: 'BUSINESS PLAN',
    subtitle: 'Synthesized strategy document',
    tags: ['Executive Summary', 'Revenue Model', 'Go-to-Market', 'Financial Projections'],
  },
  {
    icon: Crosshair,
    title: 'POSITIONING',
    subtitle: 'Your unique angle',
    tags: ['Value Proposition', 'Differentiators', 'Messaging Pillars', 'Elevator Pitch', 'Objection Handlers'],
  },
  {
    icon: Brain,
    title: 'AI INSIGHTS',
    subtitle: 'Strategic observations',
    tags: ['Opportunity Score', 'Feasibility Score', 'Founder-Fit', 'Revenue Potential', 'Execution Difficulty'],
  },
];

export function ReportCard({ icon: Icon, title, subtitle, tags }: ReportCardData) {
  return (
    <div className="w-[220px] shrink-0 rounded-xl border border-[#2a2a2a] bg-[#1a1816] px-4 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      {/* Icon */}
      <div className="mb-2 flex justify-center">
        <Icon className="h-4 w-4 text-[#e32b1a]/70" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h4 className="text-center font-display text-xs font-bold tracking-wide text-[#d4d4d4]">
        {title}
      </h4>

      {/* Subtitle */}
      <p className="mt-0.5 text-center text-[10px] text-[#888]">
        {subtitle}
      </p>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap justify-center gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[#2a2220] px-2 py-[2px] text-[9px] font-medium text-[#e32b1a]/90"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
