# Format Overview

GCF is a line-oriented, text-based format with two encoding profiles:

- **Graph profile** (`encode`): code graph payloads with symbols, edges, and distance groups
- **Tabular profile** (`encodeGeneric`): any structured data with arrays, nested objects, and primitives

Both profiles share the same primitives: `##` section headers, `@` local IDs, positional fields.

## Graph profile at a glance

```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=10 edges=2 pack_root=a1b2c3
## targets
@0 fn pkg.AuthMiddleware 0.78 lsp_resolved
@1 type pkg.AuthConfig 0.71 ast_inferred
## related
@2 fn pkg.NewServer 0.54 lsp_resolved
@3 method pkg.Server.Start 0.48 lsp_resolved
## edges [2]
@0<@2 calls
@1<@0 references
```

Five elements in the graph profile. Four more in the tabular profile (see [below](#tabular-encoding-generic-profile)).

## 1. Header

The first line identifies the format and carries payload metadata:

```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=10 edges=8 pack_root=a1b2c3d4
```

| Field | Required | Description |
|-------|----------|-------------|
| `tool` | Yes | Name of the producing tool |
| `budget` | No | Token budget requested by consumer |
| `tokens` | No | Actual tokens used in this payload |
| `symbols` | No | Number of symbols (informational) |
| `edges` | No | Number of edges (informational) |
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
## edges [N]
## distance_N
```

Groups partition the payload into semantic sections. The group a symbol appears in encodes its distance from the query center:

| Group | Distance | Meaning |
|-------|----------|---------|
| `## targets` | 0 | Direct matches |
| `## related` | 1 | One hop from targets |
| `## extended` | 2 | Broader context |
| `## distance_N` | N | Explicit distance for N > 2 |
| `## edges [N]` | n/a | Relationship section; `N` is the edge count |

**Why this saves tokens:** Instead of a `"distance": 0` field on every record, one header replaces N fields. The `[N]` on the edges header gives an explicit count so the model doesn't have to scan and count.

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
GCF tool=context_for_task budget=5000 tokens=1847 symbols=2 edges=1
## targets
@0 fn github.com/org/repo/pkg.AuthMiddleware 0.78 lsp_resolved
## related
@1 fn github.com/org/repo/pkg.NewServer 0.54 lsp_resolved
## edges [1]
@0<@1 calls
```

965 tokens vs 233 tokens. Same information.

## Tabular encoding (generic profile)

The elements above (Sections 1-5) form the **graph profile** for code graph payloads. GCF also supports a **tabular profile** for encoding arbitrary structured data. This is what `encodeGeneric` / `EncodeGeneric` / `encode_generic` produces.

Four elements:

### 6. Tabular arrays

```
## {name} [{count}]{{field1},{field2},{field3}}
value1|value2|value3
```

The header declares the section name, record count, and field names in one line. Rows contain only values, separated by pipe (`|`). No field names repeated per record.

```
## employees [3]{id,name,department,salary}
1|Alice Smith|Engineering|95000
2|Bob Jones|Sales|72000
3|Carol Wu|Marketing|85000
```

**Why this saves tokens:** JSON repeats `"id":`, `"name":`, `"department":`, `"salary":` on every record. That's 3 x 4 = 12 field name repetitions for 3 records. GCF declares them once. The savings scale linearly: 1,000 records = 999 avoided repetitions per field.

Pipe separator with no spaces maximizes density. Each row is a single line of values in field-declaration order.

### 7. Key-value pairs (object fields)

```
key=value
```

Primitive fields use `key=value` with no quoting for numbers and booleans:

```
config=production
version=2.1.0
port=5432
active=true
max_retries=3
```

**Why this saves tokens:** JSON wraps every key in quotes, adds a colon and space, and wraps string values in quotes: `"config": "production"`. GCF: `config=production`. Half the characters.

### 8. Section headers (nested objects)

```
## key
```

Nested objects use `## key` section headers with indented key-value pairs:

```
## database
  host=db.example.com
  port=5432
  pool_size=10
## cache
  ttl=3600
  max_size=1000
## logging
  level=info
  format=json
```

**Why this saves tokens:** JSON uses `"database": { ... }` with braces, quotes on every key, and structural delimiters. GCF uses one header line per section and flat key-value pairs inside.

Sections can nest:

```
## server
  host=0.0.0.0
  port=8080
  ## tls
    cert=/etc/ssl/cert.pem
    key=/etc/ssl/key.pem
```

### 9. Nested fields in tabular rows

When records contain both primitive fields and nested objects, rows use `@{id}` prefixes and `.fieldname` for inline nested data:

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

- `@{id}` prefix appears only when the row has nested fields (flat rows have no prefix)
- `.fieldname` introduces an inline nested object
- Nested fields are indented and use `key=value` pairs

**Why this saves tokens:** JSON repeats the entire `"customer": {"name": "...", "tier": "..."}` structure on every record. GCF's primitive fields go in the tabular row (positional), and only the nested portion is expanded.

### Value formatting

| Type | Format | Example |
|------|--------|---------|
| String | bare text | `Alice Smith` |
| Number | unquoted | `95000`, `3.14` |
| Boolean | lowercase | `true` / `false` |
| Null | dash | `-` |
| Empty string | quoted | `""` |
| String with `\|` or newline | quoted | `"value\|pipes"` |

### Comparison: the same data in JSON

```json
{
  "employees": [
    {"id": 1, "name": "Alice Smith", "department": "Engineering", "salary": 95000},
    {"id": 2, "name": "Bob Jones", "department": "Sales", "salary": 72000},
    {"id": 3, "name": "Carol Wu", "department": "Marketing", "salary": 85000}
  ]
}
```

vs GCF:

```
## employees [3]{id,name,department,salary}
1|Alice Smith|Engineering|95000
2|Bob Jones|Sales|72000
3|Carol Wu|Marketing|85000
```

292 bytes vs 122 bytes. Same information. 58% smaller. On TOON's own benchmark with 2,000 employee records, GCF is 2% smaller than TOON and 61% smaller than JSON.

## Design constraints

- **Text-only.** No binary framing.
- **Line-oriented.** One semantic unit per line.
- **Shallow nesting.** The graph profile is flat. The tabular profile supports indented nested fields for records with sub-objects.
- **Deterministic.** Same input produces same output.
- **Human-readable.** No tooling required to understand it.
- **LLM-parseable.** Validated at 100% accuracy on structured extraction tasks.
