/**
 * HyperFormula Configuration
 *
 * Central configuration for the HyperFormula spreadsheet engine used
 * in financial modeling. Optimized for financial calculation accuracy
 * and Excel compatibility.
 */

import type { ConfigParams } from 'hyperformula';

export const HYPERFORMULA_CONFIG: Partial<ConfigParams> = {
  licenseKey: 'gpl-v3',

  // Precision: higher than default for financial calculations
  precisionRounding: 14,
  smartRounding: false, // exact floating-point, no cosmetic rounding
  precisionEpsilon: 1e-13,

  // Null/empty cell handling
  evaluateNullToZero: true, // empty cells = 0 in formulas

  // Excel date compatibility
  leapYear1900: true,
  dateFormats: ['MM/DD/YYYY', 'YYYY-MM-DD'],

  // Performance: dense mapping for rectangular financial sheets
  chooseAddressMappingPolicy: 'AlwaysDense' as unknown as ConfigParams['chooseAddressMappingPolicy'],

  // Limits (generous for financial models)
  maxRows: 10000,
  maxColumns: 200,
};

/**
 * Period structure for financial models.
 * Year 1: 12 monthly periods
 * Year 2: 4 quarterly periods
 * Years 3-N: 1 annual period each
 */
export function getPeriodCount(forecastYears: number): number {
  let count = 12; // Year 1: 12 months
  if (forecastYears >= 2) count += 4; // Year 2: 4 quarters
  for (let y = 3; y <= forecastYears; y++) count += 1; // Years 3+: annual
  return count;
}

export function getPeriodLabels(forecastYears: number): string[] {
  const labels: string[] = [];
  for (let m = 1; m <= 12; m++) labels.push(`Y1-M${m}`);
  if (forecastYears >= 2) {
    for (let q = 1; q <= 4; q++) labels.push(`Y2-Q${q}`);
  }
  for (let y = 3; y <= forecastYears; y++) labels.push(`Y${y}`);
  return labels;
}

export function getMonthsPerPeriod(forecastYears: number): number[] {
  const months: number[] = [];
  for (let i = 0; i < 12; i++) months.push(1);
  if (forecastYears >= 2) {
    for (let i = 0; i < 4; i++) months.push(3);
  }
  for (let y = 3; y <= forecastYears; y++) months.push(12);
  return months;
}

export function getPeriodStartMonths(forecastYears: number): number[] {
  const starts: number[] = [];
  for (let m = 0; m < 12; m++) starts.push(m);
  if (forecastYears >= 2) {
    for (let q = 0; q < 4; q++) starts.push(12 + q * 3);
  }
  for (let y = 3; y <= forecastYears; y++) starts.push((y - 1) * 12);
  return starts;
}

/** Metadata row count at the top of each statement sheet. */
export const METADATA_ROWS = 3; // _months_in_period, _month, _period

/**
 * Column letter helper. Col 0 = A, Col 1 = B, etc.
 * Supports up to ZZ (702 columns).
 */
export function colLetter(col: number): string {
  if (col < 26) return String.fromCharCode(65 + col);
  return String.fromCharCode(64 + Math.floor(col / 26)) + String.fromCharCode(65 + (col % 26));
}
