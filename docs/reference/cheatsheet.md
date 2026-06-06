# Syntax Cheatsheet

GCF has two encoding profiles that share the same grammar primitives (`##`, `@`, `|`, `=`).

::: tip Two profiles, one format
**Generic profile** (`encodeGeneric`): any structured data with arrays, nested objects, and primitives. Drop-in JSON replacement. This is what most users need.

**Graph profile** (`encode`): code graph payloads with symbols, edges, and distance groups. Specialized for code intelligence tools.
:::

---

## Graph Profile

### Header

```
GCF tool=<name> budget=<int> tokens=<int> symbols=<int> edges=<int> pack_root=<hex>
```

Only `tool` is required. All other fields are optional.

```
GCF tool=context_for_task
GCF tool=context_for_task budget=5000 tokens=1847 symbols=10 edges=8
GCF tool=context_for_task budget=5000 tokens=1847 symbols=10 edges=8 pack_root=a1b2c3d4
GCF tool=context_for_task tokens=800 symbols=5 edges=3 session=true
GCF tool=context_for_task delta=true base_root=aaa111 new_root=bbb222 tokens=30 savings=81%
```

### Symbol lines

```
@{id} {kind} {qualified_name} {score} {provenance}
```

```
@0 fn github.com/org/repo/pkg.AuthMiddleware 0.78 lsp_resolved
@1 type github.com/org/repo/pkg.Config 0.65 ast_inferred
@2 method github.com/org/repo/pkg.Server.Start 0.54 lsp_resolved
@3 iface github.com/org/repo/pkg.Handler 0.48 structural
@4 var github.com/org/repo/pkg.DefaultTimeout 0.32 ast_inferred
```

- `id`: zero-based integer, sequential
- `kind`: abbreviated (see table below)
- `qualified_name`: no whitespace allowed
- `score`: 2 decimal places (e.g., `0.78`)
- `provenance`: no whitespace allowed

### Edge lines

```
@{target}<@{source} {edge_type} [{status}]
```

```
@0<@2 calls              # @2 calls @0
@1<@0 references         # @0 references @1
@3<@2 implements         # @2 implements @3
@0<@4 calls added        # new edge (diff payload)
@1<@3 imports removed    # deleted edge (diff payload)
```

- `<` arrow points toward target
- Status is optional: `added` or `removed` (omit for normal payloads)

### Distance groups

```
## targets       # distance 0 (direct matches)
## related       # distance 1 (one hop)
## extended      # distance 2 (broader context)
## distance_5    # explicit distance N
## edges [N]     # relationship section (N = edge count)
```

### Kind abbreviations

| Short | Full | Short | Full |
|-------|------|-------|------|
| `fn` | function | `table` | table |
| `type` | type | `resource` | resource |
| `method` | method | `class` | class |
| `iface` | interface | `selector` | selector |
| `var` | var | `field` | field |
| `const` | const | `route` | route_handler |
| `file` | file | `ext` | external |
| `pkg` | package | `svc` | service |

Unknown kinds pass through verbatim.

### Session bare references

```
@7  # previously transmitted
```

Two spaces before `#`. Used when `session=true` in header.

### Delta payload

```
GCF tool=context_for_task delta=true base_root=aaa new_root=bbb tokens=30 savings=85%
## removed
fn pkg.OldFunc
method pkg.Server.Deprecated
## added
@0 fn pkg.NewFunc 0.85 rwr
@1 type pkg.NewConfig 0.72 ast_inferred
## edges_removed
pkg.Router -> pkg.OldFunc calls
## edges_added
pkg.Router -> pkg.NewFunc calls
```

- `## removed`: kind + qname only (consumer has full declaration from prior response)
- `## added`: full symbol lines with sequential IDs from 0
- `## edges_removed` / `## edges_added`: `source -> target type` format

### Complete graph example

```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=5 edges=4 pack_root=a1b2c3d4
## targets
@0 fn github.com/org/repo/internal/auth.Middleware 0.78 lsp_resolved
@1 type github.com/org/repo/internal/auth.Config 0.71 ast_inferred
## related
@2 fn github.com/org/repo/internal/server.New 0.54 lsp_resolved
@3 method github.com/org/repo/internal/server.Server.Start 0.48 lsp_resolved
## extended
@4 iface github.com/org/repo/internal/handler.Handler 0.32 structural
## edges [4]
@0<@2 calls
@1<@0 references
@4<@2 implements
@3<@2 calls
```

---

## Generic Profile

### Tabular arrays

```
## {name} [{count}]{{field1},{field2},{field3}}
value1|value2|value3
```

```
## employees [3]{id,name,department,salary}
1|Alice Smith|Engineering|95000
2|Bob Jones|Sales|72000
3|Carol Wu|Marketing|85000
```

- One header declares field names; rows are positional values only
- Pipe `|` separator, no spaces
- No `@id` on flat rows (only when nested fields need cross-referencing)

### Tabular with nested fields

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

- `@{id}` prefix when rows have nested sub-objects
- `.fieldname` introduces an inline nested object
- Nested fields use `key=value` pairs, indented

### Primitive arrays (inline)

```
{name}[{count}]: val1,val2,val3
```

```
tags[3]: production,us-east-1,critical
ports[3]: 8080,8443,9090
scopes[2]: read,write
```

- All-primitive arrays (strings, numbers, booleans) encode on one line
- Comma-separated, no spaces
- Empty arrays use `## name [0]` instead

### Object encoding

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

- Primitives: `key=value` (no quotes for numbers/booleans)
- Nested objects: `## key` section header + indented key=value
- Null/missing: `-`

### Value formatting

| Type | Format | Example |
|------|--------|---------|
| String | bare text | `Alice Smith` |
| Number | unquoted | `95000` |
| Boolean | lowercase | `true` / `false` |
| Null | dash | `-` |
| String with `\|` or newline | quoted | `"value\|with\|pipes"` |

### Complete tabular example

```
name=Acme Corp
region=us-east-1
## employees [3]{id,name,department,salary,active}
1|Alice Smith|Engineering|95000|true
2|Bob Jones|Sales|72000|true
3|Carol Wu|Marketing|85000|false
## projects [2]{id,title,lead}
@0 101|Auth Rewrite|Alice Smith
  .tags
    priority=high
    deadline=2026-Q3
@1 102|Dashboard|Bob Jones
  .tags
    priority=medium
    deadline=2026-Q4
```

---

## Streaming Mode

### Deferred counts

```
## edges [?]                    # count unknown at emit time
## employees [?]{id,name,salary}  # tabular with deferred count
```

Use `[?]` instead of `[N]` when encoding incrementally.

### Trailer summary

```
## _summary symbols=4 edges=3 sections=targets:2,related:1,edges:3
```

Emitted after all data. Provides counts deferred from headers.

### Streaming example

```
GCF tool=context_for_task budget=5000
## targets
@0 fn pkg.Auth 0.95 lsp
@1 fn pkg.Handler 0.88 lsp
## related
@2 type pkg.Config 0.72 ast
## edges [?]
@0<@1 calls
@2<@0 references
## _summary symbols=3 edges=2 sections=targets:2,related:1,edges:2
```

Standard `decode()` handles streaming output with no changes.

---

## Shared

### Comments

```
# This is a comment (ignored by parsers)
```

Must start with `# ` (hash + space). Group headers (`##`) are NOT comments.
