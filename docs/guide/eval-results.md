# Benchmarks (Full Data)

Complete data from all eval runs. For the summary, see [Benchmarks](/guide/benchmarks).

---

## Comprehension: All 23 Runs

500 symbols, 200 edges, 13 structured extraction questions, zero format instructions. Each run generates a fresh random payload.

| Model | Run | GCF | TOON | JSON | GCF wins? |
|-------|-----|-----|------|------|-----------|
| Claude Opus 4.6 | 1 | **100%** | 92.3% | 76.9% | ✓ |
| Claude Opus 4.6 | 2 | **92.3%** | 76.9% | 69.2% | ✓ |
| Claude Sonnet 4.6 | 1 | **100%** | 76.9% | 53.8% | ✓ |
| Claude Sonnet 4.6 | 2 | **100%** | 69.2% | 53.8% | ✓ |
| Claude Haiku 4.5 | 1 | **92.3%** | 69.2% | 61.5% | ✓ |
| Claude Haiku 4.5 | 2 | **100%** | 69.2% | 53.8% | ✓ |
| GPT-5.5 | 1 | **91.7%** | 66.7% | 50.0% | ✓ |
| GPT-5.5 | 2 | **76.9%** | 69.2% | 46.2% | ✓ |
| GPT-5.5 | 3 | **76.9%** | 69.2% | 46.2% | ✓ |
| GPT-5.5 | 4 | **91.7%** | 66.7% | 50.0% | ✓ |
| GPT-5.5 | 5 | **83.3%** | 66.7% | 36.4% | ✓ |
| GPT-5.4 | 1 | **75.0%** | 58.3% | 41.7% | ✓ |
| GPT-5.4 | 2 | **76.9%** | 53.8% | 46.2% | ✓ |
| GPT-5.4 | 3 | **76.9%** | 53.8% | 38.5% | ✓ |
| GPT-5.4 | 4 | **76.9%** | 58.3% | 50.0% | ✓ |
| GPT-5.4-mini | 1 | **76.9%** | 61.5% | 58.3% | ✓ |
| GPT-5.4-mini | 2 | **66.7%** | **66.7%** | 50.0% | tied |
| Gemini 2.5 Flash | 1 | **76.9%** | 58.3% | 53.8% | ✓ |
| Gemini 2.5 Flash | 2 | **75.0%** | 50.0% | 57.1% | ✓ |
| Gemini 2.5 Flash | 3 | **90.0%** | 55.6% | 60.0% | ✓ |
| Gemini 3.5 Flash | 1 | **100%** | 61.5% | 46.2% | ✓ |
| Gemini 2.5 Pro | 1 | **100%** | 76.9% | 58.3% | ✓ |
| Gemini 3.1 Pro | 1 | **100%** | 76.9% | 46.2% | ✓ |

**23 runs, 10 models, 3 providers. GCF wins 22, ties 1, loses 0. Four models achieve 100%: Sonnet, Gemini 2.5 Pro, Gemini 3.1 Pro, Gemini 3.5 Flash.**

### Score variance

Models with 2+ runs show how consistent each format is.

![Comprehension Variance](/charts/comprehension-variance.png)

### GCF advantage by model tier

The advantage grows on weaker models. Frontier models can brute-force flat data. Smaller models cannot.

![GCF Advantage by Tier](/charts/advantage-by-tier.png)

### Token cost vs accuracy

GCF is in the top-left: fewer tokens, higher accuracy.

![Token Cost vs Accuracy](/charts/tokens-vs-accuracy.png)

---

## Failure Taxonomy

Classified from all FAIL lines across 23 runs (39 questions per run, 3 formats each).

![Error Magnitude](/charts/error-magnitude.png)

GCF median error: **4**. TOON median error: **53**. JSON median error: **56**. GCF encodes answers structurally (`## related [167]`). TOON/JSON force the model to compute them from raw data.

### GCF failures: precision errors

GCF fails on precision (off by 1-2). The structure is understood; the count is slightly misread.

| Type | Count | Models | Cause |
|------|-------|--------|-------|
| Off-by-1-2 header misread | 5 | Haiku (1), GPT-5.4 (3), mini (1) | Header says `[167]`, model reads 166. Tokenization artifact. |
| Column scan miscount | 10 | GPT-5.4 (7), mini (3) | Must scan `fn` kind across rows. `function_count`=84 deterministically. |
| Field confusion | 2 | GPT-5.4 (1), mini (1) | Read symbol count instead of edge count. |
| Empty response | 10 | GPT-5.5 (10) | Context overwhelm at 53k+ input tokens. |

### TOON failures: comprehension errors

TOON fails on comprehension (wrong by 50-140). The model cannot filter a flat list by column value at scale.

