# Testing and Verification

GCF is tested in layers, each catching a different class of failure. This page is the map: it explains the overall strategy and links to the deep dives for each layer. The short version: a single normative spec defines the contract, one shared fixture set holds all six implementations to it byte-for-byte, and property, fuzz, and comprehension tests cover what fixtures cannot.

## Why layers

A wire format with six independent implementations has three distinct failure modes, and no single technique catches all of them:

1. **Divergence.** Two SDKs encode the same input differently. Caught by shared, byte-exact conformance fixtures.
2. **Loss.** An encode/decode round-trip changes the data. Caught by property and fuzz testing at scale.
3. **Illegibility.** The output is lossless but a model cannot read it. Caught by comprehension evaluations, a separate axis from correctness.

The layers below are ordered from the contract outward.

## The layers

### 1. The spec is the contract

[`SPEC.md`](https://github.com/blackwell-systems/gcf/blob/main/SPEC.md) is normative (RFC 2119 keywords). Section 16 defines the conformance requirements directly: the encoder checklists (16.1 graph, 16.2 generic), the decoder-accept checklists (16.3, 16.4), and the decoder error taxonomy (16.5) of conditions a decoder MUST reject. Everything downstream is derived from Section 16, never the other way around: fixtures are written to exercise a spec requirement, and SDKs are written to pass the fixtures. See [Spec-first is the rule](#spec-first-is-the-rule).

### 2. Shared conformance fixtures (cross-language, byte-exact)

The [`tests/conformance/`](https://github.com/blackwell-systems/gcf/tree/main/tests/conformance) directory holds **204 language-agnostic JSON fixtures** across 21 directories and 14 operations. Every SDK runs the same fixtures from the same directory:

- **Encode** fixtures require **byte-exact** output (both profiles). The generic profile additionally requires the deterministic input-order contract.
- **Decode** fixtures require **structural equality** for the graph profile.
- **Content addressing** (`pack_root`, `generic_pack_root`) requires **hash-exact** agreement across languages.
- **Error** fixtures (36 of them) require the decoder to reject a specific malformed input.

Because all six languages consume the identical bytes and are checked against the identical expected output, passing the suite is a proof of cross-language agreement, not just per-language correctness. This is the **6x6 matrix**: any of the six encoders paired with any of the six decoders produces the same result.

Each fixture carries an explicit `operation` field and follows the runner contract in [`tests/conformance/README.md`](https://github.com/blackwell-systems/gcf/blob/main/tests/conformance/README.md); a runner never infers direction from the shape of `input`/`expected`. Runners hard-fail on an unhandled operation rather than skipping it, so a capability gap surfaces as a failure instead of a silent pass.

### 3. Property and round-trip tests (per SDK)

Each SDK carries its own property and round-trip suite asserting the core invariant `decode(encode(value)) == value` over representative and generated values, plus decoder-hardening tests (malformed and truncated input must fail closed, never panic). These live in each language repo and run in that repo's CI on every commit.

### 4. Fuzz at scale (billions of round-trips)

The invariant is then verified against **43.27 billion+ random round-trips with zero failures** across five source formats (JSON, YAML, TOML, CSV, MessagePack). A seeded PRNG generates random structured values, serializes them through each format, parses them back, encodes as GCF, decodes, and deep-compares to the original. Seeds are sequential and deterministic, so any failure is reproducible. Full methodology, the per-format counts, reproduce commands, and edge-case coverage are in [Lossless Verification](/guide/lossless-verification).

### 5. Coverage-matrix ratchet (CI gate)

Fixtures are only meaningful if they cover the spec. [`scripts/coverage-matrix.mjs`](https://github.com/blackwell-systems/gcf/blob/main/scripts/coverage-matrix.mjs) generates [`tests/conformance/COVERAGE.md`](https://github.com/blackwell-systems/gcf/blob/main/tests/conformance/COVERAGE.md), which maps every fixture to the Section 16.5 taxonomy (currently **31/31 conditions covered**), the required operation set, and the Section 16.1 to 16.4 checklist (**0 gaps**). It also mechanically scans every fixture's expected output for encoder invariants (LF endings, no trailing whitespace, graph scores with exactly two decimals). The matrix **ratchets in CI**: a newly uncovered normative condition, a missing required operation, a stale allow-list entry, or an invariant violation fails the build. This is what keeps the fixture set honest as the spec grows.

### 6. Comprehension evaluations (a separate axis)

Losslessness proves a machine can round-trip the format. It does not prove a language model can read it. The [comprehension eval](https://github.com/blackwell-systems/gcf-go/tree/main/eval) measures that separately: it feeds encoded payloads to frontier and open models and scores whether they answer questions about the data correctly, with no format instructions. This axis motivated spec features (for example the optional labeled streaming trailer counts in 8.4.1) and is where format legibility, not just correctness, is validated.

## What each layer catches

| Layer | Primary failure class caught |
|---|---|
| Spec (Section 16) | Ambiguity: two readings of the same requirement |
| Conformance fixtures | Cross-language divergence; unhandled operations; specific rejection cases |
| Property / round-trip | Per-SDK loss and decoder panics |
| Fuzz at scale | Loss on rare value shapes no fixture enumerates |
| Coverage-matrix ratchet | Spec growth outrunning its fixtures; encoder-invariant drift |
| Comprehension eval | Lossless but illegible output |

## The conformance fixture set at a glance

Fixtures are grouped by the grammar area they exercise:

```
tests/conformance/
  scalar/ numbers/ keys/            generic scalar grammar
  containers/ arrays/ roots/        generic container grammar
  inline-schema/ flatten/           inline schemas and nested flattening
  attachments/ decode/              generic nested and decoder behavior
  graph-encode/ graph-decode/       graph profile
  graph-session/ graph-delta/       stateful graph behavior
  graph-pack-root/ generic-pack-root/  content addressing
  generic-delta/ generic-delta-session/  keyed generic delta
  streaming-v2/ whitespace/         streaming and input handling
  errors-v2/                        normative rejection cases (36)
```

The per-directory and per-operation counts, and each Section 16 requirement mapped to the fixtures that exercise it, are in [`COVERAGE.md`](https://github.com/blackwell-systems/gcf/blob/main/tests/conformance/COVERAGE.md).

## Running the tests

Every SDK repo runs the shared fixtures against its own `../gcf` checkout. New implementations follow the [contribution guide](https://github.com/blackwell-systems/gcf/blob/main/CONTRIBUTING.md), which covers running the conformance suite, adding fixtures, and the optional comprehension eval. Each language's exact command lives in that repo's README and CI workflow; the fixtures themselves are the same bytes for all of them.

## Spec-first is the rule

Changes land in a fixed order, never SDK-first:

1. Update `SPEC.md` (the contract).
2. Add or update the conformance fixtures that pin the new behavior.
3. Implement in the Go reference SDK.
4. Fan out to the other five SDKs.

This order is what makes the byte-exact guarantee hold. A change implemented in one SDK first would define correctness by that implementation rather than by the spec, and the other five would drift toward it.

## Deep dives

| Document | Scope |
|---|---|
| [`SPEC.md` Section 16](https://github.com/blackwell-systems/gcf/blob/main/SPEC.md) | The normative conformance requirements |
| [`COVERAGE.md`](https://github.com/blackwell-systems/gcf/blob/main/tests/conformance/COVERAGE.md) | Fixture-to-requirement coverage matrix (auto-generated, CI-ratcheted) |
| [Lossless Verification](/guide/lossless-verification) | Round-trip and fuzz methodology, per-format counts, reproduce commands |
| [`CONTRIBUTING.md`](https://github.com/blackwell-systems/gcf/blob/main/CONTRIBUTING.md) | How to run the suite, add fixtures, and run the comprehension eval |
