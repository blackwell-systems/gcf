# Benchmarks

17 comprehension runs across 6 models and 2 providers. GCF wins 16, ties 1. 19 generation runs across 7 models and 3 providers. GCF is the only format every model can produce validly from a 3-line primer, with zero prior training. TOON fails generation on 5 of 7 models. JSON is too verbose for models to generate at scale.

All results reproducible. All raw logs in [eval/results](https://github.com/blackwell-systems/gcf/tree/main/eval/results).

![Comprehension and Generation](/charts/hero.png)

---

## Comprehension: Can LLMs Read It?

500 symbols, 200 edges, 13 structured extraction questions, zero format instructions. Each run generates a fresh random payload.

![Comprehension Accuracy by Model](/charts/accuracy-by-model.png)

### Results by model

| Model | Runs | GCF avg | TOON avg | JSON avg | GCF margin |
|-------|------|---------|----------|----------|------------|
| Claude Opus 4.6 | 2 | **96.2%** | 84.6% | 73.1% | +11.6 vs TOON |
| Claude Sonnet 4.6 | 2 | **100%** | 73.1% | 53.8% | +26.9 vs TOON |
| Claude Haiku 4.5 | 2 | **96.2%** | 69.2% | 57.7% | +27.0 vs TOON |
| GPT-5.5 | 5 | **84.1%** | 67.7% | 45.8% | +16.4 vs TOON |
| GPT-5.4 | 4 | **76.4%** | 56.0% | 44.1% | +20.4 vs TOON |
| GPT-5.4-mini | 2 | **71.8%** | 64.1% | 54.2% | +7.7 vs TOON |

GCF wins on every model. The ordering GCF > TOON > JSON never flips.

### Reproduce

```bash
git clone https://github.com/blackwell-systems/gcf-go
cd gcf-go/eval
GOWORK=off go test -run TestComprehension -v -timeout 0

# OpenAI
EVAL_BACKEND=openai OPENAI_API_KEY=... EVAL_MODEL=gpt-5.5 GOWORK=off go test -run TestComprehension -v -timeout 0

# Google
EVAL_BACKEND=google GOOGLE_API_KEY=... EVAL_MODEL=gemini-2.5-flash GOWORK=off go test -run TestComprehension -v -timeout 0
```

---

## Generation: Can LLMs Write It?

Same data described in natural language. Each model given a 3-line format primer. Output validated through real decoders (`gcf.Decode()` for GCF, `toon.UnmarshalString()` for TOON, `json.Unmarshal()` for JSON). 5 sizes tested per run (5, 10, 20, 50, 100 symbols).

### Three-way comparison

| Model | GCF | TOON (natural) | JSON | Runs |
|-------|-----|----------------|------|------|
| Claude Opus 4.6 | **5/5** | 0/5 | 5/5 | 2 |
| Claude Sonnet 4.6 | **5/5** | 2-3/5 | 5/5 | 2 |
| Claude Haiku 4.5 | **5/5** | 1-3/5 | 5/5 | 2 |
| GPT-5.5 | **4-5/5** | 1-2/5 | 5/5 | 2 |
| GPT-5.4 | **5/5** | 0/5 | 5/5 | 1 |
| GPT-5.4-mini | **5/5** | 0/5 | 5/5 | 2 |
| Gemini 3.1 Flash Lite | **5/5** | 0/5 | 4/5 | 2 |

GCF 5/5 on every model. TOON fails on 5 of 7 models with natural-language descriptions.

### Why TOON fails generation

![The Distance Label Problem](/charts/distance-label-problem.png)

TOON's flat tabular design requires column values to be pre-encoded as integers. When a model is told "this symbol is a target" (natural language), it writes `target` in the distance column. TOON's decoder rejects this because it expects `0`. The model has to know that "target" means 0, "related" means 1, "extended" means 2, and perform that mapping before writing. Every model tested fails to do this mapping unprompted.

GCF never has this problem. Distance is expressed through section placement: a target goes in `## targets`, a related symbol goes in `## related`. No integer mapping required. The format aligns with how LLMs naturally express grouped data.

When TOON is given pre-encoded integer distances (hand-holding the model through the mapping), it passes 5/5 but still produces 28% more output than GCF.

### Output size

| Format | 100 sym output | vs JSON |
|--------|---------------|---------|
| **GCF** | **5,976 B** | **63% fewer** |
| TOON | 8,937 B | 45% fewer |
| JSON | 16,121 B | baseline |

### Reproduce

```bash
cd gcf-go/eval

# GCF generation
EVAL_BACKEND=openai OPENAI_API_KEY=... EVAL_MODEL=gpt-5.4 GOWORK=off go test -run TestGeneration -v -timeout 0

# TOON generation
GOWORK=off go test -run TestGenerationTOON -v -timeout 0

# JSON generation
GOWORK=off go test -run TestGenerationJSON -v -timeout 0
```

---

## Token Efficiency: TOON's Own Benchmark

We inserted GCF into [TOON's token efficiency benchmark](https://github.com/toon-format/toon/tree/main/benchmarks). Their datasets, their tokenizer (gpt-tokenizer, o200k_base), their methodology. The only change: one additional formatter.

| Dataset | Structure | GCF | TOON | JSON |
|---------|-----------|-----|------|------|
| Event logs | Semi-uniform | **108,158** | 154,032 | 181,141 |
| E-commerce | Nested | **61,593** | 73,246 | 109,574 |
| Nested config | Deep | **616** | 618 | 905 |
| Employees | Flat | **49,054** | 49,966 | 127,050 |
| Analytics | Flat | **8,397** | 9,127 | 22,257 |
| GitHub repos | Flat | **8,575** | 8,744 | 15,144 |

GCF wins all 6 datasets. 42% smaller than TOON on semi-uniform data, 2-8% on flat data.

### Reproduce

```bash
git clone https://github.com/blackwell-systems/toon.git
cd toon && git checkout gcf-comparison
cd benchmarks && pnpm install && pnpm benchmark:tokens
```

---

## Summary

| Metric | GCF | TOON | JSON |
|--------|-----|------|------|
| Comprehension accuracy (avg, 6 models) | **88%** | 71% | 55% |
| Generation validity (7 models) | **5/5** | 1.1/5 | 4.9/5 |
| Input tokens (500 symbols) | **11,090** | 16,378 | 53,341 |
| Output tokens (100 symbols) | **5,976** | 8,937 | 16,121 |
| vs JSON input savings | **79%** | 69% | baseline |
| vs JSON output savings | **63%** | 45% | baseline |
| Token efficiency (6 datasets) | **wins all 6** | baseline | 72-149% larger |
| Session dedup (5th call) | **92.7%** | unavailable | unavailable |
| Delta encoding | **81.2%** | unavailable | unavailable |
| Streaming encode | **zero-buffering** | output-side only | n/a |

For detailed failure analysis, error taxonomy, and per-run methodology, see the [full eval results](https://github.com/blackwell-systems/gcf/tree/main/eval/results/SUMMARY.md).
