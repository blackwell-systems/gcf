# Partial Nested-Object Flattening (§7.4.6)

**Status:** Exploratory draft. Not yet scheduled for a spec version. Comprehension-gated (see §5):
this is a token/comprehension tradeoff, not a pure win, and MUST NOT ship on token savings alone.
**Change class:** Additive encoder-eligibility relaxation plus one decoder allowance. Not a wire
break (`GCF` prefix unchanged; no currently-emitted payload changes meaning). It widens the set of
payloads that use existing §7.4.6 path columns and §7.4.4 attachments; a pre-change decoder that
already accepts a `>` path column and a `^` attachment in the same header (§7.4.6 rule 11) needs one
addition: a `>` path column whose cell is a `^` attachment marker.
**Design goal:** stop one array-valued sub-key from disqualifying an entire nested object from
flattening, so the scalar sub-keys of a mixed object are factored into the header instead of
re-emitted on every row.

**Normative surface (to verify against the full spec before scheduling):**
§7.4.4 (attachment cells; the `@{id}` prefix rule), §7.4.6.1 (encoder eligibility — the rule that
changes), §7.4.6.2 (decoder — path column sourced from an attachment), §7.4.6.3 (round-trip),
§13 (counts, unaffected), §16 (conformance fixtures), §19.3 (history). Delta/session/streaming are
unaffected (they operate over whatever tabular header the generic profile produces).

---

## 1. Motivation

§7.4.6 flattens a nested object into `>` path columns only when **every** leaf in that object is a
scalar (§7.4.6.1, rule that all final leaves MUST be scalar). A single array-valued or object-valued
sub-key disqualifies the **whole** object, which then falls back to a single per-row `^` attachment
(§7.4.4). Every scalar sub-key is re-emitted, with its key, on every row.

This is the exact repeated-key structure GCF eliminates for arrays, reintroduced through the back
door whenever a record has a nested object with mixed leaf types. The shape is common: a row of
scalars plus one or two tags / linked-id / label arrays. Airtable records (`{id, fields:{...}}` with
a multi-select or linked-record column), GitHub issues (a `labels` array beside scalar fields), and
any database row with a JSON array column all have it.

### Measured impact (see §6 for the harness)

40 records, o200k, GCF vs minified JSON, both lossless:

| Record `fields` shape | Flattening today | GCF vs minified JSON |
|---|---|---|
| All scalar sub-keys | full (§7.4.6) | **-35.8%** (win) |
| Scalar sub-keys + one multi-select + one linked-record array | none (falls to `^` attachment) | **+20.7%** (loss) |

One array-valued sub-key swings the payload from a 36% win to a 21% loss, because the four scalar
sub-keys stop being header-factored and are re-emitted per row.

## 2. Current output vs proposed output

Source (two Airtable-shaped records):

```json
{"records":[
  {"id":"rec01","fields":{"Task":"Refactor auth","Stage":"Active","Tags":["backend","urgent"],"Depends On":["recAAA","recBBB"],"Done":false,"Points":5}},
  {"id":"rec02","fields":{"Task":"Ship onboarding","Stage":"Backlog","Tags":["frontend"],"Depends On":[],"Done":true,"Points":3}}
]}
```

**Today** (the `Tags` / `Depends On` arrays disqualify the whole `fields` object; scalar keys repeat
per row):

```
## records [2]{id,fields}
@0 rec01|^
.fields {}
    Task=Refactor auth
    Stage=Active
    Tags [2]: backend,urgent
    "Depends On" [2]: recAAA,recBBB
    Done=false
    Points=5
@1 rec02|^
.fields {}
    Task=Ship onboarding
    Stage=Backlog
    Tags [1]: frontend
    "Depends On" [0]
    Done=true
    Points=3
```

**Proposed** (scalar sub-keys flatten into `>` path columns declared once; only the arrays remain as
attachments):

```
## records [2]{id,"fields>Task","fields>Stage","fields>Done","fields>Points","fields>Tags","fields>Depends On"}
@0 rec01|Refactor auth|Active|false|5|^|^
.fields>Tags [2]: backend,urgent
."fields>Depends On" [2]: recAAA,recBBB
@1 rec02|Ship onboarding|Backlog|true|3|^|^
.fields>Tags [1]: frontend
."fields>Depends On" [0]
```

Nothing new at the token level: `>` path columns (§7.4.6), the `^` marker and `.field [N]:` body
(§7.4.4), the `@{id}` prefix (§7.4.4), and header quoting for `>`/space names are all existing
constructs. §7.4.6 rule 11 already states that path columns and `^` attachment columns may coexist
in one header.

## 3. What changes normatively

### 3.1 Encoder eligibility (§7.4.6.1) — from per-object to per-leaf

Today: a nested object is eligible for flattening only if all leaves are scalar; otherwise none of it
is flattened.

Proposed: partition the leaves of an eligible nested object (one with the same ordered key set in
every row where it is present) into scalar leaves and non-scalar leaves.
- Scalar leaves flatten into `>` path columns exactly as today (§7.4.6.1 rules 5-8).
- Each non-scalar leaf becomes its own `>`-named column whose cell carries a `^` attachment marker,
  with the value emitted beneath the row as an ordinary §7.4.4 attachment keyed by the full `>` path.

The uniform-key-set requirement (same keys in every row where the object is present) is retained: a
leaf that is scalar in one row and an array in another still uses the §7.4.4 scalar-or-attachment
per-cell rule, unchanged.

### 3.2 Decoder (§7.4.6.2) — a path column may be sourced from an attachment

