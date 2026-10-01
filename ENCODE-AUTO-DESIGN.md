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
lossless and legible, and belongs in the safe tier. **Measured 2026-09-30:** factored vs repeated
read 100% / 100% across 5 models including the weak ones (command-r, mistral-nemo, llama-8b) that
cratered on keyed-map, pooled region questions 24/24 both forms. A single global constant is one
fact a model applies to all rows, not a per-row reference lookup, which is exactly why it is safe
where the index/affix techniques are not. Summary `eval/results/constant-column-comprehension.json`.

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

## Appendix A: draft decision table (from existing data, 2026-09-30)

Derived from runs already on disk, no new measurement. Sources cited per row.

### Tiers (from the comprehension tables)

| Tier | Models measured | Generic acc (GCF) | Note |
|---|---|---|---|
| frontier | Opus 4.6, Sonnet 4.6, Haiku 4.5, GPT-5.5, Grok, Gemini 2.5 Pro / 3.1 Pro / 3.5 Flash | 100% | at ceiling; knobs free and unneeded |
| mid | Gemini 2.5 Flash, Mistral Medium, LLaMA 3.3 70B, LLaMA 4 Maverick, DeepSeek V3, GPT-4o-mini | ~65-95% | formats separate; knobs start paying |
| small | LLaMA 3.1 8B, Mistral Small, Nova Micro/Lite, gemma-3-4b, Gemini Flash Lite | ~50-65% | knobs matter most |
| below floor | Granite 4.0 Micro (31%), Qwen 3.6 35B (25%) | <35% | capacity gone; format cannot rescue; out of scope |

Source: `eval/results/SUMMARY.md`, `docs/guide/small-models.md`.

### Axis 1: payload shape -> grammar

| Shape | Grammar | Evidence |
|---|---|---|
| array of `{id, kind, qualified_name}` + edges | graph | graph comprehension GCF 91.2 avg vs TOON 68.8 / JSON 54.1, leads every model (SUMMARY) |
| array of records (flat or nested) | generic | generic comprehension 100% all frontier; GCF >= JSON on 17/19 models (SUMMARY) |
| object of uniform-valued entries | keyed-map (frontier only) / generic (open-weight) | measured (Appendix B, 23 runs): ties generic at ceiling on capable models, regresses on open-weight (command-r -25, mistral-nemo -19, llama-70b -9; pooled -9.3pp); tier-gated, not auto-safe below frontier |
| scalars / irregular | generic (fallback) | robust default, never degrades on any shape |

Shape almost always dictates the profile, so Axis 1 is near-deterministic; the data confirms
each profile is comprehension-safe rather than choosing between two profiles for one payload.

### Axis 2: consumer tier -> knob set

| Knob | frontier | mid | small | Evidence |
|---|---|---|---|---|
| flatten nested | on | off* | off* | open-weight regress 8-23% flattened vs nested; proprietary frontier 0 (`flatten-experiment`, 19 models) |
| per-group counts | positional | labeled | labeled | +34pp weak/mid (11pp at 15 sym to 56pp at 500); labeled +14pp over positional, up to +29-40pp on nova-micro/llama-8b (`graph-trailer-counts/FINDINGS`) |
| delta re-anchor | off / long | 15 | 15 (or shorter) | rescues weak models to full-resend quality; llama-3.3-70b deep drift (turns 41-50) closed (`generic-delta-comprehension/DEPTH-FINDINGS`) |

**\*flatten keys on open-weight, not size.** The regression was measured on open-weight models;
proprietary frontier show zero. The real rule is "flatten off for open-weight (mid and small),
on for proprietary frontier." So this knob wants an open-weight bit in the tier declaration,
not just a size bucket.

### Known exceptions and gaps

- flatten-off counter-cases: Qwen 3.6 35B and Kimi K2.7 read the flatter layout slightly
  better. A per-model override table may be warranted.
- keyed-map comprehension: measured (Appendix B, 23 runs). Result: ties generic at ceiling on
  capable models, regresses on open-weight (command-r -25, mistral-nemo -19, llama-70b -9;
  pooled -9.3pp), so tier-gated frontier-only in Axis 1.
- Cardinality thresholds (lossy tier) remain unmeasured, off the safe path, deferred.

## Appendix B: keyed-map comprehension run (closes Appendix A gap)

