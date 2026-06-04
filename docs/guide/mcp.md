# MCP Integration

GCF is a wire format for [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) tool interactions. Tools encode responses in GCF to deliver more context per token budget. LLMs can also produce GCF output for agent-to-agent communication and structured returns (see [LLM Integration](/guide/llm-integration)).

## Why MCP tools need GCF

MCP tools return results that the LLM must understand within its context window. The context window is finite. Every token spent on structural overhead (JSON field names, delimiters, repeated identifiers) is a token that can't be spent on actual content.

For a code intelligence tool returning 50 symbols with edges:
- JSON: ~12,000 tokens
- GCF: ~1,900 tokens

That's 10,000 tokens freed for additional context, longer conversations, or more tool calls.

## Basic integration

### 1. Encode your tool response as GCF

::: code-group

```python [Python MCP Server]
from gcf import encode, Payload, Symbol, Edge

def handle_context_for_task(task_description: str) -> str:
    # Your retrieval logic produces symbols and edges
    symbols, edges = retrieve_context(task_description)
    
    payload = Payload(
        tool="context_for_task",
        token_budget=request.budget,
        tokens_used=estimate_tokens(symbols),
        pack_root=compute_hash(symbols, edges),
        symbols=symbols,
        edges=edges,
    )
    
    return encode(payload)
```

```typescript [TypeScript MCP Server]
import { encode, type Payload } from '@blackwell-systems/gcf';

function handleContextForTask(taskDescription: string): string {
  const { symbols, edges } = retrieveContext(taskDescription);
  
  const payload: Payload = {
    tool: 'context_for_task',
    tokenBudget: request.budget,
    tokensUsed: estimateTokens(symbols),
    packRoot: computeHash(symbols, edges),
    symbols,
    edges,
  };
  
  return encode(payload);
}
```

```go [Go MCP Server]
func handleContextForTask(taskDescription string) string {
    symbols, edges := retrieveContext(taskDescription)
    
    payload := &gcf.Payload{
        Tool:        "context_for_task",
        TokenBudget: request.Budget,
        TokensUsed:  estimateTokens(symbols),
        PackRoot:    computeHash(symbols, edges),
        Symbols:     symbols,
        Edges:       edges,
    }
    
    return gcf.Encode(payload)
}
```

:::

### 2. Return GCF as the tool response content

The MCP tool response is a string. Return the GCF-encoded output as the content:

```json
{
  "content": [
    {
      "type": "text",
      "text": "GCF tool=context_for_task budget=5000 tokens=1847 symbols=10 pack_root=a1b2c3\n## targets\n@0 fn pkg.Auth 0.78 lsp\n..."
    }
  ]
}
```

The LLM receives the GCF payload as text content and parses it naturally.

## Session integration

For multi-turn MCP interactions, maintain a session per conversation:

```python
from gcf import encode_with_session, Session

# One session per conversation (store in your session manager)
sessions: dict[str, Session] = {}

def handle_tool_call(conversation_id: str, request) -> str:
    if conversation_id not in sessions:
        sessions[conversation_id] = Session()
    
    sess = sessions[conversation_id]
    payload = build_payload(request)
    
    # Previously-sent symbols become bare refs automatically
    return encode_with_session(payload, sess)
```

## Delta integration

For re-queries where the context changed slightly:

```python
from gcf import encode, encode_delta, DeltaPayload

def handle_tool_call(request) -> str:
    current_payload = build_payload(request)
    current_root = compute_hash(current_payload)
    
    # Client sends back pack_root from prior response
    if request.pack_root:
        if request.pack_root == current_root:
            # Nothing changed
            return f"unchanged pack_root={current_root} symbols={len(current_payload.symbols)}"
        
        prior = load_prior_payload(request.pack_root)
        if prior:
            # Compute diff
            delta = compute_delta(prior, current_payload)
            return encode_delta(delta)
    
    # No prior root or unknown root: full payload
    return encode(current_payload)
```

## Content type negotiation

If your MCP server supports multiple formats, let the client specify preference via tool parameters:

```json
{
  "name": "context_for_task",
  "arguments": {
    "task": "implement auth middleware",
    "format": "gcf",
    "budget": 5000,
    "pack_root": "a1b2c3d4"
  }
}
```

Fallback to JSON for clients that don't support GCF.

## Production example: knowing

The [knowing](https://github.com/blackwell-systems/knowing) MCP server uses GCF as its primary output format across 28 tools. Key patterns:

- `context_for_task`: GCF with session dedup (multi-turn code exploration)
- `context_for_pr`: GCF with delta encoding (re-queries as PR evolves)
- `blast_radius`: GCF with edges showing caller/callee relationships
- `communities`: GCF with distance-based grouping (cluster topology)

Session dedup is enabled by default. Delta encoding activates when the client sends a `pack_root` from a prior response.
