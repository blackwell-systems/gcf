# Changelog

## v3.4.0 (2026-07-12)

### Spec change: optional labeled form for the graph streaming trailer counts (Section 8.4.1)

- New Section 8.4.1 defines an opt-in labeled form of the graph streaming trailer's `counts` field: `counts=targets:2,related:1,edges:3` (labeled) as an alternative to the default positional `counts=2,1,3`. Detection is by the presence of `:`; the two forms MUST NOT be mixed; the `edges:` group is always present and last (`counts=edges:0` is the minimal trailer); zero-count groups are omitted. Graph profile only (a `:` in a generic-profile `counts` is malformed).
- Producer-side and non-normative to the consumer: the graph trailer counts are informational (decoder-ignored, Section 13.2). The labeled form is a comprehension aid for known weak consumers; a conforming decoder MUST accept either form (Section 16.3), and neither form changes the decoded payload.

### Spec clarification: graph streaming trailer counts are per-group (Sections 8.4, 8.7, 13.2)

- Reconciled the spec with every reference encoder: the graph streaming trailer's `counts` is the per-distance-group symbol count followed by the edge count (e.g. `counts=2,1,3`), not a single total. (The generic profile's `counts` remains one value per `[?]` header, validated per Section 13.)

### Spec correction: `.field` attachment indentation

- Aligned Section 7 with the reference encoders: positional `.field` attachments are emitted flush-left (same column as the `@N` row), with the attachment body indented beneath. The prior 2-space form matched no encoder.

### Decoder hardening: reject orphan attachments and orphan inline bodies (lossless round-trip)

