# Syntax Cheatsheet

Quick reference for GCF encoding. Every example is a complete, valid GCF fragment.

## Header

```
GCF tool=<name> budget=<int> tokens=<int> symbols=<int> pack_root=<hex>
```

Only `tool` is required. All other fields are optional.

```
GCF tool=context_for_task
GCF tool=context_for_task budget=5000 tokens=1847 symbols=10
GCF tool=context_for_task budget=5000 tokens=1847 symbols=10 pack_root=a1b2c3d4
GCF tool=context_for_task tokens=800 symbols=5 session=true
GCF tool=context_for_task delta=true base_root=aaa111 new_root=bbb222 tokens=30 savings=81%
```

## Symbol lines

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

## Edge lines

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

## Group headers

```
## targets       # distance 0 (direct matches)
## related       # distance 1 (one hop)
## extended      # distance 2 (broader context)
## distance_5    # explicit distance N
## edges         # relationship section
```

## Kind abbreviations

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

## Session bare references

```
@7  # previously transmitted
```

Two spaces before `#`. Used when `session=true` in header.

## Delta payload

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

## Comments

```
# This is a comment (ignored by parsers)
```

Must start with `# ` (hash + space). Group headers (`##`) are NOT comments.

## Complete example

```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=5 pack_root=a1b2c3d4
## targets
@0 fn github.com/org/repo/internal/auth.Middleware 0.78 lsp_resolved
@1 type github.com/org/repo/internal/auth.Config 0.71 ast_inferred
## related
@2 fn github.com/org/repo/internal/server.New 0.54 lsp_resolved
@3 method github.com/org/repo/internal/server.Server.Start 0.48 lsp_resolved
## extended
@4 iface github.com/org/repo/internal/handler.Handler 0.32 structural
## edges
@0<@2 calls
@1<@0 references
@4<@2 implements
@3<@2 calls
```
