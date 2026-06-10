# GCF v2.0 Conformance Suite

This directory is the canonical conformance suite for `SPEC.md` v2.0. Implementations SHOULD recursively load JSON fixtures from this directory and dispatch each fixture using its explicit `operation` field.

The incompatible v1 fixtures are retained in `tests/conformance-v1/` for historical implementation migration. They MUST NOT be included in v2 conformance runs.

## Operations

| Operation | Contract |
|-----------|----------|
| `encode` | Encode `input` and byte-match the GCF string in `expected` |
| `decode` | Decode the GCF string in `input` and structurally compare `expected` |
| `error` | Decode `input` and require the category in `expectedError` |
| `session` | Encode each entry in `calls` with shared session state |
| `delta` | Delta-encode `input` and byte-match `expected` |

Error fixtures normally use a JSON string in `input`. The malformed UTF-8 fixture uses `inputBase64`; runners MUST base64-decode it to raw bytes before invoking the decoder.

## Structure

| Directory | Fixtures | Coverage |
|-----------|---------:|----------|
| `scalar/` | 26 | Scalar identity, quoting, escapes, Unicode |
| `numbers/` | 15 | JSON numbers, normalized exponents, and notation boundaries |
| `keys/` | 10 | Bare and quoted keys and field declarations |
| `containers/` | 7 | Missing values, field unions, empty containers, indentation |
| `attachments/` | 7 | Nested tabular values and attachment matching |
| `arrays/` | 5 | Mixed, expanded, and recursive arrays |
| `roots/` | 11 | Object, array, scalar, null, and empty roots |
| `decode/` | 5 | Independently authored positive generic decoder inputs |
| `graph-encode/` | 2 | Buffered graph encoding and deterministic ordering |
| `graph-decode/` | 2 | Buffered graph decoding, comments, CRLF, and kinds |
| `graph-session/` | 1 | Stable session-scoped symbol IDs |
| `graph-delta/` | 1 | Delta profile header and sections |
| `streaming-v2/` | 3 | Deferred counts and summary trailers |
| `whitespace/` | 3 | Comments, blank lines, and CRLF |
| `errors-v2/` | 35 | Generic, header, Unicode, attachment, count, and graph errors |
| **Total** | **133** | |

## Fixture Examples

Encode:

```json
{
  "name": "bare_key",
  "description": "A bare key and scalar value",
  "input": {"key": "value"},
  "expected": "GCF profile=generic\nkey=value\n",
  "operation": "encode"
}
```

Decode:

```json
{
  "name": "decode_root_scalar",
  "description": "Decode a root scalar",
  "input": "GCF profile=generic\n=true\n",
  "expected": true,
  "operation": "decode"
}
```

Error:

```json
{
  "name": "invalid_missing",
  "description": "The missing marker is valid only in tabular cells",
  "input": "GCF profile=generic\nvalue=~\n",
  "expectedError": "invalid_missing",
  "operation": "error"
}
```

## Required Runner Checks

- Validate every fixture against its operation contract.
- Compare encoder output byte-for-byte, including final LF.
- Compare decoded JSON structurally.
- Require the exact documented error category.
- Run `decode(encode(input)) == input` for every `encode` fixture whose input is JSON data.
- Do not infer operation from the JSON types of `input` and `expected`.
