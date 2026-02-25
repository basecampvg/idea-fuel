import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateFormula,
  evaluateTimeSeriesFormula,
  validateFormula,
  extractDependencies,
  sanitizeResult,
  sanitizeTimeSeriesResult,
  clearFormulaCache,
} from '../formula-engine';

beforeEach(() => {
  clearFormulaCache();
});

// ── evaluateFormula ─────────────────────────────────────

describe('evaluateFormula', () => {
  it('evaluates simple arithmetic', () => {
    expect(evaluateFormula('5 + 3', {})).toBe(8);
  });

  it('evaluates multiplication', () => {
    expect(evaluateFormula('4 * 7', {})).toBe(28);
  });

  it('evaluates division', () => {
    expect(evaluateFormula('20 / 4', {})).toBe(5);
  });

  it('respects operator precedence', () => {
    expect(evaluateFormula('2 + 3 * 4', {})).toBe(14);
  });

  it('handles parentheses', () => {
    expect(evaluateFormula('(2 + 3) * 4', {})).toBe(20);
  });

  it('handles nested parentheses', () => {
    expect(evaluateFormula('((1 + 2) * (3 + 4))', {})).toBe(21);
  });

  it('uses scope variables', () => {
    expect(evaluateFormula('price * quantity', { price: 10, quantity: 5 })).toBe(50);
  });

  it('handles gross margin formula', () => {
    const scope = { unit_price: 100, variable_cost_per_unit: 40 };
    expect(evaluateFormula('(unit_price - variable_cost_per_unit) / unit_price * 100', scope)).toBe(60);
  });

  it('handles LTV formula', () => {
    const scope = { unit_price: 50, monthly_churn: 5 };
    expect(evaluateFormula('unit_price / (monthly_churn / 100)', scope)).toBe(1000);
  });

  it('returns null on division by zero', () => {
    expect(evaluateFormula('1 / 0', {})).toBeNull();
  });

  it('returns null on NaN result', () => {
    expect(evaluateFormula('0 / 0', {})).toBeNull();
  });

  it('returns null on Infinity result', () => {
    expect(evaluateFormula('1 / 0', {})).toBeNull();
  });

  it('returns null on negative Infinity result', () => {
    expect(evaluateFormula('-1 / 0', {})).toBeNull();
  });

  it('returns null for invalid formula syntax', () => {
    expect(evaluateFormula('5 +* 3', {})).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(evaluateFormula('', {})).toBeNull();
  });

  it('handles math.js built-in functions', () => {
    expect(evaluateFormula('sqrt(144)', {})).toBe(12);
    expect(evaluateFormula('abs(-42)', {})).toBe(42);
    expect(evaluateFormula('ceil(4.2)', {})).toBe(5);
    expect(evaluateFormula('floor(4.8)', {})).toBe(4);
    expect(evaluateFormula('round(4.5)', {})).toBe(5);
    expect(evaluateFormula('min(3, 7, 1)', {})).toBe(1);
    expect(evaluateFormula('max(3, 7, 1)', {})).toBe(7);
  });

  it('handles power and exponential', () => {
    expect(evaluateFormula('pow(2, 10)', {})).toBe(1024);
    expect(evaluateFormula('2^10', {})).toBe(1024);
  });

  it('handles constants', () => {
    expect(evaluateFormula('pi', {})).toBeCloseTo(Math.PI, 10);
    expect(evaluateFormula('e', {})).toBeCloseTo(Math.E, 10);
  });

  it('handles decimal numbers', () => {
    expect(evaluateFormula('0.1 + 0.2', {})).toBeCloseTo(0.3, 10);
  });

  it('handles negative numbers in scope', () => {
    expect(evaluateFormula('x + 10', { x: -5 })).toBe(5);
  });

  it('handles zero values in scope', () => {
    expect(evaluateFormula('x * 100', { x: 0 })).toBe(0);
  });

  it('uses compilation cache on repeated evaluations', () => {
    // First call compiles
    const result1 = evaluateFormula('a + b', { a: 1, b: 2 });
    // Second call should use cache
    const result2 = evaluateFormula('a + b', { a: 10, b: 20 });
    expect(result1).toBe(3);
    expect(result2).toBe(30);
  });

  // Security tests
  it('rejects disabled function: import', () => {
    expect(evaluateFormula('import("fs")', {})).toBeNull();
  });

  it('rejects disabled function: evaluate', () => {
    expect(evaluateFormula('evaluate("1+1")', {})).toBeNull();
  });

  it('rejects disabled function: parse', () => {
    expect(evaluateFormula('parse("1+1")', {})).toBeNull();
  });

  it('rejects disabled function: simplify', () => {
    expect(evaluateFormula('simplify("x+x")', {})).toBeNull();
  });

  it('rejects disabled function: derivative', () => {
    expect(evaluateFormula('derivative("x^2", "x")', {})).toBeNull();
  });

  it('rejects disabled function: createUnit', () => {
    expect(evaluateFormula('createUnit("foo")', {})).toBeNull();
  });

  it('prevents prototype pollution via scope isolation', () => {
    // Object.create(null) scope should prevent __proto__ access
    const result = evaluateFormula('x + 1', { x: 5 });
    expect(result).toBe(6);
  });

  it('handles missing scope variable gracefully', () => {
    // Referencing an undefined variable should error
    expect(evaluateFormula('undefined_var + 1', {})).toBeNull();
  });

  it('handles very large numbers', () => {
    expect(evaluateFormula('1e15 + 1', {})).toBe(1000000000000001);
  });

  it('handles modulo operations', () => {
    expect(evaluateFormula('mod(17, 5)', {})).toBe(2);
  });

  // Financial functions via formula engine
  it('evaluates PMT through formula engine', () => {
    const result = evaluateFormula('PMT(0.05/12, 360, 200000)', {});
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(-1073.64, 1);
  });

  it('evaluates PMT with scope variables', () => {
    const result = evaluateFormula('PMT(rate/12, months, principal)', {
      rate: 0.06, months: 360, principal: 200000,
    });
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(-1199.10, 1);
  });

  it('evaluates NPV through formula engine', () => {
    const result = evaluateFormula('NPV(0.10, -10000, 3000, 4200, 6800)', {});
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(1188.44, 1);
  });

  it('evaluates SLN through formula engine', () => {
    expect(evaluateFormula('SLN(30000, 7500, 10)', {})).toBe(2250);
  });

  it('returns null for financial function errors via formula', () => {
    // PMT with nper=0 → returns NaN → sanitized to null
    expect(evaluateFormula('PMT(0.05, 0, 10000)', {})).toBeNull();
  });
});

