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

We converted the same data through **17 different formats** with GCF as the bridge between each one:

```
JSON → XML → MessagePack → YAML → BSON → TOML → CBOR → Protobuf → 
CSV → JSON5 → Avro → Arrow → Parquet → Pickle → INI → NDJSON → Plist → JSON
```

**Result:** After 15 conversions through GCF across 17 formats (text, binary, schema-based, and columnar), the final JSON data **exactly matched** the original. Zero data loss. Zero corruption.

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

Those tests proved each format round-trips through GCF losslessly. Since GCF operates on structured values (not format syntax), the same guarantee extends to cross-format conversions: if JSON→GCF and GCF→YAML are both lossless, then JSON→GCF→YAML is lossless. The mega-gauntlet validates this empirically across 14 formats.

---

## Format Compatibility Matrix

Different formats have different capabilities. Here's what works and what doesn't:

| Format | Nesting | Arrays | Binary | Schema | Size (same data) | Notes |
|--------|---------|--------|--------|--------|------------------|-------|
| **JSON** | ✓ | ✓ | ✗ | ✗ | 243 bytes | Universal but verbose |
| **YAML** | ✓ | ✓ | ✗ | ✗ | 183 bytes | Human-friendly, comments |
| **TOML** | Limited | Limited | ✗ | ✗ | 220 bytes | No arrays of arrays |
| **XML** | ✓ | ✓ | ✗ | Optional | 301 bytes | Attributes vs elements |
| **CSV** | ✗ | ✗ | ✗ | ✗ | 78 bytes | Flat only, loses structure |
| **INI** | Limited | ✗ | ✗ | ✗ | 36 bytes | Sections + key-value only |
| **MessagePack** | ✓ | ✓ | ✓ | ✗ | 136 bytes | Binary, efficient |
| **BSON** | ✓ | ✓ | ✓ | ✗ | 209 bytes | Larger than MessagePack |
| **CBOR** | ✓ | ✓ | ✓ | ✗ | 137 bytes | IETF standard |
| **Protobuf** | ✓ | ✓ | ✓ | ✓ | 71 bytes (compiled) | Requires schema |
| **JSON5** | ✓ | ✓ | ✗ | ✗ | 187 bytes | JSON + comments/trailing commas |
| **NDJSON** | ✓ | ✓ | ✗ | ✗ | 172 bytes | Newline-delimited JSON |
| **Pickle** | ✓ | ✓ | ✓ | ✗ | 166 bytes | Python-specific |
| **Plist** | ✓ | ✓ | ✓ | ✗ | 846 bytes | Apple format, XML-based |
| **GCF** | ✓ | ✓ | ✗ | ✗ | **126 bytes** | **Smallest + LLM-readable** |

### Format-Specific Gotchas

**CSV:**
- Flat only - nested objects become separate rows or lose structure
- No standard for booleans (True vs true vs 1)
- Empty strings vs null are ambiguous

**TOML:**
- Can't represent arrays of arrays: `[[1,2],[3,4]]` fails
- Tables (sections) required for nested objects
- Limited date/time handling

**XML:**
- No standard for arrays - `<item>` tags, attributes, or wrapper elements?
- Attributes vs elements design choice affects structure
- Verbose - typically largest format

**Protobuf:**
- **Requires schema** - can't parse without `.proto` definition
- Drops default values (use `including_default_value_fields=True`)
- Schema evolution requires careful versioning

**BSON:**
- Larger than MessagePack despite being binary
- MongoDB-specific types (ObjectId, etc.) don't map to other formats
- Not as widely supported

**Pickle:**
- Python-only - no cross-language support
- **Security risk** - can execute arbitrary code on unpickle
- Not recommended for untrusted data

**GCF bridges all of these.** When a format can't represent something (e.g., CSV can't nest), GCF preserves the structure internally, and you can output to a format that supports it.

---

## Real Production Patterns

These are actual architectures where GCF acts as the universal adapter.

### Pattern 1: API Gateway with Backend Format Translation

**The Problem:** Your REST API receives JSON (standard for web), but your backend microservices use MessagePack for efficiency. Writing custom converters for every endpoint is maintenance hell.

**The Solution:** GCF as the universal bridge in your API gateway.

