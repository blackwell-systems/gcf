# Specification

The full GCF specification lives in [SPEC.md](https://github.com/blackwell-systems/gcf/blob/main/SPEC.md) at the repository root.

It covers:

1. **Grammar** (EBNF)
2. **Header fields** (required and optional)
3. **Node line format** (positional encoding)
4. **Edge line format** (local ID references)
5. **Group headers** (distance-based sections)
6. **Kind abbreviations** (16 standard, extensible)
7. **Session statefulness** (bare reference protocol)
8. **Delta encoding extension** (three-outcome protocol)
9. **Comments**
10. **Token savings analysis** (per-source breakdown)
11. **Design constraints** (text-only, line-oriented, deterministic, no nesting)
12. **MIME type** (`application/vnd.gcf+text`)
13. **Versioning** (GCF, GCF2, GCF3, ...)

## Version

Current: **GCF v1.0** (stable, 2026-06-03)

## Stability guarantee

The v1.0 format is stable. Existing payloads will always parse correctly with future decoders. New features (if any) will be additive and backwards-compatible.
