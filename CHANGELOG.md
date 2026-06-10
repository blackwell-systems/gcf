# Changelog

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
- Status: Draft (Stable after cross-language differential matrix passes)

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
