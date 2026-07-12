# GCF Eval Suite

Comprehension, generation, tokenizer analysis, and token efficiency benchmarks for GCF vs JSON vs TOON. All results use deterministic ground truth (no LLM judge).

For full results, per-model averages, and failure taxonomy, see [SUMMARY.md](results/SUMMARY.md).

## SDK Inventory

Every eval script and its SDK dependency. Test harnesses live in their respective SDK repos; benchmark scripts and results live here in the spec repo.

| Script | SDK | Repo | Language |
|--------|-----|------|----------|
| `comprehension_test.go` | gcf-go | gcf-go/eval/ | Go |
| `generic_comprehension_test.go` | gcf-go | gcf-go/eval/ | Go |
| `budget_comprehension_test.go` | gcf-go | gcf-go/eval/ | Go |
| `generation_test.go` | gcf-go | gcf-go/eval/ | Go |
| `generic_generation_test.go` | gcf-go | gcf-go/eval/ | Go |
| `batch_test.go` | gcf-go | gcf-go/eval/ | Go |
| `session_dedup_test.go` | gcf-go | gcf-go/eval/ | Go |
| `generation_gcf_eval.py` | gcf-go (decoder) | gcf/eval/ | Python |
| `generation_toon_eval.py` | toon (decoder) | gcf/eval/ | Python |
| `session-savings-benchmark.py` | gcf-python | gcf/eval/ | Python |
| `hf-tokenizer-analysis.py` | none | gcf/eval/ | Python |
| `structural-equivalence-proof.py` | none | gcf/eval/ | Python |
| `adversarial-vocab-dump.py` | none | gcf/eval/ | Python |
| `ascii-adversarial-surface.py` | none | gcf/eval/ | Python |
| `attention-analysis.py` | none | gcf/eval/ | Python |
| `flatten-charts.py` | none | gcf/eval/ | Python |
| `graph-token-efficiency.mjs` | gcf-typescript | gcf/eval/ | JS |
| `session-dedup-efficiency.mjs` | gcf-typescript | gcf/eval/ | JS |
| `tokenizer-variance.mjs` | gcf-typescript | gcf/eval/ | JS |
| `structural-variance.mjs` | gcf-typescript | gcf/eval/ | JS |
| `json-tokenization-analysis.mjs` | gcf-typescript | gcf/eval/ | JS |
| `worst-json-tokenization.mjs` | gcf-typescript | gcf/eval/ | JS |
| `exhaustive-json-boundary-search.mjs` | gcf-typescript | gcf/eval/ | JS |
| `grammar-swap-experiment.mjs` | gcf-typescript | gcf/eval/ | JS |
| `ms365-token-benchmark.mjs` | gcf-typescript | gcf/eval/ | JS |
| `jscpd-token-benchmark.mjs` | gcf-typescript | gcf/eval/ | JS |
| `engram-token-benchmark.mjs` | gcf-typescript | gcf/eval/ | JS |
| `notion-token-benchmark.mjs` | gcf-typescript | gcf/eval/ | JS |
| `exa-token-benchmark.mjs` | gcf-typescript | gcf/eval/ | JS |
| `encode-flat-prototype.mjs` | gcf-typescript | gcf/eval/ | JS |
| `dot-flatten-benchmark.mjs` | gcf-typescript | gcf/eval/ | JS |
| `cross-api-flat-benchmark.mjs` | gcf-typescript | gcf/eval/ | JS |
| `toon-fuzz.mjs` | toon | gcf/eval/ | JS |

---

## Comprehension Eval

**SDK: gcf-go** (test harness in `gcf-go/eval/`)

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

**SDK: gcf-go** (decoder validation), **gcf-python** (generation scripts)

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

**SDK: none** (uses HF tokenizers library and tiktoken directly)

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

**SDK: gcf-typescript** (`@blackwell-systems/gcf`)

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

**SDK: gcf-typescript** (JS scripts), **gcf-python** (savings benchmark)

