# MCP Proxy (Zero-Code Adoption)

gcf-proxy wraps any existing MCP server and re-encodes JSON tool responses as GCF. Your server keeps outputting JSON. The LLM receives GCF. Zero code changes.

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

**Before:**

```json
{
  "mcpServers": {
    "my-server": {
      "command": "my-mcp-server",
      "args": ["--port", "8080"]
    }
  }
}
```

**After:**

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

That's it. The proxy spawns your server as a subprocess and sits between it and the client.

## What happens

```
Client (LLM)  ←──  GCF  ←──  gcf-proxy  ←──  JSON  ←──  Your Server
              ──→  stdin ──→             ──→  stdin  ──→
```

1. Client sends requests to gcf-proxy via stdin (unchanged)
2. gcf-proxy forwards them to your server via stdin (unchanged)
3. Your server responds with JSON via stdout (unchanged)
4. gcf-proxy intercepts JSON-RPC responses containing tool results
5. If the `text` content is structured JSON, it re-encodes as GCF
6. Client receives GCF instead of JSON

Non-convertible responses (plain text, HTML, errors) pass through untouched.

## What gets converted

The proxy looks for JSON-RPC responses with `result.content[].text` fields containing JSON objects. If the JSON has structured data (objects, arrays), it's converted to GCF. Specifically:

- **JSON with `tool` + `symbols` fields**: encoded with the graph profile (local IDs, edges, distance groups)
- **Any other structured JSON**: encoded with the tabular profile (pipe-separated rows, section headers)
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
GCF tool=context_for_task budget=10000 tokens=3200 symbols=10
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
## edges
@0<@3 calls
@1<@0 calls
@6<@1 references
@5<@4 references
@2<@3 references
@7<@0 implements
```

63% fewer tokens. Same information. Zero code changes.

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
| You want to test GCF savings without code changes | Proxy |
| You control the server and want session dedup/delta | Library (`encode`) |
| You want maximum control over encoding | Library |
| You want zero-effort adoption | Proxy |

The proxy gives you the baseline GCF savings (positional encoding, tabular rows) without session dedup or delta encoding. For those features, use the [GCF libraries](/ecosystem/implementations) directly.

## Links

- [GitHub](https://github.com/blackwell-systems/gcf-proxy)
- [PyPI](https://pypi.org/project/gcf-proxy/)
- [npm](https://www.npmjs.com/package/@blackwell-systems/gcf-proxy)
