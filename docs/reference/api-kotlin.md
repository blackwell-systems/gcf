# API Reference (Kotlin)

```kotlin
// build.gradle.kts
repositories {
    maven("https://jitpack.io")
}
dependencies {
    implementation("com.github.blackwell-systems:gcf-kotlin:2.4.0")
}
```

## Functions

### `encodeGeneric(data: Any?, opts: GenericOptions = GenericOptions()): String`

Encode any value into GCF tabular format. Uniform object arrays get tabular rows. Primitive arrays are inlined (`tags[3]: a,b,c`). Nested objects use `## key` section headers.

Pass `GenericOptions(noFlatten = true)` to use expanded encoding for nested objects (open-weight models currently comprehend this form better; GCF still outperforms JSON either way).

```kotlin
import com.blackwellsystems.gcf.*

val output = encodeGeneric(mapOf(
    "employees" to listOf(
        mapOf("id" to 1, "name" to "Alice", "department" to "Engineering", "salary" to 95000),
        mapOf("id" to 2, "name" to "Bob", "department" to "Sales", "salary" to 72000),
    )
))
```

### `decodeGeneric(input: String): Any?`

Decode GCF generic or graph profile text back into Kotlin values. Returns maps, lists, or scalar values.

```kotlin
val data = decodeGeneric(gcfText)
// data is Map, List, String, Int, Double, Boolean, or null
```

### `encode(payload: Payload): String`

Encode a Payload into GCF text format.

```kotlin
import com.blackwellsystems.gcf.*

val p = Payload(
    tool = "context_for_task",
    tokenBudget = 5000,
    tokensUsed = 1847,
    symbols = listOf(
        Symbol(qualifiedName = "pkg.Auth", kind = "function", score = 0.78, provenance = "lsp_resolved")
    )
)

val output = encode(p)
```

### `decode(input: String): Payload`

Parse GCF text back into a Payload. Throws `DecodeException` on malformed input.

```kotlin
import com.blackwellsystems.gcf.*

val p = decode(gcfText)
println("${p.tool} ${p.symbols.size} symbols")
```

### `encodeWithSession(payload: Payload, session: Session): String`

Encode with session deduplication. Thread-safe (synchronized).

```kotlin
import com.blackwellsystems.gcf.*

val session = Session()
val out1 = encodeWithSession(payload1, session) // full declarations
val out2 = encodeWithSession(payload2, session) // bare refs for known symbols
```

### `encodeDelta(delta: DeltaPayload): String`

Encode a delta payload (only added/removed symbols and edges).

```kotlin
import com.blackwellsystems.gcf.*

val delta = DeltaPayload(
    tool = "context_for_task",
    baseRoot = "sha256:aaa111...",
    newRoot = "sha256:bbb222...",
    removed = listOf(Symbol(qualifiedName = "pkg.Old", kind = "function")),
    added = listOf(Symbol(qualifiedName = "pkg.New", kind = "function", score = 0.85, provenance = "rwr")),
    deltaTokens = 30,
    fullTokens = 200
)

val output = encodeDelta(delta)
```

### `packRoot(symbols: List<Symbol>, edges: List<Edge>): String`

Content-addressed pack root (`gcf-pack-root-v1`, SPEC Section 10.2) of a graph snapshot: a deterministic SHA-256 over canonical, independently-sorted symbol and edge records. Byte-identical across all six SDKs; this is the value carried in `pack_root` / `base_root` / `new_root`.

### `decodeDelta(wire: String): DeltaPayload`

Parse a graph delta wire (`GCF profile=graph delta=true ...`) back into a `DeltaPayload`. The inverse of `encodeDelta`. Throws `IllegalArgumentException` on malformed input.

### `verifyDelta(baseSymbols, baseEdges, removed, added, removedEdges, addedEdges, expectedNewRoot): Pair<List<Symbol>, List<Edge>>`

Apply a decoded delta to a base snapshot atomically, then verify the recomputed `packRoot` equals `expectedNewRoot` (SPEC Section 10.4). Returns the applied `(symbols, edges)` pair. Throws `IllegalArgumentException` with `delta_invalid` when a removal targets a symbol not in the base or an addition already exists, or `root_mismatch` when the recomputed root differs.

```kotlin
val d = decodeDelta(deltaText)
val (symbols, edges) = verifyDelta(
    baseSymbols, baseEdges,
    d.removed, d.added, d.removedEdges, d.addedEdges,
    d.newRoot,
) // throws IllegalArgumentException (root_mismatch / delta_invalid)
```

