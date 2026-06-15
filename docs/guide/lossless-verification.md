# Lossless Verification

GCF guarantees `decode(encode(value)) == value` for every structured value. This page documents how that guarantee is verified.

## The numbers

| Format | Round-trips | Failures |
|--------|------------|----------|
| JSON | 11,250,000,000+ | 0 |
| YAML | 21,000,000,000 | 0 |
| MessagePack | 585,000,000 | 0 |
| CSV | 335,000,000 | 0 |
| TOML | 100,000,000 | 0 |
| **Total** | **33,270,000,000+** | **0** |

33 billion+ random structured values generated, serialized through each format, parsed back, encoded as GCF, decoded from GCF, and compared to the original. Zero mismatches.

## What this proves

**GCF's grammar expresses any structured data regardless of source format.** The encoding operates on structured values (objects, arrays, strings, numbers, booleans, null), not on JSON syntax. Whether your data originates as JSON, YAML, TOML, CSV, MessagePack, or any other format that deserializes to these primitives, GCF encodes it losslessly.

The 5 formats tested are proof points. The capability is universal: any format that produces objects and arrays round-trips through GCF.

## Per-language verification

Six language implementations, all passing the same 157 conformance fixtures:

| Language | Package | Conformance | Round-trip fuzz |
|----------|---------|-------------|-----------------|
| Rust | gcf | 156/156 | **33B+ multi-format** (definitive suite) |
| Go | gcf-go | 156/156 | 1B+ (native Go fuzzing) |
| TypeScript | @blackwell-systems/gcf | 156/156 | Conformance-based |
| Python | gcf-python | 156/156 | Conformance-based |
| Swift | gcf-swift | 156/156 | Conformance-based |
| Kotlin | gcf-kotlin | 156/156 | Conformance-based |

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

157 fixtures in [tests/conformance/](https://github.com/blackwell-systems/gcf/tree/main/tests/conformance) covering:

| Category | Count | What it tests |
|----------|-------|---------------|
| arrays | Various | Empty, primitive, mixed-type arrays |
| attachments | Various | Inline schemas, shared schemas, nested objects |
| containers | Various | Object/array container selection |
| decode | Various | Decoder edge cases |
| errors-v2 | Various | Invalid input rejection |
| graph-decode | Various | Graph profile decoding |
| graph-delta | Various | Delta encoding/decoding |
| graph-encode | Various | Graph profile encoding |
| graph-pack-root | Various | Content-addressed identity |
| graph-session | Various | Session deduplication |
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

**JSON (11.25B total):**
- `rust-json10B-parallel-2026-06-14.log` (10B, 2.94M/s, parallel)
- `rust-json1B-extra-2026-06-14.log` (1B, 2.52M/s, parallel)
- `rust-rerun-json250M-msgpack250M-2026-06-14.log` (250M JSON + 250M MessagePack)

**YAML (11B total):**
- `rust-yaml10B-parallel-2026-06-14.log` (10B, parallel)
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
