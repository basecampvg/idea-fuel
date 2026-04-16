/**
 * Idea Fuel Design System — Mobile Theme
 * Matches the web app branding at packages/web/src/app/globals.css
 *
 * Brand colors extracted from phone/ideafuellogo.svg and landing page mockup.
 */
import { type TextStyle } from 'react-native';

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
  accent: '#0393F8',

  // ── Status ──
  success: '#0393F8',
  warning: '#F59E0B',
  destructive: '#EF4444',
  destructiveMuted: 'rgba(239, 68, 68, 0.1)',

  // ── Glass borders (subtle gradient strokes) ──
  glassBorderStart: 'rgba(255, 255, 255, 0.08)',
  glassBorderEnd: 'rgba(255, 255, 255, 0.02)',

  // ── Misc ──
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ThemeColors = typeof colors;

/**
 * Font system — SF Pro (loaded explicitly for cross-platform consistency).
 *
 * Each font token is a partial TextStyle object containing fontFamily +
 * fontWeight. Spread into styles: { ...fonts.display.bold, fontSize: 28 }
 *
 * The legacy API (fonts.display.bold as a string) is preserved via toString()
 * so existing code using `fontFamily: fonts.display.bold` continues to compile.
 */
type FontToken = TextStyle & { toString(): string };

function token(family: string, weight: TextStyle['fontWeight']): FontToken {
  return {
    fontFamily: family,
    fontWeight: weight,
    toString: () => family,
  } as FontToken;
}

export const fonts = {
  /** SF Pro Display — headings & large text (replaces Outfit) */
  display: {
    regular:  token('SFProDisplay-Regular', '400'),
    medium:   token('SFProDisplay-Medium', '500'),
    semiBold: token('SFProDisplay-Semibold', '600'),
    bold:     token('SFProDisplay-Bold', '700'),
    heavy:    token('SFProDisplay-Heavy', '800'),
    black:    token('SFProDisplay-Black', '900'),
  },
  /** SF Pro Text — body copy & UI labels (replaces Geist) */
  text: {
    light:    token('SFProText-Light', '300'),
    regular:  token('SFProText-Regular', '400'),
    medium:   token('SFProText-Medium', '500'),
    semiBold: token('SFProText-Semibold', '600'),
    bold:     token('SFProText-Bold', '700'),
  },
  /** Monospace — code & data */
  mono: {
    regular: token('GeistMono-Regular', '400'),
    medium:  token('GeistMono-Medium', '500'),
  },
  /** @deprecated Use fonts.display instead */
  outfit: {
    regular:  token('SFProDisplay-Regular', '400'),
    medium:   token('SFProDisplay-Medium', '500'),
    semiBold: token('SFProDisplay-Semibold', '600'),
    bold:     token('SFProDisplay-Bold', '700'),
    black:    token('SFProDisplay-Black', '900'),
  },
  /** @deprecated Use fonts.text instead */
  geist: {
    regular:  token('SFProText-Regular', '400'),
    medium:   token('SFProText-Medium', '500'),
    semiBold: token('SFProText-Semibold', '600'),
  },
} as const;
