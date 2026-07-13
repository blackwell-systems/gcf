# FAQ

[[toc]]

## Is GCF just a codec?

No. A codec is invisible infrastructure that gets decoded before consumption. The LLM reads GCF directly. It's the final format, not an intermediate state. `decode()` is optional, only needed when a human wants to see the data.

GCF has its own grammar, its own spec, its own syntax. It's a wire format: it lives at the boundary between your data and the LLM context window. Data is stored in whatever format is natural (JSON, a database, YAML configs). At the moment it enters the context window, it becomes GCF. The model reads it natively.

## Can LLMs actually read GCF without training?

Yes. No model has ever been trained on GCF. The format didn't exist before we built it. Every frontier model reads it natively because GCF uses patterns LLMs already understand:

- `## section` is a markdown header
- `key=value` is a config file
- `col1|col2|col3` is a table row

[Every frontier model hits 100% comprehension](/guide/benchmarks) on standard workloads. Every frontier model produces valid GCF at 5/5 from a 3-line primer.

## What about YAML or TOML?

GCF handles data from any format. If your pipeline produces YAML, parse it, call `encodeGeneric()`. Same for TOML, CSV, MessagePack, or anything else that deserializes to structured values.

We've verified this lossless across 43 billion+ round-trips in 5 formats (JSON 21.25B, YAML 21B, MessagePack 584M, CSV 335M, TOML 100M). GCF is 36% fewer tokens than YAML on the same data. The format decisions that make GCF less human-readable (positional fields, no repeated keys, pipe-delimited rows) are exactly what make it more LLM-readable and more token-efficient.

## What if my consumer can't parse GCF?

Use the [MCP proxy](/guide/proxy). It wraps any existing MCP server, converts JSON responses to GCF for the LLM, and converts back to JSON for non-GCF consumers. Zero code changes.

```bash
gcf-proxy your-mcp-server
```

Or call `decodeGeneric()` at the boundary. GCF decodes losslessly to the original structured data. The last-mile rendering is always JSON (or whatever format you prefer) for humans and systems that expect it.

## Does GCF support JSON Schema validation?

Yes. Decode first, then validate with any JSON Schema validator. Your existing schemas work unchanged. [Full guide](/guide/schema-validation).

```python
data = decode_generic(gcf_response)
jsonschema.validate(data, existing_schema)
```

## How does GCF compare to TOON?