| Type | Count | Models | Cause |
|------|-------|--------|-------|
| Distance grouping failure | 25 | Opus/Sonnet (3), Haiku (6), GPT-5.4 (11), mini (5) | Must scan 500 rows and filter by `distance` column. Wildly inconsistent answers. |
| Round-number guessing | 7 | Haiku (1), mini (6) | Model gives up counting and guesses "100". |
| Attention decay (last row) | 5 | Opus/Sonnet (1), Haiku (1), GPT-5.4 (3) | `last_symbol_kind` wrong. Loses track at row 500. |
| Empty response | 20 | GPT-5.5 (20) | Context overwhelm. Same as JSON. |

### JSON failures: structural overwhelm

JSON fails on structure (empty responses, massive undercounts, chain-of-thought enumeration). The format itself prevents comprehension at scale.

| Type | Count | Models | Cause |
|------|-------|--------|-------|
| Empty string response | 33 | GPT-5.5 (33) | 53k tokens of repeated `{"qualifiedName":...}` overwhelms attention. |
| Massive undercount | 9 | Opus/Sonnet (3), Haiku (1), GPT-5.4 (4), mini (1) | Field-name repetition dilutes signal. |
| Distance filter failure | 29 | Opus/Sonnet (7), Haiku (6), GPT-5.4 (11), mini (5) | Must parse JSON objects AND filter by field value. |
| Field confusion | 3 | GPT-5.4 (3) | `last_symbol_kind` reads edge type instead of kind. |

### Failure distribution by format

![Failure Types (Pie)](/charts/failure-types-pie.png)

### Failures by model tier

![Failure Types by Model](/charts/failure-types.png)

| Model | GCF failure mode | TOON failure mode | JSON failure mode |
|-------|-----------------|-------------------|-------------------|
| Opus/Sonnet | None | Off-by-2 extended_count; last_symbol_kind wrong (attention decay at row 500) | Undercounts (356 vs 500); 143-line chain-of-thought enumeration, still wrong answer |
| Haiku 4.5 | Off-by-1 (1 of 2 runs) | Distance grouping (100, 200, 214 vs 166); last_symbol_kind wrong | Undercounts; distance filter failures |
| GPT-5.5 | Empty strings (context overwhelm at 53k input tokens) | Empty strings; distance grouping failures | Returns nothing on most questions (53k tokens of repeated field names overwhelms attention) |
| GPT-5.4 | Deterministic: edge_count=198, function_count=84 every run | Distance grouping wildly inconsistent (169, 229, 200 vs 166); round-number guessing | symbol_count 326-404; massive undercounts everywhere |
| GPT-5.4-mini | Same as 5.4 (198, 84) plus larger misses (250, 100) | Worst distance grouping (26, 28 vs 166); defaults to round-number guessing | 300 vs 500 symbol_count; consistent failure across all question types |

GCF failures on Claude are near-zero. GCF failures on OpenAI are deterministic and repeatable (same wrong number every run), suggesting a tokenizer-level parsing difference rather than a comprehension issue.

### Artifacts: What JSON failure looks like in practice

When asked "how many symbols have distance 1 (related)?", the answer is 167. GCF encodes it in the section header: `## related [167]`. The model reads it directly.

JSON has no structural grouping. The model must scan 500 JSON objects, filter by `"Distance": 1`, and count. On two separate runs, Claude Opus (the most capable model on earth) responded by manually enumerating every symbol:

