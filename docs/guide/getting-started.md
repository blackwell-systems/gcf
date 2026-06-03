# Getting Started

GCF (Graph Compact Format) is a wire format for encoding structured data in LLM tool responses. It achieves 84% fewer tokens than JSON while maintaining 100% LLM comprehension accuracy at scale.

## When to use GCF

Use GCF when your tool returns structured data to an LLM:
- Code intelligence results (symbols, call graphs, dependencies)
- Knowledge graph queries (nodes, edges, relationships)
- API responses with repeated record structures
- Any MCP tool response with arrays of objects

GCF is most effective when:
- Payloads contain **repeated structures** (arrays of similar objects)
- Records have **relationships** between them (edges, references)
- You're operating under a **token budget** (context windows are finite)
- You make **multiple calls** in a session (session dedup compounds savings)

## When NOT to use GCF

- Single scalar values (just return the value)
- Deeply nested configuration with no repeated structures (YAML/JSON is fine)
- Data the LLM must generate (GCF is for tool *output*, not LLM *input*)

## Install

::: code-group

```bash [Python]
pip install gcf-py
```

```bash [TypeScript]
npm install @blackwell-systems/gcf
```

```bash [Go]
go get github.com/blackwell-systems/gcf-go
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

:::

**Output:**

```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=2
## targets
@0 fn pkg.AuthMiddleware 0.78 lsp_resolved
## related
@1 fn pkg.NewServer 0.54 lsp_resolved
## edges
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

## What's next

- [Format Overview](/guide/format-overview) to understand the encoding structure
- [Sessions](/guide/sessions) for multi-turn deduplication (92.7% savings)
- [Delta Encoding](/guide/delta) for incremental updates (81.2% savings)
- [Benchmarks](/guide/benchmarks) for the full competitive data
