/**
 * HyperFormula Financial Engine
 *
 * Replaces the custom math.js formula engine + Kahn's algorithm cascade engine.
 * Models the financial system as a HyperFormula workbook with sheets:
 *   - Assumptions: named expressions for each assumption key
 *   - PL: Income Statement line items × periods
 *   - BS: Balance Sheet line items × periods
 *   - CF: Cash Flow line items × periods
 *
 * The HyperFormula dependency is NOT leaked to consumers — all interactions
 * go through the FinancialWorkbook interface.
 */

import { HyperFormula, DetailedCellError } from 'hyperformula';
import type { SimpleCellAddress, RawCellContent } from 'hyperformula';
import { HYPERFORMULA_CONFIG, getPeriodCount, getPeriodLabels, getMonthsPerPeriod, getPeriodStartMonths, METADATA_ROWS, colLetter } from '../lib/hyperformula-config';
import { BlockedFunctionsPlugin, blockedFunctionsTranslations, XirrPlugin, xirrTranslations } from '../lib/hyperformula-plugins';
import type {
  ComputedStatements,
  StatementData,
  TemplateDefinition,
  TemplateLineItem,
  CascadeResult,
  CascadeChange,
  CascadeSuccess,
  BatchCascadeResult,
  BatchCascadeSuccess,
} from '@forge/shared';
import { ASSUMPTION_IMPACT_MAP } from '../lib/assumption-impact-map';

// Register plugins once at module load
let pluginsRegistered = false;
function ensurePluginsRegistered() {
  if (pluginsRegistered) return;
  HyperFormula.registerFunctionPlugin(BlockedFunctionsPlugin, blockedFunctionsTranslations);
  HyperFormula.registerFunctionPlugin(XirrPlugin, xirrTranslations);
  pluginsRegistered = true;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssumptionRow {
  key: string;
  value: string | null;
  numericValue: string | null;
  formula: string | null;
}

interface WorkbookConfig {
  assumptions: AssumptionRow[];
  template: TemplateDefinition;
  forecastYears: number;
}

interface SheetLayout {
  sheetIndex: number;
  lineKeyToRow: Map<string, number>;
  firstDataCol: number; // column index of first period (col A = labels, col B = first period)
}

// ---------------------------------------------------------------------------
// Workbook Builder
// ---------------------------------------------------------------------------

/**
 * Build a HyperFormula workbook from assumptions + template.
 * Uses buildFromSheets for optimal performance (single evaluation pass).
 */
export function buildWorkbook(config: WorkbookConfig): HyperFormula {
  ensurePluginsRegistered();

  const { assumptions, template, forecastYears } = config;
  const numPeriods = getPeriodCount(forecastYears);
  const monthsPerPeriod = getMonthsPerPeriod(forecastYears);
  const startMonths = getPeriodStartMonths(forecastYears);

  // Build assumption value map
  const assumptionMap = assumptionsToMap(assumptions);

  // Build named expressions: key -> value or formula
  const namedExpressions: Array<{ name: string; expression: string }> = [];
  const assumptionSheetData: RawCellContent[][] = [];

  for (let i = 0; i < assumptions.length; i++) {
    const a = assumptions[i];
    const cellRef = `Assumptions!$B$${i + 1}`;

    // Cell value: formula or numeric value
    let cellValue: RawCellContent;
    if (a.formula) {
      // Convert math.js formula to HyperFormula (they're largely compatible)
      cellValue = '=' + translateFormula(a.formula);
    } else {
      const num = a.numericValue != null ? parseFloat(a.numericValue) : a.value != null ? parseFloat(a.value) : 0;
      cellValue = isNaN(num) ? 0 : num;
    }

    assumptionSheetData.push([a.key, cellValue]);
    namedExpressions.push({ name: a.key, expression: `=${cellRef}` });
  }

  // Build statement sheets
  const plData = buildStatementSheet(template.lineItems.pl, numPeriods, monthsPerPeriod, startMonths, assumptionMap);
  const bsData = buildStatementSheet(template.lineItems.bs, numPeriods, monthsPerPeriod, startMonths, assumptionMap);
  const cfData = buildStatementSheet(template.lineItems.cf, numPeriods, monthsPerPeriod, startMonths, assumptionMap);

  // Create workbook
  const hf = HyperFormula.buildFromSheets(
    {
      Assumptions: assumptionSheetData,
      PL: plData,
      BS: bsData,
      CF: cfData,
    },
    HYPERFORMULA_CONFIG,
    namedExpressions,
  );

  // Post-construction: link statements
  linkStatements(hf, template, numPeriods, forecastYears);

  return hf;
}

/**
 * Convert math.js formula syntax to HyperFormula/Excel syntax.
 * They're ~95% compatible. Key differences handled here.
 */
function translateFormula(mathJsFormula: string): string {
  let f = mathJsFormula;

  // Replace GROWTH(base, rate, periods) with just the base value
  // In the workbook model, growth is handled by column-to-column references
  // For assumption-level formulas, GROWTH is not used — it's only in line items
  f = f.replace(/GROWTH\([^)]+\)/g, '0');

  // Replace CUMSUM(...) with 0 (handled at sheet level)
  f = f.replace(/CUMSUM\([^)]+\)/g, '0');

  // Replace SLICE(...) with 0 (handled at sheet level)
  f = f.replace(/SLICE\([^)]+\)/g, '0');

  // abs() -> ABS() (math.js uses lowercase)
  f = f.replace(/\babs\(/gi, 'ABS(');

  return f;
}

