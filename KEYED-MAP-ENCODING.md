# Keyed-Tabular Map Encoding (GCF v3.5)

**Status:** Draft extension for spec v3.5 (additive, Stable lifecycle).
**Change class:** Additive grammar + canonical output change. Not a wire break (`GCF` prefix unchanged; existing payloads decode identically).
**Normative target:** new Section 7.2a in `SPEC.md`, with reference updates in 7.1, 7.3, 7.8, 7.11, 16.2, 16.4, and a version-history entry in 19.3.

---

## 1. Motivation

A JSON object whose values are all uniform objects (a map keyed by id) currently
encodes as per-key section blocks (Section 7.2):

```
GCF profile=generic
## "web-01"
  cpu=23
  mem=61
  status=ok
## "web-02"
  cpu=88
  mem=74
  status=ok
```

This repeats every value field name once per entry, which is the exact repeated-key
structural noise GCF eliminates for arrays. Consequences, measured on real payloads:

- **Token cost:** on a representative id-keyed map, the section form is *larger than
  minified JSON* (e.g. 140 vs 111 tokens on a 4-entry sample), and far larger than the
  factored form.
- **Comprehension:** by the tokenizer-attention argument, repeated field names dilute the
  attention budget; the section form is the anti-pattern the array-tabular form avoids.

Keyed-tabular encoding factors the shared value fields into a single header and encodes
each entry as one row prefixed by its key, exactly as Section 7.4 does for arrays:

```
GCF profile=generic
## [2:]{key,cpu,mem,status}
web-01|23|61|ok
web-02|88|74|ok
```

Same 4-entry sample: **86 tokens (−39% vs the section form, −23% vs minified JSON)**,
lossless, with tokenization and comprehension inherited from the array-tabular form.

## 2. Design summary

- **Marker `[N:]`.** The colon after the count marks a keyed map. It is distinct from
  `[N]` (array → decodes to a list) and from `## key` sections. The current decoder
  rejects an `N:` count (`invalid_count`), so the marker is free to define and introduces
  no ambiguity.
- **Named key column.** The first declared field is the key column, labeled `key`. The
  label is display-only; the decoder does not emit it as a value field. Naming it makes
  the payload a fully self-describing labeled table, so the LLM never has to interpret the
  marker (map-vs-array is invisible to the reading task).
- **Value fields reuse Section 7.4 in full** — scalars directly, nested objects via `^`
  attachments / `^{fields}` inline schemas (7.4.4, 7.4.5), flattenable objects via `>`
  path columns (7.4.6), null/absent via `-`/`~` (7.4.2). No new nested-value machinery.
- **Canonical (MUST).** Like array-tabular (7.3 rule 3), an eligible map MUST use the
  keyed form. Deterministic output; regenerated conformance fixtures.

## 3. Normative text (proposed Section 7.2a)

### 7.2a Keyed map encoding (tabular)

A JSON object whose values are all objects forming a losslessly-tabular set is encoded as
a **keyed table**: the shared value fields are declared once in a header, and each member
is one positional row prefixed by its key. This is the object-valued analogue of
Section 7.4.

**Selection.** Extending Section 7.1/7.2, a buffered encoder MUST encode a JSON object as
a keyed table when all of the following hold; otherwise it uses Section 7.2 section
encoding:

1. the object has at least one member;
2. every member value is a JSON object;
3. the member-value objects form a losslessly-tabular set under the Section 7.3 rule-3
   conditions (non-empty ordered field union computed over all members per 7.4.3; every
   field preserved; each leaf a scalar or a 7.4.4/7.4.5 attachment; absent distinguishable
   from null);
4. the reserved key-column label `key` is not present in the value field union (if it is,
   the object is ineligible and uses Section 7.2 section encoding).

An object with any non-object member value (scalar or array) is not a keyed map and uses
Section 7.2. A map of scalar values is already optimal as `key=value` lines and is
unaffected.

**Header.**

```
## [{count}:]{key,field1,field2,...}
```

Named or nested form: `## {name} [{count}:]{key,field1,...}`.

- `[{count}:]` — the `:` after the exact member `count` marks a keyed map.
- The first declared field is the **key column**, labeled `key`. Its name is a display
  label; the decoder MUST NOT emit it as a member of any value object.
- The remaining fields are the value objects' fields in Section 7.4.3 union order.

**Rows.** One row per member, in input order (Section 7.11): `{keyvalue}|{v1}|{v2}|...`

- Cell 0 is the member key, encoded as a scalar per Section 2 (quoted when required, e.g.
  numeric-looking keys or keys containing `|`).
- Cells 1..M are the value fields positionally, using the full Section 7.4 tabular row
  grammar: scalars directly; `-` for null and `~` for absent (7.4.2); `^` / `^{fields}`
  attachments for nested values (7.4.4, 7.4.5); `>` path columns for flattened nested
  objects (7.4.6). A row carrying one or more attachment cells takes the `@{id}` prefix
  required by 7.4.4, where the id is the member's zero-based index; the key remains cell 0.

