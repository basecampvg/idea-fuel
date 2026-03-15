/**
 * Excel Generator for Financial Models
 *
 * Generates an interactive Excel workbook with REAL FORMULAS from HyperFormula.
 * Every cell in the financial statements contains a live formula that
 * recalculates when assumptions are changed in the exported file.
 *
 * Sheets:
 *   - Dashboard: key metrics summary
 *   - Assumptions: named ranges for each assumption
 *   - Income Statement: P&L with formulas
 *   - Balance Sheet: with formulas referencing P&L
 *   - Cash Flow: with formulas referencing P&L and BS
 */

import ExcelJS from 'exceljs';
import type { ComputedStatements, StatementData } from '@forge/shared';
import { sanitizeTextCell } from './sanitize';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExcelExportInput {
  modelName: string;
  scenarioName: string;
  forecastYears: number;
  assumptions: Array<{
    key: string;
    name: string;
    category: string;
    value: string | null;
    numericValue: string | null;
    valueType: string;
    unit: string | null;
    formula: string | null;
  }>;
  statements: ComputedStatements;
  /** HyperFormula serialized data — if provided, formulas are written to cells */
  hfData?: {
    sheets: Record<string, { formulas: (string | null)[][]; values: (number | string | null)[][] }>;
    namedExpressions: Array<{ name: string; formula: string }>;
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF0F172A' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
};

const SUBTOTAL_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF1F5F9' },
};

const INPUT_FONT: Partial<ExcelJS.Font> = {
  color: { argb: 'FF0000FF' }, // Blue for input cells (financial modeling convention)
};

const CURRENCY_FORMAT = '#,##0;[Red](#,##0)';
const PERCENT_FORMAT = '0.0%';
const NUMBER_FORMAT = '#,##0.00';

function applyHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
  });
  row.height = 28;
}

function applySubtotalRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = SUBTOTAL_FILL;
    cell.font = { bold: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });
}

function applyTotalRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 11 };
    cell.border = {
      top: { style: 'double', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
    };
  });
}

// ---------------------------------------------------------------------------
// Sheet builders
// ---------------------------------------------------------------------------

