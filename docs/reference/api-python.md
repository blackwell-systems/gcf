# API Reference (Python)

```bash
pip install gcf-python
```

## Functions

### `encode_generic(data: Any, opts: GenericOptions | None = None) -> str`

Encode any Python value into GCF tabular format. Unlike `encode` (which handles the graph `Payload` type), `encode_generic` works on arbitrary dicts, lists, and primitives.

Pass `GenericOptions(no_flatten=True)` to use expanded encoding for nested objects (open-weight models currently comprehend this form better; GCF still outperforms JSON either way).

```python
from gcf import encode_generic

output = encode_generic({
    "employees": [
        {"id": 1, "name": "Alice", "department": "Engineering", "salary": 95000},
        {"id": 2, "name": "Bob", "department": "Sales", "salary": 72000},
    ],
})
# ## employees [2]{id,name,department,salary}
# 1|Alice|Engineering|95000
# 2|Bob|Sales|72000
```

Arrays of uniform dicts get tabular encoding (header + positional rows). Primitive arrays are inlined (`tags[3]: a,b,c`). Nested dicts use `## key` section headers. Primitives use `key=value`.

### `decode_generic(input: str) -> Any`

Decode GCF generic or graph profile text back into Python values. Returns dicts, lists, or scalar values.

```python
from gcf import decode_generic

data = decode_generic(gcf_text)
# data is dict, list, str, int, float, bool, or None
```

### `encode(p: Payload) -> str`

Encode a Payload into GCF text format.

```python
from gcf import encode, Payload, Symbol, Edge

output = encode(Payload(
    tool="context_for_task",
    token_budget=5000,
    tokens_used=1847,
    symbols=[...],
    edges=[...],
))
```

### `decode(input: str) -> Payload`

Parse GCF text back into a Payload. Raises `DecodeError` on malformed input.

```python
from gcf import decode

p = decode(gcf_text)
print(p.tool, len(p.symbols))
```

### `encode_with_session(p: Payload, sess: Session) -> str`

Encode with session deduplication. If `sess` is None, falls back to `encode`.

```python
from gcf import encode_with_session, Session

sess = Session()
out1 = encode_with_session(payload1, sess)
out2 = encode_with_session(payload2, sess)  # bare refs for known symbols
```

### `encode_delta(d: DeltaPayload) -> str`

Encode a delta payload.

```python
from gcf import encode_delta, DeltaPayload, Symbol, Edge

output = encode_delta(DeltaPayload(
    tool="context_for_task",
    base_root="sha256:aaa111...",
    new_root="sha256:bbb222...",
    removed=[Symbol(qualified_name="pkg.OldFunc", kind="function")],
    added=[Symbol(qualified_name="pkg.NewFunc", kind="function", score=0.85, provenance="rwr")],
    removed_edges=[Edge(source="pkg.Router", target="pkg.OldFunc", edge_type="calls")],
    added_edges=[Edge(source="pkg.Router", target="pkg.NewFunc", edge_type="calls")],
    delta_tokens=30,
    full_tokens=200,
))
```

### `pack_root(symbols: list[Symbol], edges: list[Edge]) -> str`

Content-addressed pack root (`gcf-pack-root-v1`, SPEC Section 10.2) of a graph snapshot: a deterministic SHA-256 over canonical, independently-sorted symbol and edge records. Byte-identical across all six SDKs; this is the value carried in `pack_root` / `base_root` / `new_root`.

### `decode_delta(wire: str) -> DeltaPayload`

Parse a graph delta wire (`GCF profile=graph delta=true ...`) back into a `DeltaPayload`. The inverse of `encode_delta`. Raises `ValueError` on malformed input.

### `verify_delta(base_symbols, base_edges, removed, added, removed_edges, added_edges, expected_new_root) -> tuple[list[Symbol], list[Edge]]`

Apply a decoded delta to a base snapshot atomically, then verify the recomputed `pack_root` equals `expected_new_root` (SPEC Section 10.4). Returns the applied `(symbols, edges)`. Raises `ValueError` with `delta_invalid` when a removal targets a symbol not in the base or an addition already exists, or `root_mismatch` when the recomputed root differs.

```python
from gcf import decode_delta, verify_delta

d = decode_delta(delta_text)
symbols, edges = verify_delta(
    base_symbols, base_edges,
    d.removed, d.added, d.removed_edges, d.added_edges,
    d.new_root,
)  # raises ValueError on root_mismatch / delta_invalid
```

## Generic Delta (v3.3)

Delta encoding for the generic profile (SPEC Section 10a): a keyed diff over a tabular set, plus a producer-side session helper that re-anchors on a tunable cadence. Identity is one designated column (`key=` in the header, `@<key>` in the field declaration). All functions live in `gcf.generic_delta` and are re-exported from the top-level `gcf` package.