**Example (flat):**

```
GCF profile=generic
## [3:]{key,cpu,mem,status}
web-01|23|61|ok
db-01|41|83|ok
cache-1|67|52|warn
```

decodes to

```json
{"web-01":{"cpu":23,"mem":61,"status":"ok"},
 "db-01":{"cpu":41,"mem":83,"status":"ok"},
 "cache-1":{"cpu":67,"mem":52,"status":"warn"}}
```

**Decoder.** For a `[N:]` block, reconstruct a JSON object with N members. For each row,
cell 0 decoded per Section 2 is the member key; cells 1..M map to declared fields 1..M
(via the Section 7.4 body grammar) as the member's value object. The key-column label is
discarded. A decoder MUST reject:

- a row whose cell count does not match the declared field count;
- duplicate member keys;
- a `[N:]` header whose field declaration has fewer than two fields (key plus at least one
  value field);
- a member count mismatch (Section 13).

**Round-trip.** `decode(encode(x)) == x` for eligible objects. Member order follows
Section 7.11 (input order, or lexicographic by Unicode code point when the input provides
no encounter order).

**Distinctness.** `[N]` decodes to an array; `[N:]` decodes to an object. The `[N:]`
marker is otherwise invalid in current GCF, so no existing payload changes meaning.

## 4. Reference updates required in SPEC.md

- **7.1** root-value table: a root object that satisfies 7.2a is encoded as `## [N:]{...}`.
- **7.3 / 7.10:** cross-reference the object-valued analogue (7.2a) alongside array
  tabular selection.
- **7.8** encoding-rules summary: add "Map of uniform objects → keyed tabular `[N:]`".
- **7.11** container selection: keyed-tabular selection is deterministic for eligible maps.
- **16.2 / 16.4:** encoder MUST-emit and decoder MUST-accept conformance for `[N:]`.
- **19.3** version history (see Section 6 below).

## 5. Validation performed (pre-spec)

- **Marker collision:** the live gcf-go decoder rejects `[N:]` (`invalid_count`), confirming
  the marker is free to define.
- **Tokenization:** across the 43-tokenizer barrier study, the per-row delimiter is pipe
  (cleanest common delimiter); the `:` tokenizes as a standalone token once per block; `[`
  and `]` already appear in every `[N]` array header. Concrete boundaries confirm no merge.
- **Comprehension:** inherited from the generic array-tabular form by structural
  equivalence — the header + pipe-row body is byte-identical; the `:` is a decoder-only
  flag, comprehension-inert (map-vs-array does not affect the reading task). No new
  comprehension measurement is required to ship; correctness is deterministic.
- **Token efficiency:** −39% vs the section form and −23% vs minified JSON on a real-shaped
  id-keyed map; lossless round-trip verified.

## 6. Version history entry (for 19.3)

> **v3.5** added keyed-tabular map encoding (Section 7.2a): a JSON object whose values are
> all objects forming a losslessly-tabular set is encoded with the shared value fields
> declared once and one `key|values` row per member, marked by `[N:]`. This changes the
> canonical output for uniform-object maps from per-key section blocks to a keyed table.
> Existing payloads are unaffected (the `[N:]` marker was previously invalid, and all other
> constructs decode identically); a pre-v3.5 decoder rejects `[N:]`, so decoders MUST be
> updated to read v3.5 map output. Additive under the Stable lifecycle.

## 7. Implementation order

Spec-first, per project convention:

1. `SPEC.md` — Section 7.2a + reference updates + 19.3 entry; bump status line to v3.5.
2. Conformance fixtures (in the canonical fixtures set) — encoder + decoder cases below.
3. `gcf-go` — encoder selection, `[N:]` emit, decoder, round-trip tests.
4. `gcf-typescript`, `gcf-python`, `gcf-rust`, `gcf-swift`, `gcf-kotlin` — same, gated on
   fixtures.

## 8. Fixture / edge-case checklist

- flat uniform map (baseline)
- semi-uniform value objects (field union + `~` for absent)
- value objects with a null field (`-`)
- nested value object via `^` attachment; via `^{fields}` inline schema; via `>` flattening
- key requiring quoting: numeric-looking (`"123"`), containing `|`, empty string, `-`/`~`
  look-alikes
- single-member map (`[1:]`)
- empty map → Section 7.7 form (not `[0:]`)
- collision: a value field literally named `key` → falls back to Section 7.2 sections
- root keyed map (`## [N:]{...}`) and named/nested keyed map (`## field [N:]{...}`)
- decoder rejection: cell/field count mismatch; duplicate member keys; `[N:]` with <2 fields
- round-trip: `decode(encode(x)) == x`, member order per 7.11
