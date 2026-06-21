# GCF Comprehension & Generation Eval

Rigorous evaluation of GCF vs TOON vs JSON across two dimensions: can LLMs understand these formats (comprehension), and can they produce them (generation).

For full results, per-model averages, and failure taxonomy, see [SUMMARY.md](results/SUMMARY.md).

## Comprehension Eval

### Methodology

Two eval types, both using deterministic ground truth (no LLM judge):

**Stress-scale (graph profile):** 500-symbol, 200-edge code graph payload encoded in all three formats using official libraries. Tests comprehension at scale where formats diverge.

**Generic profile:** 500-order e-commerce payloads with nested customers, items, and computed totals. Tests real-world structured data shapes.

Each format's output is sent to an LLM with a factual question. Zero prior context about any format. No system prompt, no format instructions. Just the payload and the question.

### Encoding

- **GCF**: `gcf-go` `Encode()` (graph profile) or `EncodeGeneric()` (generic profile)
- **TOON**: `toon-go` `MarshalString()` (official library)
- **JSON**: Go `json.MarshalIndent()`

### Why formats diverge at scale

At 500 records, JSON repeats `"qualified_name":`, `"kind":`, `"score":`, `"provenance":`, `"distance":` on every record. That's 2,500 structurally identical tokens competing for attention. The model's counting circuits get overwhelmed by structural noise that carries no semantic content.

TOON encodes distance as a value in each row. The model must scan all 500 rows, read the last field of each, and count matches. This is a filtering task that fails at scale.

GCF encodes distance as section headers (`## targets`, `## related`, `## extended`). The model counts lines in a section. One structural decision (hierarchical grouping vs flat tabular) creates the accuracy gap.

At standard workloads (100 records), all formats perform well. The differentiation emerges at scale.

## Generation Eval

### Methodology

The LLM (Claude via `claude -p`, zero prior context) is asked to produce structured output in GCF and TOON formats. A 3-line format primer is included in the prompt. Output is validated through the real decoder (gcf-go `Decode()` for GCF, `@toon-format/toon` `decode()` for TOON).

## Running the evals

### Comprehension: stress scale

```bash
cd gcf-go/eval

# Claude CLI (default)
GOWORK=off go test -run TestComprehension -v -timeout 0

# Anthropic API
EVAL_BACKEND=api ANTHROPIC_API_KEY=sk-... GOWORK=off go test -run TestComprehension -v -timeout 0

# OpenAI (or any OpenAI-compatible API via OPENAI_BASE_URL)
EVAL_BACKEND=openai OPENAI_API_KEY=sk-... EVAL_MODEL=gpt-5.5 GOWORK=off go test -run TestComprehension -v -timeout 0

# Google
EVAL_BACKEND=google GOOGLE_API_KEY=... EVAL_MODEL=gemini-2.5-flash GOWORK=off go test -run TestComprehension -v -timeout 0

# Mistral (via OpenAI-compatible endpoint)
EVAL_BACKEND=openai OPENAI_BASE_URL=https://api.mistral.ai/v1 OPENAI_API_KEY=... EVAL_MODEL=mistral-medium-latest GOWORK=off go test -run TestComprehension -v -timeout 0

# xAI
EVAL_BACKEND=xai XAI_API_KEY=... EVAL_MODEL=grok-3 GOWORK=off go test -run TestComprehension -v -timeout 0
```

### Comprehension: generic profile

```bash
cd gcf-go/eval

# All formats, 500 orders
EVAL_BACKEND=google GOOGLE_API_KEY=... EVAL_MODEL=gemini-2.5-flash EVAL_FORMATS=gcf,json,toon EVAL_NUM_ORDERS=500 GOWORK=off go test -run TestGenericComprehension -v -timeout 60m

# Single format
EVAL_FORMATS=gcf EVAL_NUM_ORDERS=500 GOWORK=off go test -run TestGenericComprehension -v -timeout 15m
```

### Generation

```bash
cd gcf/eval
python3 generation_gcf_eval.py    # GCF generation
python3 generation_toon_eval.py   # TOON generation (requires node + @toon-format/toon)
```

### Tokenizer analysis

All tokenizer scripts require 8 tokenizer packages. Install once:

```bash
cd gcf
npm install @blackwell-systems/gcf @lenml/tokenizers \
  @lenml/tokenizer-claude @lenml/tokenizer-gpt4 @lenml/tokenizer-gpt4o \
  @lenml/tokenizer-llama3_1 @lenml/tokenizer-qwen2_5 \
  @lenml/tokenizer-deepseek_v3 @lenml/tokenizer-gemma2 \
  @lenml/tokenizer-mistral_nemo
```

| Script | What it measures |
|--------|-----------------|
| `tokenizer-variance.mjs` | GCF savings consistency across 8 tokenizers at multiple scales |
| `structural-variance.mjs` | Boundary merge analysis: JSON 8.93% vs GCF 1.00% on real data |
| `json-tokenization-analysis.mjs` | JSON overhead breakdown (81% waste) and linear scaling |
| `worst-json-tokenization.mjs` | Maximum variance search: 7 distinct tokenizations for one string |
| `exhaustive-json-boundary-search.mjs` | 8,434 patterns tested, multi-grammar merge discovery |
| `grammar-swap-experiment.mjs` | 5 delimiter sets prove savings are structural (0.4pp spread) |

```bash
# Run all
node eval/tokenizer-variance.mjs
node eval/structural-variance.mjs
node eval/json-tokenization-analysis.mjs
node eval/worst-json-tokenization.mjs
node eval/exhaustive-json-boundary-search.mjs
node eval/grammar-swap-experiment.mjs
```

## Results

All logs stored in `eval/results/`:
- `comprehension/`: stress-scale and generic-profile run logs
- `../gcf-go/eval/results/v3/comprehension/`: additional generic-profile logs
- `generation/`: generation eval runs

**Full results:** [SUMMARY.md](results/SUMMARY.md) (per-model averages, questions, failure taxonomy, methodology notes)

**Tokenizer analysis:** 6 scripts, 8 tokenizers, 6 providers. Key finding: JSON grammar merges with payload at 8.93% vs GCF at 1.00% on real data. See [tokenizer analysis docs](https://gcformat.com/guide/tokenizer-analysis).
