# API Reference (Rust)

```bash
cargo add gcf
```

## Functions

### `encode(p: &Payload) -> String`

Encode a Payload into GCF text format.

```rust
use gcf::{Payload, Symbol, encode};

let p = Payload {
    tool: "context_for_task".into(),
    token_budget: 5000,
    tokens_used: 1847,
    symbols: vec![Symbol {
        qualified_name: "pkg.Auth".into(),
        kind: "function".into(),
        score: 0.78,
        provenance: "lsp_resolved".into(),
        distance: 0,
        ..Default::default()
    }],
    edges: vec![],
    ..Default::default()
};

let output = encode(&p);
```

### `decode(input: &str) -> Result<Payload, DecodeError>`

Parse GCF text back into a Payload. Returns `Err(DecodeError)` on malformed input.

```rust
use gcf::decode;

let p = decode(gcf_text).expect("valid GCF");
println!("{} {} symbols", p.tool, p.symbols.len());
```

### `encode_with_session(p: &Payload, sess: &Session) -> String`

Encode with session deduplication. Previously-transmitted symbols become bare references. Thread-safe (uses `Mutex` internally).

```rust
use gcf::{Session, encode_with_session};

let sess = Session::new();
let out1 = encode_with_session(&payload1, &sess); // full declarations
let out2 = encode_with_session(&payload2, &sess); // bare refs for known symbols
```

### `encode_delta(d: &DeltaPayload) -> String`

Encode a delta payload (only added/removed symbols and edges).

```rust
use gcf::{DeltaPayload, Symbol, encode_delta};

let delta = DeltaPayload {
    tool: "context_for_task".into(),
    base_root: "aaa111".into(),
    new_root: "bbb222".into(),
    removed: vec![Symbol { qualified_name: "pkg.Old".into(), kind: "function".into(), ..Default::default() }],
    added: vec![Symbol { qualified_name: "pkg.New".into(), kind: "function".into(), score: 0.85, provenance: "rwr".into(), ..Default::default() }],
    delta_tokens: 30,
    full_tokens: 200,
    ..Default::default()
};

let output = encode_delta(&delta);
```

### `encode_generic(data: &serde_json::Value) -> String`

Encode any JSON value into GCF tabular format. Unlike `encode` (which handles the graph `Payload` type), `encode_generic` works on arbitrary `serde_json::Value` input.

```rust
use gcf::encode_generic;
use serde_json::json;

let output = encode_generic(&json!({
    "employees": [
        {"id": 1, "name": "Alice", "department": "Engineering", "salary": 95000},
        {"id": 2, "name": "Bob", "department": "Sales", "salary": 72000},
    ],
}));
// ## employees [2]{department,id,name,salary}
// Engineering|1|Alice|95000
// Sales|2|Bob|72000
```

Arrays of uniform objects get tabular encoding (header + positional rows). Primitive arrays are inlined (`tags[3]: a,b,c`). Nested objects use `## key` section headers. Primitives use `key=value`.

### `Session::new() -> Session`

Create a new empty session tracker. Thread-safe.

### `StreamEncoder::new(w: impl Write, tool, opts) -> StreamEncoder`

Create a streaming encoder that writes GCF incrementally. Zero buffering, thread-safe via Mutex.

```rust
let enc = StreamEncoder::new(writer, "context_for_task", StreamOptions { token_budget: 5000, ..Default::default() });
enc.write_symbol(&sym);  // emitted immediately
enc.write_edge(&edge);   // emitted immediately
enc.close();             // emits ## _summary trailer
```

## Types

### `Payload`

```rust
pub struct Payload {
    pub tool: String,
    pub tokens_used: i64,
    pub token_budget: i64,
    pub pack_root: String,
    pub symbols: Vec<Symbol>,
    pub edges: Vec<Edge>,
}
```

### `Symbol`

```rust
pub struct Symbol {
    pub qualified_name: String,
    pub kind: String,
    pub score: f64,
    pub provenance: String,
    pub distance: i32,
    pub signature: String,
    pub components: Components,
}
```

### `Edge`

```rust
pub struct Edge {
    pub source: String,
    pub target: String,
    pub edge_type: String,
    pub status: String,
}
```

### `DeltaPayload`

```rust
pub struct DeltaPayload {
    pub tool: String,
    pub base_root: String,
    pub new_root: String,
    pub removed: Vec<Symbol>,
    pub added: Vec<Symbol>,
    pub removed_edges: Vec<Edge>,
    pub added_edges: Vec<Edge>,
    pub delta_tokens: i64,
    pub full_tokens: i64,
}
```

### `Session`

```rust
impl Session {
    pub fn new() -> Self;
    pub fn transmitted(&self, qname: &str) -> bool;
    pub fn get_id(&self, qname: &str) -> Option<usize>;
    pub fn record(&self, symbols: &[Symbol]);
    pub fn size(&self) -> usize;
    pub fn reset(&self);
}
```

Thread-safe via `Mutex`.

### `DecodeError`

```rust
pub struct DecodeError {
    pub message: String,
}
```

Returned by `decode()` on malformed GCF input.

## Constants

### `kind_abbrev(kind: &str) -> String`

Maps full kind names to GCF abbreviations (`"function"` -> `"fn"`, etc.).

### `kind_expand(abbrev: &str) -> String`

Reverse of `kind_abbrev`. Maps abbreviations back to full forms.