- All six decoders now reject a `.field` attachment whose name is neither a `^`-marked column of its row nor a `>`-containing field name (the sole legitimate bare attachment, Section 7.4.6.1.4), instead of silently absorbing it as an undeclared extra field. The old leniency was a round-trip hole: a stray `.field` decoded to a record shape no encoder produces, and the injected field landed on whichever row parsed last (e.g. a stray `.role` silently making the last user `admin=true`). Section 16.5's `orphan_attachment` row is clarified to state the `>` exception explicitly, and `errors-v2/016_orphan_attachment.json` is converted from a decode-success to an `error` fixture; the legitimate `>`-named bare attachment stays covered by `flatten/016_gt_in_field_name.json`. Verified across all six SDKs (conformance + property round-trip green).
- All six decoders now reject an orphan positional inline body (a pipe-delimited line with no eligible `^{}` attachment-marker cell) instead of silently dropping it. The object-body parser previously skipped any unrecognized line, so a stray positional body (e.g. a second `Bob|b@t.com` after a row's one `^{name,email}` cell was already filled) vanished with no error — silent data loss. Such lines are now rejected as `orphan_inline_attachment` (`errors-v2/037`); legitimate object fields (`key=value`) and in-count rows are unaffected (proven by making the catch-all reject everything and re-running the full conformance + property-round-trip + fuzz suites green).

### Spec correction: graph `tool` field is optional

- Removed the stale Section 16.5 `Missing tool (graph)` decoder-reject row and reconciled the Section 16.1 encoder checklist: the graph header `tool` field is optional (Section 3.2, since v3.1; it is an MCP-response convention, not a requirement, and mandating it would wrongly exclude non-MCP graph producers). Decoders already accept a graph header without `tool` (`graph-decode/003_no_tool_field.json`); the Section 16.5 row contradicted that and is now removed.

### Conformance

- New `graph-stream-encode` conformance operation with shared fixtures: 004/006 (positional trailer) and 005/007 (labeled trailer, `options.labeledTrailerCounts`), where 006/007 exercise three distance groups (targets/related/extended) with distinct per-group counts and multiple edges (`counts=3,2,1,4` ↔ `counts=targets:3,related:2,extended:1,edges:4`). Fixtures 008/009 add the zero-edge case (`counts=2,1,0` / `counts=targets:2,related:1,edges:0`), pinning the rule that the edge count is always the last `counts` entry even when it is 0; this exposed and now guards a divergence where all six encoders dropped the edge count for zero-edge streams (SPEC §8.4 / §8.4.1). Streaming encode previously had only decode fixtures, which is how an earlier Go-only header regression escaped. All six SDKs reproduce these bytes exactly.
- New `generic-delta-session` fixtures exercising the re-anchor cadence (fixed-N, size-guard, and schema-change forced full).
- New `scripts/coverage-matrix.mjs` and generated `tests/conformance/COVERAGE.md`: cross-reference every fixture against the Section 16.5 decoder strict-mode taxonomy and the conformance operation set, ratcheting in CI (a newly-uncovered condition, a missing required operation, or a stale allow-list entry fails the build). It surfaced the stale `Missing tool` row (fixed above) and three uncovered conditions; this release adds the verified `inline_width_mismatch` error fixture (036) and resolves both `orphan_attachment` and `orphan_inline_attachment` via decoder hardening (see Decoder hardening above; fixtures `errors-v2/016` and `errors-v2/037`). The Section 16.5 taxonomy is now fully covered (31/31, zero tracked gaps), and the matrix ratchets in CI to keep it that way.

### Comprehension validation

- New `eval/graph-trailer-counts` study (non-reasoning instruct panel, blank-gated, n=3, four trailer arms across three sizes) motivating Section 8.4.1: emitting per-group trailer counts lifts weak/mid-tier counting comprehension by +33.9pp on average (up to +55.6pp at N=500). The labeled form is >= positional everywhere and decisive where positional regresses (llama-3.1-8b: positional -2pp vs labeled +40pp); frontier models are already at ceiling (+0). See `eval/graph-trailer-counts/FINDINGS.md`.

### Docs

- Section 15 comprehension numbers and header date refreshed; the cheatsheet's phantom `schema=` field removed and generic delta (Section 10a) added; the six `api-*` reference docs gained the v3.3 generic-delta API surface; the site and spec-reference page cascaded to v3.4.0.

## v3.3.0 (2026-07-11)

### Spec changes: Delta Encoding for the Generic Profile (Section 10a)

- New Section 10a extends delta encoding to the generic profile: a keyed row diff with `## added` / `## changed` / `## removed` sections, keyed on a designated identity column (`@id` in the field declaration + required `key=` in the header). `## changed` replaces a whole row by identity (no field-level patch in this version).
- Reuses the graph delta mechanism unchanged: the three-outcome echo handshake (§10.3), the `gcf-pack-root-v1` framework and unknown-algorithm fallback (§10.2), atomic delta application (§10.4), and session scope (§9.3). Generic-specific additions are the `## changed` section and a row-based canonical pack-root (§10a.3).
- Opt-in and bilateral: a delta is emitted only after the consumer echoes a `pack_root` the server recognizes; the decoder applies `unchanged` / `delta` / `full` identically regardless of what preceded it (cadence-agnostic guarantee).
- In the generic profile, delta and deduplication are one mechanism: an omitted row means "unchanged, keep it" (§10a.5). No separate bare-reference machinery (unlike graph session dedup, §9).
- Generic profile header (§3.3) registers the delta fields: `pack_root`, `key`, `delta`, `unchanged`, `base_root`, `new_root`, `count`, `savings`.
- New informative producer guidance (§10a.8): a producer MAY proactively emit a `full` payload on a schedule ("re-anchor") to bound accumulated-delta drift; cadence (default N=15 or an adaptive size-guard) is non-normative.

### Grammar validation

- The `@id` identity marker was selected empirically, not aesthetically. A targeted re-run of the 43-tokenizer barrier-merge method (`eval/barrier-merge-rates.py`) confirmed `@id` inside a field declaration `{@id,...}` merges 0.00% across 42 tokenizers — cleaner than bare `@field` (4.4%) and the general `@` baseline (1.09%), because the preceding `{` forces a token boundary. `key=` is required for explicit redundancy.

### Comprehension validation

- Generic-profile delta comprehension validated across a 50-turn session on ~10 models from 6+ vendors. Delta is safe at depth on 5 of 6 cleanly-measured models (frontier, cross-vendor, and weak models all hold or benefit). The one mid-tier deep-drift edge case is closed by a producer-side periodic re-anchor (measured, reproduced across two runs; deep-turn accuracy 85% to 100%). A second measured benefit: on weak/context-limited models the re-anchor recovers pure-delta degradation to full-resend level or better while keeping payloads compact (four clean models across three vendors).

### Reference implementation and conformance

- **gcf-go**: complete producer + consumer implementation of §10a — `GenericPackRoot`, `DiffGenericSets`, `EncodeGenericFull` / `EncodeGenericDelta`, `DecodeGenericFull` / `DecodeGenericDelta`, `VerifyGenericDelta` (atomic apply + root verification). Self-proving unit tests (diff -> encode -> apply -> recomputed root), a decoder-robustness suite (malformed/truncated input fails closed, never panics), and two fuzz targets (decoder never panics; arbitrary UTF-8 string cells round-trip with the pack root preserved).
- **12 shared conformance fixtures** in `tests/conformance/generic-pack-root/` (basic, nulls, string-keys, larger, number-formats) and `tests/conformance/generic-delta/` (encode, verify-apply, root-mismatch, add-existing, decode-apply, empty-encode, verify-empty). New runner operations: `generic-pack-root`, `generic-delta`, `generic-delta-verify`, `generic-delta-decode`. The pack-root fixtures pin null handling, string/typed-literal disambiguation, and canonical number formatting as a cross-implementation contract.
- **Pending**: port §10a to gcf-python, gcf-typescript, gcf-rust, gcf-swift, gcf-kotlin against the same fixtures.

## v3.2.2 (2026-07-10)

### Conformance: nested-null flatten losslessness

- Regression fixtures for a cross-SDK flatten bug: a nested object null at an intermediate level (e.g. `{meta:{owner:null}}`) was being flattened, and its leaves encoded as absent (`~`) then unflattened to a missing key, dropping the null and violating the §1.1 lossless-null invariant. The correct behavior, already required by §7.4.6 ("a non-null object ... in every row where that field is present") together with §1.1, is to fall back to the attachment mechanism (§7.4.4); a top-level null still flattens (emits `-`, reconstructs via the all-null rule). This mirrors §7.4.5.1's existing "a present null value makes the field ineligible" rule for inline schemas.
- New conformance fixtures: `flatten/017_null_deep_nested_object`, `flatten/018_null_mixed_present_absent`, `flatten/019_null_intermediate_nested_object`. Each fails on a pre-fix encoder (round-trip drop) and passes once the field bails to the attachment form.
- Fixed: `flatten/016_gt_in_field_name.json` (operation `roundtrip`) was missing its `expected` value and had been failing since v3.2.1; filled in.

## v3.2.1 (2026-06-23)

### Spec clarification: field names containing `>`

- New encoder rule 7.4.6.1.4: top-level field names containing `>` MUST NOT appear as tabular columns (emitted as per-row attachments instead)
- Ensures any column name with `>` is always a flattened path, never a literal field name
- Orphan attachment fixture updated: now decoded as extra row field instead of error
- New conformance fixture: `flatten/016_gt_in_field_name.json`

## v3.2 (2026-06-22)

### Spec changes: Nested Object Flattening (Section 7.4.6)

- Encoders MAY flatten fixed-shape nested objects into `>` path column names
- `"customer>name"` in a tabular header means the `name` field inside the `customer` object
- Decoder MUST reconstruct nesting when field names contain `>`
- Multiple levels chain: `"billing>address>city"` produces 3-level nesting
- All-absent leaves (`~`) omit the parent key; all-null leaves (`-`) set parent to null
- Encoders MUST NOT flatten when keys contain `>`, keys differ across rows, leaves are non-scalar, or nested objects are empty
- Flattened and attachment columns MAY coexist in the same header
- Round-trip guarantee preserved: `decode(encode(value)) == value`
- Alternative to inline schema (Section 7.4.5.1); both remain valid

### Comprehension validation

- 40+ eval runs across 9 models, 7 providers (Anthropic, OpenAI, Google, xAI, Moonshot, DeepSeek, Mistral, Meta, Amazon)
- 100% comprehension on every frontier model with flattened encoding
- Generation validity: 0% (current GCF) to 96-100% (flat GCF) on Mistral Medium
- Budget experiment: GCF fits 1.9x more data than JSON in the same token budget

### Conformance

- 15 new conformance fixtures in `tests/conformance/flatten/`

## v3.1 (2026-06-14)

### Spec changes

- `tool` field in graph profile header moved from required to optional (SHOULD be present for MCP tool responses, not required)
- Enables non-MCP use cases (Neo4j queries, knowledge graphs, ontologies, agent memory) without inventing a tool name

### Conformance

- Added: `graph-decode/003_no_tool_field.json` (decode graph payload without tool)
- Removed: `errors-v2/022_missing_graph_tool.json` (no longer an error)
- 157 total fixtures

### Bug fixes (all 6 implementations)

- Quote strings containing commas (`inline-schema/006_inline_with_quoted_values`)
- Decode v2-format indented attachments in tabular rows (`decode/002_attachment`)
- Reject duplicate attachments on the same row (`errors-v2/027_duplicate_attachment`)
- Reject orphan attachments on rows without `^` cells (`errors-v2/016_orphan_attachment`)
- All 6 implementations at full conformance (157/157)

## v2.0 (2026-06-10)

Specification rewrite addressing 11 correctness findings from the generic profile review. Coordinated breaking change with zero installed base cost. Prior versions (v1.0 through v1.4) are considered pre-stable development.

### Breaking changes

- **Mandatory header**: every payload requires `GCF profile=generic` or `GCF profile=graph`
- **Scalar quoting obligation**: strings colliding with typed literals must be quoted (`"true"`, `"123"`, `"-"`, `"~"`, `"^"`)
- **Full JSON string escaping**: `\b`, `\f`, `\n`, `\r`, `\t`, `\uXXXX`, surrogate pairs; `\|` removed
- **Full JSON number grammar**: exponent notation, canonical formatting rules
- **Null vs missing**: `-` is null, `~` is absent (tabular rows only)
- **Attachment marker**: `^` in tabular cells with `.field {}` / `.field [N]` attachment syntax
- **Quoted keys**: keys with special characters must be quoted; no key prefix reservation
- **Expanded per-item form**: explicit type markers `=` (scalar), `{}` (object), `[N]` (array)
- **Root values**: `=value` for root scalars, anonymous `## [N]` for root arrays
- **Streaming trailer**: `##! summary counts=N,M,...` replaces `## _summary`
- **Duplicate key rejection** in objects and field declarations
- **Normative indentation**: 2 spaces per level, tabs forbidden
- **Count validation** at every nesting level with leading-zero rejection
- **Item ID validation**: expanded item IDs must equal zero-based index

### Conformance

- 133 fixtures across 10 categories (was 61)
- All 6 implementations at v1.0.0. 200M+ total round-trips across languages.
- Go: 133/133 fixtures, 40M round-trips, 7.9M fuzz executions
- TypeScript: 130/133 fixtures, 40M round-trips. npm v1.0.0 published.
- Python: 126/133 fixtures, 40M round-trips
- Rust: 125/133 fixtures, 40M round-trips
- Kotlin: 133/133 fixtures, 40M round-trips
- Swift: 123/133 fixtures (3 key-ordering), 1K round-trips
- Cross-language matrix: 81/81 generic encode/decode verified (Go encode, Python decode)
- gcf-proxy v0.4.0: bumped to gcf-go v1.0.0, all output now v2.0 wire format
- tree-sitter-gcf: grammar updated for `##!` summary, wasm rebuilt
- Playground: `profile=graph` header, `@blackwell-systems/gcf` bumped to `^1.0.0`
- **Status: Stable** (cross-language conformance verified 2026-06-10)

### Design documents

- `SESSION-DELTA-INTEROPERABILITY.md`: informative proposal for cross-implementation session/delta interoperability (capability negotiation, canonical pack roots, atomic delta application, session lifecycle)

## v1.4 (2026-06-06)

- Streaming encoding extension (Section 6b): true zero-buffering encode
- `[?]` deferred count marker for section headers
- `## _summary` trailer provides counts after data
- Backward compatible (old decoders treat `_summary` as empty section)
- Grammar additions: `count-or-deferred`, `summary` production
- 5 streaming conformance fixtures (61 total)
- TOON cannot add this (their spec mandates upfront `[N]`, no trailer mechanism)

## v1.3 (2026-06-05)

- Primitive array inlining in tabular profile: `tags[3]: read,write,admin` (was 4 lines)
- GCF now wins all 6 datasets on TOON's benchmark (was 5/6)
- Deeply nested config: 616 tokens (was 698, TOON: 618)
- New conformance fixture: 018_primitive_array_inline.json

## v1.2 (2026-06-05)

- Edge count in header: `edges=N` field added to graph profile header
- Edge section header now includes count: `## edges [N]` (e.g. `## edges [200]`)
- Comprehension eval expanded to 13 questions (from 6), GCF achieves 100% (13/13)
- Swift implementation added (SPM distribution)
- Kotlin implementation added (JitPack distribution)
- Conformance fixtures updated to reflect new edge count format
- Spec bumped to v1.2

## v1.1 (2026-06-03)

- Tabular encoding profile (Section 6a): generic encoding for arbitrary structured data
- EBNF grammar extended with tabular-row, kv-line, nested-ref, field-decl productions
- Interactive playground with three-way comparison (JSON vs TOON vs GCF)
- Playground uses real `@toon-format/toon` library for honest comparison
- Implementations page updated with package registry links (npm, PyPI, pkg.go.dev)

## v1.0 (2026-06-03)

- Initial specification release
- Core format: header, node lines, edge lines, group headers, comments
- Session statefulness extension (multi-turn deduplication)
- Delta encoding extension (incremental context delivery)
- 16 kind abbreviations
- MIME type: `application/vnd.gcf+text`
- Versioning scheme: GCF, GCF2, GCF3, ...
