# Keyed-Tabular Map Encoding (GCF v3.5)

**Status:** Draft extension for spec v3.5 (additive, Stable lifecycle).
**Change class:** Additive grammar + canonical output change for uniform-object maps. Not a
wire break (`GCF` prefix unchanged; existing payloads decode identically; the `[N:]` marker
was previously invalid so no current payload changes meaning). A pre-v3.5 decoder rejects
`[N:]`, so decoders MUST be updated to read v3.5 map output.
**Normative surface:** new Section 7.2a, plus updates to 7.1, 7.4.4, 7.6, 7.8, 7.10, 7.11,
8 (streaming), 10a (delta), 13 (counts), 16.2, 16.4, and a 19.3 history entry.
**Design goal:** maximize token efficiency for id-keyed maps of objects while preserving the
lossless round-trip invariant (Section 1.1) and inheriting the array-tabular comprehension
result by structural equivalence.

---

## 1. Motivation

A JSON object whose values are objects (a map keyed by id) currently encodes as per-key
section blocks (Section 7.2), repeating every value field name once per entry:

```
## "web-01"
  cpu=23
  mem=61
  status=ok
## "web-02"
  cpu=88
  mem=74
  status=ok
```

On real payloads this is worse than minified JSON (e.g. 140 vs 111 tokens on a 4-entry
sample) and is the repeated-key structural noise GCF eliminates for arrays. Keyed-tabular
encoding factors the shared value fields into one header and encodes each entry as one row
prefixed by its key:

```
## [2:]{key,cpu,mem,status}
web-01|23|61|ok
web-02|88|74|ok
```

Same sample: **86 tokens (−39% vs sections, −23% vs minified JSON)**, lossless, tokenization
and comprehension inherited from the array-tabular form (Section 7.4).

## 2. Design summary

- **Marker `[N:]`.** The colon after the count marks a keyed map (decodes to an object).
  Distinct from `[N]` (array → list) and `## key` sections. The current decoder rejects an
  `N:` count, so the marker is free and unambiguous.
- **Named key column.** First declared field is the key column, default label `key`. The
  label is display-only (self-describing table for the model); the decoder identifies the key
  positionally via `[N:]`. On collision with a value field, the label is made unique by
  prepending `_` (`_key`, `__key`, …) — deterministic, never disables the form.
- **Key cell is always a string.** Map keys are JSON strings; cell 0 always decodes as a
  string and is quoted whenever a bare form would not round-trip as one.
- **Value fields reuse Section 7.4 in full**, and the encoder selects the **smallest** valid
  form per field for token efficiency: flatten (`>`, 7.4.6) > inline schema (`^{}`, 7.4.5) >
  traditional attachment (`^`, 7.4.4), plus shared-schema reuse (7.4.5.3).
- **Canonical (MUST)** when eligible, like array-tabular (7.3). Deterministic; regenerated
  conformance fixtures.
- **First-class in every object position:** root, named/nested field, tabular-row attachment
  (7.4.4), expanded-array item (7.6), streaming (8), and delta (10a).

## 3. Normative text (proposed Section 7.2a)

### 7.2a Keyed map encoding (tabular)

A JSON object whose values are all objects forming a losslessly-tabular set is encoded as a
**keyed table**: the shared value fields are declared once, and each member is one positional
row prefixed by its key. This is the object-valued analogue of Section 7.4.

**Selection.** A buffered encoder MUST encode a JSON object as a keyed table when all hold;
otherwise it uses Section 7.2 section encoding:

1. the object has at least one member;
2. every member value is a JSON object;
3. the member-value objects form a losslessly-tabular set under Section 7.3 rule-3 conditions
   (non-empty ordered field union over all members per 7.4.3; every field preserved; each
   leaf a scalar or a 7.4.4/7.4.5 attachment; absent distinguishable from null).

An object with any non-object member value uses Section 7.2. An object whose values are all
empty objects has an empty field union and is not eligible (uses Section 7.2). A map of
scalar values is already optimal as `key=value` lines and is unaffected.

**Header.** `## [{count}:]{key,field1,field2,...}` (named/nested: `## {name} [{count}:]{key,...}`).

