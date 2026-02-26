/**
 * Financial Model PDF Template — Investor Deck
 *
 * Renders a professional multi-page PDF with:
 *   - Cover page
 *   - Executive Summary (AI narrative)
 *   - P&L Summary table
 *   - Cash Flow Summary table
 *   - Balance Sheet Summary table
 *   - Key Metrics
 *   - Break-Even Analysis
 *   - Assumptions Summary
 */

import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { colors, baseStyles } from './base-styles';
import type { ComputedStatements, StatementData } from '@forge/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FinancialModelPDFProps {
  modelName: string;
  scenarioName: string;
  forecastYears: number;
  statements: ComputedStatements;
  narratives?: {
    executiveSummary?: string;
    revenueAnalysis?: string;
    costAnalysis?: string;
    cashPosition?: string;
  };
  breakEven?: {
    breakEvenPoint: number;
    breakEvenMonth: number;
    trajectory: Array<{ month: number; cumulativeProfit: number }>;
  } | null;
  assumptions: Array<{
    key: string;
    name: string;
    category: string;
    value: string | null;
    valueType: string;
    unit: string | null;
  }>;
  purpose?: 'investor' | 'loan' | 'internal';
}

// ---------------------------------------------------------------------------
// Local styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  coverPage: {
    ...baseStyles.coverPage,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -1,
  },
  coverSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  coverMeta: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  coverAccent: {
    width: 60,
    height: 4,
    backgroundColor: colors.accent,
    borderRadius: 2,
    marginBottom: 40,
  },
  statementTable: {
    marginBottom: 8,
  },
  stRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  stRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
  },
  stRowTotal: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  stRowSubtotal: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: colors.surfaceAlt,
  },
  stLabel: {
    flex: 3,
    fontSize: 9,
    color: colors.textSecondary,
  },
  stLabelBold: {
    flex: 3,
    fontSize: 9,
    fontWeight: 700,
    color: colors.primary,
  },
  stValue: {
    flex: 1,
    fontSize: 9,
    textAlign: 'right',
    color: colors.textSecondary,
  },
  stValueBold: {
    flex: 1,
    fontSize: 9,
    fontWeight: 700,
    textAlign: 'right',
    color: colors.primary,
  },
  stHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  stHeaderLabel: {
    flex: 3,
    fontSize: 8,
    fontWeight: 700,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stHeaderValue: {
    flex: 1,
    fontSize: 8,
    fontWeight: 700,
    color: colors.textMuted,
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.primary,
  },
  narrativeText: {
    fontSize: 10,
    lineHeight: 1.7,
    color: colors.textSecondary,
    marginBottom: 12,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(value: number): string {
  if (!isFinite(value)) return 'N/A';
  const negative = value < 0;
  const abs = Math.abs(value);
  const formatted = abs >= 1_000_000
    ? `$${(abs / 1_000_000).toFixed(1)}M`
    : abs >= 1_000
      ? `$${(abs / 1_000).toFixed(0)}K`
      : `$${abs.toFixed(0)}`;
  return negative ? `(${formatted})` : formatted;
}

function fmtFull(value: number): string {
  if (!isFinite(value)) return 'N/A';
  const negative = value < 0;
  const abs = Math.abs(value);
  const formatted = `$${abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return negative ? `(${formatted})` : formatted;
}

/**
 * Pick annual summary columns from a statement for the PDF.
 * Shows: Y1 Total, Y2 Total, Y3, Y4, Y5.
 */
function annualSummaryPeriods(statement: StatementData): { labels: string[]; indices: number[][] } {
  const labels: string[] = [];
  const indices: number[][] = [];

  // Y1: sum of monthly periods (first 12)
  labels.push('Year 1');
  indices.push(Array.from({ length: Math.min(12, statement.periods.length) }, (_, i) => i));

  // Y2: sum of quarterly periods (next 4)
  if (statement.periods.length > 12) {
    labels.push('Year 2');
    const y2Start = 12;
    const y2End = Math.min(16, statement.periods.length);
    indices.push(Array.from({ length: y2End - y2Start }, (_, i) => y2Start + i));
  }

  // Y3-Y5: individual annual periods
  for (let y = 3; y <= 5; y++) {
    const idx = statement.periods.findIndex((p) => p === `Y${y}`);
    if (idx >= 0) {
      labels.push(`Year ${y}`);
      indices.push([idx]);
    }
  }

  return { labels, indices };
}

function sumIndices(values: number[], indices: number[]): number {
  return indices.reduce((sum, i) => sum + (values[i] ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function Footer({ pageLabel }: { pageLabel?: string }) {
  return (
    <View style={baseStyles.footer} fixed>
      <View style={baseStyles.footerLeft}>
        <Text style={baseStyles.footerLogo}>IDEATIONLAB</Text>
        <View style={baseStyles.footerDivider} />
        <Text style={baseStyles.footerText}>Financial Projections</Text>
      </View>
      <Text style={baseStyles.footerConfidential}>Confidential</Text>
    </View>
  );
}

function StatementTable({ statement, title }: { statement: StatementData; title: string }) {
  const { labels, indices } = annualSummaryPeriods(statement);

  return (
    <View style={baseStyles.section}>
      <Text style={baseStyles.sectionTitle}>{title}</Text>
      <View style={s.statementTable}>
        {/* Header */}
        <View style={s.stHeader}>
          <Text style={s.stHeaderLabel}>Line Item</Text>
          {labels.map((label) => (
            <Text key={label} style={s.stHeaderValue}>{label}</Text>
          ))}
        </View>

        {/* Rows */}
        {statement.lines.map((line, idx) => {
          const isTotal = line.isTotal;
          const isSubtotal = line.isSubtotal;
          const rowStyle = isTotal ? s.stRowTotal : isSubtotal ? s.stRowSubtotal : idx % 2 === 0 ? s.stRow : s.stRowAlt;
          const labelStyle = (isTotal || isSubtotal) ? s.stLabelBold : s.stLabel;
          const valueStyle = (isTotal || isSubtotal) ? s.stValueBold : s.stValue;

          return (
            <View key={line.key} style={rowStyle}>
              <Text style={labelStyle}>{line.name}</Text>
              {indices.map((periodIndices, pi) => (
                <Text key={pi} style={valueStyle}>
                  {fmt(sumIndices(line.values, periodIndices))}
                </Text>
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Document
// ---------------------------------------------------------------------------

export function FinancialModelPDF(props: FinancialModelPDFProps) {
  const { modelName, scenarioName, forecastYears, statements, narratives, breakEven, assumptions, purpose } = props;
  const { pl, bs, cf } = statements;

  const lastPeriod = pl.periods.length - 1;
  const revenueLine = pl.lines.find((l) => l.key === 'total_revenue' || l.key === 'revenue');
  const netIncomeLine = pl.lines.find((l) => l.key === 'net_income');
  const endingCashLine = cf.lines.find((l) => l.key === 'ending_cash');
  const totalRevenue = revenueLine?.values.reduce((s, v) => s + v, 0) ?? 0;
  const finalNetIncome = netIncomeLine?.values[lastPeriod] ?? 0;
  const finalCash = endingCashLine?.values[lastPeriod] ?? 0;

  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const purposeLabel = purpose === 'investor' ? 'Investor Presentation' : purpose === 'loan' ? 'Loan Application' : 'Internal Planning';

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={s.coverPage}>
        <Text style={s.coverTitle}>{modelName}</Text>
        <View style={s.coverAccent} />
        <Text style={s.coverSubtitle}>Financial Projections — {forecastYears}-Year Forecast</Text>
        <Text style={s.coverMeta}>{scenarioName}</Text>
        <Text style={s.coverMeta}>{dateStr}</Text>
        <Text style={s.coverMeta}>{purposeLabel}</Text>
      </Page>

      {/* Executive Summary */}
      {narratives?.executiveSummary && (
        <Page size="A4" style={baseStyles.page}>
          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>Executive Summary</Text>
            <Text style={s.narrativeText}>{narratives.executiveSummary}</Text>
          </View>

          {/* Key Metrics */}
          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>Key Metrics</Text>
            <View style={s.metricRow}>
              <Text style={s.metricLabel}>Cumulative Revenue ({forecastYears}yr)</Text>
              <Text style={s.metricValue}>{fmtFull(totalRevenue)}</Text>
            </View>
            <View style={s.metricRow}>
              <Text style={s.metricLabel}>Final Year Net Income</Text>
              <Text style={s.metricValue}>{fmtFull(finalNetIncome)}</Text>
            </View>
            <View style={s.metricRow}>
              <Text style={s.metricLabel}>Ending Cash Balance</Text>
              <Text style={s.metricValue}>{fmtFull(finalCash)}</Text>
            </View>
            {breakEven && (
              <>
                <View style={s.metricRow}>
                  <Text style={s.metricLabel}>Break-Even Point</Text>
                  <Text style={s.metricValue}>
                    {breakEven.breakEvenMonth >= 0 ? `Month ${breakEven.breakEvenMonth + 1}` : 'Not achieved in 36 months'}
                  </Text>
                </View>
                <View style={s.metricRow}>
                  <Text style={s.metricLabel}>36-Month Cumulative P&L</Text>
                  <Text style={s.metricValue}>{fmtFull(breakEven.trajectory[Math.min(35, breakEven.trajectory.length - 1)]?.cumulativeProfit ?? 0)}</Text>
                </View>
              </>
            )}
          </View>
          <Footer />
        </Page>
      )}

      {/* P&L */}
      <Page size="A4" style={baseStyles.page}>
        <StatementTable statement={pl} title="Income Statement (P&L)" />
        {narratives?.revenueAnalysis && (
          <View style={baseStyles.section}>
            <Text style={baseStyles.h4}>Revenue Analysis</Text>
            <Text style={s.narrativeText}>{narratives.revenueAnalysis}</Text>
          </View>
        )}
        <Footer />
      </Page>

      {/* Cash Flow */}
      <Page size="A4" style={baseStyles.page}>
        <StatementTable statement={cf} title="Cash Flow Statement" />
        {narratives?.cashPosition && (
          <View style={baseStyles.section}>
            <Text style={baseStyles.h4}>Cash Position Analysis</Text>
            <Text style={s.narrativeText}>{narratives.cashPosition}</Text>
          </View>
        )}
        <Footer />
      </Page>

      {/* Balance Sheet */}
      <Page size="A4" style={baseStyles.page}>
        <StatementTable statement={bs} title="Balance Sheet" />
        <Footer />
      </Page>

      {/* Assumptions */}
      <Page size="A4" style={baseStyles.page}>
        <View style={baseStyles.section}>
          <Text style={baseStyles.sectionTitle}>Key Assumptions</Text>
          {assumptions.slice(0, 30).map((a, idx) => (
            <View key={a.key} style={idx % 2 === 0 ? s.stRow : s.stRowAlt}>
              <Text style={{ ...s.stLabel, flex: 2 }}>{a.name}</Text>
              <Text style={{ ...s.stValue, flex: 1 }}>
                {a.valueType === 'CURRENCY' ? `$${a.value ?? '0'}` :
                 a.valueType === 'PERCENTAGE' ? `${a.value ?? '0'}%` :
                 a.value ?? '—'}
              </Text>
              <Text style={{ ...s.stValue, flex: 1, color: colors.textMuted }}>{a.category}</Text>
            </View>
          ))}
        </View>

        {/* Footer disclaimer */}
        <View style={baseStyles.section}>
          <Text style={baseStyles.caption}>
            These financial projections are based on assumptions and estimates. Actual results may differ materially.
            This document is for informational purposes only and does not constitute financial advice.
          </Text>
        </View>
        <Footer />
      </Page>
    </Document>
  );
}
