# OpenAI Batch API Integration Plan

## Executive Summary

Integrate OpenAI's Batch API to achieve **50% cost reduction on ALL API calls** - both o3-deep-research (Phase 1-2) AND GPT-5.2 (Phase 3-4). The Batch API supports the `/v1/responses` endpoint which is used by both deep research and extraction calls.

**Key Discovery:** o3-deep-research IS compatible with Batch API. Per OpenAI documentation:
> "Deep research tasks are long-running and are inherently designed for asynchronous processing. The Batch API is the recommended way to handle these types of jobs efficiently."

**Estimated Savings:** 50% cost reduction on ALL 15+ API calls per research
- o3-deep-research: $10/$40 → $5/$20 per M tokens (50% off)
- GPT-5.2: $1.75/$7 → $0.875/$3.50 per M tokens (50% off)

---

## Current vs. Proposed Architecture

### Current: Background Mode + Polling
```
Research Start
    ↓
Phase 1-2: o3-deep-research (6 calls)
    → startBackgroundResearch() → pollForCompletion() [every 10-15s]
    ↓
Phase 3-4: GPT-5.2 (9 calls)
    → openai.responses.create() [sync, parallel where possible]
    ↓
Complete (45+ minutes)
```

### Proposed: Batch API (Two-Phase Submission)
```
Research Start
    ↓
Build JSONL for Phase 1-2 (6 deep research requests)
    ↓
Submit Batch 1 → batches.create()
    ↓
Poll batch status [every 60s] → batches.retrieve()
    ↓
Download results → files.content()
    ↓
Build JSONL for Phase 3-4 (9 extraction/generation requests)
    ↓
Submit Batch 2 → batches.create()
    ↓
Poll and download results
    ↓
Parse and save (24hr max, typically 30-60 min total)
```

---

## Batch API JSONL Format for Deep Research

Based on OpenAI documentation, deep research requests in batch format:

```jsonl
{"custom_id":"market-chunk","method":"POST","url":"/v1/responses","body":{"model":"o3-deep-research-2025-06-26","input":[{"role":"developer","content":[{"type":"input_text","text":"System prompt..."}]},{"role":"user","content":[{"type":"input_text","text":"Research query..."}]}],"tools":[{"type":"web_search_preview","filters":{"allowed_domains":["statista.com","mckinsey.com"]}}],"max_output_tokens":50000,"background":true,"reasoning":{"summary":"detailed"}}}
{"custom_id":"competitor-chunk","method":"POST","url":"/v1/responses","body":{...}}
{"custom_id":"insights","method":"POST","url":"/v1/responses","body":{"model":"gpt-5.2","input":"...","max_output_tokens":25000,"text":{"format":{"type":"json_object"}}}}
```

**Critical:** Include `"background": true` in body for deep research requests.

---

## API Calls Per Research (All Batch-Eligible)

| Phase | Model | Calls | Tokens Est. | Current Cost | Batch Cost |
|-------|-------|-------|-------------|--------------|------------|
| 1: Deep Research | o3-deep-research | 5 chunks | ~250k | ~$12.50 | ~$6.25 |
| 2: Social Proof | o3-deep-research | 1 | ~50k | ~$2.50 | ~$1.25 |
| 3: Extraction | GPT-5.2 | 5 | ~71k | ~$0.62 | ~$0.31 |
| 4: Generation | GPT-5.2 | 4 | ~20k | ~$0.18 | ~$0.09 |
| **TOTAL** | | **15** | **~391k** | **~$15.80** | **~$7.90** |

**Savings per research: ~$7.90 (50%)**

---

## Implementation Plan

### Files to Modify

| File | Changes |
|------|---------|
| `BETA/packages/server/src/lib/deep-research.ts` | Add batch request builders |
| `BETA/packages/server/src/services/research-ai.ts` | Refactor to batch mode |
| `BETA/packages/server/src/routers/research.ts` | Update pipeline orchestration |
| `BETA/packages/server/src/services/config.ts` | Add batch config keys |

### New Files

| File | Purpose |
|------|---------|
| `BETA/packages/server/src/lib/batch-api.ts` | Batch API utilities |

---

## Detailed Implementation Steps

### Step 1: Create Batch API Utilities

