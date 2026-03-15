/**
 * HyperFormula Custom Plugins
 *
 * 1. BlockedFunctionsPlugin: Disables dangerous functions (INDIRECT, OFFSET, etc.)
 * 2. XirrPlugin: Implements XIRR (not built into HyperFormula)
 */

import {
  FunctionPlugin,
  FunctionArgumentType,
  CellError,
  ErrorType,
} from 'hyperformula';

// ---------------------------------------------------------------------------
// Blocked Functions Plugin — prevents formula injection
// ---------------------------------------------------------------------------

/**
 * List of dangerous built-in functions to unregister.
 * These are unregistered at plugin setup time rather than overridden,
 * since HyperFormula doesn't allow re-registering already-registered function IDs.
 */
export const BLOCKED_FUNCTION_IDS = ['INDIRECT', 'OFFSET', 'HYPERLINK'] as const;

/**
 * WEBSERVICE is not a built-in HyperFormula function, so we register it
 * as a custom function that always errors. This prevents user formulas
 * from silently succeeding if HyperFormula adds it in a future version.
 */
export class WebserviceBlockPlugin extends FunctionPlugin {
  static implementedFunctions = {
    'WEBSERVICE': {
      method: 'blockedFunction',
      parameters: [{ argumentType: FunctionArgumentType.STRING }],
    },
  };

  blockedFunction(): CellError {
    return new CellError(ErrorType.NAME, 'This function is disabled for security');
  }
}

export const webserviceBlockTranslations = {
  enGB: { WEBSERVICE: 'WEBSERVICE' },
  enUS: { WEBSERVICE: 'WEBSERVICE' },
};

// ---------------------------------------------------------------------------
// XIRR Plugin — Newton-Raphson solver for irregular cash flows
// ---------------------------------------------------------------------------

export class XirrPlugin extends FunctionPlugin {
  static implementedFunctions = {
    'XIRR': {
      method: 'xirr',
      parameters: [
        { argumentType: FunctionArgumentType.RANGE },
        { argumentType: FunctionArgumentType.RANGE },
        { argumentType: FunctionArgumentType.NUMBER, defaultValue: 0.1 },
      ],
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  xirr(ast: any, state: any): any {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('XIRR'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cashFlowsRange: any, datesRange: any, guess: number) => {
        const cashFlows = extractRangeValues(cashFlowsRange);
        const dates = extractRangeValues(datesRange);

        if (!cashFlows || !dates) {
          return new CellError(ErrorType.VALUE, 'Invalid range');
        }
        if (cashFlows.length !== dates.length) {
          return new CellError(ErrorType.VALUE, 'Cash flows and dates must have same length');
        }
        if (cashFlows.length < 2) {
          return new CellError(ErrorType.NUM, 'Need at least 2 cash flows');
        }

        const hasPositive = cashFlows.some(v => v > 0);
        const hasNegative = cashFlows.some(v => v < 0);
        if (!hasPositive || !hasNegative) {
          return new CellError(ErrorType.NUM, 'Cash flows must include both positive and negative values');
        }

        const result = solveXirr(cashFlows, dates, guess);
        if (result === null) {
          return new CellError(ErrorType.NUM, 'XIRR did not converge');
        }
        return result;
      },
    );
  }
}

export const xirrTranslations = {
  enGB: { XIRR: 'XIRR' },
  enUS: { XIRR: 'XIRR' },
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function extractRangeValues(range: unknown): number[] | null {
  if (!range || typeof range !== 'object') return null;
  const data = (range as { data?: unknown[][] }).data;
  if (!Array.isArray(data)) return null;
  const flat: number[] = [];
  for (const row of data) {
    for (const val of row) {
      if (typeof val === 'number') {
        flat.push(val);
      } else {
        return null;
      }
    }
  }
  return flat;
}

function solveXirr(cashFlows: number[], dates: number[], guess: number): number | null {
  const DAYS_PER_YEAR = 365.25;
  const MAX_ITER = 100;
  const TOLERANCE = 1e-10;

  const d0 = dates[0];
  const yearFracs = dates.map(d => (d - d0) / DAYS_PER_YEAR);

  const xnpv = (rate: number): number => {
    let sum = 0;
    for (let i = 0; i < cashFlows.length; i++) {
      sum += cashFlows[i] / Math.pow(1 + rate, yearFracs[i]);
    }
    return sum;
  };

  const xnpvDeriv = (rate: number): number => {
    let sum = 0;
    for (let i = 0; i < cashFlows.length; i++) {
      sum -= yearFracs[i] * cashFlows[i] / Math.pow(1 + rate, yearFracs[i] + 1);
    }
    return sum;
  };

  // Newton-Raphson
  let rate = guess;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    const f = xnpv(rate);
    if (Math.abs(f) < TOLERANCE) return rate;
    const df = xnpvDeriv(rate);
    if (Math.abs(df) < 1e-14) break;
    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < TOLERANCE) return newRate;
    rate = newRate;
    if (rate < -0.999 || rate > 1e10) break;
  }

  // Bisection fallback
  let lo = -0.99;
  let hi = 10.0;
  const fLo = xnpv(lo);
  const fHi = xnpv(hi);
  if (fLo * fHi > 0) return null;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const mid = (lo + hi) / 2;
    const fMid = xnpv(mid);
    if (Math.abs(fMid) < TOLERANCE || (hi - lo) / 2 < TOLERANCE) return mid;
    if (fMid * fLo < 0) { hi = mid; } else { lo = mid; }
  }

  return null;
}
