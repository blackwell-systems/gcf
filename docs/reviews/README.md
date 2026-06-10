# Independent AI Reviews of GCF vs TOON vs JSON

Four major AI models were given the same prompt with no context, no priming, and no system instructions. Each was asked to review the full specifications for JSON (RFC 8259), TOON (v3.3), and GCF (v2.0), then answer 7 critical questions about design, correctness, and suitability for AI agent workloads.

**All four independently chose GCF.**

Codex initially reviewed the old v1.4 spec (cached GitHub raw URL) and ranked GCF last. When re-run against the local v2.0 spec, it flipped to GCF. Every v1.4 criticism had been addressed.

## Scorecard

| Category | Claude Opus 4.6 | Gemini | GPT | Codex |
|----------|-----------------|--------|-----|-------|
| Nested/mixed data | **GCF** | **GCF** | **GCF** | **GCF** |
| JSON round-trip fidelity | **GCF** | **GCF** | **GCF** | **GCF** |
| Graph at scale (500+) | **GCF** | **GCF** | **GCF** | **GCF** |
| Spec rigor (challengers) | **GCF** | **GCF** | TOON | **GCF** |
| **Replacement pick** | **GCF** | **GCF** | **GCF** | **GCF** |

GCF unanimous on: round-trip fidelity, graph at scale, and the replacement question.

## Selected quotes

### On choosing GCF

> "I'd pick GCF's generic profile. The decisive factor is nested data handling. TOON's tabular form breaks down exactly where it matters most. GCF's ^ attachment mechanism solves this cleanly."
> -- Claude Opus 4.6

> "For AI agent tool responses, GCF is the clear choice. AI interactions are frequently stateful and involve navigating relationships."
> -- Gemini

> "I would pick GCF. It is the only one here that materially improves both generic structured payloads and graph-heavy payloads."
> -- GPT

> "GCF wins because real tool responses are rarely perfectly flat."
> -- Codex

### On GCF's design

> "The ^ attachment mechanism for nested values in tabular rows is the most important design difference between GCF and TOON."
> -- Claude Opus 4.6

> "GCF's Attachment system uses the ^ marker to keep 90% of a record in a dense, positional row while surgically handling 'weird' nested objects only where they occur."
> -- Gemini

> "It states an actual round-trip invariant instead of hand-waving."
> -- GPT

> "The - versus ~ distinction correctly preserves explicit null versus an absent property."
> -- Codex

### On GCF's spec quality

> "The GCF SPEC.md is far more rigorous than TOON's documentation."
> -- Gemini

> "GCF v2.0 is much better than a typical vanity format spec."
> -- GPT

> "30 explicitly enumerated strict-mode error conditions in Section 16.5, organized into 4 categories."
> -- Claude Opus 4.6

> "GCF is more rigorous than TOON on paper."
> -- Codex

### On graph data

> "GCF, by a mile."
> -- Claude Opus 4.6, Gemini, and GPT (independently, same words)

> "GCF, by a huge margin."
> -- Codex

> "GCF is in a category of its own."
> -- Claude Opus 4.6

> "TOON and JSON are structurally unfit for large graphs."
> -- Gemini

> "For graph-heavy payloads, it is not close: GCF provides structural information TOON simply does not model."
> -- Codex

### On TOON's limitations

> "TOON is too proud of that one trick."
> -- Claude Opus 4.6

> "TOON's tabular form breaks down exactly where it matters most, because it cannot represent nested values in tabular rows."
> -- Claude Opus 4.6

> "TOON is larger than compact JSON on nested data."
> -- Claude Opus 4.6, citing TOON's own benchmark data

> "TOON is excellent for uniform arrays but openly weak on non-uniform and deeply nested data."
> -- GPT

> "TOON falls apart exactly where real tool payloads get ugly."
> -- GPT

> "TOON is a competent compact table format surrounded by an increasingly awkward attempt to become a general notation."
> -- Codex

> "Optional key folding is the worst design. Same bytes decode into different JSON structures."
> -- Codex

> "Configurable normalization, not a dependable round trip."
> -- Codex (on TOON's numeric policy)

### Bottom lines

> "JSON is for humans/legacy; TOON is for simple tables; GCF is the professional wire format for LLM-centric systems."
> -- Gemini

> "Best standard: JSON. Best spec among challengers: TOON. Best design for actual AI tool payloads: GCF."
> -- GPT (first review)

> "GCF's generic profile is the technically superior design for mixed-structure data. If your payloads have any structural complexity, GCF wins on both token efficiency and round-trip fidelity."
> -- Claude Opus 4.6

> "GCF is more complex and less mature, but its complexity buys capabilities that matter in agent pipelines."
> -- Codex

## Methodology

- **Prompt**: identical across all models (7 structured questions about design decisions, nested data, round-trip fidelity, graph support, spec rigor, gaps, and replacement pick)
- **Context**: fresh sessions with no system prompt, no prior conversation, no priming
- **Specs**: models reviewed specs from GitHub or local checkout (RFC 8259, TOON v3.3, GCF v2.0)
- **Dates**: 2026-06-10 and 2026-06-11

## Full reviews

- [Claude Opus 4.6](2026-06-10-claude-opus-v2.md)
- [Gemini](2026-06-10-gemini-v2.md)
- [GPT (first review)](2026-06-10-gpt.md)
- [GPT (second review)](2026-06-11-gpt-v2.md)
- [Codex](2026-06-11-codex.md)
