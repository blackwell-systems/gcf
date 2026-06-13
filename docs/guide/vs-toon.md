# GCF vs TOON

GCF is smaller on 13/15 datasets (-25.5% overall), achieves 100% comprehension on every frontier model (where TOON fails on GPT-5.5 and Gemini Flash), and has five features TOON structurally cannot add. TOON's own official decoder rejects LLM-generated TOON output on 7 of 9 models tested.

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
| Generic data (any JSON) | Yes (generic profile) | Yes |
| **Streaming encode** | **Yes (true zero-buffering, O(1) memory, `[?]` + trailer)** | **Output-side only (requires full value in memory)** |
| Key folding (dotted paths) | No | Yes |
| LLM comprehension (generic, 500 orders) | **100%** on every frontier model | 92.3% (fails on GPT-5.5, Gemini Flash) |
| LLM comprehension (graph, 500 symbols) | **90.7%** avg (23 runs, 10 models) | 68.5% avg |
| **LLM generation (output tokens)** | **75% fewer than JSON** | **40% fewer than JSON** |
| Human-readable | Dense, agent-optimized | YAML-like, human-friendly |
| Zero dependencies | Yes | Yes |
| Language support | Go, TypeScript, Python, Rust, Swift, Kotlin | TypeScript, Go |
| MCP proxy (zero-code adoption) | Yes | Yes ("Tooner") |

## Where GCF wins

### 1. Token efficiency across 15 real-world datasets

15 datasets representing actual LLM tool response payloads. Same tokenizer (o200k_base), spec-compliant encoders:

| Dataset | GCF | TOON | GCF vs TOON |
|---------|-----|------|-------------|
| Event logs (semi-uniform) | 95,635 | 154,032 | **-37.9%** |
| E-commerce orders (nested) | 51,334 | 73,246 | **-29.9%** |
| Comprehension eval payload | 41,213 | 60,603 | **-32.0%** |
| Order history (shared schemas) | 13,295 | 16,454 | **-19.2%** |
| Blast radius response | 6,561 | 7,831 | **-16.2%** |
| Distributed trace | 4,318 | 4,959 | **-12.9%** |
| File tree + diagnostics | 6,018 | 6,894 | **-12.7%** |
| Analytics time-series | 8,404 | 9,127 | **-7.9%** |
| Employee records (flat) | 49,061 | 49,966 | -1.8% |
| GitHub repositories | 8,582 | 8,744 | -1.9% |
| PR file changes | 2,623 | 2,657 | -1.3% |
| Database query results | 17,716 | 17,969 | -1.4% |
| Multi-tool composite | 3,131 | 3,192 | -1.9% |
| Nested config | 645 | 618 | +4.4% |
| LSP symbol search | 5,442 | 5,365 | +1.4% |
| **TOTAL** | **313,978** | **421,657** | **-25.5%** |

**GCF wins 13/15.** Two marginal TOON wins: nested config (27 tokens, pure key-value tree with zero arrays) and LSP symbols (77 tokens, tokenizer artifact where `|` splits slightly worse than `,`).

GCF's largest advantage is on semi-uniform and nested data (30-38% smaller) because GCF's inline schema optimization encodes nested objects positionally. TOON's tabular format requires all rows to have identical fields. When data is semi-uniform or has nested sub-objects, TOON falls back to its less efficient encoding.

