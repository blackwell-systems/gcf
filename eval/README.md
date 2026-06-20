# GCF Comprehension & Generation Eval

Rigorous evaluation of GCF vs TOON vs JSON across two dimensions: can LLMs understand these formats (comprehension), and can they produce them (generation).

## Comprehension Eval

### Scale matters

Evaluated at two scales:

**Standard workloads (up to 100 records):** 100% GCF comprehension accuracy on every frontier model tested (Opus, GPT-5.5, Gemini Pro). This is the scale of typical MCP tool responses. Both generic and graph profiles. No frontier model has ever failed on GCF at this scale.

**Stress scale (500+ records):** GCF averages 90.7% across 24 runs, 10 models, 3 providers. All formats degrade at this scale; GCF degrades the least. JSON averages 53.6%, TOON averages 67.7%. The margin between formats widens as record count increases.

### Methodology

Stress-scale eval uses a 500-symbol, 200-edge code graph payload encoded in all three formats using the official libraries:
- **GCF**: `gcf-go` `Encode()` (graph profile with `## edges [N]` section header)
- **TOON**: `toon-go` `MarshalString()` (official library)
- **JSON**: Go `json.MarshalIndent()`

Generic-profile eval uses 100-500 order e-commerce payloads with nested customers, items, and computed totals, encoded via `encodeGeneric()`.

Each format's output is sent to an LLM with a factual question. The LLM has zero prior context about any format. No system prompt, no format instructions. Just the payload and the question. All questions have deterministic ground truth computed from the payload. No LLM judge.

### Questions (13 per eval)

| Category | Question | What it tests |
|----------|----------|---------------|
| Counting | How many symbols/orders? | Record counting at scale |
| Counting | How many edges? | Section-specific counting |
| Counting | How many targets (distance 0)? | Group/section counting |
| Counting | How many related (distance 1)? | Group/section counting |
| Counting | How many extended (distance 2)? | Group/section counting |
| Counting | How many functions? | Filtering by field value |
| Counting | How many 'calls' edges? | Filtering within edges |
| Extraction | Highest-scored symbol name? | Find max by numeric field |
| Extraction | Kind of highest-scored symbol? | Field extraction |
| Extraction | Kind of last symbol? | Positional extraction |
| Extraction | All unique edge types? | Deduplication |
| Structure | Does it have an edges section? | Structure awareness |
| Structure | What is the tool name? | Metadata extraction |

### Stress-scale results (24 runs, 10 models, 3 providers)

| Model | Runs | GCF avg | TOON avg | JSON avg |
|-------|------|---------|----------|----------|
| Claude Opus 4.6 | 2 | **96.2%** | 84.6% | 73.1% |
| Claude Sonnet 4.6 | 2 | **100%** | 73.1% | 53.8% |
| Claude Haiku 4.5 | 2 | **96.2%** | 69.2% | 57.7% |
| GPT-5.5 | 5 | **84.1%** | 67.7% | 45.8% |
| GPT-5.4 | 4 | **78.0%** | 56.0% | 44.1% |
| GPT-5.4-mini | 2 | **71.8%** | 64.1% | 54.2% |
| Gemini 2.5 Flash | 3 | **80.6%** | 54.6% | 57.0% |
| Gemini 3.5 Flash | 2 | **100%** | 53.9% | 46.2% |
| Gemini 2.5 Pro | 1 | **100%** | 76.9% | 58.3% |
| Gemini 3.1 Pro | 1 | **100%** | 76.9% | 46.2% |

**GCF wins 23, ties 1, loses 0.** Overall: GCF 90.7%, TOON 67.7%, JSON 53.6%.

### Token efficiency

| Format | Tokens (500 symbols) | vs JSON |
|--------|---------------------|---------|
| **GCF** | **11,090** | **79% fewer** |
| TOON | 16,378 | 69% fewer |
| JSON | 53,341 | baseline |

GCF achieves the highest accuracy at 79% fewer tokens than JSON and 32% fewer than TOON.

### Where each format fails at scale

**JSON** fails on counting tasks:
- `target_count`: answered 200 (correct: 166). Cannot distinguish distance groups in repeated `"distance": 0` fields across 500 records.
- `related_count`: answered 120 (correct: 167). Loses count in structural noise.
- `function_count`: answered 160 (correct: 125). Overwhelmed by field repetition.

