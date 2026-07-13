# Where GCF Fits

GCF pays off wherever **structured data crosses into a model's context**, and it pays off
most when that happens **repeatedly across a multi-turn loop**. This page helps you tell
whether your use case is a fit, by the shape of your data and how you use it.

## The quick self-check

Three questions. The more "yes" answers, the stronger the fit:

1. Does structured data (records, results, symbols) get serialized into the model's prompt?
2. Is it **arrays of similar records**, or a **graph of entities and relationships**?
3. Do you send it **more than once** across a session (re-query, refine, loop)?

One "yes" is a decent single-payload win. All three is where GCF is uncontested: JSON and
TOON re-send everything every turn and have no notion of a diff or a prior transmission.

## By workload shape

### 1. Code intelligence and knowledge graphs (graph profile)

**The strongest fit.** Data that is a web of interrelated, recurring entities queried many
ways across a session. GCF's graph profile expresses it natively with local IDs (`@0`),
typed edges (`@0<@1 calls`), and distance grouping (`## targets` / `## related`), and
deduplicates entities already sent this session as bare references. None of that is
expressible in JSON or TOON.

Fits:

- **Code intelligence / LSP / code-graph tools** — symbols and edges (calls, imports,
  implements) surfaced repeatedly as an agent works a codebase.
- **Knowledge graphs and GraphRAG** — a retrieved subgraph of entities and relationships
  that evolves per turn.
- **Agent memory with relationships** — an entity/fact graph re-injected under token
  pressure every turn.
- **Dependency, impact, and topology graphs** — build graphs, service meshes, cloud
  resource graphs, ontologies.

Why it stacks: recurring entities across varied queries use [session dedup](/guide/sessions),
the graph itself is the payload (edges + distance), and re-queries after a change are
[deltas](/guide/delta). See the [Format Overview](/guide/format-overview) for the graph profile.

### 2. Agentic tool loops on tabular data (generic profile + delta)

**The broad fit.** Tabular tool results (records, not relationship webs) that are re-queried
and refined across a loop. The generic profile carries the same multi-turn machinery as
graph: [delta encoding](/guide/delta) sends only the rows that changed, [streaming](/guide/streaming)
handles large sets, and content-addressed identity (`pack_root`) drives an unchanged /
delta / full protocol. Comprehension holds across long sessions; for the longest runs on
smaller models, a lightweight producer-side re-anchor keeps it steady (the `GenericDeltaSession`
helper does this automatically).

Fits:

- **Agent frameworks** — message history and shared state re-sent to each agent every turn.
- **Database and analytics tool servers** — result sets that evolve as an agent drills in.
- **Data-to-LLM tools** — dataframe schemas and SQL results injected into a codegen or
  summarization prompt on every call.
- **RAG result sets** — metadata-rich hit arrays (`{id, score, payload}`) into synthesis.
- **Eval and LLM-as-judge** — batches of uniform rows scored across a dataset.

### 3. Large result sets from a cursor (streaming)

When a query returns a big result set from a cursor, [streaming](/guide/streaming) delivers
rows as they arrive with O(1) memory and lets the model start reading before the full set is
in hand. This is a latency and memory win even when the raw token savings are modest:
OLAP/analytics cursors, graph traversals, large log or event queries, pagination-heavy gateways.

### 4. One-shot payload compression (a single serialization point)

If your integration surface is one output-format switch (an MCP tool-result gateway, an API
layer feeding a model), GCF is a drop-in that cuts tokens losslessly with no runtime
dependencies. The win here is real but modest and format-agnostic; lead with lossless
round-trips and comprehension, not headline token counts. The [MCP proxy](/guide/proxy)
makes this zero-code for any MCP server.

## When NOT to use GCF

GCF is honest about where it does not help:

- **Prose and heterogeneous content** — RSS, web-search snippets, document chat, single
  documents. Text bodies are opaque to GCF; savings are near zero.
- **Structured-output emit targets** — libraries whose job is to make the model *emit* JSON
  via tool-calling. GCF is a format the model *reads* efficiently, not a constrained emit target.
- **Live LLM gateways on the core hop** — proxies locked to a provider's wire format cannot
  reshape what the model receives.
- **Tiny single objects and nested-array-heavy records** — GCF ties or loses; the overhead
  is not worth it.

## Which profile?

- **Relationship-heavy data** (nodes and edges): the **graph profile** (`encode`).
- **Everything else** (arrays, nested records, mixed types): the **generic profile**
  (`encodeGeneric`), which is what most workloads need.

Both profiles support delta, streaming, and content-addressed identity. Local IDs, typed
edges, distance groups, and bare-reference session dedup are graph-only. See the
[Format Overview](/guide/format-overview) to choose.