/**
 * Build a 2D array for a statement sheet.
 * Row layout:
 *   Row 0: _months_in_period metadata
 *   Row 1: _month (cumulative month index)
 *   Row 2: _period (period index)
 *   Row 3+: line items
 *
 * Column layout:
 *   Col A: label / key
 *   Col B+: period values (formulas)
 */
function buildStatementSheet(
  lineItems: TemplateLineItem[],
  numPeriods: number,
  monthsPerPeriod: number[],
  startMonths: number[],
  assumptionMap: Record<string, number>,
): RawCellContent[][] {
  const data: RawCellContent[][] = [];

  // Metadata rows
  data.push(['_months_in_period', ...monthsPerPeriod]);
  data.push(['_month', ...startMonths]);
  data.push(['_period', ...Array.from({ length: numPeriods }, (_, i) => i)]);

  // Line item rows
  for (const line of lineItems) {
    const row: RawCellContent[] = [line.key];

    if (!line.formula) {
      // Lines without formulas get zeros (filled in by linking step)
      for (let p = 0; p < numPeriods; p++) {
        row.push(0);
      }
    } else {
      // Build formula for each period
      for (let p = 0; p < numPeriods; p++) {
        const formula = buildPeriodFormula(line, p, lineItems, numPeriods);
        row.push(formula);
      }
    }

    data.push(row);
  }

  return data;
}

/**
 * Build a cell formula for a specific line item in a specific period.
 * Translates template formulas (which use assumption names and line item keys)
 * into HyperFormula cell references within the same sheet.
 */
function buildPeriodFormula(
  line: TemplateLineItem,
  periodIndex: number,
  allLineItems: TemplateLineItem[],
  _numPeriods: number,
): string {
  if (!line.formula) return '0';

  let formula = line.formula;

  // Handle GROWTH function: replace with column-relative growth
  // GROWTH(base, rate, periods) → for period 0: =base, for period N: =prevCol*(1+rate)
  const growthMatch = formula.match(/^(.+?)\s*\*\s*GROWTH\(\s*1\s*,\s*(.+?)\s*,\s*\d+\s*\)$/);
  if (growthMatch) {
    const baseExpr = growthMatch[1].trim();
    const rateExpr = growthMatch[2].trim();
    const col = colLetter(periodIndex + 1); // +1 because col A is labels
    const lineRow = METADATA_ROWS + allLineItems.indexOf(line) + 1; // 1-indexed

    if (periodIndex === 0) {
      // First period: just the base value
      formula = baseExpr;
    } else {
      // Subsequent periods: prior column * (1 + rate)
      const prevCol = colLetter(periodIndex); // previous period column
      return `=${prevCol}${lineRow}*(1+${rateExpr})`;
    }
  }

  // Replace line item keys with cell references within the same sheet
  for (const item of allLineItems) {
    const itemRow = METADATA_ROWS + allLineItems.indexOf(item) + 1; // 1-indexed
    const col = colLetter(periodIndex + 1);
    // Replace whole-word occurrences of the line item key with cell reference
    const regex = new RegExp(`\\b${escapeRegex(item.key)}\\b`, 'g');
    formula = formula.replace(regex, `${col}${itemRow}`);
  }

  // Named expressions (assumption keys) are resolved by HyperFormula automatically
  // — they don't need to be replaced with cell references

  return `=${formula}`;
}

