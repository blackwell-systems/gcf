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

We've verified this lossless across 11 billion YAML round-trips and 100 million TOML round-trips. GCF is 36% fewer tokens than YAML on the same data. The format decisions that make GCF less human-readable (positional fields, no repeated keys, pipe-delimited rows) are exactly what make it more LLM-readable and more token-efficient.

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

## How stable is the spec?

[Spec v3.1](https://github.com/blackwell-systems/gcf/blob/main/SPEC.md) is designated Stable. Six implementations at v2.1.0+ (Go v1.2.0), 157 conformance fixtures, <strong style="color: var(--vp-c-brand-1)">[33 billion+ lossless round-trips](/guide/lossless-verification)</strong> verified across 5 formats (JSON, YAML, TOML, CSV, MessagePack) and 6 language implementations, cross-language 6x6 matrix passing.

## Why not just compress JSON with gzip?

This isn't compression. It's a different encoding that models comprehend better.

gzip reduces bytes on the wire but not tokens in the context window. The LLM doesn't see gzip bytes; it sees the decompressed text. A gzipped JSON payload that decompresses to 53,341 tokens still costs 53,341 tokens in the context window.

GCF reduces the token count of the text itself. 11,090 tokens for the same data. And the model reads it with [100% accuracy](/guide/benchmarks) where JSON drops to 53.6% at scale. Compression doesn't improve comprehension. GCF does both.

## Why not just use Protobuf?

Protobuf is binary. LLMs can't read binary. You'd deserialize protobuf to text before putting it in the context window, at which point you're back to choosing a text format.

```
With protobuf: Service -> protobuf -> deserialize -> JSON text -> LLM (53,341 tokens)
With GCF:      Service -> JSON -> encode -> GCF text -> LLM (11,090 tokens)
```

Protobuf competes with JSON at the transport layer. GCF competes with JSON at the LLM-ingestion layer. They're complementary. If your backend uses protobuf, decode to a native object, then `encodeGeneric()` to GCF before handing it to the model.

Protobuf also requires `.proto` schema files, code generation, and version management. GCF is schemaless like JSON. And protobuf has no comprehension data: nobody has tested whether LLMs reason better over protobuf-decoded-to-JSON vs raw JSON. We have [1,700+ evaluations](/guide/benchmarks) proving GCF outperforms JSON at the reading step.

## Why not MessagePack or CBOR?

Same answer as protobuf: they're binary. An LLM cannot read MessagePack bytes in a context window. You'd decode to JSON first, losing whatever compression you gained.

GCF is text. It goes directly into the context window. The model reads it natively with [100% accuracy on standard workloads and 90.7% on complex code graphs](/guide/benchmarks) (vs JSON 53.6%) and produces valid output from a 3-line primer. Binary formats solve the wrong layer of the problem.

That said, if your pipeline uses MessagePack internally, GCF handles it: deserialize to a native object, call `encodeGeneric()`. We've verified this path lossless across 585 million round-trips.
