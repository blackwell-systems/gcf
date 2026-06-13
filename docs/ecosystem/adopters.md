# Who Uses GCF

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

## Open Data Products SDK (Linux Foundation)

[Open Data Products SDK](https://opendataproducts.org/sdk/) is a Python toolkit and MCP server for working with data product standards under the Linux Foundation. It validates, generates, and publishes Open Data Product specifications.

- GCF sidecars for ODPC and ODPG workflows (agent-ready graph context)
- Packed for agent prompts and review automation
- Status: experimental integration

## Your project here

If you're using GCF in production, [open an issue](https://github.com/blackwell-systems/gcf/issues) to be listed here.
