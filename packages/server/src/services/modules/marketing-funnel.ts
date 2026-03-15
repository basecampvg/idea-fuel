import type { ModuleDefinition } from './types';

/**
 * Marketing Funnel Module
 *
 * Models paid customer acquisition: impressions → clicks → conversions → new customers.
 * Also tracks ad spend per period.
 *
 * Outputs:
 *   - paid_customers: new customers acquired per period
 *   - ad_spend: total advertising cost per period
 */
export const marketingFunnelModule: ModuleDefinition = {
  key: 'marketing_funnel',
  name: 'Marketing Funnel',
  category: 'revenue',
  layoutType: 'standard',
  dependsOnModules: [],
  inputs: [
    { key: 'impressions', name: 'Monthly Impressions', default: 100000, valueType: 'NUMBER' },
    { key: 'impression_growth_rate', name: 'Impression Growth Rate', default: 5, valueType: 'PERCENTAGE', unit: '%' },
    { key: 'ctr', name: 'Click-Through Rate', default: 2, valueType: 'PERCENTAGE', unit: '%' },
    { key: 'cpc', name: 'Cost per Click', default: 2.50, valueType: 'CURRENCY', unit: '$' },
    { key: 'conv_rate', name: 'Conversion Rate', default: 3, valueType: 'PERCENTAGE', unit: '%' },
  ],
  calculations: [
    {
      key: 'impressions_per_period',
      name: 'Impressions',
      firstPeriodFormula: '=impressions',
      formula: '={PREV}*(1+impression_growth_rate/100)',
    },
    {
      key: 'clicks',
      name: 'Clicks',
      firstPeriodFormula: '=impressions_per_period*ctr/100',
      // Each period references its own row's impressions_per_period
    },
    {
      key: 'conversions',
      name: 'Conversions',
      firstPeriodFormula: '=clicks*conv_rate/100',
    },
    {
      key: 'paid_customers',
      name: 'New Paid Customers',
      firstPeriodFormula: '=conversions',
      isOutput: true,
    },
    {
      key: 'ad_spend',
      name: 'Ad Spend',
      firstPeriodFormula: '=clicks*cpc',
      isOutput: true,
      targetStatement: 'pl',
      targetLineItem: 'marketing',
    },
  ],
  defaultTemplates: ['saas', 'ecommerce'],
};
