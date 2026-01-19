import { StyleSheet } from '@react-pdf/renderer';

// Forge brand colors
export const colors = {
  primary: '#6366f1', // Indigo
  accent: '#e91e8c', // Pink
  background: '#0a0a0a',
  card: '#111111',
  border: '#2a2a2a',
  text: '#ffffff',
  textMuted: '#a1a1aa',
  textSecondary: '#71717a',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

// Base styles for all PDF documents
export const baseStyles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  darkPage: {
    backgroundColor: colors.background,
    padding: 40,
    fontFamily: 'Helvetica',
  },

  // Header
  header: {
    marginBottom: 30,
    borderBottom: `2px solid ${colors.primary}`,
    paddingBottom: 20,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  reportSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  ideaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 12,
  },
  generatedDate: {
    fontSize: 10,
    color: '#999999',
    marginTop: 8,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: `1px solid #e5e5e5`,
  },
  sectionContent: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#333333',
  },

  // Typography
  h1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  h2: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  h3: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#444444',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#444444',
    marginBottom: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  // Lists
  list: {
    marginLeft: 16,
    marginBottom: 12,
  },
  listItem: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#444444',
    marginBottom: 4,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bullet: {
    width: 16,
    fontSize: 11,
    color: colors.primary,
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.5,
    color: '#444444',
  },

  // Cards/Boxes
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  highlightCard: {
    backgroundColor: '#f0f4ff',
    borderLeft: `4px solid ${colors.primary}`,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  warningCard: {
    backgroundColor: '#fff7ed',
    borderLeft: `4px solid ${colors.warning}`,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  successCard: {
    backgroundColor: '#f0fdf4',
    borderLeft: `4px solid ${colors.success}`,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },

  // Score displays
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  scoreBox: {
    width: '23%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  scoreLabel: {
    fontSize: 9,
    color: '#666666',
    marginTop: 4,
    textAlign: 'center',
  },

  // Tables
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottom: '1px solid #e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableCell: {
    fontSize: 10,
    color: '#444444',
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1px solid #e5e5e5',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 9,
    color: '#999999',
  },
  pageNumber: {
    fontSize: 9,
    color: '#999999',
  },

  // Utilities
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
    height: 20,
  },
  divider: {
    borderBottom: '1px solid #e5e5e5',
    marginVertical: 16,
  },
});

export default baseStyles;
