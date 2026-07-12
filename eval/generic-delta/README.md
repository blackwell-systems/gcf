# GCF Generic-Profile Delta — reproducible eval harness

The reproducible validation harness behind **SPEC §10a** (delta encoding for the generic profile):
the grammar merge scan, the losslessness fuzz, the multi-turn token benchmark, and the comprehension
eval (fixtures + runner + scorer). Self-contained and reproducible. Status: **shipped** — §10a is in
the spec as of GCF **v3.3.0**, with byte-identical reference implementations across all six SDKs
(go, python, typescript, rust, swift, kotlin). The comprehension gate (step 2) was run at depth; the
full multi-model results and per-model tables are the depth study (see "Comprehension result" below).

## The idea in one line

Extend **delta** (send only what changed) from the graph profile to the **generic** profile, so the
multi-turn moat (which JSON and TOON structurally lack) applies to the common case: keyed record sets
(DB rows, API listings, MCP tool results) in agent loops.

## Setup

```bash
npm install                 # node deps (only step1 token benchmark needs them; step2 is pure node)
# for the tokenizer scan (python):
cd tokenizer-scan && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
npm i @lenml/tokenizer-claude   # provides the Claude tokenizer.json for the 43rd tokenizer
```

Node: use a modern node (the harness was built on v26). If `node` is shimmed through a disabled nvm,
prefix with `command node`.

## Layout & how to run

### `tokenizer-scan/` — grammar is non-merging (43 tokenizers)
Confirms every structural char in the delta grammar stays isolated (never fused with content) across 43
production tokenizers. The one new decision — `@` marking the identity column — must be 100% isolated.
```bash
cd tokenizer-scan && ./.venv/bin/python scan.py        # 42 HF+tiktoken
./.venv/bin/python claude_check.py                     # + Claude = 43
```
**Result:** `@` and `|` (the data path) isolated **43/43**. `,`/`=` merge on ~15 but are pre-existing
header-only chars, not introduced by delta. Zero new merge surface.

### `step1/` — losslessness + token savings (model-free)
```bash
cd step1
command node fuzz-fixed.mjs      # 800,000 delta round-trips, content-hash verified
command node delta-step1.mjs     # multi-turn token benchmark (cl100k)
```
**Results:** `apply(prev,delta)===next` **800,000/800,000** (0 failures). Multi-turn savings vs JSON
full-resend over a 500-row/6-call session: **89% / 88% / 84%** at 1% / 5% / 20% churn (per-call-only GCF
is ~39% — the delta is the multi-turn compounding). Lesson baked in: enforce **key uniqueness**; verify
by **content, not key** (a keyed comparator was blind to the failure mode a content hash caught).

### `step2/` — comprehension eval (the gate)
Does a model reconstruct current state from base+delta across turns as well as if handed the full state?
```bash
cd step2
command node step2-gen.mjs       # generate fixtures -> step2-fixtures/
command node step2-verify.mjs    # prove ground truth: delta arm == full arm (21/21), answers re-derivable (150/150)
command node step2-run.mjs --self-test   # prove the runner+scorer discriminate (no API needed)
```
Self-test proves the pipeline: **perfect merger 100%/100%** (flat across 15 depths — the target signal),
**non-merger 44.7% delta vs 100% control (55pp gap, merge-question types collapse)**, **wrong 0%**.

**Live runs** are **incremental, resumable, and failure-recovering.** Every probe is scored and
appended to `step2-results/results.jsonl` immediately; re-running the same command **skips completed
cells** (resume). Rate-limit (429) and overload (5xx/529) errors retry with exponential backoff +
jitter, honoring `Retry-After`; auth/bad-request fail fast; HTTP and Codex calls have timeouts. A full
crash loses nothing — just re-run to continue.

```bash
# OpenRouter
OPENROUTER_API_KEY=... command node step2-run.mjs --backend openrouter --model anthropic/claude-opus-4
# OmniRoute (or any OpenAI-compatible gateway)
OMNIROUTE_API_KEY=... command node step2-run.mjs --backend omniroute --base-url https://<endpoint>/v1 --model <m>
# local Codex CLI (uses its own auth; runs `codex exec -c model=<m> -`)
command node step2-run.mjs --backend codex --model gpt-5-codex
# generic OpenAI-compatible
command node step2-run.mjs --backend openai --base-url <url> --api-key-env MY_KEY --model <m>

# then, across all models/backends you've run over time:
command node step2-run.mjs --aggregate      # per-model delta/full/gap, by-type, by-depth, average-of-model-averages
```

Flags: `--runs N` (repeat for averaging), `--fixture NAME`, `--arms delta,full_resend` (partial),
`--max-depth D` (cap turns), `--max-retries R` (default 6), `--fresh` (ignore prior results). Progress
prints `ran / skipped / errored`; each run ends with `--aggregate` guidance. Errored cells are *not*
marked done, so a later re-run automatically re-attempts exactly them.

Recovery/resume are self-testable with zero API spend via the stub backend:
`--backend stub --model flaky` injects ~40% retryable 429s (must finish 0-errored);
`--backend stub --model perfect|latestFull|wrong` exercises the scorer.

## Go / no-go (from the proposal)

- **Ship default:** delta within ~2–5% of the full-resend control on the frontier panel, flat depth curve through ~15 turns.
- **Ship opt-in-only:** holds on frontier, drops on small models (per-provider gate, like NeuroNest).
- **Reject/redesign:** drops >5% on frontier, especially `unchanged_persistence` or `latest_of_multiple`.

## Caveats for live runs

- Codex `exec` is an agent and may wrap answers in chatter; the parser grabs `N: value` lines but
  smoke-test one fixture first.
- Single-pass at temp 0.2. For average-of-model-averages rigor, add repeated runs per model (not yet wired).
- OmniRoute base-URL is yours to supply; OpenRouter works without the optional referer headers.

## What's proven vs pending

| Piece | Status |
|---|---|
| Grammar non-merging (43 tokenizers) | ✅ proven |
| Losslessness (800k round-trips) | ✅ proven |
| Multi-turn token savings | ✅ measured (84–89%) |
| Comprehension harness (fixtures/runner/scorer) | ✅ built + self-validated |
| Comprehension **result** (real models) | ✅ run at depth — six of seven cleanly-measured models flat or better vs full-resend across a 50-turn session; the one drift (llama-3.3-70b) closed by a periodic re-anchor. Full per-model tables, gates, and provenance in the depth study: [`../generic-delta-comprehension/`](../generic-delta-comprehension/). |
