# Benchmarks

No model has ever been trained on GCF. Every model reads it better and writes it better than the formats they were trained on.

| | GCF | TOON | JSON |
|---|---|---|---|
| **Comprehension** (17 runs, 6 models) | **88%** | 71% | 55% |
| **Generation** (19 runs, 7 models) | **5/5** | 1.1/5 | 4.9/5 |
| **Input tokens** (500 symbols) | **11,090** | 16,378 | 53,341 |
| **Output tokens** (100 symbols) | **5,976** | 8,937 | 16,121 |

Three benchmark suites, three providers (Anthropic, OpenAI, Google), zero training:

1. **[Comprehension eval](#comprehension-can-llms-read-it)**: Can models extract information from a format? 500 symbols, 13 questions, 17 runs across 6 models.
2. **[Generation eval](#generation-can-llms-write-it)**: Can models produce valid output in a format? 3-line primer, 19 runs across 7 models.
3. **[TOON's benchmark: Token efficiency](#toons-benchmark-token-efficiency)**: How many tokens does each format cost? This is [TOON's own benchmark](https://github.com/toon-format/toon/tree/main/benchmarks), forked unmodified, with GCF added as one additional formatter.

All results [reproducible](https://github.com/blackwell-systems/gcf/tree/main/eval/results).

![Comprehension and Generation](/charts/hero.png)

---

## Comprehension: Can LLMs Read It?

500 symbols, 200 edges, 13 structured extraction questions, zero format instructions. Each run generates a fresh random payload. When an agent receives data in JSON at this scale, it gets the wrong answer 45% of the time. With TOON, 29% of the time. With GCF, 12%.

![Comprehension Accuracy by Model](/charts/accuracy-by-model.png)

| Model | Runs | GCF avg | TOON avg | JSON avg |
|-------|------|---------|----------|----------|
| Claude Opus 4.6 | 2 | **96.2%** | 84.6% | 73.1% |
| Claude Sonnet 4.6 | 2 | **100%** | 73.1% | 53.8% |
| Claude Haiku 4.5 | 2 | **96.2%** | 69.2% | 57.7% |
| GPT-5.5 | 5 | **84.1%** | 67.7% | 45.8% |
| GPT-5.4 | 4 | **76.4%** | 56.0% | 44.1% |
| GPT-5.4-mini | 2 | **71.8%** | 64.1% | 54.2% |

**GCF wins on every model. The ordering GCF > TOON > JSON never flips.**

When GCF gets an answer wrong, it's off by 1-2 (median error: 4). When TOON and JSON get answers wrong, they're off by 50-140 (median error: 53 and 56). GCF fails on precision. TOON and JSON fail on comprehension. See the [failure taxonomy](https://github.com/blackwell-systems/gcf/tree/main/eval/results/SUMMARY.md#failure-taxonomy) for the full analysis.

---

## Generation: Can LLMs Write It?

Same data described in natural language. 3-line format primer. Output validated through real decoders: the official [toon-go](https://github.com/toon-format/toon-go) library for TOON, `gcf.Decode()` for GCF, `json.Unmarshal()` for JSON.

![Generation Validity by Model](/charts/generation-validity.png)

| Model | GCF | TOON | JSON |
|-------|-----|------|------|
| Claude Opus 4.6 | **5/5** | 0/5 | 5/5 |
| Claude Sonnet 4.6 | **5/5** | 2-3/5 | 5/5 |
| Claude Haiku 4.5 | **5/5** | 1-3/5 | 5/5 |
| GPT-5.5 | **4-5/5** | 1-2/5 | 5/5 |
| GPT-5.4 | **5/5** | 0/5 | 5/5 |
| GPT-5.4-mini | **5/5** | 0/5 | 5/5 |
| Gemini 3.1 Flash Lite | **5/5** | 0/5 | 4/5 |

**GCF is the only format every model can produce.** TOON's official decoder rejects the output on 5 of 7 models.

### Why TOON fails

![The Distance Label Problem](/charts/distance-label-problem.png)

TOON's flat columns require the model to encode semantic categories as integers. When told "this symbol is a target," the model writes `target` in the distance column. TOON's decoder expects `0`. Every model tested fails to perform this mapping unprompted.

GCF expresses distance through section placement: targets go in `## targets`, related symbols go in `## related`. No mapping required. The format aligns with how models naturally express grouped data.

When TOON is given pre-encoded integers (hand-holding the model through the mapping it can't do on its own), it passes 5/5 but still produces 28% more output than GCF.

### Output size

GCF output is 63% smaller than JSON and 33% smaller than TOON at 100 symbols. Every output token costs money. At scale, this compounds.

![Output Size at Scale](/charts/output-cost-at-scale.png)

---

## TOON's Benchmark: Token Efficiency

This is not our benchmark. This is [TOON's benchmark](https://github.com/toon-format/toon/tree/main/benchmarks), forked unmodified. Their datasets, their tokenizer (gpt-tokenizer, o200k_base), their methodology. We added one line: a GCF formatter. Everything else is TOON's code measuring TOON's chosen datasets.

| Dataset | Structure | GCF | TOON | JSON |
|---------|-----------|-----|------|------|
| Event logs | Semi-uniform | **108,158** | 154,032 | 181,141 |
| E-commerce | Nested | **61,593** | 73,246 | 109,574 |
| Nested config | Deep | **616** | 618 | 905 |
| Employees | Flat | **49,054** | 49,966 | 127,050 |
| Analytics | Flat | **8,397** | 9,127 | 22,257 |
| GitHub repos | Flat | **8,575** | 8,744 | 15,144 |

**GCF wins all 6 datasets.** 42% smaller than TOON on semi-uniform data, 2-8% on flat data.

---

## Reproduce

All evals are in [gcf-go/eval](https://github.com/blackwell-systems/gcf-go/tree/main/eval). All raw logs are in [eval/results](https://github.com/blackwell-systems/gcf/tree/main/eval/results).

```bash
git clone https://github.com/blackwell-systems/gcf-go
cd gcf-go/eval

# Comprehension (any backend)
GOWORK=off go test -run TestComprehension -v -timeout 0
EVAL_BACKEND=openai OPENAI_API_KEY=... EVAL_MODEL=gpt-5.5 GOWORK=off go test -run TestComprehension -v -timeout 0
EVAL_BACKEND=google GOOGLE_API_KEY=... EVAL_MODEL=gemini-2.5-flash GOWORK=off go test -run TestComprehension -v -timeout 0

# Generation (all three formats)
GOWORK=off go test -run "TestGeneration$|TestGenerationTOON|TestGenerationJSON" -v -timeout 0

# Token efficiency
git clone https://github.com/blackwell-systems/toon.git
cd toon && git checkout gcf-comparison
cd benchmarks && pnpm install && pnpm benchmark:tokens
```

For detailed failure analysis, error taxonomy, and per-run data, see the [full eval results](https://github.com/blackwell-systems/gcf/tree/main/eval/results/SUMMARY.md).
