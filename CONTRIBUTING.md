# Contributing to GCF

## Implement GCF in a new language

GCF is simple enough to implement in a weekend. The spec is ~480 lines. Here's how:

### 1. Pick a profile

- **Graph profile** (`encode`/`decode`): symbols, edges, distance groups, session dedup, delta encoding. Start here if you're building for MCP tool responses.
- **Tabular profile** (`encodeGeneric`): any structured data. Pipe-separated rows, section headers, key-value pairs. Start here if you want the broadest use case.
- **Both**: the official Go, TypeScript, and Python implementations support both.

### 2. Create your repo and implement

Create a new repository under your own GitHub account (e.g. `yourname/gcf-rust`, `yourname/gcf-java`). You own it. We link to it.

Start with `encode` (graph) or `encodeGeneric` (tabular). These are the most useful and simplest to implement.

Read the spec: [gcformat.com/reference/spec](https://gcformat.com/reference/spec.html) or [SPEC.md](SPEC.md).

Use the official implementations as reference:
- [gcf-go](https://github.com/blackwell-systems/gcf-go) (Go)
- [gcf-typescript](https://github.com/blackwell-systems/gcf-typescript) (TypeScript)
- [gcf-python](https://github.com/blackwell-systems/gcf-python) (Python)

### 3. Run the conformance tests

The `tests/conformance/` directory contains 29 language-agnostic JSON fixtures:

```
tests/conformance/
  encode/     8 fixtures   (graph profile)
  decode/     4 fixtures   (graph profile)
  session/    1 fixture    (graph profile)
  delta/      1 fixture    (graph profile)
  generic/   12 fixtures   (tabular profile)
  errors/     3 fixtures   (both profiles)
```

Each fixture is a JSON file with `input` and `expected` fields. Load the fixture, run your encoder/decoder, and compare output.

**Graph profile**: byte-exact matching on encode, structural equality on decode.

**Tabular profile**: byte-exact matching for languages with ordered maps (JS, Python). For languages with unordered maps (Go), validate structural correctness (correct headers, correct row counts, correct values) rather than byte-exact field order.

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
