# Independent Review: Claude Opus 4.6 (updated spec)

**Date:** 2026-06-10
**Model:** Claude Opus 4.6 (fresh session, no context)
**Specs reviewed:** RFC 8259 (JSON), TOON v3.3, GCF v2.0 (with Section 2.3.1 and 16.5 headings)
**Verdict:** Picked GCF generic profile for AI agent tool response replacement
**Note:** This is the updated review after spec headings were added. Claude flipped spec rigor to "GCF's spec is more rigorous."

## Rankings

| Category | Winner |
|----------|--------|
| Nested/mixed data | **GCF** ("clearly") |
| JSON round-trip fidelity | **GCF** |
| Graph at scale (500+) | **GCF** ("by a wide margin") |
| Spec rigor | **GCF** (more rigorous) / TOON (more complete in certain areas) |
| Agent replacement pick | **GCF** |

## Key quotes

> "I'd pick GCF's generic profile."

> "The decisive factor is nested data handling. TOON's tabular form breaks down exactly where it matters most."

> "GCF's ^ attachment mechanism solves this cleanly."

> "GCF's spec is more rigorous. TOON's spec is more complete in certain areas."

> "GCF, by a wide margin." (on graph structural cues)

> "The ^ attachment mechanism for nested values in tabular rows is the most important design difference between GCF and TOON."

> "TOON's own benchmark data confirms this. On the 'E-commerce orders with nested structures' dataset, TOON uses 7,458 tokens vs JSON-compact's 7,110. TOON is larger than compact JSON on nested data."

## Spec rigor nuance

Unlike GPT (which gave TOON spec rigor) and previous Claude review (which gave TOON spec rigor), this review split the category:

GCF advantages cited:
- Formal ABNF grammar in a single consolidated block (Section 4)
- 30 explicitly enumerated strict-mode error conditions in 4 categories (Section 16.5)
- Explicit implementation limits (Section 12)
- Separated conformance checklists by profile (Sections 16.1-16.4)
- Round-trip invariant formally stated with equality semantics (Section 1.1)

TOON advantages cited:
- Key folding/path expansion
- Delimiter flexibility
- Parameterized encoder/decoder options

Also noted: "TOON is still a 'Working Draft'. GCF is 'Stable' (v2.0). This matters for implementers."

## GCF criticisms

- Dual-profile design dilutes positioning as general JSON replacement
- Graph profile is domain-specific (code intelligence)
- No delimiter flexibility (| and , are fixed)
- No key folding/path expansion
- Strict-only decoder is a risk for LLM-generated output
- Graph profile clutters the spec for general-purpose use

## TOON criticisms (using TOON's own data)

- "No nested-value support in tabular form. This is the biggest gap."
- "TOON is larger than compact JSON on nested data" (citing TOON's own benchmarks)
- No streaming mode
- No graph/relational primitives
- No format identification header (relies on heuristic first-line parsing)
- null keyword verbose vs GCF's -
- No absent/missing distinction
- Still a Working Draft with possible breaking changes

## Reservations about GCF

1. TOON's community-driven approach (separate spec from implementation) is healthy
2. Graph profile should be its own document
3. Strict-only decoder is a risk for LLM-generated output
4. TOON is simpler to learn
5. Neither format has won adoption outside its creator's ecosystem yet

## Full review

### 1. Strongest and Weakest Design Decisions

| Format | Strongest | Weakest |
|--------|-----------|---------|
| JSON | Universal self-description. Every value carries its own type marker. Most robust for partial parsing and error recovery. | No array-length declaration. Repeated field names. 500 rows x 10 fields = 5,000 repeated keys. |
| TOON | Delimiter flexibility. Each array header can declare comma, tab, or pipe. Minimizes quoting for data containing delimiters. | No nested/mixed-type data in tabular rows. Spec explicitly forbids it (Section 9.3). Falls back to YAML-style expanded lists. |
| GCF | The ^ attachment mechanism for nested values in tabular rows (Section 7.4.4). The most important design difference between GCF and TOON. | Dual-profile design. Graph profile is tightly coupled to code intelligence. Dilutes positioning as general JSON replacement. |

### 2. Nested and Mixed-Type Data

Winner: GCF, clearly. The attachment mechanism is the decisive factor. TOON cannot use tabular form because values aren't all primitives. Falls back to expanded list items, repeating every key per record, just like JSON.

### 3. JSON Round-Trip Fidelity

Winner: GCF. Preserves -0 (TOON normalizes it away). Null/missing/absent distinction is cleaner. Round-trip invariant stated more precisely. TOON's -0 to 0 normalization is a deliberate lossy choice.

### 4. Graph at Scale

Winner: GCF, by a wide margin. Distance-based grouping, local IDs, session statefulness, delta encoding, counts in headers. 79% fewer tokens than JSON at 500 symbols is plausible.

### 5. Spec Rigor

GCF more rigorous (ABNF, 30 strict errors, implementation limits, conformance checklists, round-trip invariant). TOON more complete in certain areas (key folding, delimiter flexibility, parameterized options).

### 6. What's Missing

- JSON: no streaming, no schema, no comments
- TOON: no nested tabular, no streaming, no graph primitives, no format header, no null/absent distinction
- GCF: no delimiter flexibility, no key folding, no lenient mode, graph profile is domain-specific

### 7. The Replacement Pick

GCF generic profile. "The decisive factor is nested data handling. Real-world tool responses almost always contain some nesting. TOON's tabular form breaks down exactly where it matters most. GCF's ^ attachment mechanism solves this cleanly."

"Bottom line: GCF's generic profile is the technically superior design for mixed-structure data. TOON is simpler and more approachable but falls apart on nesting. If your payloads are flat tabular data, TOON is fine. If your payloads have any structural complexity, GCF wins on both token efficiency and round-trip fidelity. If you're doing code intelligence specifically, GCF's graph profile is in a category of its own."
