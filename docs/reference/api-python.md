# API Reference (Python)

```bash
pip install gcf-python
```

## Functions

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
    base_root="aaa111",
    new_root="bbb222",
    removed=[Symbol(qualified_name="pkg.OldFunc", kind="function")],
    added=[Symbol(qualified_name="pkg.NewFunc", kind="function", score=0.85, provenance="rwr")],
    removed_edges=[Edge(source="pkg.Router", target="pkg.OldFunc", edge_type="calls")],
    added_edges=[Edge(source="pkg.Router", target="pkg.NewFunc", edge_type="calls")],
    delta_tokens=30,
    full_tokens=200,
))
```

### `encode_generic(data: Any) -> str`

Encode any Python value into GCF tabular format. Unlike `encode` (which handles the graph `Payload` type), `encode_generic` works on arbitrary dicts, lists, and primitives.

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
