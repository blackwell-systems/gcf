# Opt-in Encodings and Knobs

GCF's default encoder is already optimized and lossless: call `EncodeGeneric` (or the graph encoder) and you get the canonical, smallest-safe form with no configuration. Everything on this page is **beyond** that default: a menu of opt-in encodings and knobs, each one for a specific situation. None of them changes the default path, and none is required. Reach for one only when your situation matches the "when to use" column.

One thing that looks like it belongs here but does not: **constant-column factoring is automatic, not a knob.** When a column holds the same value in every record of a top-level array, the canonical encoder factors it into the header (`region=us-east`) and drops it from the rows on its own. There is nothing to turn on. It is lossless and always safe, so it is simply part of the default output. (Spec [Section 7.4.7](https://github.com/blackwell-systems/gcf/blob/main/SPEC.md).)

## The menu

| Encoding / knob | What it does | When to use | Caveat |
|---|---|---|---|
| [Value-grouping](#value-grouping) | Clusters a keyed set by one low-cardinality column, writing the value once per group | A set of records (identified by a key) with a repeated low-cardinality column, where array order does not carry meaning | Reorders records; valid only for keyed sets |
| [Session deduplication](/guide/sessions) | Re-sends only new symbols across a multi-turn exchange | An agent loop or chat that re-queries overlapping data turn after turn | Needs a shared session; multi-turn only |
| [Delta encoding](/guide/delta) | Sends only what changed since the last snapshot | Evolving context that is re-queried as it changes | Needs a prior snapshot and a stable key |
| [Streaming](/guide/streaming) | Deferred counts and a summary trailer, constant memory | Large result sets from a cursor, pagination, or graph traversal | No per-row attachments; counts arrive in the trailer |
| [Comprehension knobs](/guide/small-models) | Flatten off, labeled counts, re-anchor | Any traffic to open-weight or small models | Each is measured per model tier; see that page |

The first four are distinct encodings you select by calling a different entry point or setting a header flag. The last row is a set of producer-side knobs documented in full on the [small-models](/guide/small-models) page, where each is tied to the measured comprehension gain that justifies it.

## Value-grouping

A tabular array that is really a **keyed set** (its records are identified by a unique key, and their order carries no meaning) with one low-cardinality column can be emitted grouped by that column. The column's value is written once per cluster as a subheader; the records follow with that cell omitted.

```
## [6]{@id,name,dept,level} group=dept
dept=Sales [2]
u1|Alice|3
u4|Dave|2
dept=Engineering [3]
u2|Bob|1
u3|Carol|4
u6|Frank|5
dept=Support [1]
u5|Eve|2
```

The `@id` marks the key column (its values must be unique; a decoder enforces this), and `group=dept` names the grouping column, which keeps its position in the record so key order round-trips. Decoding reconstructs the six records as a set keyed by `id`.

**When to use it:** a set of records with a column that repeats across many rows (a department, a status, a region, a kind), where you treat the array as a set or map rather than an ordered sequence. The repeated value is written once per group instead of once per row.

**The caveat that makes it opt-in:** value-grouping **reorders records** to form the clusters, so it is lossless only as a keyed set, not as an ordered array. That is why it is never the default and never produced unless you ask for it: the producer has to affirm that the array's order is not significant. If you need the original element order, use the flat form (the default), which preserves it. A decoder always reads grouped output regardless; only *producing* it is opt-in.

**How:** call the grouped encoder (for example `EncodeGenericGrouped(data, keyField, groupField)` in the Go SDK; the equivalent entry point in each SDK), passing the unique key field and the grouping field. It errors if the key is not unique, if the key and group fields are the same, or if the records carry nested attachments (not supported in grouped rows in this version). Spec [Section 7.4.8](https://github.com/blackwell-systems/gcf/blob/main/SPEC.md).

## Multi-turn encodings

Three of the opt-in encodings are for exchanges that span more than one payload. They are covered in full on their own pages; in brief:

- **[Session deduplication](/guide/sessions):** across a multi-turn exchange with a shared session, a symbol transmitted once is later referenced by its id rather than resent. Best for agent loops that re-query overlapping data.
- **[Delta encoding](/guide/delta):** when context evolves and is re-queried, send only the added, removed, and changed records against the last snapshot, content-addressed so the consumer can verify it reconstructed the same state.
- **[Streaming](/guide/streaming):** emit rows as they are produced with a deferred count and a summary trailer, so a producer draining a large cursor holds constant memory instead of buffering the whole result.

These compound: on overlapping multi-turn traffic, session dedup and delta together cut far more than any single-payload encoding, because they remove the resend rather than shrinking it.

## Comprehension knobs for small models

The [small-models](/guide/small-models) page documents three producer-side knobs, each measured against the comprehension gain that justifies it: turning flattening off for open-weight models, labeled counts to rescue counting, and re-anchor to rescue long sessions. They do not change what the data means; they change how reliably a weaker model reads it. Apply them when any part of your traffic goes to a Flash, a mini, a 70B, or a local model.

## What is not here

Two deliberately unsupported modes are not on this menu and should not be used in production: a whitespace-maximal "sloppy" encoder and affix/template factoring. Both trade comprehension for a few more tokens, which is the trade GCF is built to refuse; they exist only as internal rebuttals to "you cannot compress harder," and they degrade reading accuracy on non-frontier models. The safe way to save more tokens is the protocol layer above (session, delta, streaming), which cuts tokens across turns without degrading any single payload's readability.
