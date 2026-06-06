# Eval Results Summary

## Comprehension Eval (Input: Can LLMs read GCF?)

500 symbols, 200 edges, 13 structured extraction questions, zero format instructions.

| Model | GCF | TOON | JSON |
|-------|-----|------|------|
| **Claude Opus 4.6** | **100%** (13/13) | 92.3% (12/13) | 76.9% (10/13) |
| **GPT-5.5** | **91.7%** (11/12) | 66.7% (8/12) | 50.0% (6/12) |
| **GPT-5.4** | **75.0%** (9/12) | 58.3% (7/12) | 41.7% (5/12) |
| **Gemini** | confirmed (manual generation test) | | |

GCF wins on every model. The ordering is always GCF > TOON > JSON.

### Files

- `comprehension/comprehension-14q-claude-edges-fix-2026-06-05.log` (Claude, 13/13)
- `comprehension/comprehension-13q-gpt55-2026-06-06.log` (GPT-5.5, 91.7%)
- `comprehension/comprehension-13q-gpt54-2026-06-06.log` (GPT-5.4, 75%)

### Key observations

- JSON fails on counting at scale across all models (symbol_count, target_count, related_count). GPT-5.5 returned **empty strings** on counting questions for JSON, unable to even produce an answer.
- TOON fails on distance grouping across all models (no section headers, model must scan and filter).
- GCF's section headers (`## targets`, `## related`, `## extended`) and count markers (`symbols=N`, `## edges [N]`) enable accurate extraction regardless of model.

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

- `generation/generation-gcf-with-example-2026-06-04.log` (Claude, with primer)
- `generation/generation-gcf-no-example-2026-06-04.log` (Claude, cold-start)
- `generation/generation-toon-with-example-2026-06-04.log` (TOON comparison)
- `generation/generation-toon-no-example-2026-06-04.log` (TOON cold-start)
- `generation/generation-summary-2026-06-04.md` (full analysis)

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

### Reproduce

Comprehension: `cd gcf-go/eval && GOWORK=off go test -run TestComprehension -v -timeout 0`

Token efficiency: `cd toon && git checkout gcf-comparison && cd benchmarks && pnpm install && pnpm benchmark:tokens`
