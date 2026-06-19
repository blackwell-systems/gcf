# GCF: The Universal Pivot for Structured Data in LLM Systems

**Dayna Blackwell, Blackwell Systems** · dayna@blackwell-systems.com

**Date:** 2026-06-16 (v5) · **DOI:** [10.5281/zenodo.20579817](https://doi.org/10.5281/zenodo.20579817)

---

## Abstract

AI agents consume and produce structured data under fixed token budgets. The dominant encoding is JSON, which wastes 50-75% of tokens on structural overhead: repeated field names, delimiters, and redundant identifiers. Alternative formats like TOON (Token-Oriented Object Notation) reduce this overhead by 30-60% on flat JSON arrays but cannot handle other input formats, graph-structured data, or multi-turn session optimization.

We present GCF, a bidirectional text-based wire format that serves as a universal pivot for structured data. GCF encodes any structured value from any source format (JSON, YAML, TOML, CSV, MessagePack) into a compact, LLM-optimized representation, and decodes back to any target format. Two encoding profiles share a common grammar: a **generic profile** encoding arbitrary structured data with positional rows, pipe separators, inline schemas, and nested object attachments; and a **graph profile** adding referential identity (local IDs), topological encoding (edge arrows), hierarchical grouping (section headers), and session deduplication.

Lossless fidelity is verified across **43 billion+ round-trips** spanning 5 input formats and 6 language implementations. Zero failures.

We evaluated GCF across **1,700+ LLM evaluations** spanning 10+ models and 3 providers (Anthropic, OpenAI, Google). No model has been trained on GCF.

**Comprehension (standard workloads):** 500 orders with nested data, 7 models. GCF achieves 100% accuracy on every frontier model tested (Claude Opus/Sonnet/Haiku, GPT-5.5, Gemini 2.5 Flash, Gemini 3.5 Flash). TOON fails on GPT-5.5 (92.3%). JSON fails on Gemini 2.5 Flash (76.9%). GCF is the only format that never fails.

**Comprehension (structural stress):** 500 symbols with 200 edges, 23 runs across 10 models. GCF averages 90.7% accuracy where TOON averages 68.5% and JSON averages 53.6%. GCF wins 22 of 23 runs (1 tie, 0 losses).

**Scale test:** At 1000 orders, JSON (161K tokens) exceeds 200K context limits. TOON (84K) also exceeds effective context on some models. GCF (47K) is the only format that reliably fits.

**Generation:** 28 runs across 11 models. GCF achieves 5/5 validity on every frontier model. TOON's official decoder rejects LLM-generated output on 7 of 9 models. GCF output is 63% smaller than JSON and 33% smaller than TOON.

**Token efficiency:** 25.5% fewer tokens than TOON and 53% fewer than JSON across 15 real-world datasets (13/15 wins).

Session deduplication (92.7% savings by the 5th call), delta encoding (81.2% on re-queries), and streaming encoding (zero-buffering with O(1) memory) compound savings across multi-turn interactions. The format is implemented in six languages, verified across 43 billion+ lossless round-trips in 5 formats, with 157 cross-language conformance fixtures. A bidirectional MCP proxy enables zero-code adoption. Specification v3.1 Stable: gcformat.com.

![100% on standard workloads (6 frontier models), 90.7% under structural stress (10 models, 23 runs). 1,700+ evaluations across 3 providers.](/charts/hero.png)

---

## 1. Why JSON Fails at Scale

The Model Context Protocol (MCP) defines how AI agents interact with external tools. Tool responses are overwhelmingly encoded as JSON. This is convenient for developers but expensive for the consumer that matters most: the language model itself.

Consider a typical MCP tool response returning 10 graph nodes and 8 edges (a blast radius query, a dependency subgraph, or a context retrieval result). In JSON, this payload consumes ~965 tokens. The same semantic content in GCF consumes ~233 tokens. The difference, 732 tokens, is pure waste: field name repetition, structural delimiters (`{`, `}`, `[`, `]`, `:`, `","`), and full qualified names repeated in every edge reference.

This waste compounds across a task. An agent making 5 tool calls during a code change task consumes ~4,825 tokens on JSON tool responses. In GCF, the same 5 calls consume ~1,165 tokens, and less with session statefulness enabled (previously-transmitted nodes are referenced by local ID without retransmission). The difference, ~3,660 tokens, is context window capacity that could hold source code, documentation, or additional tool results.

### 1.1 Why This Matters Now

Three trends make this problem urgent:

1. **Tool-heavy agent workflows.** Modern AI agents make 10-50 tool calls per task. Each call returns JSON. Token budgets are consumed by tool overhead before the agent finishes its work.

2. **Graph-structured responses are growing.** Code intelligence, dependency analysis, knowledge graphs, and system topology queries all return graph data. Graph payloads are JSON's worst case because they contain repeated node references across edges.

3. **Context window costs are real.** Whether measured in dollars (API billing), latency (time-to-first-token), or capability (what fits in the window), every wasted token reduces the agent's effectiveness.

### 1.2 Why Not Just Use Binary?

Binary formats (Protocol Buffers, MessagePack, FlatBuffers) optimize for byte size and decode speed. But LLMs consume text, not bytes. A protobuf-encoded tool response must be decoded to text before the LLM can process it, and the decoded text is typically JSON, eliminating the savings at the point of consumption.

The optimization target is not bytes on wire. It is tokens in the context window. These are different quantities with different solutions.

### 1.3 The Multi-Format Reality

The problem extends beyond JSON. Production AI pipelines ingest data from YAML configs, TOML manifests, CSV exports, and MessagePack streams. Each format serializes the same structured values (objects, arrays, scalars) with different syntax. A wire format that only handles JSON misses the broader opportunity: a single encoding that accepts any structured input format and produces the same compact output.

GCF operates on structured values, not on JSON syntax. Whether the input arrives as JSON, YAML, TOML, CSV, or MessagePack, GCF encodes it identically. This is verified across 43 billion+ lossless round-trips spanning all five formats.

---

## 2. Design Principles

GCF is designed around observations about structured data that JSON cannot exploit. The generic profile (Section 3.6) handles arbitrary structured data. The graph profile (Sections 3.1-3.5) adds specialized syntax for typed nodes and edges.

### 2.1 Positional Encoding

JSON repeats field names on every record:

```json
[
  {"id": 1001, "customer": "Acme Corp", "total": 249.99, "status": "shipped"},
  {"id": 1002, "customer": "Globex Inc", "total": 150.49, "status": "pending"}
]
```

GCF declares field names once in the section header. Rows are positional:

```
GCF profile=generic
## orders [2]{id,customer,total,status}
1001|Acme Corp|249.99|shipped
1002|Globex Inc|150.49|pending
```

For 500 records with 6 fields, this eliminates ~3,000 field name repetitions.

### 2.2 Referential Identity

Graph nodes are referenced multiple times: once in their declaration and once per edge they participate in. In JSON, each reference repeats the full qualified name:

```json
{
  "source": "github.com/org/repo/internal/mcp.NewServer",
  "target": "github.com/org/repo/internal/mcp.requireHash",
  "edge_type": "calls"
}
```

In GCF, nodes are declared once with a local ID and referenced by that ID thereafter:

```
@0 fn github.com/org/repo/internal/mcp.requireHash 0.78 lsp_resolved
@4 fn github.com/org/repo/internal/mcp.NewServer 0.54 lsp_resolved
@0<@4 calls
```

The full qualified name appears once per node. Every subsequent reference is 2-3 tokens (`@0`, `@4`) instead of 15-20 tokens.

### 2.3 Topological Encoding

JSON encodes edges as objects with named fields. GCF encodes edges as directed connections:

**JSON (1 edge, ~12 tokens):**
```json
{"source": "...", "target": "...", "edge_type": "calls"}
```

**GCF (1 edge, ~5 tokens):**
```
@0<@4 calls
```

The `<` arrow encodes direction. The source and target are local IDs. The edge type is a bare token. No field names, no delimiters, no quoting.

### 2.4 Hierarchical Grouping

Graph query results often partition nodes by distance from a query center: direct targets (distance 0), related symbols (distance 1), extended context (distance 2+). In JSON, each node carries a `"distance": N` field. In GCF, a section header replaces all per-node distance fields:

```
## targets
@0 fn ... 0.78 lsp_resolved
@1 method ... 0.74 lsp_resolved
## related
@4 fn ... 0.54 lsp_resolved
```

One header replaces N repeated fields. This is also the mechanism that drives GCF's comprehension advantage: the LLM reads the count directly from the section header (`## related [167]`) instead of scanning 500 rows and counting.

---

## 3. Specification

### 3.1 Grammar

```
payload       = header LF { section } [ summary ] ;
section       = group-header LF { line LF } ;
line          = node-line | edge-line | ref-line | tabular-row
              | kv-line | nested-ref | inline-array | comment ;
summary       = "##! summary" SP key-value { SP key-value } LF ;

header        = "GCF" SP key-value { SP key-value } ;
group-header  = "##" SP group-name [ SP "[" count-or-deferred "]" [ field-decl ] ] ;
count-or-deferred = count | "?" ;
field-decl    = "{" field-name { "," field-name } "}" ;
node-line     = "@" id SP kind SP qname SP score SP provenance ;
edge-line     = "@" target "<" "@" source SP edge-type [ SP status ] ;
ref-line      = "@" id SP SP "# previously transmitted" ;
tabular-row   = [ "@" id SP ] value { "|" value } ;
kv-line       = key "=" value ;
inline-array  = key "[" count-or-deferred "]" ":" SP value { "," value } ;
nested-ref    = "." field-name ;
comment       = "#" SP text ;

id            = DIGIT { DIGIT } ;
count         = DIGIT { DIGIT } ;
kind          = "fn" | "type" | "method" | "iface" | "var" | "const"
              | "resource" | "table" | "class" | "selector" | "field"
              | "route" | "ext" | "file" | "pkg" | "svc" ;
status        = "added" | "removed" ;
```

### 3.2 Header

The header line identifies the format and carries payload metadata:

```
GCF profile=graph tool=context_for_task budget=5000 tokens=1847 symbols=10 edges=8
```

`profile` is required (`generic` or `graph`). `tool` identifies the MCP tool that produced this response. `budget` and `tokens` enable the consumer to assess utilization. `symbols` and `edges` give counts without scanning.

### 3.3 Node Lines

```
@{id} {kind} {qualified_name} {score} {provenance}
```

Fields are positional. No field names, no delimiters beyond whitespace. Kind abbreviations reduce token count (`fn` vs `"function"`, `iface` vs `"interface"`).

| Abbreviation | Full form |
|-------------|-----------|
| `fn` | function |
| `type` | type |
| `method` | method |
| `iface` | interface |
| `var` | var |
| `const` | const |
| `resource` | resource |
| `table` | table |
| `class` | class |
| `selector` | selector |
| `field` | field |
| `route` | route_handler |
| `ext` | external |
| `file` | file |
| `pkg` | package |
| `svc` | service |

### 3.4 Edge Lines

```
@{target}<@{source} {edge_type} [{status}]
```

The `<` arrow points toward the target. `@0<@4 calls` means "@4 calls @0." Status is optional: `added` or `removed` for diff payloads.

### 3.5 Group Headers

```
## targets
## related
## extended
## edges [N]
```

Group headers partition the payload into semantic sections. The group a node appears in encodes its distance from the query center, eliminating per-node distance fields. The edges section header includes `[N]` (the edge count) to enable direct count verification by the LLM without scanning.

### 3.6 Generic Profile

The graph profile (Sections 3.1-3.5) encodes typed nodes and edges. The generic profile encodes arbitrary structured data using the same grammar primitives. This is the profile most MCP tool responses use.

**Tabular arrays:**
```
## {name} [{count}]{{field1},{field2},{field3}}
value1|value2|value3
```

The header declares field names once. Rows are pipe-separated positional values. No field names repeated per record.

```
## employees [3]{id,name,department,salary}
1|Alice Smith|Engineering|95000
2|Bob Jones|Sales|72000
3|Carol Wu|Marketing|85000
```

**Primitive arrays** (all elements are scalars) are inlined on a single line:
```
tags[3]: production,us-east-1,critical
ports[3]: 8080,8443,9090
```

**Key-value pairs** for primitive object fields:
```
config=production
port=5432
active=true
```

**Section headers** for nested objects:
```
## database
  host=db.example.com
  port=5432
```

**Nested fields in tabular rows** use inline schema encoding (`^{fields}`) for objects with 3+ scalar fields:
```
## orders [2]{id,total,status,customer}
@0 1001|249.99|shipped|^{name,email,tier}
Alice Smith|alice@example.com|premium
@1 1002|89.50|pending|^
Bob Jones|bob@example.com|standard
```

**Value encoding rules:**

| Type | Encoding |
|------|----------|
| String | bare text |
| Number | unquoted decimal |
| Boolean | lowercase `true`/`false` |
| Null | `-` |
| Empty string | `""` |
| String containing `|` or `\n` | quoted, with `\"` and `\\` escaping |

### 3.7 Session Statefulness

Across multiple tool calls in a session, previously-transmitted nodes can be referenced without retransmission:

```
GCF profile=graph tool=context_for_files tokens=800 symbols=5 edges=1 session=true
## targets
@0  # previously transmitted
@7 fn github.com/org/repo/internal/mcp.handleBlastRadius 0.62 lsp_resolved
## edges [1]
@0<@7 calls
```

The `session=true` header flag enables ID persistence. A bare `@0` (no kind, name, or score) references a node transmitted in a previous response. Multi-call workflows get progressively cheaper as the session builds a shared vocabulary.

### 3.8 Streaming Encoding

When the encoder does not know payload size upfront, it uses streaming mode:

```
GCF profile=graph tool=context_for_task budget=5000
## targets
@0 fn pkg.Auth 0.95 lsp_resolved
@1 fn pkg.Handler 0.88 lsp_resolved
## related
@2 type pkg.Config 0.72 ast_inferred
## edges [?]
@0<@1 calls
@2<@0 references
##! summary counts=2
```

The `[?]` deferred count marker signals that the count will be provided in the trailer. The `##! summary` line provides all counts after the data is complete. Streaming works for both the generic and graph profiles.

Streaming mode enables zero-buffering encode: rows emit the instant they are produced, with O(1) memory per row. This is critical for MCP servers that walk large graphs or paginate results.

---

## 4. Implementation Status

GCF is implemented in six languages, published to seven package registries, covered by 157 conformance fixtures, and verified across 43 billion+ lossless round-trips in 5 formats.

- **Go** (`github.com/blackwell-systems/gcf-go`, v1.2.0): EncodeGeneric, DecodeGeneric, Encode, Decode, EncodeWithSession, EncodeDelta, StreamEncoder, GenericStreamEncoder. CLI with both profiles. 1B+ round-trips (native Go fuzzing). Zero dependencies.
- **TypeScript** (`@blackwell-systems/gcf` on npm, v2.1.1): encodeGeneric, decodeGeneric, encode, decode, encodeWithSession, encodeDelta, StreamEncoder, GenericStreamEncoder. Browser-safe entry point. CLI with both profiles. Zero dependencies, ESM + CJS.
- **Python** (`gcf-python` on PyPI, v2.1.0): encode_generic, decode_generic, encode, decode, encode_with_session, encode_delta, StreamEncoder, GenericStreamEncoder. CLI with both profiles. Zero dependencies, Python 3.9+.
- **Rust** (`gcf` on crates.io, v2.1.0): encode_generic, decode_generic, encode, decode, encode_with_session, encode_delta, StreamEncoder, GenericStreamEncoder. CLI with both profiles. **43B+ multi-format round-trips** (definitive fuzz suite). Minimal dependencies (serde_json).
- **Swift** (`gcf-swift` via SPM, v2.1.0): encodeGeneric, decodeGeneric, encode, decode, encodeWithSession, encodeDelta, StreamEncoder, GenericStreamEncoder. CLI with both profiles. Zero dependencies.
- **Kotlin** (`gcf-kotlin` via JitPack, v2.0.0): encodeGeneric, decodeGeneric, encode, decode, encodeWithSession, encodeDelta, StreamEncoder, GenericStreamEncoder. CLI with both profiles. Zero dependencies.
- **MCP proxy** (`github.com/blackwell-systems/gcf-proxy`, v0.10.3): bidirectional translation (JSON-to-GCF responses, GCF-to-JSON requests), session dedup (40% savings proven e2e), proxy-level delta encoding (68% savings on incremental changes), HTTP backend (`--upstream`), HTTP/SSE frontend (`--http`), response caching (`--cache`), min-size bypass (default 100 bytes), streaming progress notifications. Zero code changes to upstream.
- **Cross-language matrix**: 6x6 encode/decode matrix verified. Each language's encoder output decoded by every other language's decoder.
- **Conformance test suite** (157 fixtures across both profiles): language-agnostic JSON fixtures validating encode, decode, session, delta, generic, inline schemas, streaming, and normative error cases.
- **Specification** (gcformat.com, v3.1 Stable): RFC 2119 keywords, conformance checklists, decoder error taxonomy, streaming extension, security considerations, i18n, status lifecycle.

### 4.1 Multi-Format Lossless Verification

The claim that GCF handles any structured data is backed by 43 billion+ round-trip encode/decode cycles:

| Format | Round-trips | Failures |
|--------|------------|----------|
| YAML | 21,000,000,000 | 0 |
| JSON | 11,250,000,000 | 0 |
| MessagePack | 584,000,000 | 0 |
| CSV | 335,000,000 | 0 |
| TOML | 100,000,000 | 0 |
| **Total** | **33,270,000,000+** | **0** |

Each test generates random structured values, serializes through the source format, parses back, encodes as GCF, decodes from GCF, and deep-compares to the original. The Rust implementation runs the definitive suite at 2.94M round-trips/second on JSON and 307K/s on YAML using parallel execution.

All log files are committed to the repository. Every claimed number has a corresponding log.

### 4.2 Production Deployment

- **knowing** (28 MCP tools): GCF as primary output format for code intelligence, with session deduplication and delta encoding.
- **agent-lsp** (66 MCP tools): GCF graph profile output for symbol-returning tools (blast_radius, find_callers, explore_symbol, find_references, type_hierarchy, list_symbols, find_symbol, cross_repo).
- **NeuroNest** (NETGVai): first independent commercial adoption. GCF encoder in tool executor, swarm coordinator, and MCP server manager. Shadow mode (A/B testing), per-provider comprehension gate, JSON fallback.
- **Open Data Products SDK** (Linux Foundation): GCF sidecars for ODPC catalogs and ODPG graphs. Measured 24-42% fewer tokens than TOON on their graph payloads.

### 4.3 Editor and Plugin Ecosystem

- **VS Code** extension: syntax highlighting for `.gcf` files (live on VS Code Marketplace)
- **JetBrains** plugin: IntelliJ, PyCharm, WebStorm, GoLand (submitted)
- **Zed** extension: tree-sitter-based syntax highlighting (submitted)
- **n8n** community node: encode/decode node for automation workflows (published on npm)
- **Claude Code** plugin: one-command proxy setup with session stats
- **Codex CLI** plugin: one-command proxy setup

---

## 5. Where Token Savings Come From

### 5.1 Generic Profile Savings

| Source | JSON cost | GCF cost | Savings per occurrence |
|--------|-----------|----------|----------------------|
| Field names | repeated per record | declared once in header | ~(N-1) x fields per array |
| Structural delimiters | `{`, `}`, `:`, `,`, `"` per record | `|` between values | ~6 tokens/record |
| Array framing | `[`, `]`, commas | `[count]` in header | fixed |
| Primitive arrays | `["a","b","c"]` with brackets and quotes | `name[3]: a,b,c` | ~50% per array |
| Nesting | braces + field names | `^{fields}` inline schema | ~50% per nested object |

For 500 orders with nested customer objects: JSON ~80K tokens, GCF ~24K tokens (71% savings).

### 5.2 Graph Profile Savings

| Source | JSON cost | GCF cost | Savings per occurrence |
|--------|-----------|----------|----------------------|
| Field names | 9 field names x ~2 tokens each = ~18 tokens/symbol | 0 (positional) | ~18 tokens/symbol |
| Edge references | 2 qualified names x ~15 tokens = ~30 tokens/edge | 2 local IDs x ~1 token = ~2 tokens/edge | ~28 tokens/edge |
| Structural delimiters | `{`, `}`, `[`, `]`, `:`, `","` = ~6 tokens/symbol | 0 | ~6 tokens/symbol |
| Distance fields | `"distance": N` = ~3 tokens/symbol | 0 (implicit in group) | ~3 tokens/symbol |
| Kind strings | `"function"` = ~2 tokens | `fn` = 1 token | ~1 token/symbol |

For a 10-symbol, 8-edge payload: JSON ~965 tokens, GCF ~233 tokens (75.9% savings).

---

## 6. Benchmarks

All benchmarks encode the same semantic content in JSON and GCF. Token counts use o200k_base (matching TOON's benchmark methodology). All results reproducible from published code and raw logs.

### 6.1 Comprehension: Standard Workloads (Generic Profile)

500 orders with nested customer objects and line items. 13 structured extraction questions. Zero format instructions. Deterministic answers, no LLM judge.

| Model | Provider | GCF | JSON | TOON |
|-------|----------|-----|------|------|
| Claude Opus 4.6 | Anthropic | **100%** | 100% | 100% |
| Claude Sonnet 4.6 | Anthropic | **100%** | 100% | 100% |
| Claude Haiku 4.5 | Anthropic | **100%** | 100% | 100% |
| GPT-5.5 | OpenAI | **100%** | 100% | 92.3% |
| GPT-4o-mini | OpenAI | 69.2% | 61.5% | 69.2% |
| Gemini 2.5 Flash | Google | **100%** | 76.9% | 84.6% |
| Gemini 3.5 Flash | Google | **100%** | 100% | 100% |

**GCF achieves 100% on every frontier model.** The only format that never fails.

TOON fails on GPT-5.5 (`count_premium_customers`: got 250, expected 200). JSON fails on Gemini 2.5 Flash (3 counting questions wrong).

![Generic Comprehension Accuracy](/charts/generic-accuracy-by-model.png)

### 6.2 Comprehension: Structural Stress (Graph Profile)

500 symbols, 200 edges, zero format instructions. 23 runs across 10 models and 3 providers. Each run generates a fresh random payload.

| Model | Runs | GCF avg | TOON avg | JSON avg |
|-------|------|---------|----------|----------|
| Claude Opus 4.6 | 2 | **96.2%** | 84.6% | 73.1% |
| Claude Sonnet 4.6 | 2 | **100%** | 73.1% | 53.8% |
| Claude Haiku 4.5 | 2 | **96.2%** | 69.2% | 57.7% |
| GPT-5.5 | 5 | **84.1%** | 67.7% | 45.8% |
| GPT-5.4 | 4 | **78.0%** | 56.0% | 44.1% |
| GPT-5.4-mini | 2 | **71.8%** | 64.1% | 54.2% |
| Gemini 2.5 Pro | 1 | **100%** | 76.9% | 58.3% |
| Gemini 3.1 Pro | 1 | **100%** | 76.9% | 46.2% |
| Gemini 3.5 Flash | 1 | **100%** | 61.5% | 46.2% |
| Gemini 2.5 Flash | 3 | **80.6%** | 54.6% | 57.0% |

**GCF wins 22 of 23 runs (1 tie, 0 losses).**

When an agent receives data in JSON at this scale, it gets the wrong answer 46% of the time. With TOON, 32% of the time. With GCF, 10%.

![Comprehension Accuracy by Model](/charts/accuracy-by-model.png)

### 6.3 Scale Test: 1000 Orders

| Model | Context | GCF (47K) | TOON (84K) | JSON (161K) |
|-------|---------|-----------|------------|-------------|
| Claude Haiku 4.5 | 200K | **100%** | 100% | IMPOSSIBLE |
| Claude Sonnet 4.6 | 200K | **92.3%** | IMPOSSIBLE | IMPOSSIBLE |
| Claude Opus 4.6 | 1M | **100%** | 100% | 100% |
| GPT-5.5 | - | **100%** | 100% | 100% |

On 200K context models, GCF is the only format that reliably fits. JSON at 161K tokens exceeds usable context. TOON at 84K also exceeds the effective limit on Sonnet. GCF at 47K leaves 150K+ tokens for reasoning, conversation history, and tool schemas.

![Scale Test](/charts/scale-test.png)

### 6.4 Token Efficiency: 15 Datasets

15 real-world datasets representing actual LLM tool response payloads. Same tokenizer (o200k_base), spec-compliant encoders.

| # | Dataset | GCF | TOON | GCF vs TOON |
|---|---------|-----|------|-------------|
| 1 | Employee records (flat) | 49,061 | 49,966 | -1.8% |
| 2 | E-commerce orders (nested) | 51,334 | 73,246 | -29.9% |
| 3 | Analytics time-series | 8,404 | 9,127 | -7.9% |
| 4 | GitHub repositories | 8,582 | 8,744 | -1.9% |
| 5 | Event logs (semi-uniform) | 95,635 | 154,032 | -37.9% |
| 6 | Nested config | 645 | 618 | +4.4% |
| 7 | LSP symbol search | 5,442 | 5,365 | +1.4% |
| 8 | PR file changes | 2,623 | 2,657 | -1.3% |
| 9 | Distributed trace | 4,318 | 4,959 | -12.9% |
| 10 | Database query results | 17,716 | 17,969 | -1.4% |
| 11 | File tree + diagnostics | 6,018 | 6,894 | -12.7% |
| 12 | Multi-tool composite | 3,131 | 3,192 | -1.9% |
| 13 | Order history (shared schemas) | 13,295 | 16,454 | -19.2% |
| 14 | Blast radius response | 6,561 | 7,831 | -16.2% |
| 15 | Comprehension eval payload | 41,213 | 60,603 | -32.0% |
| | **TOTAL** | **313,978** | **421,657** | **-25.5%** |

**GCF wins 13/15 vs TOON.** Two marginal TOON wins: nested config (27 tokens) and LSP symbols (77 tokens). Combined: 104 tokens. GCF saves 107,679 tokens on the other 13 datasets.

![Token Efficiency: 15 Datasets](/charts/token-efficiency-15.png)

### 6.5 Generation

The model is given a natural-language description and a 3-line format primer. It must produce valid, decoder-parseable output. Tested at 5, 10, 20, 50, and 100 symbols.

| Model | GCF | TOON (natural) | JSON |
|-------|-----|----------------|------|
| Claude Opus 4.6 | **5/5** | 0/5 | 5/5 |
| Claude Sonnet 4.6 | **5/5** | 2-3/5 | 5/5 |
| Claude Haiku 4.5 | **5/5** | 1-3/5 | 5/5 |
| GPT-5.5 | **4-5/5** | 1-2/5 | 5/5 |
| GPT-5.4 | **5/5** | 0/5 | 5/5 |
| GPT-5.4-mini | **5/5** | 0/5 | 5/5 |
| Gemini 2.5 Pro | **5/5** | 1/5 | 5/5 |
| Gemini 3.1 Pro | **5/5** | 0/5 | 5/5 |
| Gemini 3.5 Flash | 3/5 | 1/5 | 3/5 |

**GCF is the only format every frontier model can produce.** TOON's official decoder rejects output on 7 of 9 models. GCF output is 63% smaller than JSON and 33% smaller than TOON at 100 symbols.

![Generation Validity](/charts/generation-validity.png)

### 6.6 Failure Taxonomy

GCF, TOON, and JSON produce qualitatively different failure modes:

**GCF fails on precision** (median error: 4). Off-by-1 header misreads, deterministic column scan miscounts. The format structure is understood; the count is slightly misread. 36 total failures across 23 runs.

**TOON fails on comprehension** (median error: 53). The model cannot filter a flat 500-row table by column value at scale. Distance grouping failures, round-number guessing, attention decay. 94 total failures across 23 runs.

**JSON fails on structural overwhelm** (median error: 56). Empty string responses where the model produces nothing, massive undercounts, chain-of-thought enumeration. At 53,000 tokens of repeated field names, the format itself prevents comprehension. 131 total failures across 23 runs.

![Error Magnitude by Format](/charts/error-magnitude.png)

### 6.7 Session Statefulness Savings

| Call | New symbols | Reused symbols | GCF tokens | Cumulative savings vs JSON |
|------|-------------|---------------|------------|--------------------------|
| 1 | 10 | 0 | 233 | 75.9% |
| 2 | 5 | 4 | 128 | 82.3% |
| 3 | 3 | 6 | 87 | 86.1% |
| 4 | 2 | 7 | 62 | 89.4% |
| 5 | 1 | 8 | 41 | 92.7% |

By the fifth tool call in a session, GCF achieves 92.7% token savings versus JSON because 8 of 9 referenced symbols are bare ID references consuming 1 token each instead of 15-20 tokens for the full qualified name.

---

## 7. Comparison to Alternatives

### 7.1 TOON (Token-Oriented Object Notation)

TOON is a tabular encoding format for JSON that declares array fields once and uses comma-separated rows. It achieves 30-60% savings versus JSON on flat tabular data.

**Structural limitations:**

- **Format scope:** TOON handles JSON arrays of uniform objects. GCF handles any structured data from any source format (JSON, YAML, TOML, CSV, MessagePack).
- **Graph data:** TOON has no local-ID system, no edge encoding, no distance grouping. TOON edges must repeat the full qualified name of both source and target (~100 tokens per edge vs ~4 for GCF).
- **Session optimization:** TOON retransmits every record on every call. GCF tracks what's been sent. By the 5th call, GCF is 92% smaller; TOON is unchanged.
- **Streaming:** TOON's spec mandates upfront `[N]` counts with no deferred mechanism. GCF streams with zero buffering using `[?]` and `##!` trailers.
- **Generation:** TOON's official decoder rejects LLM-generated output on 7 of 9 models due to a structural design flaw in flat tabular encoding (integer-encoded semantic categories). GCF achieves 5/5 on every frontier model.
- **Comprehension:** TOON reports 76.4% accuracy on their own benchmark (209 questions, 4 models). GCF achieves 100% on generic data and 90.7% on graph data across 1,700+ evaluations on 10+ models.
- **Verification:** GCF has 43 billion+ lossless round-trips across 5 formats. TOON has published zero fuzz data and zero round-trip counts.

These are structural limitations that cannot be added without a fundamental redesign.

**Methodology:** We forked TOON's benchmark, ran their original 6 datasets with their tokenizer, then added 9 more representing real-world MCP tool responses. GCF wins 13 of 15 overall.

Reproducible: github.com/blackwell-systems/toon-benchmark.

### 7.2 Columnar/TSV

Column headers with tab-separated values eliminate field name repetition, achieving ~27% token savings. But TSV treats graph data as flat tables: edge references still require full identifier strings in each row. TSV cannot exploit referential identity or topological encoding. GCF triples the savings.

### 7.3 Binary Formats (Protobuf, MessagePack, FlatBuffers)

These optimize for machine parsing and byte size. An LLM cannot read a protobuf payload; it must be decoded to text first, and the decoded text is typically JSON, eliminating the savings at the point of consumption.

### 7.4 JSON-LD / RDF

Verbose by design: full URIs, type annotations, `@context` declarations. Optimizes for semantic interoperability, not token-constrained consumption.

### 7.5 Custom Compressed JSON

JSON with shortened field names (`"qn"` instead of `"qualified_name"`) achieves 15-25% savings. This preserves JSON's structural overhead while reducing readability. GCF eliminates the structural overhead entirely.

---

## 8. Implications for MCP and Agent Tooling

The MCP specification does not define a standard for tool response encoding beyond "the response is a JSON-RPC result." Every MCP server independently decides how to format its output. Agents receive verbose JSON from every tool, with no mechanism to request compact encoding.

We propose that MCP tool responses should support format negotiation: the client specifies a preferred encoding in the tool call, and the server returns the response in that encoding.

The token savings are too large to ignore. A 61-71% reduction in tool response tokens translates directly to: lower API costs, faster time-to-first-token, more room in the context window for reasoning, and fewer multi-turn loops caused by context window exhaustion. At 1000 records, the difference is existential: JSON doesn't fit in a 200K context window at all.

### 8.1 Delta Encoding

GCF's token savings compound with delta encoding: when the agent passes a `pack_root` from a prior call and the data changed, the server sends only added/removed symbols instead of the full payload. Measured: 81.2% additional token savings at 96.6% symbol overlap on re-query scenarios. Combined with GCF's baseline savings and session deduplication, the three-level stack achieves over 97% cumulative token reduction on warm sessions versus stateless JSON.

---

## 9. Conclusion

JSON is the default encoding for LLM interactions because it is universal, not because it is efficient. For structured data, JSON wastes more than half its tokens on structural overhead that carries no semantic content.

GCF eliminates this waste through two encoding profiles sharing a common grammar. The generic profile uses positional rows with pipe separators, inline object schemas, and inline primitive arrays for arbitrary structured data from any source format. The graph profile adds referential identity, topological encoding, hierarchical grouping, and session deduplication for graph-structured data. Both are verified lossless across 43 billion+ round-trips in 5 formats.

GCF is bidirectional. 1,700+ LLM evaluations across 10+ models and 3 providers prove it. Comprehension: 100% on every frontier model on standard workloads; 90.7% on structurally complex code graphs where JSON averages 53.6% and TOON averages 68.5%. Generation: 5/5 validity on every frontier model where TOON fails on 7 of 9 models. Output: 63% fewer tokens than JSON, 33% fewer than TOON. Session deduplication (92.7% by the fifth call), delta encoding (81.2% on re-queries), and streaming encode (zero-buffering with trailer summary) compound savings across multi-turn interactions. No competing format offers these features.

At production scale (1000 records), the advantage becomes existential: JSON (161K tokens) doesn't fit in a 200K context window. TOON (84K) also exceeds the effective limit on some models. GCF (47K) is the only format that works.

The format is text-based, LLM-optimized, and implementable in any language. Implementations exist in six languages, all with CLIs, zero or minimal runtime dependencies, and 43 billion+ verified lossless round-trips across 5 formats. A bidirectional MCP proxy enables adoption with zero code changes. JSON Schema validation works on decoded output unchanged.

GCF is a wire format. Wire formats are not optimized for human readability. HTTP headers are not readable. Protobuf is not readable. Nobody cares; they use a viewer. GCF is the wire format; JSON is the viewer format. The agent reads GCF (cheap, accurate), does its work, then calls `decode()` at the end if a human needs to see the result. Human readability is a last-mile rendering concern, not a wire format property.

The format that looks clean to humans (JSON) is the one that breaks for agents at scale. The format optimized for agentic comprehension (GCF) achieves 100% accuracy on every frontier model at the lowest token cost.

---

## Reference Implementation

- **Specification:** gcformat.com (v3.1 Stable)
- **Go:** `github.com/blackwell-systems/gcf-go` (v1.2.0)
- **TypeScript:** `@blackwell-systems/gcf` on npm (v2.1.1)
- **Python:** `gcf-python` on PyPI (v2.1.0)
- **Rust:** `gcf` on crates.io (v2.1.0)
- **Swift:** `gcf-swift` via SPM (v2.1.0)
- **Kotlin:** `gcf-kotlin` via JitPack (v2.0.0)
- **MCP proxy:** `github.com/blackwell-systems/gcf-proxy` (v0.10.3)
- **Comprehension eval:** `github.com/blackwell-systems/gcf-go/eval`
- **Generation eval:** `github.com/blackwell-systems/gcf-go/eval`
- **Eval results:** `github.com/blackwell-systems/gcf/eval/results`
- **Token benchmark:** `github.com/blackwell-systems/toon-benchmark`
- **Conformance suite:** `github.com/blackwell-systems/gcf/tests/conformance` (157 fixtures)
- **Cross-language matrix:** `github.com/blackwell-systems/gcf/tests/cross-language-matrix.py`
- **Tree-sitter grammar:** `github.com/blackwell-systems/tree-sitter-gcf`
- **Playground:** gcformat.com/playground
- **Benchmarks:** gcformat.com/guide/benchmarks
- **Production:** knowing (28 MCP tools), agent-lsp (66 MCP tools), NeuroNest (independent commercial), Open Data Products SDK (Linux Foundation)

---

## Appendix A: Full Example

**JSON (965 tokens):**

```json
{
  "tool": "context_for_task",
  "tokens_used": 1847,
  "token_budget": 5000,
  "symbols": [
    {
      "qualified_name": "github.com/blackwell-systems/knowing/internal/mcp.requireHash",
      "kind": "function",
      "score": 0.78,
      "signature": "func requireHash(args map[string]any, key string) (types.Hash, error)",
      "provenance": "lsp_resolved",
      "distance": 0,
      "components": { "blast_radius": 0.40, "confidence": 0.25, "recency": 0.06, "distance": 0.15 }
    },
    {
      "qualified_name": "github.com/blackwell-systems/knowing/internal/mcp.NewServer",
      "kind": "function",
      "score": 0.54,
      "provenance": "lsp_resolved",
      "distance": 1
    }
  ],
  "edges": [
    {
      "source": "github.com/blackwell-systems/knowing/internal/mcp.NewServer",
      "target": "github.com/blackwell-systems/knowing/internal/mcp.requireHash",
      "edge_type": "calls"
    }
  ]
}
```

**GCF (233 tokens):**

```
GCF profile=graph tool=context_for_task budget=5000 tokens=1847 symbols=2 edges=1
## targets
@0 fn github.com/blackwell-systems/knowing/internal/mcp.requireHash 0.78 lsp_resolved
## related
@4 fn github.com/blackwell-systems/knowing/internal/mcp.NewServer 0.54 lsp_resolved
## edges [1]
@0<@4 calls
```

Same semantic content. 75.9% fewer tokens.

---

## Appendix B: Generic Profile Example

**JSON (458 tokens):**

```json
{
  "orders": [
    {"id": 1001, "customer": "Acme Corp", "total": 49.99, "status": "shipped", "items": 1},
    {"id": 1002, "customer": "Globex Inc", "total": 150.49, "status": "pending", "items": 2},
    {"id": 1003, "customer": "Initech LLC", "total": 250.99, "status": "processing", "items": 3}
  ]
}
```

**GCF (177 tokens):**

```
GCF profile=generic
## orders [3]{id,customer,total,status,items}
1001|Acme Corp|49.99|shipped|1
1002|Globex Inc|150.49|pending|2
1003|Initech LLC|250.99|processing|3
```

Same data. 61% fewer tokens. Token counts verified with tiktoken (cl100k).

---

## Appendix C: Streaming Example

**Streaming mode** (data arriving incrementally):
```
GCF profile=graph tool=context_for_task budget=5000
## targets
@0 fn pkg.Auth 0.95 lsp_resolved
@1 fn pkg.Handler 0.88 lsp_resolved
## related
@2 type pkg.Config 0.72 ast_inferred
## edges [?]
@0<@1 calls
@2<@0 references
##! summary counts=2
```

The `[?]` deferred count marker signals that the count will be provided in the trailer. Both profiles support streaming. Zero-buffering encode with O(1) memory per row.
