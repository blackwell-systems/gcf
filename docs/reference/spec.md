# Specification

The full GCF specification lives in [SPEC.md](https://github.com/blackwell-systems/gcf/blob/main/SPEC.md) at the repository root.

It covers:

- **Normative References** (RFC 2119, RFC 5234)
- **Terminology and Conventions** (MUST/SHALL/SHOULD/MAY semantics)

1. **Overview** (two profiles, design goals)
2. **Common scalar and key grammar**
3. **Header fields**
4. **Formal grammar and indentation**
5-6a. **Graph profile** (nodes, edges, group headers)
7. **Generic profile** (tabular encoding, inline object schemas, shared attachment schemas, expanded arrays)
8. **Streaming encoding extension**
9. **Session statefulness**
10. **Delta encoding extension**
11-13. **Comments, implementation limits, and count validation**
14-15. **Token analysis and design constraints**
16. **Conformance** (encoder/decoder checklists and strict error taxonomy)
17-21. **Security, MIME type, versioning, internationalization, and intellectual property**

## Version

Current: **GCF v3.0** (stable, 2026-06-12)

## Conventions

The specification uses [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) keywords (MUST, SHOULD, MAY) to define normative requirements for encoders and decoders.

## Profiles

GCF supports two encoding profiles that share the same grammar primitives (`##` headers, positional fields). The graph profile adds `@` local IDs and edge notation:

- **Graph profile** (Sections 4-6a): Superset that adds local IDs, typed edges, and distance groups for relationship-heavy data (code intelligence, knowledge graphs, ontologies, agent memory).
- **Generic profile** (Section 7): Encodes arbitrary structured data using positional rows, inline object schemas, shared array schemas, and expanded forms.

Implementations MAY support one or both profiles. All six official implementations (Go, TypeScript, Python, Rust, Swift, Kotlin) support both.

## Conformance

The specification defines conformance requirements in three areas:

**Encoder checklists:**
- Graph encoder (Section 16.1): header format, ID assignment, score formatting, edge validation, determinism
- Generic encoder (Section 16.2): container selection, positional attachments, schema reuse, null handling, and quoting

**Decoder checklists:**
- Graph decoder (Section 16.3): header parsing, node/edge parsing, kind expansion, error handling
- Generic decoder (Section 16.4): scalar parsing, inline attachment matching, shared schemas, and field validation

**Decoder error taxonomy** (Section 16.5): normative conditions that decoders MUST reject, including invalid headers, orphan attachments, width mismatches, and unterminated quotes.

Conformance fixtures live in [tests/conformance](https://github.com/blackwell-systems/gcf/tree/main/tests/conformance).

## Stability guarantee

**Stable** (v3.0 designated 2026-06-12). V3 is the only supported encoding. No backwards compatibility with v2 indented attachments. The graph profile and `GCF profile=generic` header are unchanged.
