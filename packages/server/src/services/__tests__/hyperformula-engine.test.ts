import { describe, it, expect } from 'vitest';
import { buildWorkbook, readStatements, enrichStatements, applyCascade, serializeForExcel, getNamedExpressions } from '../hyperformula-engine';
import type { AssumptionRow } from '../hyperformula-engine';
import { saasTemplate } from '../financial-templates/saas';
import { generalTemplate } from '../financial-templates/general';
import { validateAssumptionKey } from '../../lib/assumption-key-validator';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const SAAS_BEGINNER_ASSUMPTIONS: AssumptionRow[] = [
  { key: 'monthly_revenue', value: '10000', numericValue: '10000', formula: null },
  { key: 'revenue_growth_rate', value: '10', numericValue: '10', formula: null },
  { key: 'gross_margin', value: '80', numericValue: '80', formula: null },
  { key: 'headcount', value: '3', numericValue: '3', formula: null },
  { key: 'avg_salary', value: '80000', numericValue: '80000', formula: null },
  { key: 'monthly_opex', value: '5000', numericValue: '5000', formula: null },
  { key: 'starting_cash', value: '50000', numericValue: '50000', formula: null },
  { key: 'monthly_churn', value: '5', numericValue: '5', formula: null },
  { key: 'cac', value: '200', numericValue: '200', formula: null },
  { key: 'tax_rate', value: '25', numericValue: '25', formula: null },
  // Calculated assumptions
  { key: 'monthly_payroll', value: '20000', numericValue: '20000', formula: 'headcount * avg_salary / 12' },
  { key: 'total_monthly_costs', value: '25000', numericValue: '25000', formula: 'monthly_payroll + monthly_opex' },
  { key: 'gross_profit_monthly', value: '8000', numericValue: '8000', formula: 'monthly_revenue * gross_margin / 100' },
  { key: 'net_monthly_income', value: '-17000', numericValue: '-17000', formula: 'gross_profit_monthly - total_monthly_costs' },
  { key: 'tax_expense_monthly', value: '0', numericValue: '0', formula: 'IF(net_monthly_income > 0, net_monthly_income * tax_rate / 100, 0)' },
  { key: 'net_income_after_tax', value: '-17000', numericValue: '-17000', formula: 'net_monthly_income - tax_expense_monthly' },
  { key: 'marketing_budget', value: '0', numericValue: '0', formula: null },
  { key: 'accounts_receivable_days', value: '30', numericValue: '30', formula: null },
  { key: 'accounts_payable_days', value: '45', numericValue: '45', formula: null },
];

// ---------------------------------------------------------------------------
// Workbook Builder Tests
// ---------------------------------------------------------------------------

