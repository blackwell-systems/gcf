# Contributing to GCF

## Implement GCF in a new language

GCF is simple enough to implement in a weekend. The spec is ~480 lines. Here's how:

### 1. Pick a profile

- **Graph profile** (`encode`/`decode`): symbols, edges, distance groups, session dedup, delta encoding. Start here if you're building for MCP tool responses.
- **Tabular profile** (`encodeGeneric`): any structured data. Pipe-separated rows, section headers, key-value pairs. Start here if you want the broadest use case.
- **Both**: the official Go, TypeScript, Python, Rust, Swift, and Kotlin implementations support both.

### 2. Create your repo and implement

Create a new repository under your own GitHub account (e.g. `yourname/gcf-rust`, `yourname/gcf-java`). You own it. We link to it.

Start with `encode` (graph) or `encodeGeneric` (tabular). These are the most useful and simplest to implement.

Read the spec: [gcformat.com/reference/spec](https://gcformat.com/reference/spec.html) or [SPEC.md](SPEC.md).

Use the official implementations as reference:
- [gcf-go](https://github.com/blackwell-systems/gcf-go) (Go)
- [gcf-typescript](https://github.com/blackwell-systems/gcf-typescript) (TypeScript)
- [gcf-python](https://github.com/blackwell-systems/gcf-python) (Python)

### 3. Run the conformance tests

The `tests/conformance/` directory contains 133 language-agnostic JSON fixtures for GCF v2.0:

```
tests/conformance/
  scalar/, numbers/, keys/       generic scalar grammar
  containers/, arrays/, roots/   generic container grammar
  attachments/, decode/          generic nested and decoder behavior
  graph-encode/, graph-decode/   graph profile
  graph-session/, graph-delta/   stateful graph behavior
  streaming-v2/, whitespace/     streaming and input handling
  errors-v2/                     normative rejection cases
```

Each fixture has an explicit `operation` field. Follow the runner contract in `tests/conformance/README.md`; do not infer direction from the types of `input` and `expected`.

**Graph profile**: byte-exact matching on encode, structural equality on decode.

**Generic profile**: byte-exact matching on encode. Implementations MUST preserve the input object order required by the v2 deterministic encoding contract.

### 4. Open a PR

Add your implementation to `docs/ecosystem/implementations.md` with:
- Language
- Repository link
- Your name/handle as maintainer
- Status (stable, beta, in development)

Include a note on which profiles are supported and conformance test pass rate.

### 5. Optional: run the comprehension eval

The [comprehension eval](https://github.com/blackwell-systems/gcf-go/tree/main/eval) validates that your encoder's output is comprehensible to LLMs at 500 symbols. This is optional but strengthens your implementation's credibility.

## Report bugs

Open an issue on the relevant repo:

- Spec/docs/conformance: [github.com/blackwell-systems/gcf](https://github.com/blackwell-systems/gcf/issues)
- Go library: [github.com/blackwell-systems/gcf-go](https://github.com/blackwell-systems/gcf-go/issues)
- TypeScript library: [github.com/blackwell-systems/gcf-typescript](https://github.com/blackwell-systems/gcf-typescript/issues)
- Python library: [github.com/blackwell-systems/gcf-python](https://github.com/blackwell-systems/gcf-python/issues)
- MCP proxy: [github.com/blackwell-systems/gcf-proxy](https://github.com/blackwell-systems/gcf-proxy/issues)

## Add conformance fixtures

Add a JSON file to the appropriate `tests/conformance/` subdirectory. Run all three official implementations against it to confirm they agree on the output. Open a PR.

## Improve the docs

The docs site source is in `docs/`. It's VitePress. Run locally:

```bash
cd docs && pnpm install && pnpm docs:dev
```
