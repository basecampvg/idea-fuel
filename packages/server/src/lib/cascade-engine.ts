/**
 * Cascade Engine — DAG dependency graph with topological sort.
 *
 * Uses Kahn's algorithm (BFS-based) for topological sort:
 * - O(V+E) complexity
 * - Naturally detects cycles (remaining nodes with in-degree > 0)
 * - Deterministic ordering
 * - No recursion stack overflow risk
 *
 * All exports are plain functions — no classes.
 */

import type { Assumption, CascadeResult, CascadeChange } from '@forge/shared';
import { evaluateFormula } from './formula-engine';
import { ASSUMPTION_IMPACT_MAP } from './assumption-impact-map';

const MAX_CASCADE_DEPTH = 10;

/**
 * Build an adjacency list (forward edges) from assumptions.
 * For each assumption, if it depends on key X, then X -> this assumption.
 * Returns a map: parentKey -> [childKey1, childKey2, ...]
 */
export function buildGraph(assumptions: Assumption[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  // Initialize all keys
  for (const a of assumptions) {
    if (!adjacency.has(a.key)) {
      adjacency.set(a.key, []);
    }
  }

  // Build forward edges: if B depends on A, then A -> B
  for (const a of assumptions) {
    for (const dep of a.dependsOn) {
      const children = adjacency.get(dep);
      if (children) {
        children.push(a.key);
      }
    }
  }

  return adjacency;
}

/**
 * Detect cycles in the dependency graph using Kahn's algorithm.
 * Returns the cycle members if a cycle exists, or null if the graph is acyclic.
 */
export function detectCycles(assumptions: Assumption[]): string[] | null {
  const inDegree = new Map<string, number>();
  const adjacency = buildGraph(assumptions);

  // Initialize in-degrees
  for (const a of assumptions) {
    inDegree.set(a.key, 0);
  }

  // Count in-degrees from dependsOn
  for (const a of assumptions) {
    for (const dep of a.dependsOn) {
      const current = inDegree.get(a.key) ?? 0;
      inDegree.set(a.key, current + 1);
    }
  }

  // Kahn's: start with nodes that have in-degree 0
  const queue: string[] = [];
  for (const [key, degree] of inDegree) {
    if (degree === 0) queue.push(key);
  }

  let processedCount = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    processedCount++;

    const children = adjacency.get(current) ?? [];
    for (const child of children) {
      const deg = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, deg);
      if (deg === 0) queue.push(child);
    }
  }

  // If not all nodes were processed, there's a cycle
  if (processedCount < assumptions.length) {
    const cycleMembers = [...inDegree.entries()]
      .filter(([, degree]) => degree > 0)
      .map(([key]) => key);
    return cycleMembers;
  }

  return null;
}

/**
 * Find all downstream assumptions affected by changing a given key.
 * BFS traversal with depth limit for DoS protection.
 */
export function getDownstream(changedKey: string, adjacency: Map<string, string[]>): string[] {
  const visited = new Set<string>();
  const queue: Array<{ key: string; depth: number }> = [{ key: changedKey, depth: 0 }];

  while (queue.length > 0) {
    const { key, depth } = queue.shift()!;

    if (visited.has(key)) continue;
    if (key !== changedKey) visited.add(key);

    if (depth >= MAX_CASCADE_DEPTH) continue;

    const children = adjacency.get(key) ?? [];
    for (const child of children) {
      if (!visited.has(child)) {
        queue.push({ key: child, depth: depth + 1 });
      }
    }
  }

  return [...visited];
}

/**
 * Topological sort of downstream nodes using Kahn's algorithm.
 * Only sorts the subset of nodes reachable from changedKey.
 */