describe('HyperFormula Engine', () => {
  describe('buildWorkbook', () => {
    it('creates a workbook with 4 sheets', () => {
      const hf = buildWorkbook({
        assumptions: SAAS_BEGINNER_ASSUMPTIONS,
        template: saasTemplate,
        forecastYears: 5,
      });

      const sheets = hf.getSheetNames();
      expect(sheets).toContain('Assumptions');
      expect(sheets).toContain('PL');
      expect(sheets).toContain('BS');
      expect(sheets).toContain('CF');
      expect(sheets.length).toBe(4);

      hf.destroy();
    });

    it('registers named expressions for all assumptions', () => {
      const hf = buildWorkbook({
        assumptions: SAAS_BEGINNER_ASSUMPTIONS,
        template: saasTemplate,
        forecastYears: 5,
      });

      const names = hf.listNamedExpressions();
      expect(names).toContain('monthly_revenue');
      expect(names).toContain('revenue_growth_rate');
      expect(names).toContain('tax_rate');
      expect(names).toContain('starting_cash');

      hf.destroy();
    });

    it('evaluates assumption formulas correctly', () => {
      const hf = buildWorkbook({
        assumptions: SAAS_BEGINNER_ASSUMPTIONS,
        template: saasTemplate,
        forecastYears: 5,
      });

      const assumptionSheetId = hf.getSheetId('Assumptions')!;

      // monthly_payroll = headcount * avg_salary / 12 = 3 * 80000 / 12 = 20000
      const payrollIdx = SAAS_BEGINNER_ASSUMPTIONS.findIndex(a => a.key === 'monthly_payroll');
      const payroll = hf.getCellValue({ sheet: assumptionSheetId, col: 1, row: payrollIdx });
      expect(payroll).toBe(20000);

      // gross_profit_monthly = monthly_revenue * gross_margin / 100 = 10000 * 80 / 100 = 8000
      const gpIdx = SAAS_BEGINNER_ASSUMPTIONS.findIndex(a => a.key === 'gross_profit_monthly');
      const gp = hf.getCellValue({ sheet: assumptionSheetId, col: 1, row: gpIdx });
      expect(gp).toBe(8000);

      // tax_expense_monthly = IF(net_monthly_income > 0, ..., 0) = 0 (net income is negative)
      const taxIdx = SAAS_BEGINNER_ASSUMPTIONS.findIndex(a => a.key === 'tax_expense_monthly');
      const tax = hf.getCellValue({ sheet: assumptionSheetId, col: 1, row: taxIdx });
      expect(tax).toBe(0);

      hf.destroy();
    });
  });

  describe('readStatements', () => {
    it('returns ComputedStatements with correct period count', () => {
      const hf = buildWorkbook({
        assumptions: SAAS_BEGINNER_ASSUMPTIONS,
        template: saasTemplate,
        forecastYears: 5,
      });

      const statements = readStatements(hf, 5);

      // 5-year forecast: 12 monthly + 4 quarterly + 3 annual = 19 periods
      expect(statements.pl.periods.length).toBe(19);
      expect(statements.bs.periods.length).toBe(19);
      expect(statements.cf.periods.length).toBe(19);

      // P&L should have the same number of lines as template
      expect(statements.pl.lines.length).toBe(saasTemplate.lineItems.pl.length);
      expect(statements.bs.lines.length).toBe(saasTemplate.lineItems.bs.length);
      expect(statements.cf.lines.length).toBe(saasTemplate.lineItems.cf.length);

      hf.destroy();
    });

    it('computes P&L revenue using growth formula', () => {
      const hf = buildWorkbook({
        assumptions: SAAS_BEGINNER_ASSUMPTIONS,
        template: saasTemplate,
        forecastYears: 5,
      });

      const statements = readStatements(hf, 5);
      const revenueLine = statements.pl.lines.find(l => l.key === 'subscription_revenue');
      expect(revenueLine).toBeDefined();

      // Period 1: monthly_revenue = 10000
      expect(revenueLine!.values[0]).toBeCloseTo(10000, 0);

      // Period 2: 10000 * (1 + 0.10) = 11000
      expect(revenueLine!.values[1]).toBeCloseTo(11000, 0);

      // Period 3: 11000 * (1 + 0.10) = 12100
      expect(revenueLine!.values[2]).toBeCloseTo(12100, 0);

      hf.destroy();
    });

    it('computes net income correctly', () => {
      const hf = buildWorkbook({
        assumptions: SAAS_BEGINNER_ASSUMPTIONS,
        template: saasTemplate,
        forecastYears: 5,
      });

      const statements = readStatements(hf, 5);
      const netIncome = statements.pl.lines.find(l => l.key === 'net_income');
      expect(netIncome).toBeDefined();

      // Net income should be a number (not NaN)
      expect(Number.isFinite(netIncome!.values[0])).toBe(true);

      hf.destroy();
    });

    it('links ending cash from CF to BS', () => {
      const hf = buildWorkbook({
        assumptions: SAAS_BEGINNER_ASSUMPTIONS,
        template: saasTemplate,
        forecastYears: 5,
      });

      const statements = readStatements(hf, 5);
      const bsCash = statements.bs.lines.find(l => l.key === 'cash');
      const cfEndingCash = statements.cf.lines.find(l => l.key === 'ending_cash');

      expect(bsCash).toBeDefined();
      expect(cfEndingCash).toBeDefined();

      // BS cash should equal CF ending cash for all periods
      for (let p = 0; p < statements.pl.periods.length; p++) {
        expect(bsCash!.values[p]).toBeCloseTo(cfEndingCash!.values[p], 1);
      }

      hf.destroy();
    });

    it('computes retained earnings from cumulative net income', () => {
      const hf = buildWorkbook({
        assumptions: SAAS_BEGINNER_ASSUMPTIONS,
        template: saasTemplate,
        forecastYears: 5,
      });

      const statements = readStatements(hf, 5);
      const netIncome = statements.pl.lines.find(l => l.key === 'net_income');
      const retained = statements.bs.lines.find(l => l.key === 'retained_earnings');

      expect(netIncome).toBeDefined();
      expect(retained).toBeDefined();

      // Retained earnings period N = sum of net income periods 0..N
      let cumulative = 0;
      for (let p = 0; p < statements.pl.periods.length; p++) {
        cumulative += netIncome!.values[p];
        expect(retained!.values[p]).toBeCloseTo(cumulative, 0);
      }

      hf.destroy();
    });
  });

  describe('enrichStatements', () => {
    it('adds names and flags from template', () => {
      const hf = buildWorkbook({
        assumptions: SAAS_BEGINNER_ASSUMPTIONS,
        template: saasTemplate,
        forecastYears: 5,
      });

      const raw = readStatements(hf, 5);
      const enriched = enrichStatements(raw, saasTemplate);

      const revenue = enriched.pl.lines.find(l => l.key === 'revenue');
      expect(revenue?.name).toBe('Revenue');
      expect(revenue?.isTotal).toBe(true);

      const grossProfit = enriched.pl.lines.find(l => l.key === 'gross_profit');
      expect(grossProfit?.name).toBe('Gross Profit');
      expect(grossProfit?.isSubtotal).toBe(true);

      hf.destroy();
    });
  });

  describe('serializeForExcel', () => {
    it('returns formulas and values for all sheets', () => {
      const hf = buildWorkbook({
        assumptions: SAAS_BEGINNER_ASSUMPTIONS,
        template: saasTemplate,
        forecastYears: 5,
      });

      const serialized = serializeForExcel(hf);

      expect(serialized).toHaveProperty('Assumptions');
      expect(serialized).toHaveProperty('PL');
      expect(serialized).toHaveProperty('BS');
      expect(serialized).toHaveProperty('CF');

      // PL should have formulas (not all null)
      const plFormulas = serialized.PL.formulas.flat();
      const hasFormulas = plFormulas.some(f => f !== null);
      expect(hasFormulas).toBe(true);

      hf.destroy();
    });

    it('returns named expressions', () => {
      const hf = buildWorkbook({
        assumptions: SAAS_BEGINNER_ASSUMPTIONS,
        template: saasTemplate,
        forecastYears: 5,
      });

      const names = getNamedExpressions(hf);
      expect(names.length).toBeGreaterThan(0);
      expect(names.find(n => n.name === 'monthly_revenue')).toBeDefined();

      hf.destroy();
    });
  });

  describe('applyCascade', () => {
    it('recalculates dependent assumptions when a value changes', () => {
      const result = applyCascade(
        {
          assumptions: SAAS_BEGINNER_ASSUMPTIONS,
          template: saasTemplate,
          forecastYears: 5,
        },
        'monthly_revenue',
        '20000',
      );

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        // gross_profit_monthly should have changed (depends on monthly_revenue)
        const gpChange = result.updatedAssumptions.find(u => u.key === 'gross_profit_monthly');
        expect(gpChange).toBeDefined();
        expect(gpChange!.newValue).toBe('16000'); // 20000 * 80 / 100
      }
    });

    it('returns error for non-existent assumption', () => {
      const result = applyCascade(
        {
          assumptions: SAAS_BEGINNER_ASSUMPTIONS,
          template: saasTemplate,
          forecastYears: 5,
        },
        'nonexistent_key',
        '100',
      );

      expect(result.status).toBe('error');
    });
  });
});

