<p align="center">
  <a href="https://github.com/blackwell-systems"><img src="https://raw.githubusercontent.com/blackwell-systems/blackwell-docs-theme/main/badge-trademark.svg" alt="Blackwell Systems"></a>
  <a href="https://gcformat.com/playground.html"><img src="https://img.shields.io/badge/playground-live-blue.svg" alt="Playground"></a>
  <a href="https://github.com/blackwell-systems/gcf"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/blackwell-systems/gcf/main/assets/downloads-badge.json" alt="Downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

# GCF

**Drop-in replacement for JSON in AI pipelines. 79% fewer tokens. 100% comprehension accuracy. Works on any structured data.**

Encode any JSON payload as GCF before sending it to an LLM. Arrays, nested objects, key-value pairs, mixed types. The model reads it natively with zero format instructions. `decode()` converts back to JSON when a human needs to see it.

```
pip install gcf-proxy    # wrap any MCP server, zero code changes
```

```
Tool  ───▶  encode()  ───▶  GCF  ───▶  LLM  ───▶  GCF  ───▶  Agent/Tool
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
  GCF    ██████████████████████████████████░░░░░░░░░░░░░░░░░  170,367  ◀ 34% smaller

  Semi-uniform data (most common real-world pattern):
  TOON   ████████████████████████████████████████████████████  154,032
  GCF    ████████████████████████████████████░░░░░░░░░░░░░░░  108,158  ◀ 42% smaller

  Flat tabular data:
  TOON   ████████████████████████████████████████████████████   67,837
  GCF    ██████████████████████████████████████████████████░░   66,026  ◀ 3% smaller
```

### LLM comprehension: 100% accuracy at the lowest token cost

```
Accuracy at 500 symbols (13 structured extraction questions):

  GCF    ████████████████████████████████████████████████████  100%   ✓ (13/13)
  TOON   ████████████████████████████████████████████████░░░░  92.3%  (12/13)
  JSON   ██████████████████████████████████████░░░░░░░░░░░░░░  76.9%  ✗ (10/13)
```

GCF beats TOON on accuracy AND uses 32% fewer tokens. JSON fails on counting tasks because field-name repetition at scale overwhelms the model's attention.

---

### Try it

```bash
pip install gcf-python                    # Python
npm install @blackwell-systems/gcf        # TypeScript
go get github.com/blackwell-systems/gcf-go  # Go
cargo add gcf                             # Rust
```

### Encode any structured data (tabular profile)

```python
from gcf import encode_generic

output = encode_generic({
    "employees": [
        {"id": 1, "name": "Alice", "department": "Engineering", "salary": 95000},
        {"id": 2, "name": "Bob", "department": "Sales", "salary": 72000},
        {"id": 3, "name": "Carol", "department": "Marketing", "salary": 85000},
    ],
})
```

```
## employees [3]{id,name,department,salary}
1|Alice|Engineering|95000
2|Bob|Sales|72000
3|Carol|Marketing|85000
```

One header declares field names. Rows are positional values only. No field names repeated per record. Works on any JSON: arrays, nested objects, primitives.

### Graph profile (code intelligence, MCP tools)

For data with nodes, edges, and distance groups:

```python
from gcf import encode, Payload, Symbol, Edge

output = encode(Payload(
    tool="context_for_task", token_budget=5000, tokens_used=1847,
    symbols=[
        Symbol(qualified_name="pkg.Auth", kind="function", score=0.78, provenance="lsp", distance=0),
        Symbol(qualified_name="pkg.Server", kind="function", score=0.54, provenance="lsp", distance=1),
    ],
    edges=[Edge(source="pkg.Server", target="pkg.Auth", edge_type="calls")],
))
```

```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=2 edges=1
## targets
@0 fn pkg.Auth 0.78 lsp
## related
@1 fn pkg.Server 0.54 lsp
## edges [1]
@0<@1 calls
```

Local IDs (`@0`, `@1`) replace full names in edges. 233 tokens instead of 965 for JSON.

