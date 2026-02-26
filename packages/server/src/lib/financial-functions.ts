/**
 * Financial Functions Module — Excel-compatible TVM and depreciation functions.
 *
 * Sign convention: follows Excel (positive = inflows, negative = outflows).
 * All functions return `number | null` — null indicates invalid input or no solution.
 *
 * Functions: PMT, PV, FV, NPV, IRR, XIRR, NPER, SLN, DB
 */

export type FinancialResult = number | null;

// ── Input Guards ────────────────────────────────────────

function isValid(...values: number[]): boolean {
  return values.every((v) => typeof v === 'number' && isFinite(v));
}

// ── Time Value of Money ─────────────────────────────────

/**
 * PMT — periodic payment for a loan with constant payments and interest rate.
 * Excel: =PMT(rate, nper, pv, [fv], [type])
 *
 * @param rate  Interest rate per period
 * @param nper  Total number of payment periods
 * @param pv    Present value (loan principal)
 * @param fv    Future value (default 0)
 * @param type  0 = end of period, 1 = beginning of period (default 0)
 */
export function PMT(rate: number, nper: number, pv: number, fv = 0, type = 0): FinancialResult {
  if (!isValid(rate, nper, pv, fv, type)) return null;
  if (nper === 0) return null;

  if (rate === 0) {
    return -(pv + fv) / nper;
  }

  const pvif = Math.pow(1 + rate, nper);
  const pmt = -(rate * (pv * pvif + fv)) / ((pvif - 1) * (1 + rate * type));
  return isFinite(pmt) ? pmt : null;
}

/**
 * PV — present value of a series of future payments.
 * Excel: =PV(rate, nper, pmt, [fv], [type])
 */
export function PV(rate: number, nper: number, pmt: number, fv = 0, type = 0): FinancialResult {
  if (!isValid(rate, nper, pmt, fv, type)) return null;

  if (rate === 0) {
    return -(pmt * nper + fv);
  }

  const pvif = Math.pow(1 + rate, nper);
  const result = -(fv + pmt * (1 + rate * type) * ((pvif - 1) / rate)) / pvif;
  return isFinite(result) ? result : null;
}

/**
 * FV — future value of a series of payments at a constant interest rate.
 * Excel: =FV(rate, nper, pmt, [pv], [type])
 */
export function FV(rate: number, nper: number, pmt: number, pv = 0, type = 0): FinancialResult {
  if (!isValid(rate, nper, pmt, pv, type)) return null;

  if (rate === 0) {
    return -(pv + pmt * nper);
  }

  const pvif = Math.pow(1 + rate, nper);
  const result = -(pv * pvif + pmt * (1 + rate * type) * ((pvif - 1) / rate));
  return isFinite(result) ? result : null;
}

/**
 * NPV — net present value of a series of cash flows.
 * Excel: =NPV(rate, value1, value2, ...) — discounts from period 1, not period 0.
 * Note: initial investment at period 0 must be added separately.
 */
export function NPV(rate: number, cashflows: readonly number[]): FinancialResult {
  if (!isValid(rate)) return null;
  if (cashflows.length === 0) return null;
  if (!cashflows.every((cf) => isValid(cf))) return null;

  let npv = 0;
  for (let i = 0; i < cashflows.length; i++) {
    npv += cashflows[i] / Math.pow(1 + rate, i + 1);
  }
  return isFinite(npv) ? npv : null;
}

/**
 * NPER — number of periods for an investment.
 * Excel: =NPER(rate, pmt, pv, [fv], [type])
 */
export function NPER(rate: number, pmt: number, pv: number, fv = 0, type = 0): FinancialResult {
  if (!isValid(rate, pmt, pv, fv, type)) return null;

  if (rate === 0) {
    if (pmt === 0) return null;
    return -(pv + fv) / pmt;
  }

  const z = pmt * (1 + rate * type) / rate;
  const numerator = Math.log((-fv + z) / (pv + z));
  const denominator = Math.log(1 + rate);

  if (!isFinite(numerator) || !isFinite(denominator) || denominator === 0) return null;

  const result = numerator / denominator;
  return isFinite(result) ? result : null;
}

// ── Internal Rate of Return ─────────────────────────────

/**
 * IRR — internal rate of return for a series of periodic cash flows.
 * Uses Newton-Raphson with bisection fallback.
 * Excel: =IRR(values, [guess])
 */
export function IRR(cashflows: readonly number[], guess = 0.1): FinancialResult {
  if (cashflows.length < 2) return null;
  if (!cashflows.every((cf) => isValid(cf))) return null;

  // Must have both positive and negative cash flows
  const hasPositive = cashflows.some((cf) => cf > 0);
  const hasNegative = cashflows.some((cf) => cf < 0);
  if (!hasPositive || !hasNegative) return null;

  // Newton-Raphson (100 iterations, 1e-7 tolerance)
  let rate = guess;
  for (let i = 0; i < 100; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let j = 0; j < cashflows.length; j++) {
      const power = Math.pow(1 + rate, j);
      if (power === 0) return null;
      npv += cashflows[j] / power;
      if (j > 0) {
        dnpv -= (j * cashflows[j]) / Math.pow(1 + rate, j + 1);
      }
    }
    if (Math.abs(npv) < 1e-7) return rate;
    if (Math.abs(dnpv) < 1e-14) break; // Flat spot — fall through to bisection
    const newRate = rate - npv / dnpv;
    if (!isFinite(newRate)) break;
    if (Math.abs(newRate - rate) <= 1e-7) return newRate;
    rate = newRate;
  }

  // Bisection fallback between -0.999 and 10.0
  return bisectionIRR(cashflows, -0.999, 10.0);
}

