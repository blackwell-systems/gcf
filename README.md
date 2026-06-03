# GCF: Graph Compact Format

A token-optimized wire format for LLM tool responses carrying graph-structured data.

**84% fewer tokens than JSON. 100% LLM comprehension accuracy.**

## The Problem

AI agents consume tool responses under fixed token budgets. JSON wastes 75%+ of those tokens on structural overhead: field names, delimiters, and repeated identifiers. For graph data (code intelligence, dependency analysis, knowledge graphs), the waste is even worse because edges repeat full node identifiers.

## The Solution

GCF exploits three properties of graph data that flat formats cannot:

1. **Referential identity.** Nodes get local IDs (`@0`, `@1`). Edges reference by ID instead of repeating full qualified names.
2. **Topological encoding.** Edges as `@target<@source type` instead of JSON objects with named fields.
3. **Hierarchical grouping.** Section headers (`## targets`, `## related`) replace per-record metadata fields.

## Example

**JSON (~965 tokens):**
```json
{
  "tool": "context_for_task",
  "tokens_used": 1847,
  "token_budget": 5000,
  "symbols": [
    { "qualified_name": "github.com/org/repo/pkg.AuthMiddleware", "kind": "function", "score": 0.78, "provenance": "lsp_resolved", "distance": 0 },
    { "qualified_name": "github.com/org/repo/pkg.NewServer", "kind": "function", "score": 0.54, "provenance": "lsp_resolved", "distance": 1 }
  ],
  "edges": [
    { "source": "github.com/org/repo/pkg.NewServer", "target": "github.com/org/repo/pkg.AuthMiddleware", "edge_type": "calls" }
  ]
}
```

**GCF (~233 tokens):**
```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=2
## targets
@0 fn github.com/org/repo/pkg.AuthMiddleware 0.78 lsp_resolved
## related
@1 fn github.com/org/repo/pkg.NewServer 0.54 lsp_resolved
## edges
@0<@1 calls
```

Same semantic content. 75.9% fewer tokens.

## Specification

See [SPEC.md](SPEC.md) for the full grammar, encoding rules, session statefulness, and delta encoding extension.

## Implementations

| Language | Repository | Status |
|----------|-----------|--------|
| Go | [blackwell-systems/gcf-go](https://github.com/blackwell-systems/gcf-go) | Production (encoder, decoder, session, delta) |

## Benchmarks

Across 6 benchmark payloads (8 to 30 symbols):

| Metric | Value |
|--------|-------|
| Median token savings vs JSON | **84%** |
| Session statefulness (5th call) | **92.7%** |
| Delta encoding (re-queries) | **81.2%** additional savings |
| LLM comprehension accuracy | **100%** (vs JSON 66.7%) |
| Encode latency (30 symbols) | 38 us |

LLM comprehension eval: GCF achieves 100% accuracy on structured extraction tasks (symbol identification, counting, kind extraction, edge enumeration). JSON scored 66.7% because verbosity causes miscounts on large payloads.

## Design for MCP

GCF is designed as a format option for [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) tool responses. Any MCP server returning graph-structured data can use GCF to reduce token consumption by 84% without sacrificing comprehension.

## License

MIT
