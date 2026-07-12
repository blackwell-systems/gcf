# Roadmap

## Done

- [x] **6 language implementations**: Go, TypeScript, Python, Rust, Swift, Kotlin. All published to registries.
- [x] **Generic profile** (`encodeGeneric`): any structured data, not just graph payloads. Spec Section 6a.
- [x] **Graph profile** (`encode`): symbols, edges, distance groups, local IDs.
- [x] **`decodeGeneric`**: full round-trip for generic profile across all 6 languages.
- [x] **Streaming encode**: `StreamEncoder` (graph) and `GenericStreamEncoder` (generic). Zero-buffering, O(1) memory, `[?]` deferred counts + `##! summary` trailer.
- [x] **Session deduplication**: 92.7% savings by 5th call. Bare references for previously-transmitted symbols.
- [x] **Delta encoding**: 81.2% savings on re-queries.
- [x] **MCP proxy**: `gcf-proxy` wraps any MCP server, re-encodes JSON as GCF mid-flight. npm, PyPI, Go.
- [x] **CLI tool**: `gcf encode`, `gcf decode`, `gcf stats` in Go, Python, TypeScript.
- [x] **Conformance test suite**: 14 language-agnostic JSON fixtures.
- [x] **Interactive playground**: three-way live comparison (JSON/TOON/GCF) with real TOON library.
- [x] **Comprehension eval**: 23 runs, 10 models, 3 providers. 90.7% average. Four models at 100%.
- [x] **Generation eval**: 28 runs, 9 models, 3 providers. 5/5 on every frontier model.
- [x] **Failure taxonomy**: precision vs comprehension vs structural overwhelm, classified by model tier.
- [x] **Token efficiency on TOON's benchmark**: wins all 6 datasets.
- [x] **Primitive array inlining**: `tags[3]: read,write,admin` (spec v1.3).
- [x] **`## edges [N]` header**: edge count in section header (spec v1.2).
- [x] **betterthanjson.com**: full benchmark landing page.
- [x] **12 publication-quality charts**: hero, accuracy-by-model, generation-validity, error-magnitude, tokens-vs-accuracy, advantage-by-tier, output-cost-at-scale, toon-heatmap, distance-label-problem, failure-types, failure-types-pie, comprehension-variance.

## Next

- [ ] **Generic-profile delta** (spec §10a): keyed row diff (`## added` / `## changed` / `## removed`) extending graph delta (§10) to tabular data. Opt-in and bilateral (consumer echoes `pack_root`, inherits the §10.3 three-outcome handshake); whole-row replacement keyed on a designated `@id` identity column + required `key=`; row-based `gcf-pack-root-v1`. In the generic profile, delta and dedup are one mechanism — an omitted row means "unchanged, you already have it" (no separate bare-reference machinery; see Format extensions below). Spec section drafted (SPEC.md §10a). Comprehension-validated to 50-turn depth across ~10 models / 6+ vendors: safe on 5 of 6 cleanly-measured models; the one mid-tier deep-drift edge case is closed by a producer-side **periodic re-anchor** (the `full` outcome on a schedule, no wire change; default N=15 or adaptive size-guard, informative §10a.8). Also a second, measured benefit: re-anchor rescues weak/context-limited models (resend-quality without resend's context bulk). **Next:** implement across all 6 SDKs + conformance fixtures + version bump.
- [ ] **Ruby implementation**: 7th language. Conformance fixtures exist, spec is stable. Encoder, decoder, scalar grammar, streaming, conformance runner.
- [ ] **Whitepaper rewrite**: structured data positioning, multi-format interop, updated eval data (1,700+ evaluations, 23B+ round-trips).
- [ ] **Blog post**: "The format LLMs understand without training" with inline data.
- [ ] **LinkedIn content**: Dr. Seuss poem, playground demo, calculator.

## Spec v1.5 (under consideration)

- [ ] **Omit zero-value header fields**: `budget=0 tokens=0` wastes ~4 tokens per payload. All 6 encoders unconditionally emit them. Fix to omit when zero. No eval rerun needed (scores unchanged, only token count drops marginally).
- [ ] **`## _counts` section**: dedicated metadata section with kind/edge-type counts. Jumped GPT-5.4 from 76.9% to 90.9% in experiment (+14pp). Adds format complexity. Needs testing on more models before committing to spec.

## Tooling

- [ ] **Tree-sitter grammar** (`tree-sitter-gcf`): syntax highlighting for editors (VS Code, Neovim, Helix, Zed).
- [ ] **VS Code extension**: TextMate grammar for `.gcf` files.
- [ ] **Proxy Phase 2**: HTTP/SSE frontend for non-stdio MCP transports.
- [ ] **Proxy Phase 3**: session deduplication in proxy (cross-call symbol tracking).

## Format extensions (future, backwards-compatible)

- [ ] **Generic cross-query session dedup**: bare-key back-references for rows already transmitted in a prior turn — the generic parallel to graph session dedup (§9). Only helps *different overlapping query results* (call 3 returns rows already sent in call 1, not as a delta of call 1's set); the common same-set-evolving case is already covered by generic-delta omission. **Requires its own comprehension eval before committing** — does a model resolve a bare-key reference to a prior-turn row as reliably as graph's `@id # previously transmitted` did (§9: 100% attribute resolution)? Gated on a real workload that needs it; not bundled into the §10a delta update.
- [ ] **Opt-in strict decode / completeness validation**: a decoder-side `strict` (a.k.a. `validateComplete`) option that fails closed on a truncated or incomplete document, giving security-sensitive consumers a JSON-style truncation guarantee. Decoder-side only, no wire-format change, no impact on the default token count or streaming. Motivated by structural-injection research (Alshaer S-TOON, Class 5 "open field truncation"); GCF's tabular decoder is tolerant of truncation by design, so this is an explicit opt-out of that leniency rather than a default. Prefer enforcing via an existing completeness signal (`##! summary counts=N` trailer, expected row count) over adding a new sentinel. See [Lossless Verification](docs/guide/lossless-verification.md#truncation-tolerance-and-completeness-validation).

## Community

- [ ] **Contribution guide**: how to implement GCF in a new language, conformance requirements.
- [ ] **HuggingFace dataset**: eval results for discoverability (not for fine-tuning).
- [ ] **Zenodo DOI**: citable reference for the whitepaper.
- [ ] **Conference talk / blog series**: deeper technical content on structural comprehension vs flat tabular.
