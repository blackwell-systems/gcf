# API Reference (TypeScript)

```bash
npm install @blackwell-systems/gcf
```

## Functions

### `encodeGeneric(data: unknown, opts?: GenericOptions): string`

Encode any JS value into GCF tabular format. Unlike `encode` (which handles the graph `Payload` type), `encodeGeneric` works on arbitrary objects, arrays, and primitives.

Pass `{ noFlatten: true }` to use expanded encoding for nested objects (open-weight models currently comprehend this form better; GCF still outperforms JSON either way).

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
  baseRoot: 'sha256:aaa111...',
  newRoot: 'sha256:bbb222...',
  removed: [...],
  added: [...],
  removedEdges: [...],
  addedEdges: [...],
  deltaTokens: 30,
  fullTokens: 200,
});
```

### `packRoot(symbols: Symbol[], edges: Edge[]): string`

Content-addressed pack root (`gcf-pack-root-v1`, SPEC Section 10.2) of a graph snapshot: a deterministic SHA-256 over canonical, independently-sorted symbol and edge records. Byte-identical across all six SDKs; this is the value carried in `pack_root` / `base_root` / `new_root`. Node-only (uses `node:crypto`).

### `decodeDelta(input: string): DeltaPayload`

Parse a graph delta wire (`GCF profile=graph delta=true ...`) back into a `DeltaPayload`. The inverse of `encodeDelta`. Throws on malformed input.

### `verifyDelta(baseSymbols, baseEdges, removedSymbols, addedSymbols, removedEdges, addedEdges, expectedNewRoot): { symbols: Symbol[]; edges: Edge[] }`

Apply a decoded delta to a base snapshot atomically, then verify the recomputed `packRoot` equals `expectedNewRoot` (SPEC Section 10.4). Returns the applied `{ symbols, edges }`. Throws `delta_invalid` when a removal targets a symbol not in the base or an addition already exists, or `root_mismatch` when the recomputed root differs.

```typescript
const d = decodeDelta(deltaText);
const { symbols, edges } = verifyDelta(
  baseSymbols, baseEdges,
  d.removed, d.added, d.removedEdges, d.addedEdges,
  d.newRoot,
); // throws root_mismatch / delta_invalid on failure
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

## Generic Delta (v3.3)

Delta encoding for the generic profile (SPEC Section 10a): a keyed diff over a tabular set, plus a producer-side session helper that re-anchors on a tunable cadence. Identity is one designated column (`key=` in the header, `@<key>` in the field declaration). These functions are Node-only (they use `node:crypto` for pack roots).

### `encodeGenericFull(s: GenericSet, tool: string): string`

Encode a delta-ready full payload: `key=` in the header, an `@`-prefixed identity field in the declaration, and pipe-separated rows. Send this first to establish the base a later delta diffs against.

```typescript
import { encodeGenericFull, type GenericSet } from '@blackwell-systems/gcf';

const orders: GenericSet = {
  name: 'orders',
  key: 'id',
  fields: ['id', 'total', 'status'],
  rows: [
    { id: 1, total: 100, status: 'open' },
    { id: 2, total: 250, status: 'shipped' },
  ],
};

const full = encodeGenericFull(orders, 'get_orders');
// GCF profile=generic tool=get_orders pack_root=sha256:... key=id
// ## orders [2]{@id,total,status}
// 1|100|open
// 2|250|shipped
```

### `diffGenericSets(base: GenericSet, next: GenericSet): GenericDeltaPayload`

Compute the added/changed/removed diff between two sets that share the same `key` and `fields`. Unchanged rows are omitted (silence means "keep it"); added, changed, and removed are sorted by identity for reproducible output. Throws (`delta_invalid`) on a schema change or a missing key: the caller must then send a full payload.

```typescript
import { diffGenericSets } from '@blackwell-systems/gcf';

const payload = diffGenericSets(base, next);
// payload.added / payload.changed hold whole rows;
// payload.removed holds identity values only.
```

### `encodeGenericDelta(d: GenericDeltaPayload): string`

Serialize a delta payload. Sections are emitted in the order `## added`, `## changed`, `## removed`.

```typescript
import { encodeGenericDelta } from '@blackwell-systems/gcf';

const wire = encodeGenericDelta(payload);
// GCF profile=generic tool=get_orders delta=true base_root=sha256:... new_root=sha256:... key=id
// ## added [1]{@id,total,status}
// 3|75|open
// ## changed [1]{@id,total,status}
// 1|120|open
// ## removed [1]{@id}
// 2
```