```typescript
// BETA/packages/server/src/lib/batch-api.ts

import OpenAI from 'openai';
import { openai } from './openai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

interface BatchRequest {
  custom_id: string;
  method: 'POST';
  url: '/v1/responses';
  body: Record<string, unknown>;
}

interface BatchResult {
  custom_id: string;
  response: {
    status_code: number;
    body: unknown;
  };
  error?: { message: string };
}

/**
 * Create JSONL content from batch requests
 */
export function createBatchJsonl(requests: BatchRequest[]): string {
  return requests.map(r => JSON.stringify(r)).join('\n');
}

/**
 * Submit a batch job and return the batch ID
 */
export async function submitBatch(
  requests: BatchRequest[],
  metadata?: Record<string, string>
): Promise<string> {
  // Create JSONL content
  const jsonl = createBatchJsonl(requests);

  // Write to temp file
  const tempFile = path.join(os.tmpdir(), `batch-${Date.now()}.jsonl`);
  fs.writeFileSync(tempFile, jsonl);

  try {
    // Upload file
    const file = await openai.files.create({
      file: fs.createReadStream(tempFile),
      purpose: 'batch',
    });

    // Create batch
    const batch = await openai.batches.create({
      input_file_id: file.id,
      endpoint: '/v1/responses',
      completion_window: '24h',
      metadata,
    });

    return batch.id;
  } finally {
    // Cleanup temp file
    fs.unlinkSync(tempFile);
  }
}

/**
 * Poll for batch completion
 */
export async function waitForBatch(
  batchId: string,
  options: {
    pollIntervalMs?: number;
    maxWaitMs?: number;
    onProgress?: (status: string, completed: number, total: number) => void;
  } = {}
): Promise<BatchResult[]> {
  const {
    pollIntervalMs = 60000, // 1 minute
    maxWaitMs = 3600000,    // 1 hour
    onProgress,
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const batch = await openai.batches.retrieve(batchId);

    if (onProgress) {
      onProgress(
        batch.status,
        batch.request_counts.completed,
        batch.request_counts.total
      );
    }

    if (batch.status === 'completed') {
      // Download results
      const fileContent = await openai.files.content(batch.output_file_id!);
      const text = await fileContent.text();

      // Parse JSONL results
      return text.trim().split('\n').map(line => JSON.parse(line));
    }

    if (batch.status === 'failed' || batch.status === 'expired' || batch.status === 'cancelled') {
      throw new Error(`Batch ${batchId} ended with status: ${batch.status}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Batch ${batchId} timed out after ${maxWaitMs}ms`);
}

/**
 * Parse batch results into a map by custom_id
 */
export function parseBatchResults(results: BatchResult[]): Map<string, unknown> {
  const map = new Map<string, unknown>();

  for (const result of results) {
    if (result.error) {
      console.error(`Batch request ${result.custom_id} failed:`, result.error.message);
      continue;
    }

    map.set(result.custom_id, result.response.body);
  }

  return map;
}
```

### Step 2: Add Batch Request Builders

```typescript
// Add to deep-research.ts

/**
 * Build a batch request for deep research
 */
export function buildDeepResearchBatchRequest(
  customId: string,
  options: DeepResearchOptions
): BatchRequest {
  const params = createDeepResearchParams({
    ...options,
    background: true, // Required for batch deep research
  });

  return {
    custom_id: customId,
    method: 'POST',
    url: '/v1/responses',
    body: params,
  };
}
```

### Step 3: Refactor Research Pipeline

