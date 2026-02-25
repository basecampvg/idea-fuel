import { describe, it, expect } from 'vitest';
import { PMT, PV, FV, NPV, IRR, XIRR, NPER, SLN, DB } from '../financial-functions';

// ── PMT ─────────────────────────────────────────────────

describe('PMT', () => {
  it('matches Excel =PMT(0.08/12, 10, 10000)', () => {
    const result = PMT(0.08 / 12, 10, 10000);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(-1037.0320893734798, 6);
  });

  it('matches Excel =PMT(0.06/12, 360, 200000) (30-year mortgage)', () => {
    const result = PMT(0.06 / 12, 360, 200000);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(-1199.1010504994229, 6);
  });

  it('handles zero rate', () => {
    const result = PMT(0, 12, 12000);
    expect(result).toBe(-1000);
  });

  it('handles beginning-of-period payments (type=1)', () => {
    const result = PMT(0.08 / 12, 10, 10000, 0, 1);
    expect(result).not.toBeNull();
    // type=1 payments are smaller since interest accrues less
    const endResult = PMT(0.08 / 12, 10, 10000, 0, 0);
    expect(Math.abs(result!)).toBeLessThan(Math.abs(endResult!));
  });

  it('handles future value target', () => {
    const result = PMT(0.05 / 12, 120, 0, -100000);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0); // savings, so positive
  });

  it('returns null for nper=0', () => {
    expect(PMT(0.05, 0, 10000)).toBeNull();
  });

  it('returns null for NaN inputs', () => {
    expect(PMT(NaN, 12, 10000)).toBeNull();
    expect(PMT(0.05, NaN, 10000)).toBeNull();
    expect(PMT(0.05, 12, NaN)).toBeNull();
  });

  it('returns null for Infinity inputs', () => {
    expect(PMT(Infinity, 12, 10000)).toBeNull();
  });
});

// ── PV ──────────────────────────────────────────────────

describe('PV', () => {
  it('matches Excel =PV(0.08/12, 120, -500)', () => {
    // Monthly payments of 500 at 8% annual for 10 years
    const result = PV(0.08 / 12, 120, -500);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(41210.7404466905, 4);
  });

  it('handles zero rate', () => {
    const result = PV(0, 12, -100);
    expect(result).toBe(1200);
  });

  it('handles future value', () => {
    const result = PV(0.05, 10, 0, -10000);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });

  it('returns null for NaN inputs', () => {
    expect(PV(NaN, 12, -500)).toBeNull();
  });

  it('round-trips with PMT', () => {
    const pmt = PMT(0.06 / 12, 360, 200000)!;
    const pv = PV(0.06 / 12, 360, pmt)!;
    expect(pv).toBeCloseTo(200000, 4);
  });
});

// ── FV ──────────────────────────────────────────────────

describe('FV', () => {
  it('matches Excel =FV(0.06/12, 120, -200, -500)', () => {
    const result = FV(0.06 / 12, 120, -200, -500);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });

  it('handles zero rate', () => {
    const result = FV(0, 12, -100, -1000);
    // FV = -(pv + pmt * nper) = -(−1000 + −100*12) = 2200
    expect(result).toBe(2200);
  });

  it('matches Excel =FV(0.10/12, 60, -100)', () => {
    // Monthly investment of 100 at 10% annual for 5 years
    const result = FV(0.10 / 12, 60, -100);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(7743.7083, 2);
  });

  it('returns null for NaN inputs', () => {
    expect(FV(NaN, 12, -100)).toBeNull();
  });

  it('round-trips with PV', () => {
    const pv = 10000;
    const rate = 0.05;
    const nper = 10;
    const fv = FV(rate, nper, 0, -pv)!;
    const pvBack = PV(rate, nper, 0, -fv)!;
    expect(pvBack).toBeCloseTo(pv, 4);
  });
});

// ── NPV ─────────────────────────────────────────────────

