/**
 * Client-side copy of the assumption-to-section impact mapping.
 * Mirrors packages/server/src/lib/assumption-impact-map.ts.
 */
export const ASSUMPTION_IMPACT_MAP: Record<string, string[]> = {
  // PRICING
  unit_price: ['pricingStrategy', 'revenueStreams', 'financialProjections', 'executiveSummary'],
  gross_margin: ['pricingStrategy', 'financialProjections', 'costStructure'],
  variable_cost_per_unit: ['costStructure', 'financialProjections', 'pricingStrategy'],

  // ACQUISITION
  cac: ['customerAcquisition', 'financialProjections', 'marketingStrategy'],
  monthly_growth: ['financialProjections', 'executiveSummary'],
  marketing_budget_y1: ['marketingStrategy', 'financialProjections', 'costStructure'],
  conversion_rate: ['customerAcquisition', 'financialProjections'],

  // RETENTION
  monthly_churn: ['financialProjections'],
  ltv: ['financialProjections', 'executiveSummary'],
  ltv_cac_ratio: ['financialProjections', 'executiveSummary'],

  // MARKET
  tam: ['marketSize', 'executiveSummary'],
  sam: ['marketSize', 'executiveSummary'],
  som: ['marketSize', 'financialProjections'],
  market_growth_rate: ['marketSize', 'executiveSummary'],

  // COSTS
  fixed_costs_monthly: ['costStructure', 'financialProjections'],
  personnel_cost_monthly: ['costStructure', 'financialProjections', 'teamRequirements'],
  monthly_burn_rate: ['financialProjections', 'costStructure'],

  // FUNDING
  total_funding_needed: ['financialProjections', 'executiveSummary'],
  months_runway: ['financialProjections'],
  pre_money_valuation: ['financialProjections', 'executiveSummary'],

  // TIMELINE
  months_to_launch: ['milestones', 'executiveSummary'],
  months_to_breakeven: ['financialProjections', 'milestones'],
  months_to_first_revenue: ['milestones', 'financialProjections'],
  team_size_y1: ['teamRequirements', 'costStructure'],
};