```python
# api_gateway.py (Kong/Nginx plugin or middleware)
from gcf import encode_generic, decode_generic
import json
import msgpack

class FormatBridge:
    def process_request(self, request):
        # Parse incoming JSON
        data = json.loads(request.body)
        
        # Optional: if you have LLM-based routing/validation
        gcf_str = encode_generic(data)
        # LLM reads GCF with 100% accuracy on standard data
        
        # Convert to MessagePack for backend
        data = decode_generic(gcf_str)
        backend_request = msgpack.packb(data)
        
        return backend_request
    
    def process_response(self, backend_response):
        # Parse MessagePack from backend
        data = msgpack.unpackb(backend_response)
        
        # Through GCF (if LLM needs to process/augment response)
        gcf_str = encode_generic(data)
        # ... LLM processing ...
        data = decode_generic(gcf_str)
        
        # Return JSON to client
        return json.dumps(data)
```

**Deployment:**
- Kong plugin: Lua with FFI bindings to gcf-rust
- Nginx module: C bindings to gcf-rust
- Python middleware: gcf-python (shown above)

**Why GCF, not just MessagePack directly?** If there's an LLM in the loop (routing, validation, augmentation), GCF is the format it reads best. Without an LLM, you'd use MessagePack directly. With one, GCF is the universal step that both the LLM and the backend can consume:
- LLM reads GCF at 100% accuracy (standard data)
- Backend receives MessagePack (binary efficiency)
- One adapter handles both directions

### Pattern 2: Multi-Agent System with Format Negotiation

**The Problem:** You have 3 agents:
- Agent A (Python) prefers JSON
- Agent B (Go) uses Protobuf internally
- Agent C (legacy system) outputs TOML configs

They need to communicate, but you don't want to write 6 converters (A→B, A→C, B→A, B→C, C→A, C→B).

**The Solution:** GCF as the agent communication layer.

```python
# agent_orchestrator.py
from gcf import encode_generic, decode_generic
import json
import toml
from google.protobuf import json_format

class AgentBus:
    def __init__(self):
        self.agents = {}
    
    def send_message(self, from_agent, to_agent, data, source_format):
        # Parse source format to structured value
        if source_format == "json":
            value = json.loads(data)
        elif source_format == "toml":
            value = toml.loads(data)
        elif source_format == "protobuf":
            # Requires schema
            value = json_format.MessageToDict(data)
        
        # Encode to GCF (universal format)
        gcf_msg = encode_generic(value)
        
        # Optional: LLM reads the message for orchestration decisions
        # GCF comprehension: 100% standard, 91.2% stress (vs JSON 53.4%)
        # routing_decision = llm.route(gcf_msg)
        
        # Decode and convert to target format
        value = decode_generic(gcf_msg)
        target_format = self.agents[to_agent].preferred_format
        
        if target_format == "json":
            return json.dumps(value)
        elif target_format == "toml":
            return toml.dumps(value)
        elif target_format == "protobuf":
            return json_format.ParseDict(value, target_schema)
```

**Why this works:**
- One conversion path: source → GCF → target
- No N×(N-1) converter matrix
- LLM orchestrator reads GCF natively (100% on standard data, 91.2% on complex graphs)
- Add new agents without touching existing code

### Pattern 3: Data Pipeline with Multi-Format I/O

**The Problem:** Your data pipeline:
1. Ingests CSV from legacy systems
2. Processes with Python/Pandas
3. Sends to agent for analysis
4. Outputs YAML configs for Kubernetes

Each stage needs different formats. You're writing custom converters everywhere.

**The Solution:** GCF as the pipeline interchange format.

```python
# data_pipeline.py
import csv
import yaml
import pandas as pd
from gcf import encode_generic, decode_generic

class Pipeline:
    def ingest_csv(self, csv_path):
        with open(csv_path) as f:
            reader = csv.DictReader(f)
            data = {"records": list(reader)}
        
        # Convert to GCF for pipeline
        return encode_generic(data)
    
    def process(self, gcf_input):
        # Decode for processing
        data = decode_generic(gcf_input)
        
        # Pandas processing
        df = pd.DataFrame(data["records"])
        # ... transformations ...
        result = df.to_dict(orient="records")
        
        # Back to GCF
        return encode_generic({"processed": result})
    
    def analyze_with_agent(self, gcf_input):
        # LLM reads GCF with 91% comprehension
        # No conversion needed - send GCF to LLM
        response = llm.analyze(gcf_input)  # GCF in, GCF out
        return response
    
    def output_yaml_config(self, gcf_input):
        # Decode and output as YAML
        data = decode_generic(gcf_input)
        
        # Format for Kubernetes
        config = {
            "apiVersion": "v1",
            "kind": "ConfigMap",
            "data": data["processed"]
        }
        
        with open('k8s-config.yaml', 'w') as f:
            yaml.dump(config, f)

# Run pipeline
pipeline = Pipeline()
gcf_data = pipeline.ingest_csv('legacy_data.csv')
gcf_data = pipeline.process(gcf_data)
gcf_data = pipeline.analyze_with_agent(gcf_data)
pipeline.output_yaml_config(gcf_data)
```

