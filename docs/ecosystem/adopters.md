# Who Uses GCF

## Chrome DevTools MCP

[Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) is the #1 most-starred MCP server on GitHub (48.8K stars). Built by the Google Chrome DevTools team, it exposes browser state (DOM, network, console, performance) to AI coding agents.

GCF ships as an experimental data format, merged after 11 days and 4 review rounds. The review process required npm provenance attestations (SLSA v1), a refactor from boolean flags to a unified `experimentalDataFormat` enum, optional peer dependency loading with clear error messages, and several other improvements.

- `--experimentalDataFormat=gcf` enables GCF encoding on all structured tool responses
- `@blackwell-systems/gcf` as optional peer dependency (install separately)
- Rollup config handles the optional import with external module resolution
- Runtime detection with actionable error messages when the package is missing
- Merged after thorough review by Google Chrome DevTools maintainers

## Opera DevTools MCP

[opera-devtools-mcp](https://github.com/operasoftware/opera-devtools-mcp) is [Opera Software](https://www.opera.com)'s DevTools MCP server, published under the GitHub-verified `operasoftware` organization. It exposes browser state (DOM, network, console, performance) to AI agents from Opera's Chromium-based DevTools, and shares the Chrome DevTools MCP lineage, carrying the same GCF integration.

- `@blackwell-systems/gcf` referenced in `src/McpResponse.ts`, loaded as an optional experimental data format (same integration model as Chrome DevTools MCP)
- Pinned to a current GCF release (v2.2.2) in Opera's own actively-maintained repository
- Second browser vendor to ship GCF in its DevTools MCP server

## OmniRoute

[OmniRoute](https://github.com/diegosouzapw/OmniRoute) is an AI gateway, registry, and proxy that sits between AI clients and model providers, built by [Diego Souza](https://github.com/diegosouzapw). MCP servers, A2A agents, REST/gRPC APIs: everything flows through it with centralized discovery, guardrails, rate limiting, auth, and observability. 43.9K stars.

GCF's generic profile encoder is vendored directly into OmniRoute's headroom compression engine, replacing their custom `omni-tabular` encoder. Zero new dependencies added. This is GCF's first infrastructure-layer integration: a gateway that every request passes through.

The previous encoder only handled homogeneous arrays with uniform column types. GCF handles heterogeneous arrays, mixed-type columns, and nested objects natively, increasing payload coverage from ~60% to 100%.

- **55-62% savings** on homogeneous arrays (was 38-48%)
- **42% savings** on heterogeneous arrays (was 0%, previous encoder couldn't handle them)
- **47% savings** on nested objects (was 7%)
- 100% payload coverage, all round-trips lossless
- 44 tests passing, full backward compatibility with existing encoded content
- OmniRoute rejected TOON because it required an npm dependency. GCF's zero-dep TypeScript source was vendored directly.

## Speakeasy

[Speakeasy](https://github.com/speakeasy-api/openapi) builds API tooling for the OpenAPI ecosystem (customers include Google, Verizon, Mistral AI, DocuSign, and Vercel). Their `oq` CLI queries and transforms OpenAPI specifications from the command line.

GCF is a native output format (`--format gcf`). The Speakeasy team conducted a dependency audit of `gcf-go`, confirming no data is sent to third parties; all encoding happens in-memory.

- `oq --format gcf` outputs OpenAPI query results in GCF
- Merged after thorough code review and dependency audit by Speakeasy maintainers
- Uses `github.com/blackwell-systems/gcf-go`
- Independent third-party adoption with full security review

## NeuroNest

[NeuroNest](https://neuronest.cc/) is an agent-first IDE built by [Network Guardian](https://netgv.ai). First independent commercial adoption of GCF.

- GCF across 4 encoding surfaces: tool executor, swarm coordinator, MCP server manager, graph export
- Session dedup with 1-hour eviction and background sweep
- Delta encoding with Jaccard similarity threshold (0.5)
- Per-provider comprehension gate: validates each LLM can read GCF before enabling it
- Shadow mode (A/B testing): compute GCF for telemetry while sending JSON to LLM
- Non-throwing failure contract with JSON fallback
- Per-surface savings ratio metrics
- Uses `@blackwell-systems/gcf` v1.0.0

[Full case study](/ecosystem/case-study-neuronest)

## NetClaw

[NetClaw](https://github.com/automateyournetwork/netclaw) is an AI-powered network automation platform with 113 skills and 66 MCP integrations, built by [John Capobianco](https://github.com/automateyournetwork) (Head of AI and DevRel at Itential, Google Developer Expert). It automates network engineering workflows across Cisco, Juniper, Arista, Palo Alto, F5, AWS, and dozens of other platforms, with live BGP/OSPF control-plane participation, gNMI streaming telemetry, ITSM gating, and immutable audit trails. 627 stars.

NetClaw previously used TOON for token optimization across its MCP servers. After benchmarking GCF against TOON on NetClaw's actual network data payloads, the project replaced TOON entirely. This was the first external project to switch from TOON to GCF.

Network data is a strong fit for GCF's generic profile. BGP peer tables, routing tables, interface lists, OSPF neighbor sessions, and Azure NSG rule sets are all arrays of uniform objects with 10-15 fields repeated across 50-500+ rows. TOON's YAML-style key-value encoding reduces some overhead, but still repeats key names on every record. GCF's positional encoding with inline schemas eliminates that repetition entirely.

The integration was surgical: all TOON serialization flowed through a single `serialize_response()` function in the shared `netclaw_tokens` library. Replacing `toon.dumps(data)` with `gcf.encode_generic(data)` and swapping the dependency from `toon-format` to `gcf-python` was the entire change. Every MCP server in NetClaw benefited automatically with no per-server modifications.

- **55.8% savings vs JSON**, 13.6% fewer tokens than TOON, wins 19/25 matchups
- **36% fewer tokens than TOON on interface data**: GCF handles mixed-type fields (IP address lists, MAC addresses, VLAN IDs) more efficiently because positional encoding doesn't care about value type or length
- Benchmarked with cl100k_base tokenizer on 5 network data types at 10, 50, 100, 200, and 500 rows each
- JSON fallback on any encode error preserves reliability

## ctx

[ctx](https://github.com/stevesolun/ctx) solves a problem every Claude Code user hits: there are 91K+ skills, 467 agents, and 10K+ MCP servers in the ecosystem, and loading them all wastes your context window on tools you're not using. Built by [Steve Solun](https://github.com/stevesolun), ctx watches your repo in real time, detects what stack you're working in (sees `.tsx` files, detects React; sees `sqlalchemy`, detects Postgres), then queries a 102,928-node knowledge graph with 2.9M edges to recommend only the 5-15 tools relevant to your current task. Nothing loads without your approval. It also detects stale tools you installed months ago and flags them for removal. 569 stars.

Every ctx recommendation, graph query, and wiki search result lands directly in the LLM context window. These payloads are arrays of uniform objects (5-25 results with 6-17 fields each) where JSON repeats every field name on every record. GCF's positional encoding eliminates that repetition, cutting the token cost of every tool response roughly in half.

ctx has four MCP tool response methods that benefit: `recommend_bundle` returns scored skill/agent/MCP recommendations with 17 fields per result. `graph_query` returns graph traversal results with shared tags and connection paths. `wiki_search` returns entity pages with descriptions, excerpts, and metadata. `wiki_get` returns full entity pages with frontmatter and body text.

GCF encoding is opt-in per tool call via `output_format: "gcf"` in the tool arguments. JSON remains the default to preserve compatibility with ctx's internal consumers (`api.py`, `mcp_server.py`). The maintainer reviewed the proof-of-concept integration and implemented his own adapter following the same opt-in design.

- **51.5% savings vs JSON** overall, up to **57.8%** on recommendation bundles at 25 results
- `graph_query`: **57.6% fewer tokens** at 25 results
- `wiki_search`: **42.4% fewer tokens** at 15 results
- Available as optional extra: `pip install "claude-ctx[gcf]"`

## Lynkr

[Lynkr](https://github.com/Fast-Editor/Lynkr) is an LLM gateway (a local proxy on `localhost:8081`) that sits between AI coding clients (Claude Code, Cursor, Codex, Cline, Continue.dev) and model backends spanning local (Ollama, llama.cpp, LM Studio), cloud (Bedrock, OpenRouter, OpenAI), and enterprise (Databricks, Azure, Vertex AI), maintained by [Vishal Veera Reddy](https://github.com/veerareddyvishal144). It strips unused tool schemas, compresses tool results, caches semantically, routes by complexity tier, and converts between Anthropic and OpenAI formats. 541 stars.

Every tool result flowing through the gateway is a compression target. Lynkr already compressed them with TOON; GCF was added as an opt-in, drop-in alternative through the same context adapter, so a deployment can switch formats without changing anything else in the proxy. Like OmniRoute, this is an infrastructure-layer integration, a gateway that every request passes through. Merged by the maintainer.

- Opt-in GCF path alongside the existing TOON encoder (`src/context/gcf.js`)
- Lossless round-trip verification (order-insensitive deep-equality) on by default, with a never-grow guard: if GCF would not shrink the payload it falls back to the original
- Byte-length fast path skips encoding on payloads below a size threshold (default 4 KB) that are too small to benefit
- 6 tests (`test/gcf-compression.test.js`), full backward compatibility with the existing TOON path
- Uses `@blackwell-systems/gcf` v2.4.0

## CodeGraphContext

[CodeGraphContext](https://github.com/CodeGraphContext/CodeGraphContext) is an MCP server and CLI that indexes local code into a graph database (nodes for symbols, edges for calls/imports/inheritance) to feed structured context to AI assistants, maintained by [Shashank](https://github.com/Shashankss1205). 4.1K stars.

Code graph data is a strong fit for GCF: tool responses are arrays of uniform records (symbols, references, call hierarchies) with the same fields repeated across every row. GCF's positional encoding declares the keys once in a header and pipe-delimits the values per row, eliminating the repetition JSON pays on every record.

GCF encoding is opt-in via the `CGC_OUTPUT_FORMAT=gcf` environment variable, with a silent JSON fallback if `gcf-python` is not installed. The integration ships as a self-contained `gcf_encoder.py` that lazily loads and caches the encoder, checks once, and never throws.

- **~62% token savings** on typical code graph data
- Opt-in via `CGC_OUTPUT_FORMAT=gcf`; JSON remains the default
- `pip install gcf-python`, silent fallback when absent
- Uses `gcf-python`'s `encode_generic` (generic profile)
- Contributed by Blackwell Systems, reviewed and merged by the maintainer

## Cisco Support MCP Server

[mcp-cisco-support](https://github.com/sieteunoseis/mcp-cisco-support) is a production-grade TypeScript MCP server for the Cisco Support APIs, maintained by [sieteunoseis](https://github.com/sieteunoseis) and listed on Cisco Code Exchange. It exposes 46 tools across 8 Cisco Support APIs (Bug Search, Case Management, EoX, PSIRT, Product, Software, Serial, and RMA), with OAuth 2.1 authentication and dual stdio/HTTP transport. 31 stars.

Cisco Support responses are a strong fit for GCF's generic profile: bug lists, end-of-life lifecycle entries, PSIRT security advisories, and product and software listings are arrays of uniform records with the same fields repeated across every row. GCF declares the keys once in a header and encodes values positionally, eliminating the per-record key repetition JSON pays on every entry.

The integration replaced TOON entirely. All response formatting flows through a single formatter (`src/utils/toon-formatter.ts`), so swapping the encoder to `encodeGeneric` and the dependency from `@toon-format/toon` to `@blackwell-systems/gcf` was the whole change, and every tool benefits automatically.

- **28.5% fewer tokens than JSON** on Cisco Support API data (maintainer's benchmark)
- GCF is on by default; set `DISABLE_TOON_FORMAT=true` to fall back to JSON
- `@toon-format/toon` removed as a dependency; `@blackwell-systems/gcf` is the sole encoder
- Reviewed and merged by the maintainer
- Uses `@blackwell-systems/gcf`'s `encodeGeneric` (generic profile)

## Wazuh MCP Server

[Wazuh MCP Server](https://github.com/gensecaihq/Wazuh-MCP-Server) is a production-grade MCP server for the Wazuh SIEM, built by [GenSecAI](https://gensecai.org) (a non-profit community building open-source generative-AI security tools) and maintained by [alokemajumder](https://github.com/alokemajumder). It exposes 55 security tools for alert triage, threat hunting, vulnerability management, compliance (PCI DSS, GDPR, HIPAA, NIST CSF, ISO 27001), and active response, connecting Claude or any local LLM to a SOC, with OAuth 2.1, RBAC, multi-cluster, and air-gapped operation. 216 stars.

Wazuh responses are a strong fit for GCF's generic profile: the alert, security-event, and vulnerability tools return arrays of uniform records under a `data.affected_items` array. GCF declares the field names once in a header and encodes values positionally, so the per-record key repetition JSON pays on every alert is eliminated. On a SIEM feeding high alert volumes to an LLM, that repetition is exactly the cost.

The integration is deliberately conservative for a security tool: a format change only, with no cross-turn deduplication, so no alert is ever omitted from a result. It composes with the server's existing `compact` field-projection parameter.

- Opt-in via `RESPONSE_FORMAT=gcf`; default JSON output is unchanged; every response stays complete (lossless, no dedup)
- `gcf-python` ships as an optional `[gcf]` install extra (lazy import warns and falls back to JSON when absent)
- Reviewed and merged by the maintainer, who audited the `gcf-python` source and round-tripped real alert shapes
- Uses `gcf-python`'s `encode_generic` (generic profile)

## Elasticsearch MCP Server

[elasticsearch-mcp-server](https://github.com/cr7258/elasticsearch-mcp-server) is an MCP server for **Elasticsearch and OpenSearch**, maintained by [cr7258](https://github.com/cr7258). It exposes search, index, document, cluster, and alias operations to agents over stdio and HTTP transports. 303 stars.

Search responses are a natural fit for GCF's generic profile: query hits, index listings, mappings, and aggregation buckets are arrays of uniform records that repeat the same field names on every row. GCF declares the keys once in a header and encodes values positionally, cutting the per-record key repetition JSON pays on every hit, which is exactly where the cost lives when feeding search results into an LLM. On the maintainer's benchmark, GCF runs **~39% fewer tokens than compact JSON (40% on search hits), losslessly**.

The integration is a **FastMCP response-formatting middleware** and is production-careful: only the model-facing text block is re-encoded, so `structuredContent` is preserved (output schemas still validate and non-model clients keep receiving JSON). Encoding is fail-safe: any error, including a value outside GCF's canonical `int64` domain (which GCF rejects rather than silently approximating), leaves the original JSON untouched, so a tool call is never dropped over formatting.

- Opt-in via `RESPONSE_FORMAT=gcf`; default output is unchanged
- Direct runtime dependency on `gcf-python`, pinned to `2.6.0` (a current release)
- **~39% fewer tokens than compact JSON** on representative responses; reproducible benchmark in-repo (`benchmarks/gcf_benchmark.py`)
- Uses `gcf-python`'s `encode_generic` (generic profile), applied as FastMCP middleware (`src/response_format.py`, `test_gcf_response_middleware.py`)
- Covers both Elasticsearch and OpenSearch

## Equibles

[Equibles](https://github.com/daniel3303/Equibles) is a self-hosted, open-source financial data MCP server for AI agents, built by [Daniel Oliveira](https://github.com/daniel3303). It exposes 64 tools across SEC filings, XBRL financials, 13F institutional holdings, insider and congressional trades, short interest, FRED, and CFTC/CBOE data. 199 stars.

Most Equibles results are tables (holdings, filings, trades, price histories): arrays of uniform records where the same columns repeat on every row. That is the shape GCF's generic profile is built for, declaring the column names once in a header and encoding values positionally instead of repeating keys on every record.

The integration is curation-preserving. Equibles renders its tables through a single formatter, and the GCF path encodes the exact cells that formatter already produced, so the maintainer's comma-grouping, adaptive-decimal, and other formatting stay intact. It is opt-in and never-grow: `EQUIBLES_OUTPUT_FORMAT=gcf` uses GCF only when the wire is smaller than the markdown, and falls back to markdown otherwise.

- **13-16% fewer tokens** (o200k) on the tools' own table shapes, losslessly
- Opt-in via `EQUIBLES_OUTPUT_FORMAT=gcf`; default markdown output is unchanged
- First adoption of the `BlackwellSystems.Gcf` .NET SDK
- Co-developed and merged by the maintainer
- Uses `BlackwellSystems.Gcf`'s generic profile, encoding the rendered table cells

## PerformanceMonitor

[PerformanceMonitor](https://github.com/erikdarlingdata/PerformanceMonitor) is free, open-source SQL Server performance monitoring built by [Erik Darling](https://github.com/erikdarlingdata) (Darling Data): specialized collectors, real-time alerts, a graphical execution-plan viewer, and a built-in MCP server that exposes its collected data to an AI assistant for analysis. It replaces monitoring tools that charge thousands per server per year, supports SQL Server 2016–2025 / Azure SQL / AWS RDS, and nothing phones home. 481 stars.

The Darling edition's MCP host gained an opt-in GCF output mode (`DARLING_OUTPUT_FORMAT=gcf`). Its read tools return arrays of uniform records (blocking pairs, wait stats, index bloat, query and I/O stats) where JSON repeats every field name on every row; GCF factors those into a single header. It is applied at one place, a single call-tool filter (`AddCallToolFilter`) that post-processes every tool result, so every tool is covered with no per-tool change. `BlackwellSystems.Gcf` (the .NET SDK) is a zero-dependency package.

Merged after a deep maintainer review: Erik built his own harness and measured against the server's compact JSON on eight real MCP payloads captured from a live PostgreSQL target.

- **29.7% fewer tokens than compact JSON** (`o200k_base`) across the eight-payload set, every result lossless
- The most uniform data wins most: `get_pg_column_stats` **55.4%**, `get_pg_index_bloat` **54.7%**, `get_pg_predicate_stats` **53.0%**, down to **11.3%** on a text-dominated result
- Conservative in both directions: a result is re-encoded only when the GCF wire is both smaller than the JSON and decodes back to it exactly (integers keep full precision; a non-integer a double cannot hold, or any result the wire would grow, stays JSON)
- Second adoption of the `BlackwellSystems.Gcf` .NET SDK; the maintainer independently benchmarked and reviewed the encoder before merging

## Open Data Products SDK (Linux Foundation)

[Open Data Products SDK](https://opendataproducts.org/sdk/) is a Python toolkit and MCP server for working with data product standards under the Linux Foundation. It validates, generates, and publishes Open Data Product specifications.

- GCF sidecars for ODPC and ODPG workflows (agent-ready graph context)
- Packed for agent prompts and review automation
- Status: experimental integration

## bb (Bitbucket Cloud CLI)

[bb](https://github.com/payfacto/bb) is a Go CLI and TUI for the Bitbucket Cloud REST API, built by [Payfacto](https://github.com/payfacto). Designed for AI agent consumption with a human-friendly TUI mode.

- GCF supported as opt-in output format via `--format gcf`, `BB_FORMAT=gcf`, or config file
- JSON is the default; GCF is the token-efficient alternative for agent consumers
- Imports `github.com/blackwell-systems/gcf-go` directly in Go source
- Full design spec documenting the GCF integration decision (2026-06-15)
- Links to the GCF spec in both README and llms.txt
- Independent third-party adoption: no affiliation with Blackwell Systems

## knowing

[knowing](https://github.com/blackwell-systems/knowing) is a self-adapting code intelligence engine. It uses GCF as the primary wire format for all 28 MCP tool responses.

- 84% token savings on every tool call
- Session deduplication across multi-turn code exploration
- Delta encoding for re-queries as code changes
- Serves graph-structured data: symbols, edges, communities, call hierarchies

GCF was designed for knowing's use case and extracted into a standalone format once the efficiency gains were proven.

## agent-lsp

[agent-lsp](https://github.com/blackwell-systems/agent-lsp) is an MCP server that orchestrates existing LSP servers (gopls, rust-analyzer, jdtls, etc.) into agent-native workflows. 66 tools, 30 CI-verified languages, 24 agent workflows.

- All tool handlers support GCF tabular output via `EncodeResult`
- 34-44% token savings on structured tool responses (symbol lists, references, diagnostics, call hierarchies)
- JSON remains the default; GCF is opt-in via session configuration
- Uses `gcf-go` `EncodeGeneric` for generic profile encoding

## SkyElite

SkyElite is an AI-powered travel planner built as a multi-agent system using LangGraph and LangChain. Built by [Muhammad Hassaan](https://www.linkedin.com/in/muhammad-hassaan-25480a322), [Muhammad Ahmad Abbas](https://www.linkedin.com/in/muhammadahmadabbas), and [Muhammad Abdullah](https://www.linkedin.com/in/muhammad-abdullah-91b83624b/) at FAST-NUCES. Won 3rd place at the National AI Hackathon organized by atomcamp, Islamabad.

The team used GCF for cross-agent context passing in their multi-agent architecture, replacing JSON for token optimization and efficient context sharing between agents handling destination ranking, visa accessibility, flight pricing, and hotel availability.

- Multi-agent system with LangGraph orchestration
- GCF used for inter-agent context sharing
- 3rd place, National AI Hackathon (Pakistan, 2026)

## Raycast

[Raycast](https://raycast.com) is a productivity launcher for macOS with 7.7K stars on their extensions repo.

The [JSON to GCF Converter](https://raycast.com/blackwell-systems/json-to-gcf-converter) extension converts JSON data into GCF from the clipboard or selected text. Published to the Raycast Store.

- No-view command: copy JSON, run command, GCF on clipboard
- Uses `@blackwell-systems/gcf` npm package
- Approved by Raycast maintainers (Greptile 5/5 confidence score)

## Axon Bridge

[Axon Bridge](https://github.com/chaitanya-sharmaa/axon) is a drop-in OpenAI-compatible proxy with autonomous token compression and multi-provider routing (via LiteLLM), maintained by [chaitanya-sharmaa](https://github.com/chaitanya-sharmaa). It sits between AI clients and model providers and compresses payloads in flight.

- GCF wired directly into the token-optimization path (`axon/services/token_optimizer.py`, `axon/services/bridge_service.py`)
- `gcf-python` declared as a direct dependency in `pyproject.toml`
- Benchmarked against other strategies in-repo (`examples/strategy_benchmark.py`, `examples/session_benchmark.py`)
- Independent third-party adoption

## neterse

[neterse](https://github.com/pcDamasceno/neterse) produces minimum-token renderings of network CLI output for LLM agents, maintained by [pcDamasceno](https://github.com/pcDamasceno). It parses raw device output and re-encodes it in the smallest faithful representation for the model.

- GCF is one of its output encoders (alongside TextFSM and TOON), selected per call by smallest faithful size
- `gcf-python` declared as a direct dependency in `pyproject.toml`; used in `neterse/parsed.py`
- Round-trip and spec coverage in tests (`tests/test_spec_formats.py`, `tests/test_reference_encoders.py`)
- Extends the network-automation cluster ([NetClaw](#netclaw))
- Independent third-party adoption

## Also in the wild

Smaller projects and community tools where GCF shows up — packaged downstream, listed in registries, or carried into dependency trees by upstream tooling.

**Packaged & listed:**

- **[NUR (Nix User Repository)](https://github.com/nix-community/nur-combined)** — agent-lsp (GCF token-optimized output) packaged and installable across NixOS.
- **[Codex plugin marketplaces](https://github.com/hashgraph-online/awesome-codex-plugins)** — the GCF Proxy plugin (wrap any MCP server, 71% token reduction) is listed across multiple Codex plugin registries.

**Transitive reach** (GCF resolves into these projects' dependency trees via upstream tooling — present in the lockfile, not a declared direct dependency):

- **[Jx Studio](https://github.com/jxsuite/jx)** — a local-first visual website builder. `@blackwell-systems/gcf` resolves into its lockfile via upstream tooling.
- **[wicek](https://github.com/xxczaki/wicek)** — a Claude Code–powered Discord assistant; GCF resolves into its lockfile through its Claude Code / MCP dependencies.

## Your project here

Using GCF in anything, from a weekend tool to a production service? Add yourself to the [Who's using GCF?](https://github.com/blackwell-systems/gcf/issues/14) thread and we'll pull it in here. If you vendor the source or run it privately, that thread (or an email to dayna@blackwell-systems.com) is the only way we'd know.
