import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { baseStyles, colors, getScoreColor } from './base-styles';

// ============================================
// TYPES
// ============================================

interface RiskItem {
  category: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  mitigation: string;
}

interface CannibalizationEntry {
  existingProduct: string;
  expansionOpportunity: string;
  overlapPercentage: number;
  revenueAtRisk: string;
  mitigation: string;
}

interface ResourceConflict {
  resource: string;
  currentUse: string;
  expansionNeed: string;
  resolution: string;
}

export interface RiskCannibalizationData {
  ideaTitle: string;
  generatedAt: Date;
  tier: 'BASIC' | 'PRO' | 'FULL';
  executiveSummary?: string;
  cannibalizationAnalysis?: {
    overallRisk: 'high' | 'medium' | 'low';
    entries: CannibalizationEntry[];
    summary: string;
  };
  strategicRisks?: RiskItem[];
  resourceConflicts?: ResourceConflict[];
  marketRisks?: string[];
  recommendation?: string;
}

const SEVERITY_COLORS: Record<string, { text: string; bg: string }> = {
  high: { text: colors.error, bg: colors.errorLight },
  medium: { text: colors.warning, bg: colors.warningLight },
  low: { text: colors.success, bg: colors.successLight },
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
      <Text style={baseStyles.reportTitle}>Risk & Cannibalization</Text>
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

function SeverityBadge({ severity }: { severity: string }) {
  const sev = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;
  return (
    <View style={{ backgroundColor: sev.bg, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4 }}>
      <Text style={{ fontSize: 8, fontWeight: 600, color: sev.text, textTransform: 'uppercase' }}>
        {severity}
      </Text>
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function RiskCannibalizationPDF({ data }: { data: RiskCannibalizationData }) {
  return (
    <Document>
      {/* Page 1: Executive Summary & Cannibalization Analysis */}
      <Page size="A4" style={baseStyles.page}>
        <Header ideaTitle={data.ideaTitle} date={data.generatedAt} tier={data.tier} />

        {/* Overall risk indicator */}
        {data.cannibalizationAnalysis && (
          <View style={[baseStyles.scoreContainer, { marginBottom: 20 }]}>
            <View style={[
              baseStyles.scoreBoxHighlight,
              {
                borderColor: SEVERITY_COLORS[data.cannibalizationAnalysis.overallRisk]?.text || colors.warning,
                backgroundColor: SEVERITY_COLORS[data.cannibalizationAnalysis.overallRisk]?.bg || colors.warningLight,
              },
            ]}>
              <Text style={baseStyles.label}>Overall Cannibalization Risk</Text>
              <Text style={[
                baseStyles.scoreValue,
                { color: SEVERITY_COLORS[data.cannibalizationAnalysis.overallRisk]?.text || colors.warning, textTransform: 'uppercase' },
              ]}>
                {data.cannibalizationAnalysis.overallRisk}
              </Text>
            </View>
          </View>
        )}

        {/* Executive Summary */}
        {data.executiveSummary && (
          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>Executive Summary</Text>
            <Text style={baseStyles.paragraph}>{data.executiveSummary}</Text>
          </View>
        )}

        {/* Cannibalization Summary */}
        {data.cannibalizationAnalysis && (
          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>Cannibalization Analysis</Text>
            <Text style={[baseStyles.paragraph, { marginBottom: 12 }]}>{data.cannibalizationAnalysis.summary}</Text>
          </View>
        )}

        <Footer />
      </Page>

      {/* Page 2: Cannibalization entries detail */}
      {data.cannibalizationAnalysis && data.cannibalizationAnalysis.entries.length > 0 && (
        <Page size="A4" style={baseStyles.page} wrap>
          <PageHeader title="Cannibalization Detail" />

          {data.cannibalizationAnalysis.entries.map((entry, idx) => (
            <View key={idx} style={baseStyles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={baseStyles.h4}>{entry.existingProduct}</Text>
                <View style={{
                  backgroundColor: getScoreColor(100 - entry.overlapPercentage) === colors.success
                    ? colors.successLight : getScoreColor(100 - entry.overlapPercentage) === colors.warning
                    ? colors.warningLight : colors.errorLight,
                  paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4,
                }}>
                  <Text style={{ fontSize: 8, fontWeight: 600, color: getScoreColor(100 - entry.overlapPercentage) }}>
                    {entry.overlapPercentage}% overlap
                  </Text>
                </View>
              </View>

              <View style={baseStyles.inlineStat}>
                <Text style={baseStyles.inlineStatLabel}>Expansion Opportunity</Text>
                <Text style={baseStyles.inlineStatValue}>{entry.expansionOpportunity}</Text>
              </View>
              <View style={baseStyles.inlineStat}>
                <Text style={baseStyles.inlineStatLabel}>Revenue at Risk</Text>
                <Text style={[baseStyles.inlineStatValue, { color: colors.error }]}>{entry.revenueAtRisk}</Text>
              </View>

              <View style={baseStyles.spacerSmall} />
              <Text style={baseStyles.label}>Mitigation</Text>
              <Text style={[baseStyles.paragraphSmall, { marginBottom: 0 }]}>{entry.mitigation}</Text>
            </View>
          ))}

          <Footer />
        </Page>
      )}

      {/* Page 3: Strategic Risks */}
      {data.strategicRisks && data.strategicRisks.length > 0 && (
        <Page size="A4" style={baseStyles.page} wrap>
          <PageHeader title="Strategic Risks" />

          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>Risk Assessment</Text>

            {data.strategicRisks.map((risk, idx) => {
              const sevStyle = SEVERITY_COLORS[risk.severity] || SEVERITY_COLORS.medium;
              return (
                <View key={idx} style={[baseStyles.card, { borderLeftWidth: 4, borderLeftColor: sevStyle.text }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={baseStyles.h4}>{risk.category}</Text>
                    <SeverityBadge severity={risk.severity} />
                  </View>
                  <Text style={[baseStyles.paragraphSmall, { marginBottom: 8 }]}>{risk.description}</Text>
                  <Text style={baseStyles.label}>Mitigation</Text>
                  <Text style={[baseStyles.paragraphSmall, { color: colors.success, marginBottom: 0 }]}>{risk.mitigation}</Text>
                </View>
              );
            })}
          </View>

          <Footer />
        </Page>
      )}

      {/* Page 4: Resource Conflicts & Market Risks */}
      {((data.resourceConflicts && data.resourceConflicts.length > 0) || (data.marketRisks && data.marketRisks.length > 0)) && (
        <Page size="A4" style={baseStyles.page} wrap>
          <PageHeader title="Resource & Market Risks" />

          {data.resourceConflicts && data.resourceConflicts.length > 0 && (
            <View style={baseStyles.section}>
              <Text style={baseStyles.sectionTitle}>Resource Conflicts</Text>

              {/* Table */}
              <View style={baseStyles.table}>
                <View style={baseStyles.tableHeader}>
                  <Text style={[baseStyles.tableCellHeader, { flex: 1.5 }]}>Resource</Text>
                  <Text style={[baseStyles.tableCellHeader, { flex: 2 }]}>Current Use</Text>
                  <Text style={[baseStyles.tableCellHeader, { flex: 2 }]}>Expansion Need</Text>
                  <Text style={[baseStyles.tableCellHeader, { flex: 2 }]}>Resolution</Text>
                </View>
                {data.resourceConflicts.map((conflict, idx) => (
                  <View key={idx} style={idx % 2 === 0 ? baseStyles.tableRow : baseStyles.tableRowAlt}>
                    <Text style={[baseStyles.tableCell, { flex: 1.5, fontWeight: 600 }]}>{conflict.resource}</Text>
                    <Text style={[baseStyles.tableCell, { flex: 2 }]}>{conflict.currentUse}</Text>
                    <Text style={[baseStyles.tableCell, { flex: 2 }]}>{conflict.expansionNeed}</Text>
                    <Text style={[baseStyles.tableCell, { flex: 2 }]}>{conflict.resolution}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {data.marketRisks && data.marketRisks.length > 0 && (
            <View style={baseStyles.section}>
              <Text style={baseStyles.sectionTitle}>Market Risks</Text>
              <View style={baseStyles.list}>
                {data.marketRisks.map((risk, idx) => (
                  <View key={idx} style={baseStyles.bulletPoint}>
                    <Text style={baseStyles.bullet}>&bull;</Text>
                    <Text style={baseStyles.bulletText}>{risk}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Footer />
        </Page>
      )}

      {/* Final page: Recommendation */}
      {data.recommendation && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader title="Recommendation" />

          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>Strategic Recommendation</Text>
            <View style={baseStyles.highlightCard}>
              <Text style={baseStyles.paragraph}>{data.recommendation}</Text>
            </View>
          </View>

          <Footer />
        </Page>
      )}
    </Document>
  );
}

export default RiskCannibalizationPDF;
