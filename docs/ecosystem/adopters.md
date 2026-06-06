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

## Your project here

If you're using GCF in production, [open an issue](https://github.com/blackwell-systems/gcf/issues) to be listed here.
