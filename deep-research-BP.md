```markdown
# Handling Long-Running Deep Research API Calls

When using the **o3-deep-research** model via the OpenAI API (especially with web search enabled and very large prompts), developers face challenges with **long response times** and potential **timeouts**. Complex research queries (e.g., ~1,000-word prompts) can easily run for **many minutes** and sometimes tens of minutes as the model searches the web and composes a detailed report.

## Recommended Timeout Settings for Deep Research

Default timeouts are often too short. Many SDKs and platforms default to **30 seconds to 2 minutes**, which is insufficient for deep research tasks. Community patterns generally fall into these ranges:

- **At least 10 minutes** for moderate tasks
- **20–35+ minutes** for complex multi-step research (especially with web search tools enabled)
- **Avoid extremely long single-connection timeouts** when possible; prefer async/background execution to reduce brittleness

### Practical guidance

- If you must do a single synchronous request, set a client timeout of **10–30 minutes** (or higher if your infra supports it).
- If you are seeing “undefined output” after long runs, treat it as a symptom of:
  - request/connection timeouts upstream (reverse proxies, serverless gateways)
  - incomplete response handling (stream not fully consumed, or response object not checked correctly)
  - output token limits being too low (response truncation)

## Capturing and Storing Long Outputs Reliably

Deep research models can return **very large outputs**. To avoid losing output, use one or more of:

### 1) Streaming output (recommended)
Stream tokens as they arrive and append to persistent storage (DB/file). This avoids “silent wait” periods and allows partial persistence even if something fails later.

### 2) Background mode (strongly recommended)
Run the request asynchronously (background) so you don’t keep an HTTP connection open for tens of minutes. Store the returned response/job ID and poll for completion.

**Pattern:**
- `POST /v1/responses` with `background=true`
- Save `response_id`
- Poll `GET /v1/responses/{response_id}` until status is `completed` or `failed`
- Persist the final text

### 3) Set `max_output_tokens` high enough
If your deep research output can be long, increase the output cap to something large (often **50k+**). If the model is cut off, you can get incomplete or confusing results.

### 4) Persist results immediately
Don’t keep the whole answer only in memory. Store it in:
- database text blob
- object storage
- append-only logs for streamed chunks

## Asynchronous Processing and Architectural Patterns

To prevent web request timeouts and improve reliability, developers commonly adopt:

### A) Background mode + polling (best overall)
This avoids holding a long-lived connection and makes your system more robust to intermittent network issues.

### B) Job queues / task workers
Queue the research job:
1. user submits request
2. server enqueues a “deep research” task
3. worker calls OpenAI (often with background mode)
4. worker stores results
5. UI polls or receives webhook/WS notification when ready

### C) Chunking the work
Split one huge research task into:
- plan subtopics
- run parallel or sequential research steps
- synthesize into a final summary

Useful when you need predictability or want to bound runtime per step.

### D) Limit tool usage
Cap the number of web searches/tool calls (e.g., `max_tool_calls`) so the model can’t run indefinitely or take unpredictable time.

## Retry Mechanisms and Error Handling

Even with correct timeouts, you’ll occasionally hit:
- network interruptions
- 5XX gateway errors
- transient API errors

Implement:

### 1) Exponential backoff retries
Retry with a delay schedule like 2s, 4s, 8s, 16s (cap at 60s), and stop after 3–6 attempts.

### 2) Retry specific transient errors
Common targets:
- 502 / 503 / 504
- connection resets
- read timeouts

### 3) Don’t retry forever
Set:
- max attempts
- max total elapsed time
- good logging so you can diagnose patterns

### 4) Fallback tactics
If web search is causing extreme latency:
- reduce tool call limits
- narrow prompts
- switch to a faster model variant when acceptable
- swap search tool variants if you have more than one available

## Best Practices Summary

| Strategy | Approach | Benefits |
|---|---|---|
| Increase client timeout | 10–35+ minutes for deep research | Prevents client-side cutoff |
| Background mode + polling | `background=true`, store ID, poll results | Most reliable; no long open connections |
| Streaming output | Stream tokens and persist progressively | Avoids “idle” timeouts and preserves partial output |
| Async job queue | Offload to workers, return immediately | No web request timeouts; scalable |
| Chunking | Break tasks into sub-queries and synthesize | Predictable runtime per step |
| Limit tool calls | Cap web search/tool steps | Prevent runaway latency/cost |
| Retry w/ backoff | Retry transient failures | Higher reliability under load |
| High output limits | Increase `max_output_tokens` | Avoid truncation and incomplete reports |

## Suggested Starting Settings

If you want a practical baseline:

- **Use background mode** for all o3-deep-research calls.
- Poll every **5–15 seconds** for completion.
- Set `max_output_tokens` generously (e.g., **25k–50k**) for reports.
- Set a *job-level SLA* in your app (e.g., **45 minutes**) and mark as failed or “needs retry” if exceeded.
- Implement retries on 5XX errors with exponential backoff (3–5 attempts).

## What to Check If You’re Seeing `undefined` Outputs

1. Are you treating a *pending background response* as if it were final?
2. Are you fully consuming streamed output events before returning?
3. Are you expecting a specific JSON path that’s not present for this model/tool configuration?
4. Are upstream timeouts killing the connection (API gateway, load balancer, serverless runtime)?
5. Are outputs getting truncated due to low `max_output_tokens`?

```markdown
Yes — **token streaming can help**, but it depends on *where* the “undefined” is coming from.

## When streaming helps (common wins)

### 1) You’re getting cut off by an idle timeout
If any layer in your stack (CDN, load balancer, serverless gateway, reverse proxy) kills connections that are “quiet” for too long, streaming often keeps the connection “alive” because bytes keep flowing once generation starts. That reduces the odds of the request being terminated mid-flight.

### 2) You want to persist output safely as it arrives
If you stream and append text chunks to a DB/file as they come in, you won’t lose everything if:
- the connection drops late
- your worker crashes
- the client closes

You’ll have partial output rather than `undefined`.

### 3) You want better UX
Streaming lets you show “working…” with partial text, which makes a 10–30 minute job feel less broken.

## When streaming won’t help (and what does)

### 1) The model is doing web-search/tool work for a long time before it emits tokens
Deep research + web search can spend a long time gathering sources before it writes anything substantial. Streaming doesn’t solve “nothing is emitted for 5–20 minutes.”

In that case, **background mode + polling** is the correct fix because you aren’t depending on an open connection at all.

### 2) Your code is reading the wrong field, so it becomes `undefined`
This is extremely common with Responses API because the output isn’t always in a single `text` field. Streaming won’t fix a parsing bug. You still need to extract the final text from the correct path (or concatenate the streamed deltas).

### 3) Your platform has a hard cap on request duration
If you’re in an environment with a fixed max request time (many serverless providers), streaming might delay termination, but it won’t bypass a hard limit. Again: **run it asynchronously**.

## Practical recommendation for your case
Given you’re doing **o3-deep-research + web search** and seeing `undefined` due to “takes too long,” the most robust pattern is:

- **Use `background: true`** so the request returns immediately with an ID
- **Poll** for completion (or use a webhook)
- Optionally **stream** once the job transitions into a “writing” phase, but don’t rely on streaming alone

Streaming is helpful, but **background mode is the real solution** for deep research workloads.

## How to decide in 30 seconds
- If you see **timeouts / broken connections**: streaming can help.
- If you see **very long “thinking” / searching** with little output: streaming won’t help much; use background mode.
- If you see **undefined because of JSON structure**: fix extraction logic.
```

