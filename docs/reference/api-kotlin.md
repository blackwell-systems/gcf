# API Reference (Kotlin)

```kotlin
// build.gradle.kts
repositories {
    maven("https://jitpack.io")
}
dependencies {
    implementation("com.github.blackwell-systems:gcf-kotlin:0.1.0")
}
```

## Functions

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
    baseRoot = "aaa111",
    newRoot = "bbb222",
    removed = listOf(Symbol(qualifiedName = "pkg.Old", kind = "function")),
    added = listOf(Symbol(qualifiedName = "pkg.New", kind = "function", score = 0.85, provenance = "rwr")),
    deltaTokens = 30,
    fullTokens = 200
)

val output = encodeDelta(delta)
```

### `encodeGeneric(data: Any?): String`

Encode any value into GCF tabular format. Uniform object arrays get tabular rows. Primitive arrays are inlined (`tags[3]: a,b,c`). Nested objects use `## key` section headers.

```kotlin
import com.blackwellsystems.gcf.*

val output = encodeGeneric(mapOf(
    "employees" to listOf(
        mapOf("id" to 1, "name" to "Alice", "department" to "Engineering", "salary" to 95000),
        mapOf("id" to 2, "name" to "Bob", "department" to "Sales", "salary" to 72000),
    )
))
```

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