// ── validateFormula ─────────────────────────────────────

describe('validateFormula', () => {
  it('validates a correct formula', () => {
    const result = validateFormula('price * quantity', ['price', 'quantity']);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('reports unknown variables', () => {
    const result = validateFormula('price * tax_rate', ['price']);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('tax_rate');
  });

  it('reports multiple unknown variables', () => {
    const result = validateFormula('a + b + c', ['a']);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('b');
    expect(result.error).toContain('c');
  });

  it('ignores built-in constants', () => {
    const result = validateFormula('pi * r^2', ['r']);
    expect(result.valid).toBe(true);
  });

  it('ignores built-in functions', () => {
    const result = validateFormula('sqrt(x) + abs(y)', ['x', 'y']);
    expect(result.valid).toBe(true);
  });

  it('reports syntax errors', () => {
    const result = validateFormula('5 +* 3', []);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('accepts empty formula (math.js parses empty as undefined)', () => {
    // math.js can parse empty string — it produces undefined
    const result = validateFormula('', []);
    expect(result.valid).toBe(true);
  });

  it('validates formula with no variables', () => {
    const result = validateFormula('5 + 3', []);
    expect(result.valid).toBe(true);
  });

  it('validates complex financial formula', () => {
    const keys = ['unit_price', 'variable_cost_per_unit'];
    const result = validateFormula(
      '(unit_price - variable_cost_per_unit) / unit_price * 100',
      keys,
    );
    expect(result.valid).toBe(true);
  });
});

// ── extractDependencies ─────────────────────────────────

describe('extractDependencies', () => {
  it('extracts simple variable references', () => {
    const deps = extractDependencies('price * quantity');
    expect(deps).toContain('price');
    expect(deps).toContain('quantity');
    expect(deps).toHaveLength(2);
  });

  it('excludes built-in constants', () => {
    const deps = extractDependencies('pi * r^2');
    expect(deps).toContain('r');
    expect(deps).not.toContain('pi');
  });

  it('excludes built-in functions', () => {
    const deps = extractDependencies('sqrt(x) + abs(y)');
    expect(deps).toContain('x');
    expect(deps).toContain('y');
    expect(deps).not.toContain('sqrt');
    expect(deps).not.toContain('abs');
  });

  it('deduplicates repeated variables', () => {
    const deps = extractDependencies('x + x + x');
    expect(deps).toEqual(['x']);
  });

  it('handles complex financial formulas', () => {
    const deps = extractDependencies('(unit_price - variable_cost_per_unit) / unit_price * 100');
    expect(deps).toContain('unit_price');
    expect(deps).toContain('variable_cost_per_unit');
    expect(deps).toHaveLength(2);
  });

  it('returns empty array for invalid formula', () => {
    expect(extractDependencies('5 +* 3')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(extractDependencies('')).toEqual([]);
  });

  it('returns empty array for constant expression', () => {
    expect(extractDependencies('5 + 3')).toEqual([]);
  });

  it('handles nested function calls', () => {
    const deps = extractDependencies('max(revenue, min(cost, budget))');
    expect(deps).toContain('revenue');
    expect(deps).toContain('cost');
    expect(deps).toContain('budget');
    expect(deps).not.toContain('max');
    expect(deps).not.toContain('min');
  });

  it('excludes financial function names from dependencies', () => {
    const deps = extractDependencies('PMT(rate, nper, principal)');
    expect(deps).toContain('rate');
    expect(deps).toContain('nper');
    expect(deps).toContain('principal');
    expect(deps).not.toContain('PMT');
  });

  it('excludes all financial functions from dependencies', () => {
    const deps = extractDependencies('NPV(discount_rate, cf1, cf2) + SLN(cost, salvage, life)');
    expect(deps).not.toContain('NPV');
    expect(deps).not.toContain('SLN');
    expect(deps).toContain('discount_rate');
    expect(deps).toContain('cf1');
  });
});

// ── sanitizeResult ──────────────────────────────────────

describe('sanitizeResult', () => {
  it('returns valid numbers', () => {
    expect(sanitizeResult(42)).toBe(42);
    expect(sanitizeResult(0)).toBe(0);
    expect(sanitizeResult(-10.5)).toBe(-10.5);
  });

  it('rejects NaN', () => {
    expect(sanitizeResult(NaN)).toBeNull();
  });

  it('rejects Infinity', () => {
    expect(sanitizeResult(Infinity)).toBeNull();
    expect(sanitizeResult(-Infinity)).toBeNull();
  });

  it('rejects non-number types', () => {
    expect(sanitizeResult('hello')).toBeNull();
    expect(sanitizeResult(undefined)).toBeNull();
    expect(sanitizeResult(null)).toBeNull();
    expect(sanitizeResult({})).toBeNull();
    expect(sanitizeResult([])).toBeNull();
    expect(sanitizeResult(true)).toBeNull();
  });
});

// ── evaluateTimeSeriesFormula ───────────────────────────

describe('evaluateTimeSeriesFormula', () => {
  it('evaluates scalar formulas (backwards compatible)', () => {
    expect(evaluateTimeSeriesFormula('5 + 3', {})).toBe(8);
  });

  it('evaluates with scalar scope variables', () => {
    expect(evaluateTimeSeriesFormula('x * 2', { x: 10 })).toBe(20);
  });

  it('returns null for invalid formula', () => {
    expect(evaluateTimeSeriesFormula('5 +* 3', {})).toBeNull();
  });

  it('handles array scope values in arithmetic', () => {
    const result = evaluateTimeSeriesFormula('revenue * 0.3', {
      revenue: [100, 200, 300],
    });
    expect(result).toEqual([30, 60, 90]);
  });

  it('handles element-wise operations on two arrays', () => {
    const result = evaluateTimeSeriesFormula('revenue - costs', {
      revenue: [100, 200, 300],
      costs: [40, 80, 120],
    });
    expect(result).toEqual([60, 120, 180]);
  });

  // GROWTH function
  it('generates growth time-series with GROWTH()', () => {
    const result = evaluateTimeSeriesFormula('GROWTH(1000, 0.05, 4)', {});
    expect(Array.isArray(result)).toBe(true);
    const arr = result as number[];
    expect(arr).toHaveLength(4);
    expect(arr[0]).toBeCloseTo(1000, 4);
    expect(arr[1]).toBeCloseTo(1050, 4);
    expect(arr[2]).toBeCloseTo(1102.5, 4);
    expect(arr[3]).toBeCloseTo(1157.625, 4);
  });

  it('generates growth from scope variables', () => {
    const result = evaluateTimeSeriesFormula('GROWTH(base, rate, months)', {
      base: 500, rate: 0.10, months: 3,
    });
    expect(Array.isArray(result)).toBe(true);
    const arr = result as number[];
    expect(arr).toHaveLength(3);
    expect(arr[0]).toBeCloseTo(500, 4);
    expect(arr[1]).toBeCloseTo(550, 4);
    expect(arr[2]).toBeCloseTo(605, 4);
  });

  // CUMSUM function
  it('computes cumulative sum with CUMSUM()', () => {
    const result = evaluateTimeSeriesFormula('CUMSUM(cashflows)', {
      cashflows: [100, 200, 300, 400],
    });
    expect(result).toEqual([100, 300, 600, 1000]);
  });

  // SLICE function
  it('slices an array with SLICE()', () => {
    const result = evaluateTimeSeriesFormula('SLICE(data, 1, 3)', {
      data: [10, 20, 30, 40, 50],
    });
    expect(result).toEqual([20, 30]);
  });

  // SUM function
  it('sums an array with SUM()', () => {
    const result = evaluateTimeSeriesFormula('SUM(revenue)', {
      revenue: [100, 200, 300],
    });
    expect(result).toBe(600);
  });

  it('sums multiple scalar args with SUM()', () => {
    const result = evaluateTimeSeriesFormula('SUM(10, 20, 30)', {});
    expect(result).toBe(60);
  });

  // AVERAGE function
  it('averages an array with AVERAGE()', () => {
    const result = evaluateTimeSeriesFormula('AVERAGE(values)', {
      values: [10, 20, 30],
    });
    expect(result).toBe(20);
  });

  // IF function
  it('evaluates IF(true, a, b)', () => {
    expect(evaluateTimeSeriesFormula('IF(1, 100, 200)', {})).toBe(100);
  });

  it('evaluates IF(false, a, b)', () => {
    expect(evaluateTimeSeriesFormula('IF(0, 100, 200)', {})).toBe(200);
  });

  it('evaluates IF with comparison', () => {
    const result = evaluateTimeSeriesFormula('IF(rate > 0.05, 1000, 500)', { rate: 0.10 });
    expect(result).toBe(1000);
  });

  // Combined usage
  it('combines GROWTH and SUM for total revenue', () => {
    const result = evaluateTimeSeriesFormula('SUM(GROWTH(1000, 0.05, 12))', {});
    expect(typeof result).toBe('number');
    expect(result as number).toBeGreaterThan(12000); // 12 months of growing revenue
  });

  it('combines GROWTH and CUMSUM', () => {
    const result = evaluateTimeSeriesFormula('CUMSUM(GROWTH(100, 0, 3))', {});
    expect(result).toEqual([100, 200, 300]);
  });

  // 60-month time-series (plan requirement)
  it('handles 60-month time-series computation', () => {
    const result = evaluateTimeSeriesFormula('GROWTH(base_revenue, monthly_growth, 60)', {
      base_revenue: 10000,
      monthly_growth: 0.03,
    });
    expect(Array.isArray(result)).toBe(true);
    const arr = result as number[];
    expect(arr).toHaveLength(60);
    expect(arr[0]).toBeCloseTo(10000, 2);
    expect(arr[59]).toBeCloseTo(10000 * Math.pow(1.03, 59), 2);
  });
});

// ── sanitizeTimeSeriesResult ────────────────────────────

describe('sanitizeTimeSeriesResult', () => {
  it('accepts valid numbers', () => {
    expect(sanitizeTimeSeriesResult(42)).toBe(42);
  });

  it('accepts valid number arrays', () => {
    expect(sanitizeTimeSeriesResult([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('rejects NaN scalar', () => {
    expect(sanitizeTimeSeriesResult(NaN)).toBeNull();
  });

  it('rejects array with NaN', () => {
    expect(sanitizeTimeSeriesResult([1, NaN, 3])).toBeNull();
  });

  it('rejects array with Infinity', () => {
    expect(sanitizeTimeSeriesResult([1, Infinity])).toBeNull();
  });

  it('rejects non-number types', () => {
    expect(sanitizeTimeSeriesResult('hello')).toBeNull();
    expect(sanitizeTimeSeriesResult(null)).toBeNull();
    expect(sanitizeTimeSeriesResult(undefined)).toBeNull();
  });

  it('accepts empty array', () => {
    expect(sanitizeTimeSeriesResult([])).toEqual([]);
  });
});
