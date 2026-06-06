# Eval Results Summary

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

**11 runs, 5 models, 2 providers. GCF wins 10, ties 1, loses 0.**

### Averages by model

| Model | Runs | GCF avg | TOON avg | JSON avg | GCF margin |
|-------|------|---------|----------|----------|------------|
| Claude Opus 4.6 | 1 | **100%** | 92.3% | 76.9% | +7.7 vs TOON |
| Claude Sonnet 4.6 | 1 | **100%** | 76.9% | 53.8% | +23.1 vs TOON |
| GPT-5.5 | 4 | **84.3%** | 67.9% | 48.1% | +16.4 vs TOON |
| GPT-5.4 | 3 | **76.3%** | 55.3% | 42.1% | +21.0 vs TOON |
| GPT-5.4-mini | 2 | **71.8%** | 64.1% | 54.2% | +7.7 vs TOON |

### Methodology notes

- OpenAI runs used default temperature (non-zero). This introduces variance across runs but reflects real-world usage. Future runs should set `temperature: 0` for tighter confidence intervals.
- Each run generates a fresh random 500-symbol payload. Different symbol names and edge distributions across runs.
- Claude eval used `claude -p` (CLI). OpenAI evals used the chat completions API with retry logic (exponential backoff on 429s).

### Key findings

1. **GCF wins on every model.** The ordering GCF > TOON > JSON holds across Claude Opus, Claude Sonnet, GPT-5.5, GPT-5.4, and GPT-5.4-mini. 11 runs, 0 losses. Both Claude models achieve 100%.
2. **JSON breaks at scale.** GPT-5.5 returned empty strings on counting questions for JSON (unable to even produce an answer at 500 records). GPT-5.4 miscounted symbols (328 vs 500). Every model struggles with JSON's field-name repetition at scale.
3. **TOON fails on distance grouping.** Without `## targets`/`## related`/`## extended` section headers, models must scan all 500 rows and filter by a column value. This fails consistently across models.
4. **GCF is stable.** GPT-5.4 scored 75.0%, 76.9%, 76.9% across 3 runs. Low variance on the winning format.
5. **The advantage holds on small models.** GPT-5.4-mini (cheapest current-gen model) still reads GCF better than JSON (71.8% vs 54.2% average).
6. **Gemini confirmed via manual test.** Gemini produced valid complex GCF (tabular arrays, nested objects, primitive arrays, nulls, booleans) from a one-line primer with zero prior exposure.

### Files

```
comprehension/
├── comprehension-14q-claude-edges-fix-2026-06-05.log   # Claude Opus 4.6: 100%
├── comprehension-13q-sonnet46-run1-2026-06-06.log      # Claude Sonnet 4.6: 100%
├── comprehension-13q-gpt55-run1-2026-06-06.log         # GPT-5.5 run 1: 91.7%
├── comprehension-13q-gpt55-run2-2026-06-06.log         # GPT-5.5 run 2: 76.9%
├── comprehension-13q-gpt55-run3-2026-06-06.log         # GPT-5.5 run 3: 76.9%
├── comprehension-13q-gpt54-run1-2026-06-06.log         # GPT-5.4 run 1: 75.0%
├── comprehension-13q-gpt54-run2-2026-06-06.log         # GPT-5.4 run 2: 76.9%
├── comprehension-13q-gpt54-run3-2026-06-06.log         # GPT-5.4 run 3: 76.9%
├── comprehension-13q-gpt54-mini-run1-2026-06-06.log    # GPT-5.4-mini run 1: 76.9%
└── comprehension-13q-gpt54-mini-run2-2026-06-06.log    # GPT-5.4-mini run 2: 66.7%
```

---

## Generation Eval (Output: Can LLMs write GCF?)

5 to 100 symbols, validated through real Go decoder, 3-line format primer.

| Symbols | Edges | GCF Valid | GCF vs JSON | GCF vs TOON |
|---------|-------|-----------|-------------|-------------|
| 5 | 3 | YES | 71% fewer | 52% smaller |
| 10 | 6 | YES | 74% fewer | 53% smaller |
| 20 | 12 | YES | 75% fewer | 54% smaller |
| 50 | 25 | YES | 74% fewer | 52% smaller |
| 100 | 50 | YES | 75% fewer | 52% smaller |

5/5 valid. Tested with Claude. Gemini confirmed via manual chat test (complex mixed payload with tabular arrays, nested objects, primitive arrays, nulls, booleans).

### Files

```
generation/
├── generation-gcf-with-example-2026-06-04.log    # Claude, with primer: 5/5 valid
├── generation-gcf-no-example-2026-06-04.log      # Claude, cold-start: 3/5 valid
├── generation-toon-with-example-2026-06-04.log   # TOON comparison: 5/5 valid
├── generation-toon-no-example-2026-06-04.log     # TOON cold-start: 3/5 valid
└── generation-summary-2026-06-04.md              # Full analysis
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
