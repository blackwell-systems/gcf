# The GCF Story

## Where it came from

GCF started as an experiment.

The project it grew out of is called "knowing," the code intelligence engine behind agent-lsp. Knowing builds graphs of code: symbols, function calls, type relationships, dependency chains. It serves those graphs to LLMs so they can reason about codebases at scale. Symbols have qualified names, kinds, scores, provenance chains. Edges connect them: calls, implements, imports, references. Distance groups organize them by relevance to the query.

The question was simple: what if there was a format designed specifically for graph-shaped data going into an LLM context window? Not JSON squeezed into a role it wasn't designed for. Something native to the data shape.

Knowing worked with JSON. But JSON is verbose for graphs. Every edge repeats both endpoint identifiers in full. Every symbol repeats every field name. A 500-symbol code graph with 200 edges, serialized as JSON, consumed 53,341 tokens. That is a lot of structural noise for data that has natural positional structure.

So the experiment started: what if section headers replaced per-record metadata? What if local IDs replaced repeated identifiers? What if the format aligned with how LLMs already process sequential information, instead of how humans scan nested trees?

The experiment worked. I started benchmarking the graph grammar and discovered the savings were significant: 79% fewer tokens on a 500-symbol code graph. Then came the bigger realization: the generic profile could be a strict subset of the graph grammar, and it could express arbitrary structured data more efficiently than any existing solution. The graph experiment had accidentally produced a general-purpose wire format.

## The first encoding

The first version of GCF was hand-rolled for graph data. One header line declaring the tool name, budget, token count, symbol count, edge count. Section headers grouping symbols by distance: `## targets`, `## related`, `## extended`. Positional fields so each symbol was one line instead of a JSON object. Local IDs (`@0`, `@1`) so edges could reference symbols without repeating full qualified names.

Instead of this:

```json
{
  "edges": [
    {"source": "github.com/org/repo/pkg.AuthMiddleware", "target": "github.com/org/repo/pkg.ValidateToken", "type": "calls"}
  ]
}
```

GCF wrote this:

```
@0<@1 calls
```

Four tokens instead of thirty to a hundred. The savings were structural and grew with payload size. At 500 symbols and 200 edges, GCF used 11,090 tokens. That is 79% fewer than JSON.

But the real surprise was not the token count. It was the comprehension.

## The insight

LLMs are not parsers. They are readers.

JSON is a tree of nested braces, repeated keys, and structural tokens that carry no semantic information. A model scanning 500 JSON objects has to mentally track brace depth, match opening and closing brackets, and infer structure from indentation patterns the tokenizer has already destroyed. Every `"qualified_name":` repeated on every line is a token that adds noise without adding signal.

GCF aligned with how LLMs naturally process information. Markdown-style section headers (`## targets [167]`) answered counting questions directly. Positional fields eliminated key repetition. Local IDs turned relationship queries from "scan every edge and match string identifiers" to "look up `@0`."

The result: on 500-symbol code graphs, GCF scored 91.2% comprehension across 10 models and 25 runs. JSON scored 54.1%. TOON (the leading alternative) scored 68.8%. Four models hit 100% with GCF. None hit 100% with JSON or TOON.

GCF was not optimized for human readability. It was optimized for the reader that matters. The format that looks clean to human eyes (JSON with its aligned braces and pretty-printed keys) is the format that breaks the model's ability to count, filter, and extract. The format that looks dense and "messy" to humans is the one that scores 100% comprehension on every frontier model tested.

This was the core insight: readability is a last-mile rendering concern, not a wire format property. The agent reads GCF. It does its work. It calls `decode()` at the end if a human needs to see JSON. The savings are already banked.

## From graphs to everything

GCF started as a graph encoding because knowing needed a graph encoding. But the positional-field trick, the inline schemas, the pipe-separated rows: none of that was graph-specific. Arrays of objects with declared field names and positional values work on any structured data.

The generic profile was born: `encodeGeneric()`. Any JSON value goes in. Lossless GCF comes out. `decode(encode(value)) == value`. Not approximately. Exactly. Null versus missing, preserved. Number precision, preserved. Empty strings, empty arrays, empty objects, all preserved. Nested objects, nested arrays, mixed types, root scalars: all encoded, all round-tripped.

This changed what GCF was. It was no longer "a format for code intelligence graphs." It was "a format for structured data."

The generic profile became the lead. Every README, every getting-started page, every playground default now shows `encodeGeneric()` first. The graph profile is the specialized superset for when your data has nodes and edges. Most users have API responses, database results, configuration. The generic profile handles all of it.

```
GCF profile=generic
## employees [3]{id,name,department,salary}
1|Alice|Engineering|95000
2|Bob|Sales|72000
3|Carol|Marketing|85000
```

