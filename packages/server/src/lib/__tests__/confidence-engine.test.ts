import { describe, it, expect } from 'vitest';
import type { Assumption, AssumptionConfidence } from '@forge/shared';
import {
  getEffectiveConfidence,
  isStale,
  getStalenessInfo,
} from '../confidence-engine';

// ── Test Helpers ────────────────────────────────────────

function makeAssumption(overrides: Partial<Assumption> & { key: string }): Assumption {
  return {
    id: overrides.key,
    projectId: 'test-project',
    parentId: overrides.parentId ?? null,
    aggregationMode: overrides.aggregationMode ?? null,
    moduleKey: overrides.moduleKey ?? null,
    category: 'PRICING',
    name: overrides.key,
    key: overrides.key,
    value: overrides.value ?? '100',
    valueType: 'NUMBER',
    unit: null,
    confidence: overrides.confidence ?? 'USER',
    source: 'test',
    sourceUrl: null,
    formula: overrides.formula ?? null,
    dependsOn: overrides.dependsOn ?? [],
    tier: 'LIGHT',
    isSensitive: false,
    isRequired: false,
    updatedByActor: 'test',
    updatedByUserId: null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ── getEffectiveConfidence ──────────────────────────────

describe('getEffectiveConfidence', () => {
  it('returns own confidence for non-CALCULATED assumptions', () => {
    const assumptions = [
      makeAssumption({ key: 'a', confidence: 'USER' }),
    ];
    expect(getEffectiveConfidence(assumptions[0], assumptions)).toBe('USER');
  });

  it('returns own confidence for RESEARCHED', () => {
    const assumptions = [
      makeAssumption({ key: 'a', confidence: 'RESEARCHED' }),
    ];
    expect(getEffectiveConfidence(assumptions[0], assumptions)).toBe('RESEARCHED');
  });

  it('returns own confidence for AI_ESTIMATE', () => {
    const assumptions = [
      makeAssumption({ key: 'a', confidence: 'AI_ESTIMATE' }),
    ];
    expect(getEffectiveConfidence(assumptions[0], assumptions)).toBe('AI_ESTIMATE');
  });

  it('returns own confidence for CALCULATED with no dependencies', () => {
    const assumptions = [
      makeAssumption({ key: 'a', confidence: 'CALCULATED' }),
    ];
    expect(getEffectiveConfidence(assumptions[0], assumptions)).toBe('CALCULATED');
  });

  it('inherits lowest confidence from USER dependencies', () => {
    const assumptions = [
      makeAssumption({ key: 'a', confidence: 'USER' }),
      makeAssumption({ key: 'b', confidence: 'USER' }),
      makeAssumption({
        key: 'c',
        confidence: 'CALCULATED',
        dependsOn: ['a', 'b'],
        formula: 'a + b',
      }),
    ];
    // Both deps are USER (rank 4) → effective is USER
    expect(getEffectiveConfidence(assumptions[2], assumptions)).toBe('USER');
  });

  it('inherits lowest confidence when mixed', () => {
    const assumptions = [
      makeAssumption({ key: 'a', confidence: 'USER' }),
      makeAssumption({ key: 'b', confidence: 'AI_ESTIMATE' }),
      makeAssumption({
        key: 'c',
        confidence: 'CALCULATED',
        dependsOn: ['a', 'b'],
        formula: 'a + b',
      }),
    ];
    // USER (rank 4) + AI_ESTIMATE (rank 2) → lowest is AI_ESTIMATE
    expect(getEffectiveConfidence(assumptions[2], assumptions)).toBe('AI_ESTIMATE');
  });

  it('follows hierarchy: USER > RESEARCHED > AI_ESTIMATE > CALCULATED', () => {
    const testCases: Array<{ deps: AssumptionConfidence[]; expected: AssumptionConfidence }> = [
      { deps: ['USER', 'RESEARCHED'], expected: 'RESEARCHED' },
      { deps: ['RESEARCHED', 'AI_ESTIMATE'], expected: 'AI_ESTIMATE' },
      { deps: ['USER', 'AI_ESTIMATE'], expected: 'AI_ESTIMATE' },
      { deps: ['USER', 'USER'], expected: 'USER' },
    ];

    for (const { deps, expected } of testCases) {
      const assumptions = [
        makeAssumption({ key: 'dep0', confidence: deps[0] }),
        makeAssumption({ key: 'dep1', confidence: deps[1] }),
        makeAssumption({
          key: 'calc',
          confidence: 'CALCULATED',
          dependsOn: ['dep0', 'dep1'],
          formula: 'dep0 + dep1',
        }),
      ];
      expect(getEffectiveConfidence(assumptions[2], assumptions)).toBe(expected);
    }
  });

  it('recursively computes through dependency chains', () => {
    // a (USER) → b (CALCULATED, depends on a) → c (CALCULATED, depends on b)
    const assumptions = [
      makeAssumption({ key: 'a', confidence: 'AI_ESTIMATE' }),
      makeAssumption({
        key: 'b',
        confidence: 'CALCULATED',
        dependsOn: ['a'],
        formula: 'a * 2',
      }),
      makeAssumption({
        key: 'c',
        confidence: 'CALCULATED',
        dependsOn: ['b'],
        formula: 'b + 1',
      }),
    ];
    // c depends on b, which depends on a (AI_ESTIMATE)
    // b's effective = AI_ESTIMATE, c's effective = AI_ESTIMATE
    expect(getEffectiveConfidence(assumptions[2], assumptions)).toBe('AI_ESTIMATE');
  });

  it('handles dependency not found in array', () => {
    const assumptions = [
      makeAssumption({
        key: 'calc',
        confidence: 'CALCULATED',
        dependsOn: ['nonexistent'],
        formula: 'nonexistent + 1',
      }),
    ];
    // Missing dep is skipped → defaults to USER (initial lowestConfidence)
    expect(getEffectiveConfidence(assumptions[0], assumptions)).toBe('USER');
  });

  it('picks lowest from three-level dependency tree', () => {
    //   a (RESEARCHED)
    //   b (USER)
    //   c = CALCULATED(a, b) → effective RESEARCHED
    //   d (AI_ESTIMATE)
    //   e = CALCULATED(c, d) → effective AI_ESTIMATE (lowest of RESEARCHED and AI_ESTIMATE)
    const assumptions = [
      makeAssumption({ key: 'a', confidence: 'RESEARCHED' }),
      makeAssumption({ key: 'b', confidence: 'USER' }),
      makeAssumption({
        key: 'c',
        confidence: 'CALCULATED',
        dependsOn: ['a', 'b'],
        formula: 'a + b',
      }),
      makeAssumption({ key: 'd', confidence: 'AI_ESTIMATE' }),
      makeAssumption({
        key: 'e',
        confidence: 'CALCULATED',
        dependsOn: ['c', 'd'],
        formula: 'c + d',
      }),
    ];
    expect(getEffectiveConfidence(assumptions[4], assumptions)).toBe('AI_ESTIMATE');
  });
});

// ── isStale ─────────────────────────────────────────────

describe('isStale', () => {
  it('returns false for USER confidence (no threshold)', () => {
    const a = makeAssumption({ key: 'a', confidence: 'USER', updatedAt: daysAgo(365) });
    expect(isStale(a)).toBe(false);
  });

  it('returns false for CALCULATED confidence (no threshold)', () => {
    const a = makeAssumption({ key: 'a', confidence: 'CALCULATED', updatedAt: daysAgo(365) });
    expect(isStale(a)).toBe(false);
  });

  it('returns true for RESEARCHED data older than 30 days', () => {
    const a = makeAssumption({ key: 'a', confidence: 'RESEARCHED', updatedAt: daysAgo(31) });
    expect(isStale(a)).toBe(true);
  });

  it('returns false for RESEARCHED data within 30 days', () => {
    const a = makeAssumption({ key: 'a', confidence: 'RESEARCHED', updatedAt: daysAgo(29) });
    expect(isStale(a)).toBe(false);
  });

  it('returns true for AI_ESTIMATE data older than 7 days', () => {
    const a = makeAssumption({ key: 'a', confidence: 'AI_ESTIMATE', updatedAt: daysAgo(8) });
    expect(isStale(a)).toBe(true);
  });

  it('returns false for AI_ESTIMATE data within 7 days', () => {
    const a = makeAssumption({ key: 'a', confidence: 'AI_ESTIMATE', updatedAt: daysAgo(6) });
    expect(isStale(a)).toBe(false);
  });

  it('returns true at exactly the threshold', () => {
    const a = makeAssumption({ key: 'a', confidence: 'RESEARCHED', updatedAt: daysAgo(30) });
    expect(isStale(a)).toBe(true);
  });

  it('returns false for freshly updated data', () => {
    const a = makeAssumption({ key: 'a', confidence: 'AI_ESTIMATE', updatedAt: new Date() });
    expect(isStale(a)).toBe(false);
  });
});

// ── getStalenessInfo ────────────────────────────────────

describe('getStalenessInfo', () => {
  it('provides reason for stale RESEARCHED data', () => {
    const a = makeAssumption({ key: 'a', confidence: 'RESEARCHED', updatedAt: daysAgo(45) });
    const info = getStalenessInfo(a);
    expect(info.isStale).toBe(true);
    expect(info.reason).toContain('Research data');
    expect(info.reason).toContain('45 days old');
    expect(info.reason).toContain('30 days');
    expect(info.daysSinceUpdate).toBe(45);
  });

  it('provides reason for stale AI_ESTIMATE data', () => {
    const a = makeAssumption({ key: 'a', confidence: 'AI_ESTIMATE', updatedAt: daysAgo(10) });
    const info = getStalenessInfo(a);
    expect(info.isStale).toBe(true);
    expect(info.reason).toContain('AI estimate');
    expect(info.reason).toContain('10 days old');
    expect(info.reason).toContain('7 days');
    expect(info.daysSinceUpdate).toBe(10);
  });

  it('returns daysSinceUpdate for non-stale data', () => {
    const a = makeAssumption({ key: 'a', confidence: 'RESEARCHED', updatedAt: daysAgo(5) });
    const info = getStalenessInfo(a);
    expect(info.isStale).toBe(false);
    expect(info.daysSinceUpdate).toBe(5);
  });

  it('returns isStale: false with no daysSinceUpdate for USER confidence', () => {
    const a = makeAssumption({ key: 'a', confidence: 'USER' });
    const info = getStalenessInfo(a);
    expect(info.isStale).toBe(false);
    expect(info.daysSinceUpdate).toBeUndefined();
  });

  it('handles updatedAt as string (ISO date)', () => {
    const pastDate = daysAgo(35);
    const a = makeAssumption({
      key: 'a',
      confidence: 'RESEARCHED',
      updatedAt: pastDate.toISOString() as unknown as Date,
    });
    const info = getStalenessInfo(a);
    expect(info.isStale).toBe(true);
    expect(info.daysSinceUpdate).toBe(35);
  });
});