/**
 * Link statements after initial evaluation:
 * - Retained earnings (P&L net_income → BS)
 * - Working capital changes (BS deltas → CF)
 * - Ending cash (CF → BS)
 */
function linkStatements(
  hf: HyperFormula,
  template: TemplateDefinition,
  numPeriods: number,
  forecastYears: number,
): void {
  const plSheetId = hf.getSheetId('PL')!;
  const bsSheetId = hf.getSheetId('BS')!;
  const cfSheetId = hf.getSheetId('CF')!;

  // Find row indices for key line items
  const plLineKeys = template.lineItems.pl.map(l => l.key);
  const bsLineKeys = template.lineItems.bs.map(l => l.key);
  const cfLineKeys = template.lineItems.cf.map(l => l.key);

  const findRow = (keys: string[], key: string) => {
    const idx = keys.indexOf(key);
    return idx >= 0 ? METADATA_ROWS + idx : -1;
  };

  const netIncomeRow = findRow(plLineKeys, 'net_income');
  const depreciationRow = findRow(plLineKeys, 'depreciation');
  const cashRow = findRow(bsLineKeys, 'cash');
  const arRow = findRow(bsLineKeys, 'accounts_receivable');
  const apRow = findRow(bsLineKeys, 'accounts_payable');
  const deferredRevRow = findRow(bsLineKeys, 'deferred_revenue');
  const retainedEarningsRow = findRow(bsLineKeys, 'retained_earnings');
  const changeArRow = findRow(cfLineKeys, 'change_ar');
  const changeApRow = findRow(cfLineKeys, 'change_ap');
  const changeDeferredRevRow = findRow(cfLineKeys, 'change_deferred_rev');
  const endingCashRow = findRow(cfLineKeys, 'ending_cash');
  const netCashChangeRow = findRow(cfLineKeys, 'net_cash_change');

  hf.batch(() => {
    for (let p = 0; p < numPeriods; p++) {
      const col = p + 1; // col 0 is labels

      // 1. Retained earnings = cumulative net income
      if (retainedEarningsRow >= 0 && netIncomeRow >= 0) {
        const firstCol = colLetter(1);
        const curCol = colLetter(col);
        // SUM of PL net_income from first period to current
        const formula = `=SUM(PL!${firstCol}${netIncomeRow + 1}:PL!${curCol}${netIncomeRow + 1})`;
        hf.setCellContents({ sheet: bsSheetId, col, row: retainedEarningsRow }, [[formula]]);
      }

      // 2. Working capital changes (period-over-period deltas)
      const wcLinks: Array<[number, number]> = [ // [bsRow, cfRow]
        [arRow, changeArRow],
        [apRow, changeApRow],
        [deferredRevRow, changeDeferredRevRow],
      ];

      for (const [bsR, cfR] of wcLinks) {
        if (bsR < 0 || cfR < 0) continue;
        if (p === 0) {
          // First period: change = current value
          hf.setCellContents({ sheet: cfSheetId, col, row: cfR }, [[`=BS!${colLetter(col)}${bsR + 1}`]]);
        } else {
          // Delta = current - previous
          const curCol = colLetter(col);
          const prevCol = colLetter(col - 1);
          hf.setCellContents({ sheet: cfSheetId, col, row: cfR }, [[`=BS!${curCol}${bsR + 1}-BS!${prevCol}${bsR + 1}`]]);
        }
      }

      // 3. Ending cash = starting_cash + cumulative net cash change
      if (endingCashRow >= 0 && netCashChangeRow >= 0) {
        if (p === 0) {
          hf.setCellContents({ sheet: cfSheetId, col, row: endingCashRow }, [[`=starting_cash+CF!${colLetter(col)}${netCashChangeRow + 1}`]]);
        } else {
          const prevCol = colLetter(col - 1);
          const curCol = colLetter(col);
          hf.setCellContents({ sheet: cfSheetId, col, row: endingCashRow }, [[`=CF!${prevCol}${endingCashRow + 1}+CF!${curCol}${netCashChangeRow + 1}`]]);
        }
      }

      // 4. BS cash = CF ending cash
      if (cashRow >= 0 && endingCashRow >= 0) {
        hf.setCellContents({ sheet: bsSheetId, col, row: cashRow }, [[`=CF!${colLetter(col)}${endingCashRow + 1}`]]);
      }
    }

    // 5. Recompute BS totals after cash and retained earnings injection
    recomputeBsTotals(hf, bsSheetId, template.lineItems.bs, numPeriods);
  });
}

