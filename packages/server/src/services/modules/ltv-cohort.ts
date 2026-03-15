import type { ModuleDefinition } from './types';

/**
 * LTV / Cohort Revenue Module
 *
 * Models revenue using a cohort-based approach: each period's new customers
 * form a cohort that generates declining revenue over time based on retention.
 *
 * Layout: triangular matrix where:
 *   - Rows = monthly cohorts (one per period)
 *   - Columns = aging periods
 *   - Cell value = remaining customers in cohort × ARPU
 *
 * Total revenue per period = sum of all active cohorts in that period column.
 *
 * New customers flow in from acquisition modules (Marketing Funnel, etc.)
 * or from a direct assumption.
 *
 * Outputs:
 *   - cohort_revenue: total revenue per period (sum of all cohorts)
 *   - active_customers: total active customers per period
 */
export const ltvCohortModule: ModuleDefinition = {
  key: 'ltv_cohort',
  name: 'LTV / Cohort Revenue',
  category: 'revenue',
  layoutType: 'matrix',
  dependsOnModules: ['marketing_funnel'],
  inputs: [
    { key: 'arpu', name: 'Avg Revenue Per User', default: 49, valueType: 'CURRENCY', unit: '$' },
    { key: 'monthly_retention_rate', name: 'Monthly Retention Rate', default: 95, valueType: 'PERCENTAGE', unit: '%' },
    {
      key: 'new_customers_per_period',
      name: 'New Customers per Period',
      default: 50,
      valueType: 'NUMBER',
      sourceModule: 'marketing_funnel',
      sourceOutputKey: 'paid_customers',
    },
  ],
  calculations: [
    // The matrix layout handles cohort rows dynamically.
    // These are the summary rows at the bottom of the matrix.
    {
      key: 'cohort_revenue',
      name: 'Total Cohort Revenue',
      firstPeriodFormula: '=new_customers_per_period*arpu',
      isOutput: true,
      targetStatement: 'pl',
      targetLineItem: 'subscription_revenue',
    },
    {
      key: 'active_customers',
      name: 'Active Customers',
      firstPeriodFormula: '=new_customers_per_period',
      isOutput: true,
    },
  ],
  defaultTemplates: ['saas'],
};
