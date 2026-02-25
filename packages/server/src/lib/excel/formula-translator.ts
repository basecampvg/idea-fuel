/**
 * Translates math.js / formula-engine formulas into Excel formula syntax.
 *
 * Strategy:
 *   1. Attempt a direct syntactic translation of known patterns.
 *   2. If the formula references assumption keys, resolve them to
 *      their named range in the Assumptions sheet.
 *   3. If translation is not possible, fall back to a static value
 *      and add a cell comment explaining the original formula.
 */

/** Map of assumption key → Excel named range or cell address. */
export type CellAddressMap = Record<string, string>;

interface TranslationResult {
  /** Excel formula string (starts with `=`) or a baked numeric value. */
  formula: string;
  /** When the formula couldn't be translated, the original is stored here. */
  comment?: string;
}

// Functions that map 1:1 between math.js and Excel
const DIRECT_FUNCTION_MAP: Record<string, string> = {
  abs: 'ABS',
  ceil: 'CEILING',
  floor: 'FLOOR',
  round: 'ROUND',
  min: 'MIN',
  max: 'MAX',
  sqrt: 'SQRT',
  log: 'LN',
  pow: 'POWER',
  // Financial functions
  PMT: 'PMT',
  PV: 'PV',
  FV: 'FV',
  NPV: 'NPV',
  IRR: 'IRR',
  NPER: 'NPER',
  SLN: 'SLN',
  DB: 'DB',
  SUM: 'SUM',
  AVERAGE: 'AVERAGE',
  IF: 'IF',
};

/**
 * Replace assumption keys in a formula string with Excel named range references.
 */
function replaceAssumptionRefs(formula: string, addressMap: CellAddressMap): string {
  // Sort keys longest-first to avoid partial replacement (e.g. "tax_rate" before "tax")
  const keys = Object.keys(addressMap).sort((a, b) => b.length - a.length);
  let result = formula;
  for (const key of keys) {
    // Replace whole-word occurrences only (not inside other identifiers)
    const re = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    result = result.replace(re, addressMap[key]);
  }
  return result;
}

/**
 * Attempt to translate a math.js formula to Excel syntax.
 */
function translateFormula(formula: string, addressMap: CellAddressMap): string {
  let translated = formula;

  // Replace function names
  for (const [mathFn, excelFn] of Object.entries(DIRECT_FUNCTION_MAP)) {
    const re = new RegExp(`\\b${mathFn}\\s*\\(`, 'g');
    translated = translated.replace(re, `${excelFn}(`);
  }

  // Replace assumption key references
  translated = replaceAssumptionRefs(translated, addressMap);

  // Strip internal variables like _period, _month, _months_in_period
  // These don't have Excel equivalents — the formula is per-period already
  translated = translated.replace(/\b_period\b/g, '0');
  translated = translated.replace(/\b_month\b/g, '0');
  translated = translated.replace(/\b_months_in_period\b/g, '1');

  return `=${translated}`;
}

/**
 * Translate a formula-engine expression to an Excel formula.
 * Falls back to baked value with comment if translation is not reliable.
 */
export function translateToExcel(
  formula: string | null | undefined,
  bakedValue: number,
  addressMap: CellAddressMap,
): TranslationResult {
  if (!formula) {
    return { formula: String(bakedValue) };
  }

  // Skip formulas with GROWTH() or CUMSUM() — these are time-series
  // generators that have no direct Excel equivalent
  if (/\bGROWTH\b|\bCUMSUM\b|\bSLICE\b/.test(formula)) {
    return {
      formula: String(bakedValue),
      comment: `Original formula: ${formula} (time-series function, baked value used)`,
    };
  }

  try {
    const excelFormula = translateFormula(formula, addressMap);
    return { formula: excelFormula };
  } catch {
    return {
      formula: String(bakedValue),
      comment: `Original formula: ${formula} (could not translate)`,
    };
  }
}