One header declares field names. Rows are values only. No field names repeated per record. 71% fewer tokens than JSON on real-world data. And the LLM reads it perfectly without any format instructions, any training, any primer.

## The multi-format pivot

The next realization was bigger.

GCF does not encode JSON. GCF encodes structured values. The source format is irrelevant. If your data deserializes to objects and arrays, GCF can encode it. JSON is the most common input today. But YAML, TOML, CSV, and MessagePack all deserialize to the same primitives.

To prove this was not theoretical, the fuzz testing started. Not hundreds of round-trips. Not thousands. Billions.

JSON: 21.25 billion round-trips. YAML: 21 billion. MessagePack: 584 million. CSV: 335 million. TOML: 100 million. Total: 43 billion, 269 million. Zero failures. Not one mismatched value in 43 billion attempts.

The Rust implementation drove the headline numbers: 2.94 million JSON round-trips per second across 10 cores. The 10-billion-JSON run finished in 56 minutes. The 10-billion-YAML run took 10.7 hours. They ran overnight because the numbers needed to be undeniable.

The positioning shifted. "Lossless JSON codec" became "AI-native wire format for structured data." GCF is the universal pivot: any format in (JSON, YAML, TOML, CSV, MessagePack), GCF in the context window, any format out. TOON accepts JSON only. GCF accepts everything.

Every format name is an SEO keyword and a marketing door TOON cannot enter. "YAML token optimization" leads to GCF. "CSV for LLMs" leads to GCF. "MessagePack for AI" leads to GCF. TOON is YAML with counted arrays. It can only answer "JSON alternative." GCF answers all of them.

## The evidence obsession

Every claim is backed by shipped code and measured data. This is not a preference; it is a survival requirement. One person building alone against a competitor with 24,000 GitHub stars and 3 million monthly npm downloads cannot afford a single fake number.

