# Tokenizer Analysis

Every LLM uses a different tokenizer. A format designed for one tokenizer might perform poorly on another. This page proves GCF's token savings and structural consistency hold across all major tokenizers, and explains *why* JSON breaks down at the tokenization level.

::: tip Key Numbers
- **JSON boundary merge rate:** 8.93% (field names fuse with quotes on half the LLM market)
- **GCF boundary merge rate:** 1.00% (88.8% fewer hidden boundaries)
- **Worst offenders:** `"id":`, `"name":`, `"time":`, `"title":` merge on 63% of tokenizers
- **JSON overhead at 500 rows:** 81% noise, 19% data
- **GCF savings range:** 50-92% depending on features used (session dedup at ceiling)
:::

## The Core Question

When you send structured data to an LLM, the tokenizer converts it into a sequence of integer IDs. Different models use different tokenizers (trained on different corpora, with different vocabulary sizes). This raises two questions:

1. **Are GCF's token savings consistent?** If GCF saves 58% on GPT-4 but only 20% on Claude, the savings claims are misleading.
2. **Are GCF's structural boundaries consistent?** If different models see the data's field boundaries at different token positions, comprehension will vary per model.

The answer to both: **yes, GCF is consistent. JSON is not.** I'll explain why.

First, we need to draw attention to an important distinction in the data. A format has two types of content:

- **Grammar symbols** (delimiters, structural markers): These define where fields start and end. A format designer controls these.
- **Payload content** (the actual data values): These are the user's data. `userName`, `req_xyz789`, `Alice Chen`. A format designer cannot control how these tokenize without changing the data itself, which is unacceptable.

This leads to two types of equivalence across tokenizers:

- **Structural equivalence**: all models see field boundaries at the same token positions. They agree on WHERE the structure is.
- **Semantic equivalence**: all models see the same data values. They agree on WHAT the content is.

Semantic equivalence is always preserved regardless of format: whether `userName` is 1 token or 2, the model reads the same characters. Tokenizer differences in payload content don't affect meaning.

Structural equivalence is the critical one. If models disagree on where fields start and end, they're parsing different structures from the same input. This is what causes model-dependent comprehension failures.

**GCF guarantees structural equivalence.** The pipe is always its own token, so every model sees field boundaries at the same position, regardless of how values split.

**JSON does not.** Its grammar symbols (quotes, colons) merge with payload content on half of tokenizers, making field boundaries invisible at the token level. The structure and the data become one token. Models disagree on where fields start.

---

## Tokenizers Tested

8 tokenizers from 6 providers, covering every major LLM family in production:

| Tokenizer | Provider | Model Family | Vocab Size |
|-----------|----------|-------------|-----------|
| Claude tokenizer | Anthropic | Claude 3.5, 4.x | ~100K |
| cl100k_base | OpenAI | GPT-4 | 100,256 |
| o200k_base | OpenAI | GPT-4o, GPT-5.x | 200,019 |
| LLaMA 3.1 tokenizer | Meta | LLaMA 3.x | 128,256 |
| Qwen 2.5 tokenizer | Alibaba | Qwen 2.5 | 151,936 |
| DeepSeek V3 tokenizer | DeepSeek | DeepSeek V3 | 128,000 |
| Gemma 2 tokenizer | Google | Gemma 2 | 256,128 |
| Mistral Nemo tokenizer | Mistral | Mistral/Ministral | 131,072 |

These tokenizers were trained on different corpora with different merge priorities. Their disagreements on how to tokenize the same input reveal fundamental properties of that input's structure.

---

## Part 1: GCF Savings Are Consistent

Data from `eval/tokenizer-variance.mjs` and `eval/graph-token-efficiency.mjs`.

### 50-59% savings on every tokenizer

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

Every tokenizer produces 50%+ savings. The worst case (Mistral Nemo, 50.3%) still halves the token count. This is measured on 500-order nested data (the generic profile from our comprehension eval) vs pretty-printed JSON (2-space indent), which is what LLMs typically receive from tool responses.