GCF wins on every measured dimension. 29% fewer tokens across 16 real-world datasets (15/16 wins; TOON's one win is 77 tokens on a single dataset). 91.2% comprehension where TOON averages 68.8%. 5/5 generation validity on every frontier model while TOON's decoder rejects output from 7 of 9 models. Session deduplication that compounds to 92% savings by the 5th tool call, a feature TOON structurally cannot add.

TOON is a tree serializer: YAML with counted arrays. It encodes flat tabular data efficiently. It cannot encode relationships, cross-references, session state, or deltas. Adding local IDs would require a new grammar. Adding session dedup would require local IDs. TOON would have to become a different format to match what GCF already ships.

[Full comparison with benchmarks, failure analysis, and code examples](/guide/vs-toon).

## What languages are supported?

Six official implementations, all MIT licensed, zero runtime dependencies:

- **Go** ([pkg.go.dev](https://pkg.go.dev/github.com/blackwell-systems/gcf-go)) v1.5.0
- **TypeScript** ([npm](https://www.npmjs.com/package/@blackwell-systems/gcf)) v2.4.0
- **Python** ([PyPI](https://pypi.org/project/gcf-python/)) v2.4.0
- **Rust** ([crates.io](https://crates.io/crates/gcf)) v2.4.0
- **Swift** ([SPM](https://github.com/blackwell-systems/gcf-swift)) v2.4.0
- **Kotlin** ([JitPack](https://jitpack.io/#blackwell-systems/gcf-kotlin)) v2.4.0

All pass 204 conformance fixtures. All support both generic and graph profiles, streaming, session dedup, delta encoding, and CLI. [Full details](/ecosystem/implementations).

## Does GCF work with open-weight models?

Yes. GCF outperforms JSON on every open-weight model tested (LLaMA, Mistral, Granite, Qwen). Open-weight models currently comprehend GCF's expanded encoding (attachment syntax for nested objects) better than the flattened path column encoding. All 6 SDKs and the proxy support this:

```python
encode_generic(data, GenericOptions(no_flatten=True))   # Python
```
```bash
gcf-proxy --no-flatten your-mcp-server                  # Proxy
```

Proprietary frontier models (Claude, GPT-5.5, Gemini, Grok) handle both encodings identically at 100%. This gap is expected to close as open-weight models improve. [Full findings](/guide/llm-integration#nested-object-flattening-proprietary-vs-open-weight-split).

## What's the encoding/decoding overhead?

Negligible. Encoding and decoding are single-pass string operations with no I/O, no network calls, no allocation beyond the output buffer. On typical MCP tool response sizes (1K to 100K tokens), encode/decode takes microseconds to low milliseconds.

The Rust implementation encodes at 2.94 million round-trips per second on JSON data. Go and TypeScript are similarly fast. The encoding cost is invisible compared to the LLM API call it's optimizing (which takes seconds and costs dollars).

## Can I use GCF with LangChain, CrewAI, or other frameworks?

Yes. GCF works at the tool response level. Encode your tool's output as GCF before it enters the context window, decode when a human needs to see it. This works with any framework that supports custom tool responses.

For zero-code adoption, the [MCP proxy](/guide/proxy) wraps any existing MCP server and re-encodes JSON responses as GCF mid-flight. No framework changes needed.

```python
# LangChain example: encode tool output
from gcf import encode_generic

@tool
def search_flights(query: str) -> str:
    results = flight_api.search(query)
    return encode_generic(results)  # LLM reads GCF, 71% fewer tokens
```

## Is GCF open source?

Yes. MIT licensed. The [spec](https://github.com/blackwell-systems/gcf), all six implementations, the proxy, the plugins, the tree-sitter grammar, the eval harness, and all benchmark logs are open source. Every claimed number has a corresponding log file in the repository.

## How stable is the spec?

[Spec v3.4.1](https://github.com/blackwell-systems/gcf/blob/main/SPEC.md) is designated Stable. Six implementations at v2.4.0+ (Go v1.5.0), 204 conformance fixtures, <strong style="color: var(--vp-c-brand-1)">[43 billion+ lossless round-trips](/guide/lossless-verification)</strong> verified across 5 formats (JSON, YAML, TOML, CSV, MessagePack) and 6 language implementations, cross-language 6x6 matrix passing.

## Why not just compress JSON with gzip?

This isn't compression. It's a different encoding that models comprehend better.

gzip reduces bytes on the wire but not tokens in the context window. The LLM doesn't see gzip bytes; it sees the decompressed text. A gzipped JSON payload that decompresses to 53,341 tokens still costs 53,341 tokens in the context window.

GCF reduces the token count of the text itself. 11,090 tokens for the same data. And the model reads it with [100% accuracy](/guide/benchmarks) where JSON drops to 54.1% at scale. Compression doesn't improve comprehension. GCF does both.

## Why not just use Protobuf?

Protobuf is binary. LLMs can't read binary. You'd deserialize protobuf to text before putting it in the context window, at which point you're back to choosing a text format.

```
With protobuf: Service -> protobuf -> deserialize -> JSON text -> LLM (53,341 tokens)
With GCF:      Service -> JSON -> encode -> GCF text -> LLM (11,090 tokens)
```

Protobuf competes with JSON at the transport layer. GCF competes with JSON at the LLM-ingestion layer. They're complementary. If your backend uses protobuf, decode to a native object, then `encodeGeneric()` to GCF before handing it to the model.

Protobuf also requires `.proto` schema files, code generation, and version management. GCF is schemaless like JSON. And protobuf has no comprehension data: nobody has tested whether LLMs reason better over protobuf-decoded-to-JSON vs raw JSON. We have [2,500+ evaluations](/guide/benchmarks) proving GCF outperforms JSON at the reading step.

## Why not MessagePack or CBOR?

Same answer as protobuf: they're binary. An LLM cannot read MessagePack bytes in a context window. You'd decode to JSON first, losing whatever compression you gained.

GCF is text. It goes directly into the context window. The model reads it natively with [100% accuracy on standard workloads and 91.2% on complex code graphs](/guide/benchmarks) (vs JSON 54.1%) and produces valid output from a 3-line primer. Binary formats solve the wrong layer of the problem.

That said, if your pipeline uses MessagePack internally, GCF handles it: deserialize to a native object, call `encodeGeneric()`. We've verified this path lossless across 585 million round-trips.