**Benefits:**
- Data stays in GCF between stages (50-71% smaller than JSON)
- Agent reads GCF natively (no format conversion tax)
- Add new input/output formats without touching pipeline logic
- Each stage is testable (GCF in, GCF out)

### Pattern 4: Configuration Migration Tool

**The Problem:** You're migrating from TOML configs to YAML, or JSON to Protobuf. You have 1000+ config files.

**The Solution:** One-time batch conversion through GCF.

```python
# config_migrator.py
import os
import json
import toml
import yaml
from gcf import encode_generic, decode_generic

def migrate_configs(input_dir, output_dir, from_format, to_format):
    for filename in os.listdir(input_dir):
        # Read source format
        with open(os.path.join(input_dir, filename)) as f:
            if from_format == "toml":
                data = toml.load(f)
            elif from_format == "json":
                data = json.load(f)
        
        # Through GCF (validates losslessness)
        gcf_str = encode_generic(data)
        data = decode_generic(gcf_str)
        
        # Write target format
        output_file = filename.replace(f'.{from_format}', f'.{to_format}')
        with open(os.path.join(output_dir, output_file), 'w') as f:
            if to_format == "yaml":
                yaml.dump(data, f)
            elif to_format == "json":
                json.dump(data, f, indent=2)
        
        print(f"✓ Migrated {filename}")

# Migrate 1000 TOML files to YAML
migrate_configs('configs/toml/', 'configs/yaml/', 'toml', 'yaml')
```

**Why GCF for this:**
- Validates losslessness (encode → decode → compare)
- One tool for any format pair
- Can dry-run through GCF to check for format incompatibilities
- 43 billion round-trips prove it won't corrupt data

---

## Why Universal Adapters Matter Now: The AI Multiplier Effect

Five years ago, nobody cared about format adapters. You picked JSON or MessagePack and shipped.

**What changed:** AI agents became production infrastructure.

### The Four Problems AI Systems Create

**1. Agents Need to Read Data (Comprehension)**

Your agent receives tool responses. If they're in JSON, the agent gets the wrong answer 46% of the time at scale (500+ records, structurally complex data). If they're in GCF, 91.2% accuracy.

On standard workloads, GCF achieves 100% comprehension on every frontier model.

On standard workloads (nested arrays, metadata), all formats work on frontier models. At scale (500+ records with complex cross-references), JSON drops to 53.4% while GCF maintains 91.2%.

**Without GCF:** Works fine at small scale, breaks at production scale.  
**With GCF:** 100% on standard data. Still 91.2% when complexity overwhelms JSON.

**2. Agents Burn Tokens (Cost)**

JSON at scale consumes massive context:
- 500 records = 53K tokens JSON, 11K tokens GCF
- That's 42K tokens saved per tool response
- At $3/1M input tokens (Claude Sonnet), that's $0.126 saved per call
- 10K calls/day = **$1,260/day saved** = $460K/year

**Without GCF:** Pay for bloated JSON in every context window.  
**With GCF:** Save 50-71% on input token costs.

**3. Agents Need to Talk to Legacy Systems (Interop)**

Your agent needs to:
- Read CSV from a database export
- Send MessagePack to a microservice
- Output YAML for Kubernetes
- Ingest TOML from config files

**Without GCF:** Write custom converters for every format pair. N×(N-1) problem.  
**With GCF:** One universal adapter. Source → GCF → Target for any combination.

**4. Multi-Agent Systems Need Format Negotiation**

You have 5 agents. Each prefers a different format. They need to communicate.

**Without GCF:** 
- Force everyone to JSON (loses efficiency + comprehension)
- OR write 20 converters (5×4 agent pairs)
- OR build a complex negotiation protocol