On the [15-dataset token efficiency benchmark](/guide/benchmarks#token-efficiency-15-datasets), GCF vs JSON savings range from 43-65% depending on data complexity, with an overall average of 54.8%.

### Stable from 10 to 500 records

| Payload | Min Savings | Max Savings | Mean Savings | Spread |
|---------|------------|-------------|-------------|--------|
| 10 orders | 51.0% | 57.6% | 55.0% | 6.6pp |
| 50 orders | 51.5% | 59.2% | 56.3% | 7.7pp |
| 100 orders | 51.4% | 59.3% | 56.2% | 7.9pp |
| 500 orders | 50.3% | 58.7% | 55.5% | 8.5pp |

The spread stays under 9 percentage points across all 8 tokenizers at every scale. If you measure 55% savings on one model, you can expect 50-59% on all models.

### Why this matters

Token savings translate directly to cost savings. If your tool produces 500-record responses:
- On GPT-4o: you save 57,000 tokens per response (57.9% of 98,348)
- On Claude: you save 52,500 tokens per response (54.4% of 96,619)
- On Gemma: you save 69,300 tokens per response (55.6% of 124,620)

These savings are predictable regardless of which model processes the data.

### The full savings picture

The 50-59% range above is for one data type (generic profile) proving cross-tokenizer consistency. The actual savings depend on data complexity and usage pattern:

| Scenario | GCF vs JSON (pretty) | GCF vs JSON (compact) | What drives it |
|----------|---------------------|----------------------|----------------|
| Generic profile (flat/nested, 500 orders) | 50-59% | ~30% | Header factorization, inline schemas |
| 15-dataset benchmark (mixed real payloads) | 43-65% | varies | Data complexity determines savings |
| Graph profile (500 symbols + 200 edges) | 63-69% | 40-49% | `@id` refs, edge encoding, section headers |
| Session dedup (90% overlap, call 3 of 5) | **89-90%** | — | Bare references for previously-seen symbols |
| Session dedup (full 5-call session total) | **84.3%** | — | Format + dedup combined |

The graph profile and session deduplication benchmarks show that GCF's advanced features (compact edge encoding, bare references) push savings well beyond the baseline 50-59%. In a real agent session with repeated tool calls to the same codebase, cumulative savings reach 84-92%.

All numbers cross-tokenizer validated (8 tokenizers, 6 providers).

---

## Part 2: Why JSON Breaks Down

Data from `eval/structural-variance.mjs`, `eval/common-field-merge-analysis.mjs`, and `eval/worst-json-tokenization.mjs`.

![Field Merge Rates](/charts/field-merge-rates.png)

### The structural boundary problem

JSON uses quote-colon patterns (`"fieldName":`) to mark each field. These patterns repeat on every row. We discovered that these patterns **tokenize inconsistently across models**: the opening quote sometimes merges with the field name into a single token.

When GPT-4 tokenizes `"value":"pending"`, it produces:

```
["value] [":"] [pending] ["]    ← 4 tokens
```

The opening quote and field name `value` are **one token**. Claude tokenizes the same string as:

```
["] [value] [":"] [pending] ["]    ← 5 tokens
```

The quote is separate from the field name. **The structural boundary (where the field name starts) is at a different token position depending on which model processes the data.**

This is verified across all 8 tokenizers for this specific example:
- **Merged** (4 tokens): GPT-4, GPT-4o, LLaMA, Qwen
- **Separate** (5 tokens): Claude, DeepSeek, Gemma, Mistral

### The merge rate: 22/120 (18.3%)

We tested 15 common JSON field-name patterns across all 8 tokenizers (120 checks total). The opening quote merges with the field name on 22 of those checks.

| Pattern | Merge rate | Models that merge |
|---------|-----------|-------------------|
| `"name":` | **5/8** | GPT-4, GPT-4o, LLaMA, Qwen, Mistral |
| `"value":` | **4/8** | GPT-4, GPT-4o, LLaMA, Qwen |
| `"userName":` | **1/8** | GPT-4o |
| `"tier":` | **0/8** | (but token count still varies 3-4 due to DeepSeek/Mistral splitting differently) |

The worst case: `"name":` merges on **5 of 8 tokenizers**. This is one of the most common field names in real-world JSON. At 500 rows, that's 500 positions where the majority of models see an ambiguous boundary.

### Why merging matters for comprehension

When a model sees `["value]` as one token, it must learn to decompose this into "opening quote + field name." This is an extra inference step that doesn't exist when the boundary is explicit.

At 10 records, this barely matters. Models handle it fine. But at 500 records, there are thousands of these merged boundaries competing for attention. The model's attention mechanism must repeatedly decode structural position from ambiguous tokens across 10,000+ positions.

This is why our comprehension eval shows:
- 100% accuracy at small scale (all formats)
- 53.4% JSON accuracy at 500 records (stress scale)
- 91.2% GCF accuracy at 500 records

The degradation is caused by the combination of ambiguous boundaries AND token repetition (more on this below).

### Worst case: 7 distinct tokenizations

We searched 840 JSON field+value patterns (40 field names x 21 values) to find maximum variance. The worst:

`"userName":"req_xyz789"` produces **7 distinct tokenizations** across 8 models:

```
GPT-4, LLaMA:     ["][userName][":"][req][_xyz][789]["]
GPT-4o:           ["user][Name][":"][req][_xyz][789]["]
Claude:           ["][userName][":"][req][_][xyz][789]["]
Qwen 2.5:        ["][userName][":"][req][_xyz][7][8][9]["]
DeepSeek V3:     ["][user][Name][":"][req][_][xyz][789]["]
Gemma 2:         ["][userName][":"][req][_][xyz][7][8][9]["]
Mistral Nemo:    ["][user][Name][":"][req][_x][yz][7][8][9]["]
```

Almost every model sees a structurally different token sequence. Note how GPT-4o merges the quote into `["user]` while others keep it separate.

A complete JSON object `{"orderId":"ORD-001","value":"shipped"}` produces **4 different token counts** (12, 13, 14, 15) depending on the model. The same data is literally a different length on different model families.

---

## Part 3: GCF Grammar Merges 88.8% Less

Data from `eval/structural-variance.mjs` and `eval/common-field-merge-analysis.mjs`.

### Real-world merge rates: JSON 8.93% vs GCF 1.00%

We tested boundary merge rates using actual data from our comprehension eval (14 field names, 25 values, 2,800 checks per format across all 8 tokenizers):

| Format | Boundary merges | Rate | Cause |
|--------|----------------|------|-------|
| JSON | 250/2,800 | **8.93%** | `"id":` and `"name":` merge on 5/8 tokenizers (62.5%) |
| GCF | 28/2,800 | **1.00%** | Only `cancelled` value triggers merge (25% on 2 tokenizers) |

**GCF has 88.8% fewer boundary merges on real data.**

The critical difference: JSON's merges are caused by **field names** (which repeat on every row, compounding at scale). GCF's merges are caused by one **value** (which appears occasionally). At 500 rows with `"id"` and `"name"` fields, JSON has ~625 hidden boundaries. GCF has a handful.

GCF's grammar characters are always 1 token in isolation on all 8 tokenizers:

| Character | Purpose | Single token (8/8) |
|-----------|---------|-------------------|
| `\|` (pipe) | Field delimiter | Yes |
| `@` | Symbol ID prefix | Yes |
| `<` | Edge direction | Yes |
| `##` | Section header | Yes |
| `\n` | Row separator | Yes |
| `{` `}` `[` `]` `,` | Schema/count | Yes |

With typical adjacent content (alphabetic values, numbers), pipe remains separate:

```
value|pending        → [value][|][pending]       ALL 8 tokenizers
name|Alice           → [name][|][Alice]          ALL 8 tokenizers
orderId|ORD-001      → [orderId][|][ORD][-][001] ALL 8 tokenizers
```

Under adversarial conditions (values starting with `/`, `.`, `-`), pipe can merge on some tokenizers (e.g., `[|/]` on LLaMA and Gemma when value starts with `/`). However, even when this occurs, the pipe is always at the **start** of the merged token, meaning the boundary position is still identifiable. In JSON, the quote merges with the field name **after** it (`["value]`), hiding the boundary inside.

On real eval data (14 fields, 25 values), this adversarial merge happens on only 1.00% of checks vs JSON's 8.93%.

### The same data in both formats

Using the verified example `"value":"pending"` vs `value|pending`:

**JSON (variance):**
- GPT-4, GPT-4o, LLaMA, Qwen: `["value][":"][pending]["]` (4 tokens)
- Claude, DeepSeek, Gemma, Mistral: `["][value][":"][pending]["]` (5 tokens)

**GCF (no variance):**
- All 8 tokenizers: `[value][|][pending]` (3 tokens)

Same data. JSON produces two different structural representations. GCF produces one.

### Why this was a deliberate design choice

Before choosing GCF's grammar, we tested all 94 printable ASCII characters (codes 33-126) across all 8 tokenizers on two criteria:

1. **Single token in isolation:** does the character encode as exactly 1 token?
2. **Never merges with adjacent text:** does `Xfoo` tokenize as `X` + `foo` (separate) or `Xfoo` (merged)?

**74 of 94 characters are safe.** 20 characters merge. The unsafe characters include:

| Character | Why it merges |
|-----------|--------------|
| `.` | Merges into `.validate`, `.com`, `.json` |
| `-` | Merges into `-token`, `-based`, `-style` |
| `_` | Merges into `_name`, `_id`, `_count` |
| `/` | Merges into `/api`, `/path` |
| `(` | Merges into `(foo` on some tokenizers |
| Lowercase letters | Common subword prefixes |

JSON uses `.`, `"`, and `:` as structural characters. All three can create merge patterns. GCF uses only characters from the safe set (`|`, `@`, `<`, `#`, `{`, `}`, `[`, `]`, `,`, `\n`).

---

![Overhead Scaling](/charts/overhead-scaling.png)

## Part 4: JSON's Token Overhead Problem

Data from `eval/json-tokenization-analysis.mjs`.

Beyond structural ambiguity, JSON also burns the majority of its tokens on content that carries zero information after the first row.

### Where tokens go (500-row frequency table)

| Category | JSON tokens | % of total |
|----------|------------|------------|
| Repeated field names (`"field":`, `"value":`, etc.) | 5,500 | **52.4%** |
| Structural characters (`{`, `}`, `[`, `]`, `:`, `,`) | 3,001 | **28.6%** |
| Actual data values | 1,995 | **19.0%** |
| **Total** | **10,496** | |

**81% of JSON's tokens are overhead.** Only 19% carry actual information.

GCF for the same data:

| Category | GCF tokens | % of total |
|----------|-----------|------------|
| Header (field names, declared once) | 10 | **0.2%** |
| Data rows | 6,500 | **99.8%** |
| **Total** | **6,510** | |

### The cost per field

Each JSON field-name pattern costs tokens on **every single row**:

| Field pattern | Tokens per row | × 500 rows | Total cost |
|--------------|---------------|------------|-----------|
| `"field":` | 3 | × 500 | 1,500 tokens |
| `"value":` | 2 | × 500 | 1,000 tokens |
| `"count":` | 3 | × 500 | 1,500 tokens |
| `"percentage":` | 3 | × 500 | 1,500 tokens |

In GCF, all four field names appear **once** in the header:
```
## [500]{field,value,count,percentage}
```
Cost: 10 tokens total. Same information, 550x fewer tokens.

### JSON overhead grows linearly. GCF is constant.

| Rows | JSON overhead | GCF overhead | Ratio |
|------|--------------|--------------|-------|
| 10 | 171 tokens | 10 tokens | 17:1 |
| 50 | 851 tokens | 10 tokens | 85:1 |
| 100 | 1,701 tokens | 10 tokens | 170:1 |
| 500 | 8,501 tokens | 10 tokens | 850:1 |
| 1,000 | 17,001 tokens | 11 tokens | **1,545:1** |

At 1,000 rows, JSON burns 17,001 tokens on overhead. GCF uses 11. Every additional row adds ~17 tokens of overhead in JSON and zero in GCF.

### Cross-tokenizer validation

This pattern holds across all 8 tokenizers:

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

Every tokenizer confirms: JSON spends **42-57% of its tokens on repeated field names** alone. GCF eliminates this overhead entirely.

---

## Part 5: Why This Explains Comprehension Failures

Connects tokenization findings to comprehension eval data (2,400+ LLM calls across 11 models).

The tokenization analysis connects directly to the [comprehension eval data](/guide/benchmarks):

- JSON accuracy on stress-scale data: **53.4%** (10 models, 24 runs)
- GCF accuracy on stress-scale data: **91.2%**
- GCF accuracy on standard workloads: **100%** on every frontier model

**Why does JSON fail at scale?**

1. **Ambiguous structural boundaries** (8.93% merge rate on real data). The model sees different structure depending on which model reads it.
2. **Overwhelming repetition** (52% of tokens are repeated field names). The attention mechanism has 5,500 tokens that all look identical competing for attention budget.
3. **Low signal-to-noise ratio** (19% data, 81% overhead). The model must find relevant information buried in structural noise.

**Why does GCF succeed?**

1. **Near-zero boundary merging** (1.00% merge rate). Every model sees consistent structure.
2. **Zero repetition** (field names declared once). No identical tokens competing for attention.
3. **99.8% signal** (almost every token is data). The attention mechanism focuses on content.

The model doesn't fail because JSON is "too long." It fails because at 500+ rows, there are thousands of structurally ambiguous token boundaries diluting attention, while 80% of token positions carry no information. GCF eliminates both problems simultaneously.

### Observed failure patterns from 2,400+ evaluations

Across 24 stress-scale runs (500 symbols, 200 edges, 13 questions per run), we classified every wrong answer by failure type. The patterns connect directly to the tokenization findings:

| Model | Format | Failure pattern | Tokenization explanation |
|-------|--------|----------------|------------------------|
| GPT-5.4 | JSON | Always answers `edge_count=198` (correct: 200). Same wrong number every run. | GPT-4o tokenizer merges `"id":`, `"name":`, `"type":` on every row. Consistent merge = consistent parsing offset. |
| GPT-5.4 | JSON | Always answers `function_count=84` (correct: varies). Deterministic. | Same mechanism. Column scan across 500 merged-boundary rows produces repeatable miscount. |
| GPT-5.5 | JSON | Returns empty string on most questions. | 53K tokens, 81% overhead. Attention has nothing to lock onto. Context overwhelm. |
| All models | JSON | Distance-filtering wrong by 50-140 (e.g., 143 vs 167). | Must attend to 500 identical `"distance":` patterns and filter by value. No structural marker distinguishes the 150th from the 350th. |
| Opus | JSON | Manually enumerates 143 lines trying to count, still wrong. | Model falls back to chain-of-thought enumeration because it can't structurally extract the answer. |
| Claude | GCF | Never fails. | Claude's tokenizer keeps all boundaries clean. GCF's structure answers questions directly (`## related [167]`). |
| GPT-5.4 | GCF | Off-by-1-2 on `edge_count`, `function_count`. Deterministic. | Pipe is always separate (structure parseable), but value content (`fn` vs `function`) may split differently. Precision error, not comprehension error. |
| All frontier | GCF | 100% on standard workloads. | 1% merge rate + 99.8% signal + structural answers = no failure mechanism. |

GCF's errors are small (off by 1-2) because the model understood the structure but slightly misread a value. JSON's errors are large (off by 50-140) because the model couldn't find the structure at all. Hidden boundaries compound into comprehension failure. Clean boundaries enable structural extraction.

**Error magnitude:**
- GCF median error: **4** (precision)
- TOON median error: **53** (comprehension failure)
- JSON median error: **56** (comprehension failure)

For the complete per-run failure data, see [Benchmarks (Full Data): Failure Taxonomy](/guide/eval-results#failure-taxonomy).

---

## Part 6: The Grammar Swap Experiment

Data from `eval/grammar-swap-experiment.mjs`.

To prove GCF's savings are structural (positional fields, keys declared once) and not an artifact of specific delimiter choices, we swapped the entire grammar and re-measured.

### Method

5 delimiter sets, all using characters from the "perfect" (non-merging) category:

| Set | Field | ID | Edge | Section | Schema |
|-----|-------|----|------|---------|--------|
| GCF (actual) | `\|` | `@` | `<` | `##` | `{,}` |
| Alt A | `~` | `$` | `>` | `%%` | `(;)` |
| Alt B | `^` | `!` | `=` | `&&` | `{:}` |
| Alt C | `` ` `` | `#` | `~` | `!!` | `[\|]` |
| Alt D | `;` | `%` | `^` | `$$` | `{+}` |

5 payload types, 4 sizes, 8 tokenizers. **800 total measurements.**

### Results

| Delimiter set | Overall savings |
|---------------|----------------|
| GCF (actual) | **60.6%** |
| Alt set A | **60.3%** |
| Alt set B | **60.7%** |
| Alt set C | **60.3%** |
| Alt set D | **60.4%** |

**Spread: 0.4 percentage points.** You could replace every delimiter in the grammar and get the same compression. The format's efficiency is a mathematical property of eliminating key repetition, not an artifact of which specific characters are used.

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

0.0-0.8pp variation per tokenizer across delimiter sets.

### What this proves

GCF's delimiters were chosen from the safe character set as a **robustness guarantee** (consistent boundaries across all models). But the savings themselves come from the encoding structure:
- Field names declared once in a header (not repeated per row)
- Values encoded positionally (no key-value pair overhead)
- One line per record (no braces, no brackets per row)

Any format that makes these three structural choices would achieve similar savings, regardless of which specific delimiter characters it uses.

---

## Part 7: Syntactic Deep Dive

For completeness, here is exactly how each tokenizer handles GCF's core syntax elements. This data is produced by `eval/tokenizer-variance.mjs`.

### Edge declaration: `@0<@2|implements`

| Tokenizer | Tokens | Split |
|-----------|--------|-------|
| Claude | 7 | `@` `0` `<` `@` `2` `\|` `implements` |
| GPT-4 | 7 | `@` `0` `<` `@` `2` `\|` `implements` |
| GPT-4o | 7 | `@` `0` `<` `@` `2` `\|` `implements` |
| LLaMA 3.1 | 7 | `@` `0` `<` `@` `2` `\|` `implements` |
| Qwen 2.5 | 7 | `@` `0` `<` `@` `2` `\|` `implements` |
| DeepSeek V3 | 8 | `@` `0` `<` `@` `2` `\|` `im` `plements` |
| Gemma 2 | 7 | `@` `0` `<` `@` `2` `\|` `implements` |
| Mistral Nemo | 8 | `@` `0` `<` `@` `2` `\|` `im` `plements` |

All structural characters (`@`, `<`, `|`) are always single tokens. The only variance is in the value `implements` (1 vs 2 tokens), which doesn't affect parsing.

### Symbol row: `@0|function|auth.validateToken|0.95|definition`

| Tokenizer | Tokens | Key Differences |
|-----------|--------|----------------|
| GPT-4 | 14 | Merges `.validate` (1 tok), `95` (1 tok) |
| Qwen 2.5 | 15 | Splits `95` → `9` + `5` |
| Gemma 2 | 16 | Splits `.` + `validate`, splits `9` + `5` |

The pipe delimiters are always single tokens. Variance is only in how tokenizers handle value content:
- **Dot-prefixed words:** `.validate` (1 tok on GPT-4) vs `.` + `validate` (2 tok on Gemma)
- **Two-digit numbers:** `95` (1 tok on GPT-4) vs `9` + `5` (2 tok on Qwen/Gemma)

This is value variance (harmless, doesn't affect structure) not boundary variance (dangerous, affects parsing).

### Design rationale: why these specific delimiters

From the 74 perfect candidates, GCF chose based on semantics and readability:

| Character | Why chosen | Alternative considered | Why not |
|-----------|-----------|----------------------|---------|
| `\|` (pipe) | Rare in natural text. Visually distinct column separator. | Tab (`\t`) | Invisible, harder to debug |
| `@` | Establishes "this is an ID" semantically. | `$` | Also perfect, but less intuitive |
| `##` | Two-char sequence that tokenizers always merge into one token. Markdown-familiar. | `===` | 3 chars, less efficient |
| `<` | Reads as "points to" for edges. | `~` | Also perfect, but less semantic |
| `\n` | Universal row separator. Zero overhead. | `;` | Less readable |
| `,` | Schema field separator. Familiar from CSV. | `:` | Conflicts with potential value content |

---

![Vocabulary Merge Entries](/charts/vocab-merge-entries.png)

## Part 8: Root Cause — Vocabulary Entry Analysis

Data from `eval/tokenizer-vocabulary-analysis.mjs` and `eval/vocabulary-full-scan.mjs`.

Parts 2-3 showed that JSON's grammar merges with payload content. Part 4 showed the overhead. Part 5 connected it to comprehension failures. But none of those answered the fundamental question: **why does the merge happen?**

The answer is in the tokenizer vocabularies themselves.

### How BPE tokenizers work

Every BPE tokenizer has a fixed vocabulary: a table mapping strings to integer IDs. GPT-4's cl100k vocabulary has 100,256 entries. Gemma's has 256,128. These are built during tokenizer training (separate from model training) by iteratively merging the most frequent byte pairs in the training corpus.

When the tokenizer encounters input text, it greedily matches the longest vocabulary entry at each position. If `"name` exists as entry #32586, the tokenizer will always select it as a single token rather than splitting into `"` (#1) + `name` (#609). This is deterministic. There is no probability or context-dependence. If the entry exists, it wins.

### JSON field names are vocabulary entries

We looked up specific merged tokens by ID across all 8 tokenizers:

| Pattern | GPT-4 | GPT-4o | Claude | LLaMA | Qwen | DeepSeek | Gemma | Mistral |
|---------|-------|--------|--------|-------|------|----------|-------|---------|
| `"id` | #29800 | #60094 | — | #29800 | #28700 | — | — | #117579 |
| `"name` | #32586 | #74800 | — | #32586 | #31486 | — | — | #117753 |
| `"type` | #45570 | #91290 | — | #45570 | #44470 | — | — | — |
| `"value` | #64407 | #180654 | — | #64407 | #63307 | — | — | — |
| `"time` | #33239 | #74035 | — | #33239 | #32139 | — | — | #79174 |
| `"title` | #83827 | #187286 | — | #83827 | #82727 | — | — | #110760 |
| `"text` | #67351 | #171858 | — | #67351 | #66251 | — | — | — |
| `"url` | #61360 | #124415 | — | #61360 | #60260 | — | — | — |
| `"path` | #71788 | #184610 | — | #71788 | #70688 | — | — | — |
| `"description` | #69093 | #150676 | — | #69093 | #67993 | — | — | — |
| `"user` | #77622 | #167975 | — | #77622 | #76522 | — | — | — |

**These are actual token IDs in the vocabulary.** Entry #32586 in GPT-4's vocabulary IS the string `"name`. It will always be selected. This is not a context-dependent merge decision. It's a dictionary lookup.

**Claude and Gemma have zero quote+field entries.** That's why they keep boundaries clean: the merged token doesn't exist in their vocabulary, so the tokenizer is forced to split `"` and `name` into separate tokens.

### Cross-verification: vocabulary entries are actually used

We confirmed that every vocabulary entry is selected during real tokenization:

```
"name":"Alice"

GPT-4:   CONFIRMED — vocab entry #32586 selected → ["name][":"][Alice]["]
Claude:  clean — not in vocab, not selected       → ["][name][":"][Alice]["]
```

The entry isn't dead vocabulary. It actively causes boundary hiding in every JSON payload that contains a `name` field.

### Full vocabulary scan: exhaustive counts

We decoded every single entry in each tokenizer's vocabulary and classified it:

| Tokenizer | Vocab size | Quote+letter entries | Pipe+letter entries | Ratio | Mixed grammar+payload |
|-----------|-----------|---------------------|---------------------|-------|----------------------|
| GPT-4 | ~100K | **114** | 17 | **6.7:1** | 787 |
| GPT-4o | ~200K | **86** | 6 | **14.3:1** | 641 |
| Claude | ~65K | **0** | 0 | clean | 0 |
| LLaMA 3.1 | ~128K | **114** | 18 | **6.3:1** | 787 |
| Qwen 2.5 | ~131K | **114** | 17 | **6.7:1** | 787 |
| DeepSeek V3 | ~128K | **42** | 4 | **10.5:1** | 348 |
| Gemma 2 | ~256K | **0** | 0 | clean | 2 |
| Mistral Nemo | ~131K | **31** | 3 | **10.3:1** | 355 |

GPT-4 has **114 vocabulary entries** where a quote character is fused with a following word. It has **17** where a pipe is fused with a following word. The ratio is 6.7:1. The quote is nearly 7x more likely to appear in a merged vocabulary entry than the pipe.

Claude and Gemma have **zero** quote+letter entries. This is why they handle JSON's structural boundaries cleanly: the merged token simply doesn't exist in their dictionary.

### Multi-grammar vocabulary entries

Some vocabulary entries contain multiple JSON grammar symbols fused together:

| Token | Grammar chars | Present in |
|-------|--------------|------------|
| `":"` | `"` `:` `"` | **8/8** tokenizers |
| `","` | `"` `,` `"` | **8/8** tokenizers |
| `{"` | `{` `"` | **8/8** tokenizers |
| `":{"` | `"` `:` `{` `"` | **8/8** tokenizers |
| `":["` | `"` `:` `[` `"` | **6/8** tokenizers |
| `"},` | `"` `}` `,` | **8/8** tokenizers |
| `"],` | `"` `]` `,` | **8/8** tokenizers |
| `},{"` | `}` `,` `{` `"` | **6/8** tokenizers |

`":"` (close-quote, colon, open-quote) exists as a single token on **every tokenizer**. This means the entire field-value separator in JSON (`"field":"value"`) is tokenized as three chunks: `["field][":][ "value"]["]`. The colon that separates key from value is fused with quotes on both sides. The structural operation "this is where the key ends and the value begins" is buried inside a token.

`":{"` exists on 8/8 tokenizers. This single token represents: close a string, start a key-value pair, open an object, start a new string. Four structural operations in one token.

### Why these entries exist

BPE builds vocabulary by counting byte-pair frequencies in the training corpus. JSON is one of the most common data formats in code training data:

- Every GitHub repository has `package.json`, `tsconfig.json`, configuration files
- Every API documentation shows JSON request/response examples
- Every Stack Overflow answer about web development demonstrates JSON parsing
- Every log file, data dump, and test fixture contains JSON

The byte sequence `"name` appears in training data billions of times. The tokenizer learned it as a high-frequency merge and added it to the vocabulary. This is efficient for compression (fewer tokens to represent common patterns), but it creates structural ambiguity: the grammar symbol (`"`) and the payload content (`name`) become inseparable.

### The training familiarity paradox

The conventional wisdom is that LLMs "know" JSON best because they've been trained on more JSON than any other structured format. This is true at the model level. But at the tokenizer level, the opposite happens: **the more JSON the tokenizer saw, the more aggressively it merged JSON patterns, and the more structural boundaries it hid.**

The models that saw the MOST JSON have the WORST JSON boundaries:

- GPT-4 (massive code corpus): **114 merged entries**
- LLaMA (large code mix): **114 merged entries**
- Claude (different tokenizer strategy): **0 merged entries**

The training familiarity didn't create structural understanding. It created compression. The tokenizer optimized for representing JSON in fewer tokens, which is exactly what a compression algorithm should do. But compression hides structure. The quote and the field name became one token because that's more efficient for storage. It's less efficient for comprehension.

This inverts the standard argument entirely. "Trained on JSON" is not an advantage for structural comprehension. It's the mechanism that causes structural ambiguity. The tokenizer's efficiency is the model's handicap.

### Why Claude and Gemma don't have this problem

Claude's tokenizer has zero quote+letter entries. Gemma's has zero. Why?

The tokenizer training details are proprietary, but there are measurable differences that explain it:

- **Vocabulary size:** Claude's vocabulary is ~65K (smallest tested). Smaller vocabularies are more conservative about which merges to include. There's less room for specialized patterns like `"name`. GPT-4's 100K vocabulary has budget for these merges.
- **Training data mix:** Tokenizers trained on corpora with less code/JSON relative to natural language will see `"name` less frequently, making it less likely to cross the merge threshold.
- **Merge boundary policy:** BPE training can be configured to treat certain characters as merge barriers (never merge across them). Anthropic and Google may have intentionally prevented `"` from merging with adjacent letters.

Notably, Gemma's vocabulary is the **largest** (256K) yet has zero quote merges. A larger vocabulary doesn't automatically mean more merges. The merge policy matters more than the vocabulary size.

The result is measurable regardless of cause: Claude and Gemma keep structural boundaries clean. GPT-4, LLaMA, and Qwen do not.

### Why this is irrecoverable

Four properties make this unfixable:

1. **Vocabulary is frozen.** Once the tokenizer is trained, its vocabulary never changes. Model fine-tuning adjusts weights but cannot add, remove, or modify vocabulary entries.

2. **All existing weights depend on the vocabulary.** Token ID #32586 has a learned embedding vector in GPT-4's weights. If you removed it, every layer that references that embedding would break.

3. **The merge is pre-model.** Tokenization happens before the model sees the input. By the time the transformer processes the sequence, `"name` is already a single integer. The model cannot "see inside" a token to decompose it.

4. **Retraining the tokenizer requires retraining the model.** A new vocabulary means new token IDs, new embeddings, new attention patterns. The entire model must be retrained from scratch.

This means: for every model using GPT-4's cl100k tokenizer (including GPT-4, GPT-4o, GPT-5.x), the string `"name` will always be one token. The structural boundary will always be hidden. No amount of prompting, fine-tuning, or RLHF can change this. It's a dictionary entry.

### What about GCF's pipe?

The pipe character does have a small number of merged entries:

| Tokenizer | Pipe+letter entries | Examples |
|-----------|--------------------| ---------|
| GPT-4 | 17 | `\|null`, `\|string`, `\|max`, `\|min`, `\|required` |
| Claude | 0 | (none) |
| LLaMA | 18 | `\|null`, `\|string`, `\|max`, `\|min`, `\|required` |
| Gemma | 0 | (none) |

The pipe merges that exist are with **programming keywords** (`null`, `string`, `max`, `min`, `required`) from TypeScript/Go type union syntax (`string|null`). Critically, `|name`, `|id`, `|type`, `|value` never exist as vocabulary entries on any tokenizer. The pipe never merges with the field names that matter for structured data comprehension.

The quote merges with the most common field names in computing. The pipe merges with a handful of type-system keywords. This is the root cause of the 6.7:1 to 14.3:1 ratio in vocabulary merge entries.

---

## Summary

| Claim | Evidence |
|-------|----------|
| GCF savings are 50-59% on all tokenizers | 8 tokenizers tested, worst case 50.3% |
| GCF savings are stable at all scales | 10 to 500 records, spread < 9pp |
| GCF has 88.8% fewer boundary merges than JSON | Real eval data: GCF 1.00% vs JSON 8.93% (2,800 checks) |
| JSON merges compound at scale | Caused by field names (repeat per row): "id" and "name" merge on 62.5% of tokenizers |
| GCF merges are rare and non-compounding | Caused by one value ("cancelled"), not field names |
| JSON overhead is 81% at 500 rows | Cross-tokenizer validated |
| JSON overhead grows linearly | O(n) per row, ratio 1,545:1 at 1000 rows |
| GCF savings are structural, not delimiter-specific | Grammar swap: 0.4pp spread across 5 delimiter sets, 800 measurements |
| No delimiter is perfect under adversarial conditions | All candidates merge on some right-contexts; GCF chose lowest merge-rate set |
| JSON merges are hardcoded vocabulary entries | `"name` = #32586 on GPT-4. Exists in dictionary. Always selected. |
| Quote+letter vocab entries outnumber pipe 6.7:1 to 14.3:1 | GPT-4: 114 quote vs 17 pipe. Claude/Gemma: 0 vs 0. |
| Merges are irrecoverable | Can't fix with prompting, fine-tuning, or RLHF. Vocabulary is frozen. |
| This explains comprehension failures | 53.4% JSON at stress scale (ambiguous boundaries + attention dilution) vs 91.2% GCF |

---

## Reproduce

All experiments are reproducible:

```bash
cd gcf
npm install @blackwell-systems/gcf @lenml/tokenizers \
  @lenml/tokenizer-claude @lenml/tokenizer-gpt4 @lenml/tokenizer-gpt4o \
  @lenml/tokenizer-llama3_1 @lenml/tokenizer-qwen2_5 \
  @lenml/tokenizer-deepseek_v3 @lenml/tokenizer-gemma2 \
  @lenml/tokenizer-mistral_nemo

# Token savings consistency (8 tokenizers, multiple scales)
node eval/tokenizer-variance.mjs

# Structural variance (merge analysis, boundary consistency)
node eval/structural-variance.mjs

# Worst-case JSON tokenization (maximum variance search)
node eval/worst-json-tokenization.mjs

# JSON overhead analysis (token distribution, scaling)
node eval/json-tokenization-analysis.mjs

# Vocabulary entry analysis (root cause: merged tokens are dictionary entries)
node eval/tokenizer-vocabulary-analysis.mjs

# Full vocabulary scan (exhaustive: every entry in every vocabulary)
node eval/vocabulary-full-scan.mjs

# Grammar swap experiment (proves savings are structural)
node eval/grammar-swap-experiment.mjs
```

---

## What To Do About This

If your structured data enters LLM context windows at scale (100+ records), you have two options:

1. **Use GCF.** Encode with `encode_generic()` before sending to the LLM. Decode with `decode_generic()` afterward. Six language implementations, zero dependencies, drop-in.

2. **Keep using JSON and accept the consequences.** Your most common field names (`id`, `name`, `type`, `value`, `title`, `time`, `text`, `url`, `path`, `description`) have hidden structural boundaries on GPT-4, GPT-4o, LLaMA, and Qwen. This compounds per row. At 500 rows, you're asking the model to comprehend data through 1,500+ ambiguous token boundaries while 81% of its input is structural noise.

There is no option 3. You cannot fix JSON's tokenization without changing JSON's grammar, which would make it not JSON. And you cannot fix the tokenizer without retraining the model from scratch: the merged vocabulary entries (`"name` = #32586, `"id` = #29800, `"type` = #45570) are permanent, and all model weights depend on them.
