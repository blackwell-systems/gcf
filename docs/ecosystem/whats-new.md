# What's New

Curated highlights of notable GCF releases, newest first. For the current version of
every package see [Implementations](/ecosystem/implementations); for the full notes on any
release see the [GitHub releases](https://github.com/blackwell-systems/gcf/releases).

The spec has grown **additively since v3.0** with no breaking changes: a v3.0 decoder
ignores anything it does not recognize.

**Current ecosystem:** Spec **v3.5.3** · **7 SDKs** (Go **v1.7.0**, Rust **v3.0.0**, Swift **v2.7.0**, Python **v2.6.0**, TS/Kotlin **v2.6.0**, .NET **v0.2.0**) · gcf-proxy **v0.11.4** · tree-sitter-gcf **v1.4.0** · 279 conformance fixtures.

## v3.5.3 — int64 numeric domain

_2026-08-14_

The canonical numeric domain is now specified (SPEC 2.3.2): signed `int64` for integers, IEEE-754 double for non-integers. Across all seven SDKs, decoders and encoders reject a value outside `int64` with an out-of-range error rather than following the host numeric type for integers beyond the double-exact range (2^53); values beyond `int64` (unsigned-64 identifiers, exact decimals) are modeled as strings. Canonical formatting renders a double at or above 2^53 in exponent notation. Rust's `encode_generic` becomes fallible (returns `Result`, a major); the other SDKs are non-breaking. TypeScript adds a `largeInt` decode option for the JavaScript 2^53 boundary.

- [Release notes](https://github.com/blackwell-systems/gcf/releases/tag/v3.5.3)

## v3.5.1 — Score-rounding errata, and a .NET SDK

_2026-08-09_

- **Spec errata (§5):** the graph score's two-decimal wire form is now pinned to **round-half-to-even**
  on the exact IEEE-754 double. The rounding mode was previously unspecified, so implementations diverged
  at exact binary midpoints (`0.125` → `0.12`, not `0.13`) between the printf-family SDKs and the
  round-half-up ones (JavaScript, Kotlin). TypeScript and Kotlin were corrected; a new conformance fixture
  locks it. A clarification, not a grammar change: correct decoders are unaffected.
- GCF now has a first-party **.NET** implementation, [gcf-dotnet](https://github.com/blackwell-systems/gcf-dotnet)
  (NuGet `BlackwellSystems.Gcf`), bringing the SDK count to seven. **Zero runtime dependencies**,
  multi-targeting `netstandard2.0` and `net8.0`, so it runs on .NET Framework 4.6.1+, Mono, Unity,
  and modern .NET.
- Full parity with the other SDKs: generic and graph profiles, delta encoding (both profiles),
  session deduplication, streaming, and the re-anchor session helper. Passes the complete
  cross-SDK conformance suite, so it round-trips byte-identically to the Go, TypeScript, Python,
  Rust, Swift, and Kotlin implementations.
- [Release notes](https://github.com/blackwell-systems/gcf/releases/tag/v3.5.1)

## v3.5.0 — Keyed-tabular map encoding

_2026-08-07_

- A JSON object whose values are uniform objects (an id-keyed map: config by flag,
  metrics by host, a service registry, a cache) now encodes as a keyed table (Spec §7.2a):
  the shared fields are declared once and each entry is one positional row prefixed by its
  key. Lossless, key-order preserving, and first-class in nested, streaming, and delta positions.
- On realistic map shapes this is about **29% fewer tokens than minified JSON**, consistent
  across 42 production tokenizers (23% to 56% per tokenizer).
- Also folded in: negative zero canonicalizes to `0` (Spec §2.3.1), the buffered graph header
  omits zero-valued `budget`/`tokens`/`edges` (Spec §3.2), and structural delimiters are matched
  at the Unicode scalar level (Spec §1).
- Hardening (SDKs v2.5.1, Go v1.6.1, Swift v2.6.0): decoders now reject a declared `[N]` section
  count that does not match the actual item count, in both directions (Spec §13), backed by a new
  cross-SDK mutation-decoder fuzz that feeds every SDK malformed wire round-trip testing cannot reach.
- Shipped across all six SDKs, tree-sitter-gcf v1.4.0, and gcf-proxy v0.11.4.
- [Release notes](https://github.com/blackwell-systems/gcf/releases/tag/v3.5.0)

## v3.4.1 — Graph delta verification

_2026-07-13_

- A graph delta's `## added` lines now carry a trailing `distance` field, so a consumer
  can reconstruct the new snapshot and verify `new_root` end to end (Spec §10.1, §10.4).
- Shipped across all six SDKs (Go v1.5.0, the other five v2.4.0), tree-sitter-gcf v1.3.3,
  and gcf-proxy v0.11.3.
- [Release notes](https://github.com/blackwell-systems/gcf/releases/tag/v3.4.1)

## v3.4.0 — Labeled streaming trailer + decoder hardening

_2026-07-13_

- Optional labeled `counts` form for the graph streaming trailer (Spec §8.4.1), a
  producer-side comprehension aid. The default positional form is unchanged.
- Decoder hardening and a conformance coverage matrix across all implementations.
- [Release notes](https://github.com/blackwell-systems/gcf/releases/tag/v3.4.0)

## v3.3.0 — Delta encoding for the generic profile

_2026-07-12_

- Delta encoding, previously graph-only, now works for the **generic profile** (Spec
  §10a): a keyed diff with an `@id` identity column and `## added` / `## changed` /
  `## removed` sections, content-addressed by `pack_root`. Delta is now a both-profile
  capability. See the [Delta guide](/guide/delta).
- [Release notes](https://github.com/blackwell-systems/gcf/releases/tag/v3.3.0)

## v3.2.0 — Nested-object flattening

_2026-06-23_

- Nested objects flatten into `>` path columns (Spec §7.4.6), so records with sub-objects
  stay positional instead of falling back to a less efficient encoding.
- [Release notes](https://github.com/blackwell-systems/gcf/releases/tag/v3.2.0)

## v3.1.0 — Optional graph `tool` field

_2026-06-14_

- The graph header's `tool` field became optional.
- [Release notes](https://github.com/blackwell-systems/gcf/releases/tag/v3.1.0)

## v3.0.0 — Inline schema encoding

_2026-06-13_

- The v3 generic profile foundation: inline object schemas encode nested objects
  positionally, shared array schemas omit repeated field headers.
- [Release notes](https://github.com/blackwell-systems/gcf/releases/tag/v3.0.0)

---

This page tracks highlights only, updated at each release. For per-commit history, see the
[GitHub releases](https://github.com/blackwell-systems/gcf/releases) and each package's
`CHANGELOG`.
