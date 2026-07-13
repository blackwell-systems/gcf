# API Reference (Go)

```bash
go get github.com/blackwell-systems/gcf-go
```

## Functions

### `EncodeGeneric(data any, opts ...GenericOptions) string`

Encode any Go value into GCF tabular format. Unlike `Encode` (which handles the graph `Payload` type), `EncodeGeneric` works on arbitrary maps, slices, structs, and primitives.

Pass `GenericOptions{NoFlatten: true}` to use expanded encoding for nested objects (open-weight models currently comprehend this form better; GCF still outperforms JSON either way).

```go
data := map[string]any{
    "employees": []map[string]any{
        {"id": 1, "name": "Alice", "department": "Engineering", "salary": 95000},
        {"id": 2, "name": "Bob", "department": "Sales", "salary": 72000},
    },
}
output := gcf.EncodeGeneric(data)
// ## employees [2]{id,name,department,salary}
// 1|Alice|Engineering|95000
// 2|Bob|Sales|72000
```

Arrays of uniform objects get tabular encoding (header + positional rows). Primitive arrays are inlined (`tags[3]: a,b,c`). Nested objects use `## key` section headers. Primitives use `key=value`.

### `DecodeGeneric(input string) (any, error)`

Decode GCF generic or graph profile text back into Go values. Returns `*OrderedMap` for objects (preserving key insertion order), `[]any` for arrays, or scalar values.

```go
val, err := gcf.DecodeGeneric(gcfText)
if err != nil {
    log.Fatal(err)
}
// val is *OrderedMap, []any, string, float64, int64, bool, or nil
```

### `ParseJSONOrdered(data []byte) (any, error)`

Parse JSON preserving key insertion order. Returns `*OrderedMap` instead of `map[string]any`. Use this when encoding JSON input that must preserve key order.

```go
val, err := gcf.ParseJSONOrdered(jsonBytes)
if err != nil {
    log.Fatal(err)
}
output := gcf.EncodeGeneric(val) // keys in original JSON order
```

### `Encode(p *Payload) string`

Encode a Payload into GCF text format.

```go
output := gcf.Encode(&gcf.Payload{
    Tool:        "context_for_task",
    TokenBudget: 5000,
    TokensUsed:  1847,
    Symbols:     symbols,
    Edges:       edges,
})
```

### `Decode(input string) (*Payload, error)`

Parse GCF text back into a Payload. Returns an error on malformed input.

```go
p, err := gcf.Decode(gcfText)
if err != nil {
    log.Fatal(err)
}
```

### `EncodeWithSession(p *Payload, sess *Session) string`

Encode with session deduplication. Previously-transmitted symbols become bare references. If `sess` is nil, falls back to `Encode`.

```go
sess := gcf.NewSession()
out1 := gcf.EncodeWithSession(payload1, sess) // full declarations
out2 := gcf.EncodeWithSession(payload2, sess) // reused symbols as bare refs
```

### `EncodeDelta(d *DeltaPayload) string`

Encode a delta payload (only added/removed symbols and edges).

```go
output := gcf.EncodeDelta(&gcf.DeltaPayload{
    Tool:        "context_for_task",
    BaseRoot:    "sha256:aaa111...",
    NewRoot:     "sha256:bbb222...",
    Removed:     removedSymbols,
    Added:       addedSymbols,
    RemovedEdges: removedEdges,
    AddedEdges:   addedEdges,
    DeltaTokens:  30,
    FullTokens:   200,
})
```

### `PackRoot(symbols []Symbol, edges []Edge) string`

Compute the content-addressed pack root (`gcf-pack-root-v1`, SPEC Section 10.2) of a graph snapshot: a deterministic SHA-256 over canonical, independently-sorted symbol and edge records. Byte-identical across all six SDKs. This is the value carried in `pack_root` / `base_root` / `new_root`.

```go
root := gcf.PackRoot(symbols, edges) // "sha256:<64 hex>"
```

### `DecodeDelta(input string) (*DeltaPayload, error)`

Parse a graph delta wire (`GCF profile=graph delta=true ...`) back into a `DeltaPayload` (removed / added symbols, removed / added edges). The inverse of `EncodeDelta`. Returns an error on malformed input.

