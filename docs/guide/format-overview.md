# Format Overview

GCF is a line-oriented, text-based format with two encoding profiles:

- **Generic profile** (`encodeGeneric`): any structured data with arrays, nested objects, and primitives. This is what most users need.
- **Graph profile** (`encode`): a superset of the generic profile that adds local IDs, typed edges, and distance groups. For any relationship-heavy data: code intelligence, knowledge graphs, ontologies, agent memory.

Both profiles share the same grammar primitives: `##` section headers and positional fields. The graph profile adds `@` local IDs and edge notation.

One zero-dep library handles both. It encodes any structured shape with no schema, losslessly (verified across 43 billion+ round-trips), at a fraction of the tokens, and the model reads the output directly with no decode step. No other single format is all four at once: JSON is schema-free but verbose, protobuf is compact but needs a schema, MessagePack is binary, and TOON is lossy, degrades on nested data, and its tab delimiter merges with content across tokenizers (see [GCF vs TOON](/guide/vs-toon)).

## Generic profile at a glance

```
GCF profile=generic
## employees [3]{id,name,department,salary}
1|Alice Smith|Engineering|95000
2|Bob Jones|Sales|72000
3|Carol Wu|Marketing|85000
```

One header declares field names. Rows are positional values. No field names repeated per record. Works on any structured data.

