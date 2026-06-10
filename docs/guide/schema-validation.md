# Schema Validation

GCF round-trips losslessly to JSON. Validate on the decoded side using JSON Schema, the same tooling every AI framework already supports.

## The pattern

```
Tool output (GCF) -> decode() -> validate against JSON Schema -> pass/fail
```

GCF is a wire encoding, not a type system. The schema describes the data structure, not the encoding. This means you can use the entire JSON Schema ecosystem (validators, code generators, OpenAI structured outputs, Anthropic tool definitions) without any GCF-specific schema language.

## Example: AI travel agent

A travel booking agent receives structured data from tools and produces structured output for downstream systems. Every interaction involves structured input and structured output, and every one benefits from schema validation.

### The pipeline

```
User: "Book me a flight from SFO to JFK next Friday under $500"

1. Agent calls search_flights tool
   Tool returns flight data as GCF (79% fewer tokens in context)
   Agent validates decoded response against FlightSearchResult schema

2. Agent reasons over the results, selects a flight
   Agent calls book_flight tool with structured arguments
   Framework validates the tool call against BookFlightRequest schema

3. Booking tool returns confirmation as GCF
   Agent validates decoded response against BookingConfirmation schema

4. Agent calls send_itinerary tool
   Framework validates arguments against SendItineraryRequest schema
```

Every arrow in this pipeline has a schema. GCF makes the wire transfer cheap; JSON Schema makes it correct.

### Tool response schema (input to the model)

The `search_flights` tool returns results as GCF:

```
GCF profile=generic
## flights [3]{id,airline,departure,arrival,price,stops}
UA-2847|United|2026-06-20T08:00|2026-06-20T16:30|$342|0
DL-1193|Delta|2026-06-20T09:15|2026-06-20T17:45|$418|0
AA-0512|American|2026-06-20T06:30|2026-06-20T15:00|$489|1
```

After decoding, validate against the response schema:

::: code-group

```python [Python]
import jsonschema
from gcf import decode_generic

flight_schema = {
    "type": "object",
    "required": ["flights"],
    "properties": {
        "flights": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "airline", "departure", "arrival", "price"],
                "properties": {
                    "id": {"type": "string"},
                    "airline": {"type": "string"},
                    "departure": {"type": "string", "format": "date-time"},
                    "arrival": {"type": "string", "format": "date-time"},
                    "price": {"type": "string", "pattern": "^\\$\\d+$"},
                    "stops": {"type": "integer", "minimum": 0},
                },
            },
        },
    },
}

data = decode_generic(gcf_response)
jsonschema.validate(data, flight_schema)  # raises on invalid
```

```typescript [TypeScript]
import Ajv from 'ajv';
import { decodeGeneric } from '@blackwell-systems/gcf';

const ajv = new Ajv();
const validate = ajv.compile(flightSchema);
const data = decodeGeneric(gcfResponse);

if (!validate(data)) {
    throw new Error(`Invalid response: ${JSON.stringify(validate.errors)}`);
}
```

```go [Go]
data, err := gcf.DecodeGeneric(gcfResponse)
if err != nil {
    return err
}
// Use github.com/santhosh-tekuri/jsonschema/v6
schema, _ := jsonschema.CompileString("flight.json", flightSchemaJSON)
if err := schema.Validate(data); err != nil {
    return fmt.Errorf("invalid response: %w", err)
}
```

:::

### Tool call schema (output from the model)

The agent produces a structured tool call. The framework validates it before execution:

```json
{
    "tool": "book_flight",
    "arguments": {
        "flight_id": "UA-2847",
        "passenger": {"first_name": "Alice", "last_name": "Chen"},
        "payment_method": "card_ending_4242"
    }
}
```

This is standard JSON Schema validation on the tool call side. GCF isn't involved here because the model's output is a tool call (JSON), not a wire-format payload. The schema ensures the model produced valid arguments before the tool executes.

## Three validation patterns

### 1. Framework-level (most common)

The agent framework (LangChain, CrewAI, Claude tool use, OpenAI function calling) already validates tool calls against schemas defined in the tool manifest. GCF payloads are decoded to JSON before the framework sees them, so existing validation works unchanged.

```python
# MCP tool definition (the schema lives here, not in the payload)
@server.tool(
    name="search_flights",
    input_schema=search_request_schema,
    output_schema=flight_result_schema,  # validates decoded GCF
)
def search_flights(origin: str, destination: str, date: str):
    results = flight_api.search(origin, destination, date)
    return encode_generic(results)  # GCF on the wire, validated after decode
```

### 2. Proxy-level

The [GCF proxy](/guide/proxy) sits between the tool and the model. Add schema validation at the proxy layer so every tool response is validated without changing tool code:

```bash
# Proxy validates every response against a schema directory
gcf-proxy --validate-dir ./schemas/ your-mcp-server
```

Each tool's response schema is a JSON file in the schemas directory, named by tool name (`search_flights.json`). The proxy decodes GCF to JSON, validates against the matching schema, and forwards the validated result.

### 3. Application-level

For custom pipelines, validate in your application code after decoding:

```python
from gcf import decode_generic
import jsonschema

def process_tool_response(gcf_text: str, schema: dict) -> dict:
    data = decode_generic(gcf_text)
    jsonschema.validate(data, schema)
    return data
```

## Why not a GCF-native schema language?

JSON Schema already has:
- Validators in every language
- OpenAI structured outputs integration
- Anthropic tool definition integration
- Code generation tooling
- IDE support (autocomplete, hover docs)

Building a GCF-specific schema language would duplicate all of this for no gain. GCF decodes losslessly to JSON, so JSON Schema validates GCF payloads exactly as well as it validates JSON payloads. The encoding is transparent to the validator.

## Schema references

If you need the payload to be self-describing (e.g., stored to disk, passed between disconnected systems), include a schema reference in the data itself:

```
GCF profile=generic
_schema=https://api.example.com/schemas/flight-result.json
## flights [3]{id,airline,price}
UA-2847|United|342
DL-1193|Delta|418
AA-0512|American|489
```

The `_schema` field is a regular key-value pair, not a GCF keyword. Consumers that understand it can fetch and validate; consumers that don't just ignore it. No spec change required.
