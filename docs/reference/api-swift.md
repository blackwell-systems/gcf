# API Reference (Swift)

```swift
.package(url: "https://github.com/blackwell-systems/gcf-swift", from: "0.3.0")
```

## Functions

### `encodeGeneric(_ data: Any) -> String`

Encode any value into GCF tabular format. Uniform object arrays get tabular rows. Primitive arrays are inlined (`tags[3]: a,b,c`). Nested objects use `## key` section headers.

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

### `encodeWithSession(_ payload: Payload, session: Session) -> String`

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
    baseRoot: "aaa111",
    newRoot: "bbb222",
    removed: [Symbol(qualifiedName: "pkg.Old", kind: "function")],
    added: [Symbol(qualifiedName: "pkg.New", kind: "function", score: 0.85, provenance: "rwr")],
    deltaTokens: 30,
    fullTokens: 200
)

let output = encodeDelta(delta)
```

### `StreamEncoder(writer:tool:options:)`

Create a streaming encoder that writes GCF incrementally. Zero buffering, thread-safe via NSLock.

```swift
let enc = StreamEncoder(writer: myWriter, tool: "context_for_task", options: StreamOptions(tokenBudget: 5000))
enc.writeSymbol(sym)  // emitted immediately
enc.writeEdge(edge)   // emitted immediately
enc.close()           // emits ##! summary trailer
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
    public func getID(_ qname: String) -> Int?
    public func record(_ symbols: [Symbol])
    public func size() -> Int
    public func reset()
}
```

Thread-safe via NSLock.

### `DecodeError`

```swift
public enum DecodeError: Error, CustomStringConvertible {
    case emptyInput
    case invalidHeader(String)
    case missingTool
    case invalidSymbolLine(String)
    case invalidEdgeLine(String)
    case unknownEdgeReference(String)
}
```
