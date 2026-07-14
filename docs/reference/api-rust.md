# API Reference (Rust)

```bash
cargo add gcf
```

## Functions

### `encode_generic(data: &Value) -> String` / `encode_generic_with_options(data: &Value, opts: &GenericOptions) -> String`

Encode any JSON value into GCF tabular format. Unlike `encode` (which handles the graph `Payload` type), `encode_generic` works on arbitrary `serde_json::Value` input.

Pass `&GenericOptions { no_flatten: true }` to use expanded encoding for nested objects (open-weight models currently comprehend this form better; GCF still outperforms JSON either way).

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

### `decode_generic(input: &str) -> Result<serde_json::Value>`

Decode GCF generic or graph profile text back into a `serde_json::Value`.

```rust
use gcf::decode_generic;

let data = decode_generic(gcf_text)?;
```

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
    base_root: "sha256:aaa111...".into(),
    new_root: "sha256:bbb222...".into(),
    removed: vec![Symbol { qualified_name: "pkg.Old".into(), kind: "function".into(), ..Default::default() }],
    added: vec![Symbol { qualified_name: "pkg.New".into(), kind: "function".into(), score: 0.85, provenance: "rwr".into(), ..Default::default() }],
    delta_tokens: 30,
    full_tokens: 200,
    ..Default::default()
};

let output = encode_delta(&delta);
```

### `pack_root(symbols: &[Symbol], edges: &[Edge]) -> String`

Content-addressed pack root (`gcf-pack-root-v1`, SPEC Section 10.2) of a graph snapshot: a deterministic SHA-256 over canonical, independently-sorted symbol and edge records. Byte-identical across all six SDKs; this is the value carried in `pack_root` / `base_root` / `new_root`.

### `decode_delta(input: &str) -> Result<DeltaPayload, String>`

Parse a graph delta wire (`GCF profile=graph delta=true ...`) back into a `DeltaPayload`. The inverse of `encode_delta`. Returns `Err` on malformed input.

### `verify_delta(base_symbols, base_edges, removed_symbols, added_symbols, removed_edges, added_edges, expected_new_root: &str) -> Result<(Vec<Symbol>, Vec<Edge>), String>`

Apply a decoded delta to a base snapshot atomically, then verify the recomputed `pack_root` equals `expected_new_root` (SPEC Section 10.4). Returns the applied `(symbols, edges)` on success. Returns `Err` containing `delta_invalid` when a removal targets a symbol not in the base or an addition already exists, or `root_mismatch` when the recomputed root differs.

```rust
let d = decode_delta(delta_text)?;
let (symbols, edges) = verify_delta(
    &base_symbols, &base_edges,
    &d.removed, &d.added, &d.removed_edges, &d.added_edges,
    &d.new_root,
)?; // Err on root_mismatch / delta_invalid
```

### `StreamEncoder::new(w: impl Write, tool, opts) -> StreamEncoder`

Create a streaming encoder that writes GCF incrementally. Zero buffering, thread-safe via Mutex.

```rust
let enc = StreamEncoder::new(writer, "context_for_task", StreamOptions { token_budget: 5000, ..Default::default() });
enc.write_symbol(&sym);  // emitted immediately
enc.write_edge(&edge);   // emitted immediately
enc.close();             // emits ##! summary trailer
```

Set `labeled_trailer_counts: true` in `StreamOptions` to emit the `##! summary` trailer's `counts=` in the labeled form (`counts=targets:2,related:1,edges:3`) instead of the default positional form (`counts=2,1,3`), a comprehension aid for weaker consumers (SPEC §8.4.1).

### `Session::new() -> Session`

Create a new empty session tracker. Thread-safe.

## Generic Delta (v3.3)

Delta encoding for the generic profile (SPEC Section 10a): a keyed diff over a tabular set, plus a producer-side session helper that re-anchors on a tunable cadence. Identity is one designated column (`key=` in the header, `@<key>` in the field declaration).

### `encode_generic_full(s: &GenericSet, tool: &str) -> String`

Encode a delta-ready full payload: `key=` in the GCF header, an `@`-prefixed identity field in the section declaration, pipe-separated rows.

