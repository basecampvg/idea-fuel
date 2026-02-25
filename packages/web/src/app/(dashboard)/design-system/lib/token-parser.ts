// ---------------------------------------------------------------------------
// CSS Token Parser — reads globals.css, extracts design tokens, writes changes
// ---------------------------------------------------------------------------

import { createHash } from 'crypto';
import {
  type TokenDefinition,
  type SelectorBlock,
  type TokenChange,
  categorizeToken,
  detectFormat,
} from './token-types';

// ---------------------------------------------------------------------------
// Parse globals.css into structured tokens
// ---------------------------------------------------------------------------

interface ParsedFile {
  tokens: TokenDefinition[];
  fileHash: string;
  lines: string[];
}

/**
 * Selector detection patterns.
 * We need to distinguish:
 *   1. `:root {` at the top (shared variables — gradient, radius, brand, transitions)
 *   2. `html.light {` (light theme)
 *   3. `.dark,\n:root {` (dark theme — default)
 *
 * The tricky part: the dark theme block uses `.dark,` on one line and `:root {`
 * on the next. We handle this with a lookahead for `:root` combined with
 * tracking whether we already saw a shared `:root` block.
 */

export function parseTokens(fileContent: string): ParsedFile {
  const lines = fileContent.split('\n');
  const fileHash = createHash('md5').update(fileContent).digest('hex');

  const tokens: TokenDefinition[] = [];

  let currentSelector: SelectorBlock | null = null;
  let braceDepth = 0;
  let seenSharedRoot = false;
  let pendingDarkComma = false; // true when we see `.dark,` and expect `:root {` next

  // Accumulator for multi-line values (e.g., gradient)
  let multiLineName: string | null = null;
  let multiLineValue = '';
  let multiLineStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // --- Handle multi-line value accumulation ---
    if (multiLineName !== null) {
      multiLineValue += ' ' + trimmed;
      if (trimmed.endsWith(';') || trimmed.endsWith('}')) {
        // End of multi-line value
        let val = multiLineValue;
        if (val.endsWith(';')) val = val.slice(0, -1);
        if (val.endsWith('}')) {
          val = val.slice(0, val.lastIndexOf(';'));
          // Also close the block
        }
        val = val.trim();

        if (currentSelector) {
          tokens.push({
            name: multiLineName,
            rawValue: val,
            format: detectFormat(val),
            selector: currentSelector,
            lineStart: multiLineStart,
            lineEnd: i,
            category: categorizeToken(multiLineName),
          });
        }
        multiLineName = null;
        multiLineValue = '';
      }
      // Count braces in this line too
      for (const ch of trimmed) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      if (braceDepth === 0) currentSelector = null;
      continue;
    }

    // --- Detect selector blocks ---

    // Skip @theme, @layer, @keyframes blocks
    if (trimmed.startsWith('@theme') || trimmed.startsWith('@layer') ||
        trimmed.startsWith('@keyframes') || trimmed.startsWith('@plugin') ||
        trimmed.startsWith('@import') || trimmed.startsWith('@custom-variant')) {
      if (trimmed.includes('{')) {
        // Track brace depth to skip entire block
        let depth = 0;
        for (const ch of trimmed) {
          if (ch === '{') depth++;
          if (ch === '}') depth--;
        }
        if (depth > 0) {
          // Skip until block closes
          let skipDepth = depth;
          i++;
          while (i < lines.length && skipDepth > 0) {
            for (const ch of lines[i]) {
              if (ch === '{') skipDepth++;
              if (ch === '}') skipDepth--;
            }
            i++;
          }
          i--; // for loop will increment
        }
      }
      continue;
    }

    // Detect `.dark,` line (precedes `:root {` for dark theme)
    if (trimmed === '.dark,') {
      pendingDarkComma = true;
      continue;
    }

    // Detect `:root {` after `.dark,`
    if (pendingDarkComma && trimmed.startsWith(':root')) {
      currentSelector = '.dark,:root';
      braceDepth = 1;
      pendingDarkComma = false;
      continue;
    }
    pendingDarkComma = false;

    // Detect `html.light {`
    if (trimmed.startsWith('html.light') && trimmed.includes('{')) {
      currentSelector = 'html.light';
      braceDepth = 1;
      continue;
    }

    // Detect standalone `:root {` (shared variables — only the first one)
    if (trimmed.startsWith(':root') && trimmed.includes('{') && !seenSharedRoot && currentSelector === null) {
      currentSelector = ':root-shared';
      seenSharedRoot = true;
      braceDepth = 1;
      continue;
    }

    // --- Track brace depth ---
    for (const ch of trimmed) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }

    if (braceDepth === 0 && currentSelector !== null) {
      currentSelector = null;
      continue;
    }

    // --- Extract token declarations ---
    if (currentSelector === null) continue;

    // Match `--token-name: value;` or start of multi-line value
    const match = trimmed.match(/^(--[\w-]+)\s*:\s*(.+)$/);
    if (!match) continue;

    const [, name, rawRest] = match;

    if (rawRest.endsWith(';')) {
      // Single-line value
      const val = rawRest.slice(0, -1).trim();
      tokens.push({
        name,
        rawValue: val,
        format: detectFormat(val),
        selector: currentSelector,
        lineStart: i,
        lineEnd: i,
        category: categorizeToken(name),
      });
    } else {
      // Multi-line value (e.g., gradient) — start accumulating
      multiLineName = name;
      multiLineValue = rawRest;
      multiLineStart = i;
    }
  }

  return { tokens, fileHash, lines };
}

// ---------------------------------------------------------------------------
// Serialize changes back into the file (surgical line replacement)
// ---------------------------------------------------------------------------

export function applyChanges(
  lines: string[],
  tokens: TokenDefinition[],
  changes: TokenChange[],
): string[] {
  const result = [...lines];

  for (const change of changes) {
    // Find the matching token
    const token = tokens.find(
      (t) => t.name === change.name && t.selector === change.selector,
    );
    if (!token) continue;

    if (token.lineStart === token.lineEnd) {
      // Single-line token — replace just the value portion
      const originalLine = result[token.lineStart];
      const indent = originalLine.match(/^(\s*)/)?.[1] ?? '  ';
      result[token.lineStart] = `${indent}${token.name}: ${change.value};`;
    } else {
      // Multi-line token — replace the entire range with a single line or multi-line
      const originalLine = result[token.lineStart];
      const indent = originalLine.match(/^(\s*)/)?.[1] ?? '  ';

      // Check if new value is multi-line (gradient)
      if (change.value.includes('\n')) {
        const newLines = change.value.split('\n');
        const replacement = [
          `${indent}${token.name}: ${newLines[0]}`,
          ...newLines.slice(1).map((l) => `${indent}  ${l}`),
        ];
        // If the last replacement line doesn't end with `;`, add it
        const lastIdx = replacement.length - 1;
        if (!replacement[lastIdx].trimEnd().endsWith(';')) {
          replacement[lastIdx] = replacement[lastIdx].trimEnd() + ';';
        }
        result.splice(token.lineStart, token.lineEnd - token.lineStart + 1, ...replacement);
      } else {
        // Collapse multi-line to single line
        result.splice(
          token.lineStart,
          token.lineEnd - token.lineStart + 1,
          `${indent}${token.name}: ${change.value};`,
        );
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Compute file hash
// ---------------------------------------------------------------------------

export function computeHash(content: string): string {
  return createHash('md5').update(content).digest('hex');
}
