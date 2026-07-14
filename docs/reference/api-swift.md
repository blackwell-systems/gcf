# API Reference (Swift)

```swift
.package(url: "https://github.com/blackwell-systems/gcf-swift", from: "2.4.0")
```

## Functions

### `encodeGeneric(_ data: Any?, opts: GenericOptions = GenericOptions()) -> String`

Encode any value into GCF tabular format. Uniform object arrays get tabular rows. Primitive arrays are inlined (`tags[3]: a,b,c`). Nested objects use `## key` section headers.

Pass `GenericOptions(noFlatten: true)` to use expanded encoding for nested objects (open-weight models currently comprehend this form better; GCF still outperforms JSON either way).

```swift
import GCF

let output = encodeGeneric([
    "employees": [
        ["id": 1, "name": "Alice", "department": "Engineering", "salary": 95000],
        ["id": 2, "name": "Bob", "department": "Sales", "salary": 72000],
    ]
])
// ## employees [2]{department,id,name,salary}
// Engineering|1|Alice|95000
// Sales|2|Bob|72000
```

### `decodeGeneric(_ input: String) throws -> Any`

Decode GCF generic or graph profile text back into Swift values. Returns `OrderedDictionary` for objects (preserving key insertion order), `[Any]` for arrays, or scalar values.

```swift
let data = try decodeGeneric(gcfText)
// data is OrderedDictionary, [Any], String, Int, Double, Bool, or NSNull
```

### `encode(_ payload: Payload) -> String`

Encode a Payload into GCF text format.

```swift
import GCF

let p = Payload(
    tool: "context_for_task",
    tokenBudget: 5000,
    tokensUsed: 1847,
    symbols: [
        Symbol(qualifiedName: "pkg.Auth", kind: "function", score: 0.78, provenance: "lsp_resolved")
    ]
)

let output = encode(p)
```

### `decode(_ input: String) throws -> Payload`

Parse GCF text back into a Payload. Throws `DecodeError` on malformed input.

```swift
import GCF

let p = try decode(gcfText)
print(p.tool, p.symbols.count)
```

### `encodeWithSession(_ payload: Payload, session: Session?) -> String`

Encode with session deduplication. Thread-safe (uses NSLock internally).

```swift
import GCF

let session = Session()
let out1 = encodeWithSession(payload1, session: session) // full declarations
let out2 = encodeWithSession(payload2, session: session) // bare refs for known symbols
```

### `encodeDelta(_ delta: DeltaPayload) -> String`

Encode a delta payload (only added/removed symbols and edges).

```swift
import GCF

let delta = DeltaPayload(
    tool: "context_for_task",
    baseRoot: "sha256:aaa111...",
    newRoot: "sha256:bbb222...",
    removed: [Symbol(qualifiedName: "pkg.Old", kind: "function")],
    added: [Symbol(qualifiedName: "pkg.New", kind: "function", score: 0.85, provenance: "rwr")],
    deltaTokens: 30,
    fullTokens: 200
)

let output = encodeDelta(delta)
```

### `packRoot(symbols: [Symbol], edges: [Edge]) -> String`

Content-addressed pack root (`gcf-pack-root-v1`, SPEC Section 10.2) of a graph snapshot: a deterministic SHA-256 over canonical, independently-sorted symbol and edge records. Byte-identical across all six SDKs; this is the value carried in `pack_root` / `base_root` / `new_root`.

### `decodeDelta(_ wire: String) throws -> DeltaPayload`

Parse a graph delta wire (`GCF profile=graph delta=true ...`) back into a `DeltaPayload`. The inverse of `encodeDelta`. Throws `DeltaError` on malformed input.

### `verifyDelta(baseSymbols:baseEdges:removed:added:removedEdges:addedEdges:expectedNewRoot:) throws -> (symbols: [Symbol], edges: [Edge])`

Apply a decoded delta to a base snapshot atomically, then verify the recomputed `packRoot` equals `expectedNewRoot` (SPEC Section 10.4). Returns the applied `(symbols, edges)`. Throws `DeltaError` with `delta_invalid` when a removal targets a symbol not in the base or an addition already exists, or `root_mismatch` when the recomputed root differs.

```swift
let d = try decodeDelta(deltaText)
let (symbols, edges) = try verifyDelta(
    baseSymbols: baseSymbols, baseEdges: baseEdges,
    removed: d.removed, added: d.added,
    removedEdges: d.removedEdges, addedEdges: d.addedEdges,
    expectedNewRoot: d.newRoot
) // throws DeltaError (root_mismatch / delta_invalid)
```

### `StreamEncoder(writer:tool:options:)`

