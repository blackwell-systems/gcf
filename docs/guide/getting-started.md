# Getting Started

GCF is a drop-in replacement for JSON in AI pipelines.

Encode any structured data as GCF before sending it to an LLM. The model reads it natively with zero format instructions. `decode()` converts back to JSON when a human needs to see it.

- **79% fewer input tokens.** 11,090 vs 53,341 for JSON at 500 records.
- **63% fewer output tokens.** 5,976 bytes vs 16,121 for JSON at 100 symbols.
- **90.7% comprehension accuracy** across 10 models and 3 providers, where JSON averages 53.6%.
- **Four models hit 100%.** Claude Sonnet, Gemini 2.5 Pro, Gemini 3.1 Pro, Gemini 3.5 Flash.
- **Zero training.** No model has ever seen GCF in training data. Every frontier model reads it natively.

## Why not just use JSON?

JSON works at small scale. At 8 records, every format scores near 100%. The problems start when payloads grow.

At 500 records, JSON scores [53.6% comprehension accuracy](/guide/benchmarks) across 10 models. GPT-5.5 [returns empty strings](https://github.com/blackwell-systems/gcf/tree/main/eval/results). Claude Opus spends [143 lines manually enumerating symbols](https://github.com/blackwell-systems/gcf/blob/main/eval/results/artifacts/opus-json-enumeration-failure.md) and still gets the wrong answer. The repeated field names (`"qualified_name":`, `"kind":`, `"score":` on every record) consume 53,341 tokens of structural noise that overwhelms the model's attention.

GCF declares field names once in a header. Rows are positional values. The same 500-record payload uses 11,090 tokens and scores [90.7% accuracy](/guide/benchmarks). Four models hit 100%.

The format designed for human readability is incomprehensible to the systems actually reading it. [Full benchmark data](/guide/eval-results).

## When to use GCF

**Tool responses** (input to LLM):
- Any MCP tool response with arrays of objects
- API responses, database query results, search results
- Log entries, telemetry, event streams
- Code intelligence results (symbols, call graphs, dependencies)

**Agent output** (produced by LLM):
- Agent-to-agent communication in multi-agent workflows
- Structured output where you want to minimize output tokens
- Any case where the model returns structured data

GCF is most effective when:
- Payloads contain **repeated structures** (arrays of similar objects)
- Records have **relationships** between them (edges, references)
- You're operating under a **token budget** (context windows are finite)
- You make **multiple calls** in a session (session dedup compounds savings)
- You want **cheaper output** (63% fewer tokens than JSON, 33% fewer than TOON)

## When NOT to use GCF

- Single scalar values (just return the value)
- Systems that require JSON schema validation: call `decodeGeneric()` first, then validate the decoded object with any JSON Schema validator. The schema validates the data structure, not the wire encoding.
- Consumers that can't parse non-JSON (use the [MCP proxy](/guide/proxy) to bridge)

## "But I need human-readable output"

Use GCF for the wire format and JSON for the display format. The agent reads GCF (cheap: 79% fewer tokens in the context window), does its work, then calls `decode()` at the end to render JSON for a human. The context window savings are already banked. Readability is a last-mile rendering concern, not a wire format property.

## Install

::: code-group

```bash [Python]
pip install gcf-python
```

```bash [TypeScript]
npm install @blackwell-systems/gcf
```

```bash [Go]
go get github.com/blackwell-systems/gcf-go
```

```bash [Rust]
cargo add gcf
```

```bash [Swift]
# Package.swift
.package(url: "https://github.com/blackwell-systems/gcf-swift", from: "0.5.0")
```

```bash [Kotlin]
# build.gradle.kts
implementation("com.github.blackwell-systems:gcf-kotlin:v0.5.0")
```

:::

## Encode your first payload

::: code-group

```python [Python]
from gcf import encode_generic

output = encode_generic({
    "employees": [
        {"id": 1, "name": "Alice", "department": "Engineering", "salary": 95000},
        {"id": 2, "name": "Bob", "department": "Sales", "salary": 72000},
    ],
})
print(output)
```

```typescript [TypeScript]
import { encodeGeneric } from '@blackwell-systems/gcf';

const output = encodeGeneric({
  employees: [
    { id: 1, name: 'Alice', department: 'Engineering', salary: 95000 },
    { id: 2, name: 'Bob', department: 'Sales', salary: 72000 },
  ],
});
console.log(output);
```

```go [Go]
output := gcf.EncodeGeneric(map[string]any{
    "employees": []map[string]any{
        {"id": 1, "name": "Alice", "department": "Engineering", "salary": 95000},
        {"id": 2, "name": "Bob", "department": "Sales", "salary": 72000},
    },
})
fmt.Println(output)
```

```rust [Rust]
use gcf::encode_generic;
use serde_json::json;

let output = encode_generic(&json!({
    "employees": [
        {"id": 1, "name": "Alice", "department": "Engineering", "salary": 95000},
        {"id": 2, "name": "Bob", "department": "Sales", "salary": 72000},
    ]
}));
println!("{}", output);
```

```swift [Swift]
import GCF

let output = GCF.encodeGeneric([
    "employees": [
        ["id": 1, "name": "Alice", "department": "Engineering", "salary": 95000],
        ["id": 2, "name": "Bob", "department": "Sales", "salary": 72000],
    ]
])
print(output)
```

```kotlin [Kotlin]
import com.blackwellsystems.gcf.encodeGeneric

val output = encodeGeneric(mapOf(
    "employees" to listOf(
        mapOf("id" to 1, "name" to "Alice", "department" to "Engineering", "salary" to 95000),
        mapOf("id" to 2, "name" to "Bob", "department" to "Sales", "salary" to 72000),
    )
))
println(output)
```

:::

**Output:**

```
## employees [2]{id,name,department,salary}
1|Alice|Engineering|95000
2|Bob|Sales|72000
```

One header declares field names. Rows are positional values only. No field names repeated per record. Works on any structured JSON.

## Graph profile (code intelligence, MCP tools)

For code graph data with symbols, edges, and distance groups, use the graph profile:

::: code-group

```python [Python]
from gcf import encode, Payload, Symbol, Edge

output = encode(Payload(
    tool="context_for_task",
    token_budget=5000,
    tokens_used=1847,
    symbols=[
        Symbol(qualified_name="pkg.Auth", kind="function", score=0.78, provenance="lsp", distance=0),
        Symbol(qualified_name="pkg.Server", kind="function", score=0.54, provenance="lsp", distance=1),
    ],
    edges=[Edge(source="pkg.Server", target="pkg.Auth", edge_type="calls")],
))
```

```typescript [TypeScript]
import { encode, type Payload } from '@blackwell-systems/gcf';

const output = encode({
  tool: 'context_for_task',
  tokenBudget: 5000,
  tokensUsed: 1847,
  symbols: [
    { qualifiedName: 'pkg.Auth', kind: 'function', score: 0.78, provenance: 'lsp', distance: 0 },
    { qualifiedName: 'pkg.Server', kind: 'function', score: 0.54, provenance: 'lsp', distance: 1 },
  ],
  edges: [{ source: 'pkg.Server', target: 'pkg.Auth', edgeType: 'calls' }],
});
```

```go [Go]
output := gcf.Encode(&gcf.Payload{
    Tool: "context_for_task", TokenBudget: 5000, TokensUsed: 1847,
    Symbols: []gcf.Symbol{
        {QualifiedName: "pkg.Auth", Kind: "function", Score: 0.78, Provenance: "lsp", Distance: 0},
        {QualifiedName: "pkg.Server", Kind: "function", Score: 0.54, Provenance: "lsp", Distance: 1},
    },
    Edges: []gcf.Edge{{Source: "pkg.Server", Target: "pkg.Auth", EdgeType: "calls"}},
})
```

```rust [Rust]
use gcf::{encode, Payload, Symbol, Edge};

let output = encode(&Payload {
    tool: "context_for_task".into(),
    token_budget: 5000,
    tokens_used: 1847,
    symbols: vec![
        Symbol { qualified_name: "pkg.Auth".into(), kind: "function".into(), score: 0.78, provenance: "lsp".into(), distance: 0, ..Default::default() },
        Symbol { qualified_name: "pkg.Server".into(), kind: "function".into(), score: 0.54, provenance: "lsp".into(), distance: 1, ..Default::default() },
    ],
    edges: vec![Edge { source: "pkg.Server".into(), target: "pkg.Auth".into(), edge_type: "calls".into(), ..Default::default() }],
    ..Default::default()
});
```

```swift [Swift]
import GCF

let output = GCF.encode(Payload(
    tool: "context_for_task", tokenBudget: 5000, tokensUsed: 1847,
    symbols: [
        Symbol(qualifiedName: "pkg.Auth", kind: "function", score: 0.78, provenance: "lsp", distance: 0),
        Symbol(qualifiedName: "pkg.Server", kind: "function", score: 0.54, provenance: "lsp", distance: 1),
    ],
    edges: [Edge(source: "pkg.Server", target: "pkg.Auth", edgeType: "calls")]
))
```

```kotlin [Kotlin]
import com.blackwellsystems.gcf.*

val output = encode(Payload(
    tool = "context_for_task", tokenBudget = 5000, tokensUsed = 1847,
    symbols = listOf(
        Symbol(qualifiedName = "pkg.Auth", kind = "function", score = 0.78, provenance = "lsp", distance = 0),
        Symbol(qualifiedName = "pkg.Server", kind = "function", score = 0.54, provenance = "lsp", distance = 1),
    ),
    edges = listOf(Edge(source = "pkg.Server", target = "pkg.Auth", edgeType = "calls"))
))
```

:::

**Output:**

```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=2 edges=1
## targets
@0 fn pkg.Auth 0.78 lsp
## related
@1 fn pkg.Server 0.54 lsp
## edges [1]
@0<@1 calls
```

233 tokens instead of 965 for the JSON equivalent. Local IDs (`@0`, `@1`) replace full qualified names in edges. Distance groups (`## targets`, `## related`) replace per-record `"distance": N` fields.

## Decode

::: code-group

```python [Python]
from gcf import decode

p = decode(gcf_text)
print(p.tool)           # "context_for_task"
print(len(p.symbols))   # 2
print(p.edges[0].source)  # "pkg.Server"
```

```typescript [TypeScript]
import { decode } from '@blackwell-systems/gcf';

const p = decode(gcfText);
console.log(p.tool);           // "context_for_task"
console.log(p.symbols.length); // 2
console.log(p.edges[0].source);  // "pkg.Server"
```

```go [Go]
p, err := gcf.Decode(gcfText)
if err != nil {
    log.Fatal(err)
}
fmt.Println(p.Tool)           // "context_for_task"
fmt.Println(len(p.Symbols))   // 2
fmt.Println(p.Edges[0].Source)  // "pkg.Server"
```

```rust [Rust]
use gcf::decode;

let p = decode(gcf_text)?;
println!("{}", p.tool);           // "context_for_task"
println!("{}", p.symbols.len());  // 2
println!("{}", p.edges[0].source); // "pkg.Server"
```

```swift [Swift]
import GCF

let p = try GCF.decode(gcfText)
print(p.tool)           // "context_for_task"
print(p.symbols.count)  // 2
print(p.edges[0].source) // "pkg.Server"
```

```kotlin [Kotlin]
import com.blackwellsystems.gcf.decode

val p = decode(gcfText)
println(p.tool)           // "context_for_task"
println(p.symbols.size)   // 2
println(p.edges[0].source) // "pkg.Server"
```

:::


## What's next

- [Format Overview](/guide/format-overview) to understand both encoding profiles
- [Using GCF with LLMs](/guide/llm-integration) for comprehension and generation results
- [Sessions](/guide/sessions) for multi-turn deduplication (92.7% savings)
- [Delta Encoding](/guide/delta) for incremental updates (81.2% savings)
- [Streaming Encoding](/guide/streaming) for zero-buffering incremental encode
- [GCF vs TOON](/guide/vs-toon) for the full competitive comparison
- [Benchmarks](/guide/benchmarks) for input and output token data
- [Playground](/playground) to try it live in the browser
