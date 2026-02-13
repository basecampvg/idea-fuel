import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { baseStyles, colors, getScoreColor, getScoreBackgroundColor } from './base-styles';

interface ScoreJustification {
  score: number;
  justification: string;
  confidence: string;
}

interface MarketMetricPDF {
  value: number;
  formattedValue: string;
  growthRate: number;
  confidence: string;
  timeframe: string;
}

interface PainPointPDF {
  problem: string;
  severity: string;
  currentSolutions: string[];
  gaps: string[];
  description?: string;
}

interface BusinessFitPDF {
  revenuePotential?: { rating: string; estimate: string; confidence: number };
  executionDifficulty?: { rating: string; factors: string[]; soloFriendly: boolean };
  gtmClarity?: { rating: string; channels: string[]; confidence: number };
  founderFit?: { percentage: number; strengths: string[]; gaps: string[] };
}

interface TechLayerItem {
  name: string;
  category?: string;
  purpose?: string;
  alternatives?: string[];
  complexity?: string;
  monthlyEstimate?: string;
}

interface ValueLadderTier {
  tier: string;
  label: string;
  title: string;
  price: string;
  description: string;
  features: string[];
}

interface ActionPromptPDF {
  title: string;
  description: string;
  category: string;
}

interface KeywordTrendPDF {
  keyword: string;
  volume: number;
  growth: number;
}

interface SocialProofPost {
  platform: string;
  author: string;
  content: string;
  engagement?: Record<string, number>;
  sentiment?: string;
}

interface BusinessPlanData {
  ideaTitle: string;
  ideaDescription: string;
  generatedAt: Date;
  tier: 'BASIC' | 'PRO' | 'FULL';

  // Executive Summary
  executiveSummary?: string;

  // Problem & Solution
  problemStatement?: string;
  solution?: string;
  uniqueValueProposition?: string;

  // Market Analysis
  targetMarket?: string;
  marketSize?: string;
  marketTrends?: string[];

  // Competitive Landscape
  competitors?: Array<{
    name: string;
    strengths: string;
    weaknesses: string;
  }>;
  competitiveAdvantage?: string;

  // Business Model
  revenueStreams?: string[];
  pricingStrategy?: string;
  costStructure?: string;

  // Go-to-Market
  marketingStrategy?: string;
  salesChannels?: string[];
  customerAcquisition?: string;

  // Financial Projections (PRO/FULL only)
  financialProjections?: {
    year1Revenue?: string;
    year2Revenue?: string;
    year3Revenue?: string;
    breakEvenPoint?: string;
  };

  // Team & Operations (FULL only)
  teamRequirements?: string[];
  milestones?: Array<{
    milestone: string;
    timeline: string;
  }>;

  // Scores
  scores?: {
    opportunity?: number;
    problem?: number;
    feasibility?: number;
    whyNow?: number;
  };

  // New research-backed fields
  scoreJustifications?: {
    opportunity?: ScoreJustification;
    problem?: ScoreJustification;
    feasibility?: ScoreJustification;
    whyNow?: ScoreJustification;
  };

  userStory?: {
    scenario: string;
    protagonist: string;
    problem: string;
    solution: string;
    outcome: string;
  };

  marketSizing?: {
    tam?: MarketMetricPDF;
    sam?: MarketMetricPDF;
    som?: MarketMetricPDF;
    methodology?: string;
  };

  whyNow?: {
    marketTriggers: Array<Record<string, unknown> | string>;
    technologyShifts: string[];
    regulatoryChanges: string[];
    consumerBehaviorTrends: string[];
    urgencyScore?: number;
    summary?: string;
  };

  proofSignals?: {
    demandIndicators: string[];
    validationOpportunities: string[];
    riskFactors: string[];
    demandScore?: number;
    summary?: string;
  };

  socialProof?: {
    posts: Array<Record<string, unknown>>;
    summary?: string;
    painPointsValidated: string[];
    demandSignals: string[];
  };

  painPoints?: PainPointPDF[];

  businessFit?: BusinessFitPDF;

  techStack?: {
    businessType: string;
    layers?: Record<string, TechLayerItem[]>;
    estimatedMonthlyCost?: { min: number; max: number };
    summary?: string;
    securityConsiderations: string[];
  };

  valueLadder?: ValueLadderTier[];

  actionPrompts?: ActionPromptPDF[];

  keywordTrends?: KeywordTrendPDF[];
}

// ============================================
// COMPONENTS
// ============================================

