/**
 * Financial Calculator Service
 *
 * Takes a scenario's assumptions and a template's line items, and produces
 * computed 3-statement financial output (P&L, Balance Sheet, Cash Flow).
 *
 * Evaluation order follows the plan:
 *   P&L first → Balance Sheet working capital → Cash Flow →
 *   close with ending cash back to BS.
 *
 * Period structure:
 *   Year 1: 12 monthly periods
 *   Year 2: 4 quarterly periods
 *   Years 3-N: annual periods
 */

import { evaluateFormula } from '../lib/formula-engine';
import type {
  StatementData,
  ComputedStatements,
  TemplateLineItem,
  TemplateDefinition,
} from '@forge/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssumptionMap {
  [key: string]: number;
}

interface LineResult {
  key: string;
  name: string;
  values: number[];
  isSubtotal?: boolean;
  isTotal?: boolean;
}

// ---------------------------------------------------------------------------
// Period generation
// ---------------------------------------------------------------------------

function generatePeriodLabels(forecastYears: number): string[] {
  const labels: string[] = [];

  // Year 1: 12 monthly periods
  for (let m = 1; m <= 12; m++) {
    labels.push(`Y1-M${m}`);
  }

  // Year 2: 4 quarterly periods
  if (forecastYears >= 2) {
    for (let q = 1; q <= 4; q++) {
      labels.push(`Y2-Q${q}`);
    }
  }

  // Years 3+: annual periods
  for (let y = 3; y <= forecastYears; y++) {
    labels.push(`Y${y}`);
  }

  return labels;
}

/**
 * Returns the number of months each period represents.
 * Used to scale monthly assumptions to the correct period length.
 */
function periodMonths(forecastYears: number): number[] {
  const months: number[] = [];

  // Year 1: 12 monthly (1 month each)
  for (let i = 0; i < 12; i++) months.push(1);

  // Year 2: 4 quarterly (3 months each)
  if (forecastYears >= 2) {
    for (let i = 0; i < 4; i++) months.push(3);
  }

  // Years 3+: annual (12 months each)
  for (let y = 3; y <= forecastYears; y++) {
    months.push(12);
  }

  return months;
}

/**
 * Returns the cumulative month index for each period (0-based).
 * Used for growth calculations.
 */
function periodStartMonths(forecastYears: number): number[] {
  const starts: number[] = [];

  // Year 1: months 0-11
  for (let m = 0; m < 12; m++) starts.push(m);

  // Year 2: months 12, 15, 18, 21
  if (forecastYears >= 2) {
    for (let q = 0; q < 4; q++) starts.push(12 + q * 3);
  }

  // Years 3+: months 24, 36, ...
  for (let y = 3; y <= forecastYears; y++) {
    starts.push((y - 1) * 12);
  }

  return starts;
}

// ---------------------------------------------------------------------------
// Line item evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate all line items for a statement across all periods.
 */
