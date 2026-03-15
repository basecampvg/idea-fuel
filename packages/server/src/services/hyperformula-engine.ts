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
import { BLOCKED_FUNCTION_IDS, WebserviceBlockPlugin, webserviceBlockTranslations, XirrPlugin, xirrTranslations } from '../lib/hyperformula-plugins';
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
import type { ModuleDefinition, ModuleCalcRow } from './modules';
import { sortModulesByDependency } from './modules';

// Register plugins once at module load
let pluginsRegistered = false;
function ensurePluginsRegistered() {
  if (pluginsRegistered) return;

  // Unregister dangerous built-in functions
  for (const fnId of BLOCKED_FUNCTION_IDS) {
    try {
      HyperFormula.unregisterFunction(fnId);
    } catch {
      // Function may not be registered in all configurations — ignore
    }
  }

  // Register WEBSERVICE blocker (not a built-in, so we register a custom error function)
  HyperFormula.registerFunctionPlugin(WebserviceBlockPlugin, webserviceBlockTranslations);
  // Register XIRR custom function
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

export interface WorkbookConfig {
  assumptions: AssumptionRow[];
  template: TemplateDefinition;
  forecastYears: number;
  /** Active calculation modules to include as sheets */
  activeModules?: ModuleDefinition[];
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

  // Build module sheets (sorted by dependency order)
  const activeModules = config.activeModules
    ? sortModulesByDependency(config.activeModules)
    : [];

  const sheetsData: Record<string, RawCellContent[][]> = {
    Assumptions: assumptionSheetData,
  };

  // Add module sheets before statement sheets
  for (const mod of activeModules) {
    if (mod.layoutType === 'matrix' && mod.key === 'ltv_cohort') {
      sheetsData[mod.key] = buildCohortMatrix(mod, numPeriods, assumptionMap);
    } else {
      sheetsData[mod.key] = buildModuleSheet(mod, numPeriods, monthsPerPeriod, startMonths);
    }
  }

  // Statement sheets last
  sheetsData.PL = plData;
  sheetsData.BS = bsData;
  sheetsData.CF = cfData;

  // Create workbook
  const hf = HyperFormula.buildFromSheets(
    sheetsData,
    HYPERFORMULA_CONFIG,
    namedExpressions,
  );

  // Post-construction: link statements + wire module outputs
  linkStatements(hf, template, numPeriods, forecastYears);
  wireModuleOutputs(hf, activeModules, template, numPeriods);

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

// ---------------------------------------------------------------------------
// Module Sheet Builder
// ---------------------------------------------------------------------------

/**
 * Build a 2D array for a standard-layout module sheet.
 * Row layout:
 *   Row 0-2: metadata (months_in_period, month, period)
 *   Row 3+: calculation rows from the module definition
 *
 * Formulas reference named expressions (assumptions) and other rows
 * within the same sheet by key → cell reference.
 */
/**
 * Build a triangular cohort matrix for the LTV module.
 *
 * Layout:
 *   Row 0: header labels (Period 1, Period 2, ...)
 *   Row 1..N: one row per cohort (cohort N starts in period N)
 *     - Cell (cohort, period): revenue from that cohort in that period
 *     - Cohort period 0: new_customers * arpu
 *     - Cohort period M (M>0): prior cell * retention_rate/100
 *     - Cells where period < cohort start: 0 (upper triangle)
 *   Row N+1: Total Revenue = SUM of column (all cohorts for that period)
 *   Row N+2: Active Customers = SUM of customer counts for that period
 *
 * The matrix is NxN where N = numPeriods. For a 5-year model with 21 periods,
 * this creates a 21x21 matrix (~441 cells) — well within HyperFormula's capacity.
 */
function buildCohortMatrix(
  mod: ModuleDefinition,
  numPeriods: number,
  assumptionMap: Record<string, number>,
): RawCellContent[][] {
  const data: RawCellContent[][] = [];

  // Row 0: header labels
  const headerRow: RawCellContent[] = ['Cohort'];
  for (let p = 0; p < numPeriods; p++) {
    headerRow.push(`P${p + 1}`);
  }
  data.push(headerRow);

  // Rows 1..N: cohort rows (one per period)
  for (let cohort = 0; cohort < numPeriods; cohort++) {
    const row: RawCellContent[] = [`Cohort ${cohort + 1}`];

    for (let period = 0; period < numPeriods; period++) {
      if (period < cohort) {
        // This cohort doesn't exist yet in this period
        row.push(0);
      } else if (period === cohort) {
        // Cohort birth period: new_customers * arpu
        // new_customers comes from marketing_funnel output or assumption
        row.push('=new_customers_per_period*arpu');
      } else {
        // Subsequent period: decay by retention rate
        // Reference the previous period's cell in the same row
        const prevCol = colLetter(period); // period is 0-indexed, col 0 = labels, so col for period-1 = period
        const currentRow = cohort + 2; // +1 for header, +1 for 1-indexed
        row.push(`=${prevCol}${currentRow}*monthly_retention_rate/100`);
      }
    }

    data.push(row);
  }

  // Summary row: Total Cohort Revenue = SUM of each column
  const revenueRow: RawCellContent[] = ['Total Revenue'];
  for (let p = 0; p < numPeriods; p++) {
    const col = colLetter(p + 1);
    // SUM from row 2 (first cohort) to row numPeriods+1 (last cohort)
    revenueRow.push(`=SUM(${col}2:${col}${numPeriods + 1})`);
  }
  data.push(revenueRow);

  // Summary row: Active Customers = total revenue / arpu
  const customersRow: RawCellContent[] = ['Active Customers'];
  for (let p = 0; p < numPeriods; p++) {
    const col = colLetter(p + 1);
    const revenueRowNum = numPeriods + 2;
    customersRow.push(`=IF(arpu>0,${col}${revenueRowNum}/arpu,0)`);
  }
  data.push(customersRow);

  return data;
}

function buildModuleSheet(
  mod: ModuleDefinition,
  numPeriods: number,
  monthsPerPeriod: number[],
  startMonths: number[],
): RawCellContent[][] {
  const data: RawCellContent[][] = [];

  // Metadata rows
  data.push(['_months_in_period', ...monthsPerPeriod]);
  data.push(['_month', ...startMonths]);
  data.push(['_period', ...Array.from({ length: numPeriods }, (_, i) => i)]);

  // Calculation rows
  for (let rowIdx = 0; rowIdx < mod.calculations.length; rowIdx++) {
    const calc = mod.calculations[rowIdx];
    const row: RawCellContent[] = [calc.key];

    for (let p = 0; p < numPeriods; p++) {
      if (p === 0) {
        // First period: use firstPeriodFormula, replacing calc keys with cell refs
        let formula = calc.firstPeriodFormula;
        formula = resolveModuleFormula(formula, mod.calculations, METADATA_ROWS, p + 1);
        row.push(formula);
      } else if (calc.formula) {
        // Subsequent periods: use formula with {PREV} resolved
        let formula = calc.formula;
        const curCol = colLetter(p + 1);
        const prevCol = colLetter(p);
        // Replace {PREV} with prior column same row reference
        formula = formula.replace(/\{PREV\}/g, `${prevCol}${METADATA_ROWS + rowIdx + 1}`);
        // Replace {PREV_xxx} with prior column reference to another row
        formula = formula.replace(/\{PREV_(\w+)\}/g, (_match, key) => {
          const targetIdx = mod.calculations.findIndex(c => c.key === key);
          if (targetIdx >= 0) return `${prevCol}${METADATA_ROWS + targetIdx + 1}`;
          return '0';
        });
        formula = resolveModuleFormula(formula, mod.calculations, METADATA_ROWS, p + 1);
        row.push(formula);
      } else {
        // No growth formula — repeat the firstPeriodFormula pattern for each period
        let formula = calc.firstPeriodFormula;
        formula = resolveModuleFormula(formula, mod.calculations, METADATA_ROWS, p + 1);
        row.push(formula);
      }
    }

    data.push(row);
  }

  return data;
}

/**
 * Replace calculation row keys in a formula with cell references within the module sheet.
 * E.g., "=clicks*cpc" → "=B5*cpc" (where clicks is row 5, and cpc is a named expression)
 */
function resolveModuleFormula(
  formula: string,
  calculations: ModuleCalcRow[],
  metadataRows: number,
  col: number,
): string {
  let resolved = formula;
  const colL = colLetter(col);

  for (let i = 0; i < calculations.length; i++) {
    const key = calculations[i].key;
    const cellRef = `${colL}${metadataRows + i + 1}`;
    // Replace whole-word occurrences of the calc key
    resolved = resolved.replace(new RegExp(`\\b${escapeRegex(key)}\\b`, 'g'), cellRef);
  }

  return resolved;
}

/**
 * Wire module outputs to statement line items.
 * For each active module's output, set the corresponding statement cell
 * to reference the module sheet's output cell.
 */
function wireModuleOutputs(
  hf: HyperFormula,
  modules: ModuleDefinition[],
  template: TemplateDefinition,
  numPeriods: number,
): void {
  if (modules.length === 0) return;

  hf.batch(() => {
    for (const mod of modules) {
      const modSheetId = hf.getSheetId(mod.key);
      if (modSheetId === undefined) continue;

      for (let calcIdx = 0; calcIdx < mod.calculations.length; calcIdx++) {
        const calc = mod.calculations[calcIdx];
        if (!calc.isOutput || !calc.targetStatement || !calc.targetLineItem) continue;

        // Find the target line item row in the statement sheet
        const statementKey = calc.targetStatement.toUpperCase(); // PL, BS, CF
        const statementSheetId = hf.getSheetId(statementKey);
        if (statementSheetId === undefined) continue;

        const lineItems = template.lineItems[calc.targetStatement as 'pl' | 'bs' | 'cf'];
        const lineIdx = lineItems.findIndex(l => l.key === calc.targetLineItem);
        if (lineIdx < 0) continue;

        const targetRow = METADATA_ROWS + lineIdx;

        // For matrix layout (LTV cohort), source rows are at the bottom of the matrix
        // Row structure: 1 header + numPeriods cohort rows + summary rows
        let sourceRow: number;
        if (mod.layoutType === 'matrix' && mod.key === 'ltv_cohort') {
          // cohort_revenue is the first summary row (numPeriods + 1), 0-indexed
          // active_customers is the second summary row (numPeriods + 2)
          if (calc.key === 'cohort_revenue') {
            sourceRow = numPeriods + 1; // after header + N cohort rows
          } else if (calc.key === 'active_customers') {
            sourceRow = numPeriods + 2;
          } else {
            sourceRow = METADATA_ROWS + calcIdx;
          }
        } else {
          sourceRow = METADATA_ROWS + calcIdx;
        }

        // Wire each period column
        for (let p = 0; p < numPeriods; p++) {
          const col = p + 1;
          const formula = `=${mod.key}!${colLetter(col)}${sourceRow + 1}`;
          hf.setCellContents({ sheet: statementSheetId, col, row: targetRow }, [[formula]]);
        }
      }
    }
  });
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

// ---------------------------------------------------------------------------
// Formula Validation (replaces old formula-engine.ts functions)
// ---------------------------------------------------------------------------

/**
 * Validate a formula using HyperFormula.
 * Builds a temporary workbook with the formula and checks for errors.
 */
export function validateFormulaHF(
  formula: string,
  availableKeys: string[],
): { valid: boolean; error?: string } {
  try {
    ensurePluginsRegistered();

    // Build a minimal workbook with named expressions for all available keys
    const namedExpressions = availableKeys.map((key, i) => ({
      name: key,
      expression: `=Assumptions!$B$${i + 1}`,
    }));
    const assumptionData = availableKeys.map((key) => [key, 0]);

    const hf = HyperFormula.buildFromSheets(
      { Assumptions: assumptionData, Test: [[`=${formula}`]] },
      HYPERFORMULA_CONFIG,
      namedExpressions,
    );

    const value = hf.getCellValue({ sheet: hf.getSheetId('Test')!, col: 0, row: 0 });
    hf.destroy();

    if (value instanceof DetailedCellError) {
      if (value.type === 'CYCLE') {
        return { valid: false, error: 'Circular dependency detected' };
      }
      if (value.type === 'NAME') {
        return { valid: false, error: `Unknown reference in formula: ${value.message}` };
      }
      // #DIV/0!, #VALUE!, etc. are valid formulas that just produce error values
      // for certain inputs — that's OK
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Invalid formula' };
  }
}

/**
 * Extract dependency keys from a formula.
 * Parses the formula in a HyperFormula workbook and checks which named
 * expressions it references.
 */
export function extractDependenciesHF(
  formula: string,
  availableKeys: string[],
): string[] {
  // Simple regex-based extraction: find all identifiers in the formula
  // that match known assumption keys
  const keySet = new Set(availableKeys);
  const identifiers = formula.match(/\b[a-z_][a-z0-9_]*\b/gi) ?? [];
  return [...new Set(identifiers.filter((id) => keySet.has(id)))];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
