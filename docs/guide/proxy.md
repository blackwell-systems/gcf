# MCP Proxy (Zero-Code Adoption)

gcf-proxy is a bidirectional proxy that translates between JSON and GCF for any MCP server, local or remote. Your server keeps outputting JSON. The LLM receives GCF. If the LLM produces GCF, the server receives JSON. Zero code changes on either side.

## Install

```bash
pip install gcf-proxy          # PyPI
npm install -g @blackwell-systems/gcf-proxy   # npm
go install github.com/blackwell-systems/gcf-proxy@latest   # Go
```

## Setup (one line change)

Find your MCP config. It's usually in one of these places:

| Client | Config location |
|--------|----------------|
| Claude Code | `~/.claude/settings.json` or project `.claude/settings.json` |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) |
| VS Code (Copilot) | `.vscode/mcp.json` |
| Cursor | `.cursor/mcp.json` |

### Local server (stdio)

Add `gcf-proxy` in front of your server command:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "gcf-proxy",
      "args": ["my-mcp-server", "--port", "8080"]
    }
  }
}
```

The proxy spawns your server as a subprocess and sits between it and the client.

### Remote server (HTTP)

Point `--upstream` at any Streamable HTTP MCP server:

```json
{
  "mcpServers": {
    "remote": {
      "command": "gcf-proxy",
      "args": ["--upstream", "http://host:3000/mcp"]
    }
  }
}
```

The proxy connects over HTTP, translates responses to GCF, and handles SSE streaming from the upstream. Session ID tracking via `Mcp-Session-Id` header is automatic.

## What happens

The proxy translates in both directions:

```
Responses:  Your Server (JSON) ──→ gcf-proxy encodes ──→ LLM reads GCF   (79% input savings)
Requests:   LLM writes GCF    ──→ gcf-proxy decodes ──→ Your Server (JSON) (63% output savings)
```

**Encode direction** (responses):
1. Your server responds with JSON via stdout (unchanged)
2. gcf-proxy intercepts JSON-RPC responses containing tool results
3. If the `text` content is structured JSON, it re-encodes as GCF
4. Client receives GCF instead of JSON

**Decode direction** (requests):
1. Client sends a tool call with GCF strings in arguments
2. gcf-proxy detects the `GCF ` prefix (4-byte check, zero overhead)
3. GCF strings are decoded to JSON objects inline
4. Your server receives JSON, never sees GCF

Non-convertible content (plain text, HTML, errors, non-GCF strings) passes through untouched in both directions. Neither the server nor the client needs to know about GCF.

## What gets converted

The proxy looks for JSON-RPC responses with `result.content[].text` fields containing JSON objects. If the JSON has structured data (objects, arrays), it's converted to GCF. Specifically:

- **JSON with `tool` + `symbols` fields**: encoded with the graph profile (local IDs, edges, distance groups)
- **Any other structured JSON**: encoded with the generic profile (pipe-separated rows, section headers)
- **Plain text, HTML, markdown**: passed through unchanged

## Before and after

**Your server outputs (JSON, 2,506 bytes):**

```json
{"tool":"context_for_task","tokenBudget":10000,"tokensUsed":3200,
"symbols":[{"qualifiedName":"github.com/org/repo/pkg.AuthMiddleware",
"kind":"function","score":0.92,"provenance":"lsp_resolved","distance":0},
...10 symbols, 8 edges...]}
```

**The LLM receives (GCF, 916 bytes):**

```
GCF profile=graph tool=context_for_task budget=10000 tokens=3200 symbols=10 edges=6
## targets
@0 fn github.com/org/repo/pkg.AuthMiddleware 0.92 lsp_resolved
@1 fn github.com/org/repo/pkg.ValidateToken 0.87 lsp_resolved
@2 type github.com/org/repo/pkg.AuthConfig 0.71 ast_inferred
## related
@3 fn github.com/org/repo/pkg.NewServer 0.65 lsp_resolved
@4 method github.com/org/repo/pkg.Server.Start 0.58 lsp_resolved
@5 type github.com/org/repo/pkg.Router 0.52 ast_inferred
## extended
@6 type github.com/org/repo/internal.TokenCache 0.41 structural
@7 iface github.com/org/repo/internal.Logger 0.35 structural
## edges [6]
@0<@3 calls
@1<@0 calls
@6<@1 references
@5<@4 references
@2<@3 references
@7<@0 implements
```

63% fewer tokens. Same information. Zero code changes.

## Streaming progress (large payloads)

When a client sends a `progressToken` with a tool call and the response contains a large graph payload (5+ symbols by default), the proxy streams GCF fragments via MCP progress notifications:

```
Client                    Proxy                     Upstream
  |--tools/call----------->|--forward--------------->|
  |  progressToken: "abc"  |                         |
  |                        |<--JSON response (50 sym)|
  |                        |                         |
  |<--progress(5/50)-------|  "## targets\n@0 fn..." |
  |<--progress(10/50)------|  "@5 fn...\n@6..."      |
  |<--progress(50/50)------|  "##! summary..."       |
  |                        |                         |
  |<--tools/call result----|  complete GCF payload   |