/**
 * Recompute BS total lines (total_current_assets, total_assets, total_equity, total_liabilities_equity)
 * after cash and retained earnings have been injected.
 */
function recomputeBsTotals(
  hf: HyperFormula,
  bsSheetId: number,
  bsLineItems: TemplateLineItem[],
  numPeriods: number,
): void {
  // For each total/subtotal line, rebuild its formula to sum its components
  const totalLines: Array<{ key: string; formula: string }> = [
    { key: 'total_current_assets', formula: 'cash+accounts_receivable' },
    { key: 'total_assets', formula: 'total_current_assets+fixed_assets' },
    { key: 'total_equity', formula: 'retained_earnings' },
    { key: 'total_liabilities_equity', formula: 'total_liabilities+total_equity' },
  ];

  for (const tl of totalLines) {
    const lineIdx = bsLineItems.findIndex(l => l.key === tl.key);
    if (lineIdx < 0) continue;
    const row = METADATA_ROWS + lineIdx;

    for (let p = 0; p < numPeriods; p++) {
      const col = p + 1;
      // Build formula replacing line keys with cell references
      let formula = tl.formula;
      for (const item of bsLineItems) {
        const itemRow = METADATA_ROWS + bsLineItems.indexOf(item) + 1;
        const c = colLetter(col);
        formula = formula.replace(new RegExp(`\\b${escapeRegex(item.key)}\\b`, 'g'), `${c}${itemRow}`);
      }
      hf.setCellContents({ sheet: bsSheetId, col, row }, [[`=${formula}`]]);
    }
  }
}

// ---------------------------------------------------------------------------
// Statement Reader
// ---------------------------------------------------------------------------

/**
 * Read computed statements from a HyperFormula workbook.
 * Returns the same ComputedStatements shape the frontend expects.
 */
export function readStatements(hf: HyperFormula, forecastYears: number): ComputedStatements {
  const periods = getPeriodLabels(forecastYears);
  const numPeriods = periods.length;

  const pl = readStatementSheet(hf, 'PL', numPeriods, periods);
  const bs = readStatementSheet(hf, 'BS', numPeriods, periods);
  const cf = readStatementSheet(hf, 'CF', numPeriods, periods);

  return { pl, bs, cf };
}

function readStatementSheet(
  hf: HyperFormula,
  sheetName: string,
  numPeriods: number,
  periods: string[],
): StatementData {
  const sheetId = hf.getSheetId(sheetName);
  if (sheetId === undefined) {
    return { type: sheetName as 'PL' | 'BS' | 'CF', lines: [], periods };
  }

  const { height } = hf.getSheetDimensions(sheetId);
  const lines: StatementData['lines'] = [];

  // Skip metadata rows, read line items
  for (let row = METADATA_ROWS; row < height; row++) {
    // Col 0 = key/label
    const keyVal = hf.getCellValue({ sheet: sheetId, col: 0, row });
    const key = typeof keyVal === 'string' ? keyVal : `line_${row}`;

    const values: number[] = [];
    for (let p = 0; p < numPeriods; p++) {
      const val = hf.getCellValue({ sheet: sheetId, col: p + 1, row });
      if (val instanceof DetailedCellError) {
        values.push(0); // Coerce errors to 0 (matches current engine behavior)
      } else if (typeof val === 'number') {
        values.push(Math.round(val * 100) / 100); // Round to 2 decimal places
      } else {
        values.push(0);
      }
    }

    // We need the name from the template, but we store key in col 0
    // The caller will map keys back to names using the template
    lines.push({ key, name: key, values });
  }

  return { type: sheetName as 'PL' | 'BS' | 'CF', lines, periods };
}

