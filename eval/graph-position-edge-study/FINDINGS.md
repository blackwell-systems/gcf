# Findings: graph symbol-position and edge-direction comprehension

Method and how-to-run are in [README.md](./README.md). All accuracy is bucketed
(correct / wrong / none); OpenRouter, temp 0.2, 3 runs/cell unless noted.

## Part 1: symbol positions -> inline

### Ceiling run (codex / gpt-5.5, frontier)

All three arms scored **100%**, including the `## loc` side-section. A frontier model
resolves position under any layout, so the ceiling run is uninformative on its own; it
only confirms nothing is grossly broken.

### Sweep (5 models x 3 runs)

Accuracy (correct + declined) / 4 questions, stable across the 3 runs:

| Model | json-loc | gcf-inline | gcf-loc (side section) |
|---|--:|--:|--:|
| gpt-4o-mini | 100% | 100% | **25%** |
| gemini-2.5-flash-lite | 75% | 75% | **25%** |
| qwen-2.5-7b | (JSON exceeded 32k ctx) | 75% | **25%** |
| llama-3.1-8b | 50% | ~17% | **0%** |
| mistralai/ministral-8b | not served (404) | — | — |

The 25% on the side section is only the free "absent -> unknown" question; on the three
real location lookups it scored **0/3 on every non-frontier model**. The failure mode is
the two-hop `@id` join (find symbol -> get id -> hunt id in a separate block). **Inline
matches JSON** on every model that could run it, at ~36% of JSON's tokens. qwen could not
fit the JSON payload in 32k context but fit the GCF one.

### Decision: inline

Carry position inline on the node line, optional trailing fields:
`@{id} {kind} {qname} {score} {provenance} [{file} {line} {col} [{end_line} {end_col}]]`.
The two objections that originally motivated the side section both dissolve:

- **`pack_root`/identity:** we control `gcf-pack-root-v1` (SPEC §10.2); define it to hash
  the five identity fields and ignore the trailing position tokens. Position stays
  non-identity, so line churn does not break session dedup or inflate deltas.
- **Old-decoder safety:** `gcf-go/decode.go parseSymbolLine` errors only on *fewer* than 5
  fields; with more it reads fields 1-5 and ignores the rest. An inline node line decodes
  cleanly on a pre-v3.6 decoder (correct symbol, position simply unseen) — graceful
  degradation, verified. The strict two-decimal score rule guards the boundary.

### Reconciliation with existing evals

The side-section failure did not overturn the graph profile's core `@id` machinery.
- Session-dedup eval (`gcf/eval/results/session-dedup/`, gemini-2.5-flash): recalling a
  bare `@id`'s attributes works (kind/score/provenance all PASS, 10/12).
- Generic-profile delta holds weak->frontier (`gcf/eval/generic-delta-comprehension/`).
- The weak point is **directional/positional id-chasing**: the same session-dedup log
  shows `resolve_caller`/`resolve_callee` FAIL (edge direction swapped) — which motivated
  Part 2.

## Part 2: edge direction -> presentation, not syntax

### Quick probes (one fixture; later refuted)

A hand-written 6-symbol payload, three edge syntaxes, direction questions:

| | A `@t<@s` | B `@s>@t` | C SVO |
|---|--:|--:|--:|
| n=1 (`edge-syntax-quick-n1.log`) | 63% | 81% | 63% |
| n=3 (`edge-syntax-firmed-n3.log`) | 56% | 79% | 69% |

This suggested source-first (B) was best. It was one fixture and one query shape; the full
pilot below **did not replicate it**.

### Pilot (small tier: 4 models x 2 fixtures x 3 runs)

Correct / 24 on the clean direction queries (`shared_in` discounted — see caveat):

| Query | A | B | C | ADJ | JSON |
|---|--:|--:|--:|--:|--:|
| fwd_calls | 3 | 10 | 7 | 23 | 24 |
| bwd_callers | 9 | 6 | 9 | 15 | 20 |
| shared_out | 0 | 2 | 5 | 21 | 12 |

The three compact edge-line syntaxes (A/B/C) are all poor and interchangeable; B's quick
-probe lead vanished. Direction-explicit presentation (ADJ, JSON) dominates.

### Medium-tier ladder (12B-72B, 4 models x 2 fixtures x 3 runs)

Correct / 24, clean queries:

| Query | A | B | C | ADJ | JSON |
|---|--:|--:|--:|--:|--:|
| fwd_calls | 6 | 12 | 17 | 21 | 24 |
| bwd_callers | 7 | 6 | 6 | 19 | 21 |
| shared_out | 3 | 13 | 16 | 24 | 18 |

Per-model (fwd / bwd / shared_out, correct/6):
- mistral-nemo (12B): A 0/0/0 · B 3/0/1 · C 0/0/1 · ADJ 3/2/6 · JSON 6/6/5
- gemma-2-27b: A 0/0/2 · B 3/0/6 · C 6/0/6 · ADJ 6/6/6 · JSON 6/3/6
- llama-3.3-70b: A 3/4/1 · B 3/3/6 · C 5/3/6 · ADJ 6/5/6 · JSON 6/6/5
- qwen-2.5-72b: A 3/3/0 · B 3/3/0 · C 6/3/3 · ADJ 6/6/6 · JSON 6/6/2

### Flagship scale (500-symbol / 200-edge fixture, 8 models x 3 runs)

Correct / 24 on the clean queries (single large fixture, so 3 runs/query/model):

| Query | A | B | C | ADJ | JSON |
|---|--:|--:|--:|--:|--:|
| fwd_calls | 1 | 0 | 0 | 19 | 21 |
| bwd_callers | 8 | 7 | 6 | 11 | 21 |
| shared_out | 1 | 1 | 7 | 9 | 14 |
| **total /72** | **10** | **8** | **13** | **39** | **56** |

### The crossover, all three scales (totals /72 across the 3 clean queries)

| Arm | small (20-50) | medium (12-72B) | large (500) |
|---|--:|--:|--:|
| A `@t<@s` (current) | 12 | 16 | 10 |
| B `@s>@t` | 18 | 31 | 8 |
| C SVO | 21 | 39 | 13 |
| ADJ | 59 | 64 | 39 |
| JSON | 56 | 63 | 56 |

At 500 symbols the finding holds and sharpens, with one refinement:
- **Compact edge syntax collapses.** On `fwd_calls` A/B/C score ~0/24 at 500 while ADJ/JSON
  stay near-perfect. The presentation gap is *widest* at flagship scale.
- **JSON is the most robust at scale; whole-graph adjacency degrades.** JSON holds at 56/72;
  ADJ drops from 59-64 (small/medium) to 39 because the `## adjacency` section becomes 400+
  lines and the model loses the right row. Refinement: explicit source/target objects scale
  better than a full-graph adjacency dump; a *targeted* adjacency (only the queried
  neighborhood) would likely recover it.
- **The shared-node query is hard for everyone at 500** (even JSON only 14/24) — a
  multi-neighbor node in a large payload is the stressor; JSON still best.

### Conclusions (edge direction)

1. **Direction-explicit presentation beats compact edge lines at every scale** (20 to 500
   symbols, 8B to 72B). Explicit source/target objects (JSON-style) are the most robust and
   hold at 500; a whole-graph adjacency dump wins at small/medium but degrades at 500 (the
   section grows too long), so at scale prefer explicit objects or a *targeted* adjacency
   (the queried neighborhood only).
2. **The current `@target<@source` (A) is the worst at every rung and barely improves with
   size** (12 -> 16/72), never becoming reliable even at 72B. The one unambiguous
   "this wire syntax is a real weakness" result.
3. **Among compact forms, natural SVO (`@0 calls @1`) is the one that scales** (crosses to
   ~6/6 on forward at ~27B). Source-first arrow (B) lags SVO. So if a compact edge form
   were ever wanted, it is **SVO, not source-first-arrow** — flipping A->B was the wrong
   instinct, refuted.
4. **Below ~27B only presentation works; reverse queries ("who calls X") stay hard for all
   compact forms even at 72B** (all ~3/6) and need presentation regardless.
5. **Do not flip the edge arrow** (breaking, and it does not help). The actionable, additive
   fix is a direction-explicit rendering for direction-heavy tools (`find_callers`,
   `blast_radius`) and weak consumers — explicit source/target, or a targeted adjacency for
   the queried neighborhood (not a whole-graph adjacency dump, which does not scale to 500) —
   keeping compact `## edges` as the default. Its own spec proposal + eval, separate from
   positions.

### Caveat

`shared_in` ("which symbols point to X") is excluded from the tables above. Models read
"point to X" as *outgoing* even in the ADJ arm (they answered X's out-neighbor), so it
measured prompt wording, not format. A follow-up should re-word it. The headline rests on
`fwd_calls`, `bwd_callers`, and `shared_out`.
