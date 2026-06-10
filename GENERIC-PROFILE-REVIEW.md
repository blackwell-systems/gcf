# GCF Generic Profile Correctness Review

## Purpose

This review provides guidance for closing correctness and interoperability gaps
in the GCF generic profile. It focuses on the claim that GCF can act as a
drop-in, lossless representation of arbitrary JSON values.

The graph profile is not the subject of this review except where it shares
generic scalar or section grammar.

## Executive Summary

The generic profile has a strong structural design:

- field names are declared once for tabular records;
- primitive arrays are compact;
- nested records avoid repeated object syntax;
- semi-uniform records can retain a compact positional core;
- streaming counts are handled without buffering.

The remaining gaps are primarily grammar and type-preservation issues, not
fundamental format limitations. The highest-priority issue is that the current
scalar rules cannot distinguish some JSON strings from booleans, numbers, and
null. Several container forms also lack complete delimiter, nesting, and field
selection rules.

Before describing the generic profile as a lossless JSON replacement, the
specification should define:

1. a single scalar grammar used in every generic context;
2. unambiguous string quoting and escaping;
3. the complete JSON number grammar;
4. deterministic handling of uniform, semi-uniform, mixed, and nested arrays;
5. indentation and section ownership rules;
6. canonical ordering and field-union behavior;
7. cross-language conformance fixtures and property-based round-trip tests.

The recommended acceptance invariant is:

```text
decodeGeneric(encodeGeneric(value)) == value
```

for every value in the JSON data model, including a primitive at the document
root.

## Scope and Terminology

In this review, the JSON data model consists of:

- object;
- array;
- string;
- number representable by JSON;
- boolean;
- null.

"Lossless" means preserving JSON types, object membership, array ordering,
string contents, and numeric value. It does not require preserving source JSON
whitespace, escape spelling, duplicate object keys, or number lexeme spelling.
Those properties are not part of the parsed JSON data model.

"Canonical" means that conforming encoders produce one deterministic GCF
representation for the same parsed input value.

## Findings

### 1. Bare strings collide with typed literals

The current decoder rules assign types to these bare tokens:

| Token | Decoded type |
|---|---|
| `-` | null |
| `true` | boolean |
| `false` | boolean |
| `123` | number |
| `3.14` | number |

The current encoder rules otherwise permit strings to be emitted as bare text.
Consequently, JSON strings such as `"true"`, `"123"`, and `"-"` can decode as
different JSON types.

This is a direct violation of lossless round-trip behavior.

### Recommendation

Define a reserved-token rule. A string MUST be quoted when its unquoted form
would be interpreted as:

- null;
- a boolean;
- a number;
- an empty value;
- structural syntax in its current context.

For example:

```text
boolean_value=true
string_value="true"
number_value=123
numeric_string="123"
null_value=-
dash_string="-"
```

The quoting decision MUST be based on the decoder's scalar grammar, not a
separate list maintained by each encoder.

### 2. String escaping is incomplete and internally inconsistent

The specification requires strings containing newlines to be emitted with
`\n`, but the decoder error table only permits `\"` and `\\` escapes. It also
does not define carriage return, tab, backspace, form feed, or arbitrary
control-character handling.

The pipe example uses `\|`, while the prose says to escape `\` and `"`. It is
therefore unclear whether `\|` is a real escape sequence or whether quoting
alone protects a pipe.

### Recommendation

Use one JSON-compatible quoted-string grammar everywhere:

```text
quoted-string = DQUOTE { unescaped | escape } DQUOTE
escape        = "\" ( DQUOTE | "\" | "/" | "b" | "f" | "n" | "r" | "t"
                | "u" HEXDIG HEXDIG HEXDIG HEXDIG )
```

Recommended canonical encoder behavior:

- escape `"` as `\"`;
- escape `\` as `\\`;
- encode control characters using the standard short escape when available;
- encode remaining U+0000 through U+001F characters as `\u00XX`;
- emit UTF-8 directly for other Unicode characters;
- do not use `\|` or `\,`; quoting protects delimiters.

Remove `\|` from the canonical grammar. Quoting already protects a pipe, and a
second delimiter-specific escape adds complexity without preserving additional
information.

### 3. Primitive array delimiters are ambiguous

Primitive arrays use comma-separated values:

```text
tags[3]: production,us-east-1,critical
```

The specification does not define how to represent strings containing commas,
quotes, newlines, leading or trailing whitespace, or reserved typed literals.

### Recommendation

Apply the same scalar grammar to primitive-array elements and split only on
commas outside quoted strings:

```text
values[6]: alpha,"a,b","true",true,"",-
```

This decodes to:

```json
["alpha", "a,b", "true", true, "", null]
```

Primitive arrays MUST NOT use ad hoc escaping rules distinct from tabular rows
or key-value fields.

### 4. JSON number support is incomplete

The current decoder pattern only recognizes integers and ordinary decimal
fractions:

```text
^-?\d+(\.\d+)?$
```

Valid JSON numbers also include exponent notation. JSON disallows leading
zeroes, trailing decimal points, `NaN`, and infinities.

### Recommendation

Adopt the JSON number grammar:

```text
number = [ "-" ] int [ frac ] [ exp ]
int    = "0" | ( DIGIT1-9 { DIGIT } )
frac   = "." 1*DIGIT
exp    = ( "e" | "E" ) [ "+" | "-" ] 1*DIGIT
```

Examples:

```text
0
-0
12
-12.5
1e10
6.022E+23
1.0e-7
```

Encoders MUST reject non-JSON numeric values unless an application-specific
extension is explicitly enabled. The specification should state whether
negative zero must be preserved. If exact arbitrary-precision decimal
round-trip is required across languages, implementations should parse numbers
without routing them through binary floating point.

### 5. Uniformity detection does not fully define preservation

The current rule samples the first five elements and considers the array
uniform when those objects have at least 70% key overlap with the first object.
It does not define:

- which fields appear in the table header;
- what happens to keys found only after the sample;
- whether absent and explicit null are distinguishable;
- whether nested values count toward overlap;
- how empty objects affect eligibility;
- whether later low-overlap records invalidate the choice;
- the deterministic order of unioned fields.

A sampling heuristic can select an encoding strategy, but it cannot be allowed
to discard data.

### Recommendation

Separate correctness from optimization:

1. Inspect the entire array in buffered mode.
2. Compute an ordered union of all object keys.
3. Classify each key as scalar-only, nested-only, or mixed across records.
4. Preserve every key from every record.
5. Use `-` only for an absent or null value if those states are intentionally
   equivalent in the JSON data model.
6. Fall back to expanded per-item encoding when a compact table cannot preserve
   the input unambiguously.

For canonical ordering, use:

- keys from the first object in their input order;
- then newly observed keys in first-observed order.

If implementations use unordered object maps, the public API SHOULD permit a
canonical lexical-order mode. The conformance suite must state which ordering
is normative.

The 70% threshold can remain an encoder optimization, but it should only decide
between two lossless encodings. It MUST NOT decide which data is retained.

### 6. Null and missing fields are conflated

The current tabular rules encode both null and missing values as `-`.

For ordinary JSON serialization, a missing object member and a member whose
value is null are observably different:

```json
{}
```

is not equal to:

```json
{"value": null}
```

### Recommendation

Introduce distinct tokens:

```text
-   null
~   missing field
```

Example:

```text
## rows [2]{id,note}
1|-
2|~
```

This preserves:

```json
[
  {"id": 1, "note": null},
  {"id": 2}
]
```

If changing `-` semantics is considered too disruptive, retain `-` for null
and add a new missing marker. A quoted `"-"` remains the string value.

### 7. Mixed and nested arrays need a complete recursive model

The specification states that non-uniform arrays use `@{id}` per item, but it
does not fully define representation of:

- arrays containing both primitives and objects;
- arrays containing arrays;
- empty objects;
- empty nested arrays;
- arrays nested inside tabular records;
- a root-level array;
- a root-level primitive.

### Recommendation

Define one recursive expanded form for arrays that are not eligible for the
primitive-inline or tabular forms.

One possible design is:

```text
## mixed [5]
@0 =alpha
@1 =42
@2
  name=Alice