/**
 * Enrich statement data with names and flags from the template.
 */
export function enrichStatements(
  statements: ComputedStatements,
  template: TemplateDefinition,
): ComputedStatements {
  const enrich = (data: StatementData, items: TemplateLineItem[]): StatementData => ({
    ...data,
    lines: data.lines.map(line => {
      const templateItem = items.find(i => i.key === line.key);
      return {
        ...line,
        name: templateItem?.name ?? line.name,
        isSubtotal: templateItem?.isSubtotal,
        isTotal: templateItem?.isTotal,
      };
    }),
  });

  return {
    pl: enrich(statements.pl, template.lineItems.pl),
    bs: enrich(statements.bs, template.lineItems.bs),
    cf: enrich(statements.cf, template.lineItems.cf),
  };
}

// ---------------------------------------------------------------------------
// Cascade Operations
// ---------------------------------------------------------------------------

/**
 * Apply a single assumption change and return the cascade result.
 * Builds workbook → mutates in place → diffs.
 */
export function applyCascade(
  config: WorkbookConfig,
  changedKey: string,
  newValue: string,
): CascadeResult {
  try {
    const hf = buildWorkbook(config);

    // Snapshot old assumption values
    const assumptionSheetId = hf.getSheetId('Assumptions')!;
    const oldValues = new Map<string, string>();
    for (let i = 0; i < config.assumptions.length; i++) {
      const val = hf.getCellValue({ sheet: assumptionSheetId, col: 1, row: i });
      oldValues.set(config.assumptions[i].key, String(val ?? ''));
    }

    // Find and update the changed cell
    const rowIdx = config.assumptions.findIndex(a => a.key === changedKey);
    if (rowIdx < 0) {
      return {
        status: 'error',
        changedKey,
        errorType: 'missing_dependency',
        errorMessage: `Assumption "${changedKey}" not found`,
        errorAtKey: changedKey,
      };
    }

    const numVal = parseFloat(newValue);
    hf.setCellContents(
      { sheet: assumptionSheetId, col: 1, row: rowIdx },
      [[isNaN(numVal) ? newValue : numVal]],
    );

    // Diff: find all assumptions whose values changed
    const updatedAssumptions: CascadeChange[] = [];
    for (let i = 0; i < config.assumptions.length; i++) {
      const key = config.assumptions[i].key;
      if (key === changedKey) continue; // Skip the directly changed key

      const newVal = hf.getCellValue({ sheet: assumptionSheetId, col: 1, row: i });
      const newStr = String(newVal ?? '');
      const oldStr = oldValues.get(key) ?? '';

      if (newStr !== oldStr) {
        updatedAssumptions.push({
          key,
          oldValue: oldStr,
          newValue: newStr,
        });
      }
    }

    // Determine impacted sections
    const impactedKeys = [changedKey, ...updatedAssumptions.map(u => u.key)];
    const impactedSections = getImpactedSections(impactedKeys);

    hf.destroy();

    return {
      status: 'success',
      changedKey,
      updatedAssumptions,
      impactedSections,
    } satisfies CascadeSuccess;
  } catch (err) {
    return {
      status: 'error',
      changedKey,
      errorType: 'formula_error',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
      errorAtKey: changedKey,
    };
  }
}

/**
 * Apply batch assumption changes.
 */
