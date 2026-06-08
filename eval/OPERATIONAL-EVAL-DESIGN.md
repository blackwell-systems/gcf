# Operational Eval: Downstream Tool-Call Accuracy

## Context

The comprehension eval proves LLMs read GCF better (90.7% vs 53.6% JSON). The generation eval proves they write it. The missing piece: after reading data in format X, does the model make the correct operational decision? This is what agent builders care about.

## Design

The model receives a code graph payload (tool response) and must produce a JSON tool call with the correct tool name and arguments. Ground truth is deterministic, computed from the payload. No LLM judge.

## Files

- `gcf-go/eval/operational_test.go` - test harness (reuses existing API backends, retry logic, env vars)
- `gcf-go/eval/scenarios.go` - 12 scenario definitions with BuildPayload() and GroundTruth()
- `gcf-go/eval/scoring.go` - parse response, score against ground truth on 5 dimensions

## 12 Scenarios (5 categories)

**A. Tool selection (data tells you which tool)**
1. Dead code detection: find function with zero incoming calls → `delete_symbol`
2. Circular dependency: find cycle in edges → `report_cycle` with sorted symbol list
3. Missing implementation: interface with zero implements edges → `find_implementations`

**B. Argument construction from extracted fields**
4. Refactor target: function with blast radius > threshold → `extract_function` with callers list
5. Test coverage gap: symbol with provenance=ast_inferred and score>0.8 → `get_tests_for_file`
6. Cross-package dependency: edges crossing packages → `check_dependency` with src/tgt packages

**C. Conditional logic (data says "don't act")**
7. No dead code: every function has callers → `no_action`
8. Ambiguous target: two symbols tie for highest blast radius → `report_ambiguity`

**D. Multi-step chaining**
9. Navigate then inspect: bare reference needs detail first → two tool calls in sequence
10. Filter then act: 3 of 5 methods below threshold → `bulk_deprecate` with exact list

**E. Precision under scale**
11. Needle in haystack at 200 symbols: find the one interface in extended → `promote_symbol`
12. Aggregate then decide at 500 symbols: count function ratio, conditional action

## Scoring (5 dimensions, all binary)

| Dimension | What it measures |
|-----------|-----------------|
| Tool Selection | Correct tool name |
| Argument Completeness | All required keys present |
| Argument Correctness | Every value matches ground truth |
| No Hallucination | No extra arguments beyond schema |
| Ordering (chaining only) | Multi-step calls in correct sequence |

## Three sizes per scenario

- Small: 20 symbols, 10 edges (sanity check, all formats should pass)
- Medium: 100 symbols, 50 edges (divergence starts)
- Large: 500 symbols, 200 edges (where formats separate)

12 scenarios x 3 sizes = 36 test cases x 3 formats = 108 LLM calls per run.

## Prompt structure

```
You are an AI coding assistant. You have access to the following tools:

[TOOL SCHEMAS - 3-5 tools per scenario, one correct, rest are distractors]

You just received the following tool response:

[PAYLOAD IN GCF / JSON / TOON]

Task: [scenario-specific instruction, e.g. "Identify any dead code and take appropriate action"]

Respond with a JSON object: {"tool": "<name>", "arguments": {<key>: <value>}}
If no action is warranted: {"tool": "no_action", "arguments": {}}
Respond with ONLY the JSON. No explanation.
```

## Ground truth computation

Each scenario's `GroundTruth(p *gcf.Payload) []ToolCall` computes the correct answer from the payload struct. Same struct used to generate all three encodings. Pure, deterministic.

## Reuse from existing eval infrastructure

- `buildFixture(numSymbols, numEdges)` for base payload generation
- `encodeTOON()` for TOON encoding
- All 5 API backends (cli, api, openai, google, xai)
- Retry logic (OpenAI exponential, Google linear)
- EVAL_BACKEND, EVAL_MODEL, EVAL_TEMPERATURE env vars

## Run command

```bash
cd gcf-go/eval
GOWORK=off go test -run TestOperational -v -timeout 0
EVAL_BACKEND=openai OPENAI_API_KEY=... EVAL_MODEL=gpt-5.5 GOWORK=off go test -run TestOperational -v -timeout 0
```

## Output

```
=== Operational Eval ===
Backend: openai (gpt-5.5)
Scenarios: 12, Sizes: 3, Formats: 3, Total: 108 calls

Scenario              Size   GCF          TOON         JSON
dead_code             20     5/5 (100%)   5/5 (100%)   5/5 (100%)
dead_code             100    5/5 (100%)   4/5 (80%)    3/5 (60%)
dead_code             500    5/5 (100%)   3/5 (60%)    2/5 (40%)
...

Format   Overall  ToolSel  ArgComplete  ArgCorrect  NoHalluc
GCF      91.7%    100%     91.7%        83.3%       100%
TOON     72.2%    83.3%    75.0%        58.3%       91.7%
JSON     58.3%    66.7%    58.3%        41.7%       83.3%
```

## Why this is bulletproof

- **Deterministic**: ground truth computed from payload, no LLM judge
- **Not format-biased**: same data in all three encodings, same task, same tool schemas
- **Different from comprehension**: tests extraction + decision-making + argument construction, not just counting
- **Reproducible**: temperature=0, same command, same results
- **Addresses the criticism directly**: measures wrong tool, missing field, wrong value, hallucinated field, wrong sequence

## Verification

1. Run at small size first (20 symbols) to confirm all scenarios are solvable and ground truth is correct
2. Verify ground truth functions with unit tests (no LLM needed)
3. Run across at least 2 models from different providers
4. Commit all logs to gcf/eval/results/operational/