@3 []
  @0 =one
  @1 =two
@4 {}
```

The exact markers are open for design, but every item must carry an explicit
shape so a decoder never infers object, array, or primitive from indentation
alone.

An alternative is to define an internal tagged-value form:

```text
@0 scalar alpha
@1 scalar 42
@2 object
  name=Alice
@3 array [2]
  @0 scalar one
  @1 scalar two
@4 object
```

This is slightly larger but much easier to specify and implement consistently.
The compact forms remain available for common arrays.

### 8. Indentation and section ownership are not normative

Examples use two-space indentation, but the grammar does not define indentation
tokens, valid widths, nesting depth, dedent behavior, or ownership of nested
sections.

This affects nested objects and `.fieldname` attachments in tabular rows.

### Recommendation

Specify indentation precisely:

- indentation MUST use spaces, never tabs;
- one nesting level MUST be two spaces;
- indentation may increase by exactly one level at a time;
- a dedent closes all deeper containers;
- content following `@N` belongs to that item until the next item at the same
  level or the containing section ends;
- `.fieldname` is valid only beneath an `@N` record;
- duplicate sibling keys are an error;
- an unexpected indentation increase is an error.

The formal grammar should include indentation-aware productions or a separate
normative parsing algorithm. Plain context-free EBNF is insufficient if
indentation carries structure.

### 9. Keys and field names need an escaping model

The grammar currently treats keys and field names as identifiers. Arbitrary
JSON object keys can contain spaces, commas, braces, brackets, equals signs,
newlines, dots, and Unicode.

Without an escaping rule, the generic profile cannot encode every JSON object.

### Recommendation

Allow either bare or quoted keys:

```text
bare-key   = identifier-safe characters
quoted-key = quoted-string
```

Examples:

```text
normal=value
"content-type"=application/json
"a=b"=value
## "section with spaces"
## rows [1]{id,"display name","a,b"}
```

Field declarations must parse commas only outside quoted names. The same key
grammar should apply to:

- `key=value`;
- section names;
- field declarations;
- nested `.fieldname` references;
- inline array names.

### 10. Whitespace preservation is under-specified

Bare values may contain spaces, but it is unclear whether leading and trailing
spaces are preserved or trimmed. Empty strings are quoted, but strings
consisting only of spaces are not addressed.

### Recommendation

Canonical encoders MUST quote strings that:

- begin or end with whitespace;
- contain a line break or control character;
- collide with a typed literal;
- contain the active delimiter;
- contain `"`, `\`, or other structural syntax requiring escaping;
- are empty.

Decoders MUST preserve every code point inside quoted strings and MUST NOT trim
quoted values. Decoders may trim structural whitespace around unquoted tokens
only where the grammar explicitly permits it.

### 11. The generic profile has no profile discriminator

The graph profile begins with `GCF`, but the generic profile can begin directly
with a key-value pair or section. This makes profile selection dependent on
body-shape inference.

It also makes root primitives and some root arrays difficult to identify
without context-sensitive guesses.

### Recommendation

Require an explicit header for both profiles:

```text
GCF profile=generic
```

and:

```text
GCF profile=graph tool=context_for_task
```

The profile discriminator should be explicit and mandatory. This provides:

- unambiguous profile selection;
- a natural location for future encoding options;
- a clear root container boundary;
- consistent header parsing across profiles.

Root values can then use a reserved root binding:

```text
GCF profile=generic
_root="true"
```

or a dedicated root production. `_root` is illustrative; the final spelling
must not collide with user keys. A dedicated grammar production is preferable
to reserving an otherwise valid JSON key.