| Script | Description |
|--------|-------------|
| `graph-token-efficiency.mjs` | Measures graph profile (code intelligence payloads) across 8 tokenizers. 68% savings vs pretty JSON, 48% vs compact JSON. Tests at 10/50/100/500 symbols with 5-200 edges. Shows graph profile outperforms generic profile due to `@id` refs, edge encoding, and section headers. SDK: gcf-typescript. |
| `session-dedup-efficiency.mjs` | Simulates a 5-call agent session where 90% of symbols overlap between calls. Measures cumulative token savings with GCF's bare reference deduplication. Result: 84.3% total savings across the session, with individual calls 3-5 reaching 89-90% savings. SDK: gcf-typescript. |
| `session-savings-benchmark.py` | **Cross-tokenizer session savings benchmark.** 8 real tokenizers from 8 providers, 4 scenarios (20-500 symbols, 5-10 calls), session dedup + delta encoding. Result: 80.8% avg savings vs JSON (session), 93.8% with delta on 10-call session. Also benchmarks delta encoding for topology changes (95% savings at 1-device change). SDK: gcf-python. |
| `toon-fuzz.mjs` | TOON round-trip accuracy testing. Generates random payloads and verifies TOON encode/decode round-trip fidelity. |

---

## Integration Benchmarks

**SDK: gcf-typescript** (all JS benchmarks use `@blackwell-systems/gcf`)

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

**SDK: gcf-typescript** (JS prototypes), **none** (chart generation)

Scripts from the v3.2 flatten feature research.

| Script | Description |
|--------|-------------|
| `encode-flat-prototype.mjs` | Prototype implementation of the nested object flattening encoder. Uses `>` as path separator to flatten nested structures into tabular columns. SDK: gcf-typescript. |
| `dot-flatten-benchmark.mjs` | Benchmarks the dot-notation flatten approach (predecessor to `>` separator). Measures token savings from flattening nested objects. SDK: gcf-typescript. |
| `cross-api-flat-benchmark.mjs` | Cross-API comparison of flatten savings across multiple MCP server data shapes. Used to determine which integration targets benefit most from flattening. SDK: gcf-typescript. |
| `flatten-charts.py` | Generates charts for the flatten experiment results. No SDK dependency. |

---

## Session Dedup Eval

**SDK: gcf-go** (test harness in `gcf-go/eval/session_dedup_test.go`)

Tests whether LLMs correctly resolve bare references (`@N  # previously transmitted`) to their original declarations from earlier in a multi-call conversation. Validates that session deduplication is safe to deploy in production agent pipelines.

| Test | What it measures | Result |
|------|-----------------|--------|
| `TestSessionDedup` | Stress test: 50-65 symbols, 3 calls, 3 formats. Counting, edge, kind questions. | gcf_session 10/12, gcf_full 10/12, json 5/12. Session matches full retransmission exactly. |
| `TestSessionDedupResolve` | Production-realistic: 5 symbols, multi-turn, resolve kind/provenance/score/edges through bare refs. | Gemini 2.5 Flash: 10/12 (edge direction reversed). Gemini 2.5 Pro: **12/12 (100%)**. |
| `TestSessionDedupDepth` | Depth tolerance: resolve same symbol at depths 2-5. | **4/4 PASS** on both models. |
| `TestSessionDedupMaxDepth` | Push to failure: resolve 3 symbols at depths 2-15 (31 messages). | Gemini 2.5 Pro: **15/15 depths, 45/45 questions, 100%**. Zero degradation. |
| `TestSessionDedupBasic` | Small production scenario: 10 devices, multi-turn, device lookup + connection query. | gcf_session 3/5, gcf_full 3/5. Identical scores. |

**Key findings:**
- Attribute resolution (kind, provenance, score) through bare refs: **100%** on frontier models
- Depth tolerance: **no degradation through 15 calls** (31 messages) on Gemini 2.5 Pro
- Session dedup matches full retransmission accuracy on every test
- Token savings: 82.7% on call 1, **91.0% on call 3** vs JSON
- Edge direction: Flash reverses `<` arrow direction; Pro reads it correctly

