/**
 * Idea Fuel Design System — Mobile Theme
 * Matches the web app branding at packages/web/src/app/globals.css
 *
 * Brand colors extracted from phone/ideafuellogo.svg and landing page mockup.
 */

export const colors = {
  // ── Surfaces ──
  background: '#0A0A0A',
  card: '#111111',
  surface: '#161616',

  // ── Borders ──
  border: '#222222',
  borderSubtle: '#181818',

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

export const fonts = {
  // Outfit — display/heading font (titles, buttons, labels)
  outfit: {
    regular: 'Outfit-Regular',
    medium: 'Outfit-Medium',
    semiBold: 'Outfit-SemiBold',
    bold: 'Outfit-Bold',
  },
  // Geist — body font (descriptions, chat, paragraphs)
  geist: {
    regular: 'Geist-Regular',
    medium: 'Geist-Medium',
    semiBold: 'Geist-SemiBold',
  },
  // Geist Mono — tags, badges, status pills, stat values
  mono: {
    regular: 'GeistMono-Regular',
    medium: 'GeistMono-Medium',
  },
} as const;
