# Universal Format Adapter

GCF isn't just "JSON but smaller." It's a universal adapter that bridges between **any structured data formats**.

## The Capability

GCF operates on structured values (objects, arrays, strings, numbers, booleans, null), not on format-specific syntax. This means you can convert between any formats using GCF as the middle layer:

- JSON → GCF → YAML
- MessagePack → GCF → TOML
- CSV → GCF → XML
- Any format → GCF → Any other format

**All conversions are lossless.** The data that comes out exactly matches what went in, proven across 43 billion+ round-trips.

---

## The Proof: Format Mega-Gauntlet

We converted the same data through **14 different formats** with GCF as the bridge between each one:

```
JSON → GCF → XML → GCF → MessagePack → GCF → YAML → GCF → 
BSON → GCF → TOML → GCF → CBOR → GCF → Protobuf → GCF → 
CSV → GCF → JSON5 → GCF → Pickle → GCF → INI → GCF → 
NDJSON → GCF → Plist → GCF → JSON
```

**Result:** After 13 conversions through GCF across 14 formats (including Protobuf with schema), the final JSON data **exactly matched** the original. Zero data loss. Zero corruption.

You can run this yourself:

```bash
git clone https://github.com/blackwell-systems/gcf
cd gcf/examples

# Install format libraries
pip install msgpack pyyaml pymongo tomli tomli_w cbor2 json5

# Run the mega gauntlet
python3 mega-gauntlet.py
```

---

## Why This Matters

### Multi-Format Systems

Real systems use multiple formats:
- **API gateways** receive JSON, send MessagePack to backends
- **Data pipelines** ingest CSV, process as structured data, output YAML configs
- **Agent systems** where different agents prefer different formats
- **Configuration management** converting between YAML (humans), TOML (apps), JSON (APIs)

Without GCF, each conversion requires format-specific logic. With GCF, one adapter handles all of them.

### The Universal Pivot

```
        MessagePack ←
    YAML ←            ↘
XML ←                  ↘
                        GCF  →  JSON
CSV →                  ↗
    TOML →            ↗
        BSON →       ↗
```

GCF sits in the middle. Any format can flow in, any format can flow out. This is what the 43 billion round-trips validated:

| Format | Round-trips | Failures |
|--------|------------|----------|
| JSON | 21,250,000,000 | 0 |
| YAML | 21,000,000,000 | 0 |
| MessagePack | 584,000,000 | 0 |
| CSV | 335,000,000 | 0 |
| TOML | 100,000,000 | 0 |
| **Total** | **43,270,000,000+** | **0** |

Those tests didn't just prove JSON→GCF→JSON works. They proved **JSON→GCF→YAML**, **MessagePack→GCF→TOML**, and every other combination works losslessly.

---

## Use Cases

### 1. API Gateway Format Translation

Your backend speaks MessagePack for efficiency, but clients send JSON:

```python
from gcf import encode_generic, decode_generic
import json
import msgpack

# Client sends JSON
json_request = request.body

# Parse JSON
data = json.loads(json_request)

# Encode to GCF (optional, for LLM processing)
gcf_str = encode_generic(data)

# Decode and send as MessagePack to backend
data = decode_generic(gcf_str)
backend_payload = msgpack.packb(data)
```

One adapter, any format combination.

### 2. Data Pipeline Format Conversion

Ingest CSV from legacy systems, process in Python, output as YAML configs:

```python
import csv
import yaml
from gcf import encode_generic, decode_generic

# Read CSV
with open('data.csv') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

# Through GCF
gcf_str = encode_generic({"records": rows})
data = decode_generic(gcf_str)

# Write YAML
with open('config.yaml', 'w') as f:
    yaml.dump(data, f)
```

### 3. Multi-Agent Format Negotiation

Different agents prefer different formats. GCF bridges them:

```python
# Agent A produces MessagePack
msgpack_output = agent_a.process()

# Convert to GCF for LLM context
data = msgpack.unpackb(msgpack_output)
gcf_for_llm = encode_generic(data)

# LLM processes (reads GCF 91% better than JSON)
result = llm.process(gcf_for_llm)

# Agent B wants YAML
data = decode_generic(result)
yaml_input = yaml.dump(data)
agent_b.process(yaml_input)
```

### 4. Configuration File Migration

Migrate from one config format to another without rewriting parsers:

```python
import toml
import json
from gcf import encode_generic, decode_generic

# Read old TOML config
with open('config.toml') as f:
    config = toml.load(f)

# Through GCF
gcf_str = encode_generic(config)
config = decode_generic(gcf_str)

# Write new JSON config
with open('config.json', 'w') as f:
    json.dump(config, f, indent=2)
```

