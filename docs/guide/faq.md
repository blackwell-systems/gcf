# FAQ

## Why not just use Protobuf?

Protobuf is binary. LLMs can't read binary. You'd deserialize protobuf to text before putting it in the context window, at which point you're back to choosing a text format.

```
With protobuf: Service -> protobuf -> deserialize -> JSON text -> LLM (53,341 tokens)
With GCF:      Service -> JSON -> encode -> GCF text -> LLM (11,090 tokens)
```

Protobuf competes with JSON at the transport layer. GCF competes with JSON at the LLM-ingestion layer. They're complementary. If your backend uses protobuf, decode to a native object, then `encodeGeneric()` to GCF before handing it to the model.

Protobuf also requires `.proto` schema files, code generation, and version management. GCF is schemaless like JSON. And protobuf has no comprehension data: nobody has tested whether LLMs reason better over protobuf-decoded-to-JSON vs raw JSON. We have [1,300+ evaluations](/guide/benchmarks) proving GCF outperforms JSON at the reading step.

## Why not MessagePack or CBOR?

Same answer as protobuf: they're binary. An LLM cannot read MessagePack bytes in a context window. You'd decode to JSON first, losing whatever compression you gained.

GCF is text. It goes directly into the context window. The model reads it natively with [90.7% comprehension accuracy](/guide/benchmarks) and produces valid output from a 3-line primer. Binary formats solve the wrong layer of the problem.

## Why not just compress JSON with gzip?

gzip reduces bytes on the wire but not tokens in the context window. The LLM doesn't see gzip bytes; it sees the decompressed text. A gzipped JSON payload that decompresses to 53,341 tokens still costs 53,341 tokens in the context window.

GCF reduces the token count of the text itself. 11,090 tokens for the same data. The savings are in the representation, not the transport.

## What about YAML or TOML?

YAML and TOML are human-readable configuration formats. They weren't designed for token efficiency or LLM comprehension at scale. At 500 records, YAML's indentation-based nesting produces more tokens than JSON (every nested field adds whitespace tokens). TOML doesn't support arrays of objects well.

GCF is purpose-built for machine readers: positional fields (no repeated keys), section headers (structural grouping), and pipe-delimited rows (maximum density). The format decisions that make it less human-readable are exactly what make it more LLM-readable.

## Can LLMs actually read GCF without training?

Yes. No model has ever been trained on GCF. The format didn't exist before we built it. Every frontier model reads it natively because GCF uses patterns LLMs already understand:

- `## section` is a markdown header
- `key=value` is a config file
- `col1|col2|col3` is a table row

[Four models hit 100% comprehension](/guide/benchmarks). Every frontier model produces valid GCF at 5/5 from a 3-line primer.

## What if my consumer can't parse GCF?

Use the [MCP proxy](/guide/proxy). It wraps any existing MCP server, converts JSON responses to GCF for the LLM, and converts back to JSON for non-GCF consumers. Zero code changes.

```bash
gcf-proxy your-mcp-server
```

Or call `decodeGeneric()` at the boundary. GCF decodes losslessly to JSON. The last-mile rendering is always JSON for humans and systems that expect it.

## Does GCF support JSON Schema validation?

Yes. Decode first, then validate with any JSON Schema validator. Your existing schemas work unchanged. [Full guide](/guide/schema-validation).

```python
data = decode_generic(gcf_response)
jsonschema.validate(data, existing_schema)
```

## How stable is the spec?

[Spec v2.0](https://github.com/blackwell-systems/gcf/blob/main/SPEC.md) is designated Stable. The wire format will not change in backwards-incompatible ways. Six implementations at v1.0.0+, 141 conformance fixtures, 200M+ lossless round-trips verified, cross-language matrix passing.
