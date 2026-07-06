# Who Uses GCF

## Chrome DevTools MCP

[Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) is the #1 most-starred MCP server on GitHub (46K stars). Built by the Google Chrome DevTools team, it exposes browser state (DOM, network, console, performance) to AI coding agents.

GCF was merged as an experimental data format in [PR #2235](https://github.com/ChromeDevTools/chrome-devtools-mcp/pull/2235) after 11 days and 4 review rounds. The review process required npm provenance attestations (SLSA v1), a refactor from boolean flags to a unified `experimentalDataFormat` enum, optional peer dependency loading with clear error messages, and several other improvements.

- `--experimentalDataFormat=gcf` enables GCF encoding on all structured tool responses
- `@blackwell-systems/gcf` as optional peer dependency (install separately)
- Rollup config handles the optional import with external module resolution
- Runtime detection with actionable error messages when the package is missing
- Merged after thorough review by Google Chrome DevTools maintainers

## OmniRoute

[OmniRoute](https://github.com/diegosouzapw/OmniRoute) is an AI gateway, registry, and proxy that sits between AI clients and model providers, built by [Diego Souza](https://github.com/diegosouzapw). MCP servers, A2A agents, REST/gRPC APIs: everything flows through it with centralized discovery, guardrails, rate limiting, auth, and observability. 6.1K stars.

GCF's generic profile encoder is vendored directly into OmniRoute's headroom compression engine, replacing their custom `omni-tabular` encoder. Zero new dependencies added. This is GCF's first infrastructure-layer integration: a gateway that every request passes through.

The previous encoder only handled homogeneous arrays with uniform column types. GCF handles heterogeneous arrays, mixed-type columns, and nested objects natively, increasing payload coverage from ~60% to 100%.

- **55-62% savings** on homogeneous arrays (was 38-48%)
- **42% savings** on heterogeneous arrays (was 0%, previous encoder couldn't handle them)
- **47% savings** on nested objects (was 7%)
- 100% payload coverage, all round-trips lossless
- 44 tests passing, full backward compatibility with existing encoded content
- OmniRoute rejected TOON because it required an npm dependency. GCF's zero-dep TypeScript source was vendored directly.

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

[NetClaw](https://github.com/automateyournetwork/netclaw) is an AI-powered network automation platform with 113 skills and 66 MCP integrations, built by [John Capobianco](https://github.com/automateyournetwork) (Head of AI and DevRel at Itential, Google Developer Expert). It automates network engineering workflows across Cisco, Juniper, Arista, Palo Alto, F5, AWS, and dozens of other platforms, with live BGP/OSPF control-plane participation, gNMI streaming telemetry, ITSM gating, and immutable audit trails. 556 stars.

NetClaw previously used TOON for token optimization across its MCP servers. After benchmarking GCF against TOON on NetClaw's actual network data payloads, the project replaced TOON entirely. This was the first external project to switch from TOON to GCF.

Network data is a strong fit for GCF's generic profile. BGP peer tables, routing tables, interface lists, OSPF neighbor sessions, and Azure NSG rule sets are all arrays of uniform objects with 10-15 fields repeated across 50-500+ rows. TOON's YAML-style key-value encoding reduces some overhead, but still repeats key names on every record. GCF's positional encoding with inline schemas eliminates that repetition entirely.

The integration was surgical: all TOON serialization flowed through a single `serialize_response()` function in the shared `netclaw_tokens` library. Replacing `toon.dumps(data)` with `gcf.encode_generic(data)` and swapping the dependency from `toon-format` to `gcf-python` was the entire change. Every MCP server in NetClaw benefited automatically with no per-server modifications.

- **55.8% savings vs JSON**, 13.6% fewer tokens than TOON, wins 19/25 matchups
- **36% fewer tokens than TOON on interface data**: GCF handles mixed-type fields (IP address lists, MAC addresses, VLAN IDs) more efficiently because positional encoding doesn't care about value type or length
- Benchmarked with cl100k_base tokenizer on 5 network data types at 10, 50, 100, 200, and 500 rows each
- JSON fallback on any encode error preserves reliability

## ctx

[ctx](https://github.com/stevesolun/ctx) solves a problem every Claude Code user hits: there are 91K+ skills, 467 agents, and 10K+ MCP servers in the ecosystem, and loading them all wastes your context window on tools you're not using. Built by [Steve Solun](https://github.com/stevesolun), ctx watches your repo in real time, detects what stack you're working in (sees `.tsx` files, detects React; sees `sqlalchemy`, detects Postgres), then queries a 102,928-node knowledge graph with 2.9M edges to recommend only the 5-15 tools relevant to your current task. Nothing loads without your approval. It also detects stale tools you installed months ago and flags them for removal. 510 stars.

Every ctx recommendation, graph query, and wiki search result lands directly in the LLM context window. These payloads are arrays of uniform objects (5-25 results with 6-17 fields each) where JSON repeats every field name on every record. GCF's positional encoding eliminates that repetition, cutting the token cost of every tool response roughly in half.

ctx has four MCP tool response methods that benefit: `recommend_bundle` returns scored skill/agent/MCP recommendations with 17 fields per result. `graph_query` returns graph traversal results with shared tags and connection paths. `wiki_search` returns entity pages with descriptions, excerpts, and metadata. `wiki_get` returns full entity pages with frontmatter and body text.

GCF encoding is opt-in per tool call via `output_format: "gcf"` in the tool arguments. JSON remains the default to preserve compatibility with ctx's internal consumers (`api.py`, `mcp_server.py`). The maintainer reviewed the proof-of-concept integration and implemented his own adapter following the same opt-in design.

- **51.5% savings vs JSON** overall, up to **57.8%** on recommendation bundles at 25 results
- `graph_query`: **57.6% fewer tokens** at 25 results
- `wiki_search`: **42.4% fewer tokens** at 15 results
- Available as optional extra: `pip install "claude-ctx[gcf]"`

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

## Speakeasy

[Speakeasy](https://github.com/speakeasy-api/openapi) builds API tooling for the OpenAPI ecosystem. Their `oq` CLI queries and transforms OpenAPI specifications from the command line.

GCF was added as a native output format (`--format gcf`) in [PR #216](https://github.com/speakeasy-api/openapi/pull/216). The Speakeasy team conducted a dependency audit of `gcf-go`, confirming no data is sent to third parties; all encoding happens in-memory.

- `oq --format gcf` outputs OpenAPI query results in GCF
- Merged after thorough code review and dependency audit by Speakeasy maintainers
- Uses `github.com/blackwell-systems/gcf-go` v1.2.2
- Independent third-party adoption with full security review

## Raycast

[Raycast](https://raycast.com) is a productivity launcher for macOS with 7.5K stars on their extensions repo.

The [JSON to GCF Converter](https://raycast.com/blackwell-systems/json-to-gcf-converter) extension converts JSON data into GCF from the clipboard or selected text. Published to the Raycast Store.

- No-view command: copy JSON, run command, GCF on clipboard
- Uses `@blackwell-systems/gcf` npm package
- Approved by Raycast maintainers (Greptile 5/5 confidence score)

## Your project here

If you're using GCF in production, [open an issue](https://github.com/blackwell-systems/gcf/issues) to be listed here.
