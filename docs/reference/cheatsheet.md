# Syntax Cheatsheet

GCF has two encoding profiles that share the same grammar primitives (`##`, `|`, `=`). The graph profile adds `@` local IDs and edge notation.

::: tip Two profiles, one format
**Generic profile** (`encodeGeneric`): any structured data with arrays, nested objects, and primitives. This is what most users need.

**Graph profile** (`encode`): superset that adds local IDs, typed edges, and distance groups for relationship-heavy data (code intelligence, knowledge graphs, ontologies, agent memory).
:::

---

## Graph Profile

### Header

```
GCF profile=graph tool=<name> budget=<int> tokens=<int> symbols=<int> edges=<int> pack_root=sha256:<hex>
```

`profile` is required; every field after it is optional. `tool` SHOULD be present for MCP tool responses.

```
GCF profile=graph tool=context_for_task
GCF profile=graph tool=context_for_task budget=5000 tokens=1847 symbols=10 edges=8
GCF profile=graph tool=context_for_task budget=5000 tokens=1847 symbols=10 edges=8 pack_root=sha256:a1b2c3d4...
GCF profile=graph tool=context_for_task tokens=800 symbols=5 edges=3 session=true
GCF profile=graph tool=context_for_task delta=true base_root=sha256:aaa111... new_root=sha256:bbb222... tokens=30 savings=81%
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
GCF profile=graph tool=context_for_task delta=true base_root=sha256:aaa... new_root=sha256:bbb... tokens=30 savings=85%
## removed
fn pkg.OldFunc
method pkg.Server.Deprecated
## added
@0 fn pkg.NewFunc 0.85 rwr 0
@1 type pkg.NewConfig 0.72 ast_inferred 1
## edges_removed
pkg.Router -> pkg.OldFunc calls
## edges_added
pkg.Router -> pkg.NewFunc calls
```

- `## removed`: kind + qname only (consumer has full declaration from prior response)
- `## added`: full symbol lines with sequential IDs from 0, each carrying a trailing distance
- `## edges_removed` / `## edges_added`: `source -> target type` format

### Complete graph example

```
GCF profile=graph tool=context_for_task budget=5000 tokens=1847 symbols=5 edges=4 pack_root=sha256:a1b2c3d4...
## targets
@0 fn github.com/org/repo/internal/auth.Middleware 0.78 lsp_resolved
@1 type github.com/org/repo/internal/auth.Config 0.71 ast_inferred
## related
@2 fn github.com/org/repo/internal/server.New 0.54 lsp_resolved
@3 method github.com/org/repo/internal/server.Server.Start 0.48 lsp_resolved
## extended
@4 iface github.com/org/repo/internal/handler.Handler 0.32 structural
## edges [4]
@1<@0 references
@0<@2 calls
@3<@2 calls
@4<@2 implements
```

---

## Generic Profile

### Header

```
GCF profile=generic
```

Every generic payload starts with this line. Optional fields may follow: `tool`, `tokens`, and the delta fields `pack_root`, `key`, `delta`, `base_root`, `new_root`, `unchanged`, `count`, `savings` (see Delta encoding below).

### Root values

```
GCF profile=generic
=42                    # root scalar
```

```
GCF profile=generic
=-                     # root null
```

```
GCF profile=generic
## [3]: a,b,c          # root primitive array
```

### Tabular arrays

```
## {name} [{count}]{{field1},{field2},{field3}}
value1|value2|value3
```

```
GCF profile=generic
## employees [3]{id,name,department,salary}
1|Alice Smith|Engineering|95000
2|Bob Jones|Sales|72000
3|Carol Wu|Marketing|85000
```

- One header declares field names; rows are positional values only
- Pipe `|` separator, no spaces
- No `@id` on flat rows (only when nested fields need cross-referencing)

### Tabular with nested fields (flattened, v3.2)

When nested objects have the same keys in every row and all values are scalars, they are flattened into `>` path columns:

```
## orders [2]{id,"customer>name","customer>email",items,total}
@0 ORD-1|Alice|alice@co.com|^|59.98
.items [1]{sku}
    A1
@1 ORD-2|Bob|bob@co.com|^|29.99
.items [2]
    B2
    B3
```

- `"customer>name"` means the `name` field inside the `customer` object
- Multiple levels chain: `"billing>address>city"`
- Variable-length arrays still use `^` attachment (items above)
- If nested object is absent, all leaf columns get `~`
- If nested object is null, all leaf columns get `-`
- 20-48% fewer tokens than inline schema on deeply nested data