### `decodeGenericDelta(text: string): GenericDeltaPayload`

Parse a delta payload back into a `GenericDeltaPayload`. The result can be applied with `verifyGenericDelta`.

```typescript
import { decodeGenericDelta } from '@blackwell-systems/gcf';

const payload = decodeGenericDelta(wire);
```

### `verifyGenericDelta(base: GenericSet, d: GenericDeltaPayload, expectedNewRoot: string): GenericSet`

Apply a delta to a base set and verify the result hashes to `expectedNewRoot`. Atomic: the whole payload is validated against the original base before any state changes, so a mismatch throws and leaves the base untouched. Returns the new `GenericSet` on success.

```typescript
import { verifyGenericDelta } from '@blackwell-systems/gcf';

const next = verifyGenericDelta(base, payload, payload.newRoot);
// throws base_mismatch / delta_invalid / root_mismatch on any inconsistency
```

### `new GenericDeltaSession(base, tool, policy)`

Producer-side helper that manages the re-anchor cadence for a stream of generic-profile updates (SPEC Section 10a.8, a non-normative producer policy). It is thin sugar over the primitives above: each `next()` emits either a compact delta or, on its chosen cadence, a full re-anchor, updating its held base. It introduces no new wire syntax; every payload it emits is byte-identical to `encodeGenericFull` or `encodeGenericDelta`, and the cadence never appears on the wire.

```typescript
import {
  GenericDeltaSession,
  sizeGuard,
  type GenericSet,
} from '@blackwell-systems/gcf';

const sess = new GenericDeltaSession(base, 'get_orders', sizeGuard());
send(sess.currentFull());              // send the initial full first (turn 0)

for (const snapshot of snapshots) {
  const { wire, isFull } = sess.next(snapshot); // advance one turn
  send(wire);                                   // delta, or a full re-anchor
}
```

- `currentFull(): string` returns the full payload for the current base. Send it first to establish the base; it is also a valid manual re-anchor.
- `next(nextSet: GenericSet): SessionEmission` advances the session by one turn and returns `{ wire, isFull }`. A schema change forces a full (`isFull === true`) per Section 10a.7. The held base becomes `nextSet` either way.
- `turn(): number` returns the number of `next()` calls so far (the initial full is turn 0).

### `fixedN(n)` / `sizeGuard()`

Construct a `ReanchorPolicy` for a `GenericDeltaSession`:

- `fixedN(n: number): ReanchorPolicy` re-anchors every `n` turns. `n <= 0` falls back to `DEFAULT_REANCHOR_N` (15).
- `sizeGuard(): ReanchorPolicy` re-anchors once the cumulative delta bytes since the last anchor reach the current full payload's byte size (size-adaptive: it re-anchors more under heavy churn, rarely under light churn). Production-recommended for varying churn.

`DEFAULT_REANCHOR_N` is exported as `15`.

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

### `GenericSet`

A keyed record set: the unit generic-profile delta operates on. Rows are order-agnostic (set semantics); `fields` carries the declared column order for the wire form; `key` names the identity column (the `@id` / `key=`); `name` is the tabular section name for a full payload.

```typescript
interface GenericSet {
  name?: string;
  key: string;
  fields: string[];
  rows: Array<Record<string, unknown>>;
}
```

### `GenericDeltaPayload`

A diff between two `GenericSet`s. `added` and `changed` hold whole rows; `removed` holds identity values only.

```typescript
interface GenericDeltaPayload {
  tool?: string;
  key: string;
  fields: string[];
  baseRoot: string;
  newRoot: string;
  added: Array<Record<string, unknown>>;
  changed: Array<Record<string, unknown>>;
  removed: unknown[]; // identity values
  deltaTokens?: number;
  fullTokens?: number;
}
```

### `ReanchorPolicy`

Selects when a `GenericDeltaSession` re-anchors. Construct it with `fixedN` or `sizeGuard` rather than by hand.

```typescript
interface ReanchorPolicy {
  mode: ReanchorMode;
  n: number; // turns between anchors; FixedN only
}
```

### `SessionEmission`

The result of advancing a session by one turn (`GenericDeltaSession.next`).

```typescript
interface SessionEmission {
  wire: string;
  isFull: boolean;
}
```

### `ReanchorMode`

```typescript
enum ReanchorMode {
  FixedN = 0,   // re-anchor every N turns
  SizeGuard = 1, // re-anchor when cumulative delta reaches the full payload's size
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
