# GCF Eval Suite

Comprehension, generation, tokenizer analysis, and token efficiency benchmarks for GCF vs JSON vs TOON. All results use deterministic ground truth (no LLM judge).

For full results, per-model averages, and failure taxonomy, see [SUMMARY.md](results/SUMMARY.md).

## Comprehension Eval

Two eval types, both using deterministic ground truth:

**Stress-scale (graph profile):** 500-symbol, 200-edge code graph payload. Tests comprehension at scale where formats diverge. 24 runs, 10 models.

**Generic profile:** 500-order e-commerce payloads with nested customers, items, and computed totals. 26 runs, 11 models.

Each format's output is sent to an LLM with a factual question. Zero prior context about any format.

```bash
cd gcf-go/eval

# Claude CLI (default)
GOWORK=off go test -run TestComprehension -v -timeout 0

# OpenAI
EVAL_BACKEND=openai OPENAI_API_KEY=sk-... EVAL_MODEL=gpt-5.5 GOWORK=off go test -run TestComprehension -v -timeout 0

# Google
EVAL_BACKEND=google GOOGLE_API_KEY=... EVAL_MODEL=gemini-2.5-flash GOWORK=off go test -run TestComprehension -v -timeout 0

# Generic profile
EVAL_BACKEND=google GOOGLE_API_KEY=... EVAL_MODEL=gemini-2.5-flash EVAL_FORMATS=gcf,json,toon EVAL_NUM_ORDERS=500 GOWORK=off go test -run TestGenericComprehension -v -timeout 60m
```

## Generation Eval

| Script | Description |
|--------|-------------|
| `generation_gcf_eval.py` | Tests whether LLMs can produce valid GCF output from a 3-line primer. Output validated through `gcf-go Decode()`. All 9 models produce 5/5 valid outputs. Proves GCF is learnable from examples alone, no training needed. |
| `generation_toon_eval.py` | Same test for TOON. Output validated through `@toon-format/toon decode()`. 7/9 models fail because they write natural language labels (e.g., "target") where TOON's decoder expects integers (e.g., 0). Proves TOON's integer distance encoding is adversarial to LLM generation. Requires node. |

```bash
python3 generation_gcf_eval.py
python3 generation_toon_eval.py
```

---

## Tokenizer Analysis

### Primary analysis (43 tokenizers, 20 providers)

Uses Python with the HF `tokenizers` library and `tiktoken`. Covers every major model family in production: OpenAI, Anthropic, Meta, Google, Mistral, Alibaba, DeepSeek, Microsoft, TII, 01.AI, BigCode, NVIDIA, AI21, Stability AI, EleutherAI, Snowflake, AllenAI, and more.

#### Setup

```bash
cd eval
python3 -m venv .venv && source .venv/bin/activate
pip install tokenizers huggingface_hub tiktoken
```

#### Scripts

