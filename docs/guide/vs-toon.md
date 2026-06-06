# GCF vs TOON

GCF is smaller on all 6 datasets, more accurate at scale (100% vs 92.3%), and has four features TOON structurally cannot add. All claims below are tested on TOON's own benchmark with their datasets and their tokenizer.

## Feature comparison

| Feature | GCF | TOON |
|---------|-----|------|
| Tabular encoding (arrays of objects) | Yes | Yes |
| Positional fields (no field names per row) | Yes | Yes |
| Pipe-separated rows | Yes | Comma-separated |
| Nested object encoding | `## key` sections + `key=value` | Indented key: value |
| Semi-uniform data (optional fields) | Native (inline nested when present) | Falls back to less efficient encoding |
| **Local IDs for cross-referencing** | **Yes (`@0`, `@1`)** | **No** |
| **Edge/relationship encoding** | **Yes (`@0<@1 calls`, ~4 tokens/edge)** | **No (must repeat full identifiers, ~100 tokens/edge)** |
| **Session deduplication** | **Yes (92.7% savings by 5th call)** | **No** |
| **Delta encoding** | **Yes (81.2% savings on re-queries)** | **No** |
| **Distance grouping** | **Yes (`## targets`, `## related`)** | **No** |
| Graph-native (nodes + edges) | Yes (graph profile) | No |
| Generic data (any JSON) | Yes (tabular profile) | Yes |
| **Streaming encode** | **Yes (true zero-buffering, O(1) memory, `[?]` + trailer)** | **Output-side only (requires full value in memory)** |
| Key folding (dotted paths) | No | Yes |
| LLM comprehension at 500 symbols | 100% (13/13) | 92.3% (12/13) |
| **LLM generation (output tokens)** | **75% fewer than JSON** | **40% fewer than JSON** |
| Human-readable | Dense, agent-optimized | YAML-like, human-friendly |
| Zero dependencies | Yes | Yes |
| Language support | Go, TypeScript, Python, Rust, Swift, Kotlin | TypeScript, Go |
| MCP proxy (zero-code adoption) | Yes | Yes ("Tooner") |

## Where GCF wins

### 1. Token efficiency on every data shape

