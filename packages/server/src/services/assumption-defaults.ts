/**
 * Default assumption seed catalog — 24 business assumptions.
 *
 * These are seeded when a user first visits /projects/[id]/assumptions.
 * Each assumption defines its category, value type, formula, dependencies,
 * tier assignment, and sensitivity flag.
 */

import type { AssumptionCategory, AssumptionConfidence, AssumptionValueType, AssumptionTier } from '@forge/shared';

export interface AssumptionSeed {
  key: string;
  name: string;
  category: AssumptionCategory;
  valueType: AssumptionValueType;
  unit: string | null;
  formula: string | null;
  dependsOn: string[];
  tier: AssumptionTier;
  isSensitive: boolean;
  isRequired: boolean;
  defaultConfidence: AssumptionConfidence;
}

export const DEFAULT_ASSUMPTIONS: AssumptionSeed[] = [
  // === PRICING ===
  {
    key: 'unit_price',
    name: 'Unit Price',
    category: 'PRICING',
    valueType: 'CURRENCY',
    unit: '$',
    formula: null,
    dependsOn: [],
    tier: 'LIGHT',
    isSensitive: true,
    isRequired: true,
    defaultConfidence: 'AI_ESTIMATE',
  },
  {
    key: 'variable_cost_per_unit',
    name: 'Variable Cost per Unit',
    category: 'PRICING',
    valueType: 'CURRENCY',
    unit: '$',
    formula: null,
    dependsOn: [],
    tier: 'IN_DEPTH',
    isSensitive: false,
    isRequired: true,
    defaultConfidence: 'AI_ESTIMATE',
  },
  {
    key: 'gross_margin',
    name: 'Gross Margin',
    category: 'PRICING',
    valueType: 'PERCENTAGE',
    unit: '%',
    formula: '(unit_price - variable_cost_per_unit) / unit_price * 100',
    dependsOn: ['unit_price', 'variable_cost_per_unit'],
    tier: 'LIGHT',
    isSensitive: false,
    isRequired: true,
    defaultConfidence: 'CALCULATED',
  },

  // === ACQUISITION ===
  {
    key: 'cac',
    name: 'Customer Acquisition Cost',
    category: 'ACQUISITION',
    valueType: 'CURRENCY',
    unit: '$',
    formula: null,
    dependsOn: [],
    tier: 'LIGHT',
    isSensitive: true,
    isRequired: true,
    defaultConfidence: 'AI_ESTIMATE',
  },
  {
    key: 'monthly_growth',
    name: 'Monthly Growth Rate',
    category: 'ACQUISITION',
    valueType: 'PERCENTAGE',
    unit: '%',
    formula: null,
    dependsOn: [],
    tier: 'IN_DEPTH',
    isSensitive: true,
    isRequired: true,
    defaultConfidence: 'AI_ESTIMATE',
  },
  {
    key: 'conversion_rate',
    name: 'Conversion Rate',
    category: 'ACQUISITION',
    valueType: 'PERCENTAGE',
    unit: '%',
    formula: null,
    dependsOn: [],
    tier: 'IN_DEPTH',
    isSensitive: false,
    isRequired: false,
    defaultConfidence: 'AI_ESTIMATE',
  },
  {
    key: 'marketing_budget_y1',
    name: 'Marketing Budget (Year 1)',
    category: 'ACQUISITION',
    valueType: 'CURRENCY',
    unit: '$',
    formula: null,
    dependsOn: [],
    tier: 'IN_DEPTH',
    isSensitive: true,
    isRequired: false,
    defaultConfidence: 'AI_ESTIMATE',
  },

  // === RETENTION ===
  {
    key: 'monthly_churn',
    name: 'Monthly Churn Rate',
    category: 'RETENTION',
    valueType: 'PERCENTAGE',
    unit: '%',
    formula: null,
    dependsOn: [],
    tier: 'IN_DEPTH',
    isSensitive: true,
    isRequired: true,
    defaultConfidence: 'AI_ESTIMATE',
  },
  {
    key: 'ltv',
    name: 'Customer Lifetime Value',
    category: 'RETENTION',
    valueType: 'CURRENCY',
    unit: '$',
    formula: 'unit_price / (monthly_churn / 100)',
    dependsOn: ['unit_price', 'monthly_churn'],
    tier: 'IN_DEPTH',
    isSensitive: false,
    isRequired: true,
    defaultConfidence: 'CALCULATED',
  },
  {
    key: 'ltv_cac_ratio',
    name: 'LTV:CAC Ratio',
    category: 'RETENTION',
    valueType: 'NUMBER',
    unit: 'x',
    formula: 'ltv / cac',
    dependsOn: ['ltv', 'cac'],
    tier: 'IN_DEPTH',
    isSensitive: false,
    isRequired: true,
    defaultConfidence: 'CALCULATED',
  },

  // === MARKET ===
  {
    key: 'tam',
    name: 'Total Addressable Market',
    category: 'MARKET',
    valueType: 'CURRENCY',
    unit: '$',
    formula: null,
    dependsOn: [],
    tier: 'LIGHT',
    isSensitive: false,
    isRequired: true,
    defaultConfidence: 'AI_ESTIMATE',
  },
  {
    key: 'sam',
    name: 'Serviceable Addressable Market',
    category: 'MARKET',
    valueType: 'CURRENCY',
    unit: '$',
    formula: null,
    dependsOn: [],
    tier: 'LIGHT',
    isSensitive: false,
    isRequired: true,
    defaultConfidence: 'AI_ESTIMATE',
  },
  {
    key: 'som',
    name: 'Serviceable Obtainable Market',
    category: 'MARKET',
    valueType: 'CURRENCY',
    unit: '$',
    formula: null,
    dependsOn: [],
    tier: 'IN_DEPTH',
    isSensitive: false,
    isRequired: false,
    defaultConfidence: 'AI_ESTIMATE',
  },
  {
    key: 'market_growth_rate',
    name: 'Market Growth Rate',
    category: 'MARKET',
    valueType: 'PERCENTAGE',
    unit: '%',
    formula: null,
    dependsOn: [],
    tier: 'IN_DEPTH',
    isSensitive: false,
    isRequired: false,
    defaultConfidence: 'AI_ESTIMATE',
  },

  // === COSTS ===
  {
    key: 'fixed_costs_monthly',
    name: 'Fixed Costs (Monthly)',
    category: 'COSTS',
    valueType: 'CURRENCY',
    unit: '$',
    formula: null,
    dependsOn: [],
    tier: 'IN_DEPTH',
    isSensitive: true,
    isRequired: true,
    defaultConfidence: 'AI_ESTIMATE',
  },
  {
    key: 'personnel_cost_monthly',
    name: 'Personnel Cost (Monthly)',
    category: 'COSTS',
    valueType: 'CURRENCY',
    unit: '$',
    formula: null,
    dependsOn: [],
    tier: 'IN_DEPTH',
    isSensitive: false,
    isRequired: false,
    defaultConfidence: 'AI_ESTIMATE',
  },
  {
    key: 'monthly_burn_rate',
    name: 'Monthly Burn Rate',
    category: 'COSTS',
    valueType: 'CURRENCY',
    unit: '$',
    formula: 'fixed_costs_monthly + personnel_cost_monthly + (marketing_budget_y1 / 12)',
    dependsOn: ['fixed_costs_monthly', 'personnel_cost_monthly', 'marketing_budget_y1'],
    tier: 'IN_DEPTH',
    isSensitive: false,
    isRequired: true,
    defaultConfidence: 'CALCULATED',
  },

  // === FUNDING ===
  {
    key: 'months_runway',
    name: 'Months of Runway',
    category: 'FUNDING',
    valueType: 'NUMBER',
    unit: 'months',
    formula: null,
    dependsOn: [],
    tier: 'IN_DEPTH',
    isSensitive: false,
    isRequired: false,
    defaultConfidence: 'AI_ESTIMATE',
  },
  {
    key: 'total_funding_needed',
    name: 'Total Funding Needed',
    category: 'FUNDING',
    valueType: 'CURRENCY',
    unit: '$',
    formula: 'monthly_burn_rate * months_runway',
    dependsOn: ['monthly_burn_rate', 'months_runway'],
    tier: 'IN_DEPTH',
    isSensitive: false,
    isRequired: true,
    defaultConfidence: 'CALCULATED',
  },
  {
    key: 'pre_money_valuation',
    name: 'Pre-Money Valuation',
    category: 'FUNDING',
    valueType: 'CURRENCY',
    unit: '$',
    formula: null,
    dependsOn: [],
    tier: 'IN_DEPTH',
    isSensitive: false,
    isRequired: false,
    defaultConfidence: 'AI_ESTIMATE',
  },

  // === TIMELINE ===
  {
    key: 'months_to_launch',
    name: 'Months to Launch',
    category: 'TIMELINE',
    valueType: 'NUMBER',
    unit: 'months',
    formula: null,
    dependsOn: [],
    tier: 'IN_DEPTH',
    isSensitive: false,
    isRequired: false,
    defaultConfidence: 'AI_ESTIMATE',
  },
  {
    key: 'months_to_breakeven',
    name: 'Months to Breakeven',
    category: 'TIMELINE',
    valueType: 'NUMBER',
    unit: 'months',
    formula: null,
    dependsOn: [],
    tier: 'IN_DEPTH',
    isSensitive: false,
    isRequired: false,
    defaultConfidence: 'AI_ESTIMATE',
  },
  {
    key: 'months_to_first_revenue',
    name: 'Months to First Revenue',
    category: 'TIMELINE',
    valueType: 'NUMBER',
    unit: 'months',
    formula: null,
    dependsOn: [],
    tier: 'IN_DEPTH',
    isSensitive: false,
    isRequired: false,
    defaultConfidence: 'AI_ESTIMATE',
  },
  {
    key: 'team_size_y1',
    name: 'Team Size (Year 1)',
    category: 'TIMELINE',
    valueType: 'NUMBER',
    unit: 'people',
    formula: null,
    dependsOn: [],
    tier: 'IN_DEPTH',
    isSensitive: false,
    isRequired: false,
    defaultConfidence: 'AI_ESTIMATE',
  },
];

