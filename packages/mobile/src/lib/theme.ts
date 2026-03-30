/**
 * Idea Fuel Design System — Mobile Theme
 * Matches the web app branding at packages/web/src/app/globals.css
 *
 * Brand colors extracted from phone/ideafuellogo.svg and landing page mockup.
 */
import { Platform, type TextStyle } from 'react-native';

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
 * Font system — SF Pro on iOS (system font), Roboto on Android.
 *
 * Each font token is a partial TextStyle object containing fontFamily +
 * fontWeight. Spread into styles: { ...fonts.outfit.bold, fontSize: 28 }
 *
 * The legacy API (fonts.outfit.bold as a string) is preserved via toString()
 * so existing code using `fontFamily: fonts.outfit.bold` continues to compile
 * and render with the system font — weight just comes from fontWeight now.
 */
const sf = Platform.OS === 'ios' ? 'System' : undefined;
const mono = Platform.OS === 'ios' ? 'SF Mono' : 'monospace';

type FontToken = TextStyle & { toString(): string };

function token(family: string | undefined, weight: TextStyle['fontWeight']): FontToken {
  const value = family ?? '';
  return {
    fontFamily: family,
    fontWeight: weight,
    toString: () => value,
  } as FontToken;
}

export const fonts = {
  outfit: {
    regular:  token(sf, '400'),
    medium:   token(sf, '500'),
    semiBold: token(sf, '600'),
    bold:     token(sf, '700'),
  },
  geist: {
    regular:  token(sf, '400'),
    medium:   token(sf, '500'),
    semiBold: token(sf, '600'),
  },
  mono: {
    regular: token(mono, '400'),
    medium:  token(mono, '500'),
  },
} as const;