```rust
use gcf::{GenericSet, encode_generic_full};
use serde_json::json;

let set = GenericSet {
    name: "orders".into(),
    key: "id".into(),
    fields: vec!["id".into(), "total".into(), "status".into()],
    rows: vec![
        json!({"id": 1001, "total": 59.98, "status": "shipped"}).as_object().unwrap().clone(),
        json!({"id": 1002, "total": 29.99, "status": "pending"}).as_object().unwrap().clone(),
    ],
};

let out = encode_generic_full(&set, "orders_query");
// GCF profile=generic tool=orders_query pack_root=sha256:... key=id
// ## orders [2]{@id,total,status}
// 1001|59.98|shipped
// 1002|29.99|pending
```

### `diff_generic_sets(base: &GenericSet, next: &GenericSet) -> Result<GenericDeltaPayload, String>`

Compute the added / changed / removed diff between two sets sharing the same key and fields. This is the blessed producer path: it enforces the keyed-diff invariants (identity uniqueness, added-not-in-base, changed-must-exist, whole-row replacement, unchanged rows omitted). A schema change or a missing key returns an error, meaning the caller must send a full payload instead (Section 10a.7).

```rust
use gcf::diff_generic_sets;

let payload = diff_generic_sets(&base, &next)?;
```

### `encode_generic_delta(d: &GenericDeltaPayload) -> String`

Serialize a delta payload. Sections are emitted in the deterministic order `## added` / `## changed` / `## removed` (Section 10a.6).

```rust
use gcf::encode_generic_delta;

let wire = encode_generic_delta(&payload);
// GCF profile=generic delta=true base_root=sha256:... new_root=sha256:... key=id savings=..%
// ## added [1]{@id,total,status}
// 1004|75.00|pending
// ## changed [1]{@id,total,status}
// 1002|29.99|shipped
// ## removed [1]{@id}
// 1001
```

### `decode_generic_delta(text: &str) -> Result<GenericDeltaPayload, String>`

Parse delta wire text back into a `GenericDeltaPayload`. The result can be applied with `verify_generic_delta`.

```rust
use gcf::decode_generic_delta;

let payload = decode_generic_delta(wire)?;
```

### `decode_generic_full(text: &str) -> Result<(GenericSet, String), String>`

Parse a delta-participating full base payload into a `GenericSet`, returning it alongside the declared `pack_root`.

```rust
use gcf::decode_generic_full;

let (set, pack_root) = decode_generic_full(text)?;
```

### `verify_generic_delta(base: &GenericSet, d: &GenericDeltaPayload, expected_new_root: &str) -> Result<GenericSet, String>`

Apply a delta to `base` and verify the result hashes to `expected_new_root` (Section 10a.5). Atomic: the whole payload is validated against the original base before any state changes, so a mismatch leaves the base untouched and applies nothing. Returns the new `GenericSet` on success.

```rust
use gcf::verify_generic_delta;

let next = verify_generic_delta(&base, &payload, &payload.new_root)?;
```

### `generic_pack_root(s: &GenericSet) -> String`

Compute the canonical pack root (`sha256:...`) for a keyed set using the gcf-pack-root-v1 algorithm, generic profile (Section 10a.3). Order-agnostic over rows; two implementations given the same logical set produce the same result (byte-for-byte interoperable with gcf-go, gcf-python, gcf-typescript).

### Session helper: `GenericDeltaSession`

A producer-side helper that manages the re-anchor cadence for a stream of generic-profile updates (SPEC Section 10a.8, non-normative producer policy). It is thin sugar over the primitives: each `next` emits either a compact delta or, on its chosen cadence, a full re-anchor, updating its held base. It introduces no new wire syntax; every payload is byte-identical to `encode_generic_full` / `encode_generic_delta`, and the decoder accepts them cadence-agnostically. Not safe for concurrent use.

```rust
pub fn new(base: GenericSet, tool: String, policy: ReanchorPolicy) -> Self;
pub fn current_full(&self) -> String;
pub fn next(&mut self, next: GenericSet) -> Result<(String, bool), String>;
pub fn turn(&self) -> usize;
```

