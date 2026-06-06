# Implementations

Six official implementations, all production-ready, all MIT licensed, all zero runtime dependencies. Validated against [56 conformance fixtures](https://github.com/blackwell-systems/gcf/tree/main/tests/conformance).

## Official Implementations

| Language | Package | Install | Registry | Status |
|----------|---------|---------|----------|--------|
| Go | `gcf-go` | `go get github.com/blackwell-systems/gcf-go` | [pkg.go.dev](https://pkg.go.dev/github.com/blackwell-systems/gcf-go) | Stable |
| TypeScript | `@blackwell-systems/gcf` | `npm install @blackwell-systems/gcf` | [npm](https://www.npmjs.com/package/@blackwell-systems/gcf) | Stable |
| Python | `gcf-python` | `pip install gcf-python` | [PyPI](https://pypi.org/project/gcf-python/) | Stable |
| Rust | `gcf` | `cargo add gcf` | [crates.io](https://crates.io/crates/gcf) | Stable |
| Swift | `GCF` | `.package(url: "https://github.com/blackwell-systems/gcf-swift", from: "0.2.0")` | [GitHub](https://github.com/blackwell-systems/gcf-swift) | Stable |
| Kotlin | `gcf` | `implementation("com.github.blackwell-systems:gcf-kotlin:0.2.0")` | [JitPack](https://jitpack.io/#blackwell-systems/gcf-kotlin) | Stable |

All six support both encoding profiles:

| Feature | Go | TypeScript | Python | Rust | Swift | Kotlin |
|---------|:--:|:----------:|:------:|:----:|:-----:|:------:|
| Graph encode (`encode`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Graph decode (`decode`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Generic encode (`encodeGeneric`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Session deduplication | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Delta encoding | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Thread-safe Session | ✓ | n/a | ✓ | ✓ | ✓ | ✓ |
| CLI | ✓ | ✓ | ✓ | — | — | — |
| | | | | |
| **GitHub** | [gcf-go](https://github.com/blackwell-systems/gcf-go) | [gcf-typescript](https://github.com/blackwell-systems/gcf-typescript) | [gcf-python](https://github.com/blackwell-systems/gcf-python) | [gcf-rust](https://github.com/blackwell-systems/gcf-rust) | [gcf-swift](https://github.com/blackwell-systems/gcf-swift) | [gcf-kotlin](https://github.com/blackwell-systems/gcf-kotlin) |
| **Registry** | [pkg.go.dev](https://pkg.go.dev/github.com/blackwell-systems/gcf-go) | [npm](https://www.npmjs.com/package/@blackwell-systems/gcf) | [PyPI](https://pypi.org/project/gcf-python/) | [crates.io](https://crates.io/crates/gcf) | [SPM](https://github.com/blackwell-systems/gcf-swift) | [JitPack](https://jitpack.io/#blackwell-systems/gcf-kotlin) |
| **API Docs** | [Go API](/reference/api-go) | [TypeScript API](/reference/api-typescript) | [Python API](/reference/api-python) | [Rust API](/reference/api-rust) | [Swift API](/reference/api-swift) | [Kotlin API](/reference/api-kotlin) |

## MCP Proxy

Drop-in wrapper for any existing MCP server. Zero code changes required.

```bash
pip install gcf-proxy          # PyPI
npm install -g @blackwell-systems/gcf-proxy   # npm
go install github.com/blackwell-systems/gcf-proxy@latest   # Go
```

```json
{"mcpServers": {"yours": {"command": "gcf-proxy", "args": ["your-mcp-server"]}}}
```

Your server keeps outputting JSON. The LLM receives GCF. [Full setup guide](/guide/proxy).

[GitHub](https://github.com/blackwell-systems/gcf-proxy) · [PyPI](https://pypi.org/project/gcf-proxy/) · [npm](https://www.npmjs.com/package/@blackwell-systems/gcf-proxy)

## Output compatibility

All implementations produce byte-for-byte identical output for the same input. The format is the product, not the implementation. Token efficiency numbers are independent of which library you use.

## Community Implementations

| Language | Repository | Maintainer | Status |
|----------|-----------|------------|--------|
| | *Your implementation here* | | |

Building an implementation? [See the contribution guide.](https://github.com/blackwell-systems/gcf/blob/main/CONTRIBUTING.md) Validate against the [56 conformance fixtures](https://github.com/blackwell-systems/gcf/tree/main/tests/conformance), then PR a link here.
