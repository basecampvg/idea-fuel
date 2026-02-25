import { describe, it, expect } from 'vitest';
import type { Assumption } from '@forge/shared';
import {
  buildGraph,
  detectCycles,
  getDownstream,
  topologicalSortDownstream,
  executeCascade,
  buildReverseDependencyMap,
  executeBatchCascade,
} from '../cascade-engine';

// ── Test Helpers ────────────────────────────────────────

/** Create a minimal Assumption for testing. Only key, value, formula, dependsOn matter. */
function makeAssumption(overrides: Partial<Assumption> & { key: string }): Assumption {
  return {
    id: overrides.key,
    projectId: 'test-project',
    category: 'PRICING',
    name: overrides.key,
    key: overrides.key,
    value: overrides.value ?? null,
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ── buildGraph ──────────────────────────────────────────

describe('buildGraph', () => {
  it('builds adjacency list from assumptions', () => {
    const assumptions = [
      makeAssumption({ key: 'a' }),
      makeAssumption({ key: 'b', dependsOn: ['a'] }),
      makeAssumption({ key: 'c', dependsOn: ['a', 'b'] }),
    ];
    const graph = buildGraph(assumptions);

    expect(graph.get('a')).toContain('b');
    expect(graph.get('a')).toContain('c');
    expect(graph.get('b')).toContain('c');
    expect(graph.get('c')).toEqual([]);
  });

  it('handles independent nodes', () => {
    const assumptions = [
      makeAssumption({ key: 'x' }),
      makeAssumption({ key: 'y' }),
      makeAssumption({ key: 'z' }),
    ];
    const graph = buildGraph(assumptions);

    expect(graph.get('x')).toEqual([]);
    expect(graph.get('y')).toEqual([]);
    expect(graph.get('z')).toEqual([]);
  });

  it('handles empty input', () => {
    const graph = buildGraph([]);
    expect(graph.size).toBe(0);
  });

  it('handles single node', () => {
    const graph = buildGraph([makeAssumption({ key: 'solo' })]);
    expect(graph.get('solo')).toEqual([]);
  });
});

// ── detectCycles ────────────────────────────────────────

describe('detectCycles', () => {
  it('returns null for acyclic graph', () => {
    const assumptions = [
      makeAssumption({ key: 'a' }),
      makeAssumption({ key: 'b', dependsOn: ['a'] }),
      makeAssumption({ key: 'c', dependsOn: ['b'] }),
    ];
    expect(detectCycles(assumptions)).toBeNull();
  });

  it('detects simple A→B→A cycle', () => {
    const assumptions = [
      makeAssumption({ key: 'a', dependsOn: ['b'] }),
      makeAssumption({ key: 'b', dependsOn: ['a'] }),
    ];
    const cycles = detectCycles(assumptions);
    expect(cycles).not.toBeNull();
    expect(cycles).toContain('a');
    expect(cycles).toContain('b');
  });

  it('detects A→B→C→A cycle', () => {
    const assumptions = [
      makeAssumption({ key: 'a', dependsOn: ['c'] }),
      makeAssumption({ key: 'b', dependsOn: ['a'] }),
      makeAssumption({ key: 'c', dependsOn: ['b'] }),
    ];
    const cycles = detectCycles(assumptions);
    expect(cycles).not.toBeNull();
    expect(cycles).toHaveLength(3);
  });

  it('returns null for independent nodes', () => {
    const assumptions = [
      makeAssumption({ key: 'x' }),
      makeAssumption({ key: 'y' }),
    ];
    expect(detectCycles(assumptions)).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(detectCycles([])).toBeNull();
  });

  it('detects cycle when only part of graph is cyclic', () => {
    const assumptions = [
      makeAssumption({ key: 'a' }),
      makeAssumption({ key: 'b', dependsOn: ['a'] }),
      // These two form a cycle
      makeAssumption({ key: 'c', dependsOn: ['d'] }),
      makeAssumption({ key: 'd', dependsOn: ['c'] }),
    ];
    const cycles = detectCycles(assumptions);
    expect(cycles).not.toBeNull();
    expect(cycles).toContain('c');
    expect(cycles).toContain('d');
  });
});

// ── getDownstream ───────────────────────────────────────

describe('getDownstream', () => {
  it('finds all downstream nodes', () => {
    const assumptions = [
      makeAssumption({ key: 'a' }),
      makeAssumption({ key: 'b', dependsOn: ['a'] }),
      makeAssumption({ key: 'c', dependsOn: ['b'] }),
    ];
    const graph = buildGraph(assumptions);
    const downstream = getDownstream('a', graph);

    expect(downstream).toContain('b');
    expect(downstream).toContain('c');
    expect(downstream).not.toContain('a'); // changed key itself is excluded
  });

  it('returns empty array for leaf node', () => {
    const assumptions = [
      makeAssumption({ key: 'a' }),
      makeAssumption({ key: 'b', dependsOn: ['a'] }),
    ];
    const graph = buildGraph(assumptions);
    expect(getDownstream('b', graph)).toEqual([]);
  });

  it('handles diamond dependency', () => {
    //   a
    //  / \
    // b   c
    //  \ /
    //   d
    const assumptions = [
      makeAssumption({ key: 'a' }),
      makeAssumption({ key: 'b', dependsOn: ['a'] }),
      makeAssumption({ key: 'c', dependsOn: ['a'] }),
      makeAssumption({ key: 'd', dependsOn: ['b', 'c'] }),
    ];
    const graph = buildGraph(assumptions);
    const downstream = getDownstream('a', graph);

    expect(downstream).toContain('b');
    expect(downstream).toContain('c');
    expect(downstream).toContain('d');
    expect(downstream).toHaveLength(3);
  });

  it('returns empty for unknown key', () => {
    const graph = new Map<string, string[]>();
    expect(getDownstream('nonexistent', graph)).toEqual([]);
  });

  it('respects MAX_CASCADE_DEPTH (currently 50)', () => {
    // Build a chain of 60 nodes: a0 → a1 → a2 → ... → a59
    const assumptions: Assumption[] = [];
    for (let i = 0; i < 60; i++) {
      assumptions.push(
        makeAssumption({
          key: `a${i}`,
          dependsOn: i > 0 ? [`a${i - 1}`] : [],
        }),
      );
    }
    const graph = buildGraph(assumptions);
    const downstream = getDownstream('a0', graph);

    // Should stop at depth 50 — a1 through a50 are within depth, a51+ are not
    expect(downstream.length).toBeLessThanOrEqual(50);
    expect(downstream).toContain('a1');
    expect(downstream).toContain('a50');
    // a51+ should be excluded (depth > MAX_CASCADE_DEPTH)
    expect(downstream).not.toContain('a51');
  });
});

// ── topologicalSortDownstream ───────────────────────────

describe('topologicalSortDownstream', () => {
  it('returns correct evaluation order for a chain', () => {
    const assumptions = [
      makeAssumption({ key: 'a' }),
      makeAssumption({ key: 'b', dependsOn: ['a'], formula: 'a * 2' }),
      makeAssumption({ key: 'c', dependsOn: ['b'], formula: 'b + 1' }),
    ];
    const sorted = topologicalSortDownstream(assumptions, 'a');
    const bIndex = sorted.indexOf('b');
    const cIndex = sorted.indexOf('c');
    expect(bIndex).toBeLessThan(cIndex);
  });

  it('returns empty for leaf node', () => {
    const assumptions = [
      makeAssumption({ key: 'a' }),
      makeAssumption({ key: 'b', dependsOn: ['a'] }),
    ];
    expect(topologicalSortDownstream(assumptions, 'b')).toEqual([]);
  });

  it('handles diamond dependency in correct order', () => {
    const assumptions = [
      makeAssumption({ key: 'a' }),
      makeAssumption({ key: 'b', dependsOn: ['a'] }),
      makeAssumption({ key: 'c', dependsOn: ['a'] }),
      makeAssumption({ key: 'd', dependsOn: ['b', 'c'] }),
    ];
    const sorted = topologicalSortDownstream(assumptions, 'a');
    const dIndex = sorted.indexOf('d');
    const bIndex = sorted.indexOf('b');
    const cIndex = sorted.indexOf('c');

    // d must come after both b and c
    expect(dIndex).toBeGreaterThan(bIndex);
    expect(dIndex).toBeGreaterThan(cIndex);
  });

  it('produces deterministic ordering', () => {
    const assumptions = [
      makeAssumption({ key: 'root' }),
      makeAssumption({ key: 'z_child', dependsOn: ['root'] }),
      makeAssumption({ key: 'a_child', dependsOn: ['root'] }),
      makeAssumption({ key: 'm_child', dependsOn: ['root'] }),
    ];
    // Multiple runs should produce same order
    const sorted1 = topologicalSortDownstream(assumptions, 'root');
    const sorted2 = topologicalSortDownstream(assumptions, 'root');
    expect(sorted1).toEqual(sorted2);
  });
});

// ── executeCascade ──────────────────────────────────────

describe('executeCascade', () => {
  it('cascades a simple value change', () => {
    const assumptions = [
      makeAssumption({ key: 'unit_price', value: '100' }),
      makeAssumption({
        key: 'revenue',
        value: '1000',
        formula: 'unit_price * 10',
        dependsOn: ['unit_price'],
      }),
    ];

    const result = executeCascade(assumptions, 'unit_price', '200');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      // Direct change + cascade update
      expect(result.updatedAssumptions.length).toBeGreaterThanOrEqual(2);
      const revenueChange = result.updatedAssumptions.find((c) => c.key === 'revenue');
      expect(revenueChange).toBeDefined();
      expect(revenueChange!.newValue).toBe('2000');
    }
  });

  it('cascades through multiple levels', () => {
    const assumptions = [
      makeAssumption({ key: 'price', value: '100' }),
      makeAssumption({
        key: 'cost',
        value: '40',
        formula: 'price * 0.4',
        dependsOn: ['price'],
      }),
      makeAssumption({
        key: 'margin',
        value: '60',
        formula: 'price - cost',
        dependsOn: ['price', 'cost'],
      }),
    ];

    const result = executeCascade(assumptions, 'price', '200');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      const costChange = result.updatedAssumptions.find((c) => c.key === 'cost');
      const marginChange = result.updatedAssumptions.find((c) => c.key === 'margin');
      expect(costChange!.newValue).toBe('80');
      expect(marginChange!.newValue).toBe('120');
    }
  });

  it('returns error for missing assumption', () => {
    const result = executeCascade([], 'nonexistent', '100');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.errorType).toBe('missing_dependency');
    }
  });

  it('returns error for circular dependency', () => {
    const assumptions = [
      makeAssumption({ key: 'a', value: '1', dependsOn: ['b'], formula: 'b + 1' }),
      makeAssumption({ key: 'b', value: '2', dependsOn: ['a'], formula: 'a + 1' }),
    ];
    const result = executeCascade(assumptions, 'a', '5');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.errorType).toBe('circular_dependency');
    }
  });

  it('handles formula evaluation error (division by zero) gracefully', () => {
    const assumptions = [
      makeAssumption({ key: 'divisor', value: '5' }),
      makeAssumption({
        key: 'computed',
        value: '20',
        formula: '100 / divisor',
        dependsOn: ['divisor'],
      }),
    ];
    // Change divisor to 0 → division by zero → computed becomes null
    const result = executeCascade(assumptions, 'divisor', '0');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      const computedChange = result.updatedAssumptions.find((c) => c.key === 'computed');
      expect(computedChange).toBeDefined();
      expect(computedChange!.newValue).toBe('null');
    }
  });

  it('recomputes downstream when previously-null dependency gets a value', () => {
    const assumptions = [
      makeAssumption({ key: 'a', value: null }),
      makeAssumption({
        key: 'b',
        value: '10',
        formula: 'a * 2',
        dependsOn: ['a'],
      }),
    ];
    const result = executeCascade(assumptions, 'a', '5');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      const bChange = result.updatedAssumptions.find((c) => c.key === 'b');
      // a=5, formula='a * 2' → b=10, but b was already '10', so no change recorded
      expect(bChange).toBeUndefined();
    }
  });

  it('handles downstream when dependency value is still null', () => {
    const assumptions = [
      makeAssumption({ key: 'x', value: '5' }),
      makeAssumption({
        key: 'y',
        value: '20',
        formula: 'x + z',
        dependsOn: ['x', 'z'],
      }),
      makeAssumption({ key: 'z', value: null }),
    ];
    // Change x from 5 to 10. But y depends on z which is null → y can't compute
    const result = executeCascade(assumptions, 'x', '10');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      const yChange = result.updatedAssumptions.find((c) => c.key === 'y');
      // y had a value '20' but now can't compute due to null z → becomes null
      expect(yChange).toBeDefined();
      expect(yChange!.newValue).toBe('null');
    }
  });

  it('includes impacted sections for known keys', () => {
    const assumptions = [
      makeAssumption({ key: 'unit_price', value: '50' }),
    ];
    const result = executeCascade(assumptions, 'unit_price', '100');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      // unit_price maps to pricingStrategy, revenueStreams, financialProjections, executiveSummary
      expect(result.impactedSections.length).toBeGreaterThan(0);
      const sectionKeys = result.impactedSections.map((s) => s.sectionKey);
      expect(sectionKeys).toContain('pricingStrategy');
      expect(sectionKeys).toContain('financialProjections');
    }
  });

  it('does not record change when downstream value is unchanged', () => {
    const assumptions = [
      makeAssumption({ key: 'rate', value: '10' }),
      makeAssumption({
        key: 'computed',
        value: '20', // rate * 2 = 20 already
        formula: 'rate * 2',
        dependsOn: ['rate'],
      }),
    ];
    // Change rate to 10 (same as before) — computed should not change
    const result = executeCascade(assumptions, 'rate', '10');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      const computedChange = result.updatedAssumptions.find((c) => c.key === 'computed');
      // Value unchanged (was '20', computed '20'), so no change recorded
      expect(computedChange).toBeUndefined();
    }
  });

  it('handles assumptions without formulas (leaf nodes)', () => {
    const assumptions = [
      makeAssumption({ key: 'a', value: '5' }),
      makeAssumption({ key: 'b', value: '10', dependsOn: ['a'] }), // no formula
    ];
    const result = executeCascade(assumptions, 'a', '15');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      // b has no formula, so it should not change even though it depends on a
      const bChange = result.updatedAssumptions.find((c) => c.key === 'b');
      expect(bChange).toBeUndefined();
    }
  });
});

