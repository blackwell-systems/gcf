# Flatten Empty-Key Losslessness Fix (§7.4.6)

**Severity:** silent data corruption (round-trip invariant §1.1 violated). Present in **all six
SDKs** (gcf-go, gcf-typescript, gcf-python, gcf-rust runtime-confirmed; gcf-swift, gcf-kotlin
code-confirmed — same flatten logic). Found 2026-08-06 by the gcf-go fuzzer.
**Class:** bug fix (patch). Not a wire break — it turns corrupt output into correct output.

## 1. Repro

```
encodeGeneric( [ {"": {"": 0}} ] )
→  ## [1]{">"}
   0
decodeGeneric(...) →  [ {">": 0} ]     // ≠ input; silent corruption
```

Variants: `[{"a":{"":0}}]` → column `"a>"`; `[{"":{"b":0}}]` → `">b"`.

## 2. Root cause — an encoder/decoder contract mismatch

§7.4.6 flattening joins nested keys with `>` to form path columns (`customer>name`). Eligibility
guard §7.4.6.1.3 excludes keys **containing** `>`. But an **empty** key does not contain `>`, so
it slips the guard; joining `"" > ""` yields the path token `>`, emitted as column `">"`.

The decoder is already **correct and defensive**: it only treats a `>`-containing column as a
flattened path when *every* split segment is non-empty (a bare `>` splits to `["",""]`), and
otherwise treats the field name literally. So the encoder emits a path the decoder (rightly)
refuses to invert — they disagree. The fault is entirely encoder-side.

## 3. Fix — align encoder eligibility with the decoder's acceptance rule

A split segment is empty **iff** a key was empty or contained `>`. The existing guard covers
`>`; add empty. Then encoder-eligibility ⟺ decoder-acceptance, exactly.

### 3.1 SPEC §7.4.6.1 (encoder) — amend rule 7.4.6.1.3

> An encoder MUST NOT flatten a nested object into path columns if the field name, or any key
> along a flattened path, **contains `>` or is the empty string**. An empty key produces an empty
> path segment (a leading, trailing, or bare `>`) that a decoder treats as a literal field name,
> not a path column (§7.4.6.2). Such fields MUST use the attachment mechanism (§7.4.4) or an
> inline schema (§7.4.5).

### 3.2 SPEC §7.4.6.2 (decoder) — codify existing behavior

> A `>`-containing field name whose split on `>` yields any empty segment is **not** a path
> column; the decoder MUST treat the field name literally. A conformant encoder never emits such
> a column (§7.4.6.1); this makes decoding deterministic for non-conformant input.

Post-fix, an empty-key nested object encodes via attachment and round-trips (verified: it is the
current `NoFlatten` output for those fields).

## 4. Conformance fixtures (added first, red before code)

In `tests/conformance/flatten/` — capture the correct behavior and fail against the current
(buggy) encoder until each SDK is fixed:

- `020_no_flatten_empty_key_both` (encode) — `[{"":{"":0}}]` → attachment form
- `021_no_flatten_empty_key_trailing` (encode) — `[{"id":1,"m":{"":0}}]` → attachment
- `022_no_flatten_empty_key_leading` (encode) — `[{"":{"b":0}}]` → attachment
- `023_decode_gt_empty_segment_literal` (decode) — `## [1]{">"}` → `[{">":0}]` (locks the
  decoder's literal treatment across SDKs)

## 5. Rollout (spec-first)

1. **SPEC.md §7.4.6** — the two rule edits in §3 above.
2. **All 6 encoders** — add the empty-key exclusion beside the existing `contains('>')` check in
   the flatten-eligibility function (gcf-go `analyzeFlattenable`, gcf-rust `analyze_flattenable`,
   and the equivalents in ts/python/swift/kotlin).
3. **All 6 decoders** — *verify* the "path column ⟺ all segments non-empty" guard is present and
   consistent (gcf-go and gcf-swift confirmed; check ts/python/rust/kotlin), so `023` passes.
4. **Fixtures** — already added (§4); they gate the fix per SDK.

## 6. Versioning

Bug fix, patch-level per SDK. `GCF` wire prefix unchanged; no spec status change beyond the
§7.4.6 rule clarification (the spec was under-specified, not contradicted). Every previously
round-tripping payload is unaffected; only the previously-corrupt empty-key case changes (to
correct).