A keyed-map **token** benchmark exists (`eval/keyed-map-benchmark.mjs`,
`eval/results/keyed-map-benchmark.json`); its **comprehension** has never been measured. Axis 1
lists keyed-map as a safe grammar on inference alone. This run confirms or demotes it.

**Question.** On data expressible as both keyed-map and generic tabular, does the keyed-map
grammar read as accurately as generic, across tiers, especially on small/open models?

**Fixture.** A map of uniform-valued entries (id -> same-shape record), the natural keyed-map
shape (lookup tables, config maps, per-key metadata). The same data encoded three ways:
keyed-map, generic tabular, JSON. Deterministic ground truth.

**Arms.** keyed-map vs generic vs JSON (TOON optional for context). All cold, no primer.

**Models.** Non-reasoning instruct across tiers (reuse the generic-comprehension set): at least
one frontier, Gemini 2.5 Flash, LLaMA 3.3 70B, LLaMA 3.1 8B, Mistral Small, Nova Micro. temp 0.2.

**Questions.** Lookup by key, field extraction, count/filter, deterministic answers, bucketed
correct/wrong/none, blank-gated.

**Decision rule (pre-registered).** keyed-map stays an Axis-1 safe grammar only if it does not
regress against generic on any tier (and no regress vs JSON). If it regresses on small/open
models, it is demoted from the safe router to a tier-gated token optimization (same status as
flatten): kept for frontier, off for the tiers where it reads worse.

**Evidence bar.** Same as the producer-side aids: tier x size, n>=3, non-reasoning models,
token cost paired to the accuracy delta, negative result documented not discarded. Harness:
reuse `TestGenericComprehension` with a keyed-map arm, the lowest-cost path.

### Result (2026-09-30)

keyed-map vs generic (tabular) vs json, 60 members, 8 questions, temp 0.2, **23 runs across 11
models** (the open-weight models that showed an effect were repeated to n=4). Harness
`TestKeyedMapComprehension` (`gcf-go/eval/keyed_map_comprehension_test.go`); logs in
`eval/results/comprehension/keyedmap-*.log`; summary `eval/results/keyed-map-comprehension.json`.

| model | runs | keyed-map | generic | keyed vs generic |
|---|---|---|---|---|
| command-r | 4 | 53.1 | 78.1 | **-25.0** |
| mistral-nemo | 4 | 62.5 | 81.2 | **-18.7** |
| llama-3.3-70b | 4 | 87.5 | 96.9 | **-9.4** |
| llama-3.1-8b | 4 | 71.9 | 75.0 | -3.1 (tied) |
| deepseek-v3 | 1 | 100 | 100 | 0 |
| gemini-2.5-flash | 1 | 100 | 100 | 0 |
| gemini-3.5-flash-lite | 1 | 100 | 100 | 0 |
| gemini-3.8-flash | 1 | 100 | 100 | 0 |
| gemma-3-27b | 1 | 87.5 | 87.5 | 0 |
| gemma-3-12b | 1 | 100 | 87.5 | +12.5 (outlier) |
| mistral-small | 1 | 100 | 100 | 0 |

Pooled per-run: keyed-map 77.7 / generic 87.0, **-9.3pp**. keyed-map ties generic at ceiling on
every capable model and regresses on open-weight, large and replicated on command-r (-25, n=4)
and mistral-nemo (-19, n=4), smaller on llama-3.3-70b (-9, n=4), tied on llama-3.1-8b. It never
beats generic except one gemma-3-12b outlier (the "flatter helps" quirk also seen with Qwen/Kimi).
The bodies are byte-identical, so this is purely the keyed header (`[N:]{key,...}`, anonymous,
generic `key` column) being less self-describing than the tabular header (named entity + explicit
`id`); weaker readers lean on that grounding.

Note: an earlier single-run read showed -25 on llama-3.1-8b, which **did not replicate** (tied
over 4 runs). The command-r and mistral-nemo deficits **did** replicate at n=4. Repeats mattered.

**Decision (per the pre-registered rule):** keyed-map regresses on open-weight, so it is
**tier-gated in `EncodeAuto`**, eligible on `frontier` (where it ties), with the router using the
tabular/generic form for open-weight (`mixed`/`small`). Not auto-safe below frontier.