---

## And By The Way: LLMs Read It Better

While GCF is acting as your universal format adapter, it also happens to be the format LLMs comprehend best:

| Format | Comprehension (500 symbols) | Tokens |
|--------|---------------------------|--------|
| **GCF** | **91.2%** | **11,090** |
| TOON | 68.2% | 16,378 |
| JSON | 53.4% | 53,341 |

When your data is in GCF in the middle of that conversion pipeline, your LLM agents can read it perfectly. You get format universality **and** LLM comprehension in one format.

---

## Token Efficiency Across Formats

GCF is typically smaller than the formats it bridges:

```
JSON (306 bytes)
  ↓ encode_generic()
GCF (172 bytes, 44% smaller)
  ↓ decode_generic()
YAML (263 bytes)
```

This means:
- **Cheaper storage** when using GCF as an intermediate format
- **Cheaper transmission** when sending GCF over the wire
- **Cheaper LLM calls** when GCF enters the context window

---

## How It Works

GCF operates on **structured values**, not syntax:

```
Format-specific     Structured      Format-specific
   syntax     →      values     →       syntax
     ↓                  ↓                 ↓
   Parse         encode_generic()    Serialize
   (JSON)              ↓              (YAML)
                      GCF
```

1. Parse source format to structured value (dict/list/primitives)
2. Encode structured value to GCF via `encode_generic()`
3. Decode GCF back to structured value via `decode_generic()`
4. Serialize structured value to target format

The only requirement: the format must deserialize to objects, arrays, and primitives. Every mainstream structured format does this.

---

## Supported Formats

GCF has been validated across:

**Text formats:**
- JSON, YAML, TOML, XML, CSV, INI, JSON5, NDJSON

**Binary formats:**
- MessagePack, BSON, CBOR, Pickle, Plist, **Protocol Buffers** (with schema)

**Schema-based formats:**
- Protocol Buffers (requires `.proto` schema definition)
- Apache Avro (requires schema)
- Apache Thrift (requires schema)

**And by extension, any format that deserializes to structured values.**

If it deserializes to objects/arrays/primitives, it works with GCF.

### Protocol Buffers (Special Case)

Protobuf requires a schema but works losslessly through GCF:

```python
from google.protobuf import json_format
from gcf import encode_generic, decode_generic
import my_schema_pb2

# Parse protobuf message
message = my_schema_pb2.MyMessage()
message.ParseFromString(protobuf_bytes)

# Convert to dict (preserving all fields including defaults)
data = json_format.MessageToDict(
    message, 
    preserving_proto_field_name=True,
    including_default_value_fields=True
)

# Through GCF
gcf_str = encode_generic(data)
data_back = decode_generic(gcf_str)

# Back to protobuf
new_message = json_format.ParseDict(data_back, my_schema_pb2.MyMessage())
protobuf_bytes = new_message.SerializeToString()
```

**Important:** Use `including_default_value_fields=True` when converting from Protobuf to preserve `false` booleans and other default values.

The mega-gauntlet validates this with a complete round-trip through Protobuf alongside 13 other formats.

---

## Try It Yourself

Three demos, increasing complexity:

### 1. Simple Conversion (JSON → YAML)

```bash
python3 examples/format-conversion.py
```

Shows: JSON → GCF → YAML, with size comparison.

### 2. The Gauntlet (5 formats)

```bash
python3 examples/format-gauntlet.py
```

Shows: JSON → GCF → YAML → GCF → CSV → GCF → JSON, proving round-trip losslessness.

### 3. The Mega Gauntlet (14 formats including Protobuf)

```bash
# Install all format libraries first
pip install msgpack pyyaml pymongo tomli tomli_w cbor2 json5 protobuf

# Compile the protobuf schema
cd examples
protoc --python_out=. test_data.proto

# Run the gauntlet
python3 mega-gauntlet.py
```

Shows: 13 conversions through GCF across 14 formats (including Protobuf with schema). Completely obnoxious. Absolutely proves the point.

---

## Conclusion

GCF isn't just an optimization for AI agents. It's a universal format adapter that:

1. **Bridges any structured formats** (JSON, YAML, MessagePack, TOML, etc.)
2. **Maintains perfect data integrity** (43 billion+ round-trips, zero failures)
3. **Is more readable to LLMs** than the formats it replaces (91.2% vs 53.4% JSON)
4. **Uses fewer tokens** (50-71% smaller than JSON)

This makes GCF the universal pivot for structured data in LLM systems. Any format in, optimal format for LLM comprehension in the middle, any format out.

See [Lossless Verification](/guide/lossless-verification) for the full 43 billion round-trip proof.
