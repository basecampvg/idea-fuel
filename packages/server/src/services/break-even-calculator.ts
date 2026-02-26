/**
 * Break-Even Calculator Service
 *
 * Computes break-even point adapted to different revenue models:
 *   - Unit-based:    breakeven_units = fixed_costs / (price - variable_cost)
 *   - Subscription:  breakeven_subscribers = fixed_costs / ARPU
 *   - Services:      breakeven_hours = fixed_costs / (hourly_rate - variable_cost_per_hour)
 *
 * Returns the break-even point, the period when it's reached, and
 * cumulative profit/loss trajectory for chart rendering.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RevenueModel = 'unit' | 'subscription' | 'services';

export interface BreakEvenInput {
  revenueModel: RevenueModel;
  fixedCostsMonthly: number;

  // Unit-based
  pricePerUnit?: number;
  variableCostPerUnit?: number;
  unitsPerMonth?: number;

  // Subscription
  arpu?: number;
  monthlyChurnRate?: number;
  newCustomersPerMonth?: number;
  startingCustomers?: number;

  // Services
  hourlyRate?: number;
  variableCostPerHour?: number;
  billableHoursPerMonth?: number;
}

export interface BreakEvenResult {
  revenueModel: RevenueModel;

  /** Number of units/subscribers/hours to break even in a single period */
  breakEvenPoint: number;
  breakEvenUnit: string;

  /** Month index (0-based) when cumulative profit first turns positive, or -1 if never */
  breakEvenMonth: number;

  /** Monthly trajectory: revenue, costs, profit, cumulative profit */
  trajectory: Array<{
    month: number;
    revenue: number;
    totalCosts: number;
    profit: number;
    cumulativeProfit: number;
  }>;
}

// ---------------------------------------------------------------------------
// Core calculations
// ---------------------------------------------------------------------------

const TRAJECTORY_MONTHS = 60; // 5 years

/**
 * Unit-based break-even: physical products or one-time sales.
 */
function computeUnitBreakEven(input: BreakEvenInput): BreakEvenResult {
  const price = input.pricePerUnit ?? 0;
  const vc = input.variableCostPerUnit ?? 0;
  const units = input.unitsPerMonth ?? 0;
  const fixed = input.fixedCostsMonthly;

  const contribution = price - vc;
  const breakEvenPoint = contribution > 0 ? Math.ceil(fixed / contribution) : Infinity;

  const trajectory = buildTrajectory(TRAJECTORY_MONTHS, () => {
    return { revenue: units * price, variableCosts: units * vc };
  }, fixed);

  return {
    revenueModel: 'unit',
    breakEvenPoint: isFinite(breakEvenPoint) ? breakEvenPoint : -1,
    breakEvenUnit: 'units/month',
    breakEvenMonth: findBreakEvenMonth(trajectory),
    trajectory,
  };
}

/**
 * Subscription break-even: SaaS / recurring revenue.
 * Accounts for churn and new customer acquisition.
 */
function computeSubscriptionBreakEven(input: BreakEvenInput): BreakEvenResult {
  const arpu = input.arpu ?? 0;
  const churn = input.monthlyChurnRate ?? 0;
  const newCust = input.newCustomersPerMonth ?? 0;
  const startCust = input.startingCustomers ?? 0;
  const fixed = input.fixedCostsMonthly;

  // Static break-even: subscribers needed at steady state
  const breakEvenPoint = arpu > 0 ? Math.ceil(fixed / arpu) : Infinity;

  let customers = startCust;
  const trajectory = buildTrajectory(TRAJECTORY_MONTHS, (_month) => {
    // Churn existing, add new
    customers = Math.max(0, customers * (1 - churn / 100) + newCust);
    const revenue = customers * arpu;
    return { revenue, variableCosts: 0 };
  }, fixed);

  return {
    revenueModel: 'subscription',
    breakEvenPoint: isFinite(breakEvenPoint) ? breakEvenPoint : -1,
    breakEvenUnit: 'subscribers',
    breakEvenMonth: findBreakEvenMonth(trajectory),
    trajectory,
  };
}

/**
 * Services break-even: consulting / professional services.
 */
function computeServicesBreakEven(input: BreakEvenInput): BreakEvenResult {
  const rate = input.hourlyRate ?? 0;
  const vcHour = input.variableCostPerHour ?? 0;
  const hours = input.billableHoursPerMonth ?? 0;
  const fixed = input.fixedCostsMonthly;

  const contribution = rate - vcHour;
  const breakEvenPoint = contribution > 0 ? Math.ceil(fixed / contribution) : Infinity;

  const trajectory = buildTrajectory(TRAJECTORY_MONTHS, () => {
    const revenue = hours * rate;
    const variableCosts = hours * vcHour;
    return { revenue, variableCosts };
  }, fixed);

  return {
    revenueModel: 'services',
    breakEvenPoint: isFinite(breakEvenPoint) ? breakEvenPoint : -1,
    breakEvenUnit: 'hours/month',
    breakEvenMonth: findBreakEvenMonth(trajectory),
    trajectory,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTrajectory(
  months: number,
  compute: (month: number) => { revenue: number; variableCosts: number },
  fixedMonthlyCosts: number,
): BreakEvenResult['trajectory'] {
  const trajectory: BreakEvenResult['trajectory'] = [];
  let cumulative = 0;

  for (let m = 0; m < months; m++) {
    const { revenue, variableCosts } = compute(m);
    const totalCosts = fixedMonthlyCosts + variableCosts;
    const profit = revenue - totalCosts;
    cumulative += profit;

    trajectory.push({
      month: m + 1,
      revenue: Math.round(revenue * 100) / 100,
      totalCosts: Math.round(totalCosts * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      cumulativeProfit: Math.round(cumulative * 100) / 100,
    });
  }

  return trajectory;
}

function findBreakEvenMonth(
  trajectory: BreakEvenResult['trajectory'],
): number {
  for (const point of trajectory) {
    if (point.cumulativeProfit >= 0) return point.month;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function calculateBreakEven(input: BreakEvenInput): BreakEvenResult {
  switch (input.revenueModel) {
    case 'unit':
      return computeUnitBreakEven(input);
    case 'subscription':
      return computeSubscriptionBreakEven(input);
    case 'services':
      return computeServicesBreakEven(input);
  }
}
