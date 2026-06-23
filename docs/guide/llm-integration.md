# Using GCF with LLMs

GCF works in both directions: tools produce it, LLMs read it, and LLMs can produce it too. No model has ever been trained on GCF. Reading requires no primer: 100% accuracy on standard workloads (every frontier model), 91.2% on structurally complex code graphs (vs TOON 68.2%, JSON 53.4%). Writing requires a 3-line example and produces valid output with **63% fewer tokens than JSON** and **33% fewer than TOON**.

## Designed for agent comprehension, not human scanning

GCF looks dense to human eyes. `@0<@1 calls` is not as immediately obvious as `{"source": "pkg.Server", "target": "pkg.Auth", "edge_type": "calls"}`. That's deliberate.

Human-readability and LLM-readability are different things, and they diverge at scale. At 8 records, both JSON and GCF are easy for humans and LLMs alike. At 500 records, JSON's field-name repetition creates enough structural noise that LLMs lose count (53.6% on code graphs, 76.9% on nested orders with Gemini Flash). GCF's dense, positional format cuts through that noise (100% on standard workloads, 90.7% on code graphs).

Here's what JSON at 500 symbols looks like to an LLM. Every record repeats five field names:

```json
{"qualified_name":"github.com/org/repo/internal/auth.Middleware","kind":"function","score":0.78,"provenance":"lsp_resolved","distance":0},
{"qualified_name":"github.com/org/repo/internal/auth.ValidateToken","kind":"function","score":0.87,"provenance":"lsp_resolved","distance":0},
{"qualified_name":"github.com/org/repo/internal/auth.Config","kind":"type","score":0.71,"provenance":"ast_inferred","distance":0},
... 497 more records identical in structure ...
```

The model sees `"qualified_name":` 500 times, `"kind":` 500 times, `"score":` 500 times. That's 2,500 structurally identical tokens competing for attention. The model asked "how many symbols?" answered 320. Asked "how many targets?" answered 240 (correct: 166). It's not hallucinating; it's losing count in repetitive noise.

The same data in GCF:

```
@0 fn github.com/org/repo/internal/auth.Middleware 0.78 lsp_resolved
@1 fn github.com/org/repo/internal/auth.ValidateToken 0.87 lsp_resolved
@2 type github.com/org/repo/internal/auth.Config 0.71 ast_inferred
... 497 more, each one line, no repeated field names ...
```

No noise. Every token is content. On code graph data, GCF averages 91.2% across 24 runs and 10 models (vs TOON 68.2%, JSON 53.4%). On nested order data (27 runs, 11 models, 4 providers), GCF achieves 100% on every frontier model (Opus, Sonnet, Haiku, GPT-5.5, Gemini 2.5 Pro, Gemini 3.1 Pro, Gemini 3.5 Flash).

The format is optimized for the actual consumer. Every character carries meaning. No decoration, no repeated field names, no structural tokens that exist only for human scanners. The result is a format that agents understand perfectly and costs a fraction of the "readable" alternative. The [tokenizer analysis](/guide/tokenizer-analysis) explains the mechanism: JSON's grammar symbols merge with field names at the vocabulary level, hiding structural boundaries from the model.

## Readability is a last-mile rendering concern

If a human needs to see the data, the agent calls `decode()` and outputs JSON. One function call. The context window savings are already banked.

```python
from gcf import decode
import json

# Agent reads GCF (cheap: 11,090 tokens for 500 symbols)
payload = decode(gcf_text)

# Agent does its work using the parsed data...

# Human wants to see it? Render as JSON at the end (one call, no context cost)
print(json.dumps(payload, indent=2))
```

You don't make HTTP headers human-readable. You don't make protobuf human-readable. You use a viewer. GCF is the wire format; JSON is the viewer format. They serve different roles. The expensive direction (filling the context window with tool responses) should use the cheapest encoding. The cheap direction (one final output for a human) can use whatever the human prefers.

The gcf-proxy proves this pattern works in reverse: the MCP server outputs JSON, the proxy re-encodes to GCF mid-flight, the LLM reads GCF. Same principle, both directions: use the right format for each leg of the journey.

