# GCF on Small Models

On frontier models, format choice barely matters: GCF, TOON, and JSON all read cleanly. GCF's advantage is almost entirely concentrated on the **small, cheap, and local models** that cost-conscious deployments actually route to. That is the opposite of where most format comparisons look, and it is where the decision is real.

If you only ever call Opus, Sonnet, GPT-5.5, or Gemini Pro, pick whatever you like. If any part of your traffic goes to a Flash, a mini, a 70B, or a local model (for cost, latency, or privacy), the format you send is the difference between the model reading the data correctly and the model getting it wrong.

This page pulls together the small-model evidence that lives across the [benchmarks](/guide/benchmarks), [vs-TOON](/guide/vs-toon), [delta](/guide/delta), and [tokenizer analysis](/guide/tokenizer-analysis) pages. All numbers are from the reproducible eval suites (commands at the bottom).

## The pattern in one line

Every format is fine on frontier models. As the model gets smaller, TOON and JSON degrade first and fastest; GCF holds. The gap you care about only appears at the small end.

![On smaller models, TOON and JSON approach chance while GCF holds](/charts/small-model-accuracy.png)

The same effect seen as a gradient: GCF's advantage over the alternatives grows as the model gets weaker.

![GCF advantage grows on weaker models](/charts/advantage-by-tier.png)

## 1. Reading the data (comprehension)

**Generic profile (arrays of records, the common tool-response shape).** 500-order nested data, 27 runs, 11 models. Every frontier model hits 100% on all three formats, so the averages are identical there. The models separate at the bottom of the table:

| Model | GCF | TOON | JSON |
|-------|-----|------|------|
| all frontier (7 models) | 100% | ~100% | ~100% |
| Gemini 2.5 Flash | **95.0%** | 85.1% | 74.0% |
| Mistral Medium 3.5 | **82.7%** | 76.9% | 82.0% |

On Gemini 2.5 Flash, switching from JSON to GCF is a 21-point accuracy swing, and GCF beats TOON by ~10 points. On a frontier model that same switch is worth nothing.

![Generic comprehension accuracy by model](/charts/generic-accuracy-by-model.png)

**Graph profile (symbols and edges, under structural stress).** 500-symbol code graphs, 25 runs, 10 models. Here GCF leads on every model, and the lead widens as the model shrinks:

| Model | GCF | TOON | JSON |
|-------|-----|------|------|
| Gemini 3.5 Flash | **100%** | 61.5% | 46.2% |
| Gemini 2.5 Flash | **85.5%** | 52.5% | 54.3% |
| GPT-5.4-mini | **71.8%** | 64.1% | 54.1% |

Canonical averages (mean of per-model): GCF 91.2%, TOON 68.8%, JSON 54.1%. On the small models the TOON and JSON numbers fall into the 40s and 50s (coin-flip territory on structured retrieval) while GCF stays in the 70s to 100.

![Graph comprehension accuracy by model](/charts/accuracy-by-model.png)

## 2. Writing the data (generation)

Comprehension is only half the loop. If your agent is expected to *produce* the format, small models are where TOON breaks down entirely. 28 runs, 11 models:

| Model | GCF | TOON | JSON |
|-------|-----|------|------|
| GPT-5.4-mini | **5/5** | 0/5 | 5/5 |
| Gemini 3.1 Flash Lite | **4-5/5** | 0/5 | 4-5/5 |
| Gemini 3.5 Flash | 3/5 | 1/5 | 3/5 |
| Gemini 2.5 Flash | 2-4/5 | 0-4/5 | 0-3/5 |

**TOON's official decoder rejects LLM-generated output on 7 of 9 models.** Its flat tabular design encodes semantic categories as integers, which forces a mapping that smaller models do not perform unprompted. GCF is the only compact format every frontier model produces at 5/5, and it remains the most producible format as the model shrinks. On the mid-tier Flash models where GCF itself dips below 5/5, JSON and TOON drop further (GCF 3.0 vs JSON 1.7 vs TOON 1.3 on Gemini 2.5 Flash).

![Generation validity by model](/charts/generation-validity.png)

## 3. Long sessions (delta depth)

Multi-turn delta encoding re-sends only changed rows, so the base recedes as a session deepens and a weaker model has more to reconstruct. A 50-turn stress test (50-row table, 5% churn per turn) held per-record retrieval essentially perfect across weak-to-frontier models (1,777 of 1,777 correct). The one drift case is a small model at the deep end: llama-3.3-70b starts losing state around turns 41 to 50.

The fix is built in and non-normative: a producer-side **periodic re-anchor** re-sends a full payload every N turns (default 15). It costs nothing on the wire, closes the drift back to 100%, and, as the delta guide puts it, "also rescues small and local models." Context-limited consumers get resend-quality context without resend's bulk.

![Delta comprehension holds to 50 turns across models](/charts/generic-delta-depth-by-model.png)

## 4. A free aid for weak models (labeled counts)

Streaming trailers can carry counts in a positional form (`counts=2,2,3`) or an optional labeled form (`counts=targets:2,related:2,edges:3`, spec v3.4). The labeled form is decoder-ignored and roughly free for a frontier model, but smaller models resolve a labeled per-group count far more reliably: measured **up to +34 points on weak models**. The positional form stays the default; the labeled form exists specifically as a small-model comprehension aid.

## Why the gap lives at the small end

Frontier models have enough capacity to overcome noisy tokenization; small models do not, so the encoding's tokenizer behavior shows up directly in accuracy.

TOON's tab delimiter merges with adjacent content far more than the alternatives: across 43 tokenizers and 29,025 checks, GCF's pipe merges 0.47% of the time, JSON's quote 8.17%, and TOON's tab **32.91%**, the worst of any common separator. GPT-4's vocabulary alone has 1,173 tab-plus-letter entries versus 22 for pipe. Those merges are boundary noise a large model can look past and a small model cannot.

![Failure types by model tier](/charts/failure-types.png)

This is grounded in original tokenizer and attention research (under review), which shows through controlled training that BPE merge decisions permanently constrain which attention heads develop. See the [tokenizer analysis](/guide/tokenizer-analysis) and the companion papers linked from the [whitepaper](https://github.com/blackwell-systems/gcf/blob/main/gcf-whitepaper.pdf). The short version: the delimiter you pick shapes what small models can parse, and TOON picked the delimiter with the largest adversarial surface.

## Bottom line

If your traffic is 100% frontier, GCF's correctness margin is a safety net you may not need. The moment any of it routes to a cheaper or local model (the standard cost optimization for agent workloads), the format is doing real work, and the small-model numbers are the ones that decide the outcome:

- Comprehension holds where TOON and JSON fall to coin-flip.
- Generation stays valid where TOON's decoder rejects the output.
- Long sessions self-correct with re-anchor.
- Labeled counts add up to 34 points for free.

## Reproduce

```bash
# Generic profile comprehension (frontier + small models)
GOWORK=off EVAL_FORMATS=gcf,json,toon EVAL_BACKEND=cli EVAL_MODEL=haiku EVAL_NUM_ORDERS=500 go test -run TestGenericComprehension -v -timeout 0

# Graph profile comprehension
GOWORK=off go test -run TestComprehension -v -timeout 0

# Generation (can the model write it)
GOWORK=off go test -run "TestGeneration$|TestGenerationTOON|TestGenerationJSON" -v -timeout 0
```

Per-run data, error taxonomy, and failure-by-tier charts are in the [full eval results](/guide/eval-results).
