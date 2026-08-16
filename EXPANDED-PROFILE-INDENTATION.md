# Expanded-Profile Indentation Overhead (research note)

**Status:** Investigation / measurement. Not a spec draft. Records a quantified token
overhead in the expanded per-item encoding (§7.6) and a candidate direction, with honest
scope limits. No normative change is proposed here; if pursued it would be a wire-format
change to the expanded/nested profile (see §9 below) and would land at a declared version
boundary, gated behind the comprehension eval in §7.

**Surface touched if pursued:** §4.1 (indentation is normative and carries structure),
§7.4.4 / §7.4.5 / §7.6 (nested/expanded encoding), the grammar's `INDENT` productions
(`object-section`, `object-item`, `object-attachment`, `keyed-map-item`). The array-tabular
path (§7.1) and the flat-uniform result are unaffected.

---

## 1. Finding

On deeply-nested, per-item-irregular payloads that force the encoder out of clean tabular
form and into expanded per-item blocks (§7.6), the leading indentation mandated by §4.1
(`INDENT = SP SP`, one two-space unit per nesting level) is a measurable share of the wire:
**~10.7% of characters and ~7% of tokens** on a real Kubernetes pod list. Because indentation
is normative and load-bearing (§4.1: "Indentation is normative and carries structure"; the
decoder reconstructs nesting depth from it), it cannot be stripped without a spec change — but
it is the single dominant fixable overhead on this class of input.

## 2. Method

Real payloads captured from a live single-node `kind` cluster (Kubernetes objects as returned
by a dynamic-client `List`, i.e. arrays of full objects). Apples-to-apples baseline is
`JSON.stringify` (compact, no indentation) — the exact form a Go `json.Marshal` server emits.
Tokenizer: `o200k_base`. Encoder: `@blackwell-systems/gcf` 2.6.1, `encodeGeneric`. Every GCF
wire verified to round-trip losslessly (`decodeGeneric` → deep-equal to input, Map-aware).

"De-indented" column = the same GCF wire with leading whitespace removed, tokenized only to
isolate the indentation cost. It does **not** decode under the current spec (`missing_attachment`),
confirming indentation is load-bearing; it is a measurement bound, not a proposed wire.

## 3. Measurements (GCF generic vs compact JSON, o200k)

| payload      | records | JSON tok | GCF tok | GCF vs JSON | de-indented vs JSON |
|--------------|--------:|---------:|--------:|------------:|--------------------:|
| pods         |      14 |   18,262 |  19,514 |      −6.9%  |            **+0.9%** |
| configmaps   |      13 |    9,480 |   9,597 |      −1.2%  |              −0.1%  |
| services     |       3 |      596 |     671 |     −12.6%  |              −1.2%  |
| deployments  |       4 |    2,647 |   3,059 |     −15.6%  |              −7.6%  |
| events       |      92 |   23,570 |  20,293 |     +13.9%  |            **+16.9%** |

Removing indentation flips the large nested lists (pods, configmaps) from a loss to a
break-even/win and roughly halves the loss on the small lists. The flat/uniform payload
(events) already wins and widens.

## 4. Root cause

k8s objects are nested and **per-item irregular** (variable-length `containers`, `volumes`,
`conditions`, `tolerations`; per-object-varying nested keys). Tabular factoring (§7.1) needs
uniformity; irregular nesting drops each record into an expanded block (§7.6) that re-emits
structural scaffolding per item (`.metadata {}`, `.spec {}`, and repeated `## containers {…}` /
`## ports {…}` sub-headers). In that mode the encoder pays, per line, the §4.1 indentation
that grows with depth — whereas compact JSON pays only `{}` / `[]` / `:` / `,` with no
whitespace. The deeper and more irregular the object, the more indentation dominates.

Two non-causes were ruled out:
- **`managedFields`** — already absent from modern kubectl `-o json`; removing it changed the
  result by <0.1pp. The overhead is intrinsic to object structure, not removable bloat.
- **Noisy metadata** (annotations, ownerReferences, resourceVersion, uid): trimming moved pods
  −6.9% → −6.8%. Negligible.

## 5. Candidate direction

Encode expanded-block nesting with an explicit structural marker instead of leading whitespace,
so depth is carried by tokens the reader already pays for (the `.key {}` / `##` markers and an
explicit dedent) rather than by a growing run of spaces. §4.1 would change from
"indentation carries structure" to "indentation is optional formatting; structure is delimited."
The `.attachment {}` open markers and a dedent/close token would become the authoritative
nesting signal (they already exist in the grammar; today they are paired *with* indentation
rather than *instead of* it).

This targets GCF's genuinely weakest axis — deeply-nested expanded mode — and would help any
nested payload, not only k8s. It is a wire change for expanded-mode output (a pre-change decoder
would misparse), so it is gated at a version boundary; flat-uniform tabular output is byte-identical.

## 6. Worked example (before → after)

Two nested, per-item-irregular Pod-like records (different container/label/port shapes, which
forces expanded mode §7.6). The candidate keeps every marker and the field-factoring; only the
leading whitespace is removed. Nesting is delimited by the markers, with **implicit
sibling-close**: a new `.key {}` / `## header` / `@N` at a shallower position auto-closes the
deeper blocks, so an explicit close token is needed only when a dedent lands on a bare value
with no sibling marker to imply it.

