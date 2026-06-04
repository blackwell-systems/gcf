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

[GitHub](https://github.com/blackwell-systems/gcf-go) · [pkg.go.dev](https://pkg.go.dev/github.com/blackwell-systems/gcf-go) · [CLI](https://github.com/blackwell-systems/gcf-go/tree/main/cmd/gcf)

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

[GitHub](https://github.com/blackwell-systems/gcf-typescript) · [npm](https://www.npmjs.com/package/@blackwell-systems/gcf) · [CLI](https://github.com/blackwell-systems/gcf-typescript#cli)

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

[GitHub](https://github.com/blackwell-systems/gcf-python) · [PyPI](https://pypi.org/project/gcf-python/) · [CLI](https://github.com/blackwell-systems/gcf-python#cli)

## MCP Proxy

Drop-in wrapper for any existing MCP server. Zero code changes required.

```bash
go install github.com/blackwell-systems/gcf-proxy@latest
```

```json
{"mcpServers": {"yours": {"command": "gcf-proxy", "args": ["your-mcp-server"]}}}
```

JSON responses are re-encoded as GCF mid-flight. Your server keeps outputting JSON; the LLM receives GCF.

[GitHub](https://github.com/blackwell-systems/gcf-proxy) · [pkg.go.dev](https://pkg.go.dev/github.com/blackwell-systems/gcf-proxy)

## Output compatibility

All three implementations produce byte-for-byte identical output for the same input. The format is the product, not the implementation. Token efficiency numbers are independent of which library you use.

## Contributing an implementation

GCF is simple enough to implement in a weekend. The spec is 229 lines of EBNF + prose. If you're building an implementation:

1. Start with Encode (most useful, simplest)
2. Add Decode (needed for testing)
3. Add Session (needed for production MCP servers)
4. Add Delta (needed for high-frequency re-queries)

Validate against the [conformance test suite](https://github.com/blackwell-systems/gcf/tree/main/tests/conformance) (14 fixtures across encode, decode, session, delta, and error cases). Test against the [comprehension eval](https://github.com/blackwell-systems/gcf-go/tree/main/eval) to verify your output is LLM-comprehensible at scale.