Reproducible: [blackwell-systems/toon-benchmark](https://github.com/blackwell-systems/toon-benchmark)

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
GCF profile=graph tool=context_for_task symbols=15 edges=10 session=true
## targets
@0 fn pkg.AuthMiddleware 0.78 lsp_resolved
@1 fn pkg.ValidateToken 0.72 lsp_resolved
...
```

**Call 5: 92% bare references**
```
GCF profile=graph tool=context_for_task symbols=22 edges=16 session=true
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
GCF profile=graph tool=context_for_task delta=true base_root=aaa new_root=bbb savings=81%
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

## LLM generation: TOON fails, GCF doesn't

28 generation runs across 9 models and 3 providers. Same data, same prompt structure, output validated through real decoders (including TOON's official [toon-go](https://github.com/toon-format/toon-go) library).

| Model | GCF | TOON | JSON |
|-------|-----|------|------|
| Claude Opus 4.6 | **5/5** | 0/5 | 5/5 |
| Claude Sonnet 4.6 | **5/5** | 2-3/5 | 5/5 |
| GPT-5.5 | **4-5/5** | 1-2/5 | 5/5 |
| GPT-5.4 | **5/5** | 0/5 | 5/5 |
| Gemini 2.5 Pro | **5/5** | 1/5 | 5/5 |
| Gemini 3.1 Pro | **5/5** | 0/5 | 5/5 |

![Generation Validity by Model](/charts/generation-validity.png)

**TOON's official decoder rejects the output on 7 of 9 models.** The failure is structural: TOON's flat columns require the model to encode semantic categories as integers. When told "this symbol is a target," the model writes `target` in the distance column. TOON's decoder expects `0`. Every model fails to perform this mapping unprompted.

GCF expresses distance through section placement (`## targets`, `## related`). No integer mapping required. The format aligns with how LLMs naturally express grouped data.

![The Distance Label Problem](/charts/distance-label-problem.png)

When TOON is given pre-encoded integers (hand-holding the model through the mapping to compensate for their fragile format), performance improves on some models but is still inconsistent. Even in the best case, TOON output is 28% larger than GCF.

GCF output is 63% smaller than JSON and 33% smaller than TOON at 100 symbols. See the [full generation data](/guide/eval-results#generation-all-runs) for all runs.

## TOON's comprehension benchmarks don't test at scale

TOON's retrieval accuracy benchmark uses datasets of 100 rows or fewer and reports a 1.4 percentage point accuracy improvement over JSON (76.4% vs 75.0%). At this scale, all formats perform similarly because JSON's structural noise hasn't yet overwhelmed the model's attention.

GCF's [comprehension eval](https://github.com/blackwell-systems/gcf-go/tree/main/eval) tests at two scales:

**Generic profile (500 orders, nested data, 7 models):**

| Format | Frontier models (6) | Weak models (1) |
|--------|---------------------|-----------------|
| **GCF** | **100%** | 69.2% |
| TOON | 92.3-100% | 69.2% |
| JSON | 76.9-100% | 61.5% |

GCF: 100% on every frontier model. TOON fails on GPT-5.5 (count_premium_customers). JSON fails on Gemini 2.5 Flash (3 questions wrong).

**Graph profile (500 symbols + 200 edges, 10 models, 23 runs):**

| Format | Avg accuracy | Tokens |
|--------|-------------|--------|
| **GCF** | **90.7%** | **11,090** |
| TOON | 68.5% | 16,378 |
| JSON | 53.6% | 53,341 |

23 runs. GCF wins 22, ties 1, loses 0. The difference between formats is invisible at 100 rows and undeniable at 500.

**Scale test (1000 orders):** JSON doesn't fit in 200K context. TOON doesn't fit on Sonnet. GCF (47K tokens) is the only format that works.

TOON publishes zero multi-model comprehension data and zero generation validity data.

## "But GCF isn't human-readable"

Neither is protobuf. Neither are HTTP headers. Readability is a last-mile rendering concern, not a wire format property.

The agent reads GCF (cheap, 53-71% fewer tokens than JSON in the context window), does its work, then calls `decode()` at the end if a human needs to see the result. The context window savings are already banked. The decode costs one function call.

TOON optimizes for the case where a human is scanning the raw wire format. GCF optimizes for the case where an agent is consuming it and a human can view the decoded output if they need to. The second case is the common case. The first case is debugging.

## Where TOON wins

Two marginal cases out of 15 datasets:

1. **Nested config** (+27 tokens, 4.4%): A deeply nested key-value tree with zero arrays. TOON's YAML-like `key: value` indentation is slightly more compact than GCF's `## key` + `key=value` for pure config data. This structure almost never appears as an LLM tool response.

2. **LSP symbol search** (+77 tokens, 1.4%): A flat tabular array where TOON's comma delimiter tokenizes slightly better than GCF's pipe delimiter. GCF is fewer bytes but more tokens due to how the tokenizer splits on `|` vs `,`.

Neither case is significant in practice. The total difference is 104 tokens combined, while GCF saves 107,679 tokens across the other 13 datasets.

TOON's `encodeLines()` is output-side streaming only (the full value must be in memory before encoding starts). GCF's `StreamEncoder` is true input-side streaming with zero buffering and O(1) memory per row. See the [streaming guide](/guide/streaming) for the full comparison.

## The bottom line

GCF does everything TOON does, plus five things TOON structurally cannot add without becoming a different format:

- **Local IDs and edge encoding** (requires `@N` references)
- **Session deduplication** (requires bare references, which require local IDs)
- **Delta encoding** (requires content-addressed identity)
- **Distance grouping** (requires semantic section headers)
- **True streaming encode** (requires deferred counts + trailer; TOON spec mandates upfront `[N]`)

On 15 real-world datasets, GCF wins 13. Overall: 25.5% fewer tokens.

The gap widens over time. First call: GCF saves 34% vs TOON. Fifth call: GCF saves 92.7% vs JSON while TOON is stuck at 69%. No format change can close that gap without adding session state, which requires local IDs, which requires a fundamental redesign.

**[Try both formats in the playground](https://gcformat.com/playground.html)** with your own data.

**[Get started in 5 minutes](https://gcformat.com/guide/getting-started.html)** with any of 6 languages.
