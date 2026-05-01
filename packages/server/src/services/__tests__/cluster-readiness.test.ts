import { describe, it, expect } from 'vitest';
import { computeReadinessScore, computeClusterMaturity } from '../cluster-readiness';

describe('cluster-readiness', () => {
  it('returns 0 for empty cluster', () => {
    expect(
      computeReadinessScore({
        thoughts: [],
        dimensionCoverage: null,
        synthesisRunCount: 0,
        tensions: [],
        collisionCount: 0,
      }),
    ).toBe(0);
  });

  it('returns ~1 for fully synthesized, diverse cluster', () => {
    const score = computeReadinessScore({
      thoughts: ['problem', 'solution', 'what_if', 'observation', 'question'].map((t) => ({
        thoughtType: t,
      })),
      dimensionCoverage: {
        problem: true,
        audience: true,
        solution: true,
        angle: true,
        pricing: true,
      },
      synthesisRunCount: 4,
      tensions: [{ id: 'a', text: 't', resolvedAt: new Date() }],
      collisionCount: 5,
    });
    expect(score).toBeGreaterThan(0.9);
  });

  it('maturity transitions: exploring -> forming -> ready', () => {
    expect(
      computeClusterMaturity({ thoughtCount: 4, synthesisRunCount: 1, readinessScore: 0.3 }),
    ).toBe('exploring');
    expect(
      computeClusterMaturity({ thoughtCount: 5, synthesisRunCount: 0, readinessScore: 0.3 }),
    ).toBe('exploring');
    expect(
      computeClusterMaturity({ thoughtCount: 5, synthesisRunCount: 1, readinessScore: 0.3 }),
    ).toBe('forming');
    expect(
      computeClusterMaturity({ thoughtCount: 8, synthesisRunCount: 2, readinessScore: 0.71 }),
    ).toBe('ready');
  });
});