```go
d, err := gcf.DecodeDelta(deltaText)
if err != nil {
    log.Fatal(err)
}
```

### `VerifyDelta(baseSymbols []Symbol, baseEdges []Edge, removedSymbols, addedSymbols []Symbol, removedEdges, addedEdges []Edge, expectedNewRoot string) ([]Symbol, []Edge, error)`

Apply a decoded delta to a base snapshot atomically, then verify the recomputed `PackRoot` equals `expectedNewRoot` (SPEC Section 10.4). Returns the applied symbols and edges on success. Applies nothing and returns `delta_invalid` when a removal targets a symbol not in the base or an addition already exists, or `root_mismatch` when the recomputed root differs from `expectedNewRoot`.

```go
d, _ := gcf.DecodeDelta(deltaText)
syms, edges, err := gcf.VerifyDelta(
    baseSymbols, baseEdges,
    d.Removed, d.Added, d.RemovedEdges, d.AddedEdges,
    d.NewRoot,
)
if err != nil {
    // root_mismatch or delta_invalid: request a full payload
}
```

### `NewStreamEncoder(w io.Writer, tool string, opts StreamOptions) *StreamEncoder`

Create a streaming encoder that writes GCF incrementally. Zero buffering, O(1) memory per row.

```go
enc := gcf.NewStreamEncoder(w, "context_for_task", gcf.StreamOptions{TokenBudget: 5000})
enc.WriteSymbol(sym)  // emitted immediately
enc.WriteEdge(edge)   // emitted immediately
enc.Close()           // emits ##! summary trailer
```

### `NewSession() *Session`

Create a new empty session tracker. Thread-safe.

## Types

### `Payload`

```go
type Payload struct {
    Tool        string   // producing tool name
    TokensUsed  int      // actual tokens consumed
    TokenBudget int      // token budget requested
    PackRoot    string   // content-addressed identity (hex SHA-256)
    Symbols     []Symbol // ordered by score within distance groups
    Edges       []Edge   // directed relationships
}
```

### `Symbol`

```go
type Symbol struct {
    QualifiedName string     // fully qualified identifier
    Kind          string     // "function", "type", "method", etc.
    Score         float64    // relevance score (0.0 to 1.0)
    Provenance    string     // "lsp_resolved", "ast_inferred", etc.
    Distance      int        // hops from query center
    Signature     string     // optional: function signature
    Components    Components // optional: score breakdown
}
```

### `Edge`

```go
type Edge struct {
    Source   string // qualified name of source symbol
    Target   string // qualified name of target symbol
    EdgeType string // "calls", "imports", "implements", etc.
    Status   string // optional: "added", "removed" (for diffs)
}
```

### `DeltaPayload`

```go
type DeltaPayload struct {
    Tool         string
    BaseRoot     string   // pack_root the consumer has
    NewRoot      string   // pack_root of current result
    Removed      []Symbol
    Added        []Symbol
    RemovedEdges []Edge
    AddedEdges   []Edge
    DeltaTokens  int
    FullTokens   int
}
```

### `Session`

```go
type Session struct { /* internal */ }

func (s *Session) Transmitted(qname string) bool // was this symbol sent before?
func (s *Session) GetID(qname string) int        // session-global ID (-1 if not found)
func (s *Session) Record(symbols []Symbol)       // mark symbols as transmitted
func (s *Session) Size() int                     // number of tracked symbols
func (s *Session) Reset()                        // clear for new conversation
```

## Generic Delta (v3.3)

Delta encoding for the generic profile (SPEC Section 10a): a keyed diff over a tabular set, plus a producer-side session helper that re-anchors on a tunable cadence. Identity is one designated column (`key=` in the header, `@<key>` in the field declaration).

### `GenericSet`

```go
type GenericSet struct {
    Name   string           // section name (e.g. "orders"); "" for a root array
    Key    string           // identity field name
    Fields []string         // ordered field union
    Rows   []map[string]any // one map per record
}
```

### `EncodeGenericFull(s GenericSet, tool string) string`

Encode a set as a delta-ready full payload.