```typescript
// In research-ai.ts

export async function runBatchedResearchPipeline(
  input: ResearchInput,
  tier: SubscriptionTier,
  onProgress?: (phase: string, progress: number) => void
): Promise<ResearchResult> {
  const requests: BatchRequest[] = [];

  // Phase 1: Deep Research Chunks
  const model = getDeepResearchModel(tier);
  const chunks = getResearchChunks();

  for (const chunk of chunks) {
    requests.push(buildDeepResearchBatchRequest(
      `deep-${chunk.id}`,
      {
        model,
        systemPrompt: createChunkSystemPrompt(chunk, input),
        userQuery: createChunkQuery(chunk, input),
        domains: chunk.getDomains(),
        background: true,
        maxOutputTokens: 50000,
      }
    ));
  }

  // Phase 2: Social Proof
  requests.push(buildDeepResearchBatchRequest(
    'social-proof',
    {
      model,
      systemPrompt: createSocialProofSystemPrompt(input),
      userQuery: createSocialProofQuery(input),
      domains: SEARCH_DOMAINS.social,
      background: true,
    }
  ));

  // Submit Phase 1-2 batch
  onProgress?.('DEEP_RESEARCH', 5);
  const batchId = await submitBatch(requests, { phase: 'deep-research' });

  // Poll for completion
  const results = await waitForBatch(batchId, {
    pollIntervalMs: 60000,
    maxWaitMs: 3600000,
    onProgress: (status, completed, total) => {
      const progress = 5 + (completed / total) * 50;
      onProgress?.('DEEP_RESEARCH', progress);
    },
  });

  // Parse Phase 1-2 results
  const resultMap = parseBatchResults(results);
  const deepResearchContent = combineChunkResults(resultMap, chunks);
  const socialProof = parseSocialProofResult(resultMap.get('social-proof'));

  // Phase 3-4: Submit extraction + generation batch
  const extractionRequests = buildExtractionRequests(deepResearchContent, tier);
  const generationRequests = buildGenerationRequests(deepResearchContent, tier);

  onProgress?.('SYNTHESIS', 55);
  const batch2Id = await submitBatch([...extractionRequests, ...generationRequests]);

  const results2 = await waitForBatch(batch2Id, {
    pollIntervalMs: 30000,
    maxWaitMs: 1800000,
    onProgress: (status, completed, total) => {
      const progress = 55 + (completed / total) * 45;
      onProgress?.('SYNTHESIS', progress);
    },
  });

  // Parse and return final results
  const resultMap2 = parseBatchResults(results2);
  return assembleResearchResult(resultMap2, deepResearchContent, socialProof);
}
```

### Step 4: Configuration

```typescript
// In config.ts
'research.useBatchApi': true,
'research.batchPollInterval': 60000,   // 60 seconds
'research.batchTimeout': 3600000,      // 1 hour (user decision)
'research.batchTwoPhase': true,        // Submit Phase 1-2, then Phase 3-4
```

---

## Two-Phase vs. Single Batch Strategy

### Option A: Two Batches (Recommended)
1. **Batch 1**: Deep research chunks + social proof (6 requests)
2. Wait for completion (~30-60 min)
3. **Batch 2**: Extraction + generation using Phase 1 results (9 requests)
4. Wait for completion (~5-15 min)

**Pros:** Extraction prompts can include deep research context
**Cons:** Two batch submissions

### Option B: Single Batch (All 15 requests)
Submit all requests at once, but extraction requests use placeholder context.

**Pros:** Single submission, simpler flow
**Cons:** Extraction quality may suffer without deep research context

**Recommendation:** Option A (Two Batches) - maintains current quality

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Batch takes >24h | Monitor batch status, alert if >2h |
| Partial failures | Handle per-request errors, retry failed items in sync mode |
| Deep research fails | Fall back to sync mode for individual chunks |
| Context dependency | Two-phase approach ensures extraction has deep research context |

---

## Testing Strategy

1. **Unit tests**: Batch request building, JSONL formatting
2. **Integration test**: Submit small batch (1 deep research + 1 extraction)
3. **Full pipeline test**: Run complete research with batch mode
4. **Cost verification**: Compare OpenAI dashboard costs before/after

---

## Verification Plan

1. Enable batch mode for a single test research
2. Monitor batch status in OpenAI dashboard
3. Verify output quality matches sync mode
4. Confirm 50% cost reduction in billing

---

## User Decisions

✅ **Latency tolerance**: Acceptable - user is fine with 24hr delivery if needed
✅ **Fallback strategy**: Wait up to 1 hour, then fail (no sync fallback)
✅ **Feature flag scope**: Enable for all users

---

## Cost Projection

| Scale | Current Monthly | With Batch API | Savings |
|-------|-----------------|----------------|---------|
| 100 researches | ~$1,580 | ~$790 | $790 |
| 1,000 researches | ~$15,800 | ~$7,900 | $7,900 |
| 10,000 researches | ~$158,000 | ~$79,000 | $79,000 |

---

## Sources

- [Batch API Documentation](https://platform.openai.com/docs/guides/batch) - `/v1/responses` supported
- [Deep Research Guide](https://platform.openai.com/docs/guides/deep-research) - Recommends Batch API
- [o3-deep-research Model](https://platform.openai.com/docs/models/o3-deep-research) - Batch API compatible
- [OpenAI Pricing](https://platform.openai.com/docs/pricing) - 50% batch discount
