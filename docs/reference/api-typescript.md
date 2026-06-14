# API Reference (TypeScript)

```bash
npm install @blackwell-systems/gcf
```

## Functions

### `encodeGeneric(data: unknown): string`

Encode any JS value into GCF tabular format. Unlike `encode` (which handles the graph `Payload` type), `encodeGeneric` works on arbitrary objects, arrays, and primitives.

```typescript
import { encodeGeneric } from '@blackwell-systems/gcf';

const output = encodeGeneric({
  employees: [
    { id: 1, name: 'Alice', department: 'Engineering', salary: 95000 },
    { id: 2, name: 'Bob', department: 'Sales', salary: 72000 },
  ],
});
// ## employees [2]{id,name,department,salary}
// 1|Alice|Engineering|95000
// 2|Bob|Sales|72000
```

Arrays of uniform objects get tabular encoding (header + positional rows). Primitive arrays are inlined (`tags[3]: a,b,c`). Nested objects use `## key` section headers. Primitives use `key=value`.

### `decodeGeneric(input: string): unknown`

Decode GCF generic or graph profile text back into JavaScript values. Returns objects, arrays, or scalar values.

```typescript
import { decodeGeneric } from '@blackwell-systems/gcf';

const data = decodeGeneric(gcfText);
// data is object, array, string, number, boolean, or null
```

### `encode(p: Payload): string`

Encode a Payload into GCF text format.

```typescript
import { encode, type Payload } from '@blackwell-systems/gcf';

const output = encode({
  tool: 'context_for_task',
  tokenBudget: 5000,
  tokensUsed: 1847,
  symbols: [...],
  edges: [...],
});
```

### `decode(input: string): Payload`

Parse GCF text back into a Payload. Throws `Error` on malformed input.

```typescript
import { decode } from '@blackwell-systems/gcf';

const p = decode(gcfText);
console.log(p.tool, p.symbols.length);
```

### `encodeWithSession(p: Payload, sess: Session): string`

Encode with session deduplication. If `sess` is null/undefined, falls back to `encode`.

```typescript
import { encodeWithSession, Session } from '@blackwell-systems/gcf';

const sess = new Session();
const out1 = encodeWithSession(payload1, sess);
const out2 = encodeWithSession(payload2, sess); // bare refs for known symbols
```

### `encodeDelta(d: DeltaPayload): string`

Encode a delta payload.

```typescript
import { encodeDelta, type DeltaPayload } from '@blackwell-systems/gcf';

const output = encodeDelta({
  tool: 'context_for_task',
  baseRoot: 'aaa111',
  newRoot: 'bbb222',
  removed: [...],
  added: [...],
  removedEdges: [...],
  addedEdges: [...],
  deltaTokens: 30,
  fullTokens: 200,
});
```

### `new StreamEncoder(writer, tool, opts?)`

Create a streaming encoder that writes GCF incrementally. Zero buffering.

```typescript
const enc = new StreamEncoder(writer, 'context_for_task', { tokenBudget: 5000 });
enc.writeSymbol(sym);  // emitted immediately
enc.writeEdge(edge);   // emitted immediately
enc.close();           // emits ##! summary trailer
```

The `writer` is any object with a `write(s: string)` method.

## Types

### `Payload`

```typescript
interface Payload {
  tool: string;
  tokensUsed: number;
  tokenBudget: number;
  packRoot?: string;
  symbols: Symbol[];
  edges: Edge[];
}
```

### `Symbol`

```typescript
interface Symbol {
  qualifiedName: string;
  kind: string;
  score: number;
  provenance: string;
  distance: number;
  signature?: string;
  components?: Components;
}
```

### `Edge`

```typescript
interface Edge {
  source: string;
  target: string;
  edgeType: string;
  status?: string;
}
```

### `DeltaPayload`

```typescript
interface DeltaPayload {
  tool: string;
  baseRoot: string;
  newRoot: string;
  removed: Symbol[];
  added: Symbol[];
  removedEdges: Edge[];
  addedEdges: Edge[];
  deltaTokens: number;
  fullTokens: number;
}
```

### `Session`

```typescript
class Session {
  transmitted(qname: string): boolean;
  getID(qname: string): number;     // -1 if not found
  record(symbols: Symbol[]): void;
  size(): number;
  reset(): void;
}
```

### `Components`

```typescript
interface Components {
  blastRadius: number;
  confidence: number;
  recency: number;
  distance: number;
}
```

## Constants

### `KIND_ABBREV`

```typescript
const KIND_ABBREV: Record<string, string> = {
  function: 'fn', type: 'type', method: 'method',
  interface: 'iface', var: 'var', const: 'const',
  class: 'class', field: 'field', route_handler: 'route',
  external: 'ext', file: 'file', package: 'pkg',
  service: 'svc', table: 'table', resource: 'resource',
  selector: 'selector',
};
```

### `KIND_EXPAND`

Reverse of `KIND_ABBREV`.

## CLI

```bash
npx @blackwell-systems/gcf encode-generic < data.json
npx @blackwell-systems/gcf decode-generic < data.gcf
```

| Command | Description |
|---------|-------------|
| `encode` | Encode graph payload (JSON stdin) to GCF |
| `decode` | Decode GCF graph text to JSON |
| `encode-generic` | Encode any JSON to GCF generic profile |
| `decode-generic` | Decode GCF generic profile to JSON |
| `stats` | Compare token counts: JSON vs GCF |