export function applyBatchCascade(
  config: WorkbookConfig,
  updates: Array<{ key: string; value: string }>,
): BatchCascadeResult {
  try {
    const hf = buildWorkbook(config);
    const assumptionSheetId = hf.getSheetId('Assumptions')!;
    const changedKeys = updates.map(u => u.key);

    // Snapshot old values
    const oldValues = new Map<string, string>();
    for (let i = 0; i < config.assumptions.length; i++) {
      const val = hf.getCellValue({ sheet: assumptionSheetId, col: 1, row: i });
      oldValues.set(config.assumptions[i].key, String(val ?? ''));
    }

    // Apply all changes in a batch
    hf.batch(() => {
      for (const update of updates) {
        const rowIdx = config.assumptions.findIndex(a => a.key === update.key);
        if (rowIdx < 0) continue;
        const numVal = parseFloat(update.value);
        hf.setCellContents(
          { sheet: assumptionSheetId, col: 1, row: rowIdx },
          [[isNaN(numVal) ? update.value : numVal]],
        );
      }
    });

    // Diff
    const updatedAssumptions: CascadeChange[] = [];
    for (let i = 0; i < config.assumptions.length; i++) {
      const key = config.assumptions[i].key;
      if (changedKeys.includes(key)) continue;

      const newVal = hf.getCellValue({ sheet: assumptionSheetId, col: 1, row: i });
      const newStr = String(newVal ?? '');
      const oldStr = oldValues.get(key) ?? '';

      if (newStr !== oldStr) {
        updatedAssumptions.push({ key, oldValue: oldStr, newValue: newStr });
      }
    }

    const impactedKeys = [...changedKeys, ...updatedAssumptions.map(u => u.key)];
    const impactedSections = getImpactedSections(impactedKeys);

    hf.destroy();

    return {
      status: 'success',
      changedKeys,
      updatedAssumptions,
      impactedSections,
      metrics: {
        totalAssumptions: config.assumptions.length,
        downstreamCount: updatedAssumptions.length,
        updatedCount: updatedAssumptions.length,
        elapsedMs: 0, // TODO: measure
      },
    } satisfies BatchCascadeSuccess;
  } catch (err) {
    return {
      status: 'error',
      changedKeys: updates.map(u => u.key),
      errorType: 'formula_error',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
      errorAtKey: null,
    };
  }
}

// ---------------------------------------------------------------------------
// Excel Export Helpers
// ---------------------------------------------------------------------------

/**
 * Serialize the workbook for Excel export.
 * Returns all sheets with their formula strings and computed values.
 */
export function serializeForExcel(hf: HyperFormula): Record<string, { formulas: (string | null)[][]; values: (number | string | null)[][] }> {
  const result: Record<string, { formulas: (string | null)[][]; values: (number | string | null)[][] }> = {};

  for (const sheetName of hf.getSheetNames()) {
    const sheetId = hf.getSheetId(sheetName)!;
    const { height, width } = hf.getSheetDimensions(sheetId);

    const formulas: (string | null)[][] = [];
    const values: (number | string | null)[][] = [];

    for (let row = 0; row < height; row++) {
      const formulaRow: (string | null)[] = [];
      const valueRow: (number | string | null)[] = [];

      for (let col = 0; col < width; col++) {
        const addr: SimpleCellAddress = { sheet: sheetId, col, row };
        const formula = hf.getCellFormula(addr);
        const value = hf.getCellValue(addr);

        formulaRow.push(typeof formula === 'string' ? formula : null);

        if (value instanceof DetailedCellError) {
          valueRow.push(0);
        } else if (typeof value === 'number') {
          valueRow.push(Math.round(value * 100) / 100);
        } else if (typeof value === 'string') {
          valueRow.push(value);
        } else {
          valueRow.push(null);
        }
      }

      formulas.push(formulaRow);
      values.push(valueRow);
    }

    result[sheetName] = { formulas, values };
  }

  return result;
}

/**
 * Get named expressions for Excel export (assumption name → cell reference).
 */
export function getNamedExpressions(hf: HyperFormula): Array<{ name: string; formula: string }> {
  return hf.listNamedExpressions().map(name => {
    const formula = hf.getNamedExpressionFormula(name);
    return { name, formula: formula ?? '' };
  });
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function assumptionsToMap(rows: AssumptionRow[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const num = row.numericValue != null
      ? parseFloat(row.numericValue)
      : row.value != null
        ? parseFloat(row.value)
        : NaN;
    if (!isNaN(num)) {
      map[row.key] = num;
    }
  }
  return map;
}

function getImpactedSections(keys: string[]): Array<{ sectionKey: string; reportType: string }> {
  const sections = new Set<string>();
  for (const key of keys) {
    const impacts = ASSUMPTION_IMPACT_MAP[key];
    if (impacts) {
      for (const sectionKey of impacts) {
        sections.add(sectionKey);
      }
    }
  }
  return [...sections].map(sectionKey => ({
    sectionKey,
    reportType: 'BUSINESS_PLAN',
  }));
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
