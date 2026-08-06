# Keyed-Tabular Map Encoding (GCF v3.5)

**Status:** Draft extension for spec v3.5 (additive, Stable lifecycle).
**Change class:** Additive grammar + canonical output change for uniform-object maps. Not a
wire break (`GCF` prefix unchanged; existing payloads decode identically; the `[N:]` marker
was previously an invalid count so no current payload changes meaning). A pre-v3.5 decoder
rejects `[N:]` (§16.5 `Invalid count`), so decoders MUST be updated to read v3.5 map output.
**Design goal:** maximize token efficiency for id-keyed maps of objects while preserving the
lossless round-trip invariant (§1.1) and inheriting the array-tabular comprehension result by
structural equivalence.

**Normative surface (verified against the full spec):**
§4 (grammar productions for `[N:]`/`[?:]`), §7.2a (new), §7.1, §7.8, §7.10, §7.11, §7.4.4 and
§7.6 (nested positions), §8.2/§8.3 (streaming), §13 (counts), §16.2/§16.4/§16.5 (conformance +
the `Invalid count` rule), one §10a note, §19.3 (history) + status line. §10a delta is reused
**unchanged**.

---

## 1. Motivation

A JSON object whose values are objects (a map keyed by id) currently encodes as per-key
section blocks (§7.2), repeating every value field name once per entry. On real payloads this
is worse than minified JSON (140 vs 111 tokens on a 4-entry sample) and is the repeated-key
structural noise GCF eliminates for arrays. Keyed-tabular encoding factors the shared value
fields into one header and encodes each entry as one row prefixed by its key:

```
## [2:]{key,cpu,mem,status}
web-01|23|61|ok
web-02|88|74|ok
```

Same sample: **86 tokens (−39% vs sections, −23% vs minified JSON)**, lossless, tokenization
and comprehension inherited from the array-tabular form (§7.4).

## 2. Design summary

- **Marker `[N:]`.** The colon after the count marks a keyed map (decodes to an object).
  Distinct from `[N]` (array → list). The current grammar (§4 `count-or-deferred = count / "?"`)
  makes `[N:]` an invalid count today (§16.5), so the marker is free and unambiguous; adding it
  requires the §4 grammar production in §3.5 below.
- **Named key column.** First declared field is the key column, default label `key`. The label
  is display-only (self-describing table for the model); the decoder identifies the key
  positionally via `[N:]`. On collision with a value field, prepend `_` until unique (`_key`,
  `__key`, …) — deterministic, never disables the form.
- **Key cell uses the ordinary scalar grammar — no special rule.** Because JSON keys are
  strings, §2.4's encoder quoting obligation already forces quoting of any key that would
  otherwise decode as a non-string (numeric-like, `-`, `true`, `~`, `^`, empty, leading
  `#`/`@`/`.`, contains `|`). So cell 0 round-trips as a string with no keyed-map-specific
  decoder rule.
- **Value fields reuse §7.4 in full**, and the encoder selects the **smallest** valid form per
  field for token efficiency: flatten (`>`, 7.4.6) > inline schema (`^{}`, 7.4.5) > traditional
  attachment (`^`, 7.4.4), plus shared-schema reuse (7.4.5.3).
- **Canonical (MUST)** when eligible, like array-tabular (§7.3). Deterministic; regenerated
  conformance fixtures.
- **First-class in every object position:** root, named/nested field, tabular-row attachment
  (§7.4.4), expanded-array item (§7.6), streaming (§8). **Delta reuses §10a unchanged** (§6).

## 3. Normative text (proposed Section 7.2a)

### 7.2a Keyed map encoding (tabular)

A JSON object whose values are all objects forming a losslessly-tabular set is encoded as a
**keyed table**: the shared value fields are declared once, and each member is one positional
row prefixed by its key. This is the object-valued analogue of §7.4.

#### 7.2a.1 Selection

A buffered encoder MUST encode a JSON object as a keyed table when all hold; otherwise §7.2
section encoding:

1. the object has at least one member;
2. every member value is a JSON object;
3. the member-value objects form a losslessly-tabular set under §7.3 rule-3 conditions
   (non-empty ordered field union over all members per §7.4.3; every field preserved; each leaf
   a scalar or a §7.4.4/§7.4.5 attachment; absent distinguishable from null).

An object with any non-object member value uses §7.2. An object whose values are all empty
objects has an empty field union and is not eligible (§7.2). A map of scalar values is already
optimal as `key=value` lines and is unaffected.

#### 7.2a.2 Header

`## [{count}:]{key,field1,field2,...}` (named/nested: `## {name} [{count}:]{key,...}`).