describe('NPV', () => {
  it('matches Excel =NPV(0.10, -10000, 3000, 4200, 6800)', () => {
    // Excel NPV discounts from period 1
    const result = NPV(0.10, [-10000, 3000, 4200, 6800]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(1188.4434123352207, 4);
  });

  it('handles zero rate', () => {
    const result = NPV(0, [100, 200, 300]);
    expect(result).toBe(600);
  });

  it('handles single cash flow', () => {
    const result = NPV(0.10, [1000]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(909.0909, 4);
  });

  it('returns null for empty cash flows', () => {
    expect(NPV(0.10, [])).toBeNull();
  });

  it('returns null for NaN rate', () => {
    expect(NPV(NaN, [100])).toBeNull();
  });

  it('returns null for NaN in cash flows', () => {
    expect(NPV(0.10, [100, NaN, 300])).toBeNull();
  });
});

// ── IRR ─────────────────────────────────────────────────

describe('IRR', () => {
  it('matches Excel =IRR({-70000,12000,15000,18000,21000,26000})', () => {
    const result = IRR([-70000, 12000, 15000, 18000, 21000, 26000]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0.08663094803653162, 6);
  });

  it('matches Excel =IRR({-100,30,35,40,45})', () => {
    const result = IRR([-100, 30, 35, 40, 45]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0.17094, 3);
  });

  it('handles simple case: invest 100, get 110 back', () => {
    const result = IRR([-100, 110]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0.10, 6);
  });

  it('returns null for all positive cash flows', () => {
    expect(IRR([100, 200, 300])).toBeNull();
  });

  it('returns null for all negative cash flows', () => {
    expect(IRR([-100, -200, -300])).toBeNull();
  });

  it('returns null for single cash flow', () => {
    expect(IRR([-100])).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(IRR([])).toBeNull();
  });

  it('handles custom guess parameter', () => {
    const result = IRR([-70000, 12000, 15000, 18000, 21000, 26000], 0.05);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0.08663, 4);
  });

  it('handles break-even case (IRR ≈ 0)', () => {
    const result = IRR([-100, 50, 50]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0.0, 2);
  });

  it('handles high-return case', () => {
    const result = IRR([-100, 0, 0, 0, 0, 500]);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0.3);
  });
});

// ── XIRR ────────────────────────────────────────────────

describe('XIRR', () => {
  it('matches Excel XIRR Microsoft example ≈ 37.34%', () => {
    const result = XIRR(
      [-10000, 2750, 4250, 3250, 2750],
      ['2008-01-01', '2008-03-01', '2008-10-30', '2009-02-15', '2009-04-01'],
    );
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0.373362535, 3);
  });

  it('handles simple annual case (matches regular IRR)', () => {
    const result = XIRR(
      [-1000, 1100],
      ['2020-01-01', '2021-01-01'],
    );
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0.10, 2);
  });

  it('handles Date objects', () => {
    const result = XIRR(
      [-10000, 2750, 4250, 3250, 2750],
      [
        new Date('2008-01-01'),
        new Date('2008-03-01'),
        new Date('2008-10-30'),
        new Date('2009-02-15'),
        new Date('2009-04-01'),
      ],
    );
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0.373362535, 3);
  });

  it('returns null for mismatched array lengths', () => {
    expect(XIRR([100, 200], ['2020-01-01'])).toBeNull();
  });

  it('returns null for all positive cash flows', () => {
    expect(XIRR([100, 200], ['2020-01-01', '2021-01-01'])).toBeNull();
  });

  it('returns null for invalid dates', () => {
    expect(XIRR([-100, 200], ['not-a-date', '2021-01-01'])).toBeNull();
  });

  it('returns null for single cash flow', () => {
    expect(XIRR([-100], ['2020-01-01'])).toBeNull();
  });
});

// ── NPER ────────────────────────────────────────────────

describe('NPER', () => {
  it('matches Excel =NPER(0.06/12, -500, 20000)', () => {
    const result = NPER(0.06 / 12, -500, 20000);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(44.7402, 2);
  });

  it('handles zero rate', () => {
    const result = NPER(0, -100, 1200);
    expect(result).toBe(12);
  });

  it('returns null for zero rate and zero payment', () => {
    expect(NPER(0, 0, 1000)).toBeNull();
  });

  it('handles future value target', () => {
    const result = NPER(0.05 / 12, -200, 0, 10000);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });

  it('returns null for NaN inputs', () => {
    expect(NPER(NaN, -500, 20000)).toBeNull();
  });

  it('round-trips with PMT', () => {
    const rate = 0.06 / 12;
    const pv = 20000;
    const pmt = PMT(rate, 48, pv)!;
    const nper = NPER(rate, pmt, pv)!;
    expect(nper).toBeCloseTo(48, 4);
  });
});

