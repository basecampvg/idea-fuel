import { Font } from '@react-pdf/renderer';
import fs from 'fs';
import path from 'path';

// Track if custom fonts were loaded successfully
let customFontsLoaded = false;

// Resolve fonts directory - handle Next.js running from web package
function getFontsDir(): string | null {
  const cwd = process.cwd();

  const possiblePaths = [
    // Next.js running from packages/web - go up and into server
    path.resolve(cwd, '../server/src/lib/pdf/fonts'),
    // Running from BETA root
    path.resolve(cwd, 'packages/server/src/lib/pdf/fonts'),
    // Running directly from server package
    path.resolve(cwd, 'src/lib/pdf/fonts'),
    // Relative to this file (may work with some bundlers)
    path.resolve(__dirname, 'fonts'),
    // Absolute path fallback for Next.js
    path.resolve(cwd, 'node_modules/@forge/server/src/lib/pdf/fonts'),
  ];

  console.log('[Fonts] CWD:', cwd);
  console.log('[Fonts] __dirname:', __dirname);

  for (const p of possiblePaths) {
    try {
      const testFile = path.join(p, 'Inter-Regular.ttf');
      if (fs.existsSync(testFile)) {
        console.log('[Fonts] Found fonts at:', p);
        return p;
      }
    } catch (e) {
      // fs.existsSync might throw in some environments
      console.log('[Fonts] Could not check path:', p, e);
    }
  }

  console.error('[Fonts] Could not find fonts directory. Tried:', possiblePaths);
  return null;
}

// Load font as base64 data URL for reliable cross-platform support
function loadFontAsDataUrl(fontsDir: string, filename: string): string {
  const fontPath = path.join(fontsDir, filename);
  const buffer = fs.readFileSync(fontPath);
  const base64 = buffer.toString('base64');
  return `data:font/truetype;base64,${base64}`;
}

// Try to register Inter font from local TTF files
function tryRegisterInterFont(): boolean {
  const fontsDir = getFontsDir();

  if (!fontsDir) {
    console.warn('[Fonts] Fonts directory not found, will use Helvetica fallback');
    return false;
  }

  try {
    Font.register({
      family: 'Inter',
      fonts: [
        {
          src: loadFontAsDataUrl(fontsDir, 'Inter-Regular.ttf'),
          fontWeight: 400,
        },
        {
          src: loadFontAsDataUrl(fontsDir, 'Inter-Medium.ttf'),
          fontWeight: 500,
        },
        {
          src: loadFontAsDataUrl(fontsDir, 'Inter-SemiBold.ttf'),
          fontWeight: 600,
        },
        {
          src: loadFontAsDataUrl(fontsDir, 'Inter-Bold.ttf'),
          fontWeight: 700,
        },
      ],
    });
    console.log('[Fonts] Inter font registered successfully');
    return true;
  } catch (error) {
    console.error('[Fonts] Failed to register Inter font:', error);
    return false;
  }
}

// Note: If Inter fonts fail to load, PDF will use default Helvetica
// The base-styles.ts uses fontFamily: 'Inter', which falls back gracefully

// Initialize fonts - try to load Inter, fall back to default if not available
customFontsLoaded = tryRegisterInterFont();
if (!customFontsLoaded) {
  console.warn('[Fonts] Custom fonts not loaded, PDF will use default Helvetica');
}

// Register emoji fallback to prevent crashes on emoji characters
Font.registerEmojiSource({
  format: 'png',
  url: 'https://cdn.jsdelivr.net/npm/twemoji@14.0.2/72x72/',
});

// Disable hyphenation callback to prevent word-breaking issues
Font.registerHyphenationCallback((word) => [word]);

export const fontsRegistered = true;