### `StreamEncoder(writer, tool, options?)`

Create a streaming encoder that writes GCF incrementally. Zero buffering, thread-safe via `@Synchronized`.

```kotlin
val enc = StreamEncoder(writer, "context_for_task", StreamOptions(tokenBudget = 5000))
enc.writeSymbol(sym)  // emitted immediately
enc.writeEdge(edge)   // emitted immediately
enc.close()           // emits ##! summary trailer
```

Pass `labeledTrailerCounts = true` to `StreamOptions` to emit the `##! summary` trailer's `counts=` in the labeled form (`counts=targets:2,related:1,edges:3`) instead of the default positional form (`counts=2,1,3`), a comprehension aid for weaker consumers (SPEC §8.4.1).

## Generic Delta (v3.3)

Delta encoding for the generic profile (SPEC Section 10a): a keyed diff over a tabular set, plus a producer-side session helper that re-anchors on a tunable cadence. Identity is one designated column (`key=` in the header, `@<key>` in the field declaration). Delta is opt-in and bilateral; the plain `encodeGeneric` path is unchanged.

### `encodeGenericFull(s: GenericSet, tool: String): String`

Encode a delta-ready full payload: `key=` in the header, an `@`-prefixed identity field in the declaration, pipe-separated rows.

```kotlin
import com.blackwellsystems.gcf.*

val orders = GenericSet(
    name = "orders",
    key = "id",
    fields = listOf("id", "total", "status"),
    rows = listOf(
        mapOf("id" to 1001, "total" to 59.98, "status" to "shipped"),
        mapOf("id" to 1002, "total" to 29.99, "status" to "pending"),
    ),
)

val full = encodeGenericFull(orders, "orders_query")
// GCF profile=generic tool=orders_query pack_root=sha256:... key=id
// ## orders [2]{@id,total,status}
// 1001|59.98|shipped
// 1002|29.99|pending
```

### `diffGenericSets(base: GenericSet, next: GenericSet): GenericDeltaPayload`

Compute the added / changed / removed diff between two sets sharing the same key and fields. Enforces the keyed-diff invariants (identity uniqueness, whole-row replacement, unchanged rows omitted); added/changed/removed are sorted by identity for reproducible output. Throws `IllegalArgumentException` on a schema change or a missing key (the caller must then send a full payload).

```kotlin
val delta = diffGenericSets(base, next)
```

### `encodeGenericDelta(d: GenericDeltaPayload): String`

Serialize a delta payload. Sections are emitted in the deterministic order `## added` / `## changed` / `## removed`.

```kotlin
val wire = encodeGenericDelta(delta)
```

### `decodeGenericDelta(text: String): GenericDeltaPayload`

Parse a delta payload back into a `GenericDeltaPayload`. The result can be applied with `verifyGenericDelta`.

```kotlin
val payload = decodeGenericDelta(wire)
```

### `decodeGenericFull(text: String): Pair<GenericSet, String>`

Parse a delta-participating full base payload into a `GenericSet` and its declared `pack_root`.

```kotlin
val (set, packRoot) = decodeGenericFull(full)
```

### `verifyGenericDelta(base: GenericSet, d: GenericDeltaPayload, expectedNewRoot: String): GenericSet`

Apply a delta to `base` atomically and verify the result's pack root equals `expectedNewRoot`. The whole payload is validated before any state changes; a mismatch throws `IllegalArgumentException` and leaves the base untouched. Returns the new set.

```kotlin
val updated = verifyGenericDelta(base, delta, delta.newRoot)
```

### `genericPackRoot(s: GenericSet): String`

Compute the canonical pack root (`gcf-pack-root-v1`, generic profile) for a keyed set. Two implementations given the same logical set produce the same result.

```kotlin
val root = genericPackRoot(orders) // "sha256:..."
```

### `GenericSet`

A keyed record set: the unit generic-profile delta operates on. Rows are order-agnostic (set semantics).

```kotlin
data class GenericSet(
    val key: String,               // identity column (the @id / key=)
    val fields: List<String>,      // declared column order for the wire form
    val rows: List<Map<String, Any?>>,
    val name: String = "",         // tabular section name for a full payload ("" for root)
)
```

### `GenericDeltaPayload`

