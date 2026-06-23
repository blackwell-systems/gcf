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
    baseRoot = "aaa111",
    newRoot = "bbb222",
    removed = listOf(Symbol(qualifiedName = "pkg.Old", kind = "function")),
    added = listOf(Symbol(qualifiedName = "pkg.New", kind = "function", score = 0.85, provenance = "rwr")),
    deltaTokens = 30,
    fullTokens = 200
)

val output = encodeDelta(delta)
```

### `StreamEncoder(writer, tool, options?)`

Create a streaming encoder that writes GCF incrementally. Zero buffering, thread-safe via `@Synchronized`.

```kotlin
val enc = StreamEncoder(writer, "context_for_task", StreamOptions(tokenBudget = 5000))
enc.writeSymbol(sym)  // emitted immediately
enc.writeEdge(edge)   // emitted immediately
enc.close()           // emits ##! summary trailer
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