## Proposed Scalar Model

The generic profile should define one scalar parser used by:

- tabular cells;
- `key=value` values;
- primitive-array elements;
- expanded-array primitive items;
- root primitive values.

Recommended precedence:

1. If the token starts with `"`, parse a quoted string and require the closing
   quote to consume the complete scalar token.
2. If the token is `-`, decode null.
3. If the token is `~`, decode missing where that state is valid.
4. If the token is `true` or `false`, decode boolean.
5. If the token matches the complete JSON number grammar, decode number.
6. Otherwise decode a bare string.

The encoder then quotes a string whenever applying steps 2 through 5 would
change its type.

This symmetry is the simplest way to guarantee scalar round trips.

## Canonical Container Selection

For each array, a canonical buffered encoder should select the first applicable
form:

1. Empty array: explicit empty-array form.
2. All primitives: inline primitive array.
3. All objects and losslessly tabular: tabular form.
4. Otherwise: recursive expanded-array form.

"Losslessly tabular" should mean:

- every item is an object;
- the complete ordered field union is known;
- each scalar column can use the common scalar grammar;
- nested members have a defined attachment representation;
- missing members are distinct from null members;
- every member is emitted exactly once.

Streaming encoders cannot inspect the complete array. They should either:

- require a caller-provided schema;
- use expanded form;
- or buffer only the schema-discovery prefix and permanently fall back if a
  later row violates it.

A streaming encoder MUST NOT silently drop a newly observed field.

## Release Policy

The project has effectively no external users. Correctness and cross-language
determinism should take complete priority over preserving ambiguous v1.4
generic encodings.

The recommended policy is:

1. Correct the current specification in place before broader adoption.
2. Remove the `Stable` designation while the correction is underway.
3. Require an explicit `GCF profile=generic` or `GCF profile=graph` header.
4. Make the corrected behavior mandatory; do not define compatibility modes.
5. Update all official implementations and conformance fixtures in one
   coordinated release.
6. Replace existing generic fixtures and examples where their semantics are
   ambiguous or incorrect.
7. Republish packages with aligned versions only after the cross-language
   compatibility matrix passes.

The correction should include all known semantic changes together:

- distinct null and missing tokens;
- JSON-compatible scalar quoting and escapes;
- complete JSON number syntax;
- quoted arbitrary keys and field names;
- recursive mixed-array representation;
- normative indentation;
- complete field-union preservation;
- an explicit profile field in the common `GCF` header.

There is no benefit in publishing a GCF2 dialect solely to preserve a format
that has no meaningful installed base. Doing these changes piecemeal would
create transitional dialects and increase the cross-language compatibility
burden. Replace the incomplete grammar once, then stabilize it.

The final corrected release may retain the `GCF` prefix and use a revised v1
specification number. The wire prefix should only advance to `GCF2` for a
future post-adoption incompatibility.

## Conformance Plan

The current generic fixtures cover common encoding cases but do not establish
arbitrary JSON round-trip behavior. Add fixtures for at least the following.

### Scalar identity

- strings `"true"`, `"false"`, `"-"`, `"0"`, `"01"`, `"1.0"`, `"1e10"`;
- null, booleans, integers, decimals, and exponent numbers;
- negative zero if preserved;
- empty string and whitespace-only strings;
- leading and trailing spaces;
- quotes, backslashes, pipes, commas, equals signs, braces, and brackets;
- `\n`, `\r`, `\t`, backspace, form feed, and U+0000;
- non-ASCII and supplementary Unicode code points.

### Object keys

- empty key;
- numeric-looking key;
- keys containing spaces, commas, braces, equals signs, dots, quotes, and
  newlines;
- keys that differ only by case;
- nested objects with the same key at different levels.

### Arrays

- primitive arrays containing commas and reserved literals;
- mixed primitive types;
- mixed primitives and objects;
- nested arrays;
- empty nested arrays and empty objects;
- arrays with keys introduced after the fifth record;
- arrays where later records fall below the uniformity threshold;
- explicit null versus missing fields;
- nested members that vary by record.

