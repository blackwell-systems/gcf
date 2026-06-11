# Implementations

Six official implementations, all MIT licensed and zero runtime dependencies. The current v2 contract is defined by [141 conformance fixtures](https://github.com/blackwell-systems/gcf/tree/main/tests/conformance); implementation v2 conformance must be reported independently during migration.

## Official Implementations

| Language | Package | Install | Registry | Status |
|----------|---------|---------|----------|--------|
| Go | `gcf-go` | `go get github.com/blackwell-systems/gcf-go` | [pkg.go.dev](https://pkg.go.dev/github.com/blackwell-systems/gcf-go) | Stable |
| TypeScript | `@blackwell-systems/gcf` | `npm install @blackwell-systems/gcf` | [npm](https://www.npmjs.com/package/@blackwell-systems/gcf) | Stable |
| Python | `gcf-python` | `pip install gcf-python` | [PyPI](https://pypi.org/project/gcf-python/) | Stable |
| Rust | `gcf` | `cargo add gcf` | [crates.io](https://crates.io/crates/gcf) | Stable |
| Swift | `GCF` | `.package(url: "https://github.com/blackwell-systems/gcf-swift", from: "1.0.0")` | [GitHub](https://github.com/blackwell-systems/gcf-swift) | Stable |
| Kotlin | `gcf` | `implementation("com.github.blackwell-systems:gcf-kotlin:1.0.0")` | [JitPack](https://jitpack.io/#blackwell-systems/gcf-kotlin) | Stable |

All six support both encoding profiles:

| Feature | Go | TypeScript | Python | Rust | Swift | Kotlin |
|---------|:--:|:----------:|:------:|:----:|:-----:|:------:|
| Graph encode (`encode`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Graph decode (`decode`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Generic encode (`encodeGeneric`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Generic decode (`decodeGeneric`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Session deduplication | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Delta encoding | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Streaming encode (`StreamEncoder`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Thread-safe Session | ✓ | n/a | ✓ | ✓ | ✓ | ✓ |
| CLI | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| | | | | |
| **GitHub** | [gcf-go](https://github.com/blackwell-systems/gcf-go) | [gcf-typescript](https://github.com/blackwell-systems/gcf-typescript) | [gcf-python](https://github.com/blackwell-systems/gcf-python) | [gcf-rust](https://github.com/blackwell-systems/gcf-rust) | [gcf-swift](https://github.com/blackwell-systems/gcf-swift) | [gcf-kotlin](https://github.com/blackwell-systems/gcf-kotlin) |
| **Registry** | [pkg.go.dev](https://pkg.go.dev/github.com/blackwell-systems/gcf-go) | [npm](https://www.npmjs.com/package/@blackwell-systems/gcf) | [PyPI](https://pypi.org/project/gcf-python/) | [crates.io](https://crates.io/crates/gcf) | [SPM](https://github.com/blackwell-systems/gcf-swift) | [JitPack](https://jitpack.io/#blackwell-systems/gcf-kotlin) |
| **API Docs** | [Go API](/reference/api-go) | [TypeScript API](/reference/api-typescript) | [Python API](/reference/api-python) | [Rust API](/reference/api-rust) | [Swift API](/reference/api-swift) | [Kotlin API](/reference/api-kotlin) |

## MCP Proxy

Bidirectional proxy for any MCP server: local or remote, stdio or HTTP. Zero code changes required. Session dedup, streaming progress, and HTTP/SSE frontend built in.

```bash
pip install gcf-proxy          # PyPI
npm install -g @blackwell-systems/gcf-proxy   # npm
go install github.com/blackwell-systems/gcf-proxy@latest   # Go
```

```bash
gcf-proxy your-mcp-server                                   # local stdio
gcf-proxy --upstream http://host:3000/mcp                    # remote HTTP
gcf-proxy --http :9090 --session your-mcp-server             # deploy as HTTP service
```

Your server keeps outputting JSON. The LLM receives GCF. [Full setup guide](/guide/proxy).

[GitHub](https://github.com/blackwell-systems/gcf-proxy) · [PyPI](https://pypi.org/project/gcf-proxy/) · [npm](https://www.npmjs.com/package/@blackwell-systems/gcf-proxy)

## Editor Support

Syntax highlighting for GCF files via [tree-sitter](https://github.com/blackwell-systems/tree-sitter-gcf). Supports Neovim, Helix, Zed, and any tree-sitter-compatible editor.

```bash
npm install tree-sitter-gcf
```

[GitHub](https://github.com/blackwell-systems/tree-sitter-gcf) · [npm](https://www.npmjs.com/package/tree-sitter-gcf)

## Output compatibility

All implementations produce byte-for-byte identical output for the same input. The format is the product, not the implementation. Token efficiency numbers are independent of which library you use.

## Community Implementations

| Language | Repository | Maintainer | Status |
|----------|-----------|------------|--------|
| | *Your implementation here* | | |

Building an implementation? [See the contribution guide.](https://github.com/blackwell-systems/gcf/blob/main/CONTRIBUTING.md) Validate against the [141 v2 conformance fixtures](https://github.com/blackwell-systems/gcf/tree/main/tests/conformance), then PR a link here.
