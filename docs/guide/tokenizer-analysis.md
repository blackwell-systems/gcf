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

## Key Findings

1. **GCF structural delimiters (`|`, `@`, `<`, `##`) are single tokens on every tokenizer.** These are the characters that define the format's grammar. Zero ambiguity, zero cross-tokenizer divergence on format syntax.

2. **Token variance is in the values, not the format.** The same qualified names, numbers, and email addresses vary across tokenizers whether they're encoded in GCF or JSON. This is a property of the content, not the encoding.

3. **Savings are format-inherent.** GCF's advantage comes from declaring keys once (header) instead of repeating them per row. This structural property produces consistent savings regardless of how individual values tokenize.

4. **Comprehension is unaffected.** Whether `.validateToken` is 1 or 2 tokens, the model reads the same semantic content. This is confirmed by 24 stress-scale eval runs across 3 providers showing no tokenizer-specific anomalies.

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