The Python surface follows Python idioms: functions that the Go reference returns as `(value, error)` instead return the value directly and raise `ValueError` on invalid input.

### `encode_generic_full(s: GenericSet, tool: str = "") -> str`

Emit a delta-participating full base payload: a `key=` header, the `@id` field declaration, and rows. Send this once to establish the base.

```python
from gcf import encode_generic_full, GenericSet

base = GenericSet(
    key="id",
    fields=["id", "total", "status"],
    rows=[
        {"id": 1001, "total": 59.98, "status": "shipped"},
        {"id": 1002, "total": 29.99, "status": "pending"},
    ],
    name="orders",
)

print(encode_generic_full(base, tool="orders_report"))
# GCF profile=generic tool=orders_report pack_root=sha256:... key=id
# ## orders [2]{@id,total,status}
# 1001|59.98|shipped
# 1002|29.99|pending
```

### `diff_generic_sets(base: GenericSet, nxt: GenericSet) -> GenericDeltaPayload`

Compute the added / changed / removed diff between two sets sharing the same key and fields. Rows are order-agnostic; unchanged rows are omitted. Raises `ValueError` on a schema change or missing key (the caller must then send a full payload, Section 10a.7).

```python
from gcf import diff_generic_sets

payload = diff_generic_sets(base, nxt)
```

### `encode_generic_delta(d: GenericDeltaPayload) -> str`

Serialize a delta payload. Sections are ordered `## added` / `## changed` / `## removed`; `## removed` carries identity values only.

```python
from gcf import encode_generic_delta

print(encode_generic_delta(payload))
# GCF profile=generic delta=true base_root=sha256:... new_root=sha256:... key=id
# ## changed [1]{@id,total,status}
# 1002|29.99|shipped
```

### `decode_generic_delta(text: str) -> GenericDeltaPayload`

Parse a delta payload back into a `GenericDeltaPayload`. Raises `ValueError` on malformed input.

### `encode_generic_full` / `decode_generic_full(text: str) -> tuple[GenericSet, str]`

`decode_generic_full` parses a full base payload into `(GenericSet, pack_root)`.

### `verify_generic_delta(base: GenericSet, d: GenericDeltaPayload, expected_new_root: str) -> GenericSet`

Apply a delta to `base` atomically and verify the result's pack root equals `expected_new_root`. On any failure (base-root mismatch, invalid add/change/remove, or a root mismatch) it raises `ValueError` and applies nothing; on success it returns the new `GenericSet`.

```python
from gcf import verify_generic_delta

new_set = verify_generic_delta(base, payload, payload.new_root)
```

### `GenericDeltaSession(base, tool, policy)`

Holds the current base and re-anchor state for a producer loop. Not safe for concurrent use. Call `current_full()` for the initial full payload to transmit, then `next(...)` for each subsequent state.

```python
from gcf import (
    GenericDeltaSession, GenericSet, size_guard, decode_generic_delta,
)

sess = GenericDeltaSession(base, "orders_report", size_guard())
send(sess.current_full())        # establish the base (turn 0)

for snapshot in stream_of_snapshots:      # each is a GenericSet
    wire, is_full = sess.next(snapshot)    # advance one turn
    send(wire)                             # full re-anchor or compact delta
```

`next(nxt: GenericSet) -> tuple[str, bool]` advances the session by one turn and returns `(wire, is_full)`: the wire to transmit and whether it is a full re-anchor (`True`) or a delta (`False`). A schema change forces a full (Section 10a.7). The wire is byte-identical to calling `encode_generic_full` / `encode_generic_delta` directly. The `turn` property reports the number of `next` calls so far (the initial full is turn 0).

### Re-anchor policy

Construct a policy with `fixed_n(n)` or `size_guard()`:

```python
from gcf import fixed_n, size_guard, DEFAULT_REANCHOR_N

fixed_n(20)          # re-anchor every 20 turns
fixed_n(0)           # n <= 0 falls back to DEFAULT_REANCHOR_N (15)
size_guard()         # size-adaptive; production-recommended
```

`size_guard()` re-anchors once the cumulative delta bytes since the last anchor reach the current full payload's byte size, bounding delta spend to about one full payload between anchors. This helper is non-normative producer policy: the cadence is never a wire field and never appears on the wire (Section 10a.8).

### `StreamEncoder(writer, tool, **opts)`

Create a streaming encoder that writes GCF incrementally. Zero buffering, thread-safe.

```python
enc = StreamEncoder(sys.stdout, "context_for_task", token_budget=5000)
enc.write_symbol(sym)  # emitted immediately
enc.write_edge(edge)   # emitted immediately
enc.close()            # emits ##! summary trailer
```

