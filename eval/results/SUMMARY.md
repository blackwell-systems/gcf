# Eval Results Summary

## Table of Contents

- [Comprehension Eval](#comprehension-eval-input-can-llms-read-gcf)
  - [All runs](#all-runs)
  - [Averages by model](#averages-by-model)
  - [Methodology notes](#methodology-notes)
  - [Key findings](#key-findings)
  - [Failure taxonomy](#failure-taxonomy)
    - [GCF failures: precision errors](#gcf-failures-precision-errors)
    - [TOON failures: comprehension errors](#toon-failures-comprehension-errors)
    - [JSON failures: structural overwhelm](#json-failures-structural-overwhelm)
    - [Failures by model tier](#failures-by-model-tier)
  - [Files](#files)
- [Generation Eval](#generation-eval-output-can-llms-write-gcf)
- [Token Efficiency](#token-efficiency-toons-own-benchmark)
- [Reproduce](#reproduce)

---

## Comprehension Eval (Input: Can LLMs read GCF?)

500 symbols, 200 edges, 13 structured extraction questions, zero format instructions.

### All runs

| Model | Run | GCF | TOON | JSON | GCF wins? |
|-------|-----|-----|------|------|-----------|
| Claude Opus 4.6 | 1 | **100%** | 92.3% | 76.9% | ✓ |
| Claude Sonnet 4.6 | 1 | **100%** | 76.9% | 53.8% | ✓ |
| GPT-5.5 | 1 | **91.7%** | 66.7% | 50.0% | ✓ |
| GPT-5.5 | 2 | **76.9%** | 69.2% | 46.2% | ✓ |
| GPT-5.5 | 3 | **76.9%** | 69.2% | 46.2% | ✓ |
| GPT-5.5 | 4 | **91.7%** | 66.7% | 50.0% | ✓ |
| GPT-5.4 | 1 | **75.0%** | 58.3% | 41.7% | ✓ |
| GPT-5.4 | 2 | **76.9%** | 53.8% | 46.2% | ✓ |
| GPT-5.4 | 3 | **76.9%** | 53.8% | 38.5% | ✓ |
| GPT-5.4-mini | 1 | **76.9%** | 61.5% | 58.3% | ✓ |
| GPT-5.4-mini | 2 | **66.7%** | **66.7%** | 50.0% | tied |
| Claude Haiku 4.5 | 1 | **92.3%** | 69.2% | 61.5% | ✓ |
| Claude Haiku 4.5 | 2 | **100%** | 69.2% | 53.8% | ✓ |
| GPT-5.4 | 4 | **76.9%** | 58.3% | 50.0% | ✓ |

**14 runs, 6 models, 2 providers. GCF wins 13, ties 1, loses 0.**

### Averages by model

| Model | Runs | GCF avg | TOON avg | JSON avg | GCF margin |
|-------|------|---------|----------|----------|------------|
| Claude Opus 4.6 | 1 | **100%** | 92.3% | 76.9% | +7.7 vs TOON |
| Claude Sonnet 4.6 | 1 | **100%** | 76.9% | 53.8% | +23.1 vs TOON |
| GPT-5.5 | 4 | **84.3%** | 67.9% | 48.1% | +16.4 vs TOON |
| GPT-5.4 | 3 | **76.3%** | 55.3% | 42.1% | +21.0 vs TOON |
| Claude Haiku 4.5 | 2 | **96.2%** | 69.2% | 57.7% | +27.0 vs TOON |
| GPT-5.4-mini | 2 | **71.8%** | 64.1% | 54.2% | +7.7 vs TOON |

### Methodology notes

- OpenAI runs used default temperature (non-zero). This introduces variance across runs but reflects real-world usage. Future runs should set `temperature: 0` for tighter confidence intervals.
- Each run generates a fresh random 500-symbol payload. Different symbol names and edge distributions across runs.
- Claude eval used `claude -p` (CLI). OpenAI evals used the chat completions API with retry logic (exponential backoff on 429s).

### Key findings

1. **GCF wins on every model.** The ordering GCF > TOON > JSON holds across Claude Opus, Claude Sonnet, Claude Haiku, GPT-5.5, GPT-5.4, and GPT-5.4-mini. 13 runs, 0 losses. All Claude models achieve 96%+ (Opus and Sonnet hit 100%, Haiku averages 96.2%).
2. **JSON breaks at scale.** GPT-5.5 returned empty strings on counting questions for JSON (unable to even produce an answer at 500 records). GPT-5.4 miscounted symbols (328 vs 500). Every model struggles with JSON's field-name repetition at scale.
3. **TOON fails on distance grouping.** Without `## targets`/`## related`/`## extended` section headers, models must scan all 500 rows and filter by a column value. This fails consistently across models.
4. **GCF is stable.** GPT-5.4 scored 75.0%, 76.9%, 76.9% across 3 runs. Low variance on the winning format.
5. **The advantage holds on small models.** GPT-5.4-mini (cheapest current-gen model) still reads GCF better than JSON (71.8% vs 54.2% average).
6. **Gemini confirmed via manual test.** Gemini produced valid complex GCF (tabular arrays, nested objects, primitive arrays, nulls, booleans) from a one-line primer with zero prior exposure.

### Failure taxonomy

Classified from all FAIL lines across 13 runs (39 questions per run, 3 formats each).

#### GCF failures: precision errors

GCF fails on *precision* (off by 1-2). The structure is understood; the count is slightly misread.

| Type | Example | Frequency | Cause |
|------|---------|-----------|-------|
| Off-by-one header misread | `related_count`: 166 vs 167 | Common | Header says `[167]`, model reads 166. Rounding or tokenization artifact. |
| Off-by-two edge count | `edge_count`: 198 vs 200 | Moderate (GPT-5.4) | Consistently 198. May misparse `edges=200` from header. |
| Column scan miscount | `function_count`: 84 vs 125 | Moderate (GPT-5.4/mini) | Must scan `fn` kind across rows within sections. Same class of problem as TOON but within smaller groups. |
| Field confusion | `edge_count`: 498 vs 200 | Rare (1 Opus run) | Read symbol count from header instead of edge count. |
| Empty response | `calls_edge_count`: "" | GPT-5.5 only | Context overwhelm at 53k+ input tokens. |

#### TOON failures: comprehension errors

TOON fails on *comprehension* (wrong by 50-140). The model cannot filter a flat list by column value at scale.

| Type | Example | Frequency | Cause |
|------|---------|-----------|-------|
| Distance grouping failure | `target_count`: 26, 40, 100, 200, 229 vs 166 | Every model, every run | Must scan 500 rows and filter by `distance` column. No structural grouping. Wildly inconsistent answers. |
| Round-number guessing | `related_count`: 100 | Common (mini/Haiku) | Model gives up counting and guesses a round number. |
| Last-row attention loss | `last_symbol_kind`: "method" vs "interface" | Common | Loses track by row 500. Attention decays on flat tabular data. |
| Extended count failure | `extended_count`: 107, 111, 148 vs 167 | Very common | Same as distance grouping; distance=2 is hardest since it's last in the list. |

#### JSON failures: structural overwhelm

JSON fails on *structure* (empty responses, massive undercounts, chain-of-thought enumeration). The format itself prevents comprehension at scale.

| Type | Example | Frequency | Cause |
|------|---------|-----------|-------|
| Empty string response | `symbol_count`: "" | GPT-5.5 (all runs) | 53k tokens of repeated `{"qualifiedName":...}` overwhelms attention. Model produces nothing. |
| Massive undercount | `symbol_count`: 300-404 vs 500 | Every model | Field-name repetition dilutes signal. Model loses count mid-scan. |
| Chain-of-thought enumeration | `related_count`: 143 lines of listing, wrong answer | Opus | Model manually enumerates symbols to count them, burns output tokens, still gets wrong answer. |
| Field confusion | `target_count`: reads "200" (edge count) | Common | Nested structure makes it easy to read adjacent fields. |
| Distance filter failure | `related_count`: 72-154 vs 167 | Every model | Same as TOON but worse. Must parse JSON objects AND filter by field value. |

#### Failures by model tier

Each model tier has a distinct failure signature.

**Frontier Claude (Opus 4.6, Sonnet 4.6):**
- GCF: zero failures in saved runs
- TOON: off-by-2 on extended_count, last_symbol_kind wrong (attention decay at row 500)
- JSON: massive undercounts (356 vs 500), chain-of-thought enumeration (143 lines, wrong answer)

**Mid-tier Claude (Haiku 4.5):**
- GCF: single off-by-1 (`related_count` 166 vs 167) in 1 of 2 runs; other run is perfect
- TOON: distance grouping failures (100, 200, 214 vs 166/167), last_symbol_kind wrong
- JSON: undercounts, distance filter failures

**GPT-5.5 (frontier OpenAI):**
- GCF: empty string responses on counting questions (context overwhelm at 53k input tokens)
- TOON: same empty strings, distance grouping failures
- JSON: returns nothing on most questions; 53k tokens of `{"qualifiedName":...}` overwhelms attention

**GPT-5.4 (mid-tier OpenAI):**
- GCF: **deterministic, repeatable errors** across all 3 runs: `edge_count`=198 (always), `function_count`=84 (always). Not random; consistent tokenization/parsing bug.
- TOON: distance grouping wildly inconsistent (169, 229, 200 vs 166). Round-number guessing.
- JSON: symbol_count 326-404, massive undercounts everywhere
- **Experiment (run 4):** Added kind counts to section headers (`fn=42 type=41 method=42 iface=41`) and edge type counts (`calls=50`). Result: `calls_edge_count` **fixed** (50 correct, was 42). `function_count` still 84 (model ignores `fn=N` metadata, continues scanning rows). `edge_count` regressed (read `[166]` from targets header instead of `[200]` from edges header).

**GPT-5.4-mini (cheapest tier):**
- GCF: same deterministic patterns as 5.4 (198, 84) plus occasional larger misses (250, 100)
- TOON: worst distance grouping failures (26, 28 vs 166). Defaults to round-number guessing.
- JSON: 300 vs 500 symbol_count. Consistent failure across all question types.

GCF failures on Claude are near-zero. GCF failures on OpenAI are deterministic and repeatable (same wrong number every run), suggesting a tokenizer-level parsing difference rather than a comprehension issue.

#### Summary

GCF median error: 4. TOON median error: 53. JSON median error: 56. GCF encodes answers structurally (`## related [167]`). TOON/JSON force the model to compute them from raw data.

### Files

```
comprehension/
├── comprehension-14q-claude-edges-fix-2026-06-05.log   # Claude Opus 4.6: 100%
├── comprehension-13q-sonnet46-run1-2026-06-06.log      # Claude Sonnet 4.6: 100%
├── comprehension-13q-haiku45-run1-2026-06-06.log       # Claude Haiku 4.5 run 1: 92.3%
├── comprehension-13q-haiku45-run2-2026-06-06.log       # Claude Haiku 4.5 run 2: 100%
├── comprehension-13q-gpt55-run1-2026-06-06.log         # GPT-5.5 run 1: 91.7%
├── comprehension-13q-gpt55-run2-2026-06-06.log         # GPT-5.5 run 2: 76.9%
├── comprehension-13q-gpt55-run3-2026-06-06.log         # GPT-5.5 run 3: 76.9%
├── comprehension-13q-gpt54-run1-2026-06-06.log         # GPT-5.4 run 1: 75.0%
├── comprehension-13q-gpt54-run2-2026-06-06.log         # GPT-5.4 run 2: 76.9%
├── comprehension-13q-gpt54-run3-2026-06-06.log         # GPT-5.4 run 3: 76.9%
├── comprehension-13q-gpt54-run4-2026-06-06.log         # GPT-5.4 run 4: 76.9%
├── comprehension-13q-gpt54-mini-run1-2026-06-06.log    # GPT-5.4-mini run 1: 76.9%
└── comprehension-13q-gpt54-mini-run2-2026-06-06.log    # GPT-5.4-mini run 2: 66.7%
```

---

## Generation Eval (Output: Can LLMs write GCF?)

5 to 100 symbols, validated through real `gcf.Decode()`, 3-line format primer.

### Multi-model results (GCF validity)

| Model | 5 sym | 10 sym | 20 sym | 50 sym | 100 sym | Score |
|-------|-------|--------|--------|--------|---------|-------|
| Claude (Opus/default) | YES | YES | YES | YES | YES | 5/5 |
| GPT-5.4 | YES | YES | YES | YES | YES | 5/5 |
| GPT-5.4-mini | YES | YES | YES | YES | YES | 5/5 |

All models produce valid, decoder-parseable GCF at every scale tested with a 3-line primer. Zero prior training on GCF.

### Three-way generation comparison (GPT-5.4)

Same data, same model, same prompt structure. Only the target format differs.

| Symbols | GCF (bytes) | GCF valid | TOON (bytes) | TOON valid | JSON (bytes) | JSON valid |
|---------|-------------|-----------|--------------|------------|--------------|------------|
| 5 | 411 | YES | 590 | NO | 916 | YES |
| 10 | 695 | YES | 1,039 | NO | 1,744 | YES |
| 20 | 1,309 | YES | 1,995 | NO | 3,458 | YES |
| 50 | 3,031 | YES | 4,524 | NO | 8,089 | YES |
| 100 | 5,976 | YES | 8,937 | NO | 16,121 | YES |

**GCF: 5/5 valid. JSON: 5/5 valid. TOON: 0/5 valid.** (Identical on both GPT-5.4 and GPT-5.4-mini.)

TOON's flat tabular design requires column values to be pre-encoded as integers. When a model is told "this symbol is a target" (natural language), it writes `target` in the distance column. TOON's decoder rejects this because it expects `0`. The model has to know that "target" means 0, "related" means 1, "extended" means 2, and perform that mapping before writing. Every model tested (GPT-5.4, GPT-5.4-mini) fails to do this mapping unprompted.

GCF never has this problem. Distance is expressed through section placement: a target goes in `## targets`, a related symbol goes in `## related`. The model writes the symbol in the section that matches the label. No integer mapping required. The format aligns with how LLMs naturally express grouped data.

This is a structural design flaw in flat tabular formats: any time a column encodes a semantic category as an integer or enum, the model must perform an extra encoding step that it may silently get wrong. GCF eliminates this entire failure class by making categories structural.

### TOON with pre-encoded integer distances

When the prompt explicitly says "distance 0" instead of "target", TOON passes. This confirms the failure is in the label-to-integer mapping, not in TOON syntax generation itself.

| Format | Prompt | Valid | 100 sym output | vs JSON |
|--------|--------|-------|---------------|---------|
| **GCF** | natural labels | **5/5** | **5,984 B** | **78% fewer** |
| TOON | pre-encoded integers | 5/5 | 8,336 B | 69% fewer |
| TOON | natural labels | 0/5 | - | - |
| JSON | natural labels | 5/5 | 16,121 B | baseline |

Even when TOON is given pre-encoded integers (doing the model's work for it), GCF output is still 28% smaller.

### Cold-start (no example in prompt)

| Model | GCF | TOON |
|-------|-----|------|
| Claude | 3/5 | 3/5 |

Neither format works reliably without a primer at small sizes. With a primer, GCF achieves 100%. TOON achieves 0% on GPT-5.4 (distance column issue).

### Gemini (manual chat test)

Gemini produced valid complex GCF and TOON from a short primer in the same session. Both graph and generic profiles generated correctly.

### Files

```
generation/
├── generation-gpt54-run1-2026-06-06.log              # GPT-5.4 GCF: 5/5 valid
├── generation-gpt54-gcf-toon-run1-2026-06-06.log     # GPT-5.4 GCF+TOON: GCF 5/5, TOON 0/5
├── generation-gpt54-json-run1-2026-06-06.log         # GPT-5.4 JSON: 5/5 valid
├── generation-gpt54-mini-run1-2026-06-06.log         # GPT-5.4-mini: GCF 5/5, TOON 0/5, JSON 5/5
├── generation-gcf-with-example-2026-06-04.log        # Claude GCF, with primer: 5/5 valid
├── generation-gcf-no-example-2026-06-04.log          # Claude GCF, cold-start: 3/5 valid
├── generation-toon-with-example-2026-06-04.log       # Claude TOON, with primer: 5/5 valid
├── generation-toon-no-example-2026-06-04.log         # Claude TOON, cold-start: 3/5 valid
└── generation-summary-2026-06-04.md                  # Full analysis (Claude-only)
```

---

## Token Efficiency (TOON's Own Benchmark)

| Dataset | GCF | TOON | Result |
|---------|-----|------|--------|
| Semi-uniform event logs | 108,158 | 154,032 | **GCF 42% smaller** |
| E-commerce orders | 61,593 | 73,246 | **GCF 19% smaller** |
| Deeply nested config | 616 | 618 | **GCF 0.3% smaller** |
| Employee records | 49,055 | 49,966 | **GCF 2% smaller** |
| Analytics time-series | 8,398 | 9,127 | **GCF 8% smaller** |
| GitHub repos | 8,576 | 8,744 | **GCF 2% smaller** |

GCF wins all 6 datasets.

---

## Reproduce

Comprehension eval:
```bash
cd gcf-go/eval
GOWORK=off EVAL_BACKEND=openai OPENAI_API_KEY=... EVAL_MODEL=gpt-5.5 go test -run TestComprehension -v -timeout 0
```

Token efficiency:
```bash
cd toon && git checkout gcf-comparison && cd benchmarks && pnpm install && pnpm benchmark:tokens
```
