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

## Design Rationale: Why These Delimiters

GCF's delimiter choices were informed by tokenizer behavior:

| Character | Why chosen | Alternative considered | Why not |
|-----------|-----------|----------------------|---------|
| `\|` (pipe) | Single token universally. Rare in natural text. Visually distinct. | Tab (`\t`) | Invisible, harder to debug |
| `@` | Single token universally. Establishes "this is an ID" semantically. | `#` | Conflicts with section headers |
| `##` | Two-char sequence that all tokenizers merge into one token. Markdown-familiar. | `===` | 3 chars, less efficient |
| `<` | Single token. Reads as "points to" for edges. | `->` | 2 tokens on most tokenizers |
| `\n` | Universal row separator. Zero-cost delimiter. | `;` | Less readable, no semantic meaning |
| `,` | Schema field separator. Familiar from CSV. | `:` | Conflicts with potential value content |

The format avoids:
- Multi-byte Unicode (tokenizer-dependent splitting)
- Whitespace-sensitive indentation (YAML's problem)
- Quote characters in structural positions (JSON's `"key":` overhead)
- Escape sequences (fewer edge cases)

## What this means

GCF's grammar is tokenizer-invariant. The delimiters were chosen for this property. The savings hold because the compression comes from structural elimination of repeated keys, not from any tokenizer-specific trick.

The variance that exists (Qwen splits `95` into two tokens, Gemma splits `.validate` into two tokens) is content variance, not format variance. JSON has the same splits on the same values. If you tested any format on these 8 tokenizers, you'd see the same patterns.

The comprehension eval data (24 stress-scale runs across Claude, GPT, and Gemini) confirms this at the behavioral level: no provider-specific anomalies in how models read GCF.

## Reproduce

```bash
cd gcf
npm install @blackwell-systems/gcf @lenml/tokenizers \
  @lenml/tokenizer-claude @lenml/tokenizer-gpt4 @lenml/tokenizer-gpt4o \
  @lenml/tokenizer-llama3_1 @lenml/tokenizer-qwen2_5 \
  @lenml/tokenizer-deepseek_v3 @lenml/tokenizer-gemma2 \
  @lenml/tokenizer-mistral_nemo

node eval/tokenizer-variance.mjs
```