A diff between two `GenericSet`s.

```kotlin
data class GenericDeltaPayload(
    val key: String,
    val fields: List<String>,
    val baseRoot: String,
    val newRoot: String = "",
    val added: List<Map<String, Any?>> = emptyList(),
    val changed: List<Map<String, Any?>> = emptyList(),
    val removed: List<Any?> = emptyList(), // identity values only
    val tool: String = "",
    val deltaTokens: Int = 0,
    val fullTokens: Int = 0,
)
```

### `GenericDeltaSession`

A producer-side helper that manages the re-anchor cadence for a stream of generic-profile updates (SPEC Section 10a.8, non-normative producer policy). Each `next` emits either a compact delta or, on its chosen cadence, a full re-anchor, updating the held base. It introduces no new wire syntax: every payload it emits is exactly what `encodeGenericFull` or `encodeGenericDelta` produce, and the decoder accepts them cadence-agnostically. Not safe for concurrent use.

```kotlin
class GenericDeltaSession(
    base: GenericSet,
    tool: String,
    policy: ReanchorPolicy,
) {
    var turn: Int          // number of next() calls so far (initial full is turn 0)
        private set
    fun currentFull(): String              // send first; also a manual re-anchor
    fun next(next: GenericSet): Pair<String, Boolean> // (wire, isFull)
}
```

`next` advances the session by one turn, returning the wire to transmit and whether it is a full re-anchor (`true`) or a delta (`false`). A schema change forces a full (Section 10a.7); the held base becomes `next` either way.

```kotlin
val session = GenericDeltaSession(base, "orders_query", ReanchorPolicy.SizeGuard)
send(session.currentFull())                 // establish the base (turn 0)

for (snapshot in updates) {
    val (wire, isFull) = session.next(snapshot)
    send(wire)                              // compact delta, or a full on the cadence
}
```

### `ReanchorPolicy`

Selects when a `GenericDeltaSession` re-anchors. Non-normative producer policy: it introduces no wire syntax and never appears on the wire (SPEC Section 10a.8).

```kotlin
sealed interface ReanchorPolicy {
    data class FixedN(val n: Int) : ReanchorPolicy // re-anchor every n turns
    data object SizeGuard : ReanchorPolicy         // size-adaptive, recommended
}
```

`ReanchorPolicy.FixedN(n)` re-anchors every `n` turns; `n <= 0` falls back to the default `DEFAULT_REANCHOR_N` (15). `ReanchorPolicy.SizeGuard` is size-adaptive (more anchors under heavy churn, fewer under light churn, bounding the delta spent between anchors to about one full payload) and is the production-recommended choice.

## Types

### `Payload`

```kotlin
@Serializable
data class Payload(
    val tool: String = "",
    val tokensUsed: Int = 0,
    val tokenBudget: Int = 0,
    val packRoot: String = "",
    val symbols: List<Symbol> = emptyList(),
    val edges: List<Edge> = emptyList()
)
```

### `Symbol`

```kotlin
@Serializable
data class Symbol(
    val qualifiedName: String = "",
    val kind: String = "",
    val score: Double = 0.0,
    val provenance: String = "",
    val distance: Int = 0,
    val signature: String = "",
    val components: Components = Components()
)
```

### `Edge`

```kotlin
@Serializable
data class Edge(
    val source: String = "",
    val target: String = "",
    val edgeType: String = "",
    val status: String = ""
)
```

### `Session`

```kotlin
class Session {
    @Synchronized fun transmitted(qname: String): Boolean
    @Synchronized fun getID(qname: String): Int?
    @Synchronized fun record(symbols: List<Symbol>)
    @Synchronized fun size(): Int
    @Synchronized fun reset()
}
```

### `DecodeException`

```kotlin
class DecodeException(message: String) : Exception(message)
```

## CLI

```bash
# Using Gradle
echo '{"name":"Alice"}' | ./gradlew run --args="encode-generic" -q

# Using fat jar
java -jar build/libs/gcf.jar encode-generic < data.json
java -jar build/libs/gcf.jar decode-generic < data.gcf
```

| Command | Description |
|---------|-------------|
| `encode` | Encode graph payload (JSON stdin) to GCF |
| `decode` | Decode GCF graph text to JSON |
| `encode-generic` | Encode any JSON to GCF generic profile |
| `decode-generic` | Decode GCF generic profile to JSON |
| `version` | Print version |
