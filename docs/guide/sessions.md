# Session Deduplication

In multi-turn LLM tool interactions, the same symbols appear across multiple responses. A code intelligence tool queried about `AuthMiddleware` will return it in the first response, and likely again in follow-up queries about related functions.

JSON retransmits the full declaration every time. GCF tracks what's been sent and replaces known symbols with bare references.

## The problem

Call 1: LLM asks "What calls AuthMiddleware?"
```
Response: 15 symbols, 8 edges → 2,100 tokens
```

Call 2: LLM asks "What does NewServer do?"
```
Response: 18 symbols (12 overlap with call 1), 10 edges → 2,400 tokens
```

Call 3: LLM asks "Show me the auth flow"
```
Response: 22 symbols (18 overlap), 14 edges → 2,800 tokens
```

With JSON, each response is a full retransmission. Total: 7,300 tokens.

## The solution: session state

With GCF sessions, previously-sent symbols become bare references:

```
@7  # previously transmitted
```

The LLM already has `@7` in its context window from the prior response. No need to resend the qualified name, kind, score, or provenance.

**Call 1:** Full declarations (same as non-session)
```
GCF profile=graph tool=context_for_task budget=5000 tokens=2100 symbols=15 edges=12
## targets
@0 fn pkg.AuthMiddleware 0.78 lsp_resolved
@1 fn pkg.ValidateToken 0.72 lsp_resolved
...
```

**Call 2:** 12 of 18 symbols are bare refs
```
GCF profile=graph tool=context_for_task budget=5000 tokens=800 symbols=18 edges=14 session=true
## targets
@0  # previously transmitted
@1  # previously transmitted
@2 fn pkg.NewServer 0.85 lsp_resolved
...
```

**Call 3:** 18 of 22 symbols are bare refs
```
GCF profile=graph tool=context_for_task budget=5000 tokens=400 symbols=22 edges=18 session=true
## targets
@0  # previously transmitted
@1  # previously transmitted
@2  # previously transmitted
@3 fn pkg.AuthFlow 0.91 lsp_resolved
...
```

Total with sessions: 3,300 tokens (vs 7,300 with JSON). **54.8% savings by call 3.**

By the 5th call in a typical session: **92.7% savings vs JSON.**

## How it works

1. Create a session when the conversation starts
2. After each encode, the session records which symbols were transmitted
3. On subsequent encodes, symbols already in the session become bare refs
4. The `session=true` header flag signals that bare refs are present

The session is server-side state. The LLM doesn't need to do anything special; it sees the full context from prior responses in its conversation window.

## Implementation

::: code-group

```python [Python]
from gcf import encode_with_session, Session, Payload, Symbol

sess = Session()

# First call: full declarations
out1 = encode_with_session(payload1, sess)

# Second call: overlapping symbols become bare refs
out2 = encode_with_session(payload2, sess)

# Check session state
print(sess.size())         # number of tracked symbols
print(sess.transmitted("pkg.Auth"))  # True/False
sess.reset()               # clear for new conversation
```

```typescript [TypeScript]
import { encodeWithSession, Session } from '@blackwell-systems/gcf';

const sess = new Session();

// First call: full declarations
const out1 = encodeWithSession(payload1, sess);

// Second call: overlapping symbols become bare refs
const out2 = encodeWithSession(payload2, sess);

// Check session state
console.log(sess.size());
console.log(sess.transmitted('pkg.Auth'));
sess.reset();
```

```go [Go]
sess := gcf.NewSession()

// First call: full declarations
out1 := gcf.EncodeWithSession(payload1, sess)

// Second call: overlapping symbols become bare refs
out2 := gcf.EncodeWithSession(payload2, sess)

// Check session state
fmt.Println(sess.Size())
fmt.Println(sess.Transmitted("pkg.Auth"))
sess.Reset()
```

:::

## Thread safety

The Session type is thread-safe in all implementations:
- Go: `sync.Mutex`
- Python: `threading.Lock`
- TypeScript: single-threaded (safe by default)

Multiple tool handlers can encode concurrently within the same session.

## When to use sessions

- **MCP servers** with multi-turn conversations (the primary use case)
- **Chat-based tools** where the LLM makes sequential queries
- **Any interaction** where the same symbols appear across multiple responses

## When NOT to use sessions

- Single-shot tool calls (no prior context to reference)
- Different users or conversations (don't share sessions across contexts)
- When the LLM's context window has been truncated (bare refs to symbols outside the window will confuse the model)

## Token savings curve

| Call # | New symbols | Bare refs | Tokens saved vs JSON |
|--------|------------|-----------|---------------------|
| 1 | 100% | 0% | 84% (base GCF savings) |
| 2 | 35% | 65% | 89% |
| 3 | 20% | 80% | 91% |
| 4 | 12% | 88% | 92.2% |
| 5 | 8% | 92% | 92.7% |

The savings compound because code graphs have high locality: related queries tend to traverse overlapping neighborhoods.
