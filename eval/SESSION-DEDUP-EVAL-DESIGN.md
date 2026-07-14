# Session Dedup Comprehension Eval

## Question

Does an LLM correctly resolve bare references (`@0  # previously transmitted`) to their original declarations from earlier in the conversation when using GCF session deduplication?

## Hypothesis

LLMs maintain conversational state across tool responses in the context window. A symbol declared as `@0 svc spine-dc-042.corp.net 0.00 network` in call 1 should be correctly referenced when it appears as `@0  # previously transmitted` in call 3. The model has the full conversation history; it does not need the symbol re-declared.

## Design

Simulate a multi-call agent session. Each call returns a GCF payload. Questions are asked at increasing session depth to test whether bare references degrade comprehension.

### Session structure

**Call 1 (full declarations):** 50 network devices, 80 links. Full GCF graph profile. Every symbol has a complete declaration.

**Call 2 (session dedup, 80% bare refs):** Same 50 devices + 10 new devices. 40 of the original 50 become bare references. 10 are new full declarations. 90 links.

**Call 3 (session dedup, 90% bare refs):** Same 60 devices + 5 new devices. 55 bare references, 5 new. 100 links.

**Call 4 (delta only):** 2 devices removed, 3 added. Only the diff is transmitted.

### Questions (asked after each call)

Same question set, adapted to the current state. All have deterministic ground truth computed from the payload:

1. **Symbol count:** "How many devices are in the current topology?"
2. **Attribute lookup on bare ref:** "What is the role of device spine-dc-042.corp.net?" (This device was declared in call 1 and is a bare ref in calls 2-4.)
3. **Edge traversal through bare ref:** "Which devices are directly connected to spine-dc-042.corp.net?" (Requires resolving the bare ref to find edges referencing @0.)
4. **Filtering across refs:** "How many spine devices are in the topology?" (Requires resolving roles from call 1 declarations for bare-ref devices.)
5. **Delta comprehension (call 4 only):** "Which devices were removed since the last update?"

### Formats

Three conditions per call:
- **GCF with session dedup:** Bare references for known symbols.
- **GCF without session (full retransmission):** Every call is a complete payload. Baseline.
- **JSON (full retransmission):** Standard JSON. Second baseline.

### Metrics

| Metric | Definition |
|--------|-----------|
| Accuracy | Correct answer / total questions |
| Bare-ref resolution rate | Accuracy on questions requiring bare-ref resolution (Q2, Q3, Q4) |
| Session depth tolerance | Deepest call where accuracy remains >= 90% |
| Delta comprehension | Accuracy on Q5 (delta-only call) |

### Success criteria

1. Session dedup accuracy is within 5% of full-retransmission accuracy at every session depth.
2. Bare-ref resolution rate is >= 90% through call 3.
3. Delta comprehension (Q5) is >= 80%.
4. No model shows catastrophic failure (accuracy dropping below 50%) on any session-dedup question.

### Failure criteria

1. Accuracy on session-dedup calls drops more than 15% below full-retransmission baseline.
2. Any question that requires bare-ref resolution scores below 60%.
3. Delta-only call (call 4) accuracy below 50%.

## Implementation

### Location

`gcf-go/eval/session_dedup_test.go`

Reuses existing eval infrastructure: multi-backend (claude, openai, google), retry logic, EVAL_BACKEND/EVAL_MODEL/EVAL_TEMPERATURE env vars.

### Data generation

- `buildSessionPayloads(seed int) []SessionCall` generates a deterministic 4-call session with known ground truth.
- Each `SessionCall` has: `GCFWithSession string`, `GCFFullRetransmit string`, `JSON string`, `Questions []Question`, `GroundTruth map[string]string`.
- Ground truth computed from the payload struct, not from the encoding.

### Run command

```bash
cd gcf-go/eval
GOWORK=off go test -run TestSessionDedup -v -timeout 0

# Specific backend
EVAL_BACKEND=openai OPENAI_API_KEY=... EVAL_MODEL=gpt-5.5 GOWORK=off go test -run TestSessionDedup -v -timeout 0
```

### Output

```
=== Session Dedup Eval ===
Backend: claude (opus-4-6)

Call  Format              Q1    Q2    Q3    Q4    Q5    Avg
1    GCF (full)          100%  100%  100%  100%  n/a   100%
1    JSON                100%  100%  100%  100%  n/a   100%
2    GCF (session dedup) 100%  100%  100%   80%  n/a    95%
2    GCF (full)          100%  100%  100%  100%  n/a   100%
2    JSON                100%  100%  100%  100%  n/a   100%
3    GCF (session dedup) 100%  100%   80%   80%  n/a    90%
3    GCF (full)          100%  100%  100%  100%  n/a   100%
3    JSON                100%   80%  100%   80%  n/a    90%
4    GCF (delta only)    100%  100%   80%   80%  100%   92%

Summary:
  Session dedup avg accuracy: 93%
  Full retransmit avg accuracy: 100%
  JSON avg accuracy: 97%
  Bare-ref resolution rate: 90%
  Session depth tolerance: call 3 (90%)
  Delta comprehension: 100%
```

### Estimated cost

4 calls x 3 formats x 5 questions = 60 LLM calls per model per run.
At ~1K tokens per call: ~60K tokens per run.
~$0.10-0.50 per run depending on model.

## Why this matters

Session dedup is GCF's most aggressive optimization. At call 5 on a 500-symbol session, it saves ~86% vs JSON (94% stacked with delta). But if the LLM can't resolve bare references to earlier declarations, the savings are worthless. This eval proves whether the optimization is safe to deploy in production agent pipelines.

The result also informs the session depth limit: if accuracy degrades past call 3, implementations should periodically retransmit full declarations to refresh the model's working memory.
