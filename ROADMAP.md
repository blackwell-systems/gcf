# Roadmap

## Done

- [x] **6 language implementations**: Go, TypeScript, Python, Rust, Swift, Kotlin. All published to registries.
- [x] **Generic profile** (`encodeGeneric`): any structured data, not just graph payloads. Spec Section 6a.
- [x] **Graph profile** (`encode`): symbols, edges, distance groups, local IDs.
- [x] **`decodeGeneric`**: full round-trip for generic profile across all 6 languages.
- [x] **Streaming encode**: `StreamEncoder` (graph) and `GenericStreamEncoder` (generic). Zero-buffering, O(1) memory, `[?]` deferred counts + `##! summary` trailer.
- [x] **Session deduplication**: 86% by 5th call from dedup alone, 99% stacked with delta. Bare references for previously-transmitted symbols.
- [x] **Delta encoding**: 81.2% savings on re-queries.
- [x] **MCP proxy**: `gcf-proxy` wraps any MCP server, re-encodes JSON as GCF mid-flight. npm, PyPI, Go.
- [x] **CLI tool**: `gcf encode`, `gcf decode`, `gcf stats` in Go, Python, TypeScript.
- [x] **Conformance test suite**: 14 language-agnostic JSON fixtures.
- [x] **Interactive playground**: three-way live comparison (JSON/TOON/GCF) with real TOON library.
- [x] **Comprehension eval**: 24 runs, 10 models, 3 providers. 91.2% average (graph); generic profile 100% on every frontier model. Four models at 100%.
- [x] **Generation eval**: 28 runs, 11 models, 3 providers. 5/5 on every frontier model.
- [x] **Failure taxonomy**: precision vs comprehension vs structural overwhelm, classified by model tier.
- [x] **Token efficiency on TOON's benchmark**: wins all 6 datasets.
- [x] **Primitive array inlining**: `tags[3]: read,write,admin` (spec v1.3).
- [x] **`## edges [N]` header**: edge count in section header (spec v1.2).
- [x] **betterthanjson.com**: full benchmark landing page.
- [x] **12 publication-quality charts**: hero, accuracy-by-model, generation-validity, error-magnitude, tokens-vs-accuracy, advantage-by-tier, output-cost-at-scale, toon-heatmap, distance-label-problem, failure-types, failure-types-pie, comprehension-variance.

## Next