Five elements in the generic profile. Five more in the [graph profile](#graph-profile) below.

## 1. Tabular arrays

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

Pipe separator with no spaces maximizes density. The pipe was reverse-engineered from tokenizer analysis: it has a 0.47% BPE merge rate across 43 tokenizers, so the structural boundary stays a distinct token on every model (JSON's quote merges at 8.17%). Each row is a single line of values in field-declaration order.

## 2. Key-value pairs (object fields)

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

## 3. Section headers (nested objects)

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

## 4. Nested fields in tabular rows

When records contain both primitive fields and nested objects, rows use `@{id}` prefixes with `^` cell markers. Nested objects with 3+ scalar fields use inline schema encoding (`^{fields}`) for maximum density:

```
## orders [2]{id,total,status,customer}
@0 1001|249.99|shipped|^{name,email,tier}
Alice Smith|alice@example.com|premium
@1 1002|89.50|pending|^
Bob Jones|bob@example.com|standard
```

- `@{id}` prefix appears only when the row has nested fields (flat rows have no prefix)
- `^{fields}` on the first row declares inline schema; subsequent rows use bare `^`
- Inline attachment data follows on the next line (positional, no field prefix)
- For objects with fewer than 3 fields or nested sub-objects, traditional `.field {}` syntax is used:

```
## orders [1]{id,metadata}
@0 1001|^
.metadata {}
    source=api
    version=2
```

**Why this saves tokens:** JSON repeats the entire `"customer": {"name": "...", "email": "...", "tier": "..."}` structure on every record. GCF's inline schema declares fields once and encodes values positionally. At 500 orders, this produces 32% fewer tokens than TOON and 57% fewer than JSON.

## 5. Primitive arrays (inline)

```
{name}[{count}]: val1,val2,val3
```

Arrays where every element is a primitive (string, number, boolean) are encoded on a single line:

```
tags[3]: production,us-east-1,critical
ports[3]: 8080,8443,9090
scopes[2]: read,write
```

**Why this saves tokens:** JSON encodes `"tags": ["production", "us-east-1", "critical"]` with brackets, quotes on each string, and commas. GCF: one line, no quotes, no brackets.

### Value formatting

| Type | Format | Example |
|------|--------|---------|
| String | bare text | `Alice Smith` |
| Number | unquoted | `95000`, `3.14`, `1.5e-8` |
| Boolean | lowercase | `true` / `false` |
| Null | dash | `-` |
| Absent (tabular only) | tilde | `~` |
| Attachment (tabular only) | caret | `^` |
| Empty string | quoted | `""` |
| String with `\|` or newline | quoted | `"value\|pipes"` |
| String with `,` in comma context | quoted | `"a,b"` (inline arrays only) |

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
GCF profile=generic
## employees [3]{id,name,department,salary}
1|Alice Smith|Engineering|95000
2|Bob Jones|Sales|72000
3|Carol Wu|Marketing|85000
```

292 bytes vs 122 bytes. Same information. 58% smaller. Across [16 real-world datasets](/guide/benchmarks#token-efficiency-16-datasets), GCF is 29% smaller than TOON and 56% smaller than JSON overall. The [tokenizer analysis](/guide/tokenizer-analysis) explains why these savings are consistent across all major tokenizers and why JSON's structural overhead compounds at scale.

---

## Graph profile

The generic profile (above) handles any structured data. The graph profile is a superset that adds typed symbols, directed edges, and distance-based grouping for relationship-heavy data: code intelligence, knowledge graphs, ontologies, Neo4j/Memgraph query results, agent memory. This is what `encode` / `Encode` produces.

### Graph profile at a glance

```
GCF profile=graph tool=context_for_task budget=5000 tokens=1847 symbols=4 edges=2 pack_root=sha256:a1b2c3...
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

Five additional elements beyond the generic profile:

## 6. Header (graph profile)

The first line identifies the format and carries payload metadata:

```
GCF profile=graph tool=context_for_task budget=5000 tokens=1847 symbols=10 edges=8 pack_root=sha256:a1b2c3d4...
```

| Field | Required | Description |
|-------|----------|-------------|
| `tool` | No | Name of the producing tool (SHOULD be present when available) |
| `budget` | No | Token budget requested by consumer |
| `tokens` | No | Actual tokens used in this payload |
| `symbols` | No | Number of symbols (informational) |
| `edges` | No | Number of edges (informational) |
| `pack_root` | No | Content-addressed identity (hex hash). Enables delta encoding. |
| `session` | No | `true` if session statefulness is active |
| `delta` | No | `true` if this is a delta payload |

Fields are `key=value` pairs separated by spaces. Order doesn't matter.

## 7. Symbol lines (nodes)

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

## 8. Edge lines (relationships)

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

## 9. Distance groups

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

## 10. Comments

```
# This is a comment (ignored by parsers)
```

Lines starting with `# ` (hash, space) are comments.

### Kind abbreviations

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

### Comparison: the same graph data in JSON

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
GCF profile=graph tool=context_for_task budget=5000 tokens=1847 symbols=2 edges=1
## targets
@0 fn github.com/org/repo/pkg.AuthMiddleware 0.78 lsp_resolved
## related
@1 fn github.com/org/repo/pkg.NewServer 0.54 lsp_resolved
## edges [1]
@0<@1 calls
```

191 tokens vs 81 tokens. Same information.

### Relationship to generic profile

The graph profile is a superset of the generic profile. The `@{id} {kind} {qname} {score} {provenance}` node line format is a tabular row with implicit field names. The generic profile generalizes this to arbitrary field sets. Both profiles share the same grammar; the graph profile adds identity (`@` IDs), relationships (edges), and bare-reference session dedup.

Delta encoding, streaming, and content-addressed identity (`pack_root`) are **not** graph-only: the generic profile has them too (see [Delta](/guide/delta) and [Streaming](/guide/streaming)). What stays graph-exclusive is local IDs, typed edges, distance groups, and bare-reference session dedup.

Both profiles use the same grammar primitives: `##` headers, `@` IDs, positional fields. Implementations may support one or both profiles.

---

## Design constraints

- **Text-only.** No binary framing.
- **Line-oriented.** One semantic unit per line.
- **Shallow nesting.** The graph profile is flat. The generic profile supports indented nested fields for records with sub-objects.
- **Deterministic.** Same input produces same output.
- **LLM-parseable.** 100% comprehension on standard workloads (every frontier model). 91.2% on structurally complex code graphs (vs TOON 68.8%, JSON 54.1%). No model has been trained on GCF.
- **Tokenizer-aware.** The grammar was reverse-engineered from attention-level research, not from human or machine convention. Delimiters were selected for near-zero BPE merge rates (pipe: 0.47% across 43 tokenizers) so structural boundaries stay explicit to the model, a design validated by three companion papers on tokenizer-attention coupling. See the [tokenizer analysis](/guide/tokenizer-analysis).
