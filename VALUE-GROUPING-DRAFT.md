# Value-grouping (columnar RLE) — spec draft

Status: draft, pre-merge. Comprehension-backed and scale-confirmed
(`eval/results/columnar-rle-comprehension.json`): dept-of-member grouped 100% at N=60 and N=200.
Ready to reconcile into SPEC.md Section 7. Author: Dayna Blackwell.

## Motivation

Positional-tabular GCF carries every column on every row. When one column is low-cardinality
(dept, status, kind, region), its value is repeated N times. Value-grouping emits that value once
per group and lists the group's members bare beneath it. Measured token savings vs flat tabular:
-8.8% at N=60, -14.6% at N=500. Comprehension-safe: grouping is a local, positional hierarchy a
model reads by proximity, not a reference lookup, so it holds where keyed-map and index/affix
indirection fail (dept-of-member 100% grouped across models including command-r and mistral-nemo,
which cratered on keyed-map).

## Grammar

A tabular section MAY be emitted grouped by exactly one eligible column. The section header
declares the grouping column with `group=<col>`; that column is omitted from the field list. The
body is a sequence of groups, each a subheader `<value> [<count>]` followed by that group's rows,
with the grouping column absent from each row.

```
## members [60]{id,name,level} group=dept
Sales [12]
u0001|Member 0001|1
u0006|Member 0006|1
...
Engineering [12]
u0002|Member 0002|2
...
```

ABNF sketch (to be reconciled with SPEC.md Section 7):

```
grouped-section = "## " [name SP] "[" count "]" field-decl SP "group=" key LF grouped-body
grouped-body    = 1*( group-subheader LF *tabular-row )
group-subheader = scalar SP "[" count "]"
```

The group-subheader value is an ordinary scalar governed by Sections 2.4/2.1 (quoted if it would
otherwise be ambiguous). The grouping column named in `group=` MUST NOT also appear in the
field-decl.

## Reconstruction (decoder)

For each group, every member row's `<col>` value is the group subheader's value. The decoder maps
each row's cells to the declared field-decl, then reinserts the grouping column. The reconstructed
array is the concatenation of groups in emission order.

## Losslessness and row order (the hard constraint)

Value-grouping **reorders rows** (it clusters them by the grouping value). It is therefore lossless
for the row-order dimension only when array order is **not semantic**, i.e. the array is a set of
records identified by a key, not a sequence whose position carries meaning (ranked lists, time
series, anything where "the 3rd element" matters).

- A conforming producer MUST NOT emit value-grouping for an array whose order is semantic.
- A decoder reconstructs in grouped (emission) order, which generally differs from the original
  array order. Consumers that need original order MUST NOT request value-grouping.

Full order-losslessness would require an explicit per-row order index, which defeats the token
saving; it is out of scope. Value-grouping targets keyed sets.

## Grouping-column field position (open question)

The field-decl omits the grouping column, so a record's object key order loses that column's slot.
Options, to decide before merge:

1. Encode the original position: `group=dept@2` (dept was field index 2). Decoder reinserts there.
   Fully preserves key order; small overhead.
2. Reinsert at a fixed position (end, or front). Simpler; changes key order of the grouped column.
3. Declare key order non-preserved for the grouped column.

Recommendation: option 1 (`group=<col>@<index>`) to keep round-trip key order lossless, consistent
with GCF's OrderedMap preservation elsewhere.

## Count validation

The sum of the per-group counts MUST equal the section count `[N]`. A decoder MUST reject a document
where they differ, consistent with SPEC Section 13 (declared-count enforcement, both directions).

## Eligibility (producer, opt-in)

- Exactly one grouping column, low cardinality relative to N.
- Array order non-semantic (a keyed set).
- Opt-in. Default emission stays flat positional-tabular; value-grouping is selected only when a
  producer (or `EncodeAuto`) determines the shape fits.

## Decoder support (NOT decoder-ignored)

Unlike the producer-side comprehension aids (labeled counts, re-anchor, flatten), which a plain
reader ignores, value-grouping changes the wire structure: a decoder MUST understand the `group=`
section form to parse it at all. This is a normative grammar extension requiring a version bump and
byte-identical implementation across all SDKs, not an opt-in knob.

## Comprehension backing

`eval/results/columnar-rle-comprehension.json`: dept-of-member flat 24/24 vs grouped 24/24 (100%
both) across frontier, mid, and the weak open-weight models; grouped failures limited to the total-
count question (sum of group headers), which per-group counts make trivial in exchange. Confirmed
at scale: grouped dept-of-member stays 100% at N=200 (groups ~40 deep, member far from its header),
including command-r and mistral-nemo.

## Order of work

Spec section (reconcile this with SPEC.md Section 7) -> conformance fixtures (grouped round-trip,
count-mismatch rejection, grouping-column reinsertion, order-semantics guard) -> Go SDK encoder +
decoder -> other 5 SDKs. Decoder support is required, so this is a version bump, not a silent
additive aid.
