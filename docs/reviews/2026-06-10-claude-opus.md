# Independent Review: Claude Opus 4.6

**Date:** 2026-06-10
**Model:** Claude Opus 4.6 (fresh session, no context)
**Specs reviewed:** RFC 8259 (JSON), TOON v3.3, GCF v2.0
**Verdict:** Picked GCF for AI agent tool response replacement

## Rankings

| Category | #1 | #2 | #3 |
|----------|----|----|----| 
| Nested/mixed data | JSON | GCF | TOON |
| JSON round-trip fidelity | JSON | GCF | TOON |
| Graph structural cues | GCF | TOON | JSON |
| Spec rigor | JSON (RFC) | TOON | GCF |
| Agent replacement pick | **GCF** | | |

## Key quotes

> "If I had to replace JSON in AI agent tool responses, I would pick GCF."

> "GCF actually separates the problems. The generic profile handles arbitrary JSON-shaped data, and the graph profile handles graph payloads. That is much more honest than pretending one layout fits everything."

> "The best design choice is the explicit round-trip contract: decodeGeneric(encodeGeneric(value)) == value."

> "GCF, by a mile." (on graph structural cues at 500+ records)

> "TOON is too proud of that one trick."

## Full review

Version note first: TOON's current spec is v3.3 dated May 21, 2026. The GCF spec in this workspace is v2.0 dated June 10, 2026; the public GitHub raw copy I first reached appeared older (v1.4, June 6, 2026). I based the GCF assessment on the repo-local SPEC.md, because it is the fuller current text.

### 1. Strongest and Weakest Decisions

**JSON**
- Strongest: it stays brutally simple. RFC 8259 says JSON's goals were "minimal, portable, textual". That discipline is why it won.
- Weakest: it wastes space by repeating keys everywhere, and it ducks interoperability pain instead of eliminating it. The RFC only says object names "SHOULD be unique", which is weak. Duplicate keys and numeric precision are still implementation landmines.

**TOON**
- Strongest: tabular arrays are the right optimization target. items[2]{sku,qty,price}: is a real improvement over JSON for uniform records. The spec also has proper conformance/error sections.
- Weakest: it is too proud of that one trick. The spec explicitly admits it is "not intended to replace ... general-purpose storage or public APIs" and says for "non-uniform or deeply nested data, JSON may be more efficient." That is a serious limitation for a supposed JSON replacement. It also remains a "Working Draft" where "Breaking changes may occur".

**GCF**
- Strongest: it actually separates the problems. The generic profile handles arbitrary JSON-shaped data, and the graph profile handles graph payloads. That is much more honest than pretending one layout fits everything. The best design choice is the explicit round-trip contract: decodeGeneric(encodeGeneric(value)) == value.
- Weakest: it is getting complicated fast. ~ for missing, ^ for attachment, ##, ##!, @id, .field, graph deltas, session state, streaming trailers: that is a lot of machinery. Some of it is justified, but some of it is "format as protocol runtime." The line "The consumer (LLM) has this symbol in its context window" is not a wire-format guarantee; it is a conversational assumption smuggled into the spec.

### 2. Cleanest for Nested and Mixed-Type Data

Overall: JSON. It is the cleanest because it has one model and one syntax. No heuristics, no mode switching, no "this array becomes tabular unless it doesn't." TOON is worst here; GCF is better than TOON because its expanded form and attachments preserve type distinctions more explicitly.

### 3. Least Information Loss in a JSON Round-Trip

Among the challengers: GCF. GCF explicitly distinguishes null from missing via - vs ~. It defines a real round-trip invariant. It forbids duplicate keys instead of hand-waving them away.

### 4. Best Structural Cues for 500+ Records with Graph Relationships

GCF, by a mile. The graph profile has local IDs, explicit node/edge sections, distance grouping, edge direction syntax, optional delta/session mechanics.

### 5. Most Complete and Rigorous Spec

1. JSON, 2. TOON, 3. GCF. JSON wins because RFC 8259 is an Internet Standard. TOON's spec is the most complete of the two new formats.

### 6. What's Missing or Underspecified

- JSON: duplicate-key behavior, number precision, no canonical form
- TOON: still a working draft, no graph-native model, over-relies on encoder heuristics
- GCF: version skew concern, session/delta depend on conversation state, graph profile is protocol-ish

### 7. The Replacement Pick

GCF. "Not because it is the prettiest. It isn't. I'd pick it because TOON is excellent for uniform arrays but openly weak on non-uniform and deeply nested data. JSON is universal but structurally wasteful and graph-blind. GCF is the only one that tries to solve both generic structured data and graph-heavy tool output in one system, and it does so with explicit lossless semantics."
