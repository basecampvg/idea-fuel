/**
 * Cluster crystallize integration test.
 *
 * Verifies the brand-critical crystallization contract: previewCrystallize
 * extracts the 5 idea fields (without inserting), confirmCrystallize creates an
 * Idea row with provenance + draft validation status, and the source cluster
 * and thoughts are NOT deleted by either step.
 *
 * Approach: stub `synthesizeIdea` (no live Anthropic call) and stub `ctx.db`
 * with table-aware select chains. We exercise the router logic directly via
 * createCallerFactory.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCallerFactory } from '../../trpc';
import { clusterRouter } from '../cluster';
import * as sandboxAi from '../../services/sandbox-ai';
import { thoughtClusters, thoughts, ideas } from '../../db/schema';

const USER_ID = 'user-test-1';
const CLUSTER_ID = 'cluster-test-1';

type ThoughtRow = { id: string; content: string; clusterId: string; userId: string };
type ClusterRow = { id: string; name: string; userId: string };
type IdeaInsert = Record<string, unknown>;

/** Build a stub Drizzle-style db for the router. */
function buildDb(opts: {
  clusters: ClusterRow[];
  thoughtsByCluster: Record<string, ThoughtRow[]>;
}) {
  const insertedIdeas: IdeaInsert[] = [];

  // Tracks remaining cluster + thought rows so the test can assert nothing
  // got deleted during crystallize.
  const remaining = {
    clusters: [...opts.clusters],
    thoughts: Object.values(opts.thoughtsByCluster).flat(),
  };

  const db = {
    select(_columns?: unknown) {
      return {
        from(table: unknown) {
          return {
            where(_cond: unknown) {
              if (table === thoughtClusters) {
                return Promise.resolve(remaining.clusters);
              }
              if (table === thoughts) {
                return Promise.resolve(remaining.thoughts);
              }
              return Promise.resolve([]);
            },
          };
        },
      };
    },
    insert(table: unknown) {
      return {
        values(vals: IdeaInsert) {
          if (table === ideas) {
            insertedIdeas.push(vals);
          }
          return {
            returning(_cols: unknown) {
              const id = `idea-${insertedIdeas.length}`;
              return Promise.resolve([{ id }]);
            },
          };
        },
      };
    },
    query: {
      thoughtClusters: {
        findFirst: vi.fn(async () => remaining.clusters[0] ?? null),
      },
    },
  };

  return { db, insertedIdeas, remaining };
}

function makeCaller(db: ReturnType<typeof buildDb>['db'], userId: string = USER_ID) {
  const createCaller = createCallerFactory(clusterRouter);
  return createCaller({
    db: db as never,
    session: { user: { id: userId, email: 't@example.com' }, expires: '2099-01-01' },
    userId,
  });
}