function bisectionIRR(
  cashflows: readonly number[],
  lo: number,
  hi: number,
): FinancialResult {
  const npvAt = (r: number): number => {
    let npv = 0;
    for (let j = 0; j < cashflows.length; j++) {
      npv += cashflows[j] / Math.pow(1 + r, j);
    }
    return npv;
  };

  let loNpv = npvAt(lo);
  let hiNpv = npvAt(hi);

  // Need opposite signs at boundaries
  if (loNpv * hiNpv > 0) return null;

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const midNpv = npvAt(mid);

    if (Math.abs(midNpv) < 1e-7 || (hi - lo) < 1e-10) {
      return mid;
    }

    if (midNpv * loNpv < 0) {
      hi = mid;
      hiNpv = midNpv;
    } else {
      lo = mid;
      loNpv = midNpv;
    }
  }
  return null;
}

/**
 * XIRR — IRR for a schedule of cash flows with irregular dates.
 * Excel: =XIRR(values, dates, [guess])
 *
 * @param cashflows Cash flow values
 * @param dates     Corresponding dates (Date objects or ISO strings)
 * @param guess     Initial guess (default 0.1)
 */
export function XIRR(
  cashflows: readonly number[],
  dates: readonly (Date | string)[],
  guess = 0.1,
): FinancialResult {
  if (cashflows.length < 2) return null;
  if (cashflows.length !== dates.length) return null;
  if (!cashflows.every((cf) => isValid(cf))) return null;

  const hasPositive = cashflows.some((cf) => cf > 0);
  const hasNegative = cashflows.some((cf) => cf < 0);
  if (!hasPositive || !hasNegative) return null;

  // Convert dates to numeric day offsets from the first date
  const parsedDates = dates.map((d) => (d instanceof Date ? d : new Date(d)).getTime());
  if (parsedDates.some((d) => isNaN(d))) return null;

  const baseTime = Math.min(...parsedDates);
  const dayOffsets = parsedDates.map((d) => (d - baseTime) / (365.25 * 24 * 60 * 60 * 1000));

  // Newton-Raphson
  let rate = guess;
  for (let i = 0; i < 100; i++) {
    let f = 0;
    let df = 0;
    for (let j = 0; j < cashflows.length; j++) {
      const t = dayOffsets[j];
      const power = Math.pow(1 + rate, t);
      if (power === 0 || !isFinite(power)) return null;
      f += cashflows[j] / power;
      df -= (t * cashflows[j]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(f) < 1e-7) return rate;
    if (Math.abs(df) < 1e-14) break;
    const newRate = rate - f / df;
    if (!isFinite(newRate)) break;
    if (Math.abs(newRate - rate) <= 1e-7) return newRate;
    rate = newRate;
  }

  // Bisection fallback
  return bisectionXIRR(cashflows, dayOffsets, -0.999, 10.0);
}

function bisectionXIRR(
  cashflows: readonly number[],
  dayOffsets: number[],
  lo: number,
  hi: number,
): FinancialResult {
  const npvAt = (r: number): number => {
    let npv = 0;
    for (let j = 0; j < cashflows.length; j++) {
      npv += cashflows[j] / Math.pow(1 + r, dayOffsets[j]);
    }
    return npv;
  };

  let loNpv = npvAt(lo);

  if (loNpv * npvAt(hi) > 0) return null;

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const midNpv = npvAt(mid);

    if (Math.abs(midNpv) < 1e-7 || (hi - lo) < 1e-10) {
      return mid;
    }

    if (midNpv * loNpv < 0) {
      hi = mid;
    } else {
      lo = mid;
      loNpv = midNpv;
    }
  }
  return null;
}

// ── Depreciation ────────────────────────────────────────

/**
 * SLN — straight-line depreciation per period.
 * Excel: =SLN(cost, salvage, life)
 */
export function SLN(cost: number, salvage: number, life: number): FinancialResult {
  if (!isValid(cost, salvage, life)) return null;
  if (life === 0) return null;

  const result = (cost - salvage) / life;
  return isFinite(result) ? result : null;
}

/**
 * DB — declining balance depreciation for a specific period.
 * Excel: =DB(cost, salvage, life, period, [month])
 *
 * Excel rounds the depreciation rate to 3 decimal places.
 */
export function DB(
  cost: number,
  salvage: number,
  life: number,
  period: number,
  month = 12,
): FinancialResult {
  if (!isValid(cost, salvage, life, period, month)) return null;
  if (life <= 0 || period <= 0 || period > life + 1 || cost <= 0) return null;
  if (month < 1 || month > 12) return null;

  // Excel rounds rate to 3 decimal places
  const rawRate = 1 - Math.pow(salvage / cost, 1 / life);
  const rate = Math.round(rawRate * 1000) / 1000;

  let totalDepreciation = 0;

  // First period: partial year
  if (period === 1) {
    const result = cost * rate * month / 12;
    return isFinite(result) ? result : null;
  }

  // Accumulate depreciation for prior periods
  totalDepreciation = cost * rate * month / 12; // Period 1
  for (let p = 2; p < period; p++) {
    totalDepreciation += (cost - totalDepreciation) * rate;
  }

  // Last period if it's the extra partial period
  if (period === life + 1 && month < 12) {
    const result = (cost - totalDepreciation) * rate * (12 - month) / 12;
    return isFinite(result) ? result : null;
  }

  const result = (cost - totalDepreciation) * rate;
  return isFinite(result) ? result : null;
}
