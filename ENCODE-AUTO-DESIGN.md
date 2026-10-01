# EncodeAuto: payload classification and tier-aware routing (design)

Status: design, pre-spec, pre-code. Author: Dayna Blackwell.

## Problem

GCF already has several grammars (generic, graph, keyed-map) and several measured
producer-side knobs for weak consumers (flatten on/off, positional vs labeled counts,
delta re-anchor, see `docs/guide/small-models.md`). Today the caller must know which
profile to call and which knobs to set. Two different decisions are tangled together and
both are pushed onto the user.

**The entire auto system is opt-in.** `EncodeAuto` is a separate entry point. `EncodeGeneric`,
the graph encoder, and every existing API are unchanged and remain the default path; existing
callers see no difference. Nothing is classified or routed unless a caller explicitly chooses
`EncodeAuto`. Within it, the aggressive grammars are a further opt-in on top (see below), so
there are two opt-in layers: choosing auto at all, and allowing lossy grammars inside it.

They are not the same kind of decision, and that distinction is the whole design:

- **Which grammar fits the data** is a property of the payload. The encoder can see the
  payload, so it can decide this.
- **Which knobs help the reader** is a property of the consumer model, not the payload.
  The encoder cannot see the model, so it cannot decide this. The caller must declare it.

`EncodeAuto` separates these into two axes with two sources of truth, and routes.

## Two axes

```
EncodeAuto(data, AutoOptions{Target: frontier | mixed | small})
    1. classify payload shape        -> pick grammar          (inferred from data)
    2. apply the knob set for Target -> flatten/counts/anchor (declared by caller)
```

### Axis 1: payload shape -> grammar (inferred)

A classifier inspects the normalized value and selects the grammar. Decision table
(first match wins):

| Shape signal | Grammar |
|---|---|
| Array of objects with code-symbol fields (id, kind, qualified name) plus edges | graph |
| Object whose entries share one uniform value shape (keyed-map eligible, see `keyedMapEligible`) | keyed-map |
| Array of records (uniform or semi-uniform, flat or nested) | generic (tabular/expanded, chosen internally) |
| Anything else (scalars, irregular objects) | generic (robust fallback) |

Note: within the generic profile the encoder already auto-selects tabular vs expanded vs
inline-schema by shape. Axis 1 is the layer above that: choosing the *profile*, which the
caller does by hand today (`EncodeGeneric` vs graph). The generic profile stays the default
and the fallback, because it is the one that never degrades on any shape.

### Axis 2: consumer tier -> knob set (declared)

The caller declares `Target`. Each tier maps to the measured dials from
`docs/guide/small-models.md`. All are decoder-ignored (a plain reader sees the same data),
so this only affects how forgiving the wire is for a weak reader.

| Knob | frontier | mixed | small |
|---|---|---|---|
| flatten nested objects | on | off | off |
| per-group counts (streaming) | positional | labeled | labeled |
| delta re-anchor interval | off / long | 15 | 15 (or shorter) |

Rationale and magnitudes are in `small-models.md` (flatten off recovers 8 to 23% on
open-weight; labeled counts add up to +34pp; re-anchor rescues deep sessions). `frontier`
is the current shipping default behavior. `mixed` is the safe choice when any traffic may
hit a cheaper model.

## Aggressive modes are never auto-selected

Comprehension-degrading grammars (whitespace `sloppymode`, affix-factoring) are **not** on
the Axis-1 table. The classifier can see payload shape but not the consumer model, so it
cannot know an aggressive grammar is safe. Auto-selecting one would gamble comprehension on
a model the encoder cannot see, which is the failure mode GCF exists to avoid.

They remain explicit opt-ins. If ever auto-eligible, it is only under an explicit, measured
gate (e.g. `Target: frontier` plus `AllowLossyGrammar: true`), which is an opt-in with a tier
check, not silent routing. Default and `mixed`/`small` never touch them.

### Cardinality-driven per-column technique (lossy tier only)

Inside the lossy tier, the compression technique can be chosen per column from the column's
cardinality (distinct values relative to row count), rather than applying one scheme to the
whole payload:

| Column signal | Technique |
|---|---|
| Low cardinality (few distinct values, high repetition) | dictionary / enum: declare the value set once, reference by index |
| High cardinality with shared structure (distinct values, common prefix or suffix) | affix / template factoring: declare the affix once, carry only the varying middle |
| High cardinality, unstructured | leave inline; nothing to exploit |

Picking the smaller technique per column dominates applying any single scheme uniformly,
because each column's structure is different.

Caveat, and it is the reason this is lossy-tier only: every reference-by-index technique
reintroduces pointer indirection (the comprehension failure the safe tier exists to avoid),
and affix-factoring adds reconstruction load. So cardinality-driven selection is gated behind
the lossy opt-in and never runs in the safe router. The one comprehension-safe case is a
near-constant column (a single value across every row) factored to one declaration: that is
lossless and legible, and may be used in the safe tier.

## Multi-turn stability (hard constraint)

`pack_root`, delta, and session dedup assume a stable grammar across turns. If `EncodeAuto`
reclassified mid-session (turn 1 tabular, turn 3 keyed-map), delta diffs and the content hash
would break.

Rule: **in a session/delta context, the grammar chosen on the first turn is pinned for the
session.** Single-shot `EncodeAuto` classifies per call; multi-turn `EncodeAuto` classifies
once and freezes. The session object records the chosen grammar.

## Decode

No decoder change in principle: the profile header already identifies the grammar
(`GCF profile=generic`, etc.), so a decoder dispatches on it. Any aggressive mode that is
ever shipped as auto-eligible would need its own header marker so it is self-identifying;
until then those modes are encode-side only and out of this router.

## API sketch

```go
type Tier int
const ( Frontier Tier = iota; Mixed; Small )

type AutoOptions struct {
    Target Tier // default Frontier (current behavior)
    // AllowLossyGrammar bool // reserved; gates aggressive modes, default false
}

func EncodeAuto(data any, opts ...AutoOptions) (string, error)
```

`EncodeAuto` is additive: it does not change or replace any existing encoder, and it is never
invoked unless the caller calls it. The `frontier` default refers only to the default `Target`
*within* `EncodeAuto`; it does not make auto the global default. A caller who calls
`EncodeAuto(data)` with no options gets generic-shape routing and `frontier` knobs, which
matches today's `EncodeGeneric` output on a generic payload, so switching to it is safe, but
nothing switches on its own.

## What to measure before shipping

Spec-first, measure-first (same discipline as every other GCF feature):

1. Classifier accuracy: on a corpus of real payloads, does Axis 1 pick the grammar a human
   would? Misclassification is the main risk; the fallback-to-generic design bounds the cost.
2. The tier -> knob mappings are already measured (`small-models.md`); confirm they compose
   when applied together by the router rather than individually.
3. Any aggressive mode's auto-eligibility (if ever added) must clear a comprehension study on
   the declared tier first. Not before.

## Non-goals

- Inferring the consumer model from the payload. Not possible; it is declared.
- Auto-selecting lossy or comprehension-degrading grammars. Explicit, gated, never silent.
- Replacing the explicit per-profile encoders. `EncodeAuto` sits above them; they stay.

## Placement

The classifier is SDK library code, shared by `EncodeAuto` and the CLI, implemented in gcf-go
first. It is surfaced as a `gcf analyze` subcommand in each SDK's existing CLI (next to
`encode` / `decode` / `stats`); the subcommand prints the classifier's report and owns no logic.

Because every SDK ships a CLI, the classification must be identical across SDKs: the same input
must yield the same recommendation everywhere, or `analyze` becomes a source of disagreement
rather than guidance. So the shape-to-grammar decision table and the cardinality thresholds are
spec'd and conformance-tested like the rest of the format.

`gcf stats` (token counts and savings) stays a separate command. `gcf analyze` is the
classification-and-recommendation report (shape, recommended grammar, per-column cardinality,
estimated tokens per technique, comprehension-risk flag), and may include the stats numbers as a
superset.

## Order of work (if approved)

Spec note (profile selection rules + Target knob table) -> conformance fixtures for the
classifier decision table -> Go implementation (`EncodeAuto` over existing encoders) -> port
to the other SDKs. No SDK-first.
