# GCF vs TOON: LLM Generation Eval (2026-06-04)

Can LLMs produce valid GCF and TOON output? Same model (Claude via `claude -p`), same data, same prompt structure. Validated through real decoders (gcf-go `Decode` and `@toon-format/toon` `decode`).

## Results: With format example in prompt

Both formats given a short primer (3 lines for GCF, 7 lines for TOON).

| Symbols | Edges | GCF Valid | GCF Savings | TOON Valid | TOON Savings | GCF vs TOON |
|---------|-------|-----------|-------------|------------|--------------|-------------|
| 5 | 3 | YES | 71% | YES | 31% | **52% smaller** |
| 10 | 6 | YES | 74% | YES | 35% | **53% smaller** |
| 20 | 12 | YES | 75% | YES | 37% | **54% smaller** |
| 50 | 25 | YES | 74% | YES | 40% | **52% smaller** |
| 100 | 50 | YES | 75% | YES | 40% | **52% smaller** |

**Both 5/5 valid. GCF output is 52% smaller than TOON output at every scale.**

## Results: No example (description only)

Both formats given only a text description of the syntax, no concrete example.

| Symbols | Edges | GCF Valid | GCF Savings | TOON Valid | TOON Savings |
|---------|-------|-----------|-------------|------------|--------------|
| 5 | 3 | NO (preamble) | — | NO (missing colon) | — |
| 10 | 6 | YES | 72% | NO (bad header) | — |
| 20 | 12 | YES | 71% | YES | 31% |
| 50 | 25 | YES | 71% | YES | 46% |
| 100 | 50 | TIMEOUT | — | YES | 40% |

**Both 3/5 valid. Neither format works reliably without an example at small sizes.**

## Key findings

1. **Both formats need a short primer for generation.** This is expected; JSON structured output also requires telling the model to produce JSON.
2. **With a primer, both achieve 100% validity** across all sizes (5 to 100 symbols).
3. **GCF saves 71-75% vs JSON on output tokens.** TOON saves 31-40%.
4. **GCF output is 52% smaller than TOON output** at every scale tested.
5. **Cold-start performance is tied** (3/5 for both). No format has a zero-shot generation advantage.

## What this means

GCF is not just cheaper to read (the comprehension eval). It's cheaper to write. An agent producing a 100-symbol response generates 5,619 bytes in GCF vs 11,650 bytes in TOON vs 22,180 bytes in JSON. At scale, this is significant cost and latency savings on output tokens.

## Reproduce

```bash
cd gcf/eval
python3 generation_gcf_eval.py    # GCF generation eval
python3 generation_toon_eval.py   # TOON generation eval
```

Requires `claude` CLI and `node` with `@toon-format/toon` installed.
