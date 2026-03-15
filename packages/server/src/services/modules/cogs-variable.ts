import type { ModuleDefinition } from './types';

/**
 * COGS / Variable Costs Module
 *
 * Models costs that scale with usage or customers:
 *   - Hosting cost per user
 *   - API/infrastructure costs
 *   - Support costs
 *   - Payment processing
 *
 * Reads active customer count from LTV Cohort module (or direct assumption).
 *
 * Outputs:
 *   - cogs_total: total variable costs per period → P&L COGS line
 */
export const cogsVariableModule: ModuleDefinition = {
  key: 'cogs_variable',
  name: 'COGS / Variable Costs',
  category: 'cost',
  layoutType: 'standard',
  dependsOnModules: ['ltv_cohort'],
  inputs: [
    {
      key: 'active_users',
      name: 'Active Users',
      default: 200,
      valueType: 'NUMBER',
      sourceModule: 'ltv_cohort',
      sourceOutputKey: 'active_customers',
    },
    { key: 'hosting_cost_per_user', name: 'Hosting Cost per User', default: 5, valueType: 'CURRENCY', unit: '$' },
    { key: 'api_cost_per_user', name: 'API Cost per User', default: 2, valueType: 'CURRENCY', unit: '$' },
    { key: 'support_cost_per_user', name: 'Support Cost per User', default: 3, valueType: 'CURRENCY', unit: '$' },
    { key: 'payment_processing_pct', name: 'Payment Processing %', default: 2.9, valueType: 'PERCENTAGE', unit: '%' },
  ],
  calculations: [
    {
      key: 'hosting_costs',
      name: 'Hosting Costs',
      firstPeriodFormula: '=active_users*hosting_cost_per_user',
    },
    {
      key: 'api_costs',
      name: 'API / Infrastructure',
      firstPeriodFormula: '=active_users*api_cost_per_user',
    },
    {
      key: 'support_costs',
      name: 'Support Costs',
      firstPeriodFormula: '=active_users*support_cost_per_user',
    },
    {
      key: 'cogs_total',
      name: 'Total COGS',
      firstPeriodFormula: '=hosting_costs+api_costs+support_costs',
      isOutput: true,
      targetStatement: 'pl',
      targetLineItem: 'cogs',
    },
  ],
  defaultTemplates: ['saas'],
};