function Header({ title, ideaTitle, date, tier }: { title: string; ideaTitle: string; date: Date; tier: string }) {
  return (
    <View style={baseStyles.header}>
      <View style={baseStyles.headerBrand}>
        <Text style={baseStyles.logo}>ideationLab</Text>
        <Text style={baseStyles.logoTagline}>Business Intelligence</Text>
      </View>
      <Text style={baseStyles.reportTitle}>{title}</Text>
      <Text style={baseStyles.ideaTitle}>{ideaTitle}</Text>
      <View style={baseStyles.metaRow}>
        <View style={baseStyles.metaItem}>
          <Text style={baseStyles.metaLabel}>Generated</Text>
          <Text style={baseStyles.metaValue}>
            {date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
        <View style={baseStyles.metaItem}>
          <Text style={baseStyles.metaLabel}>Report Tier</Text>
          <Text style={baseStyles.metaValue}>{tier}</Text>
        </View>
      </View>
    </View>
  );
}

function PageHeader({ title }: { title: string }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={baseStyles.headerBrand}>
        <Text style={baseStyles.logo}>ideationLab</Text>
      </View>
      <Text style={[baseStyles.h2, { marginBottom: 0 }]}>{title}</Text>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Section({ title, children }: { title: string; children?: any }) {
  return (
    <View style={baseStyles.section}>
      <Text style={baseStyles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={baseStyles.list}>
      {items.map((item, index) => (
        <View key={index} style={baseStyles.bulletPoint}>
          <Text style={baseStyles.bullet}>•</Text>
          <Text style={baseStyles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function NumberedList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={baseStyles.list}>
      {items.map((item, index) => (
        <View key={index} style={baseStyles.numberedItem}>
          <Text style={baseStyles.number}>{index + 1}.</Text>
          <Text style={baseStyles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function ScoreCard({ label, value, justification }: { label: string; value?: number; justification?: ScoreJustification }) {
  const displayValue = value ?? '--';
  const scoreColor = getScoreColor(value);
  const bgColor = getScoreBackgroundColor(value);

  return (
    <View
      style={[
        baseStyles.scoreBoxHighlight,
        {
          backgroundColor: bgColor,
          borderColor: scoreColor,
        },
      ]}
    >
      <Text style={[baseStyles.scoreValue, { color: scoreColor }]}>{displayValue}</Text>
      <Text style={baseStyles.scoreLabel}>{label}</Text>
      {value !== undefined && value !== null && (
        <View style={baseStyles.scoreBar}>
          <View
            style={[
              baseStyles.scoreBarFill,
              {
                width: `${value}%`,
                backgroundColor: scoreColor,
              },
            ]}
          />
        </View>
      )}
      {justification?.justification && (
        <Text style={[baseStyles.caption, { marginTop: 4, textAlign: 'center' }]}>
          {justification.justification.length > 80
            ? justification.justification.slice(0, 80) + '...'
            : justification.justification}
        </Text>
      )}
    </View>
  );
}

function CompetitorCard({
  name,
  strengths,
  weaknesses,
  index,
}: {
  name: string;
  strengths: string;
  weaknesses: string;
  index: number;
}) {
  return (
    <View style={baseStyles.card}>
      <View style={baseStyles.cardHeader}>
        <Text style={baseStyles.h3}>{name}</Text>
        <View style={baseStyles.badge}>
          <Text style={baseStyles.badgeText}>Competitor {index + 1}</Text>
        </View>
      </View>
      <View style={baseStyles.twoColumn}>
        <View style={baseStyles.columnHalf}>
          <Text style={baseStyles.label}>Strengths</Text>
          <Text style={baseStyles.paragraphSmall}>{strengths}</Text>
        </View>
        <View style={baseStyles.columnHalf}>
          <Text style={baseStyles.label}>Weaknesses</Text>
          <Text style={baseStyles.paragraphSmall}>{weaknesses}</Text>
        </View>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View style={baseStyles.footer} fixed>
      <View style={baseStyles.footerLeft}>
        <Text style={baseStyles.footerLogo}>ideationLab</Text>
        <View style={baseStyles.footerDivider} />
        <Text style={baseStyles.footerConfidential}>Confidential</Text>
      </View>
      <Text
        style={baseStyles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

function RatingBadge({ rating, type }: { rating: string; type: 'revenue' | 'execution' | 'gtm' | 'fit' }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    high: { bg: colors.successLight, text: colors.success },
    medium: { bg: colors.warningLight, text: colors.warning },
    low: { bg: colors.errorLight, text: colors.error },
    easy: { bg: colors.successLight, text: colors.success },
    hard: { bg: colors.errorLight, text: colors.error },
    strong: { bg: colors.successLight, text: colors.success },
    moderate: { bg: colors.warningLight, text: colors.warning },
    weak: { bg: colors.errorLight, text: colors.error },
  };
  const style = colorMap[rating] || colorMap.medium;

  return (
    <View style={[baseStyles.badge, { backgroundColor: style.bg }]}>
      <Text style={[baseStyles.badgeText, { color: style.text }]}>{rating.toUpperCase()}</Text>
    </View>
  );
}

function MarketSizingCard({ label, metric }: { label: string; metric: MarketMetricPDF }) {
  return (
    <View style={[baseStyles.card, { flex: 1, minWidth: 140 }]}>
      <Text style={[baseStyles.label, { textAlign: 'center', marginBottom: 4 }]}>{label}</Text>
      <Text style={[baseStyles.h2, { textAlign: 'center', color: colors.accent, marginBottom: 4, fontSize: 20 }]}>
        {metric.formattedValue}
      </Text>
      <Text style={[baseStyles.caption, { textAlign: 'center' }]}>
        {metric.growthRate}% CAGR | {metric.timeframe}
      </Text>
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function BusinessPlanPDF({ data }: { data: BusinessPlanData }) {
  const isPro = data.tier === 'PRO' || data.tier === 'FULL';
  const isFull = data.tier === 'FULL';

  return (
    <Document>
      {/* Page 1: Executive Summary & Scores */}
      <Page size="A4" style={baseStyles.page}>
        <Header title="Business Plan" ideaTitle={data.ideaTitle} date={data.generatedAt} tier={data.tier} />

        {/* Scores Overview */}
        {data.scores && (
          <View style={baseStyles.scoreContainer}>
            <ScoreCard label="Opportunity" value={data.scores.opportunity} justification={data.scoreJustifications?.opportunity} />
            <ScoreCard label="Problem" value={data.scores.problem} justification={data.scoreJustifications?.problem} />
            <ScoreCard label="Feasibility" value={data.scores.feasibility} justification={data.scoreJustifications?.feasibility} />
            <ScoreCard label="Timing" value={data.scores.whyNow} justification={data.scoreJustifications?.whyNow} />
          </View>
        )}

        <Section title="Executive Summary">
          <Text style={baseStyles.paragraph}>{data.executiveSummary || data.ideaDescription}</Text>
        </Section>

        {data.uniqueValueProposition && (
          <View style={baseStyles.highlightCard}>
            <Text style={baseStyles.label}>Unique Value Proposition</Text>
            <Text style={[baseStyles.paragraph, { marginBottom: 0, fontWeight: 500 }]}>
              {data.uniqueValueProposition}
            </Text>
          </View>
        )}

        <View style={baseStyles.twoColumn}>
          <View style={baseStyles.columnHalf}>
            <Text style={baseStyles.label}>Problem</Text>
            <Text style={baseStyles.paragraphSmall}>
              {data.problemStatement || 'Analysis pending research completion.'}
            </Text>
          </View>
          <View style={baseStyles.columnHalf}>
            <Text style={baseStyles.label}>Solution</Text>
            <Text style={baseStyles.paragraphSmall}>
              {data.solution || 'Details pending research completion.'}
            </Text>
          </View>
        </View>

        <Footer />
      </Page>

      {/* Page 2: User Story (if exists) */}
      {data.userStory && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="User Story" />

          <View style={baseStyles.highlightCard}>
            <Text style={[baseStyles.paragraph, { marginBottom: 0 }]}>
              {data.userStory.scenario}
            </Text>
          </View>

          <View style={baseStyles.spacer} />

          <View style={baseStyles.card}>
            <View style={baseStyles.twoColumn}>
              <View style={baseStyles.columnHalf}>
                <Text style={baseStyles.label}>Protagonist</Text>
                <Text style={baseStyles.paragraphSmall}>{data.userStory.protagonist}</Text>
              </View>
              <View style={baseStyles.columnHalf}>
                <Text style={baseStyles.label}>Outcome</Text>
                <Text style={baseStyles.paragraphSmall}>{data.userStory.outcome}</Text>
              </View>
            </View>
          </View>

          <View style={baseStyles.spacer} />

          <View style={baseStyles.twoColumn}>
            <View style={baseStyles.columnHalf}>
              <View style={baseStyles.errorCard}>
                <Text style={baseStyles.label}>The Problem</Text>
                <Text style={[baseStyles.paragraphSmall, { marginBottom: 0 }]}>{data.userStory.problem}</Text>
              </View>
            </View>
            <View style={baseStyles.columnHalf}>
              <View style={baseStyles.successCard}>
                <Text style={baseStyles.label}>The Solution</Text>
                <Text style={[baseStyles.paragraphSmall, { marginBottom: 0 }]}>{data.userStory.solution}</Text>
              </View>
            </View>
          </View>

          <Footer />
        </Page>
      )}

      {/* Page 3: Market Analysis + Market Sizing */}
      <Page size="A4" style={baseStyles.page}>
        <PageHeader title="Market Analysis" />

        {data.marketSizing && (data.marketSizing.tam || data.marketSizing.sam || data.marketSizing.som) && (
          <Section title="Market Sizing">
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {data.marketSizing.tam && <MarketSizingCard label="TAM" metric={data.marketSizing.tam} />}
              {data.marketSizing.sam && <MarketSizingCard label="SAM" metric={data.marketSizing.sam} />}
              {data.marketSizing.som && <MarketSizingCard label="SOM" metric={data.marketSizing.som} />}
            </View>
            {data.marketSizing.methodology && (
              <Text style={baseStyles.caption}>{data.marketSizing.methodology}</Text>
            )}
          </Section>
        )}

        <Section title="Target Market">
          <Text style={baseStyles.paragraph}>{data.targetMarket || 'Market analysis pending.'}</Text>
        </Section>

        {data.marketSize && (
          <View style={baseStyles.infoCard}>
            <Text style={baseStyles.label}>Market Size & Opportunity</Text>
            <Text style={[baseStyles.paragraph, { marginBottom: 0 }]}>{data.marketSize}</Text>
          </View>
        )}

        {data.marketTrends && data.marketTrends.length > 0 && (
          <Section title="Key Market Trends">
            <NumberedList items={data.marketTrends} />
          </Section>
        )}

        {data.competitiveAdvantage && (
          <View style={baseStyles.successCard}>
            <Text style={baseStyles.label}>Your Competitive Advantage</Text>
            <Text style={[baseStyles.paragraph, { marginBottom: 0, fontWeight: 500 }]}>
              {data.competitiveAdvantage}
            </Text>
          </View>
        )}

        <Footer />
      </Page>

      {/* Page 4: Why Now + Proof Signals */}
      {(data.whyNow || data.proofSignals) && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Why Now & Market Signals" />

          {data.whyNow && (
            <>
              {data.whyNow.summary && (
                <View style={baseStyles.highlightCard}>
                  <Text style={[baseStyles.paragraph, { marginBottom: 0 }]}>{data.whyNow.summary}</Text>
                </View>
              )}

              {data.whyNow.urgencyScore !== undefined && (
                <View style={[baseStyles.inlineStat, { marginBottom: 12 }]}>
                  <Text style={baseStyles.inlineStatLabel}>Urgency Score</Text>
                  <Text style={[baseStyles.inlineStatValue, { color: getScoreColor(data.whyNow.urgencyScore * 10) }]}>
                    {data.whyNow.urgencyScore}/10
                  </Text>
                </View>
              )}

              {data.whyNow.marketTriggers.length > 0 && (
                <Section title="Market Triggers">
                  <BulletList items={data.whyNow.marketTriggers.map((t) =>
                    typeof t === 'string' ? t : ((t as Record<string, unknown>).trigger as string) || ''
                  ).filter(Boolean)} />
                </Section>
              )}

              {data.whyNow.technologyShifts.length > 0 && (
                <Section title="Technology Shifts">
                  <BulletList items={data.whyNow.technologyShifts} />
                </Section>
              )}

              {data.whyNow.consumerBehaviorTrends.length > 0 && (
                <Section title="Consumer Behavior Trends">
                  <BulletList items={data.whyNow.consumerBehaviorTrends} />
                </Section>
              )}
            </>
          )}

          {data.proofSignals && (
            <>
              {data.proofSignals.summary && (
                <View style={[baseStyles.infoCard, { marginTop: 12 }]}>
                  <Text style={baseStyles.label}>Proof of Demand</Text>
                  <Text style={[baseStyles.paragraph, { marginBottom: 0 }]}>{data.proofSignals.summary}</Text>
                </View>
              )}

              {data.proofSignals.demandIndicators.length > 0 && (
                <Section title="Demand Indicators">
                  <BulletList items={data.proofSignals.demandIndicators} />
                </Section>
              )}

              {data.proofSignals.validationOpportunities.length > 0 && (
                <Section title="Validation Opportunities">
                  <BulletList items={data.proofSignals.validationOpportunities} />
                </Section>
              )}

              {data.proofSignals.riskFactors.length > 0 && (
                <Section title="Risk Factors">
                  <View style={baseStyles.warningCard}>
                    <BulletList items={data.proofSignals.riskFactors} />
                  </View>
                </Section>
              )}
            </>
          )}

          <Footer />
        </Page>
      )}

      {/* Page 5: Competitive Landscape (if competitors exist) */}
      {data.competitors && data.competitors.length > 0 && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Competitive Landscape" />

          <Section title="Key Competitors">
            {data.competitors.slice(0, 4).map((competitor, index) => (
              <CompetitorCard
                key={index}
                name={competitor.name}
                strengths={competitor.strengths}
                weaknesses={competitor.weaknesses}
                index={index}
              />
            ))}
          </Section>

          <Footer />
        </Page>
      )}

      {/* Page 6: Pain Points */}
      {data.painPoints && data.painPoints.length > 0 && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Pain Points Analysis" />

          {data.painPoints.slice(0, 6).map((pp, index) => {
            const severityColor = pp.severity === 'high' || pp.severity === 'critical'
              ? colors.error : pp.severity === 'medium' ? colors.warning : colors.success;
            const severityBg = pp.severity === 'high' || pp.severity === 'critical'
              ? colors.errorLight : pp.severity === 'medium' ? colors.warningLight : colors.successLight;

            return (
              <View key={index} style={[baseStyles.card, { marginBottom: 8 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={baseStyles.h4}>{pp.problem}</Text>
                  <View style={[baseStyles.badge, { backgroundColor: severityBg }]}>
                    <Text style={[baseStyles.badgeText, { color: severityColor }]}>{pp.severity?.toUpperCase()}</Text>
                  </View>
                </View>
                {pp.description && (
                  <Text style={[baseStyles.paragraphSmall, { marginBottom: 4 }]}>{pp.description}</Text>
                )}
                {pp.currentSolutions.length > 0 && (
                  <>
                    <Text style={[baseStyles.label, { marginTop: 4 }]}>Current Solutions</Text>
                    <BulletList items={pp.currentSolutions} />
                  </>
                )}
                {pp.gaps.length > 0 && (
                  <>
                    <Text style={[baseStyles.label, { marginTop: 4 }]}>Gaps / Opportunities</Text>
                    <BulletList items={pp.gaps} />
                  </>
                )}
              </View>
            );
          })}

          <Footer />
        </Page>
      )}

      {/* Page 7: Business Fit */}
      {data.businessFit && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Business Fit Assessment" />

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {data.businessFit.revenuePotential && (
              <View style={[baseStyles.card, { flex: 1, minWidth: 200 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={baseStyles.h4}>Revenue Potential</Text>
                  <RatingBadge rating={data.businessFit.revenuePotential.rating} type="revenue" />
                </View>
                <Text style={baseStyles.paragraphSmall}>{data.businessFit.revenuePotential.estimate}</Text>
                <Text style={baseStyles.caption}>Confidence: {data.businessFit.revenuePotential.confidence}%</Text>
              </View>
            )}
            {data.businessFit.executionDifficulty && (
              <View style={[baseStyles.card, { flex: 1, minWidth: 200 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={baseStyles.h4}>Execution Difficulty</Text>
                  <RatingBadge rating={data.businessFit.executionDifficulty.rating} type="execution" />
                </View>
                {data.businessFit.executionDifficulty.factors.length > 0 && (
                  <BulletList items={data.businessFit.executionDifficulty.factors} />
                )}
                <Text style={baseStyles.caption}>
                  Solo-friendly: {data.businessFit.executionDifficulty.soloFriendly ? 'Yes' : 'No'}
                </Text>
              </View>
            )}
          </View>

          <View style={[baseStyles.spacer, { height: 8 }]} />

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {data.businessFit.gtmClarity && (
              <View style={[baseStyles.card, { flex: 1, minWidth: 200 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={baseStyles.h4}>GTM Clarity</Text>
                  <RatingBadge rating={data.businessFit.gtmClarity.rating} type="gtm" />
                </View>
                {data.businessFit.gtmClarity.channels.length > 0 && (
                  <>
                    <Text style={baseStyles.label}>Channels</Text>
                    <BulletList items={data.businessFit.gtmClarity.channels} />
                  </>
                )}
                <Text style={baseStyles.caption}>Confidence: {data.businessFit.gtmClarity.confidence}%</Text>
              </View>
            )}
            {data.businessFit.founderFit && (
              <View style={[baseStyles.card, { flex: 1, minWidth: 200 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={baseStyles.h4}>Founder Fit</Text>
                  <View style={[baseStyles.badge, { backgroundColor: colors.accentLight }]}>
                    <Text style={[baseStyles.badgeText, { color: colors.accent }]}>{data.businessFit.founderFit.percentage}%</Text>
                  </View>
                </View>
                {data.businessFit.founderFit.strengths.length > 0 && (
                  <>
                    <Text style={baseStyles.label}>Strengths</Text>
                    <BulletList items={data.businessFit.founderFit.strengths} />
                  </>
                )}
                {data.businessFit.founderFit.gaps.length > 0 && (
                  <>
                    <Text style={baseStyles.label}>Gaps</Text>
                    <BulletList items={data.businessFit.founderFit.gaps} />
                  </>
                )}
              </View>
            )}
          </View>

          <Footer />
        </Page>
      )}

      {/* Page 8: Business Model & Go-to-Market */}
      <Page size="A4" style={baseStyles.page}>
        <PageHeader title="Business Model" />

        {(data.revenueStreams?.length || data.pricingStrategy || data.costStructure) && (
          <Section title="Revenue Model">
            {data.revenueStreams && data.revenueStreams.length > 0 && (
              <>
                <Text style={baseStyles.label}>Revenue Streams</Text>
                <BulletList items={data.revenueStreams} />
              </>
            )}

            <View style={baseStyles.twoColumn}>
              {data.pricingStrategy && (
                <View style={baseStyles.columnHalf}>
                  <Text style={baseStyles.label}>Pricing Strategy</Text>
                  <Text style={baseStyles.paragraphSmall}>{data.pricingStrategy}</Text>
                </View>
              )}
              {data.costStructure && (
                <View style={baseStyles.columnHalf}>
                  <Text style={baseStyles.label}>Cost Structure</Text>
                  <Text style={baseStyles.paragraphSmall}>{data.costStructure}</Text>
                </View>
              )}
            </View>
          </Section>
        )}

        <Section title="Go-to-Market Strategy">
          {data.marketingStrategy && <Text style={baseStyles.paragraph}>{data.marketingStrategy}</Text>}

          {data.salesChannels && data.salesChannels.length > 0 && (
            <>
              <Text style={baseStyles.label}>Sales Channels</Text>
              <BulletList items={data.salesChannels} />
            </>
          )}

          {data.customerAcquisition && (
            <View style={baseStyles.highlightCard}>
              <Text style={baseStyles.label}>Customer Acquisition Strategy</Text>
              <Text style={[baseStyles.paragraphSmall, { marginBottom: 0 }]}>{data.customerAcquisition}</Text>
            </View>
          )}
        </Section>

        <Footer />
      </Page>

      {/* Page 9: Tech Stack (if exists) */}
      {data.techStack && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Recommended Tech Stack" />

          {data.techStack.summary && (
            <View style={baseStyles.infoCard}>
              <Text style={[baseStyles.paragraph, { marginBottom: 0 }]}>{data.techStack.summary}</Text>
            </View>
          )}

          <View style={baseStyles.spacer} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={baseStyles.inlineStat}>
              <Text style={baseStyles.inlineStatLabel}>Business Type</Text>
              <Text style={baseStyles.inlineStatValue}>{data.techStack.businessType?.toUpperCase()}</Text>
            </View>
            {data.techStack.estimatedMonthlyCost && (
              <View style={baseStyles.inlineStat}>
                <Text style={baseStyles.inlineStatLabel}>Monthly Cost</Text>
                <Text style={baseStyles.inlineStatValue}>
                  ${data.techStack.estimatedMonthlyCost.min} - ${data.techStack.estimatedMonthlyCost.max}
                </Text>
              </View>
            )}
          </View>

          {data.techStack.layers && Object.entries(data.techStack.layers).map(([layerName, items]) => {
            if (!items || !Array.isArray(items) || items.length === 0) return null;
            const label = layerName.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
            return (
              <Section key={layerName} title={label}>
                <View style={baseStyles.table}>
                  <View style={baseStyles.tableHeader}>
                    <Text style={[baseStyles.tableCellHeader, { width: '30%' }]}>Technology</Text>
                    <Text style={[baseStyles.tableCellHeader, { width: '50%' }]}>Purpose</Text>
                    <Text style={[baseStyles.tableCellHeader, { width: '20%' }]}>Complexity</Text>
                  </View>
                  {(items as TechLayerItem[]).map((item, idx) => (
                    <View key={idx} style={idx % 2 === 0 ? baseStyles.tableRow : baseStyles.tableRowAlt}>
                      <Text style={[baseStyles.tableCell, { width: '30%', fontWeight: 600 }]}>{item.name}</Text>
                      <Text style={[baseStyles.tableCell, { width: '50%' }]}>{item.purpose || ''}</Text>
                      <Text style={[baseStyles.tableCell, { width: '20%' }]}>{item.complexity || ''}</Text>
                    </View>
                  ))}
                </View>
              </Section>
            );
          })}

          {data.techStack.securityConsiderations.length > 0 && (
            <Section title="Security Considerations">
              <BulletList items={data.techStack.securityConsiderations} />
            </Section>
          )}

          <Footer />
        </Page>
      )}

      {/* Page 10: Value Ladder (if exists) */}
      {data.valueLadder && data.valueLadder.length > 0 && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Value Ladder" />

          {data.valueLadder.map((tier, index) => (
            <View key={index} style={[baseStyles.card, { marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <View>
                  <Text style={baseStyles.h4}>{tier.title}</Text>
                  {tier.label && <Text style={baseStyles.caption}>{tier.label}</Text>}
                </View>
                <View style={[baseStyles.badge, { backgroundColor: colors.accentLight }]}>
                  <Text style={[baseStyles.badgeText, { color: colors.accent }]}>{tier.price}</Text>
                </View>
              </View>
              {tier.description && (
                <Text style={[baseStyles.paragraphSmall, { marginBottom: 4 }]}>{tier.description}</Text>
              )}
              {tier.features && tier.features.length > 0 && (
                <BulletList items={tier.features} />
              )}
            </View>
          ))}

          <Footer />
        </Page>
      )}

      {/* Page 11: Action Prompts / Next Steps (if exists) */}
      {data.actionPrompts && data.actionPrompts.length > 0 && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Action Prompts & Next Steps" />

          {data.actionPrompts.map((prompt, index) => (
            <View key={index} style={[baseStyles.card, { marginBottom: 8 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={baseStyles.h4}>{prompt.title}</Text>
                {prompt.category && (
                  <View style={baseStyles.badge}>
                    <Text style={baseStyles.badgeText}>{prompt.category}</Text>
                  </View>
                )}
              </View>
              <Text style={[baseStyles.paragraphSmall, { marginBottom: 0 }]}>{prompt.description}</Text>
            </View>
          ))}

          <Footer />
        </Page>
      )}

      {/* Page 12: Financial Projections (PRO/FULL only) */}
      {isPro && data.financialProjections && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Financial Projections" />

          <Section title="Revenue Forecast">
            <View style={baseStyles.table}>
              <View style={baseStyles.tableHeader}>
                <Text style={[baseStyles.tableCellHeader, { width: '30%' }]}>Period</Text>
                <Text style={[baseStyles.tableCellHeader, { width: '70%' }]}>Projected Revenue</Text>
              </View>
              <View style={baseStyles.tableRow}>
                <Text style={[baseStyles.tableCell, { width: '30%', fontWeight: 600 }]}>Year 1</Text>
                <Text style={[baseStyles.tableCell, { width: '70%' }]}>
                  {data.financialProjections.year1Revenue || 'To be determined'}
                </Text>
              </View>
              <View style={baseStyles.tableRowAlt}>
                <Text style={[baseStyles.tableCell, { width: '30%', fontWeight: 600 }]}>Year 2</Text>
                <Text style={[baseStyles.tableCell, { width: '70%' }]}>
                  {data.financialProjections.year2Revenue || 'To be determined'}
                </Text>
              </View>
              <View style={baseStyles.tableRow}>
                <Text style={[baseStyles.tableCell, { width: '30%', fontWeight: 600 }]}>Year 3</Text>
                <Text style={[baseStyles.tableCell, { width: '70%' }]}>
                  {data.financialProjections.year3Revenue || 'To be determined'}
                </Text>
              </View>
            </View>

            {data.financialProjections.breakEvenPoint && (
              <View style={baseStyles.successCard}>
                <Text style={baseStyles.label}>Break-Even Analysis</Text>
                <Text style={[baseStyles.paragraph, { marginBottom: 0 }]}>
                  {data.financialProjections.breakEvenPoint}
                </Text>
              </View>
            )}
          </Section>

          <Footer />
        </Page>
      )}

      {/* Page 13: Social Proof + Keywords (PRO/FULL) */}
      {isPro && (data.socialProof || data.keywordTrends) && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Social Proof & Keywords" />

          {data.socialProof && (
            <>
              {data.socialProof.summary && (
                <View style={baseStyles.infoCard}>
                  <Text style={baseStyles.label}>Social Proof Summary</Text>
                  <Text style={[baseStyles.paragraph, { marginBottom: 0 }]}>{data.socialProof.summary}</Text>
                </View>
              )}

              {data.socialProof.demandSignals.length > 0 && (
                <Section title="Demand Signals">
                  <BulletList items={data.socialProof.demandSignals} />
                </Section>
              )}

              {data.socialProof.painPointsValidated.length > 0 && (
                <Section title="Validated Pain Points">
                  <BulletList items={data.socialProof.painPointsValidated} />
                </Section>
              )}

              {data.socialProof.posts.length > 0 && (
                <Section title="Notable Mentions">
                  {(data.socialProof.posts as unknown as SocialProofPost[]).slice(0, 3).map((post, idx) => (
                    <View key={idx} style={[baseStyles.card, { marginBottom: 6 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={baseStyles.label}>{post.platform} - {post.author}</Text>
                        {post.sentiment && (
                          <View style={[baseStyles.badge, {
                            backgroundColor: post.sentiment === 'positive' ? colors.successLight
                              : post.sentiment === 'negative' ? colors.errorLight : colors.surfaceAlt,
                          }]}>
                            <Text style={[baseStyles.badgeText, {
                              color: post.sentiment === 'positive' ? colors.success
                                : post.sentiment === 'negative' ? colors.error : colors.textSecondary,
                            }]}>{post.sentiment}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[baseStyles.paragraphSmall, { marginBottom: 0 }]}>
                        {typeof post.content === 'string' && post.content.length > 200
                          ? post.content.slice(0, 200) + '...'
                          : post.content}
                      </Text>
                    </View>
                  ))}
                </Section>
              )}
            </>
          )}

          {data.keywordTrends && data.keywordTrends.length > 0 && (
            <Section title="Keyword Trends">
              <View style={baseStyles.table}>
                <View style={baseStyles.tableHeader}>
                  <Text style={[baseStyles.tableCellHeader, { width: '50%' }]}>Keyword</Text>
                  <Text style={[baseStyles.tableCellHeader, { width: '25%' }]}>Volume</Text>
                  <Text style={[baseStyles.tableCellHeader, { width: '25%' }]}>Growth</Text>
                </View>
                {data.keywordTrends.map((kw, idx) => (
                  <View key={idx} style={idx % 2 === 0 ? baseStyles.tableRow : baseStyles.tableRowAlt}>
                    <Text style={[baseStyles.tableCell, { width: '50%', fontWeight: 600 }]}>{kw.keyword}</Text>
                    <Text style={[baseStyles.tableCell, { width: '25%' }]}>{kw.volume?.toLocaleString()}</Text>
                    <Text style={[baseStyles.tableCell, { width: '25%', color: kw.growth > 0 ? colors.success : colors.error }]}>
                      {kw.growth > 0 ? '+' : ''}{kw.growth}%
                    </Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          <Footer />
        </Page>
      )}

      {/* Page 14: Team & Milestones (FULL only) */}
      {isFull && (data.teamRequirements?.length || data.milestones?.length) && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Implementation Plan" />

          {data.teamRequirements && data.teamRequirements.length > 0 && (
            <Section title="Team Requirements">
              <BulletList items={data.teamRequirements} />
            </Section>
          )}

          {data.milestones && data.milestones.length > 0 && (
            <Section title="Key Milestones">
              <View style={baseStyles.table}>
                <View style={baseStyles.tableHeader}>
                  <Text style={[baseStyles.tableCellHeader, { width: '65%' }]}>Milestone</Text>
                  <Text style={[baseStyles.tableCellHeader, { width: '35%' }]}>Timeline</Text>
                </View>
                {data.milestones.map((milestone, index) => (
                  <View key={index} style={index % 2 === 0 ? baseStyles.tableRow : baseStyles.tableRowAlt}>
                    <Text style={[baseStyles.tableCell, { width: '65%' }]}>{milestone.milestone}</Text>
                    <Text style={[baseStyles.tableCell, { width: '35%', fontWeight: 600 }]}>
                      {milestone.timeline}
                    </Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          <Footer />
        </Page>
      )}
    </Document>
  );
}

export default BusinessPlanPDF;