| Script | Description |
|--------|-------------|
| `hf-tokenizer-analysis.py` | **The primary tokenizer study.** Downloads tokenizers from HF Hub (+ tiktoken for OpenAI, local file for Claude) and runs 6 tests: (1) JSON quote merge rate across 45 common field names (result: 8.17%), (2) GCF pipe merge rate across 45 fields x 15 values (result: 0.47%), (3) TOON tab merge rate across 20 words (result: 32.91%), (4) vocabulary entry analysis counting quote+letter, pipe+letter, and tab+letter entries in every vocabulary, (5) token savings GCF vs JSON vs TOON at 10/50/100/500 orders with per-tokenizer stability, (6) scale summaries. This is the single source of truth for all tokenizer claims on the docs site. Produces JSON results in `results/tokenizer/`. |
| `structural-equivalence-proof.py` | Tokenizes a real multi-section GCF payload and equivalent JSON across all 43 tokenizers. Checks whether each grammar symbol (pipe, @, <) is always its own token. Result: @ is 100% isolated, < is 100% isolated, pipe is 99.2% isolated (6 exceptions, all `\|c` in "cancelled" on 3 tokenizers). For JSON, 92.5% of quote-containing tokens fuse multiple grammar operations into one token (`":"`, `","`, `{"`) on 43/43 tokenizers. Proves GCF grammar is deterministic while JSON grammar is structurally ambiguous on every production tokenizer. |
| `adversarial-vocab-dump.py` | Exhaustively scans every vocabulary entry in all 43 tokenizers. Extracts every entry where a delimiter (pipe, quote, tab, comma, colon) is fused with alphabetic content. This is definitive because BPE is deterministic: if `\|foo` is a vocabulary entry it WILL merge; if it isn't, it CAN NEVER merge. Result: pipe has 24 mergeable words across all vocabularies, JSON's combined surface is 707 (quote 193, colon 232, comma 282), tab has 1,238. The pipe's adversarial surface is 29x smaller than JSON combined and 52x smaller than tab. The 24 pipe words are predominantly TypeScript union syntax (`\|null`, `\|string`, `\|required`, `\|array`) and single characters. None are common data field names. |
| `ascii-adversarial-surface.py` | Scans all 94 printable ASCII characters (codes 33-126) across all 43 tokenizer vocabularies. For each character, counts unique words that exist as merged entries. Result: only digits 0-9 have zero merge risk. Pipe (24 words) is the safest practical delimiter. JSON's total surface across all 7 grammar characters is 1,939 words (81x the pipe). Produces a complete character safety ranking. |
| `attention-analysis.py` | Loads Pythia 410M on CPU, feeds identical data in GCF vs JSON, extracts attention weights from all 24 layers and 16 heads. Measures attention entropy (diffuse vs focused), token repetition ratio, and attention distribution across grammar vs payload tokens. Proves the transformer-level mechanism behind comprehension failure: JSON's repeated field names create increasing entropy at scale while GCF's structural tokens maintain focused attention. Requires `torch` and `transformers`. |

```bash
source .venv/bin/activate
python3 hf-tokenizer-analysis.py           # Full analysis (~5 min)
python3 structural-equivalence-proof.py    # Grammar isolation proof
python3 adversarial-vocab-dump.py          # Vocabulary surface dump

# Attention analysis (requires torch + transformers, ~5 min on CPU)
pip install torch --index-url https://download.pytorch.org/whl/cpu transformers
python3 attention-analysis.py              # Entropy + repetition scaling
```

#### Payload generation

The savings tests in `hf-tokenizer-analysis.py` read pre-encoded payload files (`.payload-gcf-N.txt`, `.payload-json-N.txt`, `.payload-toon-N.txt`). Generate them with node before running:

```bash
node -e "
const { encodeGeneric } = require('@blackwell-systems/gcf');
const { encode } = require('@toon-format/toon');
// See hf-tokenizer-analysis.py header for full buildOrders() function
"
```

### Legacy JS scripts (8 tokenizers)

These use `@lenml/tokenizer-*` npm packages covering 8 tokenizers from 6 providers. The 43-tokenizer Python study supersedes them for headline numbers, but they remain reproducible and contain additional analyses (grammar swap, syntactic deep dive) not yet ported to the Python suite.

```bash
npm install @blackwell-systems/gcf @lenml/tokenizers \
  @lenml/tokenizer-claude @lenml/tokenizer-gpt4 @lenml/tokenizer-gpt4o \
  @lenml/tokenizer-llama3_1 @lenml/tokenizer-qwen2_5 \
  @lenml/tokenizer-deepseek_v3 @lenml/tokenizer-gemma2 \
  @lenml/tokenizer-mistral_nemo
```

| Script | Description |
|--------|-------------|
| `tokenizer-variance.mjs` | Measures GCF vs JSON token counts across 8 tokenizers at 10/50/100/500 orders. Proves savings are consistent (50-59%) regardless of tokenizer. Also tests graph profile at multiple scales. Includes syntactic deep dive showing exact token splits for GCF syntax elements on each tokenizer. |
| `structural-variance.mjs` | The original boundary merge analysis. Tests JSON field patterns and GCF delimiters for merge behavior. Proves JSON variance is in structural grammar (dangerous) while GCF variance is only in value content (harmless). Includes full-row tokenization comparison and scale test at 10-500 rows. |
| `json-tokenization-analysis.mjs` | Breaks down where JSON tokens go: 52.4% repeated field names, 28.6% structural characters, 19.0% actual data. 81% of JSON tokens are overhead at 500 rows. Shows overhead grows linearly (17,001 tokens at 1000 rows) while GCF overhead is constant (11 tokens). Cross-validated on all 8 tokenizers. |
| `worst-json-tokenization.mjs` | Searches 840 JSON patterns (40 fields x 21 values) to find maximum tokenization variance. Found `"userName":"req_xyz789"` produces 7 distinct tokenizations across 8 models. A complete JSON object produces 4 different token counts (12-15) depending on the model. |
| `exhaustive-json-boundary-search.mjs` | Tests 8,434+ JSON patterns (115 field names x 73 value types + multi-field objects) to find maximum boundary hiding. Scores patterns by hidden boundaries, distinct tokenizations, and multi-grammar merges. Discovers tokens like `":{"` (4 structural operations in one token) present on all 8 tokenizers. |
| `grammar-swap-experiment.mjs` | Replaces all GCF delimiters with 4 alternative sets (all from the non-merging character set) and re-measures savings. 5 payload types x 4 sizes x 8 tokenizers = 800 measurements. Result: 0.4pp spread across delimiter sets. Proves savings are a structural property of header factorization, not an artifact of specific characters. |