- `[{count}:]` — the `:` after the exact member `count` marks a keyed map.
- The first declared field is the **key column**, labeled `key`. If `key` appears in the value
  field union, the encoder MUST prepend `_` until the label is unique (`_key`, `__key`, …).
  The decoder MUST NOT emit the key-column label as a member of any value object.
- Remaining fields are the value objects' fields in Section 7.4.3 union order.

**Key cell (cell 0).** Always the member key, always a string.

- The encoder MUST quote cell 0 (Section 2.2) whenever a bare form would not round-trip as a
  string: numeric-looking (`"123"`, `"1.5"`, `"-0"`), boolean/null look-alikes (`"true"`,
  `"-"`, `"~"`), empty (`""`), or containing the row delimiter `|`.
- The decoder MUST interpret cell 0 as a string, never coercing to number/boolean/null.
- Duplicate member keys are an error.

**Value cells (1..M).** Encoded with the full Section 7.4 row grammar: scalars directly; `-`
for null and `~` for absent (7.4.2); nested values via `^`/`^{fields}` attachments (7.4.4,
7.4.5) or `>` flattened path columns (7.4.6). For token efficiency the encoder MUST select
the smallest valid form per field and MAY reuse shared schemas (7.4.5.3). A row carrying one
or more attachment cells takes the `@{id}` prefix required by 7.4.4, where the id is the
member's zero-based index; the key remains cell 0.

**Example (flat):**
```
## [3:]{key,cpu,mem,status}
web-01|23|61|ok
db-01|41|83|ok
cache-1|67|52|warn
```
→ `{"web-01":{"cpu":23,"mem":61,"status":"ok"},"db-01":{...},"cache-1":{...}}`

**Decoder.** For a `[N:]` block, reconstruct a JSON object with N members. Cell 0 (as a
string) is the member key; cells 1..M map to declared fields 1..M (Section 7.4 body grammar)
as the value object; discard the key-column label. A decoder MUST reject: a row whose cell
count ≠ declared field count; duplicate member keys; a `[N:]` header with fewer than two
declared fields; a member-count mismatch (Section 13).

**Round-trip.** `decode(encode(x)) == x`. Member order follows Section 7.11.

## 4. Nested positions

**4.1 Tabular-row attachment (Section 7.4.4 addition).** A value that is itself an eligible
keyed map is attached as a keyed table:
```
## items [1]{id,nodes,total}
@0 ORD-1|^|99
.nodes [2:]{key,cpu,mem}
    web-01|23|61
    db-01|41|83
```
Attachment forms table gains: `.field [N:]{key,...}` — keyed-map attachment; rows indented
beneath it. Shared-schema reuse (7.4.5.3) applies to the value fields.

**4.2 Expanded-array item (Section 7.6 addition).** A keyed-map element of a mixed array:
```
## items [2]
@0 [2:]{key,cpu}
  web-01|23
  db-01|41
@1 =scalar
```
Type-marker table gains: `@N [M:]{key,...}` — keyed-map item; rows indented beneath it.

## 5. Streaming (Section 8 addition)

A large keyed map streams with a deferred count and a trailer, mirroring streaming tabular
arrays (8.3):
```
GCF profile=generic stream=true
## servers [?:]{key,cpu,mem,status}
web-01|23|61|ok
db-01|41|83|ok
##! summary servers=2
```
`[?:]` is the deferred-count keyed form; rows stream; the `##! summary` trailer carries the
actual member count for validation (Section 13.2). The decoder builds the map incrementally.
Streaming is opt-in (memory/latency); buffered `[N:]` remains the default and is the
token-optimal form.

## 6. Delta (Section 10a addition)

A keyed map is inherently id-keyed: **the map key is the identity.** Generic delta (Section
10a) applies directly, with the map key serving the role of the `@id` identity column:
```
GCF profile=generic delta=true base_root=sha256:... new_root=sha256:... savings=...
## added [1:]{key,cpu,mem,status}
cache-2|30|40|ok
## changed [1:]{key,cpu,mem,status}
web-01|91|61|warn
## removed [1]: db-01
```
- `## added` / `## changed` use the `[N:]` keyed form (full member rows).
- `## removed` lists keys only, as an inline primitive array `## removed [N]: key1,key2` (a
  `[N:]{key}` header is invalid: <2 fields).
