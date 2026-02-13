import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { baseStyles, colors } from './base-styles';

interface CompetitiveAnalysisData {
  ideaTitle: string;
  ideaDescription: string;
  generatedAt: Date;
  tier: 'BASIC' | 'PRO' | 'FULL';

  // Market Overview
  marketOverview?: string;
  industryTrends?: string[];

  // Competitors
  competitors?: Array<{
    name: string;
    description: string;
    website?: string;
    pricing?: string;
    strengths: string[];
    weaknesses: string[];
    targetAudience?: string;
  }>;

  // SWOT Analysis
  swot?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };

  // Competitive Advantages
  competitiveAdvantages?: string[];
  differentiators?: string[];

  // Market Gaps (PRO/FULL)
  marketGaps?: string[];
  underservedSegments?: string[];

  // Strategic Recommendations (FULL)
  strategicRecommendations?: string[];
  competitiveStrategy?: string;
}

// ============================================
// COMPONENTS
// ============================================

function Header({ title, ideaTitle, date, tier }: { title: string; ideaTitle: string; date: Date; tier: string }) {
  return (
    <View style={baseStyles.header}>
      <View style={baseStyles.headerBrand}>
        <Text style={baseStyles.logo}>ideationLab</Text>
        <Text style={baseStyles.logoTagline}>Market Intelligence</Text>
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

function CompetitorCard({
  competitor,
  index,
}: {
  competitor: {
    name: string;
    description: string;
    website?: string;
    pricing?: string;
    strengths: string[];
    weaknesses: string[];
    targetAudience?: string;
  };
  index: number;
}) {
  return (
    <View style={baseStyles.card}>
      <View style={baseStyles.cardHeader}>
        <Text style={baseStyles.h3}>{competitor.name}</Text>
        <View style={baseStyles.badge}>
          <Text style={baseStyles.badgeText}>Competitor {index + 1}</Text>
        </View>
      </View>

      {competitor.website && (
        <Text style={[baseStyles.paragraphSmall, { color: colors.info, marginBottom: 8 }]}>
          {competitor.website}
        </Text>
      )}

      <Text style={baseStyles.paragraph}>{competitor.description}</Text>

      <View style={baseStyles.twoColumn}>
        {competitor.pricing && (
          <View style={baseStyles.columnHalf}>
            <Text style={baseStyles.label}>Pricing</Text>
            <Text style={baseStyles.paragraphSmall}>{competitor.pricing}</Text>
          </View>
        )}
        {competitor.targetAudience && (
          <View style={baseStyles.columnHalf}>
            <Text style={baseStyles.label}>Target Audience</Text>
            <Text style={baseStyles.paragraphSmall}>{competitor.targetAudience}</Text>
          </View>
        )}
      </View>

      <View style={baseStyles.dividerLight} />

      <View style={baseStyles.twoColumn}>
        <View style={baseStyles.columnHalf}>
          <Text style={[baseStyles.label, { color: colors.success }]}>Strengths</Text>
          <BulletList items={competitor.strengths} />
        </View>
        <View style={baseStyles.columnHalf}>
          <Text style={[baseStyles.label, { color: colors.error }]}>Weaknesses</Text>
          <BulletList items={competitor.weaknesses} />
        </View>
      </View>
    </View>
  );
}

function SwotQuadrant({
  title,
  items,
  bgColor,
  textColor,
}: {
  title: string;
  items: string[];
  bgColor: string;
  textColor: string;
}) {
  return (
    <View
      style={[
        baseStyles.card,
        {
          backgroundColor: bgColor,
          borderLeftWidth: 4,
          borderLeftColor: textColor,
          flex: 1,
        },
      ]}
    >
      <Text style={[baseStyles.h4, { color: textColor, marginBottom: 8 }]}>{title}</Text>
      <BulletList items={items} />
    </View>
  );
}

function Footer({ pageNumber }: { pageNumber: number }) {
  return (
    <View style={baseStyles.footer} fixed>
      <View style={baseStyles.footerLeft}>
        <Text style={baseStyles.footerLogo}>ideationLab</Text>
        <View style={baseStyles.footerDivider} />
        <Text style={baseStyles.footerConfidential}>Confidential</Text>
      </View>
      <Text style={baseStyles.pageNumber}>Page {pageNumber}</Text>
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CompetitiveAnalysisPDF({ data }: { data: CompetitiveAnalysisData }) {
  const isPro = data.tier === 'PRO' || data.tier === 'FULL';
  const isFull = data.tier === 'FULL';

  // Calculate dynamic page numbers based on content
  const hasCompetitors = data.competitors && data.competitors.length > 0;
  const hasMoreCompetitors = data.competitors && data.competitors.length > 2;
  const hasSwot = data.swot;

  return (
    <Document>
      {/* Page 1: Market Overview & Industry Trends */}
      <Page size="A4" style={baseStyles.page}>
        <Header title="Competitive Analysis" ideaTitle={data.ideaTitle} date={data.generatedAt} tier={data.tier} />

        <Section title="Market Overview">
          <View style={baseStyles.highlightCard}>
            <Text style={[baseStyles.paragraph, { marginBottom: 0 }]}>
              {data.marketOverview || 'Market overview pending research completion.'}
            </Text>
          </View>
        </Section>

        {data.industryTrends && data.industryTrends.length > 0 && (
          <Section title="Industry Trends">
            {data.industryTrends.map((trend, index) => (
              <View key={index} style={baseStyles.infoCard}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text style={[baseStyles.number, { color: colors.info }]}>{index + 1}.</Text>
                  <Text style={[baseStyles.paragraph, { marginBottom: 0, flex: 1 }]}>{trend}</Text>
                </View>
              </View>
            ))}
          </Section>
        )}

        <Footer pageNumber={1} />
      </Page>

      {/* Page 2: Competitor Profiles (First 2) */}
      {hasCompetitors && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Competitor Profiles" />

          <Section title="Key Competitors">
            {data.competitors!.slice(0, 2).map((competitor, index) => (
              <CompetitorCard key={index} competitor={competitor} index={index} />
            ))}
          </Section>

          <Footer pageNumber={2} />
        </Page>
      )}

      {/* Page 3: Additional Competitor Profiles (3-4) */}
      {hasMoreCompetitors && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Competitor Profiles" />

          <Section title="Additional Competitors">
            {data.competitors!.slice(2, 4).map((competitor, index) => (
              <CompetitorCard key={index} competitor={competitor} index={index + 2} />
            ))}
          </Section>

          <Footer pageNumber={3} />
        </Page>
      )}

      {/* SWOT Analysis Page */}
      {hasSwot && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="SWOT Analysis" />

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <SwotQuadrant
              title="Strengths"
              items={data.swot!.strengths}
              bgColor={colors.successLight}
              textColor={colors.success}
            />
            <SwotQuadrant
              title="Weaknesses"
              items={data.swot!.weaknesses}
              bgColor={colors.errorLight}
              textColor={colors.error}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <SwotQuadrant
              title="Opportunities"
              items={data.swot!.opportunities}
              bgColor={colors.infoLight}
              textColor={colors.info}
            />
            <SwotQuadrant
              title="Threats"
              items={data.swot!.threats}
              bgColor={colors.warningLight}
              textColor={colors.warning}
            />
          </View>

          <Footer pageNumber={hasMoreCompetitors ? 4 : hasCompetitors ? 3 : 2} />
        </Page>
      )}

      {/* Competitive Advantages Page */}
      <Page size="A4" style={baseStyles.page}>
        <PageHeader title="Your Competitive Position" />

        {data.competitiveAdvantages && data.competitiveAdvantages.length > 0 && (
          <Section title="Competitive Advantages">
            {data.competitiveAdvantages.map((advantage, index) => (
              <View key={index} style={baseStyles.successCard}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text style={[baseStyles.number, { color: colors.success }]}>{index + 1}.</Text>
                  <Text style={[baseStyles.paragraph, { marginBottom: 0, flex: 1 }]}>{advantage}</Text>
                </View>
              </View>
            ))}
          </Section>
        )}

        {data.differentiators && data.differentiators.length > 0 && (
          <Section title="Key Differentiators">
            <View style={baseStyles.card}>
              <BulletList items={data.differentiators} />
            </View>
          </Section>
        )}

        <Footer
          pageNumber={
            (hasSwot ? (hasMoreCompetitors ? 5 : hasCompetitors ? 4 : 3) : hasMoreCompetitors ? 4 : hasCompetitors ? 3 : 2)
          }
        />
      </Page>

      {/* Market Gaps (PRO/FULL) */}
      {isPro && (data.marketGaps?.length || data.underservedSegments?.length) && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Market Opportunities" />

          {data.marketGaps && data.marketGaps.length > 0 && (
            <Section title="Market Gaps">
              {data.marketGaps.map((gap, index) => (
                <View key={index} style={baseStyles.highlightCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View
                      style={[
                        baseStyles.badge,
                        { marginRight: 10, backgroundColor: colors.accentLight },
                      ]}
                    >
                      <Text style={baseStyles.badgeText}>Gap {index + 1}</Text>
                    </View>
                    <Text style={[baseStyles.paragraph, { marginBottom: 0, flex: 1 }]}>{gap}</Text>
                  </View>
                </View>
              ))}
            </Section>
          )}

          {data.underservedSegments && data.underservedSegments.length > 0 && (
            <Section title="Underserved Market Segments">
              <View style={baseStyles.infoCard}>
                <BulletList items={data.underservedSegments} />
              </View>
            </Section>
          )}

          <Footer
            pageNumber={
              (hasSwot ? (hasMoreCompetitors ? 6 : hasCompetitors ? 5 : 4) : hasMoreCompetitors ? 5 : hasCompetitors ? 4 : 3)
            }
          />
        </Page>
      )}

      {/* Strategic Recommendations (FULL) */}
      {isFull && (data.strategicRecommendations?.length || data.competitiveStrategy) && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Strategic Recommendations" />

          {data.competitiveStrategy && (
            <Section title="Recommended Competitive Strategy">
              <View style={baseStyles.successCard}>
                <Text style={[baseStyles.paragraph, { marginBottom: 0, fontWeight: 500 }]}>
                  {data.competitiveStrategy}
                </Text>
              </View>
            </Section>
          )}

          {data.strategicRecommendations && data.strategicRecommendations.length > 0 && (
            <Section title="Action Items">
              <View style={baseStyles.table}>
                <View style={baseStyles.tableHeader}>
                  <Text style={[baseStyles.tableCellHeader, { width: '10%' }]}>#</Text>
                  <Text style={[baseStyles.tableCellHeader, { width: '90%' }]}>Recommendation</Text>
                </View>
                {data.strategicRecommendations.map((rec, index) => (
                  <View key={index} style={index % 2 === 0 ? baseStyles.tableRow : baseStyles.tableRowAlt}>
                    <Text style={[baseStyles.tableCell, { width: '10%', fontWeight: 600, color: colors.accent }]}>
                      {index + 1}
                    </Text>
                    <Text style={[baseStyles.tableCell, { width: '90%' }]}>{rec}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          <Footer
            pageNumber={
              isPro && (data.marketGaps?.length || data.underservedSegments?.length)
                ? (hasSwot ? (hasMoreCompetitors ? 7 : hasCompetitors ? 6 : 5) : hasMoreCompetitors ? 6 : hasCompetitors ? 5 : 4)
                : (hasSwot ? (hasMoreCompetitors ? 6 : hasCompetitors ? 5 : 4) : hasMoreCompetitors ? 5 : hasCompetitors ? 4 : 3)
            }
          />
        </Page>
      )}
    </Document>
  );
}

export default CompetitiveAnalysisPDF;