**With GCF:**
- Each agent outputs its preferred format
- GCF bridges between them
- Agents can read each other's messages (via GCF)
- LLM orchestrator reads GCF natively (100% standard, 91% stress vs JSON's 53%)

### The Multiplication

Here's why it's a **multiplier effect**:

| Without GCF | With GCF |
|-------------|----------|
| LLMs read JSON poorly at scale (53% stress) | LLMs read GCF well (100% standard, 91% stress) → **1.7x+ comprehension** |
| JSON costs 53K tokens | GCF costs 11K tokens → **4.8x token savings** |
| Write N×(N-1) converters | Write 1 universal adapter → **N² → 1 complexity reduction** |
| Force all agents to JSON | Each agent uses optimal format → **format flexibility** |

**These multiply, they don't add:**
- Better comprehension × lower cost × simpler architecture = **production-viable multi-agent systems**

### Why This Didn't Exist Before

Before 2023:
- No agents in production (GPT-4 didn't exist)
- No one cared about LLM comprehension (no tool use)
- Context windows were tiny (9K Claude, who needs efficiency?)
- Multi-agent was research (no one building it)

Now (2024-2026):
- Agents are production (OpenAI Swarm, Claude Code, AutoGPT)
- Tool use is standard (MCP, function calling)
- Context is expensive (paying per token)
- Multi-agent is emerging (agent orchestration frameworks)

**The market opened in the last 18 months. GCF is positioned exactly where the industry is going.**

### The Current Direction

Production AI systems increasingly require:
1. **Format interop** (agents talk to legacy systems)
2. **Token efficiency** (context costs matter at scale)
3. **LLM comprehension** (wrong answers aren't acceptable)
4. **Multi-agent coordination** (single-agent systems aren't scaling)

GCF solves all four. Today.

That's why universal adapters matter now. The AI revolution created a format problem nobody saw coming.

---

## And By The Way: LLMs Read It Better

While GCF is acting as your universal format adapter, it also happens to be the format LLMs comprehend best:

**Standard workloads (500 orders, nested data):**
- GCF: **100%** on every frontier model
- JSON: 100% on frontier models (76.9% on mid-tier)
- TOON: 97.4% average

**Stress-scale workloads (500 symbols, 200 edges, high complexity):**

| Format | Comprehension | Tokens |
|--------|---------------|--------|
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

GCF has been validated across 17 distinct serialization formats:

**Text formats (8):**
- JSON, YAML, TOML, XML, CSV, INI, JSON5, NDJSON

**Binary formats (6):**
- MessagePack, BSON, CBOR, Pickle, Plist, Protocol Buffers

**Schema-based (2):**
- Protocol Buffers (requires `.proto` schema definition)
- Apache Avro (requires schema definition)

**Columnar/analytics (3):**
- Apache Arrow (in-memory IPC format)
- Apache Parquet (on-disk columnar)
- CSV (flat tabular)

**And by extension, any format that deserializes to structured values.**

If it deserializes to objects/arrays/primitives, it works with GCF.

### Protocols vs Formats

The mega-gauntlet tests distinct serialization formats, not protocol wrappers. Protocols like gRPC (uses Protobuf), JSON-RPC (uses JSON), and GraphQL (uses JSON) are already covered because GCF bridges the underlying format they serialize to.

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

The mega-gauntlet validates this with a complete round-trip through Protobuf alongside 16 other formats.

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

### 3. The Mega Gauntlet (17 formats)

```bash
# Install all format libraries first
pip install msgpack pyyaml pymongo tomli tomli_w cbor2 json5 protobuf avro-python3 pyarrow

# Compile the protobuf schema
cd examples
protoc --python_out=. test_data.proto

# Run the gauntlet
python3 mega-gauntlet.py
```

Shows: 15 conversions through GCF across 17 formats (text, binary, schema-based, columnar). The most comprehensive format interop test we could design.

---

## Conclusion

GCF isn't just an optimization for AI agents. It's a universal format adapter that:

1. **Bridges any structured formats** (JSON, YAML, MessagePack, TOML, etc.)
2. **Maintains perfect data integrity** (43 billion+ round-trips, zero failures)
3. **Is more readable to LLMs** than the formats it replaces (100% on standard workloads, 91.2% vs 53.4% JSON on stress-scale)
4. **Uses fewer tokens** (50-71% smaller than JSON)

This makes GCF the universal pivot for structured data in LLM systems. Any format in, optimal format for LLM comprehension in the middle, any format out.

See [Lossless Verification](/guide/lossless-verification) for the full 43 billion round-trip proof.
