# Getting Started

GCF (Graph Compact Format) is a wire format for encoding structured data that LLMs read and produce. It achieves 79% fewer tokens than JSON on input and 75% fewer on output, with 100% comprehension accuracy at scale.

## When to use GCF

**Tool responses** (input to LLM):
- Code intelligence results (symbols, call graphs, dependencies)
- Knowledge graph queries (nodes, edges, relationships)
- API responses with repeated record structures
- Any MCP tool response with arrays of objects

**Agent output** (produced by LLM):
- Agent-to-agent communication in multi-agent workflows
- Structured output where you want to minimize output tokens
- Any case where the model returns tabular or graph data

GCF is most effective when:
- Payloads contain **repeated structures** (arrays of similar objects)
- Records have **relationships** between them (edges, references)
- You're operating under a **token budget** (context windows are finite)
- You make **multiple calls** in a session (session dedup compounds savings)
- You want **cheaper output** (75% fewer tokens than JSON, 52% fewer than TOON)

## When NOT to use GCF

- Single scalar values (just return the value)
- Systems that require JSON schema validation (GCF has no schema system yet)
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
.package(url: "https://github.com/blackwell-systems/gcf-swift", from: "0.4.0")
```

```bash [Kotlin]
# build.gradle.kts
implementation("com.github.blackwell-systems:gcf-kotlin:0.4.0")
```

:::

## Encode your first payload

::: code-group

```python [Python]
from gcf import encode, Payload, Symbol, Edge

p = Payload(
    tool="context_for_task",
    token_budget=5000,
    tokens_used=1847,
    symbols=[
        Symbol(
            qualified_name="pkg.AuthMiddleware",
            kind="function",
            score=0.78,
            provenance="lsp_resolved",
            distance=0,
        ),
        Symbol(
            qualified_name="pkg.NewServer",
            kind="function",
            score=0.54,
            provenance="lsp_resolved",
            distance=1,
        ),
    ],
    edges=[
        Edge(source="pkg.NewServer", target="pkg.AuthMiddleware", edge_type="calls"),
    ],
)

print(encode(p))
```

```typescript [TypeScript]
import { encode, type Payload } from '@blackwell-systems/gcf';

const p: Payload = {
  tool: 'context_for_task',
  tokenBudget: 5000,
  tokensUsed: 1847,
  symbols: [
    { qualifiedName: 'pkg.AuthMiddleware', kind: 'function', score: 0.78, provenance: 'lsp_resolved', distance: 0 },
    { qualifiedName: 'pkg.NewServer', kind: 'function', score: 0.54, provenance: 'lsp_resolved', distance: 1 },
  ],
  edges: [
    { source: 'pkg.NewServer', target: 'pkg.AuthMiddleware', edgeType: 'calls' },
  ],
};

console.log(encode(p));
```

```go [Go]
import gcf "github.com/blackwell-systems/gcf-go"

p := &gcf.Payload{
    Tool:        "context_for_task",
    TokenBudget: 5000,
    TokensUsed:  1847,
    Symbols: []gcf.Symbol{
        {QualifiedName: "pkg.AuthMiddleware", Kind: "function", Score: 0.78, Provenance: "lsp_resolved", Distance: 0},
        {QualifiedName: "pkg.NewServer", Kind: "function", Score: 0.54, Provenance: "lsp_resolved", Distance: 1},
    },
    Edges: []gcf.Edge{
        {Source: "pkg.NewServer", Target: "pkg.AuthMiddleware", EdgeType: "calls"},
    },
}

fmt.Println(gcf.Encode(p))
```

```rust [Rust]
use gcf::{Payload, Symbol, Edge, encode};

let p = Payload {
    tool: "context_for_task".into(),
    token_budget: 5000,
    tokens_used: 1847,
    symbols: vec![
        Symbol { qualified_name: "pkg.AuthMiddleware".into(), kind: "function".into(), score: 0.78, provenance: "lsp_resolved".into(), distance: 0, ..Default::default() },
        Symbol { qualified_name: "pkg.NewServer".into(), kind: "function".into(), score: 0.54, provenance: "lsp_resolved".into(), distance: 1, ..Default::default() },
    ],
    edges: vec![
        Edge { source: "pkg.NewServer".into(), target: "pkg.AuthMiddleware".into(), edge_type: "calls".into(), ..Default::default() },
    ],
    ..Default::default()
};

println!("{}", encode(&p));
```

:::

**Output:**

```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=2 edges=1
## targets
@0 fn pkg.AuthMiddleware 0.78 lsp_resolved
## related
@1 fn pkg.NewServer 0.54 lsp_resolved
## edges [1]
@0<@1 calls
```

That's it. 233 tokens instead of 965 for the JSON equivalent.

## Decode

::: code-group

```python [Python]
from gcf import decode

p = decode(gcf_text)
print(p.tool)           # "context_for_task"
print(len(p.symbols))   # 2
print(p.edges[0].source)  # "pkg.NewServer"
```

```typescript [TypeScript]
import { decode } from '@blackwell-systems/gcf';

const p = decode(gcfText);
console.log(p.tool);           // "context_for_task"
console.log(p.symbols.length); // 2
console.log(p.edges[0].source);  // "pkg.NewServer"
```

```go [Go]
p, err := gcf.Decode(gcfText)
if err != nil {
    log.Fatal(err)
}
fmt.Println(p.Tool)           // "context_for_task"
fmt.Println(len(p.Symbols))   // 2
fmt.Println(p.Edges[0].Source)  // "pkg.NewServer"
```

:::

## Encode any data (generic profile)

GCF also encodes arbitrary structured data, not just graph payloads:

::: code-group

```python [Python]
from gcf import encode_generic

output = encode_generic({
    "employees": [
        {"id": 1, "name": "Alice", "department": "Engineering", "salary": 95000},
        {"id": 2, "name": "Bob", "department": "Sales", "salary": 72000},
    ],
})
```

```typescript [TypeScript]
import { encodeGeneric } from '@blackwell-systems/gcf';

const output = encodeGeneric({
  employees: [
    { id: 1, name: 'Alice', department: 'Engineering', salary: 95000 },
    { id: 2, name: 'Bob', department: 'Sales', salary: 72000 },
  ],
});
```

```go [Go]
output := gcf.EncodeGeneric(map[string]any{
    "employees": []map[string]any{
        {"id": 1, "name": "Alice", "department": "Engineering", "salary": 95000},
        {"id": 2, "name": "Bob", "department": "Sales", "salary": 72000},
    },
})
```

:::

**Output:**

```
## employees [2]{id,name,department,salary}
1|Alice|Engineering|95000
2|Bob|Sales|72000
```

Arrays of uniform objects become tabular rows. One header replaces all field name repetitions. Pipe separators with no spaces for maximum density.

## What's next

- [Format Overview](/guide/format-overview) to understand both encoding profiles
- [Using GCF with LLMs](/guide/llm-integration) for comprehension and generation results
- [Sessions](/guide/sessions) for multi-turn deduplication (92.7% savings)
- [Delta Encoding](/guide/delta) for incremental updates (81.2% savings)
- [Streaming Encoding](/guide/streaming) for zero-buffering incremental encode
- [GCF vs TOON](/guide/vs-toon) for the full competitive comparison
- [Benchmarks](/guide/benchmarks) for input and output token data
- [Playground](/playground) to try it live in the browser