describe('cluster.crystallize', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const seedThoughts: ThoughtRow[] = [
    { id: 't-1', content: 'small business owners hate filing taxes', clusterId: CLUSTER_ID, userId: USER_ID },
    { id: 't-2', content: 'they pay $400+ to a CPA every year for basic returns', clusterId: CLUSTER_ID, userId: USER_ID },
    { id: 't-3', content: 'most of the work is just categorizing receipts', clusterId: CLUSTER_ID, userId: USER_ID },
    { id: 't-4', content: 'AI could auto-categorize from a credit card feed', clusterId: CLUSTER_ID, userId: USER_ID },
    { id: 't-5', content: 'charge $99/year flat, undercut CPAs by 4x', clusterId: CLUSTER_ID, userId: USER_ID },
  ];

  const fakeFields = {
    title: 'Auto Tax For Small Biz',
    problemStatement: 'Small business owners pay too much for basic tax filing.',
    targetAudience: 'Sole proprietors and single-member LLCs filing Schedule C.',
    proposedSolution: 'Auto-categorize transactions from a card feed and generate the return.',
    uniqueAngle: 'Flat $99 price undercuts CPAs by 4x.',
    pricingHypothesis: 'Flat annual fee of $99 per filer.',
  };

  it('previewCrystallize returns all 5 fields + sourceThoughtIds without inserting', async () => {
    const synthesizeSpy = vi
      .spyOn(sandboxAi, 'synthesizeIdea')
      .mockResolvedValue(fakeFields);

    const { db, insertedIdeas } = buildDb({
      clusters: [{ id: CLUSTER_ID, name: 'Tax SaaS', userId: USER_ID }],
      thoughtsByCluster: { [CLUSTER_ID]: seedThoughts },
    });
    const caller = makeCaller(db);

    const result = await caller.previewCrystallize({ id: CLUSTER_ID });

    expect(synthesizeSpy).toHaveBeenCalledOnce();
    expect(synthesizeSpy).toHaveBeenCalledWith(seedThoughts.map((t) => t.content));
    expect(result.title).toBe(fakeFields.title);
    expect(result.problemStatement).toBe(fakeFields.problemStatement);
    expect(result.targetAudience).toBe(fakeFields.targetAudience);
    expect(result.proposedSolution).toBe(fakeFields.proposedSolution);
    expect(result.uniqueAngle).toBe(fakeFields.uniqueAngle);
    expect(result.pricingHypothesis).toBe(fakeFields.pricingHypothesis);
    expect(result.sourceThoughtIds).toEqual(seedThoughts.map((t) => t.id));

    // Critical: preview did NOT insert.
    expect(insertedIdeas).toHaveLength(0);
  });

  it('confirmCrystallize inserts an idea with provenance + draft status', async () => {
    const { db, insertedIdeas, remaining } = buildDb({
      clusters: [{ id: CLUSTER_ID, name: 'Tax SaaS', userId: USER_ID }],
      thoughtsByCluster: { [CLUSTER_ID]: seedThoughts },
    });
    const caller = makeCaller(db);

    const sourceThoughtIds = seedThoughts.map((t) => t.id);
    const result = await caller.confirmCrystallize({
      clusterId: CLUSTER_ID,
      ...fakeFields,
      sourceThoughtIds,
    });

    expect(result.ideaId).toBeTruthy();
    expect(insertedIdeas).toHaveLength(1);

    const inserted = insertedIdeas[0];
    expect(inserted.title).toBe(fakeFields.title);
    expect(inserted.problemStatement).toBe(fakeFields.problemStatement);
    expect(inserted.targetAudience).toBe(fakeFields.targetAudience);
    expect(inserted.proposedSolution).toBe(fakeFields.proposedSolution);
    expect(inserted.uniqueAngle).toBe(fakeFields.uniqueAngle);
    expect(inserted.pricingHypothesis).toBe(fakeFields.pricingHypothesis);
    expect(inserted.description).toBe(fakeFields.problemStatement); // legacy column
    expect(inserted.sourceClusterId).toBe(CLUSTER_ID);
    expect(inserted.sourceThoughtIds).toEqual(sourceThoughtIds);
    expect(inserted.validationStatus).toBe('draft');
    expect(inserted.crystallizedBy).toBe(USER_ID);
    expect(inserted.crystallizedAt).toBeInstanceOf(Date);
    expect(inserted.userId).toBe(USER_ID);

    // Brand-critical assertion: source cluster + thoughts STILL EXIST after
    // crystallization. "An idea forms when thoughts collide" — but the
    // thoughts persist; a cluster can be crystallized multiple times.
    expect(remaining.clusters).toHaveLength(1);
    expect(remaining.clusters[0].id).toBe(CLUSTER_ID);
    expect(remaining.thoughts).toHaveLength(seedThoughts.length);
    expect(remaining.thoughts.map((t) => t.id).sort()).toEqual([...sourceThoughtIds].sort());
  });

  it('previewCrystallize rejects empty cluster with CLUSTER_EMPTY', async () => {
    vi.spyOn(sandboxAi, 'synthesizeIdea').mockResolvedValue(fakeFields);
    const { db } = buildDb({
      clusters: [{ id: CLUSTER_ID, name: 'Empty', userId: USER_ID }],
      thoughtsByCluster: { [CLUSTER_ID]: [] },
    });
    const caller = makeCaller(db);

    await expect(caller.previewCrystallize({ id: CLUSTER_ID })).rejects.toMatchObject({
      message: 'CLUSTER_EMPTY',
    });
  });

  it('previewCrystallize rejects NOT_FOUND when cluster does not belong to caller', async () => {
    vi.spyOn(sandboxAi, 'synthesizeIdea').mockResolvedValue(fakeFields);
    // Empty clusters list simulates the where(userId=caller) returning nothing
    // because the cluster is owned by someone else.
    const { db } = buildDb({
      clusters: [],
      thoughtsByCluster: {},
    });
    const caller = makeCaller(db);

    await expect(caller.previewCrystallize({ id: CLUSTER_ID })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