function buildAssumptionsSheet(
  workbook: ExcelJS.Workbook,
  assumptions: ExcelExportInput['assumptions'],
  hfData?: ExcelExportInput['hfData'],
) {
  const ws = workbook.addWorksheet('Assumptions', {
    properties: { tabColor: { argb: 'FF0284C7' } },
  });

  ws.columns = [
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Assumption', key: 'name', width: 35 },
    { header: 'Value', key: 'value', width: 18 },
    { header: 'Unit', key: 'unit', width: 12 },
    { header: 'Type', key: 'type', width: 14 },
  ];

  applyHeaderRow(ws.getRow(1));

  assumptions.forEach((a, idx) => {
    const rowNum = idx + 2;
    const numVal = a.numericValue != null ? parseFloat(a.numericValue) : parseFloat(a.value ?? '0');
    const cellValue = isNaN(numVal) ? (a.value ?? '') : numVal;

    // Sanitize text values against formula injection
    ws.getRow(rowNum).values = [
      sanitizeTextCell(a.category),
      sanitizeTextCell(a.name),
      cellValue,
      sanitizeTextCell(a.unit ?? ''),
      sanitizeTextCell(a.valueType),
    ];

    const valueCell = ws.getCell(`C${rowNum}`);

    // If HyperFormula data is available, use the formula from the Assumptions sheet
    if (hfData?.sheets.Assumptions) {
      const hfRow = hfData.sheets.Assumptions;
      // HyperFormula Assumptions sheet: row idx = assumption index, col 1 = value
      if (idx < hfRow.formulas.length && hfRow.formulas[idx]?.[1]) {
        const formula = hfRow.formulas[idx][1]!;
        const computedVal = typeof hfRow.values[idx]?.[1] === 'number'
          ? hfRow.values[idx][1] as number
          : cellValue;
        valueCell.value = { formula, result: typeof computedVal === 'number' ? computedVal : undefined };
      }
    }

    // Format
    if (a.valueType === 'PERCENTAGE') {
      valueCell.numFmt = PERCENT_FORMAT;
      if (typeof valueCell.value === 'number') {
        valueCell.value = (valueCell.value as number) / 100;
      }
    } else if (a.valueType === 'CURRENCY') {
      valueCell.numFmt = CURRENCY_FORMAT;
    } else {
      valueCell.numFmt = NUMBER_FORMAT;
    }

    // Blue font for input cells (no formula)
    if (!a.formula) {
      valueCell.font = INPUT_FONT;
    }

    // Create named range
    const safeName = a.key.replace(/[^a-zA-Z0-9_]/g, '_');
    try {
      workbook.definedNames.add(`'Assumptions'!$C$${rowNum}`, safeName);
    } catch {
      // Skip conflicts
    }
  });

  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function buildStatementSheetWithFormulas(
  workbook: ExcelJS.Workbook,
  statement: StatementData,
  sheetName: string,
  excelSheetName: string,
  tabColor: string,
  hfData?: ExcelExportInput['hfData'],
) {
  const ws = workbook.addWorksheet(excelSheetName, {
    properties: { tabColor: { argb: tabColor } },
  });

  const periods = statement.periods;

  ws.getColumn(1).width = 30;
  for (let i = 0; i < periods.length; i++) {
    ws.getColumn(i + 2).width = 14;
  }

  // Header row
  ws.getRow(1).values = ['', ...periods];
  applyHeaderRow(ws.getRow(1));

  // Get HyperFormula sheet data if available
  const hfSheet = hfData?.sheets[sheetName];
  // Metadata rows offset: 3 rows (months_in_period, month, period) before line items
  const METADATA_ROWS = 3;

  statement.lines.forEach((line, idx) => {
    const rowNum = idx + 2;

    const rowValues: (string | number | { formula: string; result?: number })[] = [sanitizeTextCell(line.name)];

    for (let p = 0; p < periods.length; p++) {
      const bakedValue = line.values[p] ?? 0;
      const hfDataRow = METADATA_ROWS + idx;
      const hfDataCol = p + 1; // col 0 = labels

      // Try to get formula from HyperFormula
      if (hfSheet && hfDataRow < hfSheet.formulas.length) {
        const formula = hfSheet.formulas[hfDataRow]?.[hfDataCol];
        if (formula) {
          // Write real formula with pre-calculated result
          rowValues.push({ formula, result: typeof bakedValue === 'number' ? Math.round(bakedValue * 100) / 100 : undefined });
          continue;
        }
      }

      // Fallback: baked value
      rowValues.push(bakedValue);
    }

    // Write row
    const row = ws.getRow(rowNum);
    rowValues.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      if (typeof val === 'object' && val !== null && 'formula' in val) {
        cell.value = val as ExcelJS.CellFormulaValue;
      } else {
        cell.value = val as ExcelJS.CellValue;
      }
    });

    // Format numeric cells
    for (let p = 0; p < periods.length; p++) {
      const cell = ws.getCell(rowNum, p + 2);
      cell.numFmt = CURRENCY_FORMAT;
      cell.alignment = { horizontal: 'right' };
    }

    // Style subtotals and totals
    if (line.isTotal) {
      applyTotalRow(ws.getRow(rowNum));
    } else if (line.isSubtotal) {
      applySubtotalRow(ws.getRow(rowNum));
    }

    const nameCell = ws.getCell(rowNum, 1);
    if (line.isSubtotal || line.isTotal) {
      nameCell.font = { bold: true };
    }
  });

  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
}

