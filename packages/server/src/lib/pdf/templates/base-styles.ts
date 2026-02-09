import { StyleSheet } from '@react-pdf/renderer';

// Forge brand colors - Professional palette
export const colors = {
  // Primary brand
  primary: '#0f172a', // Slate 900 - Deep navy for text
  accent: '#e91e8c', // Forge pink
  accentLight: '#fce7f3', // Pink 100 - Light pink for backgrounds
  accentMuted: '#f9a8d4', // Pink 300

  // Neutrals
  white: '#ffffff',
  background: '#ffffff',
  surface: '#f8fafc', // Slate 50
  surfaceAlt: '#f1f5f9', // Slate 100
  border: '#e2e8f0', // Slate 200
  borderLight: '#f1f5f9', // Slate 100

  // Text
  text: '#0f172a', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94a3b8', // Slate 400
  textLight: '#cbd5e1', // Slate 300

  // Semantic
  success: '#059669', // Emerald 600
  successLight: '#d1fae5', // Emerald 100
  warning: '#d97706', // Amber 600
  warningLight: '#fef3c7', // Amber 100
  error: '#dc2626', // Red 600
  errorLight: '#fee2e2', // Red 100
  info: '#0284c7', // Sky 600
  infoLight: '#e0f2fe', // Sky 100

  // Score colors (gradient from red to green)
  scoreLow: '#ef4444', // Red
  scoreMedium: '#f59e0b', // Amber
  scoreHigh: '#22c55e', // Green
};

// Get score color based on value
export function getScoreColor(value?: number): string {
  if (value === undefined || value === null) return colors.textMuted;
  if (value >= 75) return colors.success;
  if (value >= 50) return colors.warning;
  return colors.error;
}

export function getScoreBackgroundColor(value?: number): string {
  if (value === undefined || value === null) return colors.surface;
  if (value >= 75) return colors.successLight;
  if (value >= 50) return colors.warningLight;
  return colors.errorLight;
}

// Base styles for all PDF documents
export const baseStyles = StyleSheet.create({
  // Page layouts
  page: {
    backgroundColor: colors.white,
    paddingTop: 48,
    paddingBottom: 72,
    paddingHorizontal: 48,
    fontFamily: 'Inter',
    fontSize: 10,
    color: colors.text,
  },

  // Cover page specific
  coverPage: {
    backgroundColor: colors.white,
    padding: 0,
    fontFamily: 'Inter',
  },

  // ============================================
  // HEADER STYLES
  // ============================================
  header: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.accent,
    letterSpacing: 2,
  },
  logoTagline: {
    fontSize: 9,
    color: colors.textMuted,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  reportTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  ideaTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 1.4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 6,
  },
  metaValue: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: 500,
  },
  generatedDate: {
    fontSize: 9,
    color: colors.textMuted,
  },

  // ============================================
  // SECTION STYLES
  // ============================================
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  sectionContent: {
    fontSize: 10,
    lineHeight: 1.7,
    color: colors.textSecondary,
  },

  // ============================================
  // TYPOGRAPHY
  // ============================================
  h1: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 12,
  },
  h3: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.primary,
    marginBottom: 8,
  },
  h4: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.7,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  paragraphSmall: {
    fontSize: 9,
    lineHeight: 1.6,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  caption: {
    fontSize: 8,
    color: colors.textMuted,
  },

  // ============================================
  // LISTS
  // ============================================
  list: {
    marginBottom: 12,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 4,
  },
  bullet: {
    width: 14,
    fontSize: 10,
    color: colors.accent,
    fontWeight: 700,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.6,
    color: colors.textSecondary,
  },
  numberedItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 4,
  },
  number: {
    width: 20,
    fontSize: 10,
    fontWeight: 600,
    color: colors.accent,
  },

  // ============================================
  // CARDS & BOXES
  // ============================================
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  highlightCard: {
    backgroundColor: colors.accentLight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  infoCard: {
    backgroundColor: colors.infoLight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  successCard: {
    backgroundColor: colors.successLight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  warningCard: {
    backgroundColor: colors.warningLight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  errorCard: {
    backgroundColor: colors.errorLight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },

  // ============================================
  // SCORE DISPLAYS
  // ============================================
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 12,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreBoxHighlight: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: 500,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  scoreBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: 8,
    width: '100%',
  },
  scoreBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // ============================================
  // TABLES
  // ============================================
  table: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableCell: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 1.4,
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ============================================
  // FOOTER
  // ============================================
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLogo: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.accent,
    letterSpacing: 1,
  },
  footerDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.border,
    marginHorizontal: 10,
  },
  footerText: {
    fontSize: 8,
    color: colors.textMuted,
  },
  footerConfidential: {
    fontSize: 7,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pageNumber: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: 500,
  },

  // ============================================
  // UTILITIES
  // ============================================
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  flex1: {
    flex: 1,
  },
  spacer: {
    height: 16,
  },
  spacerSmall: {
    height: 8,
  },
  spacerLarge: {
    height: 32,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 20,
  },
  dividerLight: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginVertical: 12,
  },
  badge: {
    backgroundColor: colors.accentLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: 600,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Two-column layout
  twoColumn: {
    flexDirection: 'row',
    gap: 20,
  },
  columnHalf: {
    flex: 1,
  },

  // Inline stat
  inlineStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  inlineStatLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  inlineStatValue: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.primary,
  },
});

export default baseStyles;