## No primer needed for reading (proven)

GCF payloads are immediately comprehensible to frontier models without any format description in the prompt. This isn't a claim; it's measured.

The [comprehension eval](https://github.com/blackwell-systems/gcf-go/tree/main/eval) sends payloads to LLMs with **zero format instructions**: only the raw payload and a question. 13 questions per run, all deterministic. Tested across 11 models and 4 providers (Anthropic, OpenAI, Google, Mistral).

**Generic profile (500 orders, nested data):**

| Model Class | GCF | TOON | JSON |
|-------------|-----|------|------|
| Frontier (7 models) | **100%** on every run | 97.4% avg | 100% avg |
| Mid-tier (4 models) | **79.3%** avg | 77.7% avg | 75.6% avg |

**27 runs, 11 models, 4 providers.** Frontier models (Opus, Sonnet, Haiku, GPT-5.5, Gemini 2.5 Pro, Gemini 3.1 Pro, Gemini 3.5 Flash) achieve 100% GCF on every run. GCF averages equal or better than JSON on every model.

**Graph profile (500 symbols + 200 edges):**

| Format | Avg accuracy (10 models) | Tokens |
|--------|--------------------------|--------|
| **GCF** | **91.2%** | **11,090** |
| TOON | 68.2% | 16,378 |
| JSON | 53.4% | 53,341 |

**24 runs, 10 models, 3 providers. GCF wins 23, ties 1, loses 0.** JSON fails on counting tasks because field-name repetition overwhelms attention. TOON fails on distance grouping (no section headers). GCF answers structurally. See the [full benchmarks](/guide/benchmarks) for per-model results.

The model was never told what `@0`, `##`, or `<` mean. It figured it out from the structure. The format is regular enough (positional fields, consistent prefixes, section headers) that pattern recognition handles it.

### Nested object flattening: proprietary vs open-weight split

GCF v3.2 introduced nested object flattening, which promotes fixed-shape nested objects into path columns (`"customer>name"` in the tabular header instead of a separate attachment block). This saves 20-48% more tokens on deeply nested API data.

40+ eval runs across 20 models and 8 providers revealed an important split:

| Model class | Flattened vs non-flattened | Recommendation |
|-------------|---------------------------|----------------|
| **Proprietary frontier** (Claude, GPT-5.5, Gemini, Grok) | Zero regression | Use default (flatten on) |
| **Open-weight** (LLaMA, Mistral, Granite, Qwen) | 8-23pp regression at 500 rows | Use `noFlatten` |

Flattening is on by default because frontier models handle it perfectly and the token savings are significant. If you're deploying against open-weight models, all 6 SDKs and the proxy support an opt-out:

```go
gcf.EncodeGeneric(data, gcf.GenericOptions{NoFlatten: true})  // Go
```
```typescript
encodeGeneric(data, { noFlatten: true })                       // TypeScript
```
```python
encode_generic(data, GenericOptions(no_flatten=True))           # Python
```
```bash
gcf-proxy --no-flatten your-mcp-server                         # Proxy
```

The opt-out produces the pre-v3.2 attachment encoding for nested objects. Same data, same round-trip guarantee, same savings on flat data. Only the encoding of nested objects changes.

If you want to include a primer for clarity:

```
GCF format: Symbols are @id kind qualified_name score provenance. 
Edges are @target<@source type. Sections marked with ##.
```

That's sufficient. Don't over-explain.

## LLM output generation (proven)

LLMs can produce valid GCF given a short format example. 28 runs across 9 models and 3 providers, validated through real decoders (including TOON's official [toon-go](https://github.com/toon-format/toon-go) library):

| Model | GCF | TOON | JSON |
|-------|-----|------|------|
| Claude Opus 4.6 | **5/5** | 0/5 | 5/5 |
| Claude Sonnet 4.6 | **5/5** | 2-3/5 | 5/5 |
| GPT-5.5 | **4-5/5** | 1-2/5 | 5/5 |
| Gemini 2.5 Pro | **5/5** | 1/5 | 5/5 |
| Gemini 3.1 Pro | **5/5** | 0/5 | 5/5 |

**GCF 5/5 on every frontier model. TOON fails on 7 of 9 models.** GCF output is 63% smaller than JSON and 33% smaller than TOON. See the [full benchmarks](/guide/benchmarks) for the complete generation analysis.

The primer is 3 lines:

```
GCF format: header starts with "GCF profile=graph tool=", symbols are @id kind qname score provenance,
edges are @target<@source type (< not >), sections are ## targets/related/extended/edges.
Kind abbreviations: function=fn, type=type, method=method, interface=iface.
```

### When to use GCF for output

- **Agent-to-agent communication.** Agents passing context to each other in multi-agent workflows. 63% fewer tokens per handoff.
- **Structured output.** When you need the model to return structured data and want to minimize output tokens.
- **Tool responses.** An agent returning results to a tool. The tool parses with `decode()`.

### When to use JSON for output

- **Interoperability.** If the consumer is a non-LLM system that expects JSON.
- **Provider structured output modes.** If you're using a provider's built-in JSON mode (OpenAI structured outputs, Anthropic tool use).
- **Schema validation.** JSON Schema works on decoded GCF (`decode()` then validate). See [Schema Validation](/guide/schema-validation).

## Prompt patterns

### Code intelligence context

```
Here is the code context for this task:

{gcf_payload}

Based on this context, implement the requested feature.
```

The LLM reads the GCF payload naturally. It identifies top-scored symbols, traces call paths through edges, and understands code topology from the hierarchical grouping (`## targets`, `## related`, `## extended`).

### Incremental updates (delta)

```
The context has been updated. Here's what changed:

{gcf_delta_payload}

The symbols in ## removed are no longer relevant. 
The symbols in ## added are new. Adjust your approach.
```

### Session continuity

When using session deduplication, the LLM sees bare references (`@7  # previously transmitted`) alongside full declarations. It doesn't need to act on the bare refs; they're context markers confirming overlap with prior responses. The LLM already has the full declaration from an earlier message in the conversation.

### Generic data

```
Here is the data:

{gcf_tabular_payload}

Analyze the trends and summarize.
```

The tabular format (`## employees [3]{id,name,department,salary}` followed by pipe-separated rows) is structurally similar to CSV with headers, which every model handles natively.

## What LLMs extract from GCF

The format's regularity makes structured extraction reliable:

- Every symbol starts with `@{id}` (filter by prefix)
- Kind is always the 2nd field (filter by type)
- Score is always the 4th field (sort by relevance)
- `## targets` is always the most relevant subset (skip to what matters)
- Edges use `@target<@source type` (trace call paths)

For the generic profile:
- `## name [count]{fields}` declares the schema (one line)
- Rows are positional values separated by `|`
- Nested objects with 3+ fields use `^{fields}` inline schema (positional on next line)
- Smaller nested objects use `^` cell marker with `.field {}` attachment

## Token budget management

GCF payloads include `budget` and `tokens` in the header:

```
GCF profile=graph tool=context_for_task budget=5000 tokens=1847 symbols=10 edges=8
```

The producing tool packs symbols up to the budget. The consumer can verify how much budget was consumed. The `edges=N` field lets the model verify edge count without scanning. This enables multi-tool orchestration where each tool gets a share of the total context budget.

## Error handling

If the LLM receives truncated GCF (response cut off):
- The `symbols=N` header field lets it verify completeness
- Group headers are self-describing (missing `## edges [N]` means no edges were included)
- Each line is independent (a truncated line doesn't break parsing of prior lines)

## Reproduce the eval

```bash
git clone https://github.com/blackwell-systems/gcf-go
cd gcf-go/eval

# Generic profile (500 orders, nested data)
GOWORK=off EVAL_FORMATS=gcf,json,toon EVAL_BACKEND=cli EVAL_MODEL=haiku EVAL_NUM_ORDERS=500 go test -run TestGenericComprehension -v -timeout 0

# Graph profile (500 symbols, 200 edges)
GOWORK=off go test -run TestComprehension -v -timeout 0
```

Both evals encode data in GCF, TOON, and JSON, send each to an LLM, and measure accuracy on 13 structured extraction questions. Deterministic ground truth, no LLM judge.