### Document roots

- root object;
- root array;
- root string;
- root number;
- root boolean;
- root null.

### Invalid input

- trailing characters after a quoted scalar;
- invalid Unicode escape;
- isolated surrogate escape;
- invalid JSON number;
- malformed quoted key;
- delimiter inside an unquoted primitive-array string;
- illegal indentation increase;
- tab indentation;
- nested field without a parent row;
- duplicate sibling keys;
- declared field duplicated in a header;
- count mismatch at every container level.

## Verification Strategy

### 1. Shared fixture suite

Every official implementation must consume the same fixtures and produce:

- byte-exact canonical output for encoding tests;
- structural JSON equality for decoding tests;
- the same error category for invalid-input tests.

Error messages need not be byte-identical, but stable error codes should be
defined.

### 2. Property-based round-trip tests

Generate arbitrary bounded JSON values and verify:

```text
decodeGeneric(encodeGeneric(value)) == value
```

Useful generation controls:

- maximum depth;
- maximum array and object width;
- Unicode strings including delimiters and controls;
- adversarial scalar strings that resemble typed literals;
- mixed and semi-uniform arrays.

Run the same serialized corpus through all six implementations to detect
cross-language disagreement.

### 3. Differential testing

For a generated JSON corpus:

1. Encode with each implementation.
2. Compare canonical GCF bytes.
3. Decode every output with every other implementation.
4. Compare all results to the original parsed JSON.

With six implementations, this creates a 6x6 compatibility matrix and catches
cases where an encoder and its matching decoder share the same bug.

### 4. Fuzz decoders

Fuzz around:

- quote boundaries;
- escape sequences;
- indentation transitions;
- count declarations;
- field declarations;
- nested record ownership;
- very large counts and depths.

Set explicit implementation limits for maximum depth, line length, field count,
and declared count to avoid denial-of-service behavior.

## Documentation Changes

Once the design is accepted, update these surfaces together:

- `SPEC.md`;
- generic conformance fixtures;
- `docs/guide/format-overview.md`;
- `docs/reference/cheatsheet.md`;
- `docs/whitepaper.md`;
- API references for all six implementations;
- implementation READMEs;
- playground examples and validation behavior.

Avoid updating marketing claims before all official implementations pass the
expanded conformance suite.

The phrase "works on any JSON" should be replaced temporarily with a narrower
claim until arbitrary root values, keys, strings, numbers, and recursive arrays
are covered normatively and by tests.

## Recommended Delivery Sequence

1. Define the common scalar grammar and quote predicate.
2. Add scalar and key conformance fixtures before implementation changes.
3. Implement scalar fixes in all languages.
4. Define missing-versus-null behavior.
5. Define recursive mixed and nested array encoding.
6. Define indentation and ownership rules.
7. Replace sampling-based preservation decisions with complete field-union
   rules in buffered encoders.
8. Define the streaming fallback or caller-provided schema contract.
9. Add property-based and differential test infrastructure.
10. Add mandatory profile headers to both profiles.
11. Remove the current stable designation and publish the corrected v1 only
    after the compatibility matrix passes.

## Acceptance Criteria

The gaps can be considered closed when:

- every parsed JSON value has a normative GCF representation;
- no two distinct JSON scalar values share the same canonical GCF scalar;
- every container boundary and nesting relationship is syntactically
  deterministic;
- buffered encoders preserve every object member;
- streaming encoders cannot silently lose late fields;
- all official implementations produce compatible output;
- arbitrary JSON property tests pass across languages;
- malformed payloads fail consistently;
- inputs are explicitly profile-discriminated;
- no compatibility behavior weakens the corrected grammar.

At that point, the generic profile can credibly be described as a lossless,
token-efficient JSON translation layer, while the graph profile remains GCF's
main structural advantage over TOON and JSON.
