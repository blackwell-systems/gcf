# API Reference (Go)

```bash
go get github.com/blackwell-systems/gcf-go
```

## Functions

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
    BaseRoot:    "aaa111",
    NewRoot:     "bbb222",
    Removed:     removedSymbols,
    Added:       addedSymbols,
    RemovedEdges: removedEdges,
    AddedEdges:   addedEdges,
    DeltaTokens:  30,
    FullTokens:   200,
})
```

### `EncodeGeneric(data any) string`

Encode any Go value into GCF tabular format. Unlike `Encode` (which handles the graph `Payload` type), `EncodeGeneric` works on arbitrary maps, slices, structs, and primitives.

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

### `NewSession() *Session`

Create a new empty session tracker. Thread-safe.

### `NewStreamEncoder(w io.Writer, tool string, opts StreamOptions) *StreamEncoder`

Create a streaming encoder that writes GCF incrementally. Zero buffering, O(1) memory per row.

```go
enc := gcf.NewStreamEncoder(w, "context_for_task", gcf.StreamOptions{TokenBudget: 5000})
enc.WriteSymbol(sym)  // emitted immediately
enc.WriteEdge(edge)   // emitted immediately
enc.Close()           // emits ## _summary trailer
```

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