- [ ] **Generic-profile delta** (spec §10a): keyed row diff (`## added` / `## changed` / `## removed`) extending graph delta (§10) to tabular data. Opt-in and bilateral (consumer echoes `pack_root`, inherits the §10.3 three-outcome handshake); whole-row replacement keyed on a designated `@id` identity column + required `key=`; row-based `gcf-pack-root-v1`. In the generic profile, delta and dedup are one mechanism — an omitted row means "unchanged, you already have it" (no separate bare-reference machinery; see Format extensions below). Spec section drafted (SPEC.md §10a). Comprehension-validated to 50-turn depth across ~10 models / 6+ vendors: safe on 5 of 6 cleanly-measured models; the one mid-tier deep-drift edge case is closed by a producer-side **periodic re-anchor** (the `full` outcome on a schedule, no wire change; default N=15 or adaptive size-guard, informative §10a.8). Also a second, measured benefit: re-anchor rescues weak/context-limited models (resend-quality without resend's context bulk). **Next:** implement across all 6 SDKs + conformance fixtures + version bump.
- [ ] **Ruby implementation**: 7th language. Conformance fixtures exist, spec is stable. Encoder, decoder, scalar grammar, streaming, conformance runner.
- [ ] **Whitepaper rewrite**: structured data positioning, multi-format interop, updated eval data (2,500+ evaluations, 43 billion+ round-trips).
- [ ] **Blog post**: "The format LLMs understand without training" with inline data.
- [ ] **LinkedIn content**: Dr. Seuss poem, playground demo, calculator.

## Spec v1.5 (under consideration)

- [ ] **Omit zero-value header fields**: `budget=0 tokens=0` wastes ~4 tokens per payload. All 6 encoders unconditionally emit them. Fix to omit when zero. No eval rerun needed (scores unchanged, only token count drops marginally).
- [ ] **`## _counts` section**: dedicated metadata section with kind/edge-type counts. Jumped GPT-5.4 from 76.9% to 90.9% in experiment (+14pp). Adds format complexity. Needs testing on more models before committing to spec.
- [ ] **Streaming trailer, per-group counts**: qualified by eval — graduated to **Producer-side comprehension aids** below (keep `positional` as the shipped default, add `labeled` as an opt-in encoder mode).

## Producer-side comprehension aids for weak consumers

One capability, not N flags: opt-in, non-normative encoder knobs that make a cheap/weak model comprehend a payload better, at roughly zero cost (or benefit) for a strong model. The asymmetry is the point — small/open models are where cost pressure and format-sensitivity both live, so an aid that is free for frontier models and a rescue for an 8B model is directly monetizable, and it is differentiated (JSON/TOON have no notion of tuning the wire for a weaker reader). The honest scope, stated up front so this reads as a capability and not overselling: v1 is **producer-configured for a known consumer** (the operator running the MCP server knows they feed an 8B model), **not auto-adaptive**. The producer picks the knob from an out-of-band signal of the consumer tier; "tune the wire for the model on the other end" is a real producer choice, not runtime negotiation or magic.

Every member must clear the same evidence bar on the eval harness (`eval/graph-trailer-counts` is the template) before it ships:

- Measured effect by **model tier x payload size**, blank-gated, n>=3, **non-reasoning instruct models** (reasoning models sit at ceiling and are uninformative for a format-aid question).
- **Token cost paired to the accuracy delta** (a trade, not a p-value).
- **>= 0 for capable models, positive for the target tier** (the asymmetry is required, not a bonus).
- **Opt-in, non-normative, decoder-ignored** — no grammar or decoder leak; the default wire stays clean.

A candidate that misses the bar is dropped and documented as a negative, not quietly kept — that negative-results discipline is what separates this from TOON-style unmeasured options.

Roster (by evidence maturity):

- [x] **Labeled per-group trailer counts** — QUALIFIED (`eval/graph-trailer-counts/FINDINGS.md`). Emit the graph `##! summary` counts in labeled `counts=targets:2,related:1,edges:3` form. Across 6 non-reasoning models at n=3: per-group counts add **+34pp** on weak/mid models (up to +56pp at N=500), ~0 at the frontier; **labeled >= positional everywhere** (+14pp aggregate), decisive where positional fails (llama-3.1-8b: positional -2pp, labeled +40pp). Direction: keep `positional` as the shipped default (decoder-ignored, cheap, conformance-locked); add `labeled` as an opt-in encoder mode. Fully written up: `FINDINGS.md`, two charts (`gcf-charts`: `trailer-counts-by-arm`, `trailer-counts-by-size`), and a worked example (a self-hosted agent on an 8B model calling a code-graph tool). Remaining work is implementation only: the `labeled` encoder option in the six SDKs + a §8.4 note that graph `counts` MAY use the labeled form.
- [ ] **Re-anchor "resend-quality for weak models"** — evidence from the delta depth study (`eval/generic-delta-comprehension`, DEPTH-FINDINGS): a periodic full re-anchor gives weak/context-limited models resend-quality without resend's context bulk. Already shipped as the non-normative re-anchor cadence (§10a.8); this is the same idea framed as a weak-consumer aid.
- [ ] **`## _counts` metadata section** (also under Spec v1.5) — UNQUALIFIED: one model (GPT-5.4 +14pp). A heavier, top-of-payload version of labeled trailer counts. Must clear the harness (tier x size, n>=3) before it graduates from "under consideration."

## Classification and routing (EncodeAuto)

An opt-in encoder that classifies each payload and routes it to the best grammar instead of making the caller choose. Design: [`ENCODE-AUTO-DESIGN.md`](ENCODE-AUTO-DESIGN.md). Two axes with two sources of truth: payload shape (inferred from the data) selects the grammar; consumer tier (declared by the caller) selects the measured producer-side knobs above. Entirely opt-in and additive, a separate `EncodeAuto` entry point with every existing encoder unchanged and still the default; nothing routes unless it is called. The comprehension-degrading grammars are never auto-selected (the encoder cannot see the consumer model); they are reachable only through a further explicit, tier-gated opt-in.

Same evidence bar as the producer-side aids: a routing choice ships only when the eval harness shows it is the comprehension-per-token winner for that (shape, tier).

- [ ] **Shape classifier + decision table** (safe tier): graph / keyed-map / generic chosen by payload shape; generic stays the default and the fallback.
- [ ] **Tier -> knob routing**: frontier / mixed / small map to the measured aids (flatten on/off, positional vs labeled counts, re-anchor cadence). Reuses the roster above rather than adding new knobs.
- [ ] **Eval-derived routing table**: the (shape, tier) -> grammar table is generated from the comprehension harness, not hand-tuned, and regenerated as models and data change. Makes the router empirically grounded rather than heuristic.
- [ ] **`gcf analyze`** (read-only advisor): reports detected shape, recommended grammar, per-column cardinality, estimated tokens per technique, and a comprehension-risk flag. Zero-risk first build; forces the classifier into existence without any routing commitment. Placement: the classifier is SDK library code (shared with `EncodeAuto`, Go first); `analyze` is a CLI subcommand next to `encode` / `decode` / `stats` in every SDK CLI, printing the report but owning no logic. The shape-to-grammar decision table and cardinality thresholds are spec'd and conformance-tested so every SDK's `analyze` returns the same recommendation. `gcf stats` (token numbers) stays separate; `analyze` may include those numbers as a superset.
- [ ] **Comprehension-floor dial**: the caller declares a minimum expected comprehension for its consumer and the router returns the smallest encoding that clears it. Generalizes the discrete tiers into a declarative constraint; needs the measured per-grammar comprehension curves as backing.
- [ ] **Round-trip self-verify** (`Verified` mode): encode, decode, and compare before returning, guaranteeing no silent corruption from any technique the router chose. Cheap insurance, strongest once the lossy tier exists.
- [ ] **Tokenizer-aware selection**: optional target-tokenizer input; pick the grammar and delimiter that tokenize best for that tokenizer. Opt-in (tokenizer-specific output is less portable). The direct generalization of the delimiter merge-rate study.
- [ ] **Cardinality-driven per-column technique** (lossy tier only): dictionary/enum for low-cardinality columns, affix/template factoring for high-cardinality-structured columns, inline for unstructured. Overlaps the columnar-RLE item under Format extensions; both stay behind the lossy opt-in because reference-by-index reintroduces pointer indirection (the comprehension failure the safe tier avoids). The one safe case is factoring a near-constant column to a single declaration.

## Tooling

- [ ] **Tree-sitter grammar** (`tree-sitter-gcf`): syntax highlighting for editors (VS Code, Neovim, Helix, Zed).
- [ ] **VS Code extension**: TextMate grammar for `.gcf` files.
- [ ] **Proxy Phase 2**: HTTP/SSE frontend for non-stdio MCP transports.
- [ ] **Proxy Phase 3**: session deduplication in proxy (cross-call symbol tracking).

## Format extensions (future, backwards-compatible)

- [ ] **Generic cross-query session dedup**: bare-key back-references for rows already transmitted in a prior turn — the generic parallel to graph session dedup (§9). Only helps *different overlapping query results* (call 3 returns rows already sent in call 1, not as a delta of call 1's set); the common same-set-evolving case is already covered by generic-delta omission. **Requires its own comprehension eval before committing** — does a model resolve a bare-key reference to a prior-turn row as reliably as graph's `@id # previously transmitted` did (§9: 100% attribute resolution)? Gated on a real workload that needs it; not bundled into the §10a delta update.
- [ ] **Value-grouping for low-cardinality columns (columnar RLE)**: an opt-in generic-profile emission that groups rows by a shared column value, emits that value once as a subheader, and lists the members bare, instead of repeating the value on every row. The positional-tabular default carries every column on every row, so it inflates on **grouped/hierarchical categorical data** (containment trees, code outlines, status-partitioned lists) where one column is low-cardinality. Measured on real captured `get_symbols_overview` output from a code-intelligence MCP server whose overview groups `kind -> class -> [method-names]`: positional-tabular GCF was **877 / 590 tokens** on two files versus the server's own grouped JSON at **539 / 152** (GCF 1.6-3.9x larger), and a flat-table reshape was *worse* (1,180) because it repeated the grouping column on all 106 rows. A hand-built grouped emission hit **466 / 160**, beating both GCF and the server's format on the larger file. So the win is real but shape-specific and small in absolute terms (hundreds of tokens). Must clear the same evidence bar as the producer-side aids (does grouping change comprehension? tier x size, n>=3, non-reasoning models; token cost paired to any accuracy delta), stay opt-in / non-normative, and preserve decoder round-trip. Independent integration rule this also reinforces: always apply GCF best-of-N against the source with a strictly-smaller guard (as `gcf-proxy` and OmniRoute's SmartCrusher do), so on already-grouped shapes GCF declines rather than inflates. Surfaced by an integration pre-screen where the target's own serialization out-compacted positional-tabular GCF on nested name-list data (a genuine anti-fit).
- [ ] **Opt-in strict decode / completeness validation**: a decoder-side `strict` (a.k.a. `validateComplete`) option that fails closed on a truncated or incomplete document, giving security-sensitive consumers a JSON-style truncation guarantee. Decoder-side only, no wire-format change, no impact on the default token count or streaming. Motivated by structural-injection research (Alshaer S-TOON, Class 5 "open field truncation"); GCF's tabular decoder is tolerant of truncation by design, so this is an explicit opt-out of that leniency rather than a default. Prefer enforcing via an existing completeness signal (`##! summary counts=N` trailer, expected row count) over adding a new sentinel. See [Lossless Verification](docs/guide/lossless-verification.md#truncation-tolerance-and-completeness-validation).

## Community

- [ ] **Contribution guide**: how to implement GCF in a new language, conformance requirements.
- [ ] **HuggingFace dataset**: eval results for discoverability (not for fine-tuning).
- [ ] **Zenodo DOI**: citable reference for the whitepaper.
- [ ] **Conference talk / blog series**: deeper technical content on structural comprehension vs flat tabular.