---

## Token Efficiency Benchmarks

| Script | Description |
|--------|-------------|
| `graph-token-efficiency.mjs` | Measures graph profile (code intelligence payloads) across 8 tokenizers. 68% savings vs pretty JSON, 48% vs compact JSON. Tests at 10/50/100/500 symbols with 5-200 edges. Shows graph profile outperforms generic profile due to `@id` refs, edge encoding, and section headers. |
| `session-dedup-efficiency.mjs` | Simulates a 5-call agent session where 90% of symbols overlap between calls. Measures cumulative token savings with GCF's bare reference deduplication. Result: 84.3% total savings across the session, with individual calls 3-5 reaching 89-90% savings. Proves GCF's session awareness is a major advantage for agentic workflows. |
| `toon-fuzz.mjs` | TOON round-trip accuracy testing. Generates random payloads and verifies TOON encode/decode round-trip fidelity. |

---

## Integration Benchmarks

Token savings measured on realistic data shapes from specific MCP server projects. These benchmarks informed the PR descriptions for upstream integration proposals.

| Script | Target | Result | Significance |
|--------|--------|--------|--------------|
| `ms365-token-benchmark.mjs` | Softeria/ms-365-mcp-server (791 stars) | 18-32% vs TOON, 24.4% avg | De-TOON target. Existing TOON integration replaced by GCF with measured improvement. 6 MS365 data shapes (emails, calendar, contacts, files, teams, users). |
| `jscpd-token-benchmark.mjs` | kucherenko/jscpd (5.8K stars) | 56% vs JSON | Greenfield target. Duplication results + statistics, 7/7 GCF wins. |
| `engram-token-benchmark.mjs` | Gentleman-Programming/engram (4.6K stars) | 33% vs JSON | Greenfield target (Go). Search results + sessions + timelines, 9/9 GCF wins. |
| `notion-token-benchmark.mjs` | makenotion/notion-mcp-server | 1.3% vs JSON | **Not viable.** Too heterogeneous (text-heavy page content). Saved to document why. |
| `exa-token-benchmark.mjs` | exa-labs/exa-mcp-server | 4.9% vs JSON | **Not viable.** Text-heavy search results. Saved to document why. |

---

## Flatten Experiment

Scripts from the v3.2 flatten feature research.

| Script | Description |
|--------|-------------|
| `encode-flat-prototype.mjs` | Prototype implementation of the nested object flattening encoder. Uses `>` as path separator to flatten nested structures into tabular columns. |
| `dot-flatten-benchmark.mjs` | Benchmarks the dot-notation flatten approach (predecessor to `>` separator). Measures token savings from flattening nested objects. |
| `cross-api-flat-benchmark.mjs` | Cross-API comparison of flatten savings across multiple MCP server data shapes. Used to determine which integration targets benefit most from flattening. |
| `flatten-charts.py` | Generates charts for the flatten experiment results. |

---

## Results

All logs stored in `results/`:
- `comprehension/`: stress-scale and generic-profile run logs
- `generation/`: generation eval runs
- `tokenizer/`: 43-tokenizer analysis results (JSON data + run logs)

**Full results:** [SUMMARY.md](results/SUMMARY.md)

**Tokenizer analysis docs:** [gcformat.com/guide/tokenizer-analysis](https://gcformat.com/guide/tokenizer-analysis)
