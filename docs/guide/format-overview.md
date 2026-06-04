# Format Overview

GCF is a line-oriented, text-based format. Each line is one semantic unit: a header, a symbol declaration, an edge reference, a group marker, or a comment.

## Structure at a glance

```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=10 pack_root=a1b2c3
## targets
@0 fn pkg.AuthMiddleware 0.78 lsp_resolved
@1 type pkg.AuthConfig 0.71 ast_inferred
## related
@2 fn pkg.NewServer 0.54 lsp_resolved
@3 method pkg.Server.Start 0.48 lsp_resolved
## edges
@0<@2 calls
@1<@0 references
```

Five elements. That's all there is.

## 1. Header

The first line identifies the format and carries payload metadata:

```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=10 pack_root=a1b2c3d4
```

| Field | Required | Description |
|-------|----------|-------------|
| `tool` | Yes | Name of the producing tool |
| `budget` | No | Token budget requested by consumer |
| `tokens` | No | Actual tokens used in this payload |
| `symbols` | No | Number of symbols (informational) |
| `pack_root` | No | Content-addressed identity (hex hash). Enables delta encoding. |
| `session` | No | `true` if session statefulness is active |
| `delta` | No | `true` if this is a delta payload |

Fields are `key=value` pairs separated by spaces. Order doesn't matter.

## 2. Symbol lines (nodes)

```
@{id} {kind} {qualified_name} {score} {provenance}
```

Fields are positional. No field names, no delimiters, no quoting.

```
@0 fn github.com/org/repo/pkg.AuthMiddleware 0.78 lsp_resolved
@1 type github.com/org/repo/pkg.Config 0.65 ast_inferred
@2 method github.com/org/repo/pkg.Server.Start 0.54 lsp_resolved
```

| Position | Field | Description |
|----------|-------|-------------|
| 1 | `@id` | Zero-based integer, unique within this payload |
| 2 | `kind` | Abbreviated node type (see [Kind Abbreviations](#kind-abbreviations)) |
| 3 | `qualified_name` | Full identifier (no whitespace) |
| 4 | `score` | Relevance score, 2 decimal places |
| 5 | `provenance` | Discovery method |

**Why this saves tokens:** JSON repeats `"qualified_name":`, `"kind":`, `"score":`, `"provenance":`, `"distance":` on every single record. GCF declares the structure once (positionally) and never repeats it.

## 3. Edge lines (relationships)

```
@{target}<@{source} {edge_type}
```

The `<` arrow points toward the target. Read it as "source flows into target."

```
@0<@2 calls        # @2 (NewServer) calls @0 (AuthMiddleware)
@1<@0 references   # @0 (AuthMiddleware) references @1 (Config)
@3<@2 calls        # @2 (NewServer) calls @3 (Server.Start)
```

**Why this saves tokens:** JSON edges look like `{"source": "github.com/org/repo/pkg.NewServer", "target": "github.com/org/repo/pkg.AuthMiddleware", "edge_type": "calls"}`. That's ~100 tokens per edge. GCF edges are ~4 tokens each.

Optional status field for diff payloads:
```
@0<@2 calls added     # new edge
@1<@3 imports removed # deleted edge
```

## 4. Group headers (sections)

```
## targets
## related
## extended
## edges
## distance_N
```

Groups partition the payload into semantic sections. The group a symbol appears in encodes its distance from the query center:

| Group | Distance | Meaning |
|-------|----------|---------|
| `## targets` | 0 | Direct matches |
| `## related` | 1 | One hop from targets |
| `## extended` | 2 | Broader context |
| `## distance_N` | N | Explicit distance for N > 2 |
| `## edges` | n/a | Relationship section |

**Why this saves tokens:** Instead of a `"distance": 0` field on every record, one header replaces N fields.

## 5. Comments

```
# This is a comment (ignored by parsers)
```

Lines starting with `# ` (hash, space) are comments.

## Kind abbreviations

GCF abbreviates common node types:

| Abbreviation | Full form |
|-------------|-----------|
| `fn` | function |
| `type` | type |
| `method` | method |
| `iface` | interface |
| `var` | var |
| `const` | const |
| `class` | class |
| `field` | field |
| `route` | route_handler |
| `ext` | external |
| `file` | file |
| `pkg` | package |
| `svc` | service |
| `table` | table |
| `resource` | resource |
| `selector` | selector |

Unknown kinds are passed through verbatim (no error).

## Comparison: the same data in JSON

```json
{
  "tool": "context_for_task",
  "tokens_used": 1847,
  "token_budget": 5000,
  "symbols": [
    {
      "qualified_name": "github.com/org/repo/pkg.AuthMiddleware",
      "kind": "function",
      "score": 0.78,
      "provenance": "lsp_resolved",
      "distance": 0
    },
    {
      "qualified_name": "github.com/org/repo/pkg.NewServer",
      "kind": "function",
      "score": 0.54,
      "provenance": "lsp_resolved",
      "distance": 1
    }
  ],
  "edges": [
    {
      "source": "github.com/org/repo/pkg.NewServer",
      "target": "github.com/org/repo/pkg.AuthMiddleware",
      "edge_type": "calls"
    }
  ]
}
```

vs GCF:

```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=2
## targets
@0 fn github.com/org/repo/pkg.AuthMiddleware 0.78 lsp_resolved
## related
@1 fn github.com/org/repo/pkg.NewServer 0.54 lsp_resolved
## edges
@0<@1 calls
```

965 tokens vs 233 tokens. Same information.

## Tabular encoding (generic profile)

The elements above (Sections 1-5) form the **graph profile** for code graph payloads. GCF also supports a **tabular profile** for encoding arbitrary structured data:

```
## employees [3]{id,name,department,salary}
1|Alice Smith|Engineering|95000
2|Bob Jones|Sales|72000
3|Carol Wu|Marketing|85000
```

One header declares field names. Rows are positional values separated by pipes. No field names repeated per record. This is the same principle as the graph profile (positional fields eliminate per-record overhead), generalized to any data shape.

For nested objects: `key=value` pairs and `## section` headers. For records with sub-objects: `@N` prefixes on rows with `.fieldname` inline nested blocks.

See the [Specification (Section 6a)](/reference/spec) and [Syntax Cheatsheet](/reference/cheatsheet) for full details.

## Design constraints

- **Text-only.** No binary framing.
- **Line-oriented.** One semantic unit per line.
- **Shallow nesting.** The graph profile is flat. The tabular profile supports indented nested fields for records with sub-objects.
- **Deterministic.** Same input produces same output.
- **Human-readable.** No tooling required to understand it.
- **LLM-parseable.** Validated at 100% accuracy on structured extraction tasks.
