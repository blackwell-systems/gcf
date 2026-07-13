# What's New

Curated highlights of notable GCF releases, newest first. For the current version of
every package see [Implementations](/ecosystem/implementations); for the full notes on any
release see the [GitHub releases](https://github.com/blackwell-systems/gcf/releases).

The spec has grown **additively since v3.0** with no breaking changes: a v3.0 decoder
ignores anything it does not recognize.

**Current ecosystem:** Spec **v3.4.1** · SDKs **v2.4.0** (Go **v1.5.0**) · gcf-proxy
**v0.11.3** · tree-sitter-gcf **v1.3.3** · 204 conformance fixtures.

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
