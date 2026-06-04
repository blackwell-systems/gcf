# GCF Specification v1.1

**Graph Compact Format: a token-optimized wire format for structured LLM tool responses.**

## 1. Overview

GCF is a text-based, line-oriented wire format for encoding structured data in a token-efficient manner. It is designed for consumption by large language models (LLMs) operating under fixed token budgets.

GCF supports two encoding profiles:

- **Graph profile** (Sections 3-6): Encodes code graph payloads (symbols, edges, distance groups) for MCP tool responses. 84% median token savings versus JSON.
- **Tabular profile** (Section 6a): Encodes arbitrary structured data (arrays of objects, nested records, mixed types) using positional rows and pipe separators. 34% fewer tokens than TOON on mixed-structure benchmarks.

Both profiles share the same grammar primitives: `##` section headers, `@` local IDs, positional fields. The savings come from eliminating three sources of waste: field name repetition (positional encoding), identifier repetition (local IDs), and per-record metadata (hierarchical grouping).

## 2. Grammar

```
payload       = header LF { section } ;
section       = group-header LF { line LF } ;
line          = node-line | edge-line | ref-line | tabular-row
              | kv-line | nested-ref | comment ;

header        = "GCF" SP key-value { SP key-value } ;
group-header  = "##" SP group-name [ SP "[" count "]" field-decl ] ;
field-decl    = "{" field-name { "," field-name } "}" ;
node-line     = "@" id SP kind SP qname SP score SP provenance ;
edge-line     = "@" target-id "<" "@" source-id SP edge-type [ SP status ] ;
ref-line      = "@" id SP SP "# previously transmitted" ;
tabular-row   = [ "@" id SP ] value { "|" value } ;
kv-line       = key "=" value ;
nested-ref    = "." field-name ;
comment       = "#" SP text ;

key-value     = key "=" value ;
id            = DIGIT { DIGIT } ;
count         = DIGIT { DIGIT } ;
kind          = "fn" | "type" | "method" | "iface" | "var" | "const"
              | "resource" | "table" | "class" | "selector" | "field"
              | "route" | "ext" | "file" | "pkg" | "svc" ;
qname         = <non-whitespace text> ;
score         = <decimal float> ;
provenance    = <non-whitespace text> ;
edge-type     = <non-whitespace text> ;
status        = "added" | "removed" ;
field-name    = <identifier> ;
group-name    = "targets" | "related" | "extended" | "edges"
              | "distance_" DIGIT { DIGIT }
              | "removed" | "added" | "edges_removed" | "edges_added"
              | <identifier> ;
```

Line terminator is `LF` (`\n`). Implementations must tolerate trailing `\r` (CRLF input).

## 3. Header (Graph Profile)

The graph profile begins with a header line identifying the format and carrying payload metadata. The tabular profile (Section 6a) does not require a header line.

```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=10 pack_root=a1b2c3d4...
```

### Required fields (graph profile)

| Field | Type | Description |
|-------|------|-------------|
| `tool` | string | Name of the tool that produced this response |

### Optional fields

| Field | Type | Description |
|-------|------|-------------|
| `budget` | integer | Token budget requested by the consumer |
| `tokens` | integer | Actual tokens used in this payload |
| `symbols` | integer | Number of symbols in this payload |
| `pack_root` | string | Content-addressed identity of this payload (hex hash). Enables deduplication and delta encoding. |
| `session` | boolean | `true` if session statefulness is active |
| `delta` | boolean | `true` if this is a delta payload (see Section 8) |
| `base_root` | string | Pack root of the prior payload (delta mode only) |
| `new_root` | string | Pack root of the current payload (delta mode only) |
| `savings` | string | Token savings percentage (delta mode only, e.g. `81%`) |

## 4. Node Lines (Graph Profile)

```
@{id} {kind} {qualified_name} {score} {provenance}
```

Fields are positional, separated by whitespace. No field names, no delimiters, no quoting.

- **id**: Zero-based integer, unique within this payload. Assigned sequentially.
- **kind**: Abbreviated node type (see Kind Abbreviations).
- **qualified_name**: Full identifier. Must not contain whitespace.
- **score**: Relevance score as a decimal float (e.g., `0.78`).
- **provenance**: Discovery method (e.g., `lsp_resolved`, `ast_inferred`).

### Kind Abbreviations