```
BEFORE (current — nesting via normative §4.1 indentation)   AFTER (candidate — markers delimit; whitespace non-structural)
@0 Pod|^|^|^                                                 @0 Pod|^|^|^
.metadata {}                                                 .metadata {}
    name=web-1                                               name=web-1
    namespace=prod                                           namespace=prod
    ## labels                                                ## labels
      app=web                                                app=web
      tier=front                                             tier=front
.spec {}                                                     .spec {}
    ## containers [1]{name,image,ports}                      ## containers [1]{name,image,ports}
    @0 nginx|nginx:1.27|^                                    @0 nginx|nginx:1.27|^
    .ports [1]{containerPort}                                .ports [1]{containerPort}
        80                                                   80
.status {}                                                   .status {}
    phase=Running                                            phase=Running
    ## conditions [1]{type,status}                           ## conditions [1]{type,status}
    Ready|True                                               Ready|True
```

`.spec {}` following the labels block already signals "metadata closed"; no dedent token is
emitted. Token effect (o200k, real `encodeGeneric`, BEFORE verified lossless):

| payload                | compact JSON | GCF before      | GCF after (candidate) | note                          |
|------------------------|-------------:|----------------:|----------------------:|-------------------------------|
| 2-record example above |          186 |  244 (−31.2%)   |    212 (−14.0%)       | recovers 13.1% of the wire    |
| real 14-pod capture    |       18,262 | 19,514 (−6.9%)  | **18,194 (+0.4%)**    | loss → win; 96 explicit `;` closes across 1,215 lines |

Implicit sibling-close removes ~99% of the dedent tokens the naive "one close per level"
design would emit (which nearly cancels the whitespace saving — measured at only 4.9% recovered),
so nearly the full indentation saving survives and pods crosses to a small win.

## 7. Comprehension impact (open — must be measured, not assumed)

Indentation is not only bytes; it is a **spatial hierarchy cue** (depth reads off the left
margin; columns align), and this change trades it for markers plus an implicit close-stack the
reader must track. That risk is largest on exactly the deeply-nested, irregular data where the
token win lives — a genuine token-vs-comprehension tension. Direction is not obvious a priori
(fewer whitespace tokens may also reduce stranded attention), so it is an empirical question.

- **The headline result is not at stake.** The validated generic-comprehension result (100% on
  frontier models; ties/beats JSON+TOON on small models) is on the **flat tabular** form. This
  candidate touches only the **expanded/nested** path, whose comprehension has not been
  separately validated. Existing claims do not regress; the new form's comprehension is simply
  unmeasured.
- **Eval to run before any version-boundary commit** (three-arm, so both the before→after delta
  and any regression vs JSON are visible): arms = current-indented / candidate-delimited / plain
  JSON; payloads = nested-irregular real data, depth-stratified; probes = retrieval at varying
  nesting depth (e.g. `spec.containers[1].ports[0].containerPort` for a named record), where a
  hierarchy-cue change would surface; models = non-reasoning small/open instruct models
  (reasoning models ceiling out and hide the effect); hygiene = gate on format-miss/blank rate,
  measure the gap not absolutes, report CIs honestly.
- **Prior:** likely neutral on shallow nesting, a comprehension risk at depth. If the eval shows
  that, the candidate stays gated behind it — token savings alone do not justify shipping a
  nesting-signal change ("adopt on comprehension, not just tokens").

## 8. Scope limits (what this does NOT fix)

- **Small-count lists stay negative.** deployments (4 records) is still −7.6% de-indented,
  services (3) −1.2%. With almost no array to amortize header + per-item scaffolding across,
  fixed structural cost dominates. This is the small-payload regime and is structural, not an
  indentation artifact.
- **Non-uniformity is fundamental.** Per-item-varying nested shape forces repeated sub-headers
  regardless of indentation. No encoding tweak makes irregular data uniform; the tabular premise
  is a premise.
- **Net:** the change flips *large, moderately-uniform* nested lists and narrows the rest. It does
  not make untrimmed full-object k8s lists a general GCF win, and a never-grow producer would
  still decline the small/irregular ones. It reaffirms rather than overturns the guidance that
  GCF wants flat, uniform records (events, +13.9%, is the clean win here).

## 9. Normative surface if pursued

§4.1 (indentation status + parsing algorithm), the `INDENT`-bearing grammar productions
(§ grammar: `object-section`, `object-item`, `object-attachment`, `keyed-map-item`,
`indented-object-body`), §7.4.4 / §7.4.5 / §7.6 (expanded/nested encoding + dedent semantics),
§16 conformance fixtures (expanded-mode round-trip under the new nesting signal), §19.3 history.
Delta/session/streaming reuse the same nesting and would inherit the change unchanged.

## 10. Recommendation

Log as a spec candidate on its own merits (hardens the weak axis; broad nested-payload benefit),
decoupled from any single adoption target. If prototyped, follow the standard order
(spec text → conformance fixtures → Go oracle → other SDKs), run the §7 comprehension eval, and
re-run this token harness before committing to a version boundary. Do not ship on token savings
alone.

**Reproducibility:** capture = `kubectl get {pods,deployments,services,events,configmaps} -A -o json | jq '.items'`
on a `kind` cluster with a small nginx/redis workload; bench = `encodeGeneric` vs compact
`JSON.stringify`, o200k, lossless-verified. Harness retained in the integration workspace.