// ---------------------------------------------------------------------------
// Key Validator Tests
// ---------------------------------------------------------------------------

describe('Assumption Key Validator', () => {
  it('accepts valid snake_case keys', () => {
    expect(validateAssumptionKey('monthly_revenue').valid).toBe(true);
    expect(validateAssumptionKey('arpu').valid).toBe(true);
    expect(validateAssumptionKey('ltv_cac_ratio').valid).toBe(true);
    expect(validateAssumptionKey('_private').valid).toBe(true);
  });

  it('rejects cell reference patterns', () => {
    expect(validateAssumptionKey('A1').valid).toBe(false);
    expect(validateAssumptionKey('Q4').valid).toBe(false);
    expect(validateAssumptionKey('AB12').valid).toBe(false);
  });

  it('rejects HyperFormula built-in function names', () => {
    expect(validateAssumptionKey('sum').valid).toBe(false);
    expect(validateAssumptionKey('if').valid).toBe(false);
    expect(validateAssumptionKey('pmt').valid).toBe(false);
    expect(validateAssumptionKey('npv').valid).toBe(false);
    expect(validateAssumptionKey('irr').valid).toBe(false);
    expect(validateAssumptionKey('vlookup').valid).toBe(false);
  });

  it('rejects uppercase or mixed case', () => {
    expect(validateAssumptionKey('MonthlyRevenue').valid).toBe(false);
    expect(validateAssumptionKey('REVENUE').valid).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(validateAssumptionKey('').valid).toBe(false);
  });

  it('rejects keys over 100 characters', () => {
    const longKey = 'a'.repeat(101);
    expect(validateAssumptionKey(longKey).valid).toBe(false);
  });
});
