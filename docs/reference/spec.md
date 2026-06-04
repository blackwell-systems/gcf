# Specification

The full GCF specification lives in [SPEC.md](https://github.com/blackwell-systems/gcf/blob/main/SPEC.md) at the repository root.

It covers:

1. **Overview** (two profiles, design goals)
2. **Grammar** (EBNF, both graph and tabular profiles)
3. **Header fields** (required and optional, graph profile)
4. **Node line format** (positional encoding, graph profile)
5. **Edge line format** (local ID references, graph profile)
6. **Group headers** (distance-based sections, graph profile)
6a. **Tabular encoding** (generic profile: arrays of objects, nested records, pipe-separated rows)
7. **Session statefulness** (bare reference protocol)
8. **Delta encoding extension** (three-outcome protocol)
9. **Comments**
10. **Token savings analysis** (both graph and tabular profiles)
11. **Design constraints** (text-only, line-oriented, deterministic, shallow nesting)
12. **Conformance** (encoder and decoder checklists for both profiles)
13. **Security considerations** (injection, memory, sanitization)
14. **MIME type** (`application/vnd.gcf+text`, file extension `.gcf`)
15. **Versioning** (GCF, GCF2, GCF3, ...)
16. **Intellectual property** (MIT, no patents)

## Version

Current: **GCF v1.1** (stable, 2026-06-04)

## Conventions

The specification uses [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) keywords (MUST, SHOULD, MAY) to define normative requirements for encoders and decoders.

## Profiles

GCF supports two encoding profiles that share the same grammar primitives (`##` headers, `@` IDs, positional fields):

- **Graph profile** (Sections 3-6): Encodes code graph payloads (symbols, edges, distance groups) for MCP tool responses.
- **Tabular profile** (Section 6a): Encodes arbitrary structured data (arrays of objects, nested records, mixed types) using positional rows and pipe separators.

Implementations MAY support one or both profiles.

## Conformance

The specification defines conformance checklists for:

- **Graph encoder** (Section 12.1): header format, ID assignment, score formatting, edge validation, determinism
- **Tabular encoder** (Section 12.2): header counts, pipe separators, positional encoding, null handling
- **Graph decoder** (Section 12.3): header parsing, node/edge parsing, kind expansion, error handling
- **Tabular decoder** (Section 12.4): header parsing, row splitting, field validation

## Stability guarantee

The v1.1 format is stable. Existing payloads will always parse correctly with future decoders. New features (if any) will be additive and backwards-compatible.
