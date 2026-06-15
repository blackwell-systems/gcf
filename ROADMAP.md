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

- [ ] **Ruby implementation**: 7th language. Conformance fixtures exist, spec is stable. Encoder, decoder, scalar grammar, streaming, conformance runner.
- [ ] **Whitepaper rewrite**: structured data positioning, multi-format interop, updated eval data (1,700+ evaluations, 23B+ round-trips).
- [ ] **Blog post**: "The format LLMs understand without training" with inline data.
- [ ] **LinkedIn content**: Dr. Seuss poem, playground demo, calculator.
- [ ] **Value alias comprehension eval**: test if LLMs maintain 100% accuracy when repeated values are aliased.

## Spec v1.5 (under consideration)

- [ ] **Omit zero-value header fields**: `budget=0 tokens=0` wastes ~4 tokens per payload. All 6 encoders unconditionally emit them. Fix to omit when zero. No eval rerun needed (scores unchanged, only token count drops marginally).
- [ ] **`## _counts` section**: dedicated metadata section with kind/edge-type counts. Jumped GPT-5.4 from 76.9% to 90.9% in experiment (+14pp). Adds format complexity. Needs testing on more models before committing to spec.

## Tooling

- [ ] **Tree-sitter grammar** (`tree-sitter-gcf`): syntax highlighting for editors (VS Code, Neovim, Helix, Zed).
- [ ] **VS Code extension**: TextMate grammar for `.gcf` files.
- [ ] **Proxy Phase 2**: HTTP/SSE frontend for non-stdio MCP transports.
- [ ] **Proxy Phase 3**: session deduplication in proxy (cross-call symbol tracking).

## Format extensions (future, backwards-compatible)

- [ ] **Value aliases**: semantic compression for repeated values. Define aliases once (e.g., `SF=San Francisco`), reference by alias in body rows. Could significantly reduce tokens on data with high value repetition (cities, departments, status enums). **Requires comprehension eval before committing**: the 100% accuracy number must hold with aliases active. If comprehension drops even 5%, not worth it.
- [ ] **Binary encoding**: compact binary wire format for non-LLM consumers (server-to-server).
- [ ] **Signature field**: optional per-symbol function signature.
- [ ] **Component scores**: optional score breakdown (blast_radius, confidence, recency, distance).

## Community

- [ ] **Contribution guide**: how to implement GCF in a new language, conformance requirements.
- [ ] **HuggingFace dataset**: eval results for discoverability (not for fine-tuning).
- [ ] **Zenodo DOI**: citable reference for the whitepaper.
- [ ] **Conference talk / blog series**: deeper technical content on structural comprehension vs flat tabular.
