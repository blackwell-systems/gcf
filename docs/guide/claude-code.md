# Claude Code Plugin

One-command install to save 71% on MCP tool call tokens in Claude Code.

## Install

```bash
/plugin install blackwell-systems/gcf-claude-plugin
```

## What it does

The plugin adds two skills and a stats hook:

| Component | Description |
|-----------|-------------|
| `/gcf-proxy:setup <server>` | Wrap any MCP server with gcf-proxy |
| `/gcf-proxy:stats` | Show token savings for the current session |
| Stop hook | Notification after each turn showing calls rewritten and tokens saved |

## Quick start

After installing, wrap any MCP server:

```
/gcf-proxy:setup github
```

This modifies your MCP config to route the server through gcf-proxy. The original config is preserved (disabled, with a `-raw` suffix) so you can revert anytime.

## How the savings work

1. **First call (71% savings):** GCF encodes the same structured data in 71% fewer tokens than JSON. The model reads GCF natively with 100% comprehension accuracy.

2. **Subsequent calls (up to 92%):** Session deduplication detects repeated structure across tool calls. Only deltas are transmitted. By the 5th call, token usage drops to 8% of JSON.

3. **Zero code changes:** The proxy wraps any MCP server. The server still outputs JSON; the proxy re-encodes before it reaches the model.

## Session stats

The plugin writes stats to `/tmp/gcf-proxy-stats.json` after each tool call rewrite. The Stop hook reads this and shows a notification:

```
gcf-proxy: 12 tool calls rewritten, 68% fewer tokens (~4.2K tokens saved)
```

Disable the notification anytime via `/hooks` in Claude Code.

## Links

- [Plugin repository](https://github.com/blackwell-systems/gcf-claude-plugin)
- [GCF Proxy](https://github.com/blackwell-systems/gcf-proxy)
- [Cost Calculator](/calculator)