Tested on [TOON's own benchmark](https://github.com/blackwell-systems/toon/tree/gcf-comparison) with their datasets and their tokenizer (gpt-tokenizer, o200k_base):

| Dataset | GCF | TOON | Winner |
|---------|-----|------|--------|
| Semi-uniform event logs (2000 records) | 108,158 | 154,032 | **GCF 42% smaller** |
| E-commerce orders (500, nested items) | 61,593 | 73,246 | **GCF 19% smaller** |
| Employee records (2000 rows, flat) | 49,055 | 49,966 | **GCF 2% smaller** |
| Analytics time-series (365 days, flat) | 8,398 | 9,127 | **GCF 8% smaller** |
| GitHub repos (100 rows, flat) | 8,576 | 8,744 | **GCF 2% smaller** |
| Deeply nested config (small) | 616 | 618 | **GCF 0.3% smaller** |
| **Mixed-structure total** | **170,367** | **227,896** | **GCF 34% smaller** |
| **Flat-only total** | **66,029** | **67,837** | **GCF 3% smaller** |

GCF wins on all 6 datasets. TOON has no token efficiency advantage on any data shape.

GCF's largest advantage is on semi-uniform data (42% smaller) because TOON's tabular format requires all rows to have identical fields. When data is semi-uniform (e.g., event logs where some records have nested error objects), TOON falls back to its less efficient nested encoding for the entire array. GCF handles this natively: primitive fields encode positionally, nested fields attach inline only when present.

Reproducible: [blackwell-systems/toon@gcf-comparison](https://github.com/blackwell-systems/toon/tree/gcf-comparison)

### 2. Edge encoding (the structural advantage)

TOON has no concept of references between records. Every relationship must spell out the full identifier of both endpoints:

**TOON edges (repeated identifiers):**
```
edges[3]{source,target,type}:
  github.com/org/repo/pkg.NewServer,github.com/org/repo/pkg.AuthMiddleware,calls
  github.com/org/repo/pkg.AuthMiddleware,github.com/org/repo/pkg.ValidateToken,calls
  github.com/org/repo/pkg.ValidateToken,github.com/org/repo/internal.TokenCache,references
```

**GCF edges (local IDs):**
```
## edges [3]
@0<@3 calls
@1<@0 calls
@6<@1 references
```

Same information. GCF: ~4 tokens per edge. TOON: ~30-100 tokens per edge depending on identifier length. This advantage grows with longer qualified names (common in Java/Go packages) and higher edge density (call graphs, dependency graphs).

This is a structural limitation of TOON. It cannot be fixed without adding a local-ID system, which would make it a different format.

### 3. Session deduplication (TOON can't do this)

In multi-turn LLM interactions, the same data appears across multiple tool responses. GCF tracks what's been sent and replaces known records with bare references:

**Call 1: full declarations**
```
GCF tool=context_for_task symbols=15 edges=10 session=true
## targets
@0 fn pkg.AuthMiddleware 0.78 lsp_resolved
@1 fn pkg.ValidateToken 0.72 lsp_resolved
...
```

**Call 5: 92% bare references**
```
GCF tool=context_for_task symbols=22 edges=16 session=true
## targets
@0  # previously transmitted
@1  # previously transmitted
@2  # previously transmitted
@18 fn pkg.NewEndpoint 0.88 lsp_resolved
...
```

| Call | New records | Bare refs | Savings vs JSON |
|------|-----------|-----------|-----------------|
| 1 | 100% | 0% | 84% (base GCF) |
| 2 | 35% | 65% | 89% |
| 3 | 20% | 80% | 91% |
| 5 | 8% | 92% | **92.7%** |

TOON retransmits every record every time. It has no session concept. By the 5th tool call in a conversation, GCF is using **92.7% fewer tokens** than JSON while TOON is still at ~69%.

This isn't a feature that can be bolted on. Session dedup requires the format to support bare references (`@N  # previously transmitted`), which requires local IDs (`@N`), which TOON doesn't have.

### 4. Delta encoding (TOON can't do this)

When the LLM re-queries and the data changed slightly, GCF sends only the diff:

```
GCF tool=context_for_task delta=true base_root=aaa new_root=bbb savings=81%
## removed
fn pkg.OldHandler
## added
@0 fn pkg.NewHandler 0.85 rwr
## edges_removed
pkg.Router -> pkg.OldHandler calls
## edges_added
pkg.Router -> pkg.NewHandler calls
```

81.2% savings on re-queries in production. TOON must retransmit the entire payload even if one record changed.

### 5. Distance grouping (semantic structure)

GCF encodes how far each record is from the query center:

```
## targets       ← direct matches (distance 0)
@0 fn pkg.Auth 0.92 lsp
## related       ← one hop away (distance 1)
@3 fn pkg.Server 0.65 lsp
## extended      ← broader context (distance 2)
@6 type pkg.Cache 0.41 structural
```

The LLM immediately knows what's most relevant without scanning the entire payload. TOON encodes all records in a flat list with no semantic grouping.

## LLM output generation: GCF is 52% smaller

Both formats can be produced by LLMs given a short primer. Tested with the same model (Claude), same data (5 to 100 symbols), validated through real decoders:

| Symbols | Edges | GCF output | TOON output | GCF vs TOON |
|---------|-------|-----------|-------------|-------------|
| 5 | 3 | 379 B | 782 B | **52% smaller** |
| 10 | 6 | 643 B | 1,377 B | **53% smaller** |
| 20 | 12 | 1,217 B | 2,629 B | **54% smaller** |
| 50 | 25 | 2,845 B | 5,898 B | **52% smaller** |
| 100 | 50 | 5,619 B | 11,650 B | **52% smaller** |

Both achieved 5/5 validity with a format example. Both achieved 3/5 without one (tied cold-start). GCF is not just cheaper to read; it's cheaper to write.

TOON's [LLM integration guide](https://toonformat.dev/guide/llm-prompts.html) positions TOON as bidirectional (LLMs read and write it). But their guide doesn't publish a generation eval. We tested both formats head-to-head, and GCF produces valid output in half the tokens.

## TOON's benchmarks don't test at scale

TOON's retrieval accuracy benchmark uses datasets of 100 rows or fewer and reports a 1.4 percentage point accuracy improvement over JSON (76.4% vs 75.0%). At this scale, all formats perform similarly because JSON's structural noise hasn't yet overwhelmed the model's attention.

GCF's [comprehension eval](https://github.com/blackwell-systems/gcf-go/tree/main/eval) tests at 500 symbols with 200 edges. At this scale:

| Format | Accuracy | Tokens |
|--------|----------|--------|
| **GCF** | **100%** (13/13) | **11,090** |
| TOON | 92.3% (12/13) | 16,378 |
| JSON | 76.9% (10/13) | 53,341 |

JSON doesn't just use more tokens; it actively miscounts records (guessed 320 instead of 500). TOON fails on distance grouping (no section headers). The difference between formats is invisible at 100 rows and undeniable at 500. TOON's benchmarks stay in the comfort zone.

Reproduce it yourself: `git clone github.com/blackwell-systems/gcf-go && cd gcf-go/eval && GOWORK=off go test -run TestComprehension -v -timeout 0`

## "But GCF isn't human-readable"

Neither is protobuf. Neither are HTTP headers. Readability is a last-mile rendering concern, not a wire format property.

The agent reads GCF (cheap, 79% fewer tokens in the context window), does its work, then calls `decode()` at the end if a human needs to see the result. The context window savings are already banked. The decode costs one function call.

TOON optimizes for the case where a human is scanning the raw wire format. GCF optimizes for the case where an agent is consuming it and a human can view the decoded output if they need to. The second case is the common case. The first case is debugging.

## Where TOON wins

Nowhere. GCF wins on all 6 datasets in TOON's own benchmark. The closest result is deeply nested configuration (616 vs 618, a 2-token difference). TOON's `encodeLines()` is output-side streaming only (the full value must be in memory before encoding starts). GCF's `StreamEncoder` is true input-side streaming with zero buffering and O(1) memory per row. See the [streaming guide](/guide/streaming) for the full comparison.

## The bottom line

GCF does everything TOON does, plus five things TOON structurally cannot add without becoming a different format:

- **Local IDs and edge encoding** (requires `@N` references)
- **Session deduplication** (requires bare references, which require local IDs)
- **Delta encoding** (requires content-addressed identity)
- **Distance grouping** (requires semantic section headers)
- **True streaming encode** (requires deferred counts + trailer; TOON spec mandates upfront `[N]`)

On TOON's own benchmark, GCF wins all 6 datasets.

The gap widens over time. First call: GCF saves 34% vs TOON. Fifth call: GCF saves 92.7% vs JSON while TOON is stuck at 69%. No format change can close that gap without adding session state, which requires local IDs, which requires a fundamental redesign.

**[Try both formats in the playground](https://gcformat.com/playground.html)** with your own data.

**[Get started in 5 minutes](https://gcformat.com/guide/getting-started.html)** with any of 6 languages.