- `new(base, tool, policy)`: start a session anchored on `base`.
- `current_full()`: return the initial full payload to transmit first (also a valid manual re-anchor).
- `next(next)`: advance one turn to `next`, returning `(wire, is_full)`, where `is_full` is `true` for a full re-anchor and `false` for a delta. A schema change forces a full (Section 10a.7). The held base becomes `next` either way.
- `turn()`: return the number of `next` calls so far (the initial full is turn 0).

```rust
use gcf::{GenericDeltaSession, ReanchorPolicy, decode_generic_full, decode_generic_delta, verify_generic_delta};

let mut s = GenericDeltaSession::new(base, "orders_query".into(), ReanchorPolicy::size_guard());
let mut held = decode_generic_full(&s.current_full())?.0; // send the initial full first

for update in updates {
    let (wire, is_full) = s.next(update)?;
    // transmit `wire`; the consumer applies it:
    held = if is_full {
        decode_generic_full(&wire)?.0
    } else {
        let d = decode_generic_delta(&wire)?;
        verify_generic_delta(&held, &d, &d.new_root)?
    };
}
```

### `ReanchorPolicy`

Selects when a `GenericDeltaSession` re-anchors. Producer-side policy only (non-normative): the cadence never appears on the wire (Section 10a.8).

```rust
pub enum ReanchorPolicy {
    FixedN(usize),
    SizeGuard,
}

impl ReanchorPolicy {
    pub fn fixed_n(n: usize) -> Self; // n == 0 falls back to DEFAULT_REANCHOR_N
    pub fn size_guard() -> Self;      // size-adaptive, production-recommended
}
```

- `ReanchorPolicy::fixed_n(n)`: re-anchor every `n` turns. `n == 0` uses `DEFAULT_REANCHOR_N`.
- `ReanchorPolicy::size_guard()`: re-anchor once the cumulative delta since the last anchor reaches the current full payload's size (size-adaptive; more anchors under heavy churn, rarely under light churn). Recommended for varying churn.

`pub const DEFAULT_REANCHOR_N: usize = 15;`

### `GenericSet`

```rust
pub struct GenericSet {
    pub name: String,             // tabular section name ("" defaults to "rows" on the wire)
    pub key: String,              // identity field (the @key / key=)
    pub fields: Vec<String>,      // declared column order for the wire form
    pub rows: Vec<Map<String, Value>>, // records (order-agnostic; set semantics)
}
```

`Map` and `Value` are `serde_json::Map<String, Value>` and `serde_json::Value`.

### `GenericDeltaPayload`

```rust
pub struct GenericDeltaPayload {
    pub tool: String,
    pub key: String,
    pub fields: Vec<String>,
    pub base_root: String,
    pub new_root: String,
    pub added: Vec<Map<String, Value>>,
    pub changed: Vec<Map<String, Value>>,
    pub removed: Vec<Value>,       // identity values only
    pub delta_tokens: u64,
    pub full_tokens: u64,
}
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
pub enum DecodeError {
    EmptyInput,
    InvalidHeader(String),
    InvalidField(String),
    InvalidSymbolLine(String),
    InvalidEdgeLine(String),
    UnknownEdgeId(String),
}
```

Returned by `decode()` on malformed GCF input. Implements `Display` and `std::error::Error`.

## Constants

### `kind_abbrev(kind: &str) -> String`

Maps full kind names to GCF abbreviations (`"function"` -> `"fn"`, etc.).

### `kind_expand(abbrev: &str) -> String`

Reverse of `kind_abbrev`. Maps abbreviations back to full forms.

## CLI

```bash
cargo install gcf
gcf encode-generic < data.json
gcf decode-generic < data.gcf
```

| Command | Description |
|---------|-------------|
| `encode` | Encode graph payload (JSON stdin) to GCF |
| `decode` | Decode GCF graph text to JSON |
| `encode-generic` | Encode any JSON to GCF generic profile |
| `decode-generic` | Decode GCF generic profile to JSON |
| `version` | Print version |
