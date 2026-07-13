# Streaming Encoding

GCF supports true zero-buffering streaming encode. Rows emit the instant they are produced, with O(1) memory per row. The encoder does not need to know the payload size upfront.

This is a capability TOON structurally cannot add.

## The problem with buffered encoding

MCP servers that walk large code graphs, paginate APIs, or read database cursors currently must:

1. Buffer the entire result set in memory
2. Count everything
3. Build the GCF/TOON payload
4. Return the complete response

If the tool takes 3 seconds to traverse a call graph, the LLM waits 3 seconds seeing nothing. Peak memory is proportional to the full result set.

## GCF streaming mode

With streaming encode, the server emits rows as they arrive:

```gcf
GCF profile=graph tool=context_for_task budget=5000
## targets
@0 fn pkg.Auth 0.95 lsp_resolved          ← emitted at 50ms
@1 fn pkg.Handler 0.88 lsp_resolved       ← emitted at 120ms
## related
@2 type pkg.Config 0.72 ast_inferred      ← emitted at 300ms
@3 fn pkg.Server 0.65 lsp_resolved        ← emitted at 450ms
## edges [?]
@0<@1 calls                                ← emitted at 500ms
@2<@0 references                           ← emitted at 520ms
@0<@3 imports                              ← emitted at 540ms
##! summary symbols=4 edges=3 counts=2,2,3
```

The `[?]` marker signals that the count was unknown at emit time. The `##! summary` trailer resolves the counts after the data. In the graph profile it carries the totals (`symbols=`, `edges=`) plus a per-group count list; in the generic profile it carries `counts=N` for each deferred `[?]` section in order of appearance. The LLM has both the data and the counts in its context window.

For a weaker consumer, the graph trailer's `counts` can optionally use a labeled form that names each group, `counts=targets:2,related:2,edges:3`, instead of relying on position (SPEC Section 8.4.1). It carries the same values in the same order; encoders default to the positional form, and a decoder accepts either. The counts are informational in both forms, so this is a comprehension aid, not a validation change.

## Why TOON's streaming is output-only

TOON advertises `encodeLines()` as a streaming API. It is not.

### What TOON's spec requires

From the [TOON specification](https://github.com/toon-format/spec) (Section 6, grammar):

```
bracket-seg = "[" length [ delimsym ] "]"
length      = "0" / ( %x31-39 *DIGIT )
```

The `length` field is **mandatory**. It is a non-negative integer. There is no optional marker, no deferred count, no trailer mechanism. Every array header must declare its exact length before any rows are emitted.

Section 14.1 (Strict Mode Errors) further enforces:

> "Inline primitive arrays: decoded value count != declared N."

The count must be exact. No way around it.

### What TOON's implementation does

From [`packages/toon/src/encode/encoders.ts`](https://github.com/toon-format/toon):

```typescript
// Line 178: requires values.length BEFORE emitting header
const header = formatHeader(values.length, { key: prefix, delimiter: options.delimiter })

// Line 190: requires values.length BEFORE emitting header
const header = formatHeader(values.length, { key: prefix, delimiter })

// Line 210: requires rows.length BEFORE emitting header
const formattedHeader = formatHeader(rows.length, { key: prefix, fields: header, delimiter: options.delimiter })

// Line 279: requires items.length BEFORE emitting header
const header = formatHeader(items.length, { key: prefix, delimiter: options.delimiter })
```

Every single `formatHeader` call reads `.length` from the full in-memory array. The value must be completely known before the first line is emitted.

### What `encodeLines()` actually does

```typescript
export function* encodeJsonValue(value: JsonValue, options, depth): Generator<string> {
  // value is ALREADY FULLY IN MEMORY
  // The generator just yields lines lazily from the known structure
}
```

This is output-side streaming: "don't build the full string, yield lines one at a time." It is NOT input-side streaming: "encode data that hasn't arrived yet."

The distinction:

| | Input-side streaming | Output-side streaming |
|---|---|---|
| Data source | Unknown length, arriving incrementally | Fully in memory |
| Memory during encode | O(1) per row | O(n) for the full value |
| Time to first byte | Immediate (first row emits instantly) | After full traversal |
| What it actually solves | Server latency, memory pressure | String allocation |

TOON does output-side only. GCF does both.

### Why TOON cannot fix this

Adding real streaming to TOON would require:

1. Making `[N]` optional in the grammar (breaking change to their spec)
2. Adding a deferred count mechanism (`[?]` or equivalent)
3. Adding a trailer for count verification
4. Updating all decoders to handle deferred counts
5. Updating the strict mode error rules

This is not a feature addition. It is a fundamental redesign of the format's header contract. Their spec mandates upfront counts in normative grammar. Every conforming decoder rejects count mismatches. There is no backward-compatible path.

## Both profiles support streaming

Streaming is not graph-only. The generic profile uses the same `[?]` deferred count and `##! summary` trailer:

```gcf
GCF profile=generic
## orders [?]{id,customer,total,status}
1001|Acme Corp|249.99|shipped        ← emitted at 10ms
1002|Globex Inc|150.49|pending       ← emitted at 20ms
1003|Initech LLC|250.99|processing   ← emitted at 30ms
##! summary counts=3
```

Any array section in either profile can use `[?]` instead of `[N]`. The deferred count is a grammar-level feature, not a profile-level feature.

## GCF's design advantage

GCF was designed with extensibility in mind:

- The `##!` directive prefix naturally accommodates a `##! summary` trailer (existing decoders ignore unknown directives)
- The `[count]` production was already optional in some contexts, making `[?]` a natural extension
- The format is line-oriented, so streaming is append-only (each line is self-contained)

The streaming extension is additive. No existing payloads are invalidated. No existing decoders break (they degrade gracefully). This is the same pattern as session deduplication and delta encoding: capabilities that GCF can add incrementally because the format was designed for it.

## Comparison

| Capability | GCF | TOON |
|-----------|-----|------|
| Buffered encode | Yes | Yes |
| Output-side streaming (lazy line yield) | Yes | Yes |
| Input-side streaming (encode unknown-length data) | Yes | No (spec prohibits) |
| Zero-buffering (O(1) memory) | Yes | No (requires full value) |
| Count verification after stream | Yes (`##! summary`) | No mechanism exists |
| Time to first byte | Immediate | After full traversal |
| Can be added without breaking spec | N/A (already in spec) | No (requires grammar rewrite) |

## Impact on LLM comprehension

The `##! summary` trailer at the end of the payload is the last thing the model reads before answering a question. In transformer architectures, recent tokens have equal or stronger attention weight compared to early tokens. The trailer reinforces counts rather than degrading them.

The section-based grouping (`## targets`, `## related`, `## extended`) is unchanged in streaming mode. This is what drives the accuracy advantage over TOON and JSON on counting tasks. The model counts lines within sections regardless of whether `[N]` or `[?]` appears in the header.

## Use cases

- **MCP servers** walking large code graphs (knowing, agent-lsp)
- **Database-backed tools** paginating through result sets
- **Real-time event streams** encoded as they arrive
- **Large file analysis** where results are discovered incrementally
- **Any tool** where time-to-first-byte matters for UX