Today a `>` path column's cell is a scalar (`~` absent, `-` null, or a scalar value). Proposed: a `>`
path column's cell MAY be a `^` attachment marker, in which case the reconstructed leaf value is the
attachment body rather than the cell scalar. `"fields>Tags"` with a `^` cell and attachment
`.fields>Tags [2]: backend,urgent` reconstructs `{"fields":{"Tags":["backend","urgent"]}}`. This
composes the existing path-reconstruction rule (§7.4.6.2 rule 1) with the existing attachment-provides-
cell-value rule (§7.4.4); no new marker.

### 3.3 Round-trip (§7.4.6.3) unchanged in force

`decode(encode(value)) == value` MUST continue to hold, including key order within the reconstructed
nested object (scalar path columns and attachment-sourced path columns interleave at their declared
header positions, so the encoder MUST order the flattened columns in the object's original key order
regardless of scalar/non-scalar).

## 4. Canonical-form question (must be resolved before scheduling)

This changes canonical output for every mixed-leaf nested object, so it is a canonical change, not
only an optional encoder path. Two options:

1. **Mandatory** (encoder MUST partial-flatten when eligible): one canonical form, simplest conformance,
   but commits every implementation to the comprehension outcome in §5.
2. **Guarded / conditional** (encoder MAY partial-flatten, e.g. only when the scalar-leaf fraction
   clears a threshold, or gated by a producer flag): preserves the current highly-self-labeling form
   where it reads better, at the cost of two valid canonical forms and a selection rule.

Recommendation: do not decide this until §5 has data. If small models regress on the positional form,
option 2 with a scalar-fraction threshold is the fallback; if they do not, option 1 is cleaner.

## 5. Comprehension — the gate, not a footnote

This is a **token/comprehension tradeoff**, unlike most GCF changes where tokens and comprehension move
together. It replaces a self-labeling form with a positional one:

- Today's fallback labels every value inline (`Stage=Active`). Verbose and token-hungry, but trivially
  readable, close to JSON's explicit key/value.
- The proposed form makes those values positional (`...|Active|...`), so the model must align cell
  position to the `fields>Stage` header column, and resolve the trailing `^` cells to their named
  attachments below.

The constituent mechanisms (positional header rows, `>` path columns, `^` attachments) are already in
the generic profile that measured 100% on frontier models, so no frontier regression is expected. The
risk is concentrated on small / open / budget models, exactly the population where the GCF-over-JSON
comprehension margin is thinnest and where positional-plus-attachment binding is more demanding than
inline labels. The one genuinely novel construct (a `>` path column whose value arrives via a `^`
attachment) has never appeared in a comprehension set.

### 5.1 Required eval before scheduling

- Three encodings of the same array-bearing nested records: **current fallback form**, **proposed
  partial-flattened form**, **minified JSON** baseline.
- Model set weighted toward small / open / budget instruct models (the sensitive population), per the
  standard non-reasoning sweep.
- Report the **delta between the two GCF forms**, not just absolute accuracy, with the usual
  measurement hygiene (gate on format-miss and blank rate; do not read absolute CIs as the result).
- Gate: partial-flatten MUST NOT regress versus the current fallback form, and MUST stay at or above
  JSON. If small models drop on the positional form, that is the finding, and §4 option 2 (conditional
  flattening) is the response, not shipping anyway.

## 6. Validation performed (pre-spec, token-only)

Harness: `@blackwell-systems/gcf` generic encode/decode, `gpt-tokenizer` (o200k + cl100k), Map-aware
order-insensitive round-trip check. Representative Airtable `list_records` payloads (`{records:[{id,
fields:{...}}]}`); the uniform column schema across records is intrinsic to Airtable, not synthetic
repetition. Every case round-tripped losslessly.

- Flat-scalar `fields` (7 sub-keys), 10 / 25 / 50 records: GCF -27.8% / -31.2% / -32.4% vs minified
  JSON (o200k). Header-factored today; unaffected by this proposal (already optimal).
- `fields` with scalar + multi-select + linked-record arrays, 40 records: GCF +20.7% vs minified JSON
  today (loss); this proposal is the fix.
- `fields` with scalar + arrays + a nested collaborator object, 25 / 50 records: GCF +19% vs minified
  today (loss). (Object-valued leaves are the harder case; see §7.)

This is a token measurement only. No comprehension has been measured yet; §5 is required before any
implementation commitment.

## 7. Open questions

- **Object-valued (not just array-valued) leaves.** The partition in §3.1 sends every non-scalar leaf
  to an attachment. A nested object leaf that is itself uniform-scalar across rows could instead
  recurse into deeper `>` path columns (§7.4.6.1 rule 6 already chains levels). Decide whether partial
  flattening recurses through object leaves or only rescues scalar leaves at the first level.
- **Empty vs absent arrays** in the attachment position (`.field [0]` vs `~`): confirm the §7.4.4
  empty-array and absent-field rules compose cleanly with attachment-sourced path columns.
- **Canonical selection rule** for §4 option 2, if the eval forces it.

## 8. Implementation order (if it clears the §5 gate)

Spec-first, per repo norm: (1) SPEC §7.4.6.1/§7.4.6.2 amendments + §19.3 history; (2) conformance
fixtures (added red first) covering scalar+array mixed leaves, empty-array attachment, multi-level,
and the round-trip; (3) gcf-go; (4) the other five SDKs; (5) reference/cheatsheet updates. No SDK
lands before the spec text and fixtures.

## 9. Version history entry (draft, for §19.3 when scheduled)

> Partial nested-object flattening (§7.4.6): a nested object with mixed scalar and non-scalar leaves
> now flattens its scalar leaves into `>` path columns and emits its non-scalar leaves as `^`
> attachment columns, instead of disqualifying the whole object from flattening. Additive; no existing
> payload changes meaning. Decoders gain: a `>` path column cell MAY be a `^` attachment marker.
