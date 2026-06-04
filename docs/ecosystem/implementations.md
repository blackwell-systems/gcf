# Implementations

Three official implementations, all production-ready, all MIT licensed, all zero runtime dependencies.

## Go

```bash
go get github.com/blackwell-systems/gcf-go
```

| Feature | Status |
|---------|--------|
| Encode | ✓ |
| Decode | ✓ |
| Session deduplication | ✓ |
| Delta encoding | ✓ |
| Thread-safe Session | ✓ (sync.Mutex) |
| Tests | 100% coverage |

Repository: [blackwell-systems/gcf-go](https://github.com/blackwell-systems/gcf-go)

## TypeScript

```bash
npm install @blackwell-systems/gcf
```

| Feature | Status |
|---------|--------|
| Encode | ✓ |
| Decode | ✓ |
| Session deduplication | ✓ |
| Delta encoding | ✓ |
| ESM module | ✓ |
| Tests | 34 passing |

Repository: [blackwell-systems/gcf-typescript](https://github.com/blackwell-systems/gcf-typescript)

## Python

```bash
pip install gcf-python
```

| Feature | Status |
|---------|--------|
| Encode | ✓ |
| Decode | ✓ |
| Session deduplication | ✓ |
| Delta encoding | ✓ |
| Thread-safe Session | ✓ (threading.Lock) |
| Type hints | ✓ (full coverage) |
| Python 3.9+ | ✓ |
| Tests | 43 passing |

Repository: [blackwell-systems/gcf-python](https://github.com/blackwell-systems/gcf-python)

## Output compatibility

All three implementations produce byte-for-byte identical output for the same input. The format is the product, not the implementation. Token efficiency numbers are independent of which library you use.

## Contributing an implementation

GCF is simple enough to implement in a weekend. The spec is 229 lines of EBNF + prose. If you're building an implementation:

1. Start with Encode (most useful, simplest)
2. Add Decode (needed for testing)
3. Add Session (needed for production MCP servers)
4. Add Delta (needed for high-frequency re-queries)

Test against the [comprehension eval](https://github.com/blackwell-systems/gcf-go/tree/main/eval) to verify your output is LLM-comprehensible at scale.

## MCP Proxy

Don't want to modify your server? Use [gcf-proxy](https://github.com/blackwell-systems/gcf-proxy) as a transparent wrapper:

```bash
go install github.com/blackwell-systems/gcf-proxy@latest
```

```json
{"mcpServers": {"yours": {"command": "gcf-proxy", "args": ["your-mcp-server"]}}}
```

Zero code changes. JSON responses are re-encoded as GCF mid-flight.