The lesson was learned the hard way. An early PR to neo4j-contrib/mcp-neo4j (961 stars) claimed "71% fewer tokens" with zero benchmark data attached. It had to be closed immediately. The replacement PR (#293) included a full benchmark script, measured 53% savings on real Neo4j query patterns, and included lossless verification on 17 of 18 test shapes. The one failure: integers beyond 2^53, which Neo4j data never reaches.

The same standard applies everywhere:

- 1,700+ LLM evaluations across 10 models, 3 providers, 51 independent test runs. Deterministic answers, no LLM-as-judge methodology. If the model says 320 and the answer is 500, that is a failure. No spin.
- 204 conformance fixtures across 10 categories, verified on all 6 implementations.
- 43 billion+ round-trips across 5 formats and 6 languages.
- 15-dataset token efficiency benchmark forked from TOON's own repo, using their tokenizer, their methodology, plus 9 additional datasets representing real MCP tool responses.
- Independent AI reviews: Claude, GPT, and Gemini were each given the JSON RFC, TOON spec, and GCF spec with zero priming. All three chose GCF for agent replacement.

When the playground shipped, the TOON comparison used the real `@toon-format/toon` library, not a simulation. An early version had a hand-rolled TOON formatter. It was caught before shipping. "You almost left me with a bomb in credibility."

## The competition

TOON has 24,000 stars. 3 million monthly npm downloads. 10+ implementations across every major language. Two years of market presence. A VS Code extension, n8n workflow nodes, a Laravel package, an MCP proxy called "Tooner."

GCF has six implementations, 22,000+ downloads across 11 channels, three independent adopters, and three weeks of existence. One person building everything.

The gap is marketing, not product. GCF wins every measured benchmark. On structured data: 29% fewer tokens across 16 datasets, 15 of 16 wins. On comprehension: 91.2% versus 68.8%. On generation: 5/5 on every frontier model while TOON's decoder rejects output from 7 of 9 models. On multi-turn interactions: session dedup compounds to 84% across a session, stacking to 94% with delta, a feature TOON structurally cannot add.

TOON is a tree serializer. YAML with counted arrays. It can encode tabular data efficiently. It cannot encode relationships, cross-references, session state, or deltas. Adding local IDs would require a new grammar. Adding session dedup would require local IDs. Adding edge encoding would require both. TOON would have to become a different format to match what GCF already ships.

The structural advantages are real:

| Feature | TOON | GCF Generic | GCF Graph |
|---------|------|-------------|-----------|
| Inline schemas | No | Yes | Yes |
| Positional rows | No | Yes | Yes |
| Local IDs | No | No | Yes |
| Typed edges | No | No | Yes |
| Session dedup | No | No | Yes |
| Delta encoding | No | No | Yes |
| Streaming (true zero-buffer) | No | Yes | Yes |

Other competitors appeared and faded. PLOON (Path-Level Object Oriented Notation): 39 stars, one TypeScript implementation, 32% round-trip accuracy on fuzz testing, abandoned for 7 months. MAXI: 55-60% token reduction claims, no comprehension data, similar tier to TOON. IRON (Internal Reference Object Notation): 1 star, draft spec, zero implementations, abandoned for 6 months.

The competitive landscape confirmed something: the problem is real, others see it too, and nobody else has solved it at this depth.

## The ecosystem

Six language implementations, all at v2.4.0 or above (Go at v1.5.1), all published to their respective registries:

- **Go** on pkg.go.dev. The reference implementation. 1 billion+ round-trips with native Go fuzzing.
- **TypeScript** on npm. Powers the playground and the browser encoder.
- **Python** on PyPI. Used in the Neo4j integration PR.
- **Rust** on crates.io. Drove the 33-billion round-trip suite with Rayon parallelism.
- **Swift** via Swift Package Manager.
- **Kotlin** via JitPack.

Around the core: gcf-proxy (wraps any MCP server with zero code changes, session dedup, delta encoding, HTTP frontend). A Claude Code plugin. A Codex plugin. VS Code extension. JetBrains plugin. Zed extension. An n8n community node. A tree-sitter grammar for syntax highlighting. 12 publication-quality charts.

Upstream integration PRs to Neo4j's MCP server, Grafana, mcp-go. Submissions to 10+ awesome lists and marketplaces. The official MCP Registry. Three domain names: gcformat.com, betterthanjson.com, betterthantoon.com.

The primary production consumer is agent-lsp itself: the tool that GCF was extracted from, now adopting GCF as its native output format. The graph that started it all is coming home.

## The solo founder

One person. Dayna Blackwell. 21,000 commits per year. Solo founder of Blackwell Systems.

She built the spec. All six implementations. The proxy. The plugins. The conformance suite. The eval harness. The fuzz infrastructure. The playground. The landing page. The calculator. The charts. The competitive analysis. The marketing sites. The upstream PRs. The service offering. The Dr. Seuss poem.

Yes, there is a Dr. Seuss poem. "Not a TOON." It is technically accurate, every number backed by data, and it lives unlisted at gcformat.com/guide/not-a-toon.html, waiting for the right LinkedIn moment.

> "I could not, would not, with a TOON. Not a TOON, not a PLOON, not a BLOON or a SPOON."

> "Thirty-three billion times tested. Six languages strong. One hundred percent comprehension. The OONs were wrong."

The sessions run 14 hours. A single session might ship a spec revision, fix conformance gaps across six languages, run 10 billion YAML round-trips overnight, redesign the landing page with glassmorphism and a wire diagram, update 33 documentation surfaces, write a parody poem, and publish new versions to six package registries. The commit messages read like changelogs because every commit matters when this is your livelihood.

There are rules. Never cut corners. Never fake a comparison. Never ship without fuzzing. Never set a timeout on an eval run (that lesson was learned with language that cannot be printed here). Never release without 10 million round-trips minimum. Never submit an upstream PR without measured data.

This is not a side project or a portfolio piece. This is the thing.

## Where it's going

The spec is at v3.4.1 Stable. The foundation is solid. Six languages, 204 conformance fixtures, 43 billion round-trips, 1,700+ evaluations.

What comes next:

**Adoption.** The product is built. The evidence is published. The distribution is in motion: 30+ PRs across 250K+ stars of curated lists, editor extensions on VS Code and Zed, plugin submissions to Anthropic's official directory. The gap is awareness, not capability.

**Consulting.** Full-stack token cost reduction: 10 techniques that compound to 70-90% savings. GCF is one layer. Prompt caching, model routing, RAG optimization, agent loop design, batch API: the playbook covers all of them. blackwell-systems.com/services.

**Ruby implementation.** The seventh language. The conformance fixtures exist. The spec is stable.

**The category GCF is creating.** There is no name for what GCF is. "Token-efficient encoding" undersells it. "JSON alternative" anchors it to one format. "Wire format for structured data" is accurate but not a category. The closest analogy: GCF is to the LLM context window what HTTP is to the network. A real format with a real spec that exists in transit, at the boundary between structured data and the consumer. You don't store data as HTTP. You don't store data as GCF. You encode at the wire. You decode at the end. The wire format is invisible to everyone except the two parties exchanging data, and one of those parties is an AI model that reads GCF better than it reads the format it was trained on.

That last fact is the one that matters most. No model has ever been trained on GCF. Every model reads it better than JSON, YAML, and TOON. The format aligns with how transformers process sequential information: positional structure, section boundaries, declared schemas, minimal repetition. GCF did not teach the models anything. It stopped fighting how they already work.

Thirty-three billion round-trips. One hundred percent comprehension. Six languages. One person.

The OONs were wrong.