Pass `labeled_trailer_counts=True` to emit the `##! summary` trailer's `counts=` in the labeled form (`counts=targets:2,related:1,edges:3`) instead of the default positional form (`counts=2,1,3`), a comprehension aid for weaker consumers (SPEC §8.4.1).

## Types

All types are `@dataclass` instances from `gcf.types`.

### `Payload`

```python
@dataclass
class Payload:
    tool: str = ""
    tokens_used: int = 0
    token_budget: int = 0
    pack_root: str = ""
    symbols: list[Symbol] = field(default_factory=list)
    edges: list[Edge] = field(default_factory=list)
```

### `Symbol`

```python
@dataclass
class Symbol:
    qualified_name: str = ""
    kind: str = ""
    score: float = 0.0
    provenance: str = ""
    distance: int = 0
    signature: str = ""
    components: Components = field(default_factory=Components)
```

### `Edge`

```python
@dataclass
class Edge:
    source: str = ""
    target: str = ""
    edge_type: str = ""
    status: str = ""
```

### `DeltaPayload`

```python
@dataclass
class DeltaPayload:
    tool: str = ""
    base_root: str = ""
    new_root: str = ""
    removed: list[Symbol] = field(default_factory=list)
    added: list[Symbol] = field(default_factory=list)
    removed_edges: list[Edge] = field(default_factory=list)
    added_edges: list[Edge] = field(default_factory=list)
    delta_tokens: int = 0
    full_tokens: int = 0
```

### `GenericSet`

The keyed record set that generic-profile delta operates on. `key` names the identity column, `fields` carries the declared column order, `rows` are order-agnostic record dicts, and `name` is the tabular section name for a full payload.

```python
@dataclass
class GenericSet:
    key: str
    fields: list[str]
    rows: list[dict[str, Any]]
    name: str = "rows"
```

### `GenericDeltaPayload`

`removed` holds identity values only (not full rows).

```python
@dataclass
class GenericDeltaPayload:
    key: str
    fields: list[str]
    base_root: str = ""
    new_root: str = ""
    added: list[dict[str, Any]] = field(default_factory=list)
    changed: list[dict[str, Any]] = field(default_factory=list)
    removed: list[Any] = field(default_factory=list)
    tool: str = ""
    delta_tokens: int = 0
    full_tokens: int = 0
```

### `ReanchorPolicy` / `ReanchorMode`

Construct a `ReanchorPolicy` with `fixed_n()` or `size_guard()` rather than instantiating it directly. `DEFAULT_REANCHOR_N = 15`.

```python
class ReanchorMode(Enum):
    FIXED_N = 0     # re-anchor every N turns
    SIZE_GUARD = 1  # re-anchor once cumulative delta reaches the full payload's size

@dataclass
class ReanchorPolicy:
    mode: ReanchorMode = ReanchorMode.FIXED_N
    n: int = 0  # turns between anchors; FIXED_N only
```

### `Components`

```python
@dataclass
class Components:
    blast_radius: float = 0.0
    confidence: float = 0.0
    recency: float = 0.0
    distance: float = 0.0
```

### `Session`

```python
class Session:
    def transmitted(self, qname: str) -> bool: ...
    def get_id(self, qname: str) -> int: ...     # -1 if not found
    def record(self, symbols: list[Symbol]) -> None: ...
    def size(self) -> int: ...
    def reset(self) -> None: ...
```

Thread-safe via `threading.Lock`.

## Exceptions

### `DecodeError`

Raised by `decode()` on malformed GCF input.

```python
from gcf import decode, DecodeError

try:
    p = decode(invalid_text)
except DecodeError as e:
    print(f"Parse error: {e}")
```

## Constants

### `KIND_ABBREV`

```python
KIND_ABBREV: dict[str, str] = {
    "function": "fn", "type": "type", "method": "method",
    "interface": "iface", "var": "var", "const": "const",
    "class": "class", "field": "field", "route_handler": "route",
    "external": "ext", "file": "file", "package": "pkg",
    "service": "svc", "table": "table", "resource": "resource",
    "selector": "selector",
}
```

### `KIND_EXPAND`

Reverse of `KIND_ABBREV`.

## CLI

```bash
pip install gcf-python
python -m gcf encode-generic < data.json
python -m gcf decode-generic < data.gcf
```

| Command | Description |
|---------|-------------|
| `encode` | Encode graph payload (JSON stdin) to GCF |
| `decode` | Decode GCF graph text to JSON |
| `encode-generic` | Encode any JSON to GCF generic profile |
| `decode-generic` | Decode GCF generic profile to JSON |
| `stats` | Compare token counts: JSON vs GCF |