```

The LLM gets the first symbols in its context within milliseconds. Without `progressToken`, the proxy behaves as before (no streaming, backward compatible).

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--stream-threshold N` | 5 | Min symbols before streaming activates |
| `--no-progress` | false | Disable progress notifications entirely |

## Test it

Run the built-in savings test:

```bash
git clone https://github.com/blackwell-systems/gcf-proxy
cd gcf-proxy && bash test.sh
```

This spins up a mock MCP server, pipes a realistic payload through the proxy, and shows the token savings.

## Troubleshooting

**"command not found: gcf-proxy"**

The binary isn't on your PATH. If you installed via pip, make sure your Python scripts directory is on PATH. If you installed via npm, make sure your global npm bin is on PATH. Try:

```bash
which gcf-proxy          # should show a path
gcf-proxy --help         # should show usage
```

**Server works without proxy but hangs with proxy**

The proxy buffers stdout line by line. If your server doesn't flush stdout after each JSON-RPC response, the proxy will hang waiting for a complete line. Make sure your server flushes after each write.

**Responses pass through unconverted**

The proxy only converts `text` content blocks in JSON-RPC responses that contain valid JSON objects or arrays. If your tool returns plain text, markdown, or HTML, it passes through unchanged. This is intentional.

## When to use the proxy vs the library

| Scenario | Use |
|----------|-----|
| You can't modify the server (third-party binary) | Proxy |
| Server is remote (Streamable HTTP) | Proxy (`--upstream`) |
| You want to test GCF savings without code changes | Proxy |
| You control the server and want session dedup/delta | Library (`encode`) |
| You want maximum control over encoding | Library |
| You want zero-effort adoption | Proxy |

The proxy gives you bidirectional GCF translation (both input and output token savings) on local and remote servers, plus streaming progress on large payloads. For session dedup and delta encoding, use the [GCF libraries](/ecosystem/implementations) directly.

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Streaming progress (stdio) | Done | Progress notifications with GCF fragments |
| 2. Bidirectional translation | Done | GCF in tool call arguments decoded to JSON for the server |
| 3. HTTP backend | Done | `--upstream` connects to remote MCP servers over HTTP |
| 4. Session dedup | Done | `--session` deduplicates symbols across calls (40% savings proven e2e) |
| 5. HTTP/SSE frontend | Planned | Proxy becomes a Streamable HTTP server (`--http :9090`) |
| 6. Production hardening | Planned | Graceful shutdown, metrics, resume support |

Phase 5 will upgrade any stdio MCP server into a remote Streamable HTTP service with SSE streaming. No upstream changes needed.

## Links

- [GitHub](https://github.com/blackwell-systems/gcf-proxy)
- [Roadmap](https://github.com/blackwell-systems/gcf-proxy/blob/main/ROADMAP.md)
- [PyPI](https://pypi.org/project/gcf-proxy/)
- [npm](https://www.npmjs.com/package/@blackwell-systems/gcf-proxy)