Create a streaming encoder that writes GCF incrementally. Zero buffering, thread-safe via NSLock.

```swift
let enc = StreamEncoder(writer: myWriter, tool: "context_for_task", options: StreamOptions(tokenBudget: 5000))
enc.writeSymbol(sym)  // emitted immediately
enc.writeEdge(edge)   // emitted immediately
enc.close()           // emits ##! summary trailer
```

Pass `labeledTrailerCounts: true` to `StreamOptions` to emit the `##! summary` trailer's `counts=` in the labeled form (`counts=targets:2,related:1,edges:3`) instead of the default positional form (`counts=2,1,3`), a comprehension aid for weaker consumers (SPEC §8.4.1).

## Generic Delta (v3.3)

Delta encoding for the generic profile (SPEC Section 10a): a keyed diff over a tabular set, plus a producer-side session helper that re-anchors on a tunable cadence. Identity is one designated column (`key=` in the header, `@<key>` in the field declaration).

### `GenericSet`

The keyed record set that generic-profile delta operates on. Rows are order-agnostic (set semantics); `fields` carries the declared column order; `key` names the identity column; `name` is the tabular section name for a full payload (`""` for a root array).

```swift
public struct GenericSet {
    public var name: String
    public var key: String
    public var fields: [String]
    public var rows: [[String: Any]]

    public init(name: String = "", key: String, fields: [String], rows: [[String: Any]])
}
```

### `encodeGenericFull(_ s: GenericSet, tool: String) -> String`

Emit a delta-ready full base payload: `key=` in the header, an `@`-prefixed identity field in the declaration, pipe-separated rows.

```swift
import GCF

let base = GenericSet(
    name: "orders",
    key: "id",
    fields: ["id", "total", "status"],
    rows: [
        ["id": 1, "total": 100, "status": "open"],
        ["id": 2, "total": 250, "status": "shipped"],
    ]
)

let full = encodeGenericFull(base, tool: "orders_query")
// GCF profile=generic tool=orders_query pack_root=sha256:... key=id
// ## orders [2]{@id,total,status}
// 1|100|open
// 2|250|shipped
```

### `diffGenericSets(_ base: GenericSet, _ next: GenericSet) throws -> GenericDeltaPayload`

Compute the added/changed/removed diff between two sets that share the same `key` and `fields`. Unchanged rows are omitted (silence means "keep it"). Throws `GenericDeltaError` on a schema change or a missing key: the caller must then send a full payload (Section 10a.7).

```swift
let payload = try diffGenericSets(base, next)
```

### `encodeGenericDelta(_ d: GenericDeltaPayload) -> String`

Serialize a delta payload. Sections are emitted in the deterministic order `## added` / `## changed` / `## removed`.

```swift
let wire = encodeGenericDelta(payload)
// GCF profile=generic tool=orders_query delta=true base_root=sha256:... new_root=sha256:... key=id
// ## changed [1]{@id,total,status}
// 2|250|delivered
```

### `decodeGenericDelta(_ text: String) throws -> GenericDeltaPayload`

Parse delta wire text back into a `GenericDeltaPayload`. The result can be applied with `verifyGenericDelta`.

```swift
let payload = try decodeGenericDelta(wire)
```

### `verifyGenericDelta(_ base: GenericSet, _ d: GenericDeltaPayload, expectedNewRoot: String) throws -> GenericSet`

Apply the delta to `base` atomically and verify the result's pack root equals `expectedNewRoot` (Section 10a.5). The whole payload is validated before any state changes, so a mismatch leaves the base untouched and applies nothing. Returns the new set on success.

```swift
let newSet = try verifyGenericDelta(base, payload, expectedNewRoot: payload.newRoot)
```

### `decodeGenericFull(_ text: String) throws -> (set: GenericSet, packRoot: String)`

Parse a delta-participating full base payload into a `GenericSet` and return the declared `pack_root`.

```swift
let (set, packRoot) = try decodeGenericFull(full)
```

### `genericPackRoot(_ s: GenericSet) -> String`

Compute the canonical pack root (`gcf-pack-root-v1`, generic profile, Section 10a.3) for a keyed set. Two implementations given the same logical set produce the same result.

```swift
let root = genericPackRoot(base) // "sha256:..."
```

### Session helper: `GenericDeltaSession`

A producer-side helper that manages the re-anchor cadence for a stream of generic-profile updates (SPEC Section 10a.8, non-normative producer policy). It is thin sugar over the primitives: each `next(_:)` emits either a compact delta or, on its chosen cadence, a full re-anchor, updating its held base. It introduces no new wire syntax, and the cadence never appears on the wire. Not safe for concurrent use.