| Abbreviation | Full form |
|-------------|-----------|
| `fn` | function |
| `type` | type |
| `method` | method |
| `iface` | interface |
| `var` | var |
| `const` | const |
| `resource` | resource |
| `table` | table |
| `class` | class |
| `selector` | selector |
| `field` | field |
| `route` | route_handler |
| `ext` | external |
| `file` | file |
| `pkg` | package |
| `svc` | service |

Implementations may extend this table. Unknown abbreviations must be passed through verbatim (no error).

## 5. Edge Lines (Graph Profile)

```
@{target}<@{source} {edge_type} [{status}]
```

- The `<` arrow points toward the target. `@0<@4 calls` means "symbol @4 calls symbol @0."
- **edge_type**: Relationship type (e.g., `calls`, `imports`, `implements`). Unrestricted.
- **status**: Optional. `added` or `removed` for diff payloads.

Source and target IDs must reference symbols declared earlier in the payload.

## 6. Group Headers (Graph Profile)

```
## targets
## related
## extended
## edges
## distance_N
```

Group headers partition the payload into semantic sections. The group a node appears in encodes its distance from the query center:

| Group | Distance | Meaning |
|-------|----------|---------|
| `targets` | 0 | Direct matches for the query |
| `related` | 1 | One hop away from targets |
| `extended` | 2+ | Broader structural context |
| `edges` | n/a | Relationship section (contains edge lines) |
| `distance_N` | N | Explicit distance for N > 2 |

Group headers eliminate per-node distance fields. One header replaces N repeated fields.

## 6a. Tabular Encoding (Generic Profile)

The graph profile (Sections 4-6) encodes symbol/edge payloads. The tabular profile extends GCF's grammar to encode arbitrary structured data: arrays of objects, nested records, and mixed types.

### Tabular array header

```
## {name} [{count}]{{field1},{field2},{field3}}
```

The header declares the section name, record count, and field names. Subsequent lines contain positional values only, separated by pipe (`|`).

### Example: flat tabular

```
## employees [3]{id,name,department,salary}
1|Alice Smith|Engineering|95000
2|Bob Jones|Sales|72000
3|Carol Wu|Marketing|85000
```

One header replaces 3 x 4 = 12 field name repetitions. Pipe separator with no spaces for maximum density.

### Example: with nested fields

When records contain nested objects, rows use `@{id}` prefixes for cross-referencing:

```
## orders [2]{id,total,status}
@0 1001|249.99|shipped
  .customer
    name=Alice Smith
    tier=premium
@1 1002|89.50|pending
  .customer
    name=Bob Jones
    tier=standard
```

Primitive fields go in the tabular row. Nested fields are indented below with `.fieldname` prefix.

### Object encoding

Non-array objects use `key=value` for primitives and `## key` section headers for nested objects:

```
config=production
version=2.1.0
## database
  host=db.example.com
  port=5432
  pool_size=10
## cache
  ttl=3600
  max_size=1000
```

### Encoding rules

| Input type | Encoding |
|-----------|----------|
| Array of uniform objects | Tabular: header with field declaration + positional rows |
| Array of non-uniform items | `## name [count]` + `@{id}` per item |
| Nested object | `## key` section header + indented key=value pairs |
| Primitive field | `key=value` (no quotes for numbers/booleans) |
| Null/missing | `-` |
| Empty array | `## name [0]` |

### Uniformity detection

An array is considered uniform (eligible for tabular encoding) if the first 5 elements are objects with at least 70% key overlap with the first element. This accommodates semi-uniform data where some records have optional fields.

### Relationship to graph profile

The graph profile (Sections 4-6) is a specialized application of the tabular profile for code graph data. The `@{id} {kind} {qname} {score} {provenance}` node line format is a tabular row with implicit field names. The tabular profile generalizes this to arbitrary field sets.

Both profiles use the same grammar primitives: `##` headers, `@` IDs, positional fields. Implementations may support one or both profiles.

## 7. Session Statefulness

When the header contains `session=true`, previously-transmitted symbols can be referenced without retransmission:

```
GCF tool=context_for_files tokens=800 symbols=5 session=true
## targets
@0  # previously transmitted
@7 fn github.com/org/repo/pkg.NewHandler 0.62 lsp_resolved
## edges
@0<@7 calls
```

A bare `@{id}` followed by `# previously transmitted` is a reference to a symbol sent in a prior response within the same session. The consumer (LLM) has this symbol in its context window from the earlier response.

