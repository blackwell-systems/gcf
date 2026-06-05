# Benchmarks

Two independent evaluations prove GCF's superiority: a comprehension accuracy test (do LLMs understand it?) and a token efficiency test (how many tokens does it cost?).

## LLM Comprehension Accuracy

**Setup:** 500 symbols, 200 edges. Same payload encoded in GCF, TOON, and JSON. 13 structured extraction questions sent to an LLM with zero format instructions. Deterministic ground truth, no LLM judge.

| Format | Accuracy | Tokens | vs JSON |
|--------|----------|--------|---------|
| **GCF** | **100%** (13/13) | **11,090** | **79% fewer** |
| TOON | 92.3% (12/13) | 16,378 | 69% fewer |
| JSON | 76.9% (10/13) | 53,341 | baseline |

### What JSON got wrong

| Question | Expected | JSON answered |
|----------|----------|---------------|
| "How many symbols?" | 500 | 320 |
| "How many targets (distance 0)?" | 166 | 240 |
| "How many functions?" | 250 | incorrect |

At 500 records, JSON's field-name repetition creates enough noise that the model loses count. It's not hallucinating; it's drowning in structural tokens that carry no semantic content.

### What TOON got wrong

| Question | Expected | TOON answered |
|----------|----------|---------------|
| "How many extended (distance 2+)?" | correct count | incorrect |

TOON has no distance grouping. The model must scan all 500 rows and filter by a column value, which fails at scale.

### What GCF got right

All 13 questions answered correctly, including:
1. Symbol count: 500 ✓ (from `symbols=500` header)
2. Edge count: 200 ✓ (from `## edges [200]` section header)
3. Target count (distance 0): ✓ (count lines in `## targets` section)
4. Related count (distance 1): ✓ (count lines in `## related` section)
5. Extended count (distance 2): ✓ (count lines in `## extended` section)
6. Function count: ✓ (filter by `fn` kind abbreviation)
7. Calls edge count: ✓ (filter by edge type)
8. Highest-scored symbol name ✓
9. All unique edge types ✓

GCF achieves 100% at 32% fewer tokens than TOON, which scored 92.3%.

### Reproduce

```bash
git clone https://github.com/blackwell-systems/gcf-go
cd gcf-go/eval && GOWORK=off go test -run TestComprehension -v -timeout 0
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
  GCF    ████████████████████████████████████░░░░░░░░░░░░░░░  108,158  ◀ 42% smaller

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
| Event logs | Semi-uniform | **108,158** | 154,032 | n/a | 181,141 |
| E-commerce | Nested | **61,592** | 73,246 | n/a | 109,574 |
| Nested config | Deep | **616** | 618 | n/a | 905 |
| Employees | Flat | **49,054** | 49,966 | 47,137 | 127,050 |
| Analytics | Flat | **8,397** | 9,127 | 8,395 | 22,257 |
| GitHub repos | Flat | **8,575** | 8,744 | 8,512 | 15,144 |

GCF wins all 6 datasets. The closest result: deeply nested configuration (616 vs 618, a 2-token difference).

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
| Comprehension accuracy (500 sym, 13 questions) | 100% (13/13) | 92.3% (12/13) | 76.9% (10/13) |
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