```swift
public final class GenericDeltaSession {
    public init(base: GenericSet, tool: String, policy: ReanchorPolicy)
    public var currentTurn: Int { get }        // next(_:) calls so far; initial full is turn 0
    public func currentFull() -> String        // send first; also a valid manual re-anchor
    public func next(_ next: GenericSet) throws -> (wire: String, isFull: Bool)
}
```

`next(_:)` advances the session by one turn to `next`, returning the wire to transmit and whether it is a full re-anchor (`true`) or a delta (`false`). A schema change forces a full (Section 10a.7); the held base becomes `next` either way.

```swift
let session = GenericDeltaSession(base: base, tool: "orders_query", policy: .sizeGuard)
send(session.currentFull())            // turn 0: establish the base

for state in laterStates {
    let (wire, isFull) = try session.next(state)
    send(wire)                         // compact delta, or a full on the re-anchor cadence
    _ = isFull
}
```

### `ReanchorPolicy`

Selects when a `GenericDeltaSession` re-anchors. The default N is `15` (`DEFAULT_REANCHOR_N`).

```swift
public enum ReanchorPolicy {
    case fixedN(Int)   // re-anchor every N turns
    case sizeGuard     // size-adaptive; re-anchor once cumulative delta reaches one full payload

    public static func fixed(_ n: Int) -> ReanchorPolicy   // n <= 0 clamps to DEFAULT_REANCHOR_N
}
```

Construct `.fixedN` via `ReanchorPolicy.fixed(_:)` so that `n <= 0` clamps to `DEFAULT_REANCHOR_N` (15). `.sizeGuard` re-anchors more under heavy churn and rarely under light churn, bounding the delta spent between anchors to about one full payload; it is production-recommended for varying churn. This helper is non-normative, and the cadence never appears on the wire (Section 10a.8).

### `GenericDeltaPayload`

```swift
public struct GenericDeltaPayload {
    public var tool: String
    public var key: String
    public var fields: [String]
    public var baseRoot: String
    public var newRoot: String
    public var added: [[String: Any]]
    public var changed: [[String: Any]]
    public var removed: [Any]           // identity values only
    public var deltaTokens: Int
    public var fullTokens: Int
}
```

### `GenericDeltaError`

```swift
public struct GenericDeltaError: Error, CustomStringConvertible {
    public let message: String
    public var description: String { get }
}
```

## Types

### `Payload`

```swift
public struct Payload: Codable, Equatable {
    public var tool: String
    public var tokensUsed: Int
    public var tokenBudget: Int
    public var packRoot: String
    public var symbols: [Symbol]
    public var edges: [Edge]
}
```

### `Symbol`

```swift
public struct Symbol: Codable, Equatable {
    public var qualifiedName: String
    public var kind: String
    public var score: Double
    public var provenance: String
    public var distance: Int
    public var signature: String
    public var components: Components
}
```

### `Edge`

```swift
public struct Edge: Codable, Equatable {
    public var source: String
    public var target: String
    public var edgeType: String
    public var status: String
}
```

### `DeltaPayload`

```swift
public struct DeltaPayload: Codable, Equatable {
    public var tool: String
    public var baseRoot: String
    public var newRoot: String
    public var removed: [Symbol]
    public var added: [Symbol]
    public var removedEdges: [Edge]
    public var addedEdges: [Edge]
    public var deltaTokens: Int
    public var fullTokens: Int
}
```

### `Session`

```swift
public class Session {
    public func transmitted(_ qname: String) -> Bool
    public func getID(_ qname: String) -> Int
    public func record(_ symbols: [Symbol])
    public func reset()
}
```

Thread-safe via NSLock.

### `DecodeError`

```swift
public enum DecodeError: Error, Equatable, CustomStringConvertible {
    case emptyInput
    case invalidHeader(String)
    case invalidSymbolLine(String)
    case tooFewSymbolFields(String)
    case invalidScore(String)
    case invalidEdgeLine(String)
    case unknownEdgeID(String)
    case malformedDelta(String)
}
```

## CLI

```bash
# In Package.swift: .package(url: "https://github.com/blackwell-systems/gcf-swift", from: "2.4.0")
swift run GCFCLI encode-generic < data.json
swift run GCFCLI decode-generic < data.gcf
```

| Command | Description |
|---------|-------------|
| `encode` | Encode graph payload (JSON stdin) to GCF |
| `decode` | Decode GCF graph text to JSON |
| `encode-generic` | Encode any JSON to GCF generic profile |
| `decode-generic` | Decode GCF generic profile to JSON |
| `version` | Print version |
