# Structural-Injection Resistance of LLM Wire Formats: A Controlled Re-examination of the S-TOON Security Claims

**Author:** Dayna Blackwell, Blackwell Systems
**Date:** 2026-07-09
**Harness:** [`eval/stoon_taxonomy_eval.py`](../stoon_taxonomy_eval.py)
**Raw data:** [`eval/results/stoon-taxonomy-v2.json`](stoon-taxonomy-v2.json) (120 cells across 5 models x 4 formats x 6 vectors; 3,593 per-trial model outputs stored for independent re-grading)
**Chart source:** [`eval/stoon_heatmap.py`](../stoon_heatmap.py)
**Encoders:** real libraries only (JSON `json.dumps`; TOON `@toon-format/toon`; GCF `gcf-go cmd/gcf`)

## Summary

Do compact, delimiter-light serialization formats used to feed LLMs (TOON and
similar) expose a structural-injection vulnerability, and does the proposed
S-TOON middleware fix it? We re-run the question as a controlled four-arm
experiment (JSON, TOON, S-TOON, GCF) over five models and a six-vector injection
taxonomy, at 30 independent trials per cell (temperature 0.7) with Wilson 95%
confidence intervals and all raw outputs retained.

Five results, in order of how much they revise the current picture:

1. The core TOON vulnerability is **real where it appears**: on Qwen-2.5-7B, TOON
   leaks the injected privileged value 90% of the time on the delimiter-dissolution
   vector, while the JSON control holds at 0%. The effect is format-specific, not
   model incompetence.
2. It is **model-dependent**: on Llama-3.1-8B the same TOON vector does not
   replicate (0%), and JSON itself leaks (12% mean). A single model family cannot
   establish the claim.
3. The **proposed S-TOON middleware backfires**: it is the worst-performing arm on
   both open models tested (mean +10.6 and +24.4 points above the JSON control,
   reaching 43-90% on individual vectors).
4. The **"Intelligence Paradox" does not hold**: all three frontier models
   (Claude-opus-4.8, GPT-5.6, Gemini-2.5-pro) resist every format at 0%, including
   the vectors and the S-TOON wrapping that break the small models.
5. Of the four formats, **GCF is the only one whose leak rate never exceeds the
   JSON control** on any cell of any model.

## Background and prior work

**Alshaer (2026), "Neutralizing Structural Vulnerabilities in TOON: The S-TOON
Protocol"** (TechRxiv, DOI 10.36227/techrxiv.177033002.20370897) identifies
"Delimiter Dissolution": in delimiter-light formats such as TOON, attacker-
controlled string content can be re-parsed as schema fields because the boundary
between untrusted input and trusted structure is not explicit. Alshaer reports
standard TOON at 100% Attack Success Rate (ASR) across an eight-class taxonomy on
TinyLlama-1.1B and Qwen-2.5-7B, and proposes S-TOON, a middleware that sanitizes
input and wraps it in sentinel tokens, reducing ASR to 0.0% across a 220,000-shot
suite.

