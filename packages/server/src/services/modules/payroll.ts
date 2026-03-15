import type { ModuleDefinition } from './types';

/**
 * Payroll Builder Module
 *
 * Models personnel costs in two modes:
 *   - Simple: headcount × avg_salary × wrap_rate
 *   - Detailed: individual employee rows (via sub-assumptions on headcount)
 *
 * The wrap rate accounts for taxes, benefits, insurance, etc.
 * Default wrap rate of 25% means total cost = salary × 1.25.
 *
 * Outputs:
 *   - payroll_expense: total personnel cost per period → P&L salaries line
 */
export const payrollModule: ModuleDefinition = {
  key: 'payroll',
  name: 'Payroll Builder',
  category: 'cost',
  layoutType: 'standard',
  dependsOnModules: [],
  inputs: [
    { key: 'headcount', name: 'Headcount', default: 5, valueType: 'NUMBER' },
    { key: 'avg_salary', name: 'Average Annual Salary', default: 80000, valueType: 'CURRENCY', unit: '$' },
    { key: 'wrap_rate', name: 'Wrap Rate (benefits, taxes)', default: 25, valueType: 'PERCENTAGE', unit: '%' },
    { key: 'annual_raise_pct', name: 'Annual Raise %', default: 3, valueType: 'PERCENTAGE', unit: '%' },
  ],
  calculations: [
    {
      key: 'monthly_base_salary',
      name: 'Monthly Base Salary',
      firstPeriodFormula: '=headcount*avg_salary/12',
      // Annual raise: grows each 12-month cycle
      formula: '={PREV}*(1+annual_raise_pct/100/12)',
    },
    {
      key: 'benefits_cost',
      name: 'Benefits & Taxes',
      firstPeriodFormula: '=monthly_base_salary*wrap_rate/100',
    },
    {
      key: 'payroll_expense',
      name: 'Total Payroll',
      firstPeriodFormula: '=monthly_base_salary+benefits_cost',
      isOutput: true,
      targetStatement: 'pl',
      targetLineItem: 'salaries',
    },
  ],
  defaultTemplates: ['saas', 'ecommerce', 'professional-services', 'general'],
};