- `[{count}:]` marks a keyed map; the decoder reconstructs an object (not an array).
- First declared field is the **key column**, default label `key`; if `key` is in the value
  field union, prepend `_` until unique. The decoder MUST NOT emit the key-column label as a
  value-object member.
- Remaining fields are the value objects' fields in §7.4.3 union order.
- A `[{count}:]` header MUST declare at least two fields (key column + ≥1 value field); a
  decoder MUST reject fewer.

#### 7.2a.3 Rows

One row per member, in input order (§7.11): `{keyvalue}|{v1}|{v2}|...`

- **Cell 0** is the member key, an ordinary scalar cell governed by §2.4/§2.1. Duplicate member
  keys are an error.
- **Cells 1..M** use the full §7.4 row grammar: scalars directly; `-` null and `~` absent
  (§7.4.2); nested values via `^`/`^{fields}` (§7.4.4, §7.4.5) or `>` flattened columns
  (§7.4.6); encoder selects the smallest valid form. A row with attachment cells takes the
  `@{id}` prefix (§7.4.4), id = the member's zero-based emission index; the key remains cell 0.

Example:
```
## [3:]{key,cpu,mem,status}
web-01|23|61|ok
db-01|41|83|ok
cache-1|67|52|warn
```
→ `{"web-01":{"cpu":23,"mem":61,"status":"ok"},"db-01":{...},"cache-1":{...}}`

#### 7.2a.4 Decoder

For a `[{count}:]` block, reconstruct an object with `count` members. Cell 0 (per §2.1) is the
member key; cells 1..M map to declared fields 1..M (§7.4 body grammar) as the value object;
discard the key-column label. A decoder MUST reject: row cell count ≠ declared field count;
duplicate member keys; a `[{count}:]` header with fewer than two fields; member-count mismatch
(§13). Round-trip `decode(encode(x)) == x`; member order per §7.11.

### 3.5 Formal grammar additions (Section 4)

The keyed body reuses `tabular-body`/`tabular-row` unchanged (cell 0 is the key). Only the
header bracket and block productions are new:

```
keyed-bracket        = "[" count-or-deferred ":" "]"          ; count or "?" then ":"
anonymous-keyed-block = "##" SP keyed-bracket field-decl LF tabular-body
keyed-block          = "##" SP key SP keyed-bracket field-decl LF tabular-body
```

`root-object` (§4) additionally admits `anonymous-keyed-block`; `object-member` admits
`keyed-block`; `traditional-attachment` and `expanded-item` admit the keyed forms (§4 below).
§16.5's `Invalid count` rule is amended to accept a trailing `:` inside the bracket for keyed
maps.

## 4. Nested positions

**4.1 Tabular-row attachment (§7.4.4 forms table gains):** `.field [N:]{key,fields}` —
keyed-map attachment; `keyvalue|values` rows indented beneath it. Shared-schema reuse (§7.4.5.3)
applies to the value fields.

**4.2 Expanded-array item (§7.6 type-marker table gains):** `@N [M:]{key,fields}` — keyed-map
item; rows indented beneath it.

## 5. Streaming (Section 8 addition)

A large keyed map streams with a deferred count and trailer, mirroring streaming tabular
arrays (§8.2/§8.3):
```
GCF profile=generic
## servers [?:]{key,cpu,mem,status}
web-01|23|61|ok
db-01|41|83|ok
##! summary counts=2
```
Per §8.3, the streaming encoder MUST have the complete **value-field** list before the first
row (caller-provided schema or known-conforming input); the **keys** stream (cell 0 per row).
`[?:]` is a deferred `[?]` section for `counts` matching (§8.4) and count validation (§13.2).
Streaming is opt-in (memory/latency); buffered `[N:]` is the token-optimal default.

## 6. Delta — reuses Section 10a unchanged

A keyed map is a §10a keyed set whose identity is **the map key**. Delta requires **no new
grammar**; §10a is reused verbatim:

- `[N:]` is a **buffered full-payload form only**. Delta payloads use §10a's existing
  identity-column forms: `## added [N]{@key,...}` and `## changed [N]{@key,...}` (full member
  rows), `## removed [N]{@key}` (identity values, one per line — §10a.2's exact form). Deltas
  are a handful of rows, so `[N:]` compaction is irrelevant there.
- A **delta-participating full** keyed map carries the §10a.1 identity marking: `## [N:]{@key,...}`
  (the `@` on the key column names the identity; the `@` and `:` agree — both designate column 0)
  plus `key=<keyname>` in the header. A **non-delta** full keyed map is `## [N:]{key,...}` (no
  `@`, no header `key=`), exactly as non-delta arrays carry no `@id`.
- **pack_root** is §10a.3 as-is, with the map key as the identity field. Note: a keyed map and
  an identity-array with identical data compute the same §10a.3 root (the record form does not
  encode container type). This is benign: a producer/query returns a stable container shape, so
  base and new never cross map↔array. Modifying the frozen §10a.3 hash to add a container tag is
  not warranted for a theoretical collision, so it is left unchanged and noted here.
- §1.1 is preserved: the `:` keeps the map distinct from an array on the wire, so it decodes
  back to a map.

The only §10a edit is an informative note that a keyed-map full payload renders as `[N:]` while
its delta uses the identity-column forms.

## 7. Reference updates required in SPEC.md

- **§4:** the grammar productions in §3.5 above.
- **§7.1** root-value table: a root object satisfying 7.2a → `## [N:]{...}`.
- **§7.4.4 / §7.6:** the keyed-map attachment and expanded-item forms (§4 above).
- **§7.8** encoding summary: "Map of objects (losslessly tabular) → keyed tabular `[N:]`".
- **§7.10 / §7.11:** keyed-tabular selection is deterministic for eligible maps; smallest-form
  selection for value fields.
- **§8.2:** `[?:]` deferred keyed maps (§5 above).
- **§10a:** one informative note (§6 above); no normative change.
- **§13:** count validation for `[N:]` and `[?:]` (rows are members).
- **§16.2 / §16.4:** encoder MUST-emit / decoder MUST-accept for `[N:]` (incl. nested,
  streaming).
- **§16.5:** amend the `Invalid count` rule to accept the keyed `:` form; add keyed-map error
  rows (row-width mismatch, duplicate keys, <2 fields — mostly covered by existing rows).
- **§19.3:** version-history entry (§9 below).

## 8. Validation performed (pre-spec)

- **Marker collision:** the live gcf-go decoder rejects `[N:]` (`invalid_count`) — free to define.
- **Tokenization (43-tokenizer barrier study):** per-row delimiter is pipe (cleanest common
  delimiter); the `:` tokenizes standalone once per block; `[`/`]` already appear in every `[N]`
  header. Concrete boundaries confirm no merge.
- **Comprehension:** inherited from the array-tabular form by structural equivalence — header +
  pipe-row body byte-identical; the `:` is a decoder-only flag, comprehension-inert. No new
  comprehension measurement required to ship.
- **Token efficiency:** −39% vs sections, −23% vs minified JSON on a real-shaped id-keyed map;
  lossless round-trip verified.

## 9. Version history entry (for §19.3)

> **v3.5** added keyed-tabular map encoding (§7.2a): a JSON object whose values are all objects
> forming a losslessly-tabular set is encoded with the shared value fields declared once and one
> `key|values` row per member, marked by `[N:]`, first-class in nested (§7.4.4, §7.6) and
> streaming (`[?:]`, §8) positions and reusing §10a delta unchanged (the map key is the delta
> identity). This changes the canonical output for such maps from per-key section blocks to a
> keyed table. Existing payloads are unaffected (the `[N:]` marker was previously an invalid
> count; all other constructs decode identically); a pre-v3.5 decoder rejects `[N:]`, so decoders
> MUST be updated to read v3.5 map output. Additive under the Stable lifecycle.

## 10. Implementation order

Spec-first: (1) `SPEC.md` — §4 productions + §7.2a + reference updates + §19.3 + status → v3.5;
(2) conformance fixtures (§11 checklist); (3) `gcf-go`; (4) `gcf-typescript`, `gcf-python`,
`gcf-rust`, `gcf-swift`, `gcf-kotlin`, gated on fixtures.

## 11. Fixture / edge-case checklist

- flat uniform map (baseline); semi-uniform value objects (field union + `~`)
- value object with null field (`-`); empty value object among non-empty (all `~`)
- all-empty-value-object map → §7.2 fallback
- nested value via `^` attachment; via `^{fields}` inline schema; via `>` flattening;
  smallest-form selection verified
- nested value that is itself a keyed map → `.field [N:]{...}` attachment; `@N [M:]{...}` item
- key requiring quoting: numeric-like, boolean/null look-alike, empty string, containing `|`,
  leading `@`/`#`/`.` (all via §2.4)
- single-member map (`[1:]`); empty map → §7.7 (not `[0:]`)
- key-column label collision → `_key` deterministic
- root keyed map; named/nested keyed map
- streaming `[?:]` with trailer count; incremental decode; §8.3 value-schema-upfront path
- delta: full participating map `## [N:]{@key,...}` + `key=`; delta uses §10a forms
  (`## added/changed [N]{@key,...}`, `## removed [N]{@key}`); pack_root §10a.3; atomic apply
- decoder rejection: cell/field count mismatch; duplicate keys; `[N:]` with <2 fields; count
  mismatch
- round-trip `decode(encode(x)) == x`, order per §7.11