/**
 * Validate the seed catalog DAG for circular dependencies.
 * Should be called at build time or in tests.
 */
export function validateSeedCatalog(): { valid: boolean; error?: string } {
  const keySet = new Set(DEFAULT_ASSUMPTIONS.map((a) => a.key));

  // Check all dependsOn references exist
  for (const a of DEFAULT_ASSUMPTIONS) {
    for (const dep of a.dependsOn) {
      if (!keySet.has(dep)) {
        return { valid: false, error: `Assumption "${a.key}" depends on unknown key "${dep}"` };
      }
    }
  }

  // Check for unique keys
  if (keySet.size !== DEFAULT_ASSUMPTIONS.length) {
    return { valid: false, error: 'Duplicate keys found in seed catalog' };
  }

  // Check for circular dependencies using topological sort (Kahn's)
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const a of DEFAULT_ASSUMPTIONS) {
    inDegree.set(a.key, 0);
    adjacency.set(a.key, []);
  }

  for (const a of DEFAULT_ASSUMPTIONS) {
    for (const dep of a.dependsOn) {
      adjacency.get(dep)!.push(a.key);
      inDegree.set(a.key, (inDegree.get(a.key) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [key, degree] of inDegree) {
    if (degree === 0) queue.push(key);
  }

  let count = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    count++;
    for (const child of adjacency.get(current) ?? []) {
      const deg = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, deg);
      if (deg === 0) queue.push(child);
    }
  }

  if (count < DEFAULT_ASSUMPTIONS.length) {
    const cycleMembers = [...inDegree.entries()]
      .filter(([, d]) => d > 0)
      .map(([k]) => k);
    return { valid: false, error: `Circular dependency: ${cycleMembers.join(', ')}` };
  }

  return { valid: true };
}
