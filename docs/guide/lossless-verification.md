# Lossless Verification

GCF guarantees `decode(encode(value)) == value` for every structured value. This page documents how that guarantee is verified.

## The numbers

| Format | Round-trips | Failures |
|--------|------------|----------|
| JSON | 21,250,000,000 | 0 |
| YAML | 21,000,000,000 | 0 |
| MessagePack | 584,000,000 | 0 |
| CSV | 335,000,000 | 0 |
| TOML | 100,000,000 | 0 |
| **Total** | **43,270,000,000+** | **0** |

43 billion+ random structured values generated, serialized through each format, parsed back, encoded as GCF, decoded from GCF, and compared to the original. Zero mismatches.

## What this proves

**GCF's grammar expresses any structured data regardless of source format.** The encoding operates on structured values (objects, arrays, strings, numbers, booleans, null), not on JSON syntax. Whether your data originates as JSON, YAML, TOML, CSV, MessagePack, or any other format that deserializes to these primitives, GCF encodes it losslessly.

The 5 formats tested are proof points. The capability is universal: any format that produces objects and arrays round-trips through GCF.

## Per-language verification

Six language implementations, all passing the same 204 conformance fixtures:

| Language | Package | Conformance | Round-trip fuzz |
|----------|---------|-------------|-----------------|
| Rust | gcf | 204/204 | **43B+ multi-format** (definitive suite) |
| Go | gcf-go | 204/204 | 1B+ (native Go fuzzing) |
| TypeScript | @blackwell-systems/gcf | 204/204 | Conformance-based |
| Python | gcf-python | 204/204 | Conformance-based |
| Swift | gcf-swift | 204/204 | Conformance-based |
| Kotlin | gcf-kotlin | 204/204 | Conformance-based |

### Cross-language matrix

Every implementation can encode data that every other implementation decodes correctly. The 6x6 encode/decode matrix is fully verified: encode in Go, decode in Python. Encode in Rust, decode in Swift. Every combination passes.

## How the fuzz testing works

Each test generates random structured values using a seeded PRNG, ensuring reproducibility. The round-trip is:

```
1. Generate random value (objects, arrays, scalars, nested to depth 3-4)
2. Serialize to format X (JSON, YAML, TOML, CSV, or MessagePack)
3. Parse back from format X (normalize types)
4. Encode as GCF via encode_generic()
5. Decode from GCF via decode_generic()
6. Deep-compare decoded value to step 3 output
7. Any mismatch = test failure (zero tolerance)
```

The value generator produces:
- Null, booleans, integers, floats, strings
- Objects with 0-6 keys (alphanumeric keys with underscores, hyphens, dots)
- Arrays with 0-8 elements
- Nesting to depth 3-4
- Strings with spaces, punctuation, unicode-safe characters

Each seed produces a unique value. Seeds are sequential (0, 1, 2, ..., N). The tests are fully deterministic and reproducible.

## Reproduce it

```bash
git clone https://github.com/blackwell-systems/gcf-rust
cd gcf-rust

# JSON 10B (parallel, ~56 min on 14-core machine)
cargo test --release json_10b -- --nocapture

# YAML 10B (parallel, ~3 hours)
cargo test --release yaml_10b -- --nocapture

# MessagePack + YAML + CSV (334M each)
cargo test --release multiformat -- --nocapture

# TOML 100M
cargo test --release toml_100m -- --nocapture
```

All tests use Rayon for parallel execution across all available cores. Progress logs to stderr with rate and ETA. The Rust implementation is the definitive fuzz suite: 2.94M round-trips/second on JSON, 307K/s on YAML, at release optimization.

## Conformance fixtures