**[Try it live in the playground](https://gcformat.com/playground.html)** with real-time three-way comparison (JSON vs TOON vs GCF).

---

### At a glance

| | GCF | TOON | JSON |
|---|---|---|---|
| **Input tokens (500 symbols)** | 11,090 | 16,378 | 53,341 |
| **Output tokens (100 symbols)** | 5,619 | 11,650 | 22,180 |
| **Comprehension accuracy** | 100% (13/13) | 92.3% (12/13) | 76.9% (10/13) |
| **Generation validity** | 5/5 | 5/5 | N/A |
| **Session dedup (5th call)** | 92.7% savings | N/A | N/A |
| **Delta encoding** | 81.2% savings | N/A | N/A |
| **Semi-uniform data** | native | falls back | verbose |
| **Best for** | graph data, MCP tools, multi-turn, agent output | flat tables | nothing at scale |

---

## How it works

### Graph profile

Exploits three properties of graph-structured data:

1. **Positional fields.** One header declares field names. Rows are values only.
2. **Local IDs.** `@0`, `@1`. Edges reference by ID, not by repeating full identifiers.
3. **Hierarchical grouping.** Section headers (`## targets`) replace per-record metadata.

### Tabular profile

Exploits two properties of structured data:

1. **Tabular headers.** `## name [count]{field1,field2}` declares field names once. Rows are pipe-separated values.
2. **Section headers.** `## key` for nested objects. `key=value` for primitives.

Both profiles share the same grammar: `##` headers, `@` IDs, positional fields. The savings are structural and grow with payload size.

## Example (graph profile)

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
GCF tool=context_for_task budget=5000 tokens=1847 symbols=2 edges=1
## targets
@0 fn github.com/org/repo/pkg.AuthMiddleware 0.78 lsp_resolved
## related
@1 fn github.com/org/repo/pkg.NewServer 0.54 lsp_resolved
## edges [1]
@0<@1 calls
```

Same information. 75.9% fewer tokens.

## It gets cheaper over time

**Session deduplication:** Symbols sent in prior responses become bare references. By the 5th tool call: 92.7% savings vs JSON.

**Delta encoding:** When the context changes slightly between queries, send only the diff. 81.2% additional savings on re-queries.

No other format has these. They're possible because GCF was designed for multi-turn LLM tool interactions, not generic data serialization.

## Benchmarks

### Comprehension accuracy (500 symbols, 13 extraction questions)

| Format | Accuracy | Tokens | vs JSON |
|--------|----------|--------|---------|
| **GCF** | **100%** (13/13) | **11,090** | **79% fewer** |
| TOON | 92.3% (12/13) | 16,378 | 69% fewer |
| JSON | 76.9% (10/13) | 53,341 | baseline |

Eval: [gcf-go/eval](https://github.com/blackwell-systems/gcf-go/tree/main/eval)

### Token efficiency ([TOON's own benchmark](https://github.com/blackwell-systems/toon/tree/gcf-comparison), their datasets, their tokenizer)

| Track | GCF | TOON | Result |
|-------|-----|------|--------|
| Mixed-structure (nested, semi-uniform) | 170,367 | 227,896 | **GCF 34% smaller** |
| Flat-only (tabular) | 66,026 | 67,837 | **GCF 3% smaller** |
| Semi-uniform event logs | 108,158 | 154,032 | **GCF 42% smaller** |

Fork with reproducible results: [blackwell-systems/toon@gcf-comparison](https://github.com/blackwell-systems/toon/tree/gcf-comparison)

## Specification

Full grammar, encoding rules, session statefulness, delta encoding, and tabular profile: [SPEC.md](SPEC.md)

## Implementations

| Language | Package | Repository |
|----------|---------|-----------|
| Go | `go get github.com/blackwell-systems/gcf-go` | [gcf-go](https://github.com/blackwell-systems/gcf-go) |
| TypeScript | `npm install @blackwell-systems/gcf` | [gcf-typescript](https://github.com/blackwell-systems/gcf-typescript) |
| Python | `pip install gcf-python` | [gcf-python](https://github.com/blackwell-systems/gcf-python) |
| Rust | `cargo add gcf` | [gcf-rust](https://github.com/blackwell-systems/gcf-rust) |
| Swift | Swift Package Manager | [gcf-swift](https://github.com/blackwell-systems/gcf-swift) |
| Kotlin | JitPack (`com.github.blackwell-systems:gcf-kotlin`) | [gcf-kotlin](https://github.com/blackwell-systems/gcf-kotlin) |
| MCP Proxy | `pip install gcf-proxy` | [gcf-proxy](https://github.com/blackwell-systems/gcf-proxy) |

Zero runtime dependencies. MIT licensed. Spec is stable. The proxy is a drop-in wrapper for any existing MCP server (zero code changes).

All implementations support both graph profile (`encode`/`Encode`) and tabular profile (`encode_generic`/`encodeGeneric`/`EncodeGeneric`).

## Documentation

Full guides, API reference, benchmarks, and integration patterns: **[gcformat.com](https://gcformat.com/)**

- [Getting Started](https://gcformat.com/guide/getting-started.html)
- [Format Overview](https://gcformat.com/guide/format-overview.html)
- [Session Deduplication](https://gcformat.com/guide/sessions.html)
- [Delta Encoding](https://gcformat.com/guide/delta.html)
- [MCP Integration](https://gcformat.com/guide/mcp.html)
- [Benchmarks](https://gcformat.com/guide/benchmarks.html)
- [GCF vs TOON](https://gcformat.com/guide/vs-toon.html)
- [MCP Proxy Guide](https://gcformat.com/guide/proxy.html)
- [Playground](https://gcformat.com/playground.html)
- [Syntax Cheatsheet](https://gcformat.com/reference/cheatsheet.html)
- [Token Savings Proof](https://gcformat.com/reference/token-savings-proof.html)

## Use cases

- **MCP tool responses.** Any [MCP](https://modelcontextprotocol.io/) server returning structured data. GCF delivers more context per token budget with better comprehension accuracy than JSON.
- **Agent-to-agent communication.** Agents passing context in multi-agent workflows. 75% fewer tokens per handoff.
- **LLM structured output.** LLMs produce valid GCF with a 3-line primer. 52% fewer output tokens than TOON.
- **Code intelligence.** Graph profile with local IDs, edges, and distance grouping for symbols, call hierarchies, and dependency graphs.

## License

MIT