export function topologicalSortDownstream(
  assumptions: Assumption[],
  changedKey: string,
): string[] {
  const adjacency = buildGraph(assumptions);
  const downstream = getDownstream(changedKey, adjacency);

  if (downstream.length === 0) return [];

  const downstreamSet = new Set(downstream);
  const assumptionMap = new Map(assumptions.map((a) => [a.key, a]));

  // Build in-degree counts for downstream nodes only
  const inDegree = new Map<string, number>();
  for (const key of downstream) {
    inDegree.set(key, 0);
  }

  for (const key of downstream) {
    const a = assumptionMap.get(key);
    if (!a) continue;
    for (const dep of a.dependsOn) {
      // Only count deps on OTHER downstream nodes (not the changedKey,
      // which is already resolved and acts as the cascade trigger).
      if (downstreamSet.has(dep)) {
        const current = inDegree.get(key) ?? 0;
        inDegree.set(key, current + 1);
      }
    }
  }

  // Kahn's algorithm on the subgraph
  const queue: string[] = [];
  for (const [key, degree] of inDegree) {
    if (degree === 0) queue.push(key);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    // Sort for deterministic ordering
    queue.sort();
    const current = queue.shift()!;
    sorted.push(current);

    const children = adjacency.get(current) ?? [];
    for (const child of children) {
      if (!downstreamSet.has(child)) continue;
      const deg = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, deg);
      if (deg === 0) queue.push(child);
    }
  }

  return sorted;
}

/**
 * Execute a full cascade: update the changed assumption's value,
 * then recalculate all downstream assumptions in topological order.
 */
export function executeCascade(
  assumptions: Assumption[],
  changedKey: string,
  newValue: string,
): CascadeResult {
  const assumptionMap = new Map(assumptions.map((a) => [a.key, a]));
  const changed = assumptionMap.get(changedKey);

  if (!changed) {
    return {
      status: 'error',
      changedKey,
      errorType: 'missing_dependency',
      errorMessage: `Assumption "${changedKey}" not found`,
      errorAtKey: changedKey,
    };
  }

  // Check for cycles first
  const cycleMembers = detectCycles(assumptions);
  if (cycleMembers) {
    return {
      status: 'error',
      changedKey,
      errorType: 'circular_dependency',
      errorMessage: `Circular dependency detected: ${cycleMembers.join(' -> ')}`,
      errorAtKey: cycleMembers[0],
    };
  }

  // Get downstream nodes in topological order
  const sortedDownstream = topologicalSortDownstream(assumptions, changedKey);

  // Build a mutable values map for cascade computation
  const currentValues = new Map<string, string | null>();
  for (const a of assumptions) {
    currentValues.set(a.key, a.value);
  }
  currentValues.set(changedKey, newValue);

  const changes: CascadeChange[] = [];

  // Record the direct change
  changes.push({
    key: changedKey,
    oldValue: changed.value,
    newValue,
  });

  // Recalculate downstream in order
  for (const key of sortedDownstream) {
    const a = assumptionMap.get(key);
    if (!a?.formula) continue;

    // Build scope from current values
    const scope: Record<string, number> = {};
    let missingDep = false;

    for (const dep of a.dependsOn) {
      const val = currentValues.get(dep);
      if (val === null || val === undefined) {
        missingDep = true;
        break;
      }
      const numVal = parseFloat(val);
      if (isNaN(numVal)) {
        missingDep = true;
        break;
      }
      scope[dep] = numVal;
    }

    if (missingDep) {
      // Can't compute — leave value as null
      const oldValue = a.value;
      if (oldValue !== null) {
        currentValues.set(key, null);
        changes.push({ key, oldValue, newValue: 'null' });
      }
      continue;
    }

    const result = evaluateFormula(a.formula, scope);
    if (result === null) {
      // Formula error (division by zero, etc.)
      const oldValue = a.value;
      currentValues.set(key, null);
      if (oldValue !== null) {
        changes.push({ key, oldValue, newValue: 'null' });
      }
      continue;
    }

    const newVal = String(result);
    const oldValue = a.value;
    if (oldValue !== newVal) {
      currentValues.set(key, newVal);
      changes.push({ key, oldValue, newValue: newVal });
    }
  }

  // Gather impacted sections from all changed keys
  const impactedSections = new Set<string>();
  const impactedSectionsList: Array<{ sectionKey: string; reportType: string }> = [];

  for (const change of changes) {
    const sections = ASSUMPTION_IMPACT_MAP[change.key];
    if (sections) {
      for (const sectionKey of sections) {
        const composite = `BUSINESS_PLAN:${sectionKey}`;
        if (!impactedSections.has(composite)) {
          impactedSections.add(composite);
          impactedSectionsList.push({ sectionKey, reportType: 'BUSINESS_PLAN' });
        }
      }
    }
  }

  return {
    status: 'success',
    changedKey,
    updatedAssumptions: changes,
    impactedSections: impactedSectionsList,
  };
}
