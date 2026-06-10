# GCF Specification

## Graph Compact Format: A Token-Optimized Wire Format for LLM Interactions

**Version:** 2.0

**Date:** 2026-06-10

**Status:** Stable

**Authors:** Dayna Blackwell, Blackwell Systems

**License:** MIT

---

## Normative References

**[RFC2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, March 1997.

**[RFC5234]** Crocker, D., Ed., and P. Overell, "Augmented BNF for Syntax Specifications: ABNF", STD 68, RFC 5234, January 2008.

**[RFC8259]** Bray, T., Ed., "The JavaScript Object Notation (JSON) Data Interchange Format", STD 90, RFC 8259, December 2017.

## Terminology and Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119] when they appear in all capitals.

All sections in this specification are normative unless explicitly marked informative.

## 1. Overview

GCF is a text-based, line-oriented wire format for encoding structured data in a token-efficient manner. It is designed for consumption by large language models (LLMs) operating under fixed token budgets.

GCF supports two encoding profiles:

- **Generic profile** (Section 7): Encodes arbitrary structured data (objects, arrays, nested records, mixed types) as a lossless, token-efficient alternative to JSON. 34% fewer tokens than TOON on mixed-structure benchmarks.
- **Graph profile** (Sections 4-6): Specialized encoding for code graph payloads (symbols, edges, distance groups) with local IDs and distance-based grouping. 79% fewer tokens than JSON at 500 symbols.

Both profiles share the same grammar primitives: `##` section headers, `@` local IDs, the common scalar grammar (Section 2), and the common key grammar (Section 2a). The savings come from eliminating three sources of waste: field name repetition (positional encoding), identifier repetition (local IDs), and per-record metadata (hierarchical grouping).

### 1.1 Lossless round-trip invariant

The generic profile preserves the JSON data model. A conforming implementation MUST satisfy:

```
decodeGeneric(encodeGeneric(value)) == value
```

for every value in the JSON data model (Section 1.2), where equality is structural: same types, same object membership, same array ordering, same string contents, same numeric value, same boolean value, same null.

Preserved properties: JSON types, object key membership, object key ordering (input order), array element ordering, string contents (every code point), numeric value, boolean value, null identity.

Not preserved (not part of the parsed JSON data model): source JSON whitespace, escape spelling (e.g. `\u0041` vs `A`), duplicate object keys (rejected; see Section 2a), number lexeme spelling (e.g. `1.0` vs `1` vs `1.00`).

### 1.2 JSON data model

This specification encodes the JSON data model as defined by [RFC8259]:

- object (unordered collection of name/value pairs with unique string keys);
- array (ordered sequence of values);
- string (sequence of Unicode code points);
- number (as representable by JSON);
- boolean (`true` or `false`);
- null.

## 2. Common Scalar Grammar

GCF defines one scalar grammar used in every value context:

- tabular cells (pipe-separated values in generic rows);
- `key=value` right-hand sides;
- primitive-array elements (comma-separated inline values);
- expanded-array primitive items;
- root scalar values (`=value`).

### 2.1 Scalar parsing precedence

A decoder MUST parse a scalar token using the following precedence, applying the first matching rule:

1. **Quoted string.** If the token starts with `"` (U+0022), parse a quoted string (Section 2.2). The closing `"` MUST consume the complete scalar token; trailing characters after the closing quote are an error.

2. **Null.** If the token is exactly `-`, decode as JSON null.

3. **Missing.** If the token is exactly `~`, decode as absent. This token is valid ONLY in tabular row cells where a declared union field is absent from the source object (Section 7.4). The `~` token MUST NOT appear in `key=value` lines, primitive arrays, expanded-array items, or root values. A decoder encountering `~` outside a tabular row cell MUST reject the input.

4. **Attachment.** If the token is exactly `^`, decode as an attachment reference. This token is valid ONLY in a tabular row cell and MUST have exactly one matching nested attachment beneath that row (Section 7.4.4). A decoder encountering `^` in any other context, or without a matching attachment, MUST reject the input.

5. **Boolean.** If the token is exactly `true` or `false`, decode as the corresponding JSON boolean.

6. **Number.** If the token matches the JSON number grammar (Section 2.3), decode as a JSON number.

7. **Bare string.** Otherwise, decode as a JSON string. Leading and trailing whitespace in unquoted values is structural (belongs to the surrounding delimiter grammar) and MUST NOT be included in the decoded string.

### 2.2 Quoted strings

Quoted strings use the JSON string grammar from [RFC8259]:

```
quoted-string  = DQUOTE *char DQUOTE
char           = unescaped / escape
unescaped      = %x20-21 / %x23-5B / %x5D-D7FF / %xE000-10FFFF
escape         = "\" ( DQUOTE / "\" / "/" / "b" / "f" / "n" / "r" / "t"
               / unicode-escape )
unicode-escape = "u" 4HEXDIG
```

Canonical encoder behavior:

- Escape `"` as `\"`.
- Escape `\` as `\\`.
- Encode control characters U+0000 through U+001F using the standard short escape when one exists (`\b`, `\f`, `\n`, `\r`, `\t`), otherwise as `\u00XX`.
- Emit all other Unicode code points as literal UTF-8.
- Do NOT use `\|` or `\,`. Quoting protects delimiters; delimiter-specific escapes are not part of the grammar.

Literal UTF-8 MUST contain Unicode scalar values only. Code points U+D800 through U+DFFF are not Unicode scalar values and MUST NOT appear literally.

Decoders MUST reject malformed UTF-8 before applying the string grammar.

For `\uXXXX` escapes:

- a non-surrogate code unit decodes directly to that code point;
- a high surrogate (`\uD800` through `\uDBFF`) MUST be followed immediately by a low surrogate (`\uDC00` through `\uDFFF`), and the pair decodes to one supplementary scalar value;
- an isolated high surrogate, isolated low surrogate, or malformed pair is an error.

### 2.3 JSON number grammar

GCF adopts the JSON number grammar from [RFC8259]:

```
number = [ "-" ] int [ frac ] [ exp ]
int    = "0" / ( DIGIT1-9 *DIGIT )
frac   = "." 1*DIGIT
exp    = ( "e" / "E" ) [ "+" / "-" ] 1*DIGIT
```

Valid examples: `0`, `-0`, `12`, `-12.5`, `1e10`, `6.022E+23`, `1.0e-7`.

Invalid (MUST NOT be emitted by encoders as numbers): leading zeros (`01`, `00.5`), trailing decimal point (`1.`), leading decimal point (`.5`), `NaN`, `Infinity`, `+1`.

Tokens that do not match this grammar in their entirety fall through to bare string (precedence rule 7). Thus an unquoted token such as `01` decodes as the string `"01"`, not as a number and not as an error.

### 2.3.1 Canonical number formatting

Conforming encoders MUST emit numbers in canonical form to ensure bit-for-byte deterministic output:

- Zero is emitted as `0`; negative zero is emitted as `-0` when the source numeric model distinguishes it.
- For non-zero values where `1e-6 <= abs(value) < 1e21`, emit plain decimal notation.
- For non-zero values outside that range, emit normalized exponent notation using lowercase `e`, exactly one digit before the decimal point, no trailing fractional zeroes, an explicit exponent sign, and no leading exponent zeroes (for example `1.25e+21`, `4e-7`).
- Plain decimals MUST have no leading zeroes except the single zero before a fractional point, and MUST have no trailing fractional zeroes.
- Encoders MUST emit enough digits to preserve the exact value in their documented JSON numeric domain.

Two conforming encoders given the same parsed numeric value MUST produce the same byte sequence.

### 2.3.2 Numeric domain and precision

Implementations MUST document their supported numeric domain. A decoder that cannot represent an input number exactly in that domain MUST return an out-of-range error or an exact numeric/string representation exposed by its API; it MUST NOT silently return an approximate value. Non-finite host values are outside the JSON data model and encoders MUST reject them unless host-value normalization converts them before GCF encoding.

### 2.4 Encoder quoting obligation

An encoder MUST quote a string value when its bare form would be parsed as a non-string type by the scalar precedence rules. Specifically, a string MUST be quoted when:

- it equals `-` (would decode as null);
- it equals `~` or `^` (reserved tabular cell markers);
- it equals `true` or `false` (would decode as boolean);
- it matches the JSON number grammar (would decode as number);
- it is numeric-like: after an optional leading `+` or `-`, it begins with a digit, or it begins with `.` followed by a digit;
- it is empty (zero length);
- it begins or ends with whitespace;
- it begins with `#` or `@` (would collide with comment or row-ID syntax in positional contexts);
- it contains `"`, `\`, or a control character (U+0000 through U+001F);
- it contains the active context delimiter: `|` in tabular rows, `,` in primitive arrays;
- it contains `\n` (newline) or `\r` (carriage return).

An encoder MUST NOT quote numbers or booleans. An encoder MUST NOT quote null (null is always bare `-`). The strings `"~"` and `"^"` MUST be quoted in every context, even though their bare tokens are only structural inside tabular rows.

## 2a. Common Key Grammar

Object keys and field names share one grammar, used in:

- `key=value` left-hand sides;
- `##` section names;
- field declarations in tabular headers (`{field1,field2}`);
- `.field` attachment names;
- inline array names (`name[N]: ...`).

### 2a.1 Bare and quoted keys

```
key        = bare-key / quoted-key
bare-key   = ( ALPHA / "_" ) *( ALPHA / DIGIT / "_" )
quoted-key = quoted-string
```

Where `ALPHA` is `[a-zA-Z]` and `quoted-string` is defined in Section 2.2.

A key MUST be quoted when it is not a valid bare-key. This includes keys containing spaces, commas, braces, brackets, equals signs, pipes, dots, newlines, quotes, backslashes, or any character outside the bare-key set.

Examples:

```
normal=value
"content-type"=application/json
"a=b"=value
"with spaces"=value
""=value
```

### 2a.2 Duplicate keys

Object keys MUST be unique within their scope. An encoder MUST NOT emit duplicate keys within the same object. A decoder MUST reject objects containing duplicate keys at the same nesting level.

In tabular field declarations, field names MUST be unique. A decoder MUST reject a field declaration containing duplicate field names.

### 2a.3 Field declarations with quoted names

Field declarations in tabular headers parse commas only outside quoted names:

```
## rows [2]{id,"display name","a,b",score}
1|Alice|test|95
2|Bob|other|88
```

## 3. Header

Every GCF payload MUST begin with a header line. The header identifies the format and the encoding profile.

```
header = "GCF" SP "profile=" profile *( SP header-pair )
```

### 3.1 Profile discriminator

The `profile` field is REQUIRED and MUST be the first key-value pair after `GCF`. Valid values:

| Value | Profile |
|-------|---------|
| `generic` | Generic profile (Section 7) |
| `graph` | Graph profile (Sections 4-6) |

Header field names MUST be unique. The `profile` field MUST NOT appear again later in the header. Decoders MUST reject duplicate header fields.

### 3.2 Graph profile header

```
GCF profile=graph tool=context_for_task budget=5000 tokens=1847 symbols=10 edges=8
```

#### Required fields (graph profile)

| Field | Type | Description |
|-------|------|-------------|
| `profile` | string | MUST be `graph` |
| `tool` | string | Name of the tool that produced this response |

#### Optional fields (graph profile)

| Field | Type | Description |
|-------|------|-------------|
| `budget` | integer | Token budget requested by the consumer |
| `tokens` | integer | Actual tokens used in this payload |
| `symbols` | integer | Number of symbols in this payload |
| `edges` | integer | Number of edges in this payload |
| `pack_root` | string | Content-addressed identity (hex hash) for deduplication and delta encoding |
| `session` | boolean | `true` if session statefulness is active |
| `delta` | boolean | `true` if this is a delta payload (Section 10) |
| `unchanged` | boolean | `true` if the consumer's prior `pack_root` still identifies the current result |
| `base_root` | string | Pack root of the prior payload (delta mode only) |
| `new_root` | string | Pack root of the current payload (delta mode only) |
| `savings` | string | Token savings percentage (delta mode only, e.g. `81%`) |

### 3.3 Generic profile header

```
GCF profile=generic
```

#### Required fields (generic profile)

| Field | Type | Description |
|-------|------|-------------|
| `profile` | string | MUST be `generic` |

#### Optional fields (generic profile)

| Field | Type | Description |
|-------|------|-------------|
| `tool` | string | Name of the tool that produced this response |
| `tokens` | integer | Actual tokens used in this payload |

## 4. Formal Grammar

```
payload             = header LF ( graph-body / generic-body )
header              = "GCF" SP "profile=" profile *( SP header-pair )
profile             = "generic" / "graph"
header-pair         = header-key "=" header-value
header-key          = ( ALPHA / "_" ) *( ALPHA / DIGIT / "_" )
header-value        = 1*( %x21-7E )  ; printable non-whitespace ASCII

; --- Graph body ---
graph-body          = *( graph-section ) [ metadata-summary ]
graph-section       = group-header LF *( graph-line LF )
graph-line          = node-line / edge-line / ref-line / delta-symbol-line
                    / delta-edge-line / comment
metadata-summary    = "##!" SP "summary" *( SP header-pair ) LF

; --- Generic roots ---
generic-body        = ( root-scalar / root-array / root-object )
                      [ metadata-summary ]
root-scalar         = "=" scalar LF
root-array          = anonymous-array
root-object         = *( object-member )

; --- Generic objects ---
object-member       = kv-line / object-section / named-array / comment-line
kv-line             = key "=" scalar LF
object-section      = "##" SP key LF indented-object-body
indented-object-body = *( INDENT object-member )

; --- Generic arrays ---
named-array         = inline-array / array-block
anonymous-array     = anonymous-inline-array / anonymous-array-block
anonymous-inline-array = "##" SP count-bracket ":" [ SP scalar-list ] LF
anonymous-array-block = "##" SP count-bracket [ field-decl ] LF array-body
array-block         = "##" SP key SP count-bracket [ field-decl ] LF array-body
inline-array        = key count-bracket ":" [ SP scalar-list ] LF
array-body          = tabular-body / expanded-body / empty
tabular-body        = 1*( tabular-row *( INDENT attachment ) )
tabular-row         = [ "@" id SP ] cell *( "|" cell ) LF
cell                = scalar / "~" / "^"
expanded-body       = 1*( expanded-item )
expanded-item       = primitive-item / object-item / array-item
primitive-item      = "@" id SP "=" scalar LF
object-item         = "@" id SP "{}" LF *( INDENT object-member )
array-item          = "@" id SP count-bracket [ field-decl ]
                      [ ":" [ SP scalar-list ] ] LF
                      [ INDENT array-body ]

; --- Tabular attachments ---
attachment          = object-attachment / array-attachment
object-attachment   = "." key SP "{}" LF *( INDENT object-member )
array-attachment    = "." key SP count-bracket [ field-decl ]
                      [ ":" [ SP scalar-list ] ] LF
                      [ INDENT array-body ]

; --- Shared array syntax ---
count-bracket       = "[" count-or-deferred "]"
count-or-deferred   = count / "?"
field-decl          = "{" field-name *( "," field-name ) "}"
scalar-list         = scalar *( "," scalar )

; --- Scalars (Section 2) ---
scalar              = quoted-string / "-" / "true" / "false" / number
                    / bare-string
quoted-string       = DQUOTE *char DQUOTE
char                = unescaped / escape
unescaped           = %x20-21 / %x23-5B / %x5D-D7FF / %xE000-10FFFF
escape              = "\" ( DQUOTE / "\" / "/" / "b" / "f" / "n" / "r" / "t"
                    / unicode-escape )
unicode-escape      = "u" 4HEXDIG
number              = [ "-" ] int [ frac ] [ exp ]
int                 = "0" / ( DIGIT1-9 *DIGIT )
frac                = "." 1*DIGIT
exp                 = ( "e" / "E" ) [ "+" / "-" ] 1*DIGIT
bare-string         = <text not matching any preceding scalar rule>

; --- Keys (Section 2a) ---
key                 = bare-key / quoted-key
bare-key            = ( ALPHA / "_" ) *( ALPHA / DIGIT / "_" )
quoted-key          = quoted-string
field-name          = key

; --- Graph-specific ---
group-header        = "##" SP group-name [ SP count-bracket [ field-decl ] ]
node-line           = "@" id SP kind SP qname SP score SP provenance
edge-line           = "@" target-id "<" "@" source-id SP edge-type [ SP status ]
ref-line            = "@" id SP SP "# previously transmitted"
delta-symbol-line   = kind SP qname
delta-edge-line     = qname SP "->" SP qname SP edge-type
id                  = 1*DIGIT
target-id           = id
source-id           = id
count               = "0" / ( DIGIT1-9 *DIGIT )
kind                = "fn" / "type" / "method" / "iface" / "var" / "const"
                    / "resource" / "table" / "class" / "selector" / "field"
                    / "route" / "ext" / "file" / "pkg" / "svc"
qname               = 1*( %x21-7E )
score               = [ "-" ] 1*DIGIT "." 2DIGIT
provenance          = 1*( %x21-7E )
edge-type           = 1*( %x21-7E )
status              = "added" / "removed"
group-name          = "targets" / "related" / "extended" / "edges"
                    / ( "distance_" 1*DIGIT )
                    / "removed" / "added" / "edges_removed" / "edges_added"
                    / bare-key

; --- Lexical and indentation notation ---
comment             = "#" SP *VCHAR
comment-line        = comment LF
INDENT              = SP SP
DIGIT1-9            = %x31-39
empty               = ""
```

Line terminator is `LF` (U+000A). Encoders MUST use `LF`. Decoders MUST tolerate trailing `\r` (CRLF input).

`INDENT` in the grammar means that every line in the referenced production is prefixed by exactly one additional two-space indentation unit. Because ABNF does not maintain an indentation stack, Section 4.1 is the authoritative parsing algorithm for nesting and dedent behavior.

### 4.1 Indentation

Indentation is normative and carries structure.

- Indentation MUST use spaces (U+0020), never tabs.
- One nesting level is exactly two spaces.
- Indentation may increase by exactly one level at a time. An increase of two or more levels is an error.
- A dedent (decrease in indentation) closes all containers deeper than the new level.
- Content following `@N` belongs to that item until the next item at the same or lesser indentation level, or until the containing section ends.
- `.field` attachment lines are valid only beneath an `@N` tabular row containing a matching `^` cell.
- An unexpected indentation increase (not preceded by a container-opening production) is an error.
- Tab characters (U+0009) in leading whitespace are an error.

### 4.2 Structural whitespace

- Encoders MUST NOT emit blank lines, trailing whitespace, or whitespace around `=`, `|`, or `,` delimiters.
- Encoders MUST emit exactly one ASCII space after `:` when an inline array has one or more values, and no characters after `:` when it has zero values.
- Decoders MUST ignore completely blank lines after the header.
- Decoders MUST trim ASCII space and tab surrounding unquoted scalar tokens after splitting on the applicable delimiter.
- Decoders MUST NOT trim or normalize any character inside a quoted string.
- Spaces inside a safe bare string are data except for leading and trailing structural whitespace.
- Tabs are forbidden only in leading indentation. A tab inside a quoted string is data and uses the `\t` escape in canonical output.

## 5. Node Lines (Graph Profile)

*Sections 5, 6, and 6a define the graph profile. Implementations that only support the generic profile (Section 7) may skip these sections. The two profiles share the common scalar grammar (Section 2), key grammar (Section 2a), and header (Section 3).*

```
@{id} {kind} {qualified_name} {score} {provenance}
```

Fields are positional, separated by whitespace. No field names, no delimiters, no quoting.

- **id**: Non-negative integer identifying the symbol. When `session` is absent or false, IDs MUST be unique within the payload and assigned sequentially starting from 0. When `session=true`, IDs are stable within the session, MUST remain bound to the same symbol across calls, and need not be contiguous within an individual payload.
- **kind**: Abbreviated node type (see Kind Abbreviations).
- **qualified_name**: Full identifier. MUST NOT contain whitespace.
- **score**: Relevance score as a decimal float (e.g., `0.78`). Encoders MUST emit exactly 2 decimal places.
- **provenance**: Discovery method (e.g., `lsp_resolved`, `ast_inferred`). MUST NOT contain whitespace.

### Kind Abbreviations

| Abbreviation | Full form |
|-------------|-----------|
| `fn` | function |
| `type` | type |
| `method` | method |
| `iface` | interface |
| `var` | var |
| `const` | const |
| `resource` | resource |
| `table` | table |
| `class` | class |
| `selector` | selector |
| `field` | field |
| `route` | route_handler |
| `ext` | external |
| `file` | file |
| `pkg` | package |
| `svc` | service |

Implementations MAY extend this table. Decoders MUST pass unknown abbreviations through verbatim without error.

## 6. Edge Lines (Graph Profile)

```
@{target}<@{source} {edge_type} [{status}]
```

- The `<` arrow points toward the target. `@0<@4 calls` means "symbol @4 calls symbol @0."
- **edge_type**: Relationship type (e.g., `calls`, `imports`, `implements`). Unrestricted.
- **status**: Optional. `added` or `removed` for diff payloads.

Source and target IDs MUST reference symbols declared earlier in the payload. Encoders MUST NOT emit edges referencing undeclared IDs. Decoders MUST reject edges with unknown IDs.

## 6a. Group Headers (Graph Profile)

```
## targets
## related
## extended
## edges [N]
## distance_N
```

Group headers partition the payload into semantic sections. The group a node appears in encodes its distance from the query center:

| Group | Distance | Meaning |
|-------|----------|---------|
| `targets` | 0 | Direct matches for the query |
| `related` | 1 | One hop away from targets |
| `extended` | 2+ | Broader structural context |
| `edges [N]` | n/a | Relationship section (contains edge lines); `N` is the edge count |
| `distance_N` | N | Explicit distance for N > 2 |

Group headers eliminate per-node distance fields. One header replaces N repeated fields. The `[N]` suffix on the edges header provides an explicit count, enabling LLMs to verify edge totals without scanning.

## 7. Generic Profile

The generic profile encodes arbitrary JSON values as token-efficient GCF. It shares the common scalar grammar (Section 2), key grammar (Section 2a), and header (Section 3) with the graph profile.

### 7.1 Root value representation

After the header line `GCF profile=generic`, the body encodes exactly one JSON value. The encoding form depends on the value's type:

| Root type | Encoding |
|-----------|----------|
| Object | Key-value lines and `##` section blocks |
| Array | Anonymous array header (Section 7.3-7.6) |
| Scalar (string, number, boolean, null) | `=` followed by the scalar value |

#### Root object

```
GCF profile=generic
name=Alice Smith
age=30
active=true
```

#### Root array

```
GCF profile=generic
## [3]{id,name,score}
1|Alice|95
2|Bob|88
3|Carol|91
```

#### Root scalar

```
GCF profile=generic
=42
```

```
GCF profile=generic
="hello world"
```

```
GCF profile=generic
=true
```

```
GCF profile=generic
=-
```

Root syntax is structural rather than key-based. Therefore every JSON string remains available as a user object key, including `_root`, `_summary`, and any other underscore-prefixed key.

### 7.2 Object encoding

JSON objects are encoded as a sequence of key-value lines and section blocks. Primitive fields use `key=value`. Nested objects use `## key` section headers with indented content. Nested arrays use the appropriate array form.

```
GCF profile=generic
config=production
version=2.1.0
## database
  host=db.example.com
  port=5432
  pool_size=10
## cache
  ttl=3600
  max_size=1000
```

Key ordering: encoders MUST emit keys in the order they appear in the input. When the input representation does not provide encounter order, encoders MUST order keys lexicographically by Unicode code point.

### 7.3 Array encoding: selection rules

For each array, a buffered encoder MUST select the first applicable encoding form:

1. **Empty array**: `## name [0]` (Section 7.7).
2. **All primitives**: Inline primitive array (Section 7.5).
3. **All objects with a non-empty field union, losslessly tabular**: Tabular form (Section 7.4).
4. **Otherwise**: Expanded per-item form (Section 7.6).

The header determines the body grammar:

- a header followed by `:` on the same line is an inline primitive array;
- a block header with a field declaration (`{...}`) has a tabular body;
- a non-empty block header without a field declaration has an expanded body;
- a `[0]` block header has no body.

Decoders MUST NOT infer or switch body forms from individual data lines.

"Losslessly tabular" means:

- every element is a JSON object;
- the complete field union contains at least one field;
- the complete ordered field union is computed from ALL elements (not a sample);
- each field value in every element is either a scalar or uses the attachment marker and attachment syntax defined in Section 7.4.4;
- every field from every element is preserved in the encoding;
- absent fields are distinguishable from null fields (Section 7.4.2).

All-object arrays with a non-empty field union MUST use tabular form. An array consisting only of empty objects uses expanded form because a zero-column tabular row has no line representation. The key-overlap heuristic from prior versions is removed.

### 7.4 Tabular encoding

Arrays of objects with shared structure use tabular encoding: a header declaring field names, followed by positional rows.

#### 7.4.1 Tabular header

```
## {name} [{count}]{field1,field2,field3}
```

The header declares the section name, exact record count, and the ordered field union. Field names use the common key grammar (Section 2a); commas are parsed only outside quoted field names.

Example:

```
## employees [3]{id,name,department,salary}
1|Alice Smith|Engineering|95000
2|Bob Jones|Sales|72000
3|Carol Wu|Marketing|85000
```

#### 7.4.2 Null versus missing

In tabular rows, two distinct tokens represent absence:

| Token | Meaning | JSON equivalent |
|-------|---------|-----------------|
| `-` | Explicit null | `"field": null` |
| `~` | Field absent from source object | key not present |

Example:

```
## rows [2]{id,note,tag}
1|-|active
2|hello|~
```

Decodes to:

```json
[
  {"id": 1, "note": null, "tag": "active"},
  {"id": 2, "note": "hello"}
]
```

The `~` token is valid ONLY in tabular row cells. It MUST NOT appear in any other context.

#### 7.4.3 Field union computation

For tabular encoding, the encoder MUST compute the ordered field union as follows:

1. Begin with the keys of the first object, in their input order.
2. For each subsequent object, append any newly observed keys in their input order.
3. The resulting ordered list becomes the field declaration.

Every key from every object in the array MUST appear in the field declaration. The encoder MUST NOT sample a subset of elements to determine the field list.

When encoding values:
- If a field is present in the source object with value `null`, emit `-`.
- If a field is absent from the source object, emit `~`.

#### 7.4.4 Nested fields in tabular rows

When tabular records contain nested objects or arrays, the complete field union remains in the header and every row retains one cell per declared field. A nested value is represented by the `^` attachment marker in its cell. The attached value appears beneath the row using the same field name.

```
## orders [2]{id,total,status,customer,tags}
@0 1001|249.99|shipped|^|^
  .customer {}
    name=Alice Smith
    tier=premium
  .tags [2]: express,gift
@1 1002|89.50|pending|^|~
  .customer {}
    name=Bob Jones
    tier=standard
```

Attachment forms:

| Form | Meaning |
|------|---------|
| `.field {}` | Object attachment; object members, if any, are indented beneath it |
| `.field [N]: values` | Inline primitive-array attachment |
| `.field [N]{fields}` | Tabular array attachment; rows are indented beneath it |
| `.field [N]` | Expanded array attachment; items are indented beneath it |

Array attachments use the same header-to-body rules as ordinary arrays in Section 7.3.

Rules:

- A row containing one or more `^` cells MUST have an `@{id}` prefix.
- When present, the row ID MUST equal the row's zero-based index within the containing array.
- Each `^` cell MUST have exactly one attachment beneath the row with the same decoded field name.
- An attachment MUST correspond to a `^` cell. Attachments for scalar, null, or missing cells are errors.
- Attachment field names MUST be unique within a row.
- A field may be scalar in one record and nested in another. The scalar record emits its scalar directly; the nested record emits `^` and an attachment.
- Empty objects use `.field {}` with no indented members.
- Empty arrays use `.field [0]`.

Content following `@N` belongs to that item until the next `@N` at the same indentation level or until the section ends.

### 7.5 Primitive array encoding (inline)

Arrays where every element is a primitive (string, number, boolean, null) are encoded inline:

```
tags[3]: production,us-east-1,critical
ports[3]: 8080,8443,9090
flags[2]: true,false
```

Format: `name[count]: value1,value2,...`

At the root, omit the name and use an anonymous array header:

```
GCF profile=generic
## [3]: production,us-east-1,critical
```

Values are comma-separated with no spaces. Each element uses the common scalar grammar (Section 2). Elements containing commas MUST be quoted:

```
values[6]: alpha,"a,b","true",true,"",-
```

Decodes to:

```json
["alpha", "a,b", "true", true, "", null]
```

The comma delimiter is parsed only outside quoted strings. A decoder MUST NOT split on commas inside quoted values.

Encoders MUST use inline encoding for arrays where all elements are primitives. Encoders MUST NOT use inline encoding for arrays containing objects or nested arrays. Empty arrays MUST use `## name [0]`.

### 7.6 Expanded per-item encoding (mixed and nested arrays)

Arrays that are not eligible for inline primitive or tabular encoding use expanded per-item form. Each element carries an explicit `@{id}` and type marker:

```
## items [5]
@0 =alpha
@1 =42
@2 {}
  name=Alice
  role=admin
@3 [2]: one,two
@4 {}
```

Type markers:

| Form | Meaning |
|------|---------|
| `@N =scalar` | Primitive value (parsed by scalar grammar) |
| `@N {}` | Object; object members, if any, are indented beneath it |
| `@N [M]: values` | Nested primitive array |
| `@N [M]{fields}` | Nested tabular array; rows are indented beneath it |
| `@N [M]` | Nested expanded array; items are indented beneath it |

Rules:

- Every element MUST have an `@{id}` prefix with a sequential zero-based ID.
- The ID MUST equal the element's zero-based index within the containing array.
- Primitive elements use `=` followed by the scalar value on the same line.
- Object elements use `{}` on the `@N` line. Their members, if any, are indented below. No indented members means an empty object.
- Nested arrays carry their own count bracket and optional field declaration on the `@N` line. Their content follows the same selection rules recursively.
- Empty nested arrays use `@N [0]`.
- A nested array of primitives MUST use the inline form on the item line.
- A nested all-object array MUST use tabular form.

IDs within expanded arrays are scoped to their containing array. Nested arrays start their own ID sequence from 0.

### 7.7 Empty containers

| Container | Encoding |
|-----------|----------|
| Empty array | `## name [0]` |
| Empty object (standalone) | `## name` followed by no content |
| Empty object (in expanded array) | `@N {}` |
| Empty array (in expanded array) | `@N [0]` |
| Empty root object | Header line only (no body content) |
| Empty root array | `## [0]` |

### 7.8 Encoding rules summary

| Input type | Encoding |
|-----------|----------|
| Object (root or nested) | `key=value` for scalars, `## key` for nested objects, array forms for nested arrays |
| Array of uniform objects | Tabular: header with field declaration + positional pipe-separated rows |
| Array of primitives | Inline: `name[count]: val1,val2,val3` |
| Array of mixed items | Expanded: `## name [count]` + `@{id}` per item with type markers |
| Nested value in tabular row | `^` cell + matching `.field` attachment |
| Null value | `-` |
| Missing field (tabular only) | `~` |
| Empty string | `""` |
| Empty array | `## name [0]` |
| Empty object | `## name` (no content) or `@N {}` in expanded form |

### 7.9 Value encoding summary

| Value type | Encoding | Example |
|-----------|----------|---------|
| String (safe bare) | Bare text | `Alice Smith` |
| String (requires quoting) | Quoted | `"true"`, `"123"`, `"-"`, `""`, `"a,b"` |
| Number (integer) | Unquoted | `95000` |
| Number (decimal) | Unquoted | `3.14` |
| Number (exponent) | Unquoted | `6.022e+23` |
| Boolean | Lowercase literal | `true`, `false` |
| Null | Dash | `-` |
| Missing (tabular only) | Tilde | `~` |

### 7.10 Tabular eligibility

In buffered mode, an array is eligible for tabular encoding when every element is a JSON object and the complete field union is non-empty. The encoder MUST inspect all elements, compute the complete field union, and preserve every field. Arrays containing any primitive or array element, and arrays consisting only of empty objects, use expanded form. Streaming mode has the schema-availability exception defined in Section 8.3.

### 7.11 Canonical encoding rules

#### Object key ordering

Canonical encoders MUST emit object keys in the order they appear in the input value. When the input representation does not provide encounter order, encoders MUST order keys lexicographically by Unicode code point.

#### Tabular field ordering

The field declaration in tabular headers MUST follow the field union computation (Section 7.4.3): first object's keys in input order, then newly observed keys in first-observed order.

#### Container selection

Canonical buffered encoders MUST select container encoding using Section 7.3 rules. The selection is deterministic: same input produces the same encoding form.

### 7.12 Metadata isolation

GCF does not reserve any JSON object key or key prefix. Format metadata uses syntax that cannot be produced by the common key grammar. The streaming trailer begins with `##! summary` (Section 8.4), while generic section headers begin with `## ` followed by a valid key. A decoder MUST NOT ignore or reinterpret underscore-prefixed user keys.

## 8. Streaming Encoding Extension

When the encoder does not know payload size upfront (data arriving incrementally from a database cursor, API pagination, graph traversal, or real-time event stream), it MAY use streaming mode. Streaming mode enables zero-buffering: rows emit the instant they are produced, with O(1) memory per row.

### 8.1 Streaming mode header

The header line MUST omit count fields (`symbols=`, `edges=`) when their values are unknown:

```
GCF profile=graph tool=context_for_task budget=5000
```

```
GCF profile=generic
```

### 8.2 Deferred count marker

Section headers that would normally contain `[N]` MUST use `[?]` when the count is not yet known:

```
## edges [?]
## employees [?]{id,name,department,salary}
```

### 8.3 Streaming tabular encoding

Streaming encoders that use tabular form MUST have the complete field list before emitting the first row. This requires one of:

- A caller-provided schema specifying all field names.
- Prior knowledge that every emitted object conforms to a complete schema.

If a streaming encoder discovers a field not present in the emitted field declaration, it MUST NOT silently drop the field. The encoder MUST either:

1. Reject the input with an error.
2. If no rows have yet been emitted, restart the section in expanded form.

A streaming encoder that cannot guarantee field completeness SHOULD use expanded per-item form from the start.

A streaming encoder MUST NOT mix tabular rows and expanded items beneath the same section header.

This is the sole exception to the buffered all-object tabular requirement: an all-object streaming array MAY use expanded form when its complete field union is unavailable before the first item is emitted.

### 8.4 Trailer summary

After the last data line, streaming encoders MUST emit a summary line:

```
##! summary symbols=4 edges=3 counts=3
```

#### Summary fields

| Field | When | Description |
|-------|------|-------------|
| `symbols` | graph profile | Total symbol count |
| `edges` | graph profile | Total edge count |
| `counts` | any deferred sections | Comma-separated counts in the encounter order of `[?]` section headers |

User section names are not embedded in the trailer. The first value in `counts` corresponds to the first `[?]` section in document order, the second value to the second section, and so on. The number of `counts` entries MUST equal the number of deferred section headers.

### 8.5 Encoder mode selection

| Mode | When to use | Header counts | Trailer |
|------|-------------|---------------|---------|
| Buffered (default) | Full payload known upfront | Yes (`[N]`) | Optional |
| Streaming | Data arriving incrementally | Deferred (`[?]`) | Required |

Encoders MUST default to buffered mode. Streaming mode MUST be explicitly opted into via encoder configuration or API choice. Encoders MAY emit the trailer in buffered mode for redundancy; in that case, `[N]` in headers is authoritative and `##! summary` is informational.

### 8.6 Decoder requirements

Decoders MUST accept `?` as a valid count value in section headers. Decoders MUST NOT reject a payload solely because a count is `?`.

When `[?]` is present, decoders MUST defer count validation until end of payload:

- If `##! summary` is present: validate actual counts against summary values (count mismatch is an error).
- If `##! summary` is absent and `[?]` was used: decoders SHOULD issue a warning but MUST NOT reject the payload. The decoder MUST use actual counts.

### 8.7 Example: graph profile (streaming)

```
GCF profile=graph tool=context_for_task budget=5000
## targets
@0 fn pkg.Auth 0.95 lsp_resolved
@1 fn pkg.Handler 0.88 lsp_resolved
## related
@2 type pkg.Config 0.72 ast_inferred
## edges [?]
@0<@1 calls
@2<@0 references
@0<@2 imports
##! summary symbols=3 edges=3 counts=3
```

### 8.8 Example: generic profile (streaming)

```
GCF profile=generic
## employees [?]{id,name,department,salary}
1|Alice Smith|Engineering|95000
2|Bob Jones|Sales|72000
3|Carol Wu|Marketing|85000
##! summary counts=3
```

## 9. Session Statefulness (Graph Profile)

When the header contains `session=true`, previously-transmitted symbols can be referenced without retransmission:

```
GCF profile=graph tool=context_for_files tokens=800 symbols=5 edges=1 session=true
## targets
@0  # previously transmitted
@7 fn github.com/org/repo/pkg.NewHandler 0.62 lsp_resolved
## edges [1]
@0<@7 calls
```

A bare `@{id}` followed by `# previously transmitted` is a reference to a symbol sent in a prior response within the same session. The consumer (LLM) has this symbol in its context window from the earlier response.

Session statefulness exploits a property unique to LLM tool interactions: the consumer maintains conversational state across calls.

## 10. Delta Encoding Extension (Graph Profile)

When the consumer sends a `pack_root` from a prior response and the current result differs, the server may return a delta payload containing only what changed:

```
GCF profile=graph tool=context_for_task delta=true base_root=aaa111 new_root=bbb222 tokens=30 savings=81%
## removed
fn github.com/org/repo/pkg.OldHandler
## added
@0 fn github.com/org/repo/pkg.NewHandler 0.85 rwr
## edges_removed
github.com/org/repo/pkg.Router -> github.com/org/repo/pkg.OldHandler calls
## edges_added
github.com/org/repo/pkg.Router -> github.com/org/repo/pkg.NewHandler calls
```

### Delta sections

| Section | Content |
|---------|---------|
| `## removed` | Symbols in the prior pack but not in the current. Short references (kind + qname). |
| `## added` | Symbols in the current pack but not in the prior pack. Full node lines with IDs. |
| `## edges_removed` | Edges in the prior pack but not in the current. `source -> target type` format. |
| `## edges_added` | Edges in the current pack but not in the prior. `source -> target type` format. |

A server SHOULD only use delta encoding when it saves significantly over full retransmission. A threshold of 60% (delta MUST be less than 60% of full size) is RECOMMENDED.

When `delta=true`, only the four delta section names above are valid. `removed` lines MUST use `kind qname`; `added` lines MUST use full node syntax; edge delta lines MUST use `source -> target type`. Delta-only line forms MUST NOT appear in non-delta graph payloads.

### Three-outcome protocol

When a consumer sends `pack_root`:
1. **Same root**: return a header-only graph payload with `unchanged=true`, `pack_root=<hash>`, and `symbols=N` (zero retransmission)
2. **Different root, prior known**: return delta payload
3. **Different root, prior unknown**: return full payload (fallback)

Example unchanged response:

```
GCF profile=graph tool=context_for_task unchanged=true pack_root=aaa111 symbols=10
```

## 11. Comments

Lines whose first non-indentation characters are `# ` (single hash followed by a space) are comments. Decoders MUST remove comment lines before structural parsing and count validation. Comments MAY appear between semantic units at any nesting depth and never increment declared counts. Encoders MAY emit comments.

```
# This is a comment
@0 fn github.com/org/repo/pkg.Func 0.78 lsp_resolved
```

## 12. Implementation Limits

Implementations MUST support at least the following limits:

| Limit | Minimum |
|-------|---------|
| Nesting depth | 32 levels |
| Array/object element count | 10,000 per container |
| Line length | 65,536 bytes |
| Field count per tabular header | 1,000 fields |
| Total payload size | No normative limit (implementation-defined) |

Implementations MAY support limits greater than these minima and MAY impose documented limits at or above them. A conforming implementation MUST NOT reject an input solely for exceeding a smaller implementation limit. When a supported limit is exceeded, the implementation MUST reject the input with an error rather than silently truncating.

## 13. Count Validation

Declared counts are normative at every nesting level.

### 13.1 Buffered mode

When a section header declares `[N]`:
- Exactly `N` data items MUST follow.
- A mismatch (fewer or more items than declared) is an error.
- Decoders MUST reject count mismatches.
- Encoders MUST emit accurate counts.
- In tabular sections, data items are rows; attachments do not increment the count.
- In expanded sections, data items are `@N` items; their indented descendants do not increment the parent count.
- Comment lines never increment a declared count.

### 13.2 Streaming mode

When a section header declares `[?]`:
- The actual count is determined by the `##! summary` trailer.
- If the trailer is present, the actual item count MUST match the trailer's declared count.
- If the trailer is absent, the decoder uses the actual count (see Section 8.6).
- Deferred sections are matched to `counts` entries by document encounter order.

### 13.3 Inline arrays

For inline primitive arrays (`name[N]: val1,val2,...`):
- The number of comma-separated values MUST equal `N`.
- A mismatch is an error.

### 13.4 Nested counts

Count validation applies recursively. A tabular row containing a nested array with its own count bracket MUST have that nested count validated independently.

## 14. Token Savings Analysis

*This section is informative.*

### Graph profile

| Source | JSON cost | GCF cost | Savings |
|--------|-----------|----------|---------|
| Field names | ~18 tokens/symbol | 0 (positional) | ~18/symbol |
| Edge references | ~30 tokens/edge | ~2 tokens/edge (local IDs) | ~28/edge |
| Structural delimiters | ~6 tokens/symbol | 0 | ~6/symbol |
| Distance fields | ~3 tokens/symbol | 0 (implicit in group) | ~3/symbol |
| Kind strings | ~2 tokens/symbol | ~1 token (abbreviated) | ~1/symbol |

Combined: 84% median token savings across 6 benchmark payloads (8 to 30 symbols).

### Generic profile

| Source | JSON cost | GCF cost | Savings |
|--------|-----------|----------|---------|
| Field names | repeated per record | declared once in header | ~(N-1) x fields per array |
| Structural delimiters | `{`, `}`, `:`, `,`, `"` per record | `|` between values | ~6 tokens/record |
| Array framing | `[`, `]`, commas | `[count]` in header | fixed |
| Nesting | braces + indentation + field names | `^` attachment + `.field` block | ~50% per nested object |

On TOON's own benchmark datasets: 34% fewer tokens on mixed-structure data, 44% fewer on semi-uniform event logs, 3% fewer on flat tabular data. See [benchmarks](https://gcformat.com/guide/benchmarks.html).

## 15. Design Constraints

- **Text-only.** GCF is plain UTF-8 text. Structural syntax uses a small ASCII set including `@`, `<`, `#`, `!`, `|`, `.`, `=`, `"`, `~`, `^`, brackets, braces, commas, and colons.
- **Line-oriented.** Each semantic unit occupies exactly one line.
- **Shallow nesting.** The graph profile is flat. The generic profile supports nested objects and arrays, but typical nesting depth is 1-3 levels.
- **Deterministic.** Same input produces same output. No randomness, no ordering ambiguity (symbols ordered by score descending, edges ordered by source then target, object keys in input order).
- **Human-readable.** The format can be read and understood by a human without tooling.
- **LLM-parseable.** The format can be parsed by an LLM without special instructions. Validated: 90.7% accuracy across 10 models and 3 providers on structured extraction tasks (23 comprehension runs, 1,300+ evaluations).

## 16. Conformance

### 16.1 Encoder Conformance (Graph Profile)

Conforming graph-profile encoders MUST:

- Emit UTF-8 output with LF line endings
- Emit a header line beginning with `GCF profile=graph` containing at least the `tool` field
- Emit the `edges` field in the header with an accurate count (buffered mode), OR omit it and provide counts in `##! summary` (streaming mode)
- Assign symbol IDs sequentially starting from 0 in non-session payloads; preserve stable session-scoped IDs when `session=true`
- Emit scores with exactly 2 decimal places
- Emit kind abbreviations from the standard table (Section 5) when available
- Emit the edges section header as `## edges [N]` where N matches the edge count (buffered), OR `## edges [?]` with counts in `##! summary` (streaming)
- Emit edges only between previously declared symbol IDs
- Order symbols by score descending within each distance group
- Order edges by source ID then target ID
- Produce deterministic output
- NOT emit trailing whitespace on any line

### 16.2 Encoder Conformance (Generic Profile)

Conforming generic-profile encoders MUST:

- Emit a header line beginning with `GCF profile=generic`
- Apply the common scalar grammar (Section 2) in all value contexts
- Quote strings according to the encoder quoting obligation (Section 2.4)
- NOT quote numbers, booleans, or null
- Apply the common key grammar (Section 2a) for all keys and field names
- Quote keys that are not valid bare-keys
- Reject duplicate keys within the same object scope
- Emit accurate record counts matching the number of data items (buffered mode), OR use `[?]` with `##! summary` (streaming mode)
- Use pipe (`|`) as the value separator in tabular rows
- NOT emit field names in tabular data rows (positional encoding only)
- Compute the complete field union from all elements for tabular encoding (Section 7.4.3)
- Emit `-` for null values and `~` for absent fields in tabular rows
- NOT emit `~` outside tabular row cells
- Emit `^` for nested values in tabular rows and exactly one matching attachment
- NOT emit `^` outside tabular row cells
- Select array encoding form per Section 7.3
- Emit primitive arrays inline as `name[count]: val1,val2,val3`
- Quote primitive array elements containing commas
- Use `@{id}` prefixes on tabular rows only when nested fields are present
- Use expanded per-item form (Section 7.6) for arrays containing mixed element types
- Emit root scalars as `=value`
- Emit root arrays with an anonymous `## [N]` header
- Use exactly two-space indentation per nesting level
- Produce deterministic output
- NOT emit trailing whitespace on any line

### 16.3 Decoder Conformance (Graph Profile)

Conforming graph-profile decoders MUST:

- Require the header to begin with `GCF profile=graph`
- Parse header key-value pairs separated by whitespace
- Parse node lines with exactly 5 positional fields
- Expand kind abbreviations from the standard table
- Pass unknown kind abbreviations through verbatim
- Parse the edges section header (stripping the bracket suffix)
- Accept `?` as a valid deferred count (streaming mode)
- Parse `##! summary` as format metadata rather than a graph section
- Parse edge lines with the `@target<@source type` format
- Reject edges referencing undeclared symbol IDs
- Ignore comment lines (starting with `# `)
- Tolerate trailing `\r` on lines (CRLF input)
- Validate counts at every level (Section 13)

### 16.4 Decoder Conformance (Generic Profile)

Conforming generic-profile decoders MUST:

- Require the header to begin with `GCF profile=generic`
- Apply the common scalar grammar (Section 2) with the defined precedence
- Parse quoted strings using the full JSON string escape grammar (Section 2.2)
- Reject malformed UTF-8 and invalid Unicode scalar values
- Parse numbers using the full JSON number grammar (Section 2.3)
- Interpret `-` as null
- Interpret `~` as absent (in tabular rows only)
- Reject `~` outside tabular row cells
- Interpret `^` as a nested-value attachment reference in tabular rows
- Reject `^` outside tabular row cells or without exactly one matching attachment
- Interpret `true` and `false` as booleans
- Parse bare tokens not matching the above as strings
- Parse keys using the common key grammar (Section 2a), supporting both bare and quoted forms
- Reject duplicate keys within the same object scope
- Parse tabular headers with `[count]{fields}` or `[?]{fields}` syntax, including quoted field names
- Split tabular rows on pipe (`|`) outside quoted strings
- Split primitive array values on comma (`,`) outside quoted strings
- Validate row value count against field count in the header
- Parse `.field` attachment lines as nested object or array values
- Parse `@{id}` prefixes on rows with nested fields
- Parse expanded per-item scalar, object, and array markers (`=`, `{}`, `[N]`)
- Parse a leading `=` line as a root scalar
- Parse an anonymous `## [N]` header as a root array
- Parse `##! summary` as format metadata rather than a user section
- Validate counts at every nesting level (Section 13)
- Satisfy the round-trip invariant (Section 1.1)

### 16.5 Decoder Strict Mode

A conforming decoder operates in strict mode. There is no lenient or permissive mode. Decoders MUST reject (return an error, not silently ignore) every condition listed below. This section is the complete compliance checklist for decoder validation.

#### Header errors

| Error | Condition |
|-------|-----------|
| Missing header | First line does not begin with `GCF` |
| Missing profile | Header has no `profile=` field |
| Unknown profile | `profile` value is not `generic` or `graph` |
| Missing tool (graph) | Graph profile header has no `tool=` field |
| Malformed header field | Key-value pair missing `=` |
| Duplicate header field | Same header key appears more than once |

#### Scalar errors

| Error | Condition |
|-------|-----------|
| Unterminated quote | Quoted string missing closing `"` |
| Invalid escape | Escape sequence not in the defined set (Section 2.2) |
| Trailing characters | Characters after closing quote of a quoted scalar |
| Invalid missing | `~` token outside a tabular row cell |
| Invalid attachment marker | `^` token outside a tabular row cell |
| Invalid surrogate | Literal surrogate, isolated escaped surrogate, or malformed surrogate pair |
| Invalid UTF-8 | Input contains a malformed UTF-8 byte sequence |

#### Structural errors

| Error | Condition |
|-------|-----------|
| Duplicate key | Same key appears twice in the same object scope |
| Duplicate field name | Same field name appears twice in a tabular field declaration |
| Row width mismatch | Pipe-separated values in a row do not match field count |
| Count mismatch | Number of data items does not match declared `[count]` |
| Invalid count | `[count]` is not `0`, a non-zero decimal integer without leading zeros, or `?` |
| Tab indentation | Leading whitespace contains tab characters |
| Invalid indent | Indentation increases by more than one level |
| Invalid item ID | Expanded item ID or present tabular row ID does not equal its zero-based item index |
| Orphan attachment | `.field` without a parent `@N` row and matching `^` cell |
| Missing attachment | `^` cell has no matching `.field` attachment |
| Duplicate attachment | More than one attachment targets the same field in one row |

#### Graph profile errors

| Error | Condition |
|-------|-----------|
| Invalid node line | Symbol line has fewer than 5 positional fields |
| Invalid symbol ID | `@` prefix followed by non-integer |
| Invalid score | Score field is not a valid decimal float |
| Invalid edge syntax | Edge line missing `<` separator |
| Unknown edge reference | Edge references a symbol ID not declared earlier |
| Malformed delta | Delta payload uses an unknown section or a line form invalid for its section |

The tables above define **30 strict-mode error conditions** across 4 categories (header, scalar, structural, graph). A decoder that accepts any of these conditions is non-conforming.

Decoders MAY issue warnings (without rejecting) for:

- Header fields with unknown keys (forward compatibility)
- Trailing whitespace on lines
- Empty sections (group header with no subsequent lines)

## 17. Security Considerations

- GCF is a text format with no executable content. Parsers SHOULD NOT evaluate GCF content as code.
- Qualified names in graph-profile payloads may contain file paths or URLs. Consumers MUST NOT treat these as actionable references without validation.
- The `pack_root` field contains a content hash. Implementations MUST NOT use `pack_root` values as filesystem paths or database keys without sanitization.
- Session state (Section 9) requires server-side tracking of transmitted symbols. Implementations SHOULD bound session size to prevent memory exhaustion.
- Delta payloads (Section 10) reference a prior state. Implementations MUST handle the case where the prior state is unknown (fallback to full payload).
- Generic rows may contain user-generated content. Implementations that render GCF output into HTML, terminals, or other display contexts MUST sanitize values to prevent injection.
- Implementations MUST enforce the limits in Section 12 to prevent resource exhaustion from malicious payloads.

## 18. MIME Type

Suggested: `application/vnd.gcf+text`

File extension: `.gcf`

Charset: always UTF-8.

## 19. Versioning

The format version is implicit in the header prefix `GCF`. Future post-adoption incompatible changes would use `GCF2`, `GCF3`, etc. Parsers encountering an unknown version prefix MUST reject the payload with an error rather than attempting best-effort parsing.

This specification (v2.0) replaces all prior versions (v1.0 through v1.4). Prior versions are considered pre-stable development and are not supported. Implementations MUST NOT maintain backward compatibility with pre-v2.0 encoding behavior. All conformance fixtures, official implementations, and published packages MUST align with this specification before the Stable designation is applied.

## 20. Intellectual Property

This specification is released under the MIT License. No patent disclosures are known at the time of publication. The authors intend this specification to be freely implementable without royalty requirements.