**Run 1** ([full artifact](https://github.com/blackwell-systems/gcf/tree/main/eval/results/artifacts/opus-json-enumeration-failure.md)):

> *"Let me count precisely by going through the list:*
> *1. handler.Response.Notify*
> *2. model.SubscribeConfig*
> *3. service.PublishOptions*
> *...*
> *143. store.DispatchConfig*
>
> *So: 143."*

143 lines of output tokens. Wrong answer (expected 167).

**Run 2** ([full artifact](https://github.com/blackwell-systems/gcf/tree/main/eval/results/artifacts/opus-json-enumeration-failure-run2.md)):

> *"Let me count systematically. The symbols list transitions from Distance 0 to Distance 1 at handler.Response.Notify...*
> *1. handler.Response.Notify*
> *2. model.SubscribeConfig*
> *...*
> *119. store.DispatchConfig*
> *120. cache.ExecuteOptions -- wait, this is Distance 2.*
>
> *So: 119."*

119 lines. Wrong again (expected 167). Different random payload, same failure mode. The model even caught itself mid-count ("wait, this is Distance 2") and still got it wrong.

This is JSON's structural problem: it forces LLMs to perform manual enumeration at scale, burning output tokens on a task the format should have answered structurally. GCF answers the same question from a 3-character header lookup.

---

## Generation: All Runs

### GCF validity across all models

![Generation Validity](/charts/generation-validity.png)

| Model | 5 sym | 10 sym | 20 sym | 50 sym | 100 sym | Score | Runs |
|-------|-------|--------|--------|--------|---------|-------|------|
| Claude Opus 4.6 | YES | YES | YES | YES | YES | 5/5 | 2 (zero variance) |
| Claude Sonnet 4.6 | YES | YES | YES | YES | YES | 5/5 | 2 |
| Claude Haiku 4.5 | YES | YES | YES | YES | YES | 5/5 | 2 |
| GPT-5.5 | YES | YES | YES | YES | 4-5/5 | 4-5/5 | 2 |
| GPT-5.4 | YES | YES | YES | YES | YES | 5/5 | 1 |
| GPT-5.4-mini | YES | YES | YES | YES | YES | 5/5 | 2 (zero variance) |
| Gemini 2.5 Pro | YES | YES | YES | YES | YES | 5/5 | 2 (zero variance) |
| Gemini 3.1 Pro | YES | YES | YES | YES | YES | 5/5 | 1 |
| Gemini 3.1 Flash Lite | YES | YES | YES | YES | 4-5/5 | 4-5/5 | 3 |

### Three-way comparison

| Model | GCF | TOON (natural) | JSON | Runs |
|-------|-----|----------------|------|------|
| Claude Opus 4.6 | 5/5 | 0/5 | 5/5 | 2 (zero variance) |
| Claude Sonnet 4.6 | 5/5 | 2-3/5 | 5/5 | 2 |
| Claude Haiku 4.5 | 5/5 | 1-3/5 | 5/5 | 2 |
| GPT-5.5 | 4-5/5 | 1-2/5 | 5/5 | 2 |
| GPT-5.4 | 5/5 | 0/5 | 5/5 | 1 |
| GPT-5.4-mini | 5/5 | 0/5 | 5/5 | 2 (zero variance) |
| Gemini 2.5 Pro | 5/5 | 1/5 | 5/5 | 2 (zero variance) |
| Gemini 3.1 Pro | 5/5 | 0/5 | 5/5 | 1 |
| Gemini 3.1 Flash Lite | 4-5/5 | 0/5 | 4-5/5 | 3 |

### TOON generation heatmap

![TOON Heatmap](/charts/toon-heatmap.png)

### TOON with hand-holding (pre-encoded integer distances)

When the prompt explicitly says "distance 0" instead of "target" (hand-holding the model through the mapping), TOON passes. 2 runs, zero variance.

| Format | Prompt | Valid | 100 sym output | vs JSON |
|--------|--------|-------|---------------|---------|
| **GCF** | natural labels | **5/5** | **5,984 B** | **78% fewer** |
| TOON | hand-held (integers) | 5/5 | 8,336 B | 69% fewer |
| TOON | natural labels | 0/5 | - | - |
| JSON | natural labels | 5/5 | 16,121 B | baseline |

Even with hand-holding, GCF output is still 28% smaller.

### Output size at scale

![Output Cost at Scale](/charts/output-cost-at-scale.png)

---

## Methodology

- 500 symbols, 200 edges for comprehension; 5-100 symbols for generation
- 13 extraction questions with deterministic ground truth (no LLM judge)
- OpenAI runs used default temperature (non-zero); `EVAL_TEMPERATURE=0` available for deterministic runs
- Each run generates a fresh random payload with different symbol names and edge distributions
- Claude evals via `claude -p` CLI with `--model` flag
- OpenAI evals via chat completions API with exponential backoff on 429s
- Google evals via generativelanguage API with retry logic (free tier: 5 RPM)
- TOON validation uses the official [toon-go](https://github.com/toon-format/toon-go) library
- All raw logs in [eval/results](https://github.com/blackwell-systems/gcf/tree/main/eval/results)

### Reproduce

```bash
git clone https://github.com/blackwell-systems/gcf-go
cd gcf-go/eval

# Comprehension
GOWORK=off go test -run TestComprehension -v -timeout 0
EVAL_BACKEND=openai OPENAI_API_KEY=... EVAL_MODEL=gpt-5.5 GOWORK=off go test -run TestComprehension -v -timeout 0
EVAL_BACKEND=google GOOGLE_API_KEY=... EVAL_MODEL=gemini-2.5-flash GOWORK=off go test -run TestComprehension -v -timeout 0

# Generation (all three formats)
GOWORK=off go test -run "TestGeneration$|TestGenerationTOON|TestGenerationJSON" -v -timeout 0

# Token efficiency (TOON's benchmark)
git clone https://github.com/blackwell-systems/toon.git
cd toon && git checkout gcf-comparison
cd benchmarks && pnpm install && pnpm benchmark:tokens
```