```go
set := gcf.GenericSet{
    Name: "orders", Key: "id",
    Fields: []string{"id", "total", "status"},
    Rows: []map[string]any{
        {"id": 1001, "total": 59.98, "status": "shipped"},
        {"id": 1002, "total": 29.99, "status": "pending"},
    },
}
out := gcf.EncodeGenericFull(set, "orders_tool")
// GCF profile=generic pack_root=sha256:... key=id
// ## orders [2]{@id,total,status}
// 1001|59.98|shipped
// 1002|29.99|pending
```

### `DiffGenericSets(base, next GenericSet) (*GenericDeltaPayload, error)`

Compute the added / changed / removed diff between two sets that share the same key and fields.

### `EncodeGenericDelta(d *GenericDeltaPayload) string`

Encode a delta payload (`## added` / `## changed` / `## removed`).

### `DecodeGenericDelta(text string) (*GenericDeltaPayload, error)`

Parse a delta payload back into its added / changed / removed parts.

### `VerifyGenericDelta(base GenericSet, d *GenericDeltaPayload, expectedNewRoot string) (GenericSet, error)`

Apply a delta to `base` atomically and verify the result's pack root equals `expectedNewRoot`. Returns the new set on success, an error on any mismatch (apply nothing).

### `GenericDeltaPayload`

```go
type GenericDeltaPayload struct {
    Tool        string
    Key         string
    Fields      []string
    BaseRoot    string
    NewRoot     string
    Added       []map[string]any
    Changed     []map[string]any
    Removed     []any // identity values only
    DeltaTokens int
    FullTokens  int
}
```

### Session helper: `GenericDeltaSession`

A thin producer-side loop over the primitives above. It holds the current base and re-anchors (sends a full instead of a delta) on a tunable cadence. This helper is non-normative: the cadence never appears on the wire (SPEC Section 10a.8).

```go
sess := gcf.NewGenericDeltaSession(base, "orders_tool", gcf.FixedN(15))
send(sess.CurrentFull()) // turn 0: establish the base

for _, next := range states {
    wire, full, err := sess.Next(next)
    if err != nil {
        log.Fatal(err)
    }
    send(wire) // full == true on a re-anchor, false on a delta
}
```

- `NewGenericDeltaSession(base GenericSet, tool string, policy ReanchorPolicy) *GenericDeltaSession`
- `CurrentFull() string`: full payload for the current base; send first, also a valid manual re-anchor
- `Next(next GenericSet) (wire string, full bool, err error)`: advance one turn; a schema change forces a full (Section 10a.7)
- `Turn() int`: number of `Next` calls so far (the initial full is turn 0)

### `ReanchorPolicy`

Selects when the session re-anchors. Construct with `FixedN` or `SizeGuard`.

- `FixedN(n int) ReanchorPolicy`: re-anchor every `n` turns; `n <= 0` uses `DefaultReanchorN` (15).
- `SizeGuard() ReanchorPolicy`: re-anchor once the cumulative delta since the last anchor reaches the current full payload's size (size-adaptive; recommended for varying churn).

`const DefaultReanchorN = 15`

## Constants

### `KindAbbrev`

```go
var KindAbbrev = map[string]string{
    "function": "fn", "type": "type", "method": "method",
    "interface": "iface", "var": "var", "const": "const",
    "class": "class", "field": "field", "route_handler": "route",
    "external": "ext", "file": "file", "package": "pkg",
    "service": "svc", "table": "table", "resource": "resource",
    "selector": "selector",
}
```

### `KindExpand`

Reverse of `KindAbbrev`. Maps abbreviations back to full forms.

## CLI

```bash
go install github.com/blackwell-systems/gcf-go/cmd/gcf@latest

echo '{"name":"Alice"}' | gcf encode-generic
echo 'GCF profile=generic\nname=Alice' | gcf decode-generic
```

| Command | Description |
|---------|-------------|
| `gcf encode` | Encode graph payload (JSON stdin) to GCF |
| `gcf decode` | Decode GCF graph text to JSON |
| `gcf encode-generic` | Encode any JSON to GCF generic profile |
| `gcf decode-generic` | Decode GCF generic profile to JSON |
| `gcf stats` | Compare token counts: JSON vs GCF |
| `gcf version` | Print version |