// ── Performance Benchmark ──────────────────────────────

describe('cascade performance', () => {
  it('executes cascade with 200+ assumptions in under 100ms', () => {
    // Build a wide + deep graph: 200 assumptions with layered dependencies
    // Layer 0: 10 root assumptions (no deps)
    // Layer 1: 40 assumptions each depending on 2 roots
    // Layer 2: 80 assumptions each depending on 2 from layer 1
    // Layer 3: 70 assumptions each depending on 2 from layer 2
    const assumptions: Assumption[] = [];

    // Layer 0: roots
    for (let i = 0; i < 10; i++) {
      assumptions.push(
        makeAssumption({ key: `root_${i}`, value: String(10 + i) }),
      );
    }

    // Layer 1: 40 nodes, each depends on 2 roots, has formula
    for (let i = 0; i < 40; i++) {
      const dep1 = `root_${i % 10}`;
      const dep2 = `root_${(i + 1) % 10}`;
      assumptions.push(
        makeAssumption({
          key: `l1_${i}`,
          value: '20',
          formula: `${dep1} + ${dep2}`,
          dependsOn: [dep1, dep2],
        }),
      );
    }

    // Layer 2: 80 nodes, each depends on 2 from layer 1
    for (let i = 0; i < 80; i++) {
      const dep1 = `l1_${i % 40}`;
      const dep2 = `l1_${(i + 1) % 40}`;
      assumptions.push(
        makeAssumption({
          key: `l2_${i}`,
          value: '40',
          formula: `${dep1} + ${dep2}`,
          dependsOn: [dep1, dep2],
        }),
      );
    }

    // Layer 3: 70 nodes, each depends on 2 from layer 2
    for (let i = 0; i < 70; i++) {
      const dep1 = `l2_${i % 80}`;
      const dep2 = `l2_${(i + 1) % 80}`;
      assumptions.push(
        makeAssumption({
          key: `l3_${i}`,
          value: '80',
          formula: `${dep1} + ${dep2}`,
          dependsOn: [dep1, dep2],
        }),
      );
    }

    expect(assumptions.length).toBe(200);

    const start = performance.now();
    const result = executeCascade(assumptions, 'root_0', '100');
    const elapsed = performance.now() - start;

    expect(result.status).toBe('success');
    expect(elapsed).toBeLessThan(100); // sub-100ms

    if (result.status === 'success') {
      // Verify cascade actually propagated through all layers
      const l1Changes = result.updatedAssumptions.filter((c) => c.key.startsWith('l1_'));
      const l2Changes = result.updatedAssumptions.filter((c) => c.key.startsWith('l2_'));
      const l3Changes = result.updatedAssumptions.filter((c) => c.key.startsWith('l3_'));
      expect(l1Changes.length).toBeGreaterThan(0);
      expect(l2Changes.length).toBeGreaterThan(0);
      expect(l3Changes.length).toBeGreaterThan(0);
    }
  });

  it('handles deep chain of 50 cascading formulas', () => {
    // a0=100, a1=a0*2, a2=a1*1.01, a3=a2*1.01, ...
    const assumptions: Assumption[] = [
      makeAssumption({ key: 'a0', value: '100' }),
    ];
    for (let i = 1; i <= 50; i++) {
      assumptions.push(
        makeAssumption({
          key: `a${i}`,
          value: String(100 * Math.pow(1.01, i)),
          formula: `a${i - 1} * 1.01`,
          dependsOn: [`a${i - 1}`],
        }),
      );
    }

    const start = performance.now();
    const result = executeCascade(assumptions, 'a0', '200');
    const elapsed = performance.now() - start;

    expect(result.status).toBe('success');
    expect(elapsed).toBeLessThan(100);

    if (result.status === 'success') {
      // a1 = 200 * 1.01 = 202
      const a1Change = result.updatedAssumptions.find((c) => c.key === 'a1');
      expect(a1Change).toBeDefined();
      expect(parseFloat(a1Change!.newValue)).toBeCloseTo(202, 2);

      // a50 should exist and be updated
      const a50Change = result.updatedAssumptions.find((c) => c.key === 'a50');
      expect(a50Change).toBeDefined();
    }
  });
});

