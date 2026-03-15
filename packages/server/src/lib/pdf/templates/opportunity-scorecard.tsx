import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { baseStyles, colors, getScoreColor, getScoreBackgroundColor } from './base-styles';
import type { ScoredOpportunity, MoatAuditResult, MoatAssetType } from '@forge/shared';

// ============================================
// TYPES
// ============================================

export interface OpportunityScorecardData {
  ideaTitle: string;
  generatedAt: Date;
  tier: 'BASIC' | 'PRO' | 'FULL';
  opportunities: ScoredOpportunity[];
  moatAudit: MoatAuditResult | null;
  executiveSummary?: string;
  strategicRecommendation?: string;
}

const MOAT_LABELS: Record<MoatAssetType, string> = {
  'customer-captivity': 'Customer Captivity',
  'inherited-distribution': 'Inherited Distribution',
  'proprietary-assets': 'Proprietary Assets',
  'cost-advantage': 'Cost Advantage',
  'network-effects': 'Network Effects',
};

const DIMENSION_LABELS: Record<string, string> = {
  operationalFit: 'Operational Fit',
  revenuePotential: 'Revenue Potential',
  resourceRequirement: 'Resource Efficiency',
  strategicRisk: 'Strategic Safety',
  moatStrength: 'MOAT Strength',
};

const TIER_COLORS: Record<string, { text: string; bg: string }> = {
  Pursue: { text: colors.success, bg: colors.successLight },
  Explore: { text: colors.warning, bg: colors.warningLight },
  Defer: { text: colors.textMuted, bg: colors.surface },
};

// ============================================
// SHARED COMPONENTS
// ============================================