**Kutschka et al. (2026), "Notation Matters"** (arXiv 2605.29676), an independent
agentic benchmark, cites S-TOON in Related Work *as the mitigation* ("Alshaer ...
proposed the S-TOON protocol, which reintroduces explicit boundary markers around
untrusted input"), citing the proposal rather than an independent validation. That
same benchmark independently finds TOON degrades on multi-turn parsing and
cascades errors, converging on the same implicit-delimiter weakness from a
different direction (task accuracy rather than security).

## The gap this study closes

Alshaer's study, as published, leaves four things open:

1. **No JSON control.** He never measures his own "rigid fence" baseline, so a 100%
   TOON ASR cannot be separated from general model injectability. We add JSON.
2. **Small-model confound.** He tests only 1.1B and 7B models, which are weak at
   structured data to begin with. We add a frontier tier.
3. **Inflated n.** n=160,000 under greedy decoding is one deterministic outcome
   repeated, effective n=1. We sample at temperature 0.7 so each shot is an
   independent trial and report confidence intervals.
4. **The fix is cited but never independently tested.** Because Kutschka et al.
   propagate S-TOON as the mitigation, its actual effect matters. We run Alshaer's
   own middleware, ported verbatim from his repository, as a fourth arm.

This measures the **LLM-reading level**: given a record and told to report one
privileged field, does the model leak the attacker-injected value? That is where
Alshaer's reported 100% ASR lives.

## Method

**Arms (real encoders only):** JSON (`json.dumps`), TOON (`@toon-format/toon`),
S-TOON (TOON wrapped by Alshaer's middleware, ported verbatim), GCF
(`gcf-go`). **Models:** Qwen-2.5-7B and Llama-3.1-8B (small tier, Alshaer's
territory); Claude-opus-4.8, GPT-5.6, Gemini-2.5-pro (frontier). **Vectors (six
leak-probe classes):** delimiter_dissolution (run verbatim from Alshaer's public
notebook), type_smuggling, invisible_indentation, comment_masquerading,
schema_hallucination, tokenization_drift. Only delimiter_dissolution is his exact
payload; the other five are constructed from his Table 1 mechanism descriptions
(his code for them is not public), so this "implements his taxonomy" rather than
"replicating his suite." **Trials:** 30 per cell at temperature 0.7; leak =
exact-match presence of the injected value; all raw outputs retained.

Two further taxonomy classes are not leak-probes and are reported separately below
(open_field_truncation, a fail-closed parser property; economic_dos, an encoding-
cost property).

## Results

Mean leak ASR by format per model (lower = more resistant), with the format-
attributable delta versus the JSON control in parentheses.

### Small tier (Alshaer's territory)

| model | JSON | TOON | S-TOON (his fix) | GCF |
|---|---|---|---|---|
| Qwen-2.5-7B | 0.0% | 20.6% (+20.6) | 10.6% (+10.6) | 0.0% (+0.0) |
| Llama-3.1-8B | 12.2% | 2.8% (−9.4) | 36.7% (+24.4) | 2.2% (−10.0) |

### Frontier tier (the model-competence confound removed)

| model | JSON | TOON | S-TOON | GCF |
|---|---|---|---|---|
| Claude-opus-4.8 | 0.0% | 0.0% | 0.0% | 0.0% |
| GPT-5.6 | 0.0% | 0.0% | 0.0% | 0.0% |
| Gemini-2.5-pro | 0.0% | 0.0% | 0.0% | 0.0% |

All 120 cells at a glance (dark = safe; leaks light up):

![Structural-injection leak rate across 5 models, 4 formats, and 6 vectors. The S-TOON block is the hottest; GCF is nearly all dark; the three frontier rows are entirely dark.](stoon-injection-heatmap.png)

Per-vector detail (ASR% [95% CI]), the cells that drive the means:

- **Qwen delimiter_dissolution:** TOON **90%** [74-96]; JSON, S-TOON, GCF all 0%.
  Alshaer's flagship vector is real, and the JSON control at 0% proves it is
  format-specific.
- **Qwen tokenization_drift** (pipe collision): TOON 33% [19-51], **S-TOON 63%**
  [46-78] (the middleware does not sanitize the pipe), GCF 0%.
- **Llama delimiter_dissolution:** **JSON 23%** [12-41], TOON 0%, **S-TOON 43%**
  [27-61], GCF 0%. Here TOON does not leak and JSON does; the middleware is the
  worst arm.
- **Llama invisible_indentation / tokenization_drift:** **S-TOON 83% / 90%**.

## Findings

1. **Alshaer's core vulnerability claim is confirmed where it holds.** TOON leaks
   90% on delimiter_dissolution on Qwen with JSON at 0%: a genuine, format-specific
   injection, exactly as he describes. His mechanism is real.

2. **The vulnerability is model-dependent.** It is severe on Qwen (TOON +20.6 vs
   JSON) and absent on Llama (TOON −9.4, safer than JSON, where JSON itself leaks).
   The single-model-family design cannot generalize the claim, which is the same
   gap the missing JSON control created.

3. **The proposed S-TOON middleware backfires.** It is the worst arm on both open
   models (+10.6 and +24.4 vs JSON), reaching 43-90% on individual vectors. The
   sentinel-wrapping appears to prime the model to obey the wrapped content, and the
   sanitizer does not cover the pipe-collision vector. The reported "100% → 0.0%"
   does not reproduce; on the models tested it is inverted. This directly qualifies
   the S-TOON-as-mitigation claim now propagating via Kutschka et al.

4. **The "Intelligence Paradox" is not supported.** All three frontier families
   resist every format at 0%, including the wrapping that broke the small models.
   Injection susceptibility falls with capability here, opposite to the direction
   inferred from a 1.1B-vs-7B comparison.

5. **Among the four formats, GCF's leak rate never exceeds the JSON control**, on
   any vector on any model. Its single nonzero cell (Llama tokenization_drift, 13%)
   equals JSON's 13% on the same cell, i.e. model-level semantic leakage rather than
   a format boundary failure. GCF achieves this with no middleware.

## Non-leak measures (reported for completeness, with the honest asymmetry)

- **open_field_truncation (fail-closed):** JSON rejects a document truncated at 60%
  (a side effect of its mandatory closing delimiters); GCF's tabular decoder
  tolerates truncation by design and does not reject it. This is a lenient-decoder
  property, not a leak (field boundaries still hold), and it is the one measure
  where GCF is *less* defensive than JSON. Completeness for security-sensitive
  inputs should be validated at the transport/message layer; see
  `docs/guide/lossless-verification.md` and the roadmapped opt-in strict decode.
- **economic_dos (encoding cost):** the deep-nesting payload encodes to GCF 4,625
  bytes vs JSON 9,159 bytes.

## Scope and limitations

- This is the **LLM-reading level**. It is distinct from, and weaker than, the
  deterministic **format-level** guarantee for GCF in
  [`gcf-go/security_test.go`](https://github.com/blackwell-systems/gcf-go/blob/main/security_test.go)
  (a conformant GCF decoder recovers injected values byte-for-byte; injected
  structure cannot escape its field; 0% ASR across 20 named vectors + 100,000
  fuzzed injections). The parser test is the unimpeachable claim; this experiment
  is its empirical complement at the model layer.
- This is **not** a general prompt-injection result. It concerns structural /
  delimiter injection at the parsing layer, nothing broader.
- Five of six leak vectors are constructed from Alshaer's descriptions, not his
  code. Leak detection is exact-match; raw outputs are retained so any grader can
  re-score independently. Thirty trials per cell bound most confidence intervals
  tightly but not all; the raw data supports re-analysis at higher n.
- The defensible one-line claim for GCF is "never leaks more than JSON," a modest,
  backed statement, not "GCF is injection-proof."

## Reproduce

```
OPENROUTER_API_KEY=... python3 stoon_taxonomy_eval.py \
  --openrouter-models qwen/qwen-2.5-7b-instruct meta-llama/llama-3.1-8b-instruct \
    anthropic/claude-opus-4.8 google/gemini-2.5-pro openai/gpt-5.6-terra-pro \
  --stoon --api-shots 30 --temperature 0.7 \
  --gcf-go /path/to/gcf-go --node /path/to/node \
  --output results/stoon-taxonomy-v2.json

python3 stoon_heatmap.py   # regenerates the chart from the raw JSON
```

The harness resumes from the output JSON (completed cells are skipped), so partial
runs converge to the full matrix. All 3,593 per-trial model outputs are stored in
the raw data for independent re-grading.
