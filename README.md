<p align="center">
  <a href="https://github.com/blackwell-systems"><img src="https://raw.githubusercontent.com/blackwell-systems/blackwell-docs-theme/main/badge-trademark.svg" alt="Blackwell Systems"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

# GCF: Graph Compact Format

**The wire format that LLMs can actually read.**

At 500 symbols, JSON scores 66.7% on structured extraction. It can't count its own records. TOON scores 100%, but costs 32% more tokens to get there. GCF scores 100% at the lowest token cost of any format tested.

| Format | Accuracy | Tokens | vs JSON |
|--------|----------|--------|---------|
| **GCF** | **100%** | **11,090** | **79% fewer** |
| TOON | 100% | 16,378 | 69% fewer |
| JSON | 66.7% | 53,341 | baseline |

JSON doesn't just cost more. It breaks. At scale, the model loses track in the noise of field names, delimiters, and repeated identifiers. It reported 320 symbols when there were 500. It's not a token efficiency problem; it's a comprehension failure.

## Why GCF Wins

GCF exploits three properties of graph data that flat formats cannot:

1. **Referential identity.** Nodes get local IDs (`@0`, `@1`). Edges reference by ID instead of repeating 80-character qualified names.
2. **Topological encoding.** `@0<@4 calls` instead of `{"source": "...", "target": "...", "edge_type": "calls"}`.
3. **Hierarchical grouping.** One section header (`## targets`) replaces a `"distance": 0` field on every record.

These aren't micro-optimizations. They're structural. The savings grow with payload size because the waste they eliminate is per-record.

## It Gets Cheaper Over Time

GCF has two additional encoding modes that exploit session state:

**Session deduplication:** Symbols sent in prior responses become bare references. By the 5th tool call in a conversation: 92.7% savings vs JSON.

**Delta encoding:** When the context pack changes slightly between queries, send only what's different. 81.2% additional savings on re-queries.

No other format has these. They're possible because GCF was designed for multi-turn LLM tool interactions, not generic data serialization.

## Example

**JSON (965 tokens):**
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

**GCF (233 tokens):**
```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=2
## targets
@0 fn github.com/org/repo/pkg.AuthMiddleware 0.78 lsp_resolved
## related
@1 fn github.com/org/repo/pkg.NewServer 0.54 lsp_resolved
## edges
@0<@1 calls
```

Same information. 75.9% fewer tokens. And at 500 symbols, the GCF version is still perfectly comprehensible while the JSON version is actively confusing the model.

## Benchmarks

### Comprehension accuracy (500 symbols, 6 extraction questions)

| Format | Accuracy | Tokens | vs JSON |
|--------|----------|--------|---------|
| **GCF** | **100%** (6/6) | **11,090** | **79% fewer** |
| TOON | 100% (6/6) | 16,378 | 69% fewer |
| JSON | 66.7% (4/6) | 53,341 | baseline |

Eval: [gcf-go/eval](https://github.com/blackwell-systems/gcf-go/tree/main/eval)

### Token efficiency ([TOON's own benchmark](https://github.com/blackwell-systems/toon/tree/gcf-comparison), their datasets, their tokenizer)

| Track | GCF | TOON | Result |
|-------|-----|------|--------|
| Mixed-structure (nested, semi-uniform) | 169,554 | 227,896 | **GCF 34% smaller** |
| Flat-only (tabular) | 66,026 | 67,837 | **GCF 3% smaller** |
| Semi-uniform event logs | 107,269 | 154,032 | **GCF 44% smaller** |

GCF wins on every dataset except deeply nested config (75 tokens difference on a 618-token payload). On semi-uniform data (the most common real-world pattern), GCF uses 44% fewer tokens than TOON.

Fork with reproducible results: [blackwell-systems/toon@gcf-comparison](https://github.com/blackwell-systems/toon/tree/gcf-comparison)

## Specification

Full grammar, encoding rules, session statefulness, and delta encoding: [SPEC.md](SPEC.md)

## Implementations

| Language | Repository | Status |
|----------|-----------|--------|
| Go | [blackwell-systems/gcf-go](https://github.com/blackwell-systems/gcf-go) | Production (encoder, decoder, session, delta) |
| TypeScript | [blackwell-systems/gcf-typescript](https://github.com/blackwell-systems/gcf-typescript) | Production (encoder, decoder, session, delta) |
| Python | [blackwell-systems/gcf-python](https://github.com/blackwell-systems/gcf-python) | Production (encoder, decoder, session, delta) |

## Designed for MCP

GCF is a format option for [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) tool responses. Any MCP server returning graph-structured data can use GCF to deliver more context per token budget, with better comprehension accuracy than JSON.

## License

MIT