function Header({ ideaTitle, date, tier }: { ideaTitle: string; date: Date; tier: string }) {
  return (
    <View style={baseStyles.header}>
      <View style={baseStyles.headerBrand}>
        <Text style={baseStyles.logo}>ideationLab</Text>
        <Text style={baseStyles.logoTagline}>Expand Mode</Text>
      </View>
      <Text style={baseStyles.reportTitle}>Opportunity Scorecard</Text>
      <Text style={baseStyles.ideaTitle}>{ideaTitle}</Text>
      <View style={baseStyles.metaRow}>
        <View style={baseStyles.metaItem}>
          <Text style={baseStyles.metaLabel}>Generated</Text>
          <Text style={baseStyles.metaValue}>
            {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
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

function ScoreBar({ score, label }: { score: number; label: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={baseStyles.caption}>{label}</Text>
        <Text style={[baseStyles.caption, { fontWeight: 600 }]}>{score}/100</Text>
      </View>
      <View style={baseStyles.scoreBar}>
        <View
          style={[
            baseStyles.scoreBarFill,
            {
              width: `${score}%`,
              backgroundColor: getScoreColor(score),
            },
          ]}
        />
      </View>
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function OpportunityScorecardPDF({ data }: { data: OpportunityScorecardData }) {
  const pursueCount = data.opportunities.filter(o => o.tier === 'Pursue').length;
  const exploreCount = data.opportunities.filter(o => o.tier === 'Explore').length;
  const deferCount = data.opportunities.filter(o => o.tier === 'Defer').length;

  return (
    <Document>
      {/* Page 1: Cover — Executive Summary & MOAT Profile */}
      <Page size="A4" style={baseStyles.page}>
        <Header ideaTitle={data.ideaTitle} date={data.generatedAt} tier={data.tier} />

        {/* Tier summary */}
        <View style={[baseStyles.scoreContainer, { marginBottom: 20 }]}>
          <View style={[baseStyles.scoreBoxHighlight, { borderColor: colors.success, backgroundColor: colors.successLight }]}>
            <Text style={[baseStyles.scoreValue, { color: colors.success }]}>{pursueCount}</Text>
            <Text style={baseStyles.scoreLabel}>Pursue</Text>
          </View>
          <View style={[baseStyles.scoreBoxHighlight, { borderColor: colors.warning, backgroundColor: colors.warningLight }]}>
            <Text style={[baseStyles.scoreValue, { color: colors.warning }]}>{exploreCount}</Text>
            <Text style={baseStyles.scoreLabel}>Explore</Text>
          </View>
          <View style={[baseStyles.scoreBox]}>
            <Text style={[baseStyles.scoreValue, { color: colors.textMuted }]}>{deferCount}</Text>
            <Text style={baseStyles.scoreLabel}>Defer</Text>
          </View>
        </View>

        {/* Executive Summary */}
        {data.executiveSummary && (
          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>Executive Summary</Text>
            <Text style={baseStyles.paragraph}>{data.executiveSummary}</Text>
          </View>
        )}

        {/* MOAT Profile */}
        {data.moatAudit && (
          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>MOAT Profile</Text>
            <View style={baseStyles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={baseStyles.h4}>Overall MOAT Strength</Text>
                <Text style={[baseStyles.h3, { color: getScoreColor(data.moatAudit.overallMoatStrength), marginBottom: 0 }]}>
                  {data.moatAudit.overallMoatStrength}/100
                </Text>
              </View>
              <Text style={[baseStyles.paragraphSmall, { marginBottom: 12 }]}>{data.moatAudit.summary}</Text>
              {data.moatAudit.assets.map((asset) => (
                <ScoreBar
                  key={asset.type}
                  score={asset.score}
                  label={MOAT_LABELS[asset.type] || asset.type}
                />
              ))}
            </View>
          </View>
        )}

        <Footer />
      </Page>

      {/* Page 2+: Opportunities (2 per page) */}
      {Array.from({ length: Math.ceil(data.opportunities.length / 2) }).map((_, pageIdx) => {
        const pageOpps = data.opportunities.slice(pageIdx * 2, pageIdx * 2 + 2);
        return (
          <Page key={pageIdx} size="A4" style={baseStyles.page}>
            <PageHeader title={`Opportunities ${pageIdx * 2 + 1}–${Math.min(pageIdx * 2 + 2, data.opportunities.length)}`} />

            {pageOpps.map((opp, idx) => {
              const rank = pageIdx * 2 + idx + 1;
              const tierColor = TIER_COLORS[opp.tier] || TIER_COLORS.Defer;
              return (
                <View key={opp.id} style={[baseStyles.card, { marginBottom: 16 }]}>
                  {/* Header row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{
                      width: 24, height: 24, borderRadius: 12,
                      backgroundColor: tierColor.bg, alignItems: 'center', justifyContent: 'center',
                      marginRight: 8,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: 700, color: tierColor.text }}>{rank}</Text>
                    </View>
                    <Text style={[baseStyles.h3, { flex: 1, marginBottom: 0 }]}>{opp.title}</Text>
                    <View style={{ backgroundColor: tierColor.bg, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4, marginRight: 8 }}>
                      <Text style={{ fontSize: 8, fontWeight: 600, color: tierColor.text, textTransform: 'uppercase' }}>{opp.tier}</Text>
                    </View>
                    <Text style={[baseStyles.h3, { color: getScoreColor(opp.overallScore), marginBottom: 0 }]}>
                      {opp.overallScore}/100
                    </Text>
                  </View>

                  {/* Description */}
                  <Text style={[baseStyles.paragraphSmall, { marginBottom: 10 }]}>{opp.description}</Text>

                  {/* Score dimensions */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      {Object.entries(opp.scores).slice(0, 3).map(([key, value]) => (
                        <ScoreBar key={key} score={value} label={DIMENSION_LABELS[key] || key} />
                      ))}
                    </View>
                    <View style={{ flex: 1 }}>
                      {Object.entries(opp.scores).slice(3).map(([key, value]) => (
                        <ScoreBar key={key} score={value} label={DIMENSION_LABELS[key] || key} />
                      ))}
                    </View>
                  </View>

                  {/* MOAT Verdict */}
                  <View style={[baseStyles.dividerLight, { marginVertical: 8 }]} />
                  <Text style={baseStyles.label}>MOAT Verdict</Text>
                  <Text style={[baseStyles.paragraphSmall, { fontStyle: 'italic', marginBottom: 0 }]}>{opp.moatVerdict}</Text>

                  {/* Evidence */}
                  {opp.evidenceTrail && opp.evidenceTrail.length > 0 && (
                    <>
                      <View style={baseStyles.spacerSmall} />
                      <Text style={baseStyles.label}>Evidence</Text>
                      <View style={baseStyles.list}>
                        {opp.evidenceTrail.slice(0, 3).map((evidence, eIdx) => (
                          <View key={eIdx} style={baseStyles.bulletPoint}>
                            <Text style={baseStyles.bullet}>&bull;</Text>
                            <Text style={baseStyles.bulletText}>{evidence}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </View>
              );
            })}

            <Footer />
          </Page>
        );
      })}

      {/* Final page: Strategic Recommendation */}
      {data.strategicRecommendation && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Strategic Recommendation" />

          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>Recommendation</Text>
            <View style={baseStyles.highlightCard}>
              <Text style={baseStyles.paragraph}>{data.strategicRecommendation}</Text>
            </View>
          </View>

          <Footer />
        </Page>
      )}
    </Document>
  );
}

export default OpportunityScorecardPDF;
