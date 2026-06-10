# Independent AI Reviews of GCF vs TOON vs JSON

Three major AI models were given the same prompt with no context, no priming, and no system instructions. Each was asked to review the full specifications for JSON (RFC 8259), TOON (v3.3), and GCF (v2.0), then answer 7 critical questions about design, correctness, and suitability for AI agent workloads.

**All three independently chose GCF.**

## Scorecard

| Category | Claude Opus 4.6 | Gemini | GPT |
|----------|-----------------|--------|-----|
| Nested/mixed data | **GCF** | **GCF** | **GCF** |
| JSON round-trip fidelity | **GCF** | **GCF** | **GCF** |
| Graph at scale (500+) | **GCF** | **GCF** | **GCF** |
| Spec rigor | **GCF** | **GCF** | TOON |
| **Replacement pick** | **GCF** | **GCF** | **GCF** |

GCF unanimous on: round-trip fidelity, graph at scale, and the replacement question.

## Selected quotes

### On choosing GCF

> "I'd pick GCF's generic profile. The decisive factor is nested data handling. TOON's tabular form breaks down exactly where it matters most. GCF's ^ attachment mechanism solves this cleanly."
> -- Claude Opus 4.6

> "For AI agent tool responses, GCF is the clear choice. AI interactions are frequently stateful and involve navigating relationships."
> -- Gemini

> "I would pick GCF. It is the only one here that materially improves both generic structured payloads and graph-heavy payloads."
> -- GPT

### On GCF's design

> "The ^ attachment mechanism for nested values in tabular rows is the most important design difference between GCF and TOON."
> -- Claude Opus 4.6

> "GCF's Attachment system uses the ^ marker to keep 90% of a record in a dense, positional row while surgically handling 'weird' nested objects only where they occur."
> -- Gemini

> "It states an actual round-trip invariant instead of hand-waving."
> -- GPT

### On GCF's spec quality

> "The GCF SPEC.md is far more rigorous than TOON's documentation."
> -- Gemini

> "GCF v2.0 is much better than a typical vanity format spec."
> -- GPT

> "30 explicitly enumerated strict-mode error conditions in Section 16.5, organized into 4 categories."
> -- Claude Opus 4.6

### On graph data

> "GCF, by a mile."
> -- Claude Opus 4.6, Gemini, and GPT (independently, same words)

> "GCF is in a category of its own."
> -- Claude Opus 4.6

> "TOON and JSON are structurally unfit for large graphs."
> -- Gemini

### On TOON's limitations

> "TOON's tabular form breaks down exactly where it matters most, because it cannot represent nested values in tabular rows."
> -- Claude Opus 4.6

> "TOON is larger than compact JSON on nested data."
> -- Claude Opus 4.6, citing TOON's own benchmark data

> "TOON is too proud of that one trick."
> -- Claude Opus 4.6 (first review)

> "TOON is excellent for uniform arrays but openly weak on non-uniform and deeply nested data."
> -- GPT

> "TOON falls apart exactly where real tool payloads get ugly."
> -- GPT

### Bottom lines

> "JSON is for humans/legacy; TOON is for simple tables; GCF is the professional wire format for LLM-centric systems."
> -- Gemini

> "Best standard: JSON. Best spec among challengers: TOON. Best design for actual AI tool payloads: GCF."
> -- GPT

> "GCF's generic profile is the technically superior design for mixed-structure data. If your payloads have any structural complexity, GCF wins on both token efficiency and round-trip fidelity."
> -- Claude Opus 4.6

## Methodology

- **Prompt**: identical across all three models (7 structured questions about design decisions, nested data, round-trip fidelity, graph support, spec rigor, gaps, and replacement pick)
- **Context**: fresh sessions with no system prompt, no prior conversation, no priming
- **Specs**: models fetched specs directly from GitHub (RFC 8259, TOON v3.3, GCF v2.0)
- **Date**: 2026-06-10

## Full reviews

- [Claude Opus 4.6](2026-06-10-claude-opus-v2.md)
- [Gemini](2026-06-10-gemini-v2.md)
- [GPT](2026-06-10-gpt.md)
