import type { ModuleDefinition } from './types';

/**
 * Debt Schedule Module
 *
 * Models a loan amortization schedule using the prior-period pattern
 * to avoid circular references:
 *
 *   interest_N = opening_balance_N × (annual_rate / 12)
 *   payment_N = PMT(annual_rate/12, remaining_months, opening_balance_N)
 *   principal_N = payment_N - interest_N
 *   closing_balance_N = opening_balance_N - principal_N
 *   opening_balance_N+1 = closing_balance_N  ← prior-period reference
 *
 * Outputs:
 *   - interest_expense: → P&L interest line
 *   - principal_payment: → CF debt repayment
 *   - closing_balance: → BS long-term debt
 */
export const debtScheduleModule: ModuleDefinition = {
  key: 'debt_schedule',
  name: 'Debt Schedule',
  category: 'financing',
  layoutType: 'standard',
  dependsOnModules: [],
  inputs: [
    { key: 'initial_debt', name: 'Initial Loan Amount', default: 0, valueType: 'CURRENCY', unit: '$' },
    { key: 'annual_interest_rate', name: 'Annual Interest Rate', default: 8, valueType: 'PERCENTAGE', unit: '%' },
    { key: 'loan_term_months', name: 'Loan Term (months)', default: 60, valueType: 'NUMBER', unit: 'months' },
  ],
  calculations: [
    {
      key: 'opening_balance',
      name: 'Opening Balance',
      firstPeriodFormula: '=initial_debt',
      formula: '={PREV_closing_balance}', // references prior period's closing_balance
    },
    {
      key: 'interest_expense',
      name: 'Interest Expense',
      firstPeriodFormula: '=opening_balance*annual_interest_rate/100/12',
      isOutput: true,
      targetStatement: 'pl',
      targetLineItem: 'interest',
    },
    {
      key: 'payment',
      name: 'Monthly Payment',
      firstPeriodFormula: '=IF(initial_debt>0,PMT(annual_interest_rate/100/12,loan_term_months,initial_debt),0)',
    },
    {
      key: 'principal_payment',
      name: 'Principal Payment',
      firstPeriodFormula: '=ABS(payment)-interest_expense',
      isOutput: true,
      targetStatement: 'cf',
      targetLineItem: 'debt_proceeds',
    },
    {
      key: 'closing_balance',
      name: 'Closing Balance',
      firstPeriodFormula: '=opening_balance-principal_payment',
      isOutput: true,
      targetStatement: 'bs',
      targetLineItem: 'long_term_debt',
    },
  ],
  defaultTemplates: ['saas', 'ecommerce', 'professional-services', 'general'],
};