```bash
cd gcf-go/eval

# Resolve test (recommended starting point)
EVAL_BACKEND=google GOOGLE_API_KEY=... EVAL_MODEL=gemini-2.5-pro GOWORK=off go test -run TestSessionDedupResolve -v -timeout 10m

# Max depth test
EVAL_BACKEND=google GOOGLE_API_KEY=... EVAL_MODEL=gemini-2.5-pro GOWORK=off go test -run TestSessionDedupMaxDepth -v -timeout 30m

# Full stress test (all formats compared)
EVAL_BACKEND=google GOOGLE_API_KEY=... EVAL_MODEL=gemini-2.5-flash GOWORK=off go test -run TestSessionDedup -v -timeout 30m
```

Design doc: [SESSION-DEDUP-EVAL-DESIGN.md](SESSION-DEDUP-EVAL-DESIGN.md)

---

## Generic-Profile Delta (§10a)

**SDK: gcf-python / gcf-typescript** (Node harness), **none** (tokenizer scan)

The reproducible validation harness behind **SPEC §10a** (delta encoding for the generic profile: keyed row diffs with `## added`/`## changed`/`## removed`, the `@`-marked identity column, row-based `gcf-pack-root-v1`). Lives in [`generic-delta/`](generic-delta/); shipped in GCF **v3.3.0** with byte-identical implementations across all six SDKs.

| Piece | What it proves | Result |
|-------|----------------|--------|
| `generic-delta/tokenizer-scan/` | The `@` identity marker never fuses with the field name | `@` and `\|` isolated **43/43** tokenizers; zero new merge surface vs the existing header grammar. |
| `generic-delta/grammar/at-field-merge-check.py` | Targeted re-check of `@id` inside a field declaration | `{@id,...}` merges **0.00%** across 42 tokenizers, cleaner than bare `@field` (4.4%) and the general `@` baseline (1.09%) — the preceding `{` forces a token boundary. |
| `generic-delta/step1/` | Losslessness + multi-turn token savings | `apply(prev,delta)===next` **800,000/800,000** (0 failures); **84–89%** fewer tokens than JSON full-resend over a 6-call session (1%/5%/20% churn). |
| `generic-delta/step2/` | Comprehension: does a model reconstruct current state from base+delta? | Harness self-validates (perfect merger 100%, discriminating non-merger 44.7% delta vs 100% control). Run at depth: **six of seven** cleanly-measured models flat or better vs full-resend over a 50-turn session; the one drift (llama-3.3-70b) closed by a periodic re-anchor. |

**Key findings:**
- Per-record delta comprehension is lossless and model-independent (1,777/1,777 per-record, 0 misses on the breadth panel)
- Holds at depth: 6 of 7 cleanly-measured models flat or better across 50 turns (gpt-5.5 and deepseek-v4-flash flat at 100)
- The one drifting model (llama-3.3-70b, ~-12pp deep) is closed by a producer-side periodic re-anchor — no wire change — which separately also rescues weak models
- The `@id` identity marker was chosen empirically (0.00% tokenizer merge), not aesthetically

```bash
cd generic-delta && npm install
cd tokenizer-scan && ./.venv/bin/python scan.py       # grammar non-merge (42 HF+tiktoken); + claude_check.py = 43
cd ../step1 && command node fuzz-fixed.mjs            # 800k lossless round-trips, content-hash verified
cd ../step2 && command node step2-run.mjs --self-test # scorer discriminates (no API spend)
```

**Depth study (the comprehension run):** the full 50-turn multi-model corpus — `DEPTH-FINDINGS.md` (per-model tables, gates, provenance), the per-model result JSONs, the per-probe transcripts, and the charts — lives in [`generic-delta-comprehension/`](generic-delta-comprehension/). That is where the depth numbers above come from.

Detail: harness [`generic-delta/README.md`](generic-delta/README.md) · depth study [`generic-delta-comprehension/README.md`](generic-delta-comprehension/README.md)

---

## Results

All logs stored in `results/`:
- `comprehension/`: stress-scale and generic-profile run logs
- `generation/`: generation eval runs
- `tokenizer/`: 43-tokenizer analysis results (JSON data + run logs)
- `session-dedup/`: session dedup eval logs (resolve, depth, stress)
- `session-savings/`: session dedup + delta token savings benchmark results

**Full results:** [SUMMARY.md](results/SUMMARY.md)

**Tokenizer analysis docs:** [gcformat.com/guide/tokenizer-analysis](https://gcformat.com/guide/tokenizer-analysis)
