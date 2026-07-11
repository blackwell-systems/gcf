# Implementations

Six official implementations, all MIT licensed and zero runtime dependencies. The current spec v3.2 contract is defined by [177 conformance fixtures](https://github.com/blackwell-systems/gcf/tree/main/tests/conformance). All six implementations pass 177/177 with 43B+ combined round-trips verified.

## Official Implementations

| Language | Package | Install | Registry | Status |
|----------|---------|---------|----------|--------|
| Go | `gcf-go` | `go get github.com/blackwell-systems/gcf-go@v1.3.2` | [pkg.go.dev](https://pkg.go.dev/github.com/blackwell-systems/gcf-go) | v1.3.2 · 177/177 · 1B+ RT |
| TypeScript | `@blackwell-systems/gcf` | `npm install @blackwell-systems/gcf@2.2.3` | [npm](https://www.npmjs.com/package/@blackwell-systems/gcf) | v2.2.3 · 177/177 · 20M RT |
| Python | `gcf-python` | `pip install gcf-python==2.2.2` | [PyPI](https://pypi.org/project/gcf-python/) | v2.2.2 · 177/177 · 10M RT |
| Rust | `gcf` | `cargo add gcf@2.2.2` | [crates.io](https://crates.io/crates/gcf) | v2.2.2 · 177/177 · 43B+ RT |
| Swift | `GCF` | `.package(url: "https://github.com/blackwell-systems/gcf-swift", from: "2.2.2")` | [GitHub](https://github.com/blackwell-systems/gcf-swift) | v2.2.2 · 177/177 · 20M RT |
| Kotlin | `gcf` | `implementation("com.github.blackwell-systems:gcf-kotlin:2.2.2")` | [JitPack](https://jitpack.io/#blackwell-systems/gcf-kotlin) | v2.2.2 · 177/177 · 10M RT |

All six support both encoding profiles:

| Feature | Go | TypeScript | Python | Rust | Swift | Kotlin |
|---------|:--:|:----------:|:------:|:----:|:-----:|:------:|
| Graph encode (`encode`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Graph decode (`decode`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Generic encode (`encodeGeneric`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Generic decode (`decodeGeneric`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Session deduplication | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Delta encoding | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Flatten opt-out (`noFlatten`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
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

| Editor | Install | Source |
|--------|---------|--------|
| VS Code | [Marketplace](https://marketplace.visualstudio.com/items?itemName=blackwell-systems.gcf) | [gcf-vscode](https://github.com/blackwell-systems/gcf-vscode) |
| JetBrains | [Marketplace](https://plugins.jetbrains.com/plugin/gcf) | [gcf-jetbrains](https://github.com/blackwell-systems/gcf-jetbrains) |
| Neovim, Helix, Zed | tree-sitter | [tree-sitter-gcf](https://github.com/blackwell-systems/tree-sitter-gcf) |

## Output compatibility

All implementations produce byte-for-byte identical output for the same input. The format is the product, not the implementation. Token efficiency numbers are independent of which library you use.

## Community Implementations

| Language | Repository | Maintainer | Status |
|----------|-----------|------------|--------|
| | *Your implementation here* | | |

Building an implementation? [See the contribution guide.](https://github.com/blackwell-systems/gcf/blob/main/CONTRIBUTING.md) Validate against the [177 conformance fixtures](https://github.com/blackwell-systems/gcf/tree/main/tests/conformance), then PR a link here.