// ── buildReverseDependencyMap ───────────────────────────

describe('buildReverseDependencyMap', () => {
  it('builds reverse map from assumptions', () => {
    const assumptions = [
      makeAssumption({ key: 'a' }),
      makeAssumption({ key: 'b', dependsOn: ['a'] }),
      makeAssumption({ key: 'c', dependsOn: ['a', 'b'] }),
    ];
    const reverse = buildReverseDependencyMap(assumptions);

    // a is depended on by b and c
    expect(reverse.get('a')).toContain('b');
    expect(reverse.get('a')).toContain('c');
    // b is depended on by c
    expect(reverse.get('b')).toContain('c');
    // c has no dependents
    expect(reverse.get('c')).toEqual([]);
  });

  it('handles independent nodes', () => {
    const assumptions = [
      makeAssumption({ key: 'x' }),
      makeAssumption({ key: 'y' }),
    ];
    const reverse = buildReverseDependencyMap(assumptions);
    expect(reverse.get('x')).toEqual([]);
    expect(reverse.get('y')).toEqual([]);
  });

  it('handles empty input', () => {
    const reverse = buildReverseDependencyMap([]);
    expect(reverse.size).toBe(0);
  });
});

// ── executeBatchCascade ─────────────────────────────────

describe('executeBatchCascade', () => {
  it('handles single update (equivalent to executeCascade)', () => {
    const assumptions = [
      makeAssumption({ key: 'price', value: '100' }),
      makeAssumption({
        key: 'revenue',
        value: '1000',
        formula: 'price * 10',
        dependsOn: ['price'],
      }),
    ];

    const result = executeBatchCascade(assumptions, [{ key: 'price', value: '200' }]);
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.changedKeys).toEqual(['price']);
      const revChange = result.updatedAssumptions.find((c) => c.key === 'revenue');
      expect(revChange).toBeDefined();
      expect(revChange!.newValue).toBe('2000');
      expect(result.metrics.elapsedMs).toBeLessThan(100);
    }
  });

  it('batches multiple updates with shared downstream', () => {
    const assumptions = [
      makeAssumption({ key: 'price', value: '100' }),
      makeAssumption({ key: 'quantity', value: '10' }),
      makeAssumption({
        key: 'revenue',
        value: '1000',
        formula: 'price * quantity',
        dependsOn: ['price', 'quantity'],
      }),
    ];

    const result = executeBatchCascade(assumptions, [
      { key: 'price', value: '200' },
      { key: 'quantity', value: '20' },
    ]);
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.changedKeys).toEqual(['price', 'quantity']);
      const revChange = result.updatedAssumptions.find((c) => c.key === 'revenue');
      expect(revChange).toBeDefined();
      expect(revChange!.newValue).toBe('4000'); // 200 * 20
    }
  });

  it('calculates downstream only once for overlapping changes', () => {
    // a, b both feed into c; changing both a and b should recalculate c once
    const assumptions = [
      makeAssumption({ key: 'a', value: '10' }),
      makeAssumption({ key: 'b', value: '20' }),
      makeAssumption({
        key: 'c',
        value: '30',
        formula: 'a + b',
        dependsOn: ['a', 'b'],
      }),
    ];

    const result = executeBatchCascade(assumptions, [
      { key: 'a', value: '100' },
      { key: 'b', value: '200' },
    ]);
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      const cChange = result.updatedAssumptions.find((c) => c.key === 'c');
      expect(cChange).toBeDefined();
      expect(cChange!.newValue).toBe('300'); // 100 + 200
      // c should appear only once in changes
      const cChanges = result.updatedAssumptions.filter((c) => c.key === 'c');
      expect(cChanges).toHaveLength(1);
    }
  });

  it('returns error for missing assumption', () => {
    const result = executeBatchCascade([], [{ key: 'nonexistent', value: '100' }]);
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.errorType).toBe('missing_dependency');
    }
  });

  it('returns error for circular dependency', () => {
    const assumptions = [
      makeAssumption({ key: 'a', value: '1', dependsOn: ['b'], formula: 'b + 1' }),
      makeAssumption({ key: 'b', value: '2', dependsOn: ['a'], formula: 'a + 1' }),
    ];
    const result = executeBatchCascade(assumptions, [{ key: 'a', value: '5' }]);
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.errorType).toBe('circular_dependency');
    }
  });

  it('includes performance metrics', () => {
    const assumptions = [
      makeAssumption({ key: 'a', value: '10' }),
      makeAssumption({
        key: 'b',
        value: '20',
        formula: 'a * 2',
        dependsOn: ['a'],
      }),
    ];

    const result = executeBatchCascade(assumptions, [{ key: 'a', value: '100' }]);
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.metrics.totalAssumptions).toBe(2);
      expect(result.metrics.downstreamCount).toBe(1);
      expect(result.metrics.updatedCount).toBeGreaterThan(0);
      expect(typeof result.metrics.elapsedMs).toBe('number');
    }
  });

  it('skips unchanged direct updates', () => {
    const assumptions = [
      makeAssumption({ key: 'a', value: '10' }),
    ];
    // Update a to the same value
    const result = executeBatchCascade(assumptions, [{ key: 'a', value: '10' }]);
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      // No changes because value is the same
      expect(result.updatedAssumptions).toHaveLength(0);
    }
  });

  it('handles batch cascade at scale (200+ assumptions)', () => {
    const assumptions: Assumption[] = [];

    // 10 roots
    for (let i = 0; i < 10; i++) {
      assumptions.push(makeAssumption({ key: `root_${i}`, value: String(10 + i) }));
    }

    // 90 nodes depending on roots with formulas
    for (let i = 0; i < 90; i++) {
      const dep1 = `root_${i % 10}`;
      const dep2 = `root_${(i + 3) % 10}`;
      assumptions.push(
        makeAssumption({
          key: `calc_${i}`,
          value: '20',
          formula: `${dep1} + ${dep2}`,
          dependsOn: [dep1, dep2],
        }),
      );
    }

    // 100 more nodes depending on calc nodes
    for (let i = 0; i < 100; i++) {
      const dep = `calc_${i % 90}`;
      assumptions.push(
        makeAssumption({
          key: `leaf_${i}`,
          value: '40',
          formula: `${dep} * 2`,
          dependsOn: [dep],
        }),
      );
    }

    expect(assumptions.length).toBe(200);

    // Batch update 5 roots at once
    const updates = [
      { key: 'root_0', value: '100' },
      { key: 'root_1', value: '100' },
      { key: 'root_2', value: '100' },
      { key: 'root_3', value: '100' },
      { key: 'root_4', value: '100' },
    ];

    const result = executeBatchCascade(assumptions, updates);
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.metrics.elapsedMs).toBeLessThan(100);
      expect(result.metrics.downstreamCount).toBeGreaterThan(0);
      expect(result.updatedAssumptions.length).toBeGreaterThan(5);
    }
  });
});