function buildDashboardSheet(
  workbook: ExcelJS.Workbook,
  input: ExcelExportInput,
) {
  const ws = workbook.addWorksheet('Dashboard', {
    properties: { tabColor: { argb: 'FF059669' } },
  });

  ws.mergeCells('A1:F1');
  const titleCell = ws.getCell('A1');
  titleCell.value = sanitizeTextCell(input.modelName);
  titleCell.font = { bold: true, size: 18, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 40;

  ws.mergeCells('A2:F2');
  const subtitleCell = ws.getCell('A2');
  subtitleCell.value = sanitizeTextCell(`Scenario: ${input.scenarioName} | ${input.forecastYears}-Year Forecast`);
  subtitleCell.font = { size: 12, color: { argb: 'FF475569' } };
  subtitleCell.alignment = { horizontal: 'center' };

  ws.getCell('A4').value = 'Key Metrics';
  ws.getCell('A4').font = { bold: true, size: 14 };

  const { pl, cf } = input.statements;
  const lastPeriod = pl.periods.length - 1;
  const revenueLine = pl.lines.find((l) => l.key === 'total_revenue' || l.key === 'revenue');
  const netIncomeLine = pl.lines.find((l) => l.key === 'net_income');
  const endingCashLine = cf.lines.find((l) => l.key === 'ending_cash');

  const totalRevenue = revenueLine?.values.reduce((s, v) => s + v, 0) ?? 0;
  const finalRevenue = revenueLine?.values[lastPeriod] ?? 0;
  const finalNetIncome = netIncomeLine?.values[lastPeriod] ?? 0;
  const finalCash = endingCashLine?.values[lastPeriod] ?? 0;

  const y1NetIncome = netIncomeLine?.values.slice(0, 12) ?? [];
  const avgMonthlyBurn = y1NetIncome.length > 0
    ? y1NetIncome.reduce((s, v) => s + v, 0) / y1NetIncome.length
    : 0;

  const startingCash = input.assumptions.find((a) => a.key === 'starting_cash');
  const startCashVal = startingCash ? parseFloat(startingCash.numericValue ?? startingCash.value ?? '0') : 0;
  const runwayMonths = avgMonthlyBurn < 0 ? Math.floor(startCashVal / Math.abs(avgMonthlyBurn)) : Infinity;

  const metrics = [
    ['Cumulative Revenue', totalRevenue, CURRENCY_FORMAT],
    ['Final Period Revenue', finalRevenue, CURRENCY_FORMAT],
    ['Final Period Net Income', finalNetIncome, CURRENCY_FORMAT],
    ['Ending Cash Balance', finalCash, CURRENCY_FORMAT],
    ['Avg Monthly Burn (Y1)', avgMonthlyBurn, CURRENCY_FORMAT],
    ['Runway (months)', runwayMonths === Infinity ? 'N/A (profitable)' : runwayMonths, '#,##0'],
  ] as const;

  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 22;

  metrics.forEach(([label, value, fmt], idx) => {
    const row = idx + 6;
    ws.getCell(`A${row}`).value = label as string;
    ws.getCell(`A${row}`).font = { color: { argb: 'FF475569' } };
    const valCell = ws.getCell(`B${row}`);
    valCell.value = value;
    if (typeof value === 'number') {
      valCell.numFmt = fmt;
    }
    valCell.font = { bold: true, size: 12 };
  });

  ws.getCell('A14').value = `Generated: ${new Date().toISOString().split('T')[0]}`;
  ws.getCell('A14').font = { size: 9, color: { argb: 'FF94A3B8' } };
  ws.getCell('A15').value = 'Generated by Idea Fuel Financial Modeling';
  ws.getCell('A15').font = { size: 9, color: { argb: 'FF94A3B8' }, italic: true };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateExcelBuffer(input: ExcelExportInput): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Idea Fuel';
  workbook.created = new Date();

  // 1. Dashboard
  buildDashboardSheet(workbook, input);

  // 2. Assumptions (with named ranges)
  buildAssumptionsSheet(workbook, input.assumptions, input.hfData);

  // 3. Statements with real HyperFormula formulas
  buildStatementSheetWithFormulas(workbook, input.statements.pl, 'PL', 'Income Statement', 'FF059669', input.hfData);
  buildStatementSheetWithFormulas(workbook, input.statements.bs, 'BS', 'Balance Sheet', 'FF0284C7', input.hfData);
  buildStatementSheetWithFormulas(workbook, input.statements.cf, 'CF', 'Cash Flow', 'FFD97706', input.hfData);

  // Register named expressions from HyperFormula
  if (input.hfData?.namedExpressions) {
    for (const ne of input.hfData.namedExpressions) {
      try {
        workbook.definedNames.add(ne.formula, ne.name);
      } catch {
        // Skip duplicates or conflicts
      }
    }
  }

  workbook.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