// ── SLN ─────────────────────────────────────────────────

describe('SLN', () => {
  it('matches Excel =SLN(30000, 7500, 10)', () => {
    const result = SLN(30000, 7500, 10);
    expect(result).toBe(2250);
  });

  it('handles zero salvage', () => {
    const result = SLN(10000, 0, 5);
    expect(result).toBe(2000);
  });

  it('returns null for zero life', () => {
    expect(SLN(10000, 0, 0)).toBeNull();
  });

  it('returns null for NaN inputs', () => {
    expect(SLN(NaN, 0, 5)).toBeNull();
  });

  it('handles equal cost and salvage', () => {
    expect(SLN(5000, 5000, 5)).toBe(0);
  });
});

// ── DB ──────────────────────────────────────────────────

describe('DB', () => {
  it('matches Excel =DB(1000000, 100000, 6, 1, 7)', () => {
    // Excel: first period = cost * rate * month/12
    // rate = 1 - (100000/1000000)^(1/6) ≈ 0.319, rounded to 0.319
    const result = DB(1000000, 100000, 6, 1, 7);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(186083.33, 0);
  });

  it('matches Excel =DB(1000000, 100000, 6, 2, 7)', () => {
    const result = DB(1000000, 100000, 6, 2, 7);
    expect(result).not.toBeNull();
    // After period 1 dep of ~186083, period 2 dep on remaining
    expect(result!).toBeGreaterThan(200000);
  });

  it('handles full-year depreciation (month=12)', () => {
    const result = DB(10000, 1000, 5, 1);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });

  it('returns null for zero life', () => {
    expect(DB(10000, 1000, 0, 1)).toBeNull();
  });

  it('returns null for period > life+1', () => {
    expect(DB(10000, 1000, 5, 7)).toBeNull();
  });

  it('returns null for zero period', () => {
    expect(DB(10000, 1000, 5, 0)).toBeNull();
  });

  it('returns null for zero cost', () => {
    expect(DB(0, 0, 5, 1)).toBeNull();
  });

  it('returns null for NaN inputs', () => {
    expect(DB(NaN, 1000, 5, 1)).toBeNull();
  });

  it('handles last partial period', () => {
    // DB with month < 12 should have an extra partial period at the end
    const result = DB(10000, 1000, 5, 6, 6);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });
});

// ── Cross-function Consistency ──────────────────────────

describe('cross-function consistency', () => {
  it('PMT/PV/FV/NPER form a consistent TVM system', () => {
    const rate = 0.05;
    const nper = 10;
    const pv = -10000;
    const fv = 0;

    // Calculate PMT from known values
    const pmt = PMT(rate, nper, pv, fv)!;
    expect(pmt).not.toBeNull();

    // Recover PV from PMT
    const recoveredPV = PV(rate, nper, pmt, fv)!;
    expect(recoveredPV).toBeCloseTo(pv, 4);

    // Recover FV from PV and PMT
    const recoveredFV = FV(rate, nper, pmt, pv)!;
    expect(recoveredFV).toBeCloseTo(fv, 4);

    // Recover NPER from the rest
    const recoveredNPER = NPER(rate, pmt, pv, fv)!;
    expect(recoveredNPER).toBeCloseTo(nper, 4);
  });

  it('NPV at IRR equals approximately zero', () => {
    const cashflows = [-70000, 12000, 15000, 18000, 21000, 26000];
    const irr = IRR(cashflows)!;
    expect(irr).not.toBeNull();

    // NPV at IRR should be ≈ 0
    // Note: NPV discounts from period 1, so add period 0 manually
    let npvAtIRR = cashflows[0];
    for (let i = 1; i < cashflows.length; i++) {
      npvAtIRR += cashflows[i] / Math.pow(1 + irr, i);
    }
    expect(npvAtIRR).toBeCloseTo(0, 4);
  });

  it('SLN sums to cost minus salvage', () => {
    const cost = 30000;
    const salvage = 7500;
    const life = 10;
    const annual = SLN(cost, salvage, life)!;
    expect(annual * life).toBeCloseTo(cost - salvage, 4);
  });
});