function evaluateStatement(
  lineItems: TemplateLineItem[],
  assumptionValues: AssumptionMap,
  periods: number,
  monthsPerPeriod: number[],
  startMonths: number[],
): LineResult[] {
  const results: LineResult[] = [];
  const lineValues: Record<string, number[]> = {};

  for (const line of lineItems) {
    const values: number[] = [];

    for (let p = 0; p < periods; p++) {
      if (!line.formula) {
        // Lines without formulas are computed externally (e.g., cash, retained earnings)
        values.push(0);
        continue;
      }

      // Build scope: assumptions + previously computed lines for this period
      const scope: Record<string, number> = {
        ...assumptionValues,
        _period: p,
        _month: startMonths[p],
        _months_in_period: monthsPerPeriod[p],
      };

      // Add previously computed line values for this period
      for (const [key, vals] of Object.entries(lineValues)) {
        scope[key] = vals[p];
      }

      const value = evaluateFormula(line.formula, scope) ?? 0;
      values.push(value);
    }

    lineValues[line.key] = values;
    results.push({
      key: line.key,
      name: line.name,
      values,
      isSubtotal: line.isSubtotal,
      isTotal: line.isTotal,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Statement linking (inter-statement flows)
// ---------------------------------------------------------------------------

/**
 * Compute Balance Sheet working capital changes for Cash Flow statement.
 * Returns period-over-period deltas for AR, AP, inventory, deferred revenue.
 */
function computeWorkingCapitalChanges(
  bsResults: LineResult[],
): Record<string, number[]> {
  const changes: Record<string, number[]> = {};

  // Explicit mapping from BS key to CF change key
  const wcKeyMap: Record<string, string> = {
    accounts_receivable: 'change_ar',
    accounts_payable: 'change_ap',
    inventory: 'change_inventory',
    deferred_revenue: 'change_deferred_rev',
  };

  for (const [bsKey, cfKey] of Object.entries(wcKeyMap)) {
    const line = bsResults.find((l) => l.key === bsKey);
    if (!line) continue;

    const deltas: number[] = [];
    for (let p = 0; p < line.values.length; p++) {
      deltas.push(p === 0 ? line.values[p] : line.values[p] - line.values[p - 1]);
    }
    changes[cfKey] = deltas;
  }

  return changes;
}

/**
 * Compute ending cash balance: starting cash + cumulative net cash changes.
 */
function computeEndingCash(
  cfResults: LineResult[],
  startingCash: number,
): number[] {
  const netChange = cfResults.find((l) => l.key === 'net_cash_change');
  if (!netChange) return [];

  const ending: number[] = [];
  let balance = startingCash;
  for (const delta of netChange.values) {
    balance += delta;
    ending.push(balance);
  }
  return ending;
}

/**
 * Compute cumulative retained earnings from net income.
 */
function computeRetainedEarnings(
  plResults: LineResult[],
  startingRetainedEarnings: number,
): number[] {
  const netIncome = plResults.find((l) => l.key === 'net_income');
  if (!netIncome) return [];

  const retained: number[] = [];
  let cumulative = startingRetainedEarnings;
  for (const ni of netIncome.values) {
    cumulative += ni;
    retained.push(cumulative);
  }
  return retained;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate a full 3-statement model from assumptions and template line items.
 */
export function calculateStatements(
  assumptionValues: AssumptionMap,
  template: TemplateDefinition,
  forecastYears: number = 5,
): ComputedStatements {
  const periods = generatePeriodLabels(forecastYears);
  const numPeriods = periods.length;
  const months = periodMonths(forecastYears);
  const startMonths = periodStartMonths(forecastYears);

  // 1. Evaluate P&L
  const plResults = evaluateStatement(
    template.lineItems.pl,
    assumptionValues,
    numPeriods,
    months,
    startMonths,
  );

  // 2. Evaluate Balance Sheet
  const bsResults = evaluateStatement(
    template.lineItems.bs,
    assumptionValues,
    numPeriods,
    months,
    startMonths,
  );

  // 3. Link: Retained earnings from P&L net income
  const retainedEarnings = computeRetainedEarnings(plResults, 0);
  const reLine = bsResults.find((l) => l.key === 'retained_earnings');
  if (reLine) reLine.values = [...retainedEarnings];

  // Note: BS totals recomputed after cash injection below (step 6)

  // 4. Compute working capital changes for CF
  const wcChanges = computeWorkingCapitalChanges(bsResults);

  // 5. Evaluate Cash Flow (inject WC changes and P&L links)
  const cfScope: AssumptionMap = { ...assumptionValues };
  const plMap: Record<string, number[]> = {};
  for (const line of plResults) {
    plMap[line.key] = line.values;
  }

  const cfResults: LineResult[] = [];
  const cfLineValues: Record<string, number[]> = {};

  for (const line of template.lineItems.cf) {
    const values: number[] = [];

    for (let p = 0; p < numPeriods; p++) {
      const scope: Record<string, number> = {
        ...cfScope,
        _period: p,
        _month: startMonths[p],
        _months_in_period: months[p],
      };

      // Add P&L results to scope
      for (const [key, vals] of Object.entries(plMap)) {
        scope[key] = vals[p];
      }

      // Add working capital changes
      for (const [key, vals] of Object.entries(wcChanges)) {
        scope[key] = vals[p];
      }

      // Add previously computed CF lines
      for (const [key, vals] of Object.entries(cfLineValues)) {
        scope[key] = vals[p];
      }

      if (!line.formula) {
        // Check if it's a working capital change line
        const wcVal = wcChanges[line.key];
        if (wcVal) {
          values.push(wcVal[p]);
        } else {
          values.push(0);
        }
      } else {
        values.push(evaluateFormula(line.formula, scope) ?? 0);
      }
    }

    cfLineValues[line.key] = values;
    cfResults.push({
      key: line.key,
      name: line.name,
      values,
      isSubtotal: line.isSubtotal,
      isTotal: line.isTotal,
    });
  }

  // 6. Close: Ending cash back to BS
  const startingCash = assumptionValues.starting_cash ?? 0;
  const endingCash = computeEndingCash(cfResults, startingCash);
  const endingCashLine = cfResults.find((l) => l.key === 'ending_cash');
  if (endingCashLine) endingCashLine.values = [...endingCash];

  const bsCashLine = bsResults.find((l) => l.key === 'cash');
  if (bsCashLine) bsCashLine.values = [...endingCash];

  // 7. Recompute all BS totals with updated cash and retained earnings
  const equityLine = bsResults.find((l) => l.key === 'total_equity');
  if (equityLine && reLine) {
    equityLine.values = [...reLine.values];
  }

  const totalCurrentAssets = bsResults.find((l) => l.key === 'total_current_assets');
  if (totalCurrentAssets && bsCashLine) {
    const arLine = bsResults.find((l) => l.key === 'accounts_receivable');
    const invLine = bsResults.find((l) => l.key === 'inventory');
    totalCurrentAssets.values = bsCashLine.values.map((v, i) =>
      v + (arLine?.values[i] ?? 0) + (invLine?.values[i] ?? 0),
    );
  }
  const totalAssets = bsResults.find((l) => l.key === 'total_assets');
  const fixedAssets = bsResults.find((l) => l.key === 'fixed_assets');
  if (totalAssets && totalCurrentAssets) {
    totalAssets.values = totalCurrentAssets.values.map((v, i) => v + (fixedAssets?.values[i] ?? 0));
  }

  const totalLiabLine = bsResults.find((l) => l.key === 'total_liabilities');
  const totalLELine = bsResults.find((l) => l.key === 'total_liabilities_equity');
  if (totalLELine && totalLiabLine && equityLine) {
    totalLELine.values = totalLiabLine.values.map((v, i) => v + (equityLine.values[i] ?? 0));
  }

  // Build output
  const pl: StatementData = {
    type: 'PL',
    lines: plResults,
    periods,
  };

  const bs: StatementData = {
    type: 'BS',
    lines: bsResults,
    periods,
  };

  const cf: StatementData = {
    type: 'CF',
    lines: cfResults,
    periods,
  };

  return { pl, bs, cf };
}

/**
 * Convert database assumption rows to a flat numeric map for calculation.
 */
export function assumptionsToMap(
  rows: Array<{ key: string; value: string | null; numericValue: string | null }>,
): AssumptionMap {
  const map: AssumptionMap = {};
  for (const row of rows) {
    const num = row.numericValue != null
      ? parseFloat(row.numericValue)
      : row.value != null
        ? parseFloat(row.value)
        : NaN;
    if (!isNaN(num)) {
      map[row.key] = num;
    }
  }
  return map;
}
