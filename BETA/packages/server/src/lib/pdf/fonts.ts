import { Font } from '@react-pdf/renderer';
import fs from 'fs';
import path from 'path';

// Resolve fonts directory - handle Next.js running from web package
function getFontsDir(): string {
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
  ];

  console.log('[Fonts] CWD:', cwd);

  for (const p of possiblePaths) {
    const testFile = path.join(p, 'Inter-Regular.ttf');
    if (fs.existsSync(testFile)) {
      console.log('[Fonts] Found fonts at:', p);
      return p;
    }
  }

  console.error('[Fonts] Could not find fonts directory. Tried:', possiblePaths);
  return possiblePaths[0];
}

const FONTS_DIR = getFontsDir();

// Load font as base64 data URL for reliable cross-platform support
function loadFontAsDataUrl(filename: string): string {
  const fontPath = path.join(FONTS_DIR, filename);
  try {
    const buffer = fs.readFileSync(fontPath);
    const base64 = buffer.toString('base64');
    return `data:font/truetype;base64,${base64}`;
  } catch (error) {
    console.error(`[Fonts] Failed to load font: ${fontPath}`, error);
    throw error;
  }
}

// Register Inter font from local TTF files using data URLs
try {
  Font.register({
    family: 'Inter',
    fonts: [
      {
        src: loadFontAsDataUrl('Inter-Regular.ttf'),
        fontWeight: 400,
      },
      {
        src: loadFontAsDataUrl('Inter-Medium.ttf'),
        fontWeight: 500,
      },
      {
        src: loadFontAsDataUrl('Inter-SemiBold.ttf'),
        fontWeight: 600,
      },
      {
        src: loadFontAsDataUrl('Inter-Bold.ttf'),
        fontWeight: 700,
      },
    ],
  });
  console.log('[Fonts] Inter font registered successfully');
} catch (error) {
  console.error('[Fonts] Failed to register Inter font:', error);
}

// Register emoji fallback to prevent crashes on emoji characters
Font.registerEmojiSource({
  format: 'png',
  url: 'https://cdn.jsdelivr.net/npm/twemoji@14.0.2/72x72/',
});

// Disable hyphenation callback to prevent word-breaking issues
Font.registerHyphenationCallback((word) => [word]);

export const fontsRegistered = true;