### Tabular with nested fields (inline schema)

When nested objects have 3+ scalar fields and can't be flattened (e.g., different keys across rows), they use inline schema encoding:

```
## orders [2]{id,total,status,customer}
@0 1001|249.99|shipped|^{name,email,tier}
Alice Smith|alice@example.com|premium
@1 1002|89.50|pending|^
Bob Jones|bob@example.com|standard
```

- `@{id}` prefix when rows have nested sub-objects
- `^{fields}` on first row declares inline schema; subsequent rows use bare `^`
- Attachment data follows on next line (positional, pipe-separated)

### Tabular with nested fields (traditional)

For objects with fewer than 3 fields or containing nested sub-objects:

```
## items [2]{id,metadata}
@0 1001|^
.metadata {}
    source=api
    version=2
@1 1002|^
.metadata {}
    source=web
    version=3
```

- `.field {}` introduces a nested object attachment
- Attachment lines are at the same indent as the row (no extra indentation)
- Nested fields use `key=value` pairs, indented under the attachment

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

### Expanded arrays

When array items are mixed types (not all objects with the same fields), use expanded form:

```
## items [3]
@0 =hello              # scalar item
@1 {}                   # object item
  name=Alice
  age=30
@2 [2]: a,b            # nested array item
```

- `@N =value` for scalars
- `@N {}` for objects (key=value pairs follow, indented)
- `@N [M]` for nested arrays

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
| String with `\|` or newline | quoted | `"value\|with\|pipes"` |
| String with `,` | quoted | `"a,b"` |

### Complete tabular example

```
name=Acme Corp
region=us-east-1
## employees [3]{id,name,department,salary,active}
1|Alice Smith|Engineering|95000|true
2|Bob Jones|Sales|72000|true
3|Carol Wu|Marketing|85000|false
## projects [2]{id,title,lead,tags}
@0 101|Auth Rewrite|Alice Smith|^
.tags {}
    priority=high
    deadline=2026-Q3
@1 102|Dashboard|Bob Jones|^
.tags {}
    priority=medium
    deadline=2026-Q4
```

### Delta encoding (keyed diff, v3.3)

Tabular sets can be sent as deltas across turns. One column is the identity key: prefix it with `@` in the field declaration and name it with `key=` in the header.

Full payload (delta-ready):

```
GCF profile=generic pack_root=sha256:aaa9f2... key=id
## orders [3]{@id,total,status,customer}
1001|59.98|shipped|Alice
1002|29.99|pending|Bob
1003|129.50|shipped|Carol
```

Delta payload (only what changed):

```
GCF profile=generic delta=true base_root=sha256:aaa9f2... new_root=sha256:bbb4c7... key=id
## added [1]{@id,total,status,customer}
1004|75.00|pending|Dave
## changed [1]{@id,total,status,customer}
1002|29.99|shipped|Bob
## removed [1]{@id}
1001
```

Unchanged (current set still matches the consumer's `pack_root`):

```
GCF profile=generic unchanged=true pack_root=sha256:bbb4c7... count=3
```

- `## added`: full rows whose id is new to the set
- `## changed`: full rows whose id exists but differs (whole-row replace, no field-level patch)
- `## removed`: identity values only, declared `{@<key>}`
- Set semantics: row order is not significant; carry an explicit rank field as data if order matters
- Identity values MUST be unique; when `delta=true`, only these three section names are valid

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
##! summary counts=3,2
```

Emitted after all data. In the **generic** profile, `counts=N,M,...` lists the resolved values for each `[?]` header in order of appearance.

In the **graph** profile the trailer is `##! summary symbols=N edges=M counts=...`, where `counts` is per distance group plus the edge count (e.g. `counts=2,1,2` for 2 targets, 1 related, 2 edges). These graph counts are informational (decoder-ignored). An optional labeled form (v3.4, §8.4.1) tags each value: `counts=targets:2,related:1,edges:2`.

### Streaming example

```
GCF profile=graph tool=context_for_task budget=5000
## targets
@0 fn pkg.Auth 0.95 lsp
@1 fn pkg.Handler 0.88 lsp
## related
@2 type pkg.Config 0.72 ast
## edges [?]
@0<@1 calls
@2<@0 references
##! summary symbols=3 edges=2 counts=2,1,2
```

Standard `decode()` handles streaming output with no changes.

---

## Shared

### Comments

```
# This is a comment (ignored by parsers)
```

Must start with `# ` (hash + space). Group headers (`##`) are NOT comments.
