# Roadmap

## Adoption blockers (next)

- [ ] **CLI tool**: `npx @blackwell-systems/gcf` for encode/decode from stdin/files. Zero-friction try-it experience. Supports `encode < input.json`, `decode < input.gcf`, `stats` (token count comparison vs JSON).
- [ ] **Conformance test suite**: Language-agnostic JSON fixtures with expected GCF output. Any implementation can validate correctness by running the fixtures. Lives in `tests/conformance/`.
- [ ] **npm/PyPI publish**: Publish `@blackwell-systems/gcf` to npm and `gcf-py` to PyPI so install commands actually work.

## Documentation depth

- [ ] **Efficiency formalization**: Mathematical proof of byte/token savings per structure type (symbols, edges, headers). Formal model like TOON's but with graph-specific analysis showing why edges compound savings.
- [ ] **Per-model benchmark breakdown**: Run comprehension eval across Claude, Gemini, GPT, Grok individually. Prove GCF works across all frontier models, not just one.
- [ ] **Migration guide**: Step-by-step for converting existing JSON MCP tool responses to GCF. Before/after for common patterns.

## Tooling

- [ ] **Interactive playground**: Browser-based encode/decode with live token comparison. VitePress custom component or standalone page.
- [ ] **VS Code extension**: Syntax highlighting for `.gcf` files. TextMate grammar.
- [ ] **Tree-sitter grammar**: Enables Neovim, Helix, Zed, Emacs highlighting.
- [ ] **MCP proxy**: Middleware that intercepts JSON tool responses and re-encodes as GCF (like TOON's "Tooner" proxy). Drop-in upgrade for existing MCP servers.

## Format extensions (future, backwards-compatible)

- [ ] **Streaming encode**: Line-by-line output for large payloads without buffering the full result.
- [ ] **Binary encoding**: Optional compact binary wire format for non-LLM consumers (server-to-server). Same data model, different serialization.
- [ ] **Signature field**: Optional per-symbol function signature in a 6th positional field.
- [ ] **Component scores**: Optional score breakdown (blast_radius, confidence, recency, distance) as a structured suffix.

## Community

- [ ] **Contribution guide**: How to implement GCF in a new language, conformance requirements.
- [ ] **Logo and branding**: Visual identity for the docs site and GitHub presence.
- [ ] **Conference talk / blog series**: Deeper technical content on why positional encoding beats field-name repetition for LLM comprehension.
