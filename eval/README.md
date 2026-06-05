# GCF Comprehension & Generation Eval

Rigorous evaluation of GCF vs TOON vs JSON across two dimensions: can LLMs understand these formats (comprehension), and can they produce them (generation).

## Comprehension Eval

### Methodology

A single 500-symbol, 200-edge code graph payload is encoded in all three formats using the official libraries:
- **GCF**: `gcf-go` `Encode()` (graph profile with `## edges [N]` section header)
- **TOON**: `toon-go` `MarshalString()` (official library)
- **JSON**: Go `json.MarshalIndent()`

Each format's output is sent to an LLM with a factual question. The LLM has zero prior context about any format. No system prompt, no format instructions. Just the payload and the question.

### Questions (13)

| Category | Question | What it tests |
|----------|----------|---------------|
| Counting | How many symbols? | Record counting at scale |
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

All questions have deterministic ground truth computed from the payload. No LLM judge.

### Results (Claude, 2026-06-05)

| Format | Accuracy | Tokens | vs JSON |
|--------|----------|--------|---------|
| **GCF** | **100%** (13/13) | **11,090** | **79% fewer** |
| TOON | 92.3% (12/13) | 16,378 | 69% fewer |
| JSON | 76.9% (10/13) | 53,341 | baseline |

**GCF achieves perfect accuracy at 32% fewer tokens than TOON.**

### Where each format fails

**JSON** fails on counting tasks at scale:
- `target_count`: answered 200 (correct: 166). Cannot distinguish distance groups in repeated `"distance": 0` fields across 500 records.
- `related_count`: answered 120 (correct: 167). Loses count in structural noise.
- `function_count`: answered 160 (correct: 125). Overwhelmed by field repetition.

**TOON** fails on distance grouping:
- `extended_count`: answered 107 (correct: 167). TOON has no section headers for distance groups; the model must scan all rows and filter by the distance column. At 500 rows this is unreliable.

**GCF** passes all 13. The `## targets`, `## related`, `## extended` section headers make group counting trivial (count lines in section). The `## edges [200]` header gives the edge count directly. The `symbols=500` header field gives the symbol count directly.

### Why JSON breaks at scale

At 500 records, JSON repeats `"qualified_name":`, `"kind":`, `"score":`, `"provenance":`, `"distance":` on every record. That's 2,500 structurally identical tokens competing for attention. The model's counting circuits get overwhelmed by structural noise that carries no semantic content.

At 8 records, all formats score 100%. At 500, the difference is undeniable.

### Why GCF beats TOON

TOON encodes distance as a value in each row. The model must scan all 500 rows, read the last field of each, and count matches. This is a filtering task that fails at scale.

GCF encodes distance as section headers (`## targets`, `## related`, `## extended`). The model counts lines in a section. One structural decision (hierarchical grouping vs flat tabular) creates the accuracy gap.

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

Both formats achieve 5/5 validity with a primer. **GCF output is 52% smaller than TOON output at every scale.**

Without a primer (cold-start): both achieve 3/5 (tied).

---

## Running the evals

### Comprehension (requires Claude CLI or API key)

```bash
cd gcf-go/eval

# Claude CLI (default)
GOWORK=off go test -run TestComprehension -v -timeout 0

# Anthropic API
EVAL_BACKEND=api ANTHROPIC_API_KEY=sk-... GOWORK=off go test -run TestComprehension -v -timeout 0

# OpenAI
EVAL_BACKEND=openai OPENAI_API_KEY=sk-... EVAL_MODEL=gpt-4o GOWORK=off go test -run TestComprehension -v -timeout 0

# Google
EVAL_BACKEND=google GOOGLE_API_KEY=... EVAL_MODEL=gemini-2.0-flash GOWORK=off go test -run TestComprehension -v -timeout 0

# xAI
EVAL_BACKEND=xai XAI_API_KEY=... EVAL_MODEL=grok-3 GOWORK=off go test -run TestComprehension -v -timeout 0
```

### Generation

```bash
cd gcf/eval
python3 generation_gcf_eval.py    # GCF generation
python3 generation_toon_eval.py   # TOON generation (requires node + @toon-format/toon)
```

---

## Results files

| File | Description |
|------|-------------|
| `comprehension-500sym-3way-2026-06-03.log` | Original 6-question eval (Claude) |
| `comprehension-14q-claude-edges-fix-2026-06-05.log` | 13-question eval with edges [N] fix (Claude) |
| `generation-gcf-with-example-2026-06-04.log` | GCF generation (5/5 valid, 71-75% savings) |
| `generation-toon-with-example-2026-06-04.log` | TOON generation (5/5 valid, 31-40% savings) |
| `generation-gcf-no-example-2026-06-04.log` | GCF cold-start (3/5) |
| `generation-toon-no-example-2026-06-04.log` | TOON cold-start (3/5) |
| `generation-summary-2026-06-04.md` | Generation eval summary |