- `pack_root` is computed per Section 10a.3 with the map key as the record identity; member
  order is not preserved (set semantics, 10a.6).
- Application (10a.5): remove listed keys, upsert added/changed by key, atomically.

## 7. Reference updates required in SPEC.md

- **7.1** root-value table: a root object satisfying 7.2a → `## [N:]{...}`.
- **7.4.4 / 7.6:** add the keyed-map attachment and expanded-item forms (Section 4 above).
- **7.8** encoding summary: "Map of objects (losslessly tabular) → keyed tabular `[N:]`".
- **7.10 / 7.11:** keyed-tabular selection is deterministic for eligible maps; smallest-form
  selection for value fields.
- **8:** `[?:]` streaming keyed maps (Section 5 above).
- **10a:** keyed-map delta (Section 6 above).
- **13:** count validation for `[N:]` and `[?:]`.
- **16.2 / 16.4:** encoder MUST-emit / decoder MUST-accept conformance for `[N:]`, including
  nested, streaming, and delta positions.
- **19.3:** version-history entry (Section 9 below).

## 8. Validation performed (pre-spec)

- **Marker collision:** the live gcf-go decoder rejects `[N:]` (`invalid_count`) — free to define.
- **Tokenization (43-tokenizer barrier study):** per-row delimiter is pipe (cleanest common
  delimiter); the `:` tokenizes standalone once per block; `[`/`]` already appear in every
  `[N]` header. Concrete boundaries confirm no merge.
- **Comprehension:** inherited from the generic array-tabular form by structural equivalence
  — the header + pipe-row body is byte-identical; the `:` is a decoder-only flag,
  comprehension-inert. No new comprehension measurement is required to ship.
- **Token efficiency:** −39% vs sections, −23% vs minified JSON on a real-shaped id-keyed
  map; lossless round-trip verified.

## 9. Version history entry (for 19.3)

> **v3.5** added keyed-tabular map encoding (Section 7.2a): a JSON object whose values are
> all objects forming a losslessly-tabular set is encoded with the shared value fields
> declared once and one `key|values` row per member, marked by `[N:]`, with first-class
> support in nested (7.4.4, 7.6), streaming (`[?:]`, Section 8), and delta (Section 10a)
> positions. This changes the canonical output for such maps from per-key section blocks to a
> keyed table. Existing payloads are unaffected (the `[N:]` marker was previously invalid; all
> other constructs decode identically); a pre-v3.5 decoder rejects `[N:]`, so decoders MUST be
> updated to read v3.5 map output. Additive under the Stable lifecycle.

## 10. Implementation order

Spec-first: (1) `SPEC.md` — 7.2a + all reference updates + 19.3 + status → v3.5; (2)
conformance fixtures (checklist below); (3) `gcf-go`; (4) `gcf-typescript`, `gcf-python`,
`gcf-rust`, `gcf-swift`, `gcf-kotlin`, gated on fixtures.

## 11. Fixture / edge-case checklist

- flat uniform map (baseline)
- semi-uniform value objects (field union + `~`)
- value object with null field (`-`); value object empty among non-empty (all `~`)
- all-empty-value-object map → Section 7.2 fallback
- nested value object via `^` attachment; via `^{fields}` inline schema; via `>` flattening;
  smallest-form selection verified
- nested value that is itself a keyed map → `.field [N:]{...}` attachment; `@N [M:]{...}` item
- key requiring quoting: numeric-looking, boolean/null look-alike, empty string, containing `|`
- single-member map (`[1:]`); empty map → Section 7.7 (not `[0:]`)
- key-column label collision → `_key` deterministic
- root keyed map; named/nested keyed map
- streaming `[?:]` with trailer count; incremental decode
- delta: added/changed (`[N:]`) + removed (inline key list); pack_root; atomic application
- decoder rejection: cell/field count mismatch; duplicate keys; `[N:]` with <2 fields; count mismatch
- round-trip `decode(encode(x)) == x`, order per 7.11
