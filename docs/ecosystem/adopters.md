# Who Uses GCF

## NeuroNest

[NeuroNest](https://github.com/NETGVai/NeuroNest) is an agent-first IDE built by [Network Guardian](https://netgv.ai). First independent commercial adoption of GCF.

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

[NetClaw](https://github.com/automateyournetwork/netclaw) is a CCIE-level AI network engineering coworker with 113 skills and 66 MCP integrations, built by [John Capobianco](https://github.com/automateyournetwork) (Head of AI and DevRel at Itential, Google Developer Expert). 556 stars.

NetClaw previously used TOON for token optimization across its MCP servers. After benchmarking GCF against TOON on NetClaw's actual network data payloads, the project replaced TOON entirely.

- Replaced TOON with GCF for all MCP server responses ([PR #67](https://github.com/automateyournetwork/netclaw/pull/67))
- **55.8% token savings vs JSON** (13.6% fewer tokens than TOON)
- GCF wins 19/25 head-to-head matchups against TOON
- On interface data specifically: **36% fewer tokens than TOON** due to GCF's positional encoding handling mixed-type fields (IP lists, MAC addresses) more efficiently
- Benchmarked on 5 network data types at 10-500 rows each: BGP peers, route tables, interfaces, OSPF neighbors, NSG rules
- Drop-in swap: `serialize_response()` API unchanged, all MCP servers benefit automatically
- Uses `gcf-python` via shared `netclaw_tokens` library with JSON fallback on any encode error
- First external TOON-to-GCF conversion

## ctx

[ctx](https://github.com/stevesolun/ctx) is a context budget manager for Claude Code, built by [Steve Solun](https://github.com/stevesolun). It walks a 102,928-node knowledge graph across 91K+ skills, 467 agents, and 10K+ MCP servers to recommend the right 5-15 tools per session. 510 stars.

Every ctx recommendation, graph query, and wiki search result lands directly in the LLM context window. GCF encoding eliminates repeated field names across these structured payloads.

- GCF encoding for all 4 MCP tool response methods: `recommend_bundle`, `graph_query`, `wiki_search`, `wiki_get`
- **51.5% token savings vs JSON** across all tool response payloads
- `recommend_bundle` at 25 results: **57.8% fewer tokens**
- `graph_query` at 25 results: **57.6% fewer tokens**
- `wiki_search` at 15 results: **42.4% fewer tokens**
- GCF is opt-in via `output_format: "gcf"` tool argument; JSON remains the default
- `gcf-python` available as optional extra: `pip install "claude-ctx[gcf]"`
- Maintainer implemented his own adapter ([PR #127](https://github.com/stevesolun/ctx/pull/127)) based on the proof-of-concept ([PR #126](https://github.com/stevesolun/ctx/pull/126))

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

## Your project here

If you're using GCF in production, [open an issue](https://github.com/blackwell-systems/gcf/issues) to be listed here.
