/**
 * Idea Fuel Design System — Mobile Theme
 * Matches the web app branding at packages/web/src/app/globals.css
 *
 * Brand colors extracted from phone/ideafuellogo.svg and landing page mockup.
 */

export const colors = {
  // ── Surfaces ──
  background: '#161513',
  card: '#1A1918',
  surface: '#1E1D1B',

  // ── Borders ──
  border: '#2A2A2A',
  borderSubtle: '#1F1E1C',

  // ── Text ──
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedDim: '#555555',

  // ── Brand ──
  brand: '#E32B1A',
  brandEnd: '#DB4D40',
  brandMuted: 'rgba(227, 43, 26, 0.15)',
  brandGlow: 'rgba(227, 43, 26, 0.4)',

  // ── Accent (used sparingly) ──
  accent: '#14B8A6',

  // ── Status ──
  success: '#22C55E',
  warning: '#F59E0B',
  destructive: '#EF4444',
  destructiveMuted: 'rgba(239, 68, 68, 0.1)',

  // ── Misc ──
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ThemeColors = typeof colors;
