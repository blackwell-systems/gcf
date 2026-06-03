<p align="center">
  <a href="https://github.com/blackwell-systems"><img src="https://raw.githubusercontent.com/blackwell-systems/blackwell-docs-theme/main/badge-trademark.svg" alt="Blackwell Systems"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

# GCF: Graph Compact Format

**Token-optimized wire format for LLM tool responses.**

```
Your data  ───▶  encode()  ───▶  GCF  ───▶  LLM
```

### vs JSON: 79% fewer tokens, JSON can't even count at scale

```
Tokens (500 symbols):

  JSON   ████████████████████████████████████████████████████  53,341
  TOON   ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  16,378
  GCF    ███████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  11,090  ◀ winner
```

### vs TOON: 34% fewer tokens on their own benchmark

```
Token efficiency (TOON's datasets, TOON's tokenizer):

  Mixed-structure data:
  TOON   ████████████████████████████████████████████████████  227,896
  GCF    ██████████████████████████████████░░░░░░░░░░░░░░░░░  169,554  ◀ 34% smaller

  Semi-uniform data (most common real-world pattern):
  TOON   ████████████████████████████████████████████████████  154,032
  GCF    ████████████████████████████████████░░░░░░░░░░░░░░░  107,269  ◀ 44% smaller

  Flat tabular data:
  TOON   ████████████████████████████████████████████████████   67,837
  GCF    ██████████████████████████████████████████████████░░   66,026  ◀ 3% smaller
```

### LLM comprehension: 100% accuracy at the lowest token cost

```
Accuracy at 500 symbols (6 structured extraction questions):

  GCF    ████████████████████████████████████████████████████  100%  ✓
  TOON   ████████████████████████████████████████████████████  100%  ✓
  JSON   █████████████████████████████████░░░░░░░░░░░░░░░░░░  66.7% ✗ miscounts records
```

GCF matches TOON's accuracy in 32% fewer tokens. JSON fails because field-name repetition at scale overwhelms the model's counting.

---

### Try it

```bash
pip install gcf-py                    # Python
npm install @blackwell-systems/gcf    # TypeScript
go get github.com/blackwell-systems/gcf-go  # Go
```

```python
from gcf import encode, Payload, Symbol, Edge

output = encode(Payload(
    tool="context_for_task",
    token_budget=5000,
    tokens_used=1847,
    symbols=[Symbol(qualified_name="pkg.Auth", kind="function", score=0.78, provenance="lsp", distance=0)],
))
```

---

### At a glance

| | GCF | TOON | JSON |
|---|---|---|---|
| **Tokens (500 symbols)** | 11,090 | 16,378 | 53,341 |
| **Comprehension accuracy** | 100% | 100% | 66.7% |
| **Session dedup (5th call)** | 92.7% savings | N/A | N/A |
| **Delta encoding** | 81.2% savings | N/A | N/A |
| **Semi-uniform data** | native | falls back | verbose |
| **Best for** | graph data, MCP tools, multi-turn | flat tables | nothing at scale |

---

## How it works

GCF exploits three properties of structured data:

1. **Positional fields.** One header declares field names. Rows are values only.
2. **Local IDs.** `@0`, `@1`. Edges reference by ID, not by repeating full identifiers.
3. **Hierarchical grouping.** Section headers (`## targets`) replace per-record metadata.

These are structural savings. They grow with payload size because the waste they eliminate is per-record.

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

Same information. 75.9% fewer tokens. At 500 symbols, GCF remains perfectly comprehensible while JSON is actively confusing the model.

## It gets cheaper over time

**Session deduplication:** Symbols sent in prior responses become bare references. By the 5th tool call: 92.7% savings vs JSON.

**Delta encoding:** When the context changes slightly between queries, send only the diff. 81.2% additional savings on re-queries.

No other format has these. They're possible because GCF was designed for multi-turn LLM tool interactions, not generic data serialization.

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

Fork with reproducible results: [blackwell-systems/toon@gcf-comparison](https://github.com/blackwell-systems/toon/tree/gcf-comparison)

## Specification

Full grammar, encoding rules, session statefulness, and delta encoding: [SPEC.md](SPEC.md)

## Implementations

| Language | Package | Repository |
|----------|---------|-----------|
| Go | `go get github.com/blackwell-systems/gcf-go` | [gcf-go](https://github.com/blackwell-systems/gcf-go) |
| TypeScript | `npm install @blackwell-systems/gcf` | [gcf-typescript](https://github.com/blackwell-systems/gcf-typescript) |
| Python | `pip install gcf-py` | [gcf-python](https://github.com/blackwell-systems/gcf-python) |

Zero runtime dependencies. MIT licensed. Spec is stable.

## Designed for MCP

GCF is a format option for [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) tool responses. Any MCP server returning graph-structured data can use GCF to deliver more context per token budget, with better comprehension accuracy than JSON.

## License

MIT