204 fixtures in [tests/conformance/](https://github.com/blackwell-systems/gcf/tree/main/tests/conformance) covering:

| Category | Count | What it tests |
|----------|-------|---------------|
| arrays | Various | Empty, primitive, mixed-type arrays |
| attachments | Various | Inline schemas, shared schemas, nested objects |
| containers | Various | Object/array container selection |
| decode | Various | Decoder edge cases |
| errors-v2 | Various | Invalid input rejection |
| flatten | Various | Nested-object flattening (`>` path columns) |
| graph-decode | Various | Graph profile decoding |
| graph-delta | Various | Delta encoding/decoding |
| graph-encode | Various | Graph profile encoding |
| graph-pack-root | Various | Content-addressed identity |
| graph-session | Various | Session deduplication |
| generic-delta | Various | Generic-profile keyed delta encoding |
| generic-delta-session | Various | Generic-profile delta across a session |
| generic-pack-root | Various | Generic-profile content-addressed identity |
| inline-schema | Various | Inline attachment schemas |
| keys | Various | Bare keys, quoted keys, special characters |
| numbers | Various | Integer, float, negative, scientific notation |
| roots | Various | Root-level values |
| scalar | Various | All scalar types and edge cases |
| streaming-v2 | Various | Deferred counts, summary trailers |
| whitespace | Various | Indentation, trailing whitespace |

Every implementation must pass every fixture. New fixtures are added when edge cases are discovered (e.g., [special-character field names](https://github.com/blackwell-systems/gcf/blob/main/tests/conformance/keys/011_special_char_field_names.json) added during multi-format fuzz testing).

## Log files

All fuzz run logs are archived in [eval/results/multiformat/](https://github.com/blackwell-systems/gcf/tree/main/eval/results/multiformat). Every claimed number has a corresponding log file.

**JSON (21.25B total):**
- `rust-json10B-parallel-2026-06-19.log` (10B, 2.79M/s, parallel)
- `rust-json10B-parallel-2026-06-14.log` (10B, 2.94M/s, parallel)
- `rust-json1B-extra-2026-06-14.log` (1B, 2.52M/s, parallel)
- `rust-rerun-json250M-msgpack250M-2026-06-14.log` (250M JSON + 250M MessagePack)

**YAML (21B total):**
- `rust-yaml10B-parallel-2026-06-14.log` (10B, 258K/s, parallel, 10.7 hours)
- `rust-yaml10B-parallel-2026-07-13.log` (10B, 258K/s, parallel, 10.78 hours)
- `rust-yaml665M-2026-06-14.log` (665M, seed offset 334M-999M)
- `rust-msgpack334M-yaml334M-csv334M-2026-06-13.log` (334M YAML portion)

**MessagePack (584M total):**
- `rust-msgpack334M-yaml334M-csv334M-2026-06-13.log` (334M MessagePack portion)
- `rust-rerun-json250M-msgpack250M-2026-06-14.log` (250M MessagePack portion)

**CSV (335M total):**
- `rust-msgpack334M-yaml334M-csv334M-2026-06-13.log` (334M CSV portion)
- `rust-rerun-csv1M-2026-06-14.log` (1M, seed offset 334M)

**TOML (100M total):**
- `rust-toml100M-2026-06-14.log` (100M)

## Extended validation: 17 formats

Beyond the 43 billion round-trips across 5 formats, we validated GCF against 12 additional serialization formats using the Format Mega-Gauntlet. This test converts data through all 17 formats in sequence with GCF as the bridge between each:

```
JSON → XML → MessagePack → YAML → BSON → TOML → CBOR → Protobuf → 
CSV → JSON5 → Avro → Arrow → Parquet → Pickle → INI → NDJSON → Plist → JSON
```

15 conversions. 17 formats. The final JSON exactly matches the original.

**Format categories validated:**

| Category | Formats |
|----------|---------|
| Text | JSON, YAML, TOML, XML, CSV, INI, JSON5, NDJSON |
| Binary | MessagePack, BSON, CBOR, Pickle, Plist |
| Schema-based | Protocol Buffers, Apache Avro |
| Columnar | Apache Arrow, Apache Parquet |

This proves GCF's codec is trustworthy regardless of where your data originated. Whether it came from a Protobuf microservice, a Parquet data lake, or a YAML config file, you can safely encode it as GCF (for LLM consumption or wire transmission) and decode it back without data loss.

**Run it yourself:**

```bash
cd gcf/examples
pip install msgpack pyyaml pymongo tomli tomli_w cbor2 json5 protobuf avro-python3 pyarrow
protoc --python_out=. test_data.proto
python3 mega-gauntlet.py
```

---

## Edge cases verified

The fuzz testing has specifically verified:

- **Null values** in all positions (root, object field, array element, tabular cell)
- **Empty strings** vs null vs absent (distinct encodings: `""`, `-`, `~`)
- **Boolean strings** ("true", "false" as string values, not parsed as booleans)
- **Numeric strings** ("42" as string, not parsed as number)
- **Special characters in keys** (%, !, @, #, quoted in field declarations)
- **Deeply nested objects** (depth 3-4, objects within arrays within objects)
- **Empty containers** (empty arrays, empty objects)
- **Float precision** (round-trip preserves values within JSON's double-precision range)
- **Large integers** (up to 2^53 - 1, JavaScript's MAX_SAFE_INTEGER)
- **Unicode** (multi-byte characters in keys and values)

---

## Truncation tolerance and completeness validation

The lossless guarantee above covers *complete* documents: a well-formed GCF payload always decodes back to the original value. A separate question is what happens to an *incomplete* document, one truncated mid-stream by a dropped connection, a cut-off model response, or a filled buffer.

**GCF's generic (tabular) profile is tolerant of truncation by design.** Because the format is line-oriented and each row is self-contained, a decoder can make sense of the rows it did receive even if the stream is cut short. This is the same property that enables input-side streaming (encoding unknown-length data, decoding rows as they arrive). It is a deliberate capability, not a defect.

The tradeoff is that GCF does not, by default, *reject* a truncated document the way JSON does. JSON's rejection of truncated input is a side effect of its mandatory closing delimiters: a document cut before its final `}` (or `]`, or closing `"`) is syntactically invalid, so the parser fails. That "fail-closed on truncation" behavior is grammatical luck, not an integrity mechanism, and it is not guaranteed (a cut landing exactly on a complete boundary parses cleanly). GCF trades those redundant closing tokens for compactness and streaming, so a truncated tabular stream still decodes.

**This is not a leak.** A truncated GCF document does not expose or corrupt attacker-controlled values; the format's field boundaries hold regardless (see the [format-level security tests](#) in `gcf-go/security_test.go`). Truncation tolerance is purely a question of whether a partial stream fails loudly or decodes what it has.

### Validating completeness when it matters

For security- or integrity-sensitive inputs, completeness should be validated at the layer that owns integrity, which is stronger than any in-band marker:

- **Transport**: TLS provides stream integrity; HTTP `Content-Length` / chunked framing signals a truncated body.
- **Message**: a checksum or HMAC over the payload detects truncation *and* tampering.
- **Streaming trailer**: the `##! summary counts=N` trailer (see [Streaming Encoding](/guide/streaming)) lets a consumer verify it received all expected rows; its absence on a stream that should have one indicates truncation.

A future opt-in decoder-side strict mode (see the [roadmap](https://github.com/blackwell-systems/gcf/blob/main/ROADMAP.md)) will let consumers that want JSON-style fail-closed behavior enforce completeness at decode time, without changing the wire format or the default token count.
