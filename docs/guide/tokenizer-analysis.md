# Tokenizer Analysis

GCF token savings are consistent across every model tokenizer tested. This page presents the evidence.

## Summary

| Metric | Result |
|--------|--------|
| Tokenizers tested | 8 |
| Providers covered | 6 (Anthropic, OpenAI, Meta, Google, Alibaba, Mistral) |
| GCF savings range | 50-59% across all tokenizers |
| Savings std deviation | < 3 percentage points |
| GCF delimiter consistency | 100% (pipe, @, <, ## are single tokens on every tokenizer) |

## Tokenizers Tested

| Tokenizer | Provider | Model Family |
|-----------|----------|-------------|
| Claude tokenizer | Anthropic | Claude 3.5, 4.x |
| cl100k_base | OpenAI | GPT-4 |
| o200k_base | OpenAI | GPT-4o, GPT-5.x |
| LLaMA 3.1 tokenizer | Meta | LLaMA 3.x |
| Qwen 2.5 tokenizer | Alibaba | Qwen 2.5 |
| DeepSeek V3 tokenizer | DeepSeek | DeepSeek V3 |
| Gemma 2 tokenizer | Google | Gemma 2 |
| Mistral Nemo tokenizer | Mistral | Mistral/Ministral |

## Savings by Tokenizer (Generic Profile, 500 Orders)

| Tokenizer | GCF Tokens | JSON Tokens | Savings |
|-----------|-----------|-------------|---------|
| Claude (Anthropic) | 44,099 | 96,619 | **54.4%** |
| GPT-4 (OpenAI) | 40,383 | 97,848 | **58.7%** |
| GPT-4o (OpenAI) | 41,382 | 98,348 | **57.9%** |
| LLaMA 3.1 (Meta) | 40,384 | 97,849 | **58.7%** |
| Qwen 2.5 (Alibaba) | 52,595 | 109,168 | **51.8%** |
| DeepSeek V3 | 44,234 | 101,848 | **56.6%** |
| Gemma 2 (Google) | 55,301 | 124,620 | **55.6%** |
| Mistral Nemo | 55,998 | 112,569 | **50.3%** |

Every tokenizer produces 50%+ savings. The worst case (Mistral Nemo, 50.3%) still halves the token count.

## Savings Consistency Across Scales

| Payload | Min Savings | Max Savings | Mean Savings | Spread |
|---------|------------|-------------|-------------|--------|
| 10 orders | 51.0% | 57.6% | 55.0% | 6.6pp |
| 50 orders | 51.5% | 59.2% | 56.3% | 7.7pp |
| 100 orders | 51.4% | 59.3% | 56.2% | 7.9pp |
| 500 orders | 50.3% | 58.7% | 55.5% | 8.5pp |

Savings are stable from 10 to 500 records. The spread stays under 9 percentage points across all 8 tokenizers at every scale.

## Graph Profile Token Variance

| Payload | Min Tokens | Max Tokens | Mean | CV |
|---------|-----------|-----------|------|-----|
| 10 symbols, 5 edges | 212 | 240 | 222 | 4.3% |
| 50 symbols, 25 edges | 1,000 | 1,236 | 1,086 | 8.3% |
| 100 symbols, 50 edges | 1,982 | 2,485 | 2,166 | 9.0% |
| 500 symbols, 200 edges | 9,450 | 13,013 | 10,754 | 13.7% |

At small scale, GCF graph payloads tokenize nearly identically (4.3% CV). Variance grows at scale but remains moderate.

## Syntactic Analysis: Why It Works

GCF uses only basic ASCII delimiters. Here is how each tokenizer handles the core GCF syntax:

### Edge declaration: `@0<@2|implements`

| Tokenizer | Tokens | Split |
|-----------|--------|-------|
| Claude | 7 | `@` `0` `<` `@` `2` `|` `implements` |
| GPT-4 | 7 | `@` `0` `<` `@` `2` `|` `implements` |
| GPT-4o | 7 | `@` `0` `<` `@` `2` `|` `implements` |
| LLaMA 3.1 | 7 | `@` `0` `<` `@` `2` `|` `implements` |
| Qwen 2.5 | 7 | `@` `0` `<` `@` `2` `|` `implements` |
| DeepSeek V3 | 8 | `@` `0` `<` `@` `2` `|` `im` `plements` |
| Gemma 2 | 7 | `@` `0` `<` `@` `2` `|` `implements` |
| Mistral Nemo | 8 | `@` `0` `<` `@` `2` `|` `im` `plements` |

**All 8 tokenizers split GCF structural characters identically:** `@`, `<`, `|` are always single tokens. The only variance is in the value `implements` (1 vs 2 tokens), which doesn't affect parsing.

### Symbol row: `@0|function|auth.validateToken|0.95|definition`

| Tokenizer | Tokens | Key Differences |
|-----------|--------|----------------|
| GPT-4 | 14 | Merges `.validate` (1 tok), `95` (1 tok) |
| Qwen 2.5 | 15 | Splits `95` → `9` + `5` |
| Gemma 2 | 16 | Splits `.` + `validate`, splits `9` + `5` |

The pipe delimiters are always single tokens. Variance comes from how tokenizers handle:
- **Dot-prefixed words:** `.validate` (1 tok on GPT-4) vs `.` + `validate` (2 tok on Gemma)
- **Two-digit numbers:** `95` (1 tok on GPT-4) vs `9` + `5` (2 tok on Qwen/Gemma)
- **Comma-prefixed chars:** `,q` (1 tok on GPT-4) vs `,` + `q` (2 tok on Gemma)

### Section header: `## symbols [3]{id,kind,qname,score,provenance}`

All tokenizers produce 17-18 tokens. `##`, `[`, `]`, `{`, `}` are consistently handled. Variance is only in how field names merge with adjacent punctuation.

## Delimiter Character Universality

Every character in GCF's grammar is a single token on every tokenizer tested:

| Character | Purpose in GCF | Single token on all 8? |
|-----------|---------------|----------------------|
| `\|` (pipe) | Field delimiter | Yes |
| `@` | Symbol ID prefix | Yes |
| `<` | Edge direction | Yes |
| `#` | Section header | Yes |
| `{` | Schema open | Yes |
| `}` | Schema close | Yes |
| `[` | Count open | Yes |
| `]` | Count close | Yes |
| `,` | Schema field separator | Yes |
| `\n` | Row separator | Yes |

10 characters, 8 tokenizers, 80 checks, zero exceptions. GCF's grammar characters are universally unambiguous at the token level.

## JSON Tokenization Comparison

The same data encoded as JSON shows identical variance patterns. This proves the variance is content-driven, not format-driven.

### Example: Full symbol object

**JSON:** `{"id": 0, "kind": "function", "qualified_name": "auth.validateToken", "score": 0.95, "provenance": "definition"}`

| Tokenizer | Tokens | Key variance |
|-----------|--------|-------------|
| Claude | 37 | Splits `_` + `name`, `.` + `validate` |
| GPT-4 | 37 | Merges `_name`, `.validate` |
| GPT-4o | 37 | Same as GPT-4 |
| LLaMA 3.1 | 37 | Same as GPT-4 |
| Qwen 2.5 | 38 | Splits `9` + `5` |
| DeepSeek V3 | 37 | Same as GPT-4 |
| Gemma 2 | 39 | Splits `_` + `name`, `.` + `validate`, `9` + `5` |
| Mistral Nemo | 39 | Splits `qual` + `ified`, `9` + `5` |

**JSON variance: 37-39 tokens (5.4% spread).**

**GCF equivalent:** `@0|function|auth.validateToken|0.95|definition`

| Tokenizer | Tokens |
|-----------|--------|
| GPT-4 | 14 |
| Qwen 2.5 | 15 |
| Gemma 2 | 16 |

**GCF variance: 14-16 tokens (14% spread proportionally, but 2 tokens absolute).**

The variance sources are identical: dot-splitting, number-splitting, word boundaries. JSON has the same patterns. GCF just has fewer total tokens to vary.

### Example: Edge array (2 edges)

**JSON:** `[{"target": 0, "source": 2, "type": "implements"}, {"target": 1, "source": 2, "type": "implements"}]`

| Tokenizer | JSON tokens |
|-----------|-------------|
| Claude | 33 |
| GPT-4 | 38 |
| DeepSeek V3 | 40 |
| Mistral Nemo | 40 |

**JSON variance: 33-40 tokens (21% spread).**

**GCF equivalent:** Two lines: `@0<@2|implements` and `@1<@2|implements`

| Tokenizer | GCF tokens |
|-----------|------------|
| GPT-4 | 14 |
| DeepSeek V3 | 16 |
| Mistral Nemo | 16 |

**GCF variance: 14-16 tokens (14% spread), but only 2 tokens absolute difference.**

JSON's variance is *larger* in both absolute and proportional terms on edge data, because JSON repeats `"target":`, `"source":`, `"type":` for each edge, and each of those key-value pairs can split differently.

## JSON Structural Overhead: Where The Tokens Go

JSON's token inefficiency isn't just about whitespace. Even compact (minified) JSON wastes the majority of its tokens on structural overhead that carries zero information for the reader.

### The breakdown (500-row frequency table)

| Category | JSON tokens | % of total |
|----------|------------|------------|
| Repeated field names | 5,500 | **52.4%** |
| Structural chars ({}, [], :, commas) | 3,001 | **28.6%** |
| Actual data values | 1,995 | **19.0%** |
| **Total** | **10,496** | |

**Over 80% of JSON's tokens are overhead.** Only 19% carry actual information.

GCF for the same data:

| Category | GCF tokens | % of total |
|----------|-----------|------------|
| Header (field names, once) | 10 | **0.2%** |
| Data rows | 6,500 | **99.8%** |
| **Total** | **6,510** | |

**Result: 38% fewer tokens, 99.8% signal.**

### Per-field waste

Each field name in JSON costs tokens **on every single row**:

| Field name | Tokens per row | × 500 rows | Total waste |
|-----------|---------------|------------|-------------|
| `"field":` | 3 | × 500 | 1,500 tokens |
| `"value":` | 2 | × 500 | 1,000 tokens |
| `"count":` | 3 | × 500 | 1,500 tokens |
| `"percentage":` | 3 | × 500 | 1,500 tokens |

In GCF, all four field names appear **once** in the header:
```
## [500]{field,value,count,percentage}
```
Cost: 10 tokens total.

### Scaling: JSON overhead grows linearly, GCF overhead is constant

| Rows | JSON overhead | GCF overhead | JSON:GCF ratio |
|------|--------------|--------------|---------------|
| 10 | 171 tokens | 10 tokens | 17:1 |
| 50 | 851 tokens | 10 tokens | 85:1 |
| 100 | 1,701 tokens | 10 tokens | 170:1 |
| 500 | 8,501 tokens | 10 tokens | 850:1 |
| 1000 | 17,001 tokens | 11 tokens | 1,545:1 |

At 1000 rows, JSON burns **17,001 tokens** on overhead (repeated field names + structural chars). GCF uses **11 tokens**. The ratio is 1,545:1.

This linear growth is why LLMs struggle with JSON at scale: the signal-to-noise ratio degrades as records increase. At 500 records, the model is processing 5x more noise than data. GCF maintains near-100% signal throughout.

### Cross-tokenizer validation (500-row frequency table)

The overhead pattern holds across all 8 tokenizers:

| Tokenizer | JSON tokens | GCF tokens | Savings | JSON field-name overhead |
|-----------|------------|-----------|---------|------------------------|
| Claude (Anthropic) | 10,996 | 7,013 | **36.2%** | 54.6% |
| GPT-4 (OpenAI cl100k) | 10,494 | 6,508 | **38.0%** | 52.4% |
| GPT-4o (OpenAI o200k) | 10,494 | 6,508 | **38.0%** | 52.4% |
| LLaMA 3.1 (Meta) | 10,494 | 6,508 | **38.0%** | 52.4% |
| Qwen 2.5 (Alibaba) | 13,150 | 9,166 | **30.3%** | 41.8% |
| DeepSeek V3 | 10,494 | 6,509 | **38.0%** | 57.2% |
| Gemma 2 (Google) | 14,149 | 9,669 | **31.7%** | 42.4% |
| Mistral Nemo | 13,649 | 9,167 | **32.8%** | 44.0% |

Every tokenizer confirms: JSON spends **42-57% of its tokens on repeated field names**. GCF eliminates this overhead entirely.

### Reproduce

```bash
node eval/json-tokenization-analysis.mjs
```

---

## ASCII Delimiter Space Analysis

We tested every printable ASCII character (codes 33-126) against all 8 tokenizers on two criteria:

1. **Single token in isolation:** does the character encode as exactly 1 token?
2. **Never merges with adjacent text:** does `Xfoo` tokenize as `X` + `foo` (separate) or `Xfoo` (merged)?

A "perfect" delimiter satisfies both: it's always 1 token and never gets absorbed into neighboring content.

**Results:** 74 of 94 printable ASCII characters are perfect delimiters. 20 characters merge with adjacent text on at least one tokenizer.

### Characters that merge (avoid as delimiters)

| Character | Why it merges |
|-----------|--------------|
| `(` | Merges into `(foo` on some tokenizers |
| `-` | Merges into `-token`, `-based`, `-style` |
| `.` | Merges into `.validate`, `.com`, `.json` |
| `/` | Merges into `/api`, `/path` |
| `_` | Merges into `_name`, `_id`, `_count` |
| `a-f, i, l, o, p, r, t, u` | Common lowercase letters that form subword prefixes |

These are exactly the characters tokenizers aggressively merge into subwords. Any format using dots, dashes, or underscores as structural delimiters will have tokenizer-dependent behavior.

### GCF's delimiters: all perfect

| Character | Single token (8/8) | Never merges (8/8) | Role in GCF |
|-----------|-------------------|-------------------|-------------|
| `\|` | Yes | Yes | Field delimiter |
| `@` | Yes | Yes | Symbol ID prefix |
| `<` | Yes | Yes | Edge direction |
| `#` | Yes | Yes | Section header |
| `{` | Yes | Yes | Schema open |
| `}` | Yes | Yes | Schema close |
| `[` | Yes | Yes | Count open |
| `]` | Yes | Yes | Count close |
| `,` | Yes | Yes | Schema field separator |

Every GCF grammar character is in the perfect category. This was a deliberate design choice.

### What this means for competing formats

**JSON** uses `.` (dot), `:` (colon), and `"` (quote) as structural characters. Dots merge with adjacent text (`.validate` becomes 1 token on GPT-4 but 2 on Gemma). Quotes create `"key":` sequences that tokenize inconsistently. The format's grammar characters are in the merging category.

**TOON** inherits YAML's indentation-sensitive structure. Whitespace-based delimiting is inherently tokenizer-dependent because tokenizers handle leading spaces, tabs, and indentation levels differently.

**GCF** uses only characters from the non-merging set. The format's token efficiency is not an accident of one tokenizer's vocabulary; it's a structural property of the delimiter choices.

## Design Rationale: Why These Specific Delimiters

From the 74 perfect candidates, GCF chose based on readability and semantic meaning:

| Character | Why chosen | Alternative considered | Why not |
|-----------|-----------|----------------------|---------|
| `\|` (pipe) | Rare in natural text. Visually distinct column separator. | Tab (`\t`) | Invisible, harder to debug |
| `@` | Establishes "this is an ID" semantically. | `$` | Also perfect, but less intuitive for IDs |
| `##` | Two-char sequence tokenizers merge into one token. Markdown-familiar. | `===` | 3 chars, less efficient |
| `<` | Reads as "points to" for edges. | `~` | Also perfect, but less semantic |
| `\n` | Universal row separator. Zero overhead. | `;` | Less readable |
| `,` | Schema field separator. Familiar from CSV. | `:` | Conflicts with potential value content |

## Grammar Swap Experiment

To prove GCF's savings are structural (positional fields, keys declared once) and not an artifact of specific delimiter choices, we swapped the entire grammar and re-measured.

### Method

5 delimiter sets, all using characters from the "perfect" category:

| Set | Field | ID | Edge | Section | Schema |
|-----|-------|----|------|---------|--------|
| GCF (actual) | `\|` | `@` | `<` | `##` | `{,}` |
| Alt A | `~` | `$` | `>` | `%%` | `(;)` |
| Alt B | `^` | `!` | `=` | `&&` | `{:}` |
| Alt C | `` ` `` | `#` | `~` | `!!` | `[\|]` |
| Alt D | `;` | `%` | `^` | `$$` | `{+}` |

Each set tested against 5 payload types (employees, orders, logs, code symbols, mixed nested) at 4 sizes (10, 50, 100, 500 records) across all 8 tokenizers. **800 total measurements.**

### Results

| Delimiter set | 10 records | 50 records | 100 records | 500 records | Overall |
|---------------|-----------|-----------|------------|------------|---------|
| GCF (actual) | 59.1% | 60.9% | 61.0% | 60.5% | **60.6%** |
| Alt set A | 58.7% | 60.6% | 60.7% | 60.2% | **60.3%** |
| Alt set B | 59.1% | 61.0% | 61.1% | 60.6% | **60.7%** |
| Alt set C | 58.7% | 60.6% | 60.7% | 60.2% | **60.3%** |
| Alt set D | 58.8% | 60.7% | 60.8% | 60.3% | **60.4%** |

**Spread: 0.4 percentage points across all delimiter sets.** The choice of delimiter character has negligible effect on savings.

### Per-tokenizer consistency

| Tokenizer | GCF | Alt A | Alt B | Alt C | Alt D |
|-----------|-----|-------|-------|-------|-------|
| Claude | 60.8% | 60.4% | 60.8% | 60.4% | 60.4% |
| GPT-4 | 63.2% | 62.8% | 63.2% | 62.8% | 62.8% |
| GPT-4o | 63.1% | 63.1% | 63.5% | 63.1% | 63.1% |
| LLaMA 3.1 | 63.2% | 62.8% | 63.2% | 62.8% | 62.8% |
| Qwen 2.5 | 56.3% | 55.9% | 56.3% | 55.9% | 55.9% |
| DeepSeek V3 | 63.4% | 62.9% | 62.9% | 62.9% | 63.7% |
| Gemma 2 | 60.2% | 59.9% | 60.2% | 59.9% | 59.9% |
| Mistral Nemo | 56.0% | 56.0% | 56.5% | 56.0% | 56.0% |

Variation across delimiter sets: 0.0-0.8pp per tokenizer.

### What this proves

GCF's token savings come from the encoding structure (keys declared once, values positional), not from any specific delimiter character. You could replace every delimiter in the grammar and get the same compression. The format's efficiency is a mathematical property of eliminating key repetition.

## Summary

GCF's grammar is tokenizer-invariant. The delimiters were chosen from the perfect-category character set (single token, never merges) as a robustness guarantee, but the savings themselves are structural. The grammar swap experiment proves this: 0.4pp spread across 5 completely different delimiter sets, 800 measurements.

The comprehension eval data (24 stress-scale runs, 27 generic runs across Claude, GPT, Gemini, and Mistral) confirms this at the behavioral level: no provider-specific anomalies in how models read GCF.

## Reproduce

All experiments are reproducible:

```bash
cd gcf

# Tokenizer variance analysis
node eval/tokenizer-variance.mjs

# Grammar swap experiment
node eval/grammar-swap-experiment.mjs

```bash
cd gcf
npm install @blackwell-systems/gcf @lenml/tokenizers \
  @lenml/tokenizer-claude @lenml/tokenizer-gpt4 @lenml/tokenizer-gpt4o \
  @lenml/tokenizer-llama3_1 @lenml/tokenizer-qwen2_5 \
  @lenml/tokenizer-deepseek_v3 @lenml/tokenizer-gemma2 \
  @lenml/tokenizer-mistral_nemo

node eval/tokenizer-variance.mjs
```