**TOON** fails on distance grouping:
- `extended_count`: answered 107 (correct: 167). TOON has no section headers for distance groups; the model must scan all rows and filter by the distance column. At 500 rows this is unreliable.

**GCF** passes all 13 on frontier models. The `## targets`, `## related`, `## extended` section headers make group counting trivial (count lines in section). The `## edges [200]` header gives the edge count directly. The `symbols=500` header field gives the symbol count directly.

### Why formats diverge at scale

At 500 records, JSON repeats `"qualified_name":`, `"kind":`, `"score":`, `"provenance":`, `"distance":` on every record. That's 2,500 structurally identical tokens competing for attention. The model's counting circuits get overwhelmed by structural noise that carries no semantic content.

TOON encodes distance as a value in each row. The model must scan all 500 rows, read the last field of each, and count matches. This is a filtering task that fails at scale.

GCF encodes distance as section headers (`## targets`, `## related`, `## extended`). The model counts lines in a section. One structural decision (hierarchical grouping vs flat tabular) creates the accuracy gap.

At standard workloads (100 records), all formats perform well. The differentiation emerges at scale.

---

## Generation Eval

### Methodology

The same LLM (Claude via `claude -p`, zero prior context) is asked to produce structured output in GCF and TOON formats. A 3-line format primer is included in the prompt. Output is validated through the real decoder (gcf-go `Decode()` for GCF, `@toon-format/toon` `decode()` for TOON).

### Results (Claude, 2026-06-04)

| Symbols | Edges | GCF Valid | GCF Savings | TOON Valid | TOON Savings | GCF vs TOON |
|---------|-------|-----------|-------------|------------|--------------|-------------|
| 5 | 3 | YES | 71% | YES | 31% | **52% smaller** |
| 10 | 6 | YES | 74% | YES | 35% | **53% smaller** |
| 20 | 12 | YES | 75% | YES | 37% | **54% smaller** |
| 50 | 25 | YES | 74% | YES | 40% | **52% smaller** |
| 100 | 50 | YES | 75% | YES | 40% | **52% smaller** |

Both formats achieve 5/5 validity. **GCF output is 52% smaller than TOON output at every scale.**

---

## Running the evals

### Comprehension: stress scale (requires API key)

```bash
cd gcf-go/eval

# Claude CLI (default)
GOWORK=off go test -run TestComprehension -v -timeout 0

# Anthropic API
EVAL_BACKEND=api ANTHROPIC_API_KEY=sk-... GOWORK=off go test -run TestComprehension -v -timeout 0

# OpenAI
EVAL_BACKEND=openai OPENAI_API_KEY=sk-... EVAL_MODEL=gpt-5.5 GOWORK=off go test -run TestComprehension -v -timeout 0

# Google
EVAL_BACKEND=google GOOGLE_API_KEY=... EVAL_MODEL=gemini-2.5-flash GOWORK=off go test -run TestComprehension -v -timeout 0

# xAI
EVAL_BACKEND=xai XAI_API_KEY=... EVAL_MODEL=grok-3 GOWORK=off go test -run TestComprehension -v -timeout 0
```

### Comprehension: generic profile (requires API key)

```bash
cd gcf-go/eval

# All formats
EVAL_BACKEND=google GOOGLE_API_KEY=... EVAL_MODEL=gemini-2.5-flash EVAL_FORMATS=gcf,json,toon GOWORK=off go test -run TestGenericComprehension -v -timeout 60m

# Single format
EVAL_FORMATS=gcf GOWORK=off go test -run TestGenericComprehension -v -timeout 15m
```

### Generation

```bash
cd gcf/eval
python3 generation_gcf_eval.py    # GCF generation
python3 generation_toon_eval.py   # TOON generation (requires node + @toon-format/toon)
```

---

## Results files

All logs stored in `eval/results/`:
- `comprehension/`: stress-scale runs (500 symbols, graph profile)
- `../gcf-go/eval/results/v3/comprehension/` : generic-profile runs (100-1000 orders)
- `generation/`: generation eval runs

Full summary with per-model averages, failure taxonomy, and methodology notes: [SUMMARY.md](results/SUMMARY.md)
