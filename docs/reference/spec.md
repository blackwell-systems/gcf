# Specification

The full GCF specification lives in [SPEC.md](https://github.com/blackwell-systems/gcf/blob/main/SPEC.md) at the repository root.

It covers:

1. **Grammar** (EBNF, both graph and tabular profiles)
2. **Header fields** (required and optional, graph profile)
3. **Node line format** (positional encoding, graph profile)
4. **Edge line format** (local ID references, graph profile)
5. **Group headers** (distance-based sections, graph profile)
6. **Kind abbreviations** (16 standard, extensible)
6a. **Tabular encoding** (generic profile: arrays of objects, nested records, pipe-separated rows)
7. **Session statefulness** (bare reference protocol)
8. **Delta encoding extension** (three-outcome protocol)
9. **Comments**
10. **Token savings analysis** (both graph and tabular profiles)
11. **Design constraints** (text-only, line-oriented, deterministic, shallow nesting)
12. **MIME type** (`application/vnd.gcf+text`)
13. **Versioning** (GCF, GCF2, GCF3, ...)

## Version

Current: **GCF v1.1** (stable, 2026-06-03)

## Profiles

GCF supports two encoding profiles that share the same grammar primitives (`##` headers, `@` IDs, positional fields):

- **Graph profile** (Sections 3-6): Encodes code graph payloads (symbols, edges, distance groups) for MCP tool responses.
- **Tabular profile** (Section 6a): Encodes arbitrary structured data (arrays of objects, nested records, mixed types) using positional rows and pipe separators.

Implementations may support one or both profiles.

## Stability guarantee

The v1.1 format is stable. Existing payloads will always parse correctly with future decoders. New features (if any) will be additive and backwards-compatible.
