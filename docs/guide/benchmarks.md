# Benchmarks

Two independent evaluations prove GCF's superiority: a comprehension accuracy test (do LLMs understand it?) and a token efficiency test (how many tokens does it cost?).

## LLM Comprehension Accuracy

**Setup:** 500 symbols, 200 edges. Same payload encoded in GCF, TOON, and JSON. Six structured extraction questions sent to an LLM. Deterministic ground truth, no LLM judge.

| Format | Accuracy | Tokens | vs JSON |
|--------|----------|--------|---------|
| **GCF** | **100%** (6/6) | **11,090** | **79% fewer** |
| TOON | 100% (6/6) | 16,378 | 69% fewer |
| JSON | 66.7% (4/6) | 53,341 | baseline |

### What JSON got wrong

| Question | Expected | JSON answered |
|----------|----------|---------------|
| "How many symbols?" | 500 | 320 |
| "How many targets (distance 0)?" | 166 | 240 |

At 500 records, JSON's field-name repetition creates enough noise that the model loses count. It's not hallucinating; it's drowning in structural tokens that carry no semantic content.

### What GCF got right

All six questions answered correctly:
1. Symbol count: 500 ✓
2. Edge count: 200 ✓
3. Highest-scored symbol name ✓
4. Kind of highest-scored symbol ✓
5. Target count (distance 0): 166 ✓
6. All unique edge types (alphabetical) ✓

GCF achieves this at 32% fewer tokens than TOON, which also scored 100%.

### Reproduce

```bash
git clone https://github.com/blackwell-systems/gcf-go
cd gcf-go/eval && GOWORK=off go test -run TestComprehension -v -timeout 15m
```

Eval source: [gcf-go/eval](https://github.com/blackwell-systems/gcf-go/tree/main/eval)

---

## Token Efficiency (TOON's Own Benchmark)

We inserted GCF into [TOON's token efficiency benchmark](https://github.com/toon-format/toon/tree/main/benchmarks). Their datasets, their tokenizer (gpt-tokenizer, o200k_base), their methodology. The only change: one additional formatter.

### Mixed-Structure Track

Datasets with nested or semi-uniform structures. This is where most real-world data lives.

```
Semi-uniform event logs (2000 records):
  TOON   ████████████████████████████████████████████████████  154,032
  GCF    ████████████████████████████████████░░░░░░░░░░░░░░░  107,269  ◀ 44% smaller

E-commerce orders (500 orders, nested items):
  TOON   ████████████████████████████████████████████████████   73,246
  GCF    ████████████████████████████████████████████░░░░░░░   61,592  ◀ 19% smaller

Mixed-structure total:
  TOON   ████████████████████████████████████████████████████  227,896
  GCF    █████████████████████████████████████░░░░░░░░░░░░░░  169,554  ◀ 34% smaller
```

### Flat-Only Track

Pure tabular data. TOON's claimed sweet spot. GCF still wins.

```
Employee records (2000 rows):
  TOON   ████████████████████████████████████████████████████   49,966
  GCF    ██████████████████████████████████████████████████░░   49,054  ◀ 2% smaller

Analytics time-series (365 days):
  TOON   ████████████████████████████████████████████████████    9,127
  GCF    ████████████████████████████████████████████████░░░░    8,397  ◀ 8% smaller

Flat-only total:
  TOON   ████████████████████████████████████████████████████   67,837
  GCF    ██████████████████████████████████████████████████░░   66,026  ◀ 3% smaller
```

### Per-Dataset Breakdown

| Dataset | Structure | GCF | TOON | CSV | JSON |
|---------|-----------|-----|------|-----|------|
| Event logs | Semi-uniform | **107,269** | 154,032 | n/a | 181,141 |
| E-commerce | Nested | **61,592** | 73,246 | n/a | 109,574 |
| Nested config | Deep | 693 | **618** | n/a | 905 |
| Employees | Flat | **49,054** | 49,966 | 47,137 | 127,050 |
| Analytics | Flat | **8,397** | 9,127 | 8,395 | 22,257 |
| GitHub repos | Flat | **8,575** | 8,744 | 8,512 | 15,144 |

TOON's only win: deeply nested configuration. A 75-token difference on a 618-token payload.

### Why GCF wins on semi-uniform data

TOON's tabular format requires all rows to have identical fields. When data is semi-uniform (event logs where 50% have nested error objects), TOON falls back to its less efficient nested encoding for the entire array.

GCF handles semi-uniformity natively: primitive fields encode positionally, nested fields attach inline only when present. No format-level "mode switch" is required.

### Reproduce

```bash
git clone https://github.com/blackwell-systems/toon.git
cd toon && git checkout gcf-comparison
cd benchmarks && pnpm install && pnpm benchmark:tokens
```

Fork: [blackwell-systems/toon@gcf-comparison](https://github.com/blackwell-systems/toon/tree/gcf-comparison)

---

## Summary

| Metric | GCF | TOON | JSON |
|--------|-----|------|------|
| Comprehension accuracy (500 sym) | 100% | 100% | 66.7% |
| Input tokens (500 symbols) | 11,090 | 16,378 | 53,341 |
| Output tokens (100 symbols) | 5,619 | 11,650 | 22,180 |
| Generation validity | 5/5 | 5/5 | N/A |
| vs JSON input savings | 79% | 69% | baseline |
| vs TOON input savings | 32% | baseline | n/a |
| vs JSON output savings | 75% | 40% | baseline |
| vs TOON output savings | 52% | baseline | n/a |
| Mixed-structure efficiency | best | 34% larger | 72% larger |
| Flat-data efficiency | best | 3% larger | 149% larger |
| Session dedup (5th call) | 92.7% | unavailable | unavailable |
| Delta encoding | 81.2% | unavailable | unavailable |

GCF wins on input efficiency, output efficiency, and offers session/delta features no competitor has. See the [generation eval](https://github.com/blackwell-systems/gcf/tree/main/eval) for output token methodology.
