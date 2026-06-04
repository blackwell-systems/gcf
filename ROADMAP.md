# Roadmap

## Adoption blockers (next)

- [x] **CLI tool**: `gcf encode`, `gcf decode`, `gcf stats`. Bundled with each language library (Go: `cmd/gcf/`, Python: `gcf.cli`, TypeScript: `bin`). No separate install needed.
- [x] **Conformance test suite**: Language-agnostic JSON fixtures with expected GCF output. Any implementation can validate correctness by running the fixtures. Lives in `tests/conformance/`. 14 fixtures across encode (8), decode (4), session (1), delta (1), errors (3).
- [x] **npm/PyPI/Go publish**: All three live. `npm install @blackwell-systems/gcf`, `pip install gcf-python`, `go install github.com/blackwell-systems/gcf-go/cmd/gcf@latest`. v0.1.0 released 2026-06-03.

## Documentation depth

- [x] **Token savings proof**: Mathematical model of byte/token savings per structure type (symbols, edges, headers). Proves GCF saves `55 + 66n + 121e - 12g` bytes over JSON and `5n + 84e` bytes over TOON. Empirically validated. Lives in `docs/reference/token-savings-proof.md`.
- [ ] **Per-model benchmark breakdown**: Run comprehension eval across Claude, Gemini, GPT, Grok individually. Prove GCF works across all frontier models, not just one.
- [ ] **Migration guide**: Step-by-step for converting existing JSON MCP tool responses to GCF. Before/after for common patterns.

## Tooling

- [x] **Interactive playground**: Browser-based three-way comparison (JSON vs TOON vs GCF) with live encoding, token bars, savings breakdown, session dedup demo, and decode tab. Uses real `@toon-format/toon` library. Lives at `/playground` on the docs site.
- [ ] **VS Code extension**: Syntax highlighting for `.gcf` files. TextMate grammar.
- [ ] **Tree-sitter grammar**: Enables Neovim, Helix, Zed, Emacs highlighting.
- [x] **MCP proxy**: `gcf-proxy` wraps any MCP server, re-encodes JSON tool responses as GCF mid-flight. Zero code changes. Published at `go install github.com/blackwell-systems/gcf-proxy@latest`.
- [x] **Generic encoding**: `encodeGeneric` / `EncodeGeneric` / `encode_generic` shipped in all three libraries. Encodes arbitrary structured data (not just graph payloads) using GCF tabular format. Spec Section 6a documents the grammar.

## Format extensions (future, backwards-compatible)

- [ ] **Streaming encode**: Line-by-line output for large payloads without buffering the full result.
- [ ] **Binary encoding**: Optional compact binary wire format for non-LLM consumers (server-to-server). Same data model, different serialization.
- [ ] **Signature field**: Optional per-symbol function signature in a 6th positional field.
- [ ] **Component scores**: Optional score breakdown (blast_radius, confidence, recency, distance) as a structured suffix.

## Community

- [ ] **Contribution guide**: How to implement GCF in a new language, conformance requirements.
- [ ] **Logo and branding**: Visual identity for the docs site and GitHub presence.
- [ ] **Conference talk / blog series**: Deeper technical content on why positional encoding beats field-name repetition for LLM comprehension.