Session statefulness exploits a property unique to LLM tool interactions: the consumer maintains conversational state across calls.

## 8. Delta Encoding Extension

When the consumer sends a `pack_root` from a prior response and the current result differs, the server may return a delta payload containing only what changed:

```
GCF tool=context_for_task delta=true base_root=aaa111 new_root=bbb222 tokens=30 savings=81%
## removed
fn github.com/org/repo/pkg.OldHandler
## added
@0 fn github.com/org/repo/pkg.NewHandler 0.85 rwr
## edges_removed
github.com/org/repo/pkg.Router -> github.com/org/repo/pkg.OldHandler calls
## edges_added
github.com/org/repo/pkg.Router -> github.com/org/repo/pkg.NewHandler calls
```

### Delta sections

| Section | Content |
|---------|---------|
| `## removed` | Symbols in the prior pack but not in the current. Short references (kind + qname). |
| `## added` | Symbols in the current pack but not in the prior. Full node lines with IDs. |
| `## edges_removed` | Edges in the prior pack but not in the current. `source -> target type` format. |
| `## edges_added` | Edges in the current pack but not in the prior. `source -> target type` format. |

A server should only use delta encoding when it saves significantly over full retransmission. A threshold of 60% (delta must be less than 60% of full size) is recommended.

### Three-outcome protocol

When a consumer sends `pack_root`:
1. **Same root**: return `unchanged pack_root=<hash> symbols=N` (zero retransmission)
2. **Different root, prior known**: return delta payload
3. **Different root, prior unknown**: return full payload (fallback)

## 9. Comments

Lines starting with `#` (single hash, space) are comments and must be ignored by parsers.

```
# This is a comment
@0 fn github.com/org/repo/pkg.Func 0.78 lsp_resolved
```

## 10. Token Savings Analysis

### Graph profile

| Source | JSON cost | GCF cost | Savings |
|--------|-----------|----------|---------|
| Field names | ~18 tokens/symbol | 0 (positional) | ~18/symbol |
| Edge references | ~30 tokens/edge | ~2 tokens/edge (local IDs) | ~28/edge |
| Structural delimiters | ~6 tokens/symbol | 0 | ~6/symbol |
| Distance fields | ~3 tokens/symbol | 0 (implicit in group) | ~3/symbol |
| Kind strings | ~2 tokens/symbol | ~1 token (abbreviated) | ~1/symbol |

Combined: 84% median token savings across 6 benchmark payloads (8 to 30 symbols).

### Tabular profile

| Source | JSON cost | GCF cost | Savings |
|--------|-----------|----------|---------|
| Field names | repeated per record | declared once in header | ~(N-1) x fields per array |
| Structural delimiters | `{`, `}`, `:`, `,`, `"` per record | `\|` between values | ~6 tokens/record |
| Array framing | `[`, `]`, commas | `[count]` in header | fixed |
| Nesting | braces + indentation + field names | `.fieldname` + `key=value` | ~50% per nested object |

On TOON's own benchmark datasets: 34% fewer tokens on mixed-structure data, 44% fewer on semi-uniform event logs, 3% fewer on flat tabular data. See [benchmarks](https://blackwell-systems.github.io/gcf/guide/benchmarks.html).

## 11. Design Constraints

- **Text-only.** GCF is plain text. No binary framing, no special characters beyond `@`, `<`, `#`, `##`, `|`, `.`, and `=`.
- **Line-oriented.** Each semantic unit (header, node, edge, group, tabular row, key-value pair, comment) occupies exactly one line.
- **Shallow nesting.** The graph profile is flat. The tabular profile supports indented nested fields (`.fieldname`) for records with sub-objects, but nesting depth is typically 1-2 levels.
- **Deterministic.** Same input produces same output. No randomness, no ordering ambiguity (symbols ordered by score descending, edges ordered by source then target).
- **Human-readable.** The format can be read and understood by a human without tooling.
- **LLM-parseable.** The format can be parsed by an LLM without special instructions. Validated: 100% accuracy on structured extraction tasks.

## 12. MIME Type

Suggested: `application/vnd.gcf+text`

## 13. Versioning

The format version is implicit in the header prefix `GCF`. Future versions would use `GCF2`, `GCF3`, etc. Parsers encountering an unknown version prefix should reject the payload with an error rather than attempting best-effort parsing.
