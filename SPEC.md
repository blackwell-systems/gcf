# GCF Specification

## Graph Compact Format: A Token-Optimized Wire Format for LLM Interactions

**Version:** 3.5.2

**Date:** 2026-08-06

**Status:** Stable (see Section 19 for status lifecycle)

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
- **Graph profile** (Sections 4-6): Specialized encoding for code graph payloads (symbols, edges, distance groups) with local IDs and distance-based grouping. 71-79% fewer tokens than JSON at 500 records.

Both profiles share the same grammar primitives: `##` section headers, `@` local IDs, the common scalar grammar (Section 2), and the common key grammar (Section 2a). The savings come from eliminating three sources of waste: field name repetition (positional encoding), identifier repetition (local IDs), and per-record metadata (hierarchical grouping).

All structural tokens and delimiters in this grammar (for example `|`, `,`, `=`, spaces, `>`, `[`, `]`, `{`, `}`, `"`, `@`, `#`) are defined and matched at the level of Unicode scalar values (code points), not grapheme clusters. A conforming implementation MUST locate and compare structural delimiters by code point; it MUST NOT apply grapheme-cluster segmentation when parsing structure, because a delimiter immediately adjacent to a combining (grapheme-extending) scalar in the data would otherwise be missed, corrupting the parse. This matters only in languages whose default string iteration is grapheme-based; the requirement makes structural parsing identical across all implementations.

### 1.1 Lossless round-trip invariant

The generic profile preserves the JSON data model. A conforming implementation MUST satisfy:

```
decodeGeneric(encodeGeneric(value)) == value
```

for every value in the JSON data model (Section 1.2), where equality is structural: same types, same object membership, same array ordering, same string contents, same numeric value, same boolean value, same null.

Preserved properties: JSON types, object key membership, object key ordering (input order), array element ordering, string contents (every code point), numeric value, boolean value, null identity.

Not preserved (not part of the parsed JSON data model): source JSON whitespace, escape spelling (e.g. `\u0041` vs `A`), duplicate object keys (rejected; see Section 2a), number lexeme spelling (e.g. `1.0` vs `1` vs `1.00`).

### 1.2 JSON data model

This specification encodes the parsed JSON data model. [RFC8259] recommends but does not require unique object keys; GCF requires them (Section 2a.2). The data model is:

- object (unordered collection of name/value pairs with unique string keys; duplicate keys are rejected);
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

4. **Attachment.** If the token is exactly `^`, decode as an attachment reference. If the token matches `^{...}`, decode as an inline-schema attachment reference, where `{...}` is a field declaration using the grammar in Section 2a.3. These tokens are valid ONLY in tabular row cells and MUST have exactly one matching attachment body associated with that row (Sections 7.4.4 and 7.4.5). A decoder encountering either form in another context, with an invalid field declaration, or without a matching attachment body MUST reject the input.

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

The `DIGIT` and `DIGIT1-9` rules are the ASCII digits `0`-`9` (`%x30-39`) and `1`-`9` as defined by [RFC5234]. Non-ASCII Unicode decimal digits (for example U+0660-U+0669 Arabic-Indic, or U+FF10-U+FF19 fullwidth) are NOT digits under this grammar. A token containing any such code point does not match the number grammar in its entirety and therefore falls through to bare string: for example `1.٥` (ASCII `1`, `.`, then U+0665) decodes as the string `"1.٥"`, never as the number `1.5`. Implementations MUST NOT use a Unicode-aware digit class (such as a regex `\d` in Unicode mode, which matches `\p{Nd}`) for the number grammar; this same ASCII-only constraint applies to the numeric-like classification in Section 2.4.

### 2.3.1 Canonical number formatting

Conforming encoders MUST emit numbers in canonical form to ensure bit-for-byte deterministic output:

- Zero is emitted as `0`. Negative zero is canonicalized to `0`: `-0` and `0` denote the same numeric value, and integer negative zero is not representable in most language number models, so encoders MUST emit `0` for both integer and floating-point negative zero and MUST NOT emit `-0`. Decoders MUST still accept `-0` as valid number syntax (it decodes to the value zero).
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
- it matches `^{fields}` using the field declaration grammar (would decode as an inline-schema attachment marker);
- it equals `true` or `false` (would decode as boolean);
- it matches the JSON number grammar (would decode as number);
- it is numeric-like, meaning it begins with one of these shapes and could be misread as a malformed number: a `+` or `-` optionally followed by `.` and then an ASCII digit (`0`-`9`); or `.` followed by an ASCII digit; or `0` followed by an ASCII digit. Non-ASCII Unicode digits do not count here (see Section 2.3), and a token beginning with an ASCII digit `1`-`9` that is not itself a complete number is not numeric-like (for example `1.٥` and `123abc` are left bare);
- it is empty (zero length);
- it begins or ends with whitespace;
- it begins with `#`, `@`, or `.` (would collide with comment, row-ID, or attachment syntax in positional contexts);
- it contains `"`, `\`, a C0 control character (U+0000 through U+001F), or a C1 control character (U+0080 through U+009F);
- it contains non-ASCII Unicode whitespace, including U+00A0, U+2028, U+2029, U+FEFF, or any code point greater than U+007F classified as whitespace by the implementation's Unicode character database;
- it contains the active context delimiter: `|` in tabular rows, `,` in primitive arrays;
- it contains `\n` (newline) or `\r` (carriage return);
- it contains a substring matching the inline array pattern `[` ... `]` `:` (would be parsed as an inline array header at the line level; e.g. `ERR[404]: Not Found`, `[Speaker 1]: Hello`).

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

#### Optional fields (graph profile)

| Field | Type | Description |
|-------|------|-------------|
| `tool` | string | Name of the producing tool. SHOULD be present for MCP tool responses. |
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

Canonical emission (buffered mode): an encoder MUST always emit `symbols`, and MUST emit `budget`, `tokens`, and `edges` only when their value is nonzero. A zero-valued `budget`, `tokens`, or `edges` field is omitted rather than emitted as `=0`, so two conformant encoders produce byte-identical headers for the same payload. (Streaming mode omits the count fields when unknown, per Section 8.4.)

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
| `pack_root` | string | Content-addressed identity (hex hash) for delta encoding (Section 10a) |
| `key` | string | Names the identity field for delta (Section 10a.1); present on delta-participating payloads |
| `delta` | boolean | `true` if this is a delta payload (Section 10a) |
| `unchanged` | boolean | `true` if the consumer's prior `pack_root` still identifies the current result |
| `base_root` | string | Pack root of the prior payload (delta mode only) |
| `new_root` | string | Pack root of the current payload (delta mode only) |
| `count` | integer | Number of rows in the keyed set (used on `unchanged` responses) |
| `savings` | string | Token savings percentage (delta mode only, e.g. `81%`) |

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
                    / delta-added-line / delta-edge-line / comment
metadata-summary    = "##!" SP "summary" *( SP header-pair ) LF

; --- Generic roots ---
generic-body        = ( root-scalar / root-array / root-object / root-keyed-map )
                      [ metadata-summary ]
root-keyed-map      = anonymous-keyed-block
root-scalar         = "=" scalar LF
root-array          = anonymous-array
root-object         = *( object-member )

; --- Generic objects ---
object-member       = kv-line / object-section / named-array / keyed-block
                    / comment-line
kv-line             = key "=" scalar LF
object-section      = "##" SP key LF indented-object-body
indented-object-body = *( INDENT object-member )

; --- Generic arrays ---
named-array         = inline-array / array-block
anonymous-array     = anonymous-inline-array / anonymous-array-block
anonymous-inline-array = "##" SP count-bracket ":" [ SP scalar-list ] LF
anonymous-array-block = "##" SP count-bracket [ field-decl ] LF array-body
array-block         = "##" SP key SP count-bracket [ field-decl ] LF array-body
anonymous-keyed-block = "##" SP keyed-bracket field-decl LF tabular-body
keyed-block         = "##" SP key SP keyed-bracket field-decl LF tabular-body
inline-array        = key count-bracket ":" [ SP scalar-list ] LF
array-body          = tabular-body / expanded-body / empty
tabular-body        = 1*( tabular-row *( traditional-attachment
                      / inline-object-attachment ) )
tabular-row         = [ "@" id SP ] cell *( "|" cell ) LF
cell                = scalar / "~" / attachment-cell
attachment-cell     = "^" / "^" field-decl
expanded-body       = 1*( expanded-item )
expanded-item       = primitive-item / object-item / array-item / keyed-map-item
keyed-map-item      = "@" id SP keyed-bracket field-decl LF INDENT tabular-body
primitive-item      = "@" id SP "=" scalar LF
object-item         = "@" id SP "{}" LF *( INDENT object-member )
array-item          = "@" id SP count-bracket [ field-decl ]
                      [ ":" [ SP scalar-list ] ] LF
                      [ INDENT array-body ]

; --- Tabular attachments ---
traditional-attachment = object-attachment / array-attachment
                    / keyed-map-attachment
keyed-map-attachment = "." key SP keyed-bracket field-decl LF tabular-body
object-attachment   = "." key SP "{}" LF *( INDENT object-member )
array-attachment    = "." key SP count-bracket [ field-decl ]
                      [ ":" [ SP scalar-list ] ] LF
                      [ INDENT array-body ]
inline-object-attachment = scalar *( "|" scalar ) LF

; --- Shared array syntax ---
count-bracket       = "[" count-or-deferred "]"
count-or-deferred   = count / "?"
keyed-bracket       = "[" count-or-deferred ":" "]"
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
delta-added-line    = node-line SP distance  ; graph delta `## added`: node line plus trailing distance (Section 10.1)
delta-edge-line     = qname SP "->" SP qname SP edge-type
id                  = 1*DIGIT
distance            = 1*DIGIT
target-id           = id
source-id           = id
count               = "0" / ( DIGIT1-9 *DIGIT )
kind                = known-kind / bare-key  ; extensible: decoders MUST accept unknown kinds
known-kind          = "fn" / "type" / "method" / "iface" / "var" / "const"
                    / "resource" / "table" / "class" / "selector" / "field"
                    / "route" / "ext" / "file" / "pkg" / "svc"
qname               = 1*( %x21-7E )  ; printable non-whitespace ASCII (graph profile constraint)
score               = [ "-" ] 1*DIGIT "." 2DIGIT
provenance          = 1*( %x21-7E )  ; printable non-whitespace ASCII (graph profile constraint)
edge-type           = 1*( %x21-7E )  ; printable non-whitespace ASCII (graph profile constraint)
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

`INDENT` in the grammar means that every line in the referenced production is prefixed by exactly one additional two-space indentation unit. Traditional `.field` attachments appear at their parent tabular row's indentation, as do positional inline-object attachment bodies (Section 4.1); a traditional attachment's own body is indented two levels beneath the row (Section 7.4.4). Because ABNF does not maintain an indentation stack, Section 4.1 is the authoritative parsing algorithm for nesting and dedent behavior.

### 4.1 Indentation

Indentation is normative and carries structure.

- Indentation MUST use spaces (U+0020), never tabs.
- One nesting level is exactly two spaces.
- Indentation may increase by exactly one level at a time, except for traditional attachment bodies, whose indentation is defined in Section 7.4.4. An increase of two or more levels in any other position is an error.
- A dedent (decrease in indentation) closes all containers deeper than the new level.
- Indented content following `@N` belongs to that item until the next item at the same or lesser indentation level, or until the containing section ends. Same-indent inline attachment bodies are consumed according to Section 7.4.5.2.
- A `.field` attachment header is written at the same indentation as the `@N` tabular row whose matching bare `^` cell it fills (Section 7.4.4). Canonical encoders emit it at the row's indentation; a decoder MUST also accept a `.field` header one level beneath its row.
- A positional inline object attachment MAY appear either at the same indentation level as its parent `@N` row or one indentation level beneath it.
- An unexpected indentation increase (not preceded by a container-opening production) is an error.
- Tab characters (U+0009) in leading whitespace are an error.

### 4.2 Structural whitespace

- Encoders MUST NOT emit blank lines, trailing whitespace, or whitespace around `=`, `|`, or `,` delimiters.
- Encoders MUST emit exactly one ASCII space after `:` when an inline array has one or more values, and no characters after `:` when it has zero values.
- Decoders MUST ignore completely blank lines after the header.
- Decoders MUST trim ASCII space and tab surrounding unquoted scalar tokens after splitting on the applicable delimiter.
- Decoders MUST NOT trim or normalize any character inside a quoted string.
- Delimiters and structural brackets MUST be recognized only outside quoted strings. In particular, a `[` or `]` inside a quoted key or value MUST NOT be interpreted as an array count bracket.
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
- **score**: Relevance score as a decimal float (e.g., `0.78`). Encoders MUST emit exactly 2 decimal places, rounding the exact IEEE-754 double value with **round-half-to-even** (banker's rounding). This is the behaviour of the C/Go `printf` family (`%.2f`), Python `format`, Rust `{:.2}`, and .NET `F2`. Implementations MUST NOT use round-half-up (e.g. JavaScript `Number.prototype.toFixed`, Java `String.format("%f", …)`): the two agree on every value except exact binary midpoints (e.g. `0.125` → `0.12`, not `0.13`; `0.625` → `0.62`, not `0.63`), where round-half-up would produce a divergent, non-interoperable wire.
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
| Object | Key-value lines and `##` section blocks; keyed table `## [N:]{...}` when values are objects (Section 7.2a) |
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

### 7.2a Keyed map encoding (tabular)

A JSON object whose values are all objects forming a losslessly-tabular set is encoded as a **keyed table**: the shared value fields are declared once in a header, and each member is one positional row prefixed by its key. This is the object-valued analogue of Section 7.4 tabular array encoding.

#### 7.2a.1 Selection

A buffered encoder MUST encode a JSON object as a keyed table when all of the following hold; otherwise it uses Section 7.2 section encoding:

1. the object has at least two members;
2. every member value is a JSON object;
3. the member-value objects form a losslessly-tabular set under the Section 7.3 rule-3 conditions (non-empty ordered field union computed over all members per Section 7.4.3; every field preserved; each leaf a scalar or a Section 7.4.4/7.4.5 attachment; absent distinguishable from null).

An object with any non-object member value uses Section 7.2. An object whose values are all empty objects has an empty field union and is not eligible (Section 7.2). An object whose value fields all contain the `>` character is not eligible either: a `>`-containing name cannot be a tabular column (Section 7.4.6.1.4), so the keyed header would have only the key column, and the object uses Section 7.2 (the object analogue of an array falling back to expanded form). A map of scalar values is already optimal as `key=value` lines and is unaffected.

The two-member minimum (condition 1) is deliberate: a keyed table factors the shared value fields into one header, which pays off only across multiple members. A single-member map would produce a one-row table the same size as a section, so keying it would change canonical output for every nested single-member object (for example a `{"data": {...}}` wrapper) with no token benefit. Single-member objects therefore use ordinary encoding (Section 7.2). A consequence is that a single-key wrapper of a multi-member map, such as `{"users": {"u1": {...}, "u2": {...}}}`, is not keyed at the wrapper level (one member); the wrapper uses ordinary object encoding and its inner two-member map is encoded as a keyed table at its own level, a named keyed block (`## users [N:]{...}`) or, in a tabular row, a keyed-map attachment (Section 7.4.4). An object with two or more members whose fields include a uniform nested object still flattens per Section 7.4.6 (the nested object shares a schema across members). When a keyed table is encoded as a named block and its name is the empty string, the encoder MUST quote the name (`## "" [N:]{...}`) so it is a named block distinct from an anonymous root keyed table.

#### 7.2a.2 Header

```
## [{count}:]{key,field1,field2,...}
```

Named or nested form: `## {name} [{count}:]{key,field1,...}`.

- `[{count}:]` — the `:` after the exact member `count` marks a keyed map. The decoder reconstructs a JSON object (not an array). `[{count}]` without the colon remains an array (Section 7.4).
- The first declared field is the **key column**, with default label `key`. If `key` is present in the value field union, the encoder MUST prepend `_` to the label until it is unique within the header (`_key`, `__key`, ...). The label is a display name only; a decoder MUST NOT emit the key-column label as a member of any value object.
- The remaining fields are the value objects' fields in Section 7.4.3 union order.

A `[{count}:]` header MUST declare at least two fields (the key column plus at least one value field). A decoder MUST reject a keyed-map header with fewer than two fields.

#### 7.2a.3 Rows

One row per member, in input order (Section 7.11): `{keyvalue}|{v1}|{v2}|...`

- **Cell 0** is the member key, an ordinary scalar cell governed by Sections 2.4 and 2.1. Because JSON keys are strings, the Section 2.4 quoting obligation already forces quoting of any key that would otherwise decode as a non-string (numeric-like, `-`, `true`, `~`, `^`, empty, leading `#`/`@`/`.`, or containing `|`), so cell 0 round-trips as a string with no keyed-map-specific rule. Duplicate member keys are an error.
- **Cells 1..M** use the full Section 7.4 tabular row grammar: scalars directly; `-` for null and `~` for absent (Section 7.4.2); nested values via `^`/`^{fields}` attachments (Sections 7.4.4, 7.4.5) or `>` flattened path columns (Section 7.4.6). For token efficiency the encoder MUST select the smallest valid form per field and MAY reuse shared schemas (Section 7.4.5.3). A row carrying one or more attachment cells takes the `@{id}` prefix required by Section 7.4.4, where the id is the member's zero-based emission index; the key remains cell 0.

Example:

```
## [3:]{key,cpu,mem,status}
web-01|23|61|ok
db-01|41|83|ok
cache-1|67|52|warn
```

decodes to

```json
{
  "web-01": {"cpu": 23, "mem": 61, "status": "ok"},
  "db-01": {"cpu": 41, "mem": 83, "status": "ok"},
  "cache-1": {"cpu": 67, "mem": 52, "status": "warn"}
}
```

#### 7.2a.4 Decoder

For a `[{count}:]` block, a decoder reconstructs a JSON object with `count` members. For each row, cell 0 (Section 2.1) is the member key; cells 1..M map to declared fields 1..M using the Section 7.4 body grammar as the member's value object. The key-column label is discarded. A decoder MUST reject: a row whose cell count does not match the declared field count; duplicate member keys; a `[{count}:]` header with fewer than two declared fields; a zero count (`[0:]`) — a keyed map has at least one member, and an empty object is encoded per Section 7.7, never as `[0:]`; and a member-count mismatch (Section 13).

Round-trip: `decode(encode(x)) == x` for eligible objects. Member order follows Section 7.11.

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

The sole exception is an array attachment beneath a tabular row: a `.field [N]` attachment without a field declaration uses a previously established shared array schema for that field when one exists (Section 7.4.5.3). Otherwise it has an expanded body. Decoders MUST NOT infer or switch body forms from individual data lines.

"Losslessly tabular" means:

- every element is a JSON object;
- the complete field union contains at least one field;
- the complete ordered field union is computed from ALL elements (not a sample);
- each field value in every element is either a scalar or uses the attachment marker and attachment syntax defined in Sections 7.4.4 and 7.4.5;
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

When tabular records contain nested objects or arrays, the complete field union remains in the header and every row retains one cell per declared field. A nested value is represented by an attachment marker in its cell. Traditional attachments use the bare `^` marker, and the attached value appears beneath the row using the same field name. Inline object attachments may instead declare or reuse a positional schema as defined in Section 7.4.5.

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
| `.field [N:]{key,fields}` | Keyed-map attachment; `keyvalue\|values` rows are indented beneath it (Section 7.2a) |
| `.field [N]` | Expanded array attachment; items are indented beneath it |

Array attachments use the same header-to-body rules as ordinary arrays in Section 7.3.

Rules:

- A row containing one or more `^` or `^{fields}` cells MUST have an `@{id}` prefix.
- When present, the row ID MUST equal the row's zero-based index within the containing array.
- Each attachment marker cell MUST have exactly one attachment body associated with the row.
- A traditional attachment header is written at the same indentation as its row, and its body is indented two levels (four spaces) beneath the row. A decoder MUST also accept the header one level beneath the row. The attachment MUST use the same decoded field name as its marker cell and MUST match a bare `^` marker.
- An attachment MUST correspond to a `^` or `^{fields}` cell. Attachments for scalar, null, or missing cells are errors.
- Attachment field names MUST be unique within a row.
- A field may be scalar in one record and nested in another. The scalar record emits its scalar directly; the nested record emits `^` and an attachment.
- Empty objects use `.field {}` with no indented members.
- Empty arrays use `.field [0]`.

Indented content following `@N` belongs to that row until the next tabular row at the row's indentation (a same-indent line that is neither a `.field` attachment nor a consumed positional inline body) or until the section ends. When same-indent inline bodies are present, the decoder consumes the exact number of eligible positional attachments before treating the next same-indent line as a tabular row.

#### 7.4.5 Inline object schemas and shared attachment schemas

Version 3.0 adds optional schema reuse for repeated nested values in tabular arrays. Schema state is scoped to one containing tabular array and one decoded field name. It does not leak into nested arrays, sibling arrays, or later sections.

##### 7.4.5.1 Inline object schema

When a field is a non-null flat object with the same ordered key set in every row where that field is present, an encoder MAY encode those objects positionally:

- The first row MUST contain the field with a non-null object value and MUST use `^{field1,field2,...}` to declare the ordered inline schema.
- Subsequent rows containing a conforming object for that field use bare `^` and reuse the schema declared by the first row.
- A subsequent row where the field is absent emits `~`. A present null value makes the field ineligible for inline schema encoding.
- The attachment body is one pipe-delimited line containing exactly one scalar value per declared field, in declaration order.
- The body has no `.field` prefix, `{}` marker, or `key=value` members.
- All object values MUST be scalars. Nested objects and arrays are not eligible.
- Every encoded object MUST have exactly the same keys in exactly the same order.
- The object schema MUST contain at least three keys. Smaller objects use traditional attachment encoding to avoid inline-schema overhead.

Example:

```
## orders [2]{id,customer,total,status}
@0 ORD-001|^{id,name,email,phone}|109.97|shipped
1|Alice|alice@test.com|"555-0101"
@1 ORD-002|^|49.99|pending
2|Bob|bob@test.com|"555-0202"
```

A decoder encountering `^{fields}` establishes the inline object schema for that field. A later bare `^` for the same field reuses that schema when matched to a positional inline attachment body. The bare `^` syntax remains valid for traditional named attachments, so the attachment body form determines which interpretation applies.

Decoders MUST support traditional and inline attachments in the same row and payload.

##### 7.4.5.2 Positional attachment matching and indentation

An inline object attachment body MAY appear at the same indentation level as its parent row or one two-space level deeper. Encoders SHOULD use the same indentation level to minimize tokens. Traditional named attachments (`.field`) are written at their row's indentation (Sections 4.1 and 7.4.4).

Within a row, decoders MUST process attachment bodies in source order:

- A child line beginning with `.` is a traditional attachment and is matched by decoded field name to a bare `^` marker.
- A child line not beginning with `.` is a positional inline object attachment and is matched to the next unmatched attachment-marker cell, in header field order, that has an inline schema declared by `^{fields}` or available for reuse from an earlier row.
- Quoted string values beginning with `.` remain positional values; the leading quote prevents them from being interpreted as traditional attachments.

Every positional body MUST contain exactly the number of pipe-delimited scalar values declared by its inline schema. A positional body without an eligible marker, an eligible marker without a body, or more than one body for the same marker is an error.

Mixed example:

```
## orders [1]{id,customer,items,total,status}
@0 ORD-001|^{id,name,email,phone}|^|109.97|shipped
1|Alice|alice@test.com|"555-0101"
.items [2]{sku,name,qty,price}
    SKU-A|Widget|2|29.99
    SKU-B|Gadget|1|49.99
```

##### 7.4.5.3 Shared array schemas

When array attachments for the same field use the same tabular field declaration across rows, an encoder MAY omit the declaration after it has been established:

```
## orders [2]{id,items}
@0 ORD-001|^
.items [2]{sku,name,qty,price}
    SKU-A|Widget|2|29.99
    SKU-B|Gadget|1|49.99
@1 ORD-002|^
.items [1]
    SKU-C|Gizmo|1|39.99
```

The first row MUST contain the field with a tabular array attachment that includes `{fields}`. This declaration establishes the shared array schema for that field. A later `.field [N]` attachment without `{fields}` uses that schema and therefore has a tabular body.

An encoder MAY omit `{fields}` only when the later array's tabular field list exactly matches the established schema. If a later array is not tabular or has a different field list, the encoder MUST emit the ordinary complete attachment syntax for that value. An explicit different field declaration applies only to that attachment and does not replace the established shared schema.

When a decoder encounters `.field [N]` without `{fields}`:

1. If a shared array schema was established for that field by an earlier row in the same containing tabular array, parse the body as tabular using that schema.
2. Otherwise, parse the body as an expanded array according to Section 7.6.

#### 7.4.6 Nested object flattening

When a tabular array contains a field that is a non-null object with the same ordered key set in every row where that field is present, and all values within that object are scalars, an encoder MAY flatten the nested object's keys into the tabular header as path columns using `>` as the path separator.

This is an alternative to the inline object schema mechanism (Section 7.4.5.1). Both produce valid GCF. Flattening promotes nested object values directly into the tabular row; inline schemas place them in a separate positional attachment body.

##### 7.4.6.1 Encoder rules

1. The encoder MUST verify that every row containing the nested object has exactly the same keys in exactly the same order. If any row has a different key set, the encoder MUST NOT flatten that field and MUST use the attachment mechanism (Section 7.4.4) or inline schema (Section 7.4.5.1) instead.

2. All final leaf values within the nested object MUST be scalars. Intermediate nested objects that themselves meet the flattening criteria (same keys in every row, all scalar leaves) are flattened recursively (see rule 5). If any final leaf is an object or array, the encoder MUST NOT flatten that field.

3. The encoder MUST NOT flatten a nested object if the field name, or any key along a flattened path, contains the `>` character or is the empty string. An empty key would produce an empty path segment (a leading, trailing, or bare `>`) that a decoder treats as a literal field name, not a path column (Section 7.4.6.2). Such fields MUST use the attachment mechanism (Section 7.4.4) or an inline schema (Section 7.4.5.1) instead.

4. If a top-level field name contains the `>` character, the encoder MUST NOT include it as a tabular column. Such fields MUST be emitted as per-row attachments. This ensures that any column name containing `>` in a tabular header, with all `>`-separated segments non-empty, is always a flattened path column, never a literal field name.

5. Each leaf key becomes a quoted column name in the header, formed by joining the path from the parent field to the leaf with `>`. For a field `customer` containing keys `id`, `name`, `email`: the header columns are `"customer>id"`, `"customer>name"`, `"customer>email"`.

6. Multiple nesting levels chain. A field `billing` containing an object `address` with keys `city`, `country` produces columns `"billing>address>city"`, `"billing>address>country"`. The same eligibility rules apply recursively: all intermediate objects must have the same keys in every row, and all leaves must be scalars.

7. Flattened columns appear in the header at the position of the original nested object field, in the key order of the nested object.

8. In each row, the flattened leaf values appear as ordinary pipe-separated cells at their column positions. No `^` marker, no attachment body.

9. If the entire nested object is absent from a record, all leaf columns for that object emit `~`.

10. If the entire nested object is null in a record, all leaf columns for that object emit `-`.

11. Flattened path columns and attachment marker columns (`^`) MAY coexist in the same tabular header. A row may have some fields flattened and others using attachments.

##### 7.4.6.2 Decoder rules

1. When a decoder encounters a quoted field name containing `>` in a tabular header whose `>`-separated segments are all non-empty, it MUST interpret `>` as a path separator and reconstruct the nested object structure. `"customer>name"` with cell value `Alice` decodes to `{"customer": {"name": "Alice"}}`. A `>`-containing field name whose split on `>` yields any empty segment (a leading, trailing, or consecutive `>`, including the bare `>`) is NOT a path column; the decoder MUST treat the field name literally. A conformant encoder never emits such a column (Section 7.4.6.1).

2. Multiple `>` characters chain: `"billing>address>city"` with value `Seattle` decodes to `{"billing": {"address": {"city": "Seattle"}}}`.

3. Individual leaf columns follow the standard scalar grammar: `~` means the leaf key is absent from the nested object, `-` means the leaf value is null. For example, `"customer>name"` = `Alice` and `"customer>email"` = `~` decodes to `{"customer": {"name": "Alice"}}` (email key omitted). `"customer>name"` = `-` and `"customer>email"` = `bob@co.com` decodes to `{"customer": {"name": null, "email": "bob@co.com"}}`.

4. When ALL leaf columns for a nested object contain `~`, the decoder MUST omit the nested object key entirely from the decoded record (the object is absent, not empty).

5. When ALL leaf columns for a nested object contain `-`, the decoder MUST emit the nested object key with value `null` (not an object with null-valued keys).

6. Decoders MUST support both flattened path columns and traditional attachment columns in the same payload.

##### 7.4.6.3 Round-trip guarantee

`decode(encode(value)) == value` MUST hold for flattened encoding. The decoder MUST reconstruct the exact nested object structure that the encoder received, preserving key order and value types.

##### 7.4.6.4 Example

Source data:

```json
[
  {"id": "ORD-001", "customer": {"name": "Alice", "email": "alice@co.com"}, "items": [{"sku": "A1"}], "total": 59.98},
  {"id": "ORD-002", "customer": {"name": "Bob", "email": "bob@co.com"}, "items": [{"sku": "B2"}, {"sku": "B3"}], "total": 29.99}
]
```

Flattened encoding:

```
GCF profile=generic
## [2]{id,"customer>name","customer>email",items,total}
@0 ORD-001|Alice|alice@co.com|^|59.98
.items [1]{sku}
    A1
@1 ORD-002|Bob|bob@co.com|^|29.99
.items [2]
    B2
    B3
```

The `customer` object is flattened into two path columns. The `items` array, which varies in length across rows, uses the existing attachment mechanism.

Equivalent inline-schema encoding (Section 7.4.5.1):

```
GCF profile=generic
## [2]{id,customer,items,total}
@0 ORD-001|^{name,email}|^|59.98
Alice|alice@co.com
.items [1]{sku}
    A1
@1 ORD-002|^|^|29.99
Bob|bob@co.com
.items [2]
    B2
    B3
```

Both are valid. Flattening produces fewer lines and tokens. Decoders MUST accept both forms.

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
| `@N [M:]{key,fields}` | Keyed map; `keyvalue\|values` rows are indented beneath it (Section 7.2a) |
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
| Map of objects (losslessly tabular) | Keyed tabular: `## [N:]{key,field1,...}` + `keyvalue\|values` rows (Section 7.2a) |
| Array of uniform objects | Tabular: header with field declaration + positional pipe-separated rows |
| Array of primitives | Inline: `name[count]: val1,val2,val3` |
| Array of mixed items | Expanded: `## name [count]` + `@{id}` per item with type markers |
| Nested value in tabular row | `^` or `^{fields}` cell + matching attachment body |
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

An object is eligible for keyed-tabular encoding (Section 7.2a) under the analogous conditions applied to its member values: every member value is a JSON object and the field union over all member values is non-empty and losslessly tabular. An object with any non-object member value, or whose members are all empty objects, is not eligible and uses Section 7.2 section encoding.

### 7.11 Canonical encoding rules

#### Object key ordering

Canonical encoders MUST emit object keys in the order they appear in the input value. When the input representation does not provide encounter order, encoders MUST order keys lexicographically by Unicode code point.

#### Tabular field ordering

The field declaration in tabular headers MUST follow the field union computation (Section 7.4.3): first object's keys in input order, then newly observed keys in first-observed order.

#### Container selection

Canonical buffered encoders MUST select array container encoding using Section 7.3 rules, and MUST encode an eligible object whose values are all objects as a keyed table using Section 7.2a. The selection is deterministic: same input produces the same encoding form, and for each keyed-map value field the encoder MUST select the smallest valid Section 7.4 form.

#### Attachment optimization selection

Inline object schemas and shared array schemas are optional encoding optimizations. An encoder that enables either optimization MUST make that choice deterministically for the same input and configuration. Traditional v2 attachment syntax remains valid v3 input and output.

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

A keyed map (Section 7.2a) uses `[?:]` when its member count is not yet known. Per Section 8.3 the complete **value-field** list MUST be known before the first row; the member keys stream as cell 0:

```
## servers [?:]{key,cpu,mem,status}
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

The streaming header MUST format the section name and every declared field name with the same quoting rules as a buffered tabular header (Section 2.4): a name is quoted when it would otherwise decode as a non-string or collide with structural syntax, and bare otherwise. A streaming encoder MUST NOT emit a raw, unquoted field name; a name containing a delimiter (`,` or `|`), a quote, or other structural characters would split the field declaration or produce an invalid header. This is the same obligation the buffered tabular header satisfies (Sections 7.4.3, 7.11).

Because a streaming tabular row carries only flat columns (a streaming section has no per-row attachment mechanism), a streaming value field name MUST NOT contain the `>` character. A `>`-containing column is a flattened path (Section 7.4.6.2), which a stream cannot represent; the buffered path routes such a field to an attachment (Section 7.4.6.1), but a streaming section has no such fallback. A streaming encoder given a value field name containing `>` MUST reject it with an error.

### 8.4 Trailer summary

After the last data line, streaming encoders MUST emit a summary line:

```
##! summary symbols=4 edges=3 counts=2,2,3
```

#### Summary fields

| Field | When | Description |
|-------|------|-------------|
| `symbols` | graph profile | Total symbol count |
| `edges` | graph profile | Total edge count |
| `counts` | streaming | Comma-separated counts. Generic profile: one entry per `[?]` deferred section, in encounter order. Graph profile: one entry per non-empty distance group in group-header order, then the edge count (see below). |

User section names are not embedded in the trailer.

In the **generic profile**, the first value in `counts` corresponds to the first `[?]` section in document order, the second to the second section, and so on. The number of `counts` entries MUST equal the number of deferred `[?]` section headers.

In the **graph profile**, the distance-group headers (`## targets`, `## related`, `## extended`, `## distance_N`) carry no count brackets, and `## edges [?]` is the only deferred section. The trailer nonetheless reports one `counts` entry per non-empty group in group-header order, followed by the edge count. These per-group entries are informational (they let a consumer verify each group without scanning); only the final entry, the edge count, corresponds to a `[?]` section. `symbols` equals the sum of the per-group entries. The `counts` field MAY instead use the labeled form (Section 8.4.1).

#### 8.4.1 Labeled counts (graph profile, optional)

In the graph profile, the trailer's `counts` field MAY be emitted in a labeled form, in which each entry is `label:count` instead of a bare count:

```
##! summary symbols=4 edges=3 counts=targets:2,related:2,edges:3
```

The labeled form carries exactly the same values as the positional form (Section 8.4), in the same order, with each value named. It is a producer-side comprehension aid: some consumers, notably smaller models, resolve a labeled per-group count more reliably than a positional one.

##### Form

```
labeled-counts = labeled-entry *( "," labeled-entry )
labeled-entry  = label ":" count
label          = "targets" / "related" / "extended" / ( "distance_" 1*DIGIT ) / "edges"
```

There is no whitespace around `:` or `,`. `count` uses the count grammar (Section 4: `0`, or a non-zero decimal with no leading zeros). The entries are, in order, one per non-empty distance group in group-header order, followed by a final `edges:` entry. A distance group with a zero count is omitted, exactly as in the positional form; the `edges:` entry is always present and last, even when the edge count is `0` (so the minimal labeled field is `counts=edges:0`). The `edges:` value equals the `##! summary` line's own `edges=` field (not the payload header, which omits `edges` in streaming mode), and the sum of the distance-group entries equals that line's `symbols=` field.

##### Form detection

A `counts` value is the labeled form if and only if it contains a `:`; otherwise it is the positional form (Section 8.4). Positional entries are bare integers and never contain `:`, so the two are unambiguous. Within a single `counts` field the two forms MUST NOT be mixed: every entry is labeled, or every entry is positional.

##### Obligations

- Encoders MUST default to the positional form. An encoder MAY emit the labeled form when configured to do so (for example, when the consumer is known to be a weaker model). An encoder that emits the labeled form MUST emit well-formed entries as defined above.
- Because the graph trailer's `counts` are informational (Section 8.4), a decoder MUST accept either form and MUST NOT reject a graph trailer because `counts` is labeled, is malformed, or names an unrecognized label. Graph trailer `counts` are not validated against section item totals (Section 13.2); the labeled form adds names, not validation. A decoder that surfaces the counts MAY ignore an entry it cannot parse.

The labeled form applies to the graph profile only. Generic-profile `counts` remain positional and are validated per `[?]` section (Sections 8.4, 13.2); a generic-profile `counts` value containing `:` is malformed.

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
##! summary symbols=3 edges=3 counts=2,1,3
```

Here `counts=2,1,3` reports two `targets`, one `related`, and three `edges`; only the final entry (edges) corresponds to a `[?]` section (Section 8.4).

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

A bare `@{id}` followed by `# previously transmitted` is a reference to a symbol sent in a prior response within the same session.

### 9.1 Symbol identity

Symbol identity within a session is defined by the pair `(kind, qualified_name)`. Changes to `score`, `provenance`, or `distance` do not create a new symbol identity but may require retransmission or a delta update if the consumer needs the updated values.

### 9.2 Session ID lifecycle

Within a session:

- Local IDs MUST remain bound to the same symbol identity for the lifetime of the session.
- Local IDs MUST NOT be reused for a different symbol.
- New IDs MUST be allocated monotonically (each new symbol receives the next integer).
- A bare reference (`@{id}  # previously transmitted`) is valid only after the full symbol declaration has been delivered successfully in that session.
- IDs are stable across calls: a symbol assigned `@3` in call 1 remains `@3` in call 2.
- IDs need not be contiguous within a single payload (some IDs may refer to symbols not included in the current response).

### 9.3 Session scope

A session MUST be scoped to:

- one authorization principal;
- one conversation or agent execution;
- one logical producer namespace;
- one GCF protocol version.

Implementations MUST NOT share session state between users or conversations.

### 9.4 Session recovery

| Condition | Required behavior |
|-----------|-------------------|
| Session unknown or expired | Return a full non-session payload. The consumer starts a new session. |
| Consumer lost prior context | Consumer requests session reset or full refresh. |
| Bare reference cannot be resolved | Consumer rejects the response and requests a full payload. |
| Producer cannot confirm delivery of a declaration | Producer MUST emit the full declaration, not a bare reference. |

### 9.5 Session limits

Implementations SHOULD document and enforce:

- Maximum session idle time before expiry.
- Maximum session lifetime.
- Maximum number of retained symbol IDs.

When a limit is exceeded, the implementation MUST fall back to a full non-session payload.

## 10. Delta Encoding (Graph Profile)

When the consumer sends a `pack_root` from a prior response and the current result differs, the server may return a delta payload containing only what changed:

```
GCF profile=graph tool=context_for_task delta=true base_root=sha256:0123456789abcdef... new_root=sha256:fedcba9876543210... tokens=30 savings=81%
## removed
fn github.com/org/repo/pkg.OldHandler
## added
@0 fn github.com/org/repo/pkg.NewHandler 0.85 rwr 0
## edges_removed
github.com/org/repo/pkg.Router -> github.com/org/repo/pkg.OldHandler calls
## edges_added
github.com/org/repo/pkg.Router -> github.com/org/repo/pkg.NewHandler calls
```

### 10.1 Delta sections

| Section | Content |
|---------|---------|
| `## removed` | Symbols in the prior pack but not in the current. Short references (kind + qname). |
| `## added` | Symbols in the current pack but not in the prior pack. Delta node lines: the standard node line plus a trailing distance field (`@id kind qname score provenance distance`). |
| `## edges_removed` | Edges in the prior pack but not in the current. `source -> target type` format. |
| `## edges_added` | Edges in the current pack but not in the prior. `source -> target type` format. |

A server SHOULD only use delta encoding when it saves significantly over full retransmission. A threshold of 60% (delta MUST be less than 60% of full size) is RECOMMENDED.

When `delta=true`, only the four delta section names above are valid. `removed` lines MUST use `kind qname`; `added` lines MUST use the delta node syntax `@{id} {kind} {qname} {score} {provenance} {distance}` (the standard node fields followed by a trailing decimal `distance`); edge delta lines MUST use `source -> target type`. Delta-only line forms MUST NOT appear in non-delta graph payloads.

The trailing `distance` on `added` lines is REQUIRED: unlike a full payload, where a symbol's distance is conveyed by its distance-group header (Section 6a), the flat `## added` section has no group headers, so the distance must travel on the line itself. Without it a consumer could not reconstruct the new snapshot's symbols with their distances and therefore could not recompute the `pack_root` (Section 10.2) to verify `new_root` (Section 10.4). `removed` lines omit distance because a removal is matched by identity (kind + qualified name) alone.

### 10.2 Canonical pack root (`gcf-pack-root-v1`)

The `pack_root` field identifies a logical graph snapshot. Two implementations given the same logical graph MUST compute the same `pack_root` value.

Algorithm `gcf-pack-root-v1`:

1. Validate all strings as UTF-8 Unicode scalar-value sequences.
2. Build one canonical record for each symbol:

   ```
   S<TAB>kind<TAB>qualified_name<TAB>score<TAB>provenance<TAB>distance<LF>
   ```

   Where `score` is formatted using the canonical number rules (Section 2.3.1) and `distance` is the decimal integer.

3. Build one canonical record for each edge:

   ```
   E<TAB>source_kind<TAB>source_qname<TAB>target_kind<TAB>target_qname<TAB>edge_type<LF>
   ```

   Edge records include kind to disambiguate symbols with the same qualified name but different kinds.

4. Sort all symbol records by unsigned UTF-8 byte order.
5. Sort all edge records by unsigned UTF-8 byte order.
6. Concatenate all sorted symbol records followed by all sorted edge records into one byte sequence.
7. Compute SHA-256 over those bytes.
8. Serialize as lowercase hexadecimal with algorithm prefix:

   ```
   sha256:<64 lowercase hex characters>
   ```

Implementations MUST use algorithm `gcf-pack-root-v1` when emitting `pack_root`, `base_root`, or `new_root` header fields. A consumer receiving a `pack_root` with an unrecognized algorithm prefix MUST treat it as an unknown root and request a full payload.

### 10.3 Three-outcome protocol

When a consumer sends `pack_root`:
1. **Same root**: return a header-only graph payload with `unchanged=true`, `pack_root=<hash>`, and `symbols=N` (zero retransmission).
2. **Different root, prior known**: return delta payload with `base_root` and `new_root`.
3. **Different root, prior unknown**: return full payload (fallback).

Example unchanged response:

```
GCF profile=graph tool=context_for_task unchanged=true pack_root=sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef symbols=10
```

### 10.4 Delta application

A delta transforms exactly one immutable base snapshot into one immutable new snapshot. A consumer MUST apply a delta atomically:

1. Verify that the consumer's current root equals `base_root`.
2. Validate the entire delta payload before modifying local state.
3. Reject duplicate, contradictory, or malformed operations (e.g., removing a symbol that does not exist in the base, or adding a symbol that already exists).
4. Apply all removals and additions to a temporary copy of the base snapshot.
5. Compute the canonical `pack_root` of the resulting snapshot using `gcf-pack-root-v1`.
6. Verify that the computed root equals `new_root` from the delta header.
7. Commit the temporary snapshot only after verification succeeds.

If any step fails, the consumer MUST retain the base snapshot unchanged and request a full payload. Partial application is not permitted.

### 10.5 Delta ordering

Delta sections may appear in any order. The resulting logical snapshot MUST be identical regardless of section ordering. Encoders SHOULD use deterministic ordering (`removed`, `added`, `edges_removed`, `edges_added`) for reproducibility.

### 10.6 Combining sessions and deltas

Session references and delta encoding solve different problems (repeated declarations vs. changed data) and may be used independently or together. However:

- Delta `## added` sections MUST contain full node declarations, not bare session references. Delta reconstruction MUST be independent of conversational context.
- Session reset MUST NOT invalidate the identity of a retained delta snapshot. A consumer may retain a graph snapshot even after its session state is cleared.
- If a consumer retains a `pack_root` but has lost the session context for the symbols within it, the producer MUST either send a full payload or a delta with complete declarations in `## added`.

## 10a. Delta Encoding (Generic Profile)

The generic profile (Section 7) supports delta encoding using the same mechanism as the graph profile (Section 10). When the consumer sends a `pack_root` from a prior response and the current result differs, the server MAY return a delta payload containing only what changed. Generic delta is a **keyed diff with set semantics**: identity is a single designated column, and row order is neither preserved nor communicated across a delta.

Generic delta inherits, unchanged: the three-outcome protocol (Section 10.3), the `gcf-pack-root-v1` algorithm and unknown-algorithm fallback (Section 10.2), atomic delta application (Section 10.4), and session scope (Section 9.3). It adds an identity column, a `## changed` section, and a row-based canonical record (Section 10a.3).

Delta is opt-in and bilateral: a server emits a delta only after the consumer has echoed a `pack_root` the server recognizes as a known base; otherwise it returns a full payload. A server MAY return a full payload at any time, for any reason, and a consumer MUST apply an `unchanged`, `delta`, or `full` payload identically regardless of what preceded it. This cadence-agnostic guarantee is what allows a producer to re-anchor on any schedule (Section 10a.8).

```
GCF profile=generic pack_root=sha256:aaa9f2... key=id
## orders [3]{@id,total,status,customer}
1001|59.98|shipped|Alice
1002|29.99|pending|Bob
1003|129.50|shipped|Carol
```

### 10a.1 Identity column

A generic payload that participates in delta MUST designate exactly one field as the identity key:

1. In the tabular field declaration, prefix that field with `@` (an `id-field`).
2. In the header, declare `key=<field>` naming the same field.

```
id-field = "@" key
```

Where `key` is defined in Section 2a. Because `@` cannot begin a bare-key (Section 2a.1), `@id` is unambiguous. The `id-field` form is valid only in a delta-participating generic tabular header.

The `@`-marked field and the `key=` value MUST name the same field. Identity values MUST be unique within the set; a decoder encountering duplicate identity values MUST reject the payload. A delta-participating full payload MUST carry both `pack_root` and `key` in its header and exactly one `@`-marked field in its declaration. Payloads that do not participate in delta use the standard generic header and field declaration (Sections 3.3, 7.4) with no `@` field and no `key`.

### 10a.2 Delta sections

A delta payload sets `delta=true` and carries `base_root` and `new_root`:

```
GCF profile=generic delta=true base_root=sha256:aaa9f2... new_root=sha256:bbb4c7... key=id
## added [1]{@id,total,status,customer}
1004|75.00|pending|Dave
## changed [1]{@id,total,status,customer}
1002|29.99|shipped|Bob
## removed [1]{@id}
1001
```

| Section | Content |
|---------|---------|
| `## added` | Rows whose identity is not in the base. Full rows, all declared columns. |
| `## changed` | Rows whose identity is in the base but whose contents differ. Full rows; each **replaces** the base row with the same identity (no field-level patch). |
| `## removed` | Identity values present in the base but not in the current set. One identity value per line; declaration is `{@<key>}`. |

When `delta=true`, only these three section names are valid. `added` and `changed` rows MUST use the full generic tabular row grammar (Section 7.4); `removed` lines MUST contain only the identity value. Section-label words are content after `##`, not delimiters. A server SHOULD use delta encoding only when it saves significantly over full retransmission; a threshold of 60% (delta MUST be less than 60% of full size) is RECOMMENDED, matching Section 10.1.

### 10a.3 Generic canonical pack root (`gcf-pack-root-v1`, generic profile)

`pack_root` identifies a logical keyed set. Two implementations given the same logical set MUST compute the same `pack_root`. The algorithm of Section 10.2 applies with a row record in place of the symbol and edge records:

1. Validate all strings as UTF-8 Unicode scalar-value sequences.
2. Build one canonical record per row. Fields (including the identity field) are ordered by field-name unsigned UTF-8 byte order. Each value is canonicalized for hashing — distinct from the wire cell encoding of Section 7.4, which carries delimiter and absent-marker concerns irrelevant to a hash: `null` is `-`; booleans are `true` / `false`; numbers use canonical formatting (Section 2.3.1); strings are ALWAYS quoted using the Section 2.2 escaping. Always-quoting strings makes the form both collision-free (a string spelling a typed literal, e.g. `"true"` or `"-"`, cannot be mistaken for the literal) and record-safe (a `<TAB>` or `<LF>` inside a string is escaped and cannot break the record):

   ```
   R<TAB>field1<TAB>value1<TAB>field2<TAB>value2 ... <LF>
   ```

3. Sort all row records by unsigned UTF-8 byte order.
4. Concatenate the sorted records into one byte sequence.
5. Compute SHA-256; serialize as `sha256:<64 lowercase hex characters>`.

Row order in the payload does not affect the hash (set semantics). `base_root` is the consumer's held root; `new_root` is the hash of the post-delta set. A consumer receiving a root with an unrecognized algorithm prefix MUST treat it as unknown and request a full payload (Section 10.2).

### 10a.4 Three-outcome protocol

Inherited from Section 10.3. When a consumer sends `pack_root`:

1. **Same root**: return a header-only payload with `unchanged=true`, `pack_root=<hash>`, and `count=N`.
2. **Different root, prior known**: return a delta payload with `base_root` and `new_root`.
3. **Different root, prior unknown** (or expired, or no echo): return a full payload (fallback).

```
GCF profile=generic unchanged=true pack_root=sha256:bbb4c7... count=3
```

### 10a.5 Delta application

Inherited from Section 10.4, with keyed semantics. A consumer MUST apply a delta atomically:

1. Verify that the consumer's current root equals `base_root`.
2. Validate the entire delta payload before modifying local state.
3. Reject contradictory operations: an `added` identity already present in the base; a `changed` or `removed` identity absent from the base.
4. On a temporary copy of the base set: insert each `added` row; **replace** the same-identity row for each `changed` row; delete each `removed` identity. Every base row not named in the delta is retained unchanged (silence means "keep it").
5. Compute the canonical `pack_root` of the result (Section 10a.3).
6. Verify it equals `new_root`.
7. Commit only after verification succeeds. If any step fails, retain the base unchanged and request a full payload. Partial application is not permitted.

### 10a.6 Ordering and set semantics

Delta sections may appear in any order, and rows within a section may appear in any order; the resulting logical set MUST be identical. Encoders SHOULD use deterministic ordering (`added`, `changed`, `removed`) for reproducibility. Payload row order is not significant and MUST NOT be relied upon. A producer that needs to convey order MUST carry an explicit rank or sort field as data and update it like any other column.

### 10a.7 Fallback rules

- **No identity, or duplicate identity values**: the producer MUST NOT emit a delta; send full.
- **Schema change** (the field set differs from the base): send full.
- **Size guard**: if the delta is not smaller than the size-guard threshold (Section 10a.2), send full.
- `## changed` is whole-row replacement by identity; field-level patching is not defined in this version.
- Default (non-delta) generic payloads are unchanged by this section and retain all existing losslessness and comprehension guarantees.
- **Keyed maps (Section 7.2a) participate in delta unchanged by this section.** A keyed map is a keyed set whose identity is the map key: the buffered full payload renders as `## [N:]{@key,...}` with `key=<keyname>` in the header (the `@` and `:` both designate the key column), while delta payloads use the identity-column forms above (`## added`/`## changed [N]{@key,...}`, `## removed [N]{@key}`). `pack_root` is computed per Section 10a.3 with the map key as the identity field.

### 10a.8 Producer re-anchor guidance (informative)

This subsection is non-normative. Section 10a.5 guarantees the decoder applies any `unchanged`, `delta`, or `full` payload identically regardless of history, so a producer MAY proactively choose the `full` outcome on any schedule ("re-anchor") without any wire or decoder change.

Re-anchoring bounds accumulated-delta drift: some models reconstruct current state from a long delta chain less reliably at extreme session depth, and re-sending the full set periodically re-grounds them. Because the drift it addresses is a narrow, per-model edge case, a conservative policy suffices:

- **Default**: re-anchor every N turns with N = 15; or
- **Adaptive (recommended for varying churn)**: re-anchor when the cumulative delta since the last anchor approaches a full payload's size (the Section 10a.7 size-guard, applied across turns). This self-tunes: more anchors under high churn, rarely under low.

The optimal N is not specified and SHOULD NOT be over-tuned; it is a fallback cadence for a minority scenario, and roughly one full payload every N turns retains most of the delta savings.

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
- In tabular sections, data items are rows; attachments do not increment the count. In keyed maps (`[N:]`, Section 7.2a) data items are member rows.
- In expanded sections, data items are `@N` items; their indented descendants do not increment the parent count.
- Comment lines never increment a declared count.

### 13.2 Streaming mode

When a section header declares `[?]`:
- The actual count is determined by the `##! summary` trailer.
- If the trailer is present, the actual item count MUST match the trailer's declared count.
- If the trailer is absent, the decoder uses the actual count (see Section 8.6).
- In the generic profile, deferred `[?]` sections are matched to `counts` entries by document encounter order (Section 8.4). In the graph profile, the final `counts` entry is the edges `[?]` count; the preceding entries are per-group symbol counts and are informational.

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
- **LLM-parseable.** The format can be parsed by an LLM without special instructions. Validated: 100% accuracy on standard workloads (every frontier model), 91.2% on structurally complex code graphs (vs TOON 68.8%, JSON 54.1%). 2,500+ evaluations across 11 models and 4 providers.

## 16. Conformance

### 16.1 Encoder Conformance (Graph Profile)

Conforming graph-profile encoders MUST:

- Emit UTF-8 output with LF line endings
- Emit a header line beginning with `GCF profile=graph` (the `tool` field is optional, Section 3.2; emit it when a producing-tool name is available)
- Emit `symbols` in the header always; emit `budget`, `tokens`, and `edges` only when their value is nonzero, omitting each field when its value is zero (buffered mode). In streaming mode, omit the count fields (`symbols`, `edges`) and provide counts in `##! summary` (Section 8.4.1). A zero-valued count field is never emitted, so header output is deterministic across encoders.
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
- Emit `^` or `^{fields}` for nested values in tabular rows and exactly one matching attachment body
- NOT emit attachment markers outside tabular row cells
- When using inline object schemas, declare the schema on the first row and emit exactly one positional scalar body per inline attachment
- Omit an array attachment field declaration only when an identical shared schema was established for that field by an earlier row
- Select array encoding form per Section 7.3
- Emit primitive arrays inline as `name[count]: val1,val2,val3`
- Quote primitive array elements containing commas
- Use `@{id}` prefixes on tabular rows only when nested fields are present
- Use expanded per-item form (Section 7.6) for arrays containing mixed element types
- Emit root scalars as `=value`
- Emit root arrays with an anonymous `## [N]` header
- Encode a JSON object whose values are all objects forming a losslessly-tabular set as a keyed table `## [N:]{key,...}` (Section 7.2a), selecting the key-column label deterministically and the smallest valid Section 7.4 form per value field
- Use exactly two-space indentation per nesting level, except that inline object attachment bodies SHOULD appear at their parent row's indentation
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
- Accept the graph trailer `counts` field in either positional or labeled (`group:count`) form (Section 8.4.1)
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
- Parse `^{fields}` as an inline object schema declaration in a tabular row cell
- Reuse a previously declared field-scoped inline schema when a bare `^` is matched to a positional inline attachment
- Reject attachment markers outside tabular row cells or without exactly one matching attachment body
- Interpret `true` and `false` as booleans
- Parse bare tokens not matching the above as strings
- Parse keys using the common key grammar (Section 2a), supporting both bare and quoted forms
- Reject duplicate keys within the same object scope
- Parse tabular headers with `[count]{fields}` or `[?]{fields}` syntax, including quoted field names
- Split tabular rows on pipe (`|`) outside quoted strings
- Split primitive array values on comma (`,`) outside quoted strings
- Validate row value count against field count in the header
- Parse `.field` attachment lines as traditional nested object or array values
- Accept positional inline attachment bodies at the parent row's indentation or one level beneath it
- Match positional inline attachment bodies to eligible attachment-marker cells in field order
- Use a previously established field-scoped array schema when `.field [N]` omits `{fields}`; otherwise parse it as expanded form
- Ignore `[` and `]` characters inside quoted strings when locating array count brackets
- Parse `@{id}` prefixes on rows with nested fields
- Parse expanded per-item scalar, object, and array markers (`=`, `{}`, `[N]`)
- Parse a leading `=` line as a root scalar
- Parse an anonymous `## [N]` header as a root array
- Parse a `## [N:]{key,...}` header as a keyed map (Section 7.2a): reconstruct an object whose members are keyed by each row's cell 0, with cells 1..M as the value object; reject a keyed header with fewer than two fields, a row-width mismatch, or duplicate member keys
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
| Malformed header field | Key-value pair missing `=` |
| Duplicate header field | Same header key appears more than once |

#### Scalar errors

| Error | Condition |
|-------|-----------|
| Unterminated quote | Quoted string missing closing `"` |
| Invalid escape | Escape sequence not in the defined set (Section 2.2) |
| Trailing characters | Characters after closing quote of a quoted scalar |
| Invalid missing | `~` token outside a tabular row cell |
| Invalid attachment marker | `^` or `^{fields}` token outside a tabular row cell, or malformed inline field declaration |
| Invalid surrogate | Literal surrogate, isolated escaped surrogate, or malformed surrogate pair |
| Invalid UTF-8 | Input contains a malformed UTF-8 byte sequence |

#### Structural errors

| Error | Condition |
|-------|-----------|
| Duplicate key | Same key appears twice in the same object scope |
| Duplicate field name | Same field name appears twice in a tabular field declaration |
| Row width mismatch | Pipe-separated values in a row do not match field count |
| Count mismatch | Number of data items does not match declared `[count]` |
| Invalid count | `[count]` is not `0`, a non-zero decimal integer without leading zeros, or `?`, optionally followed by a `:` for a keyed map (Section 7.2a) |
| Tab indentation | Leading whitespace contains tab characters |
| Invalid indent | Indentation increases by more than one level |
| Invalid item ID | Expanded item ID or present tabular row ID does not equal its zero-based item index |
| Orphan attachment | A `.field` attachment whose name is neither a `^`-marked column of its row nor a `>`-containing field name (the sole legitimate bare attachment, Section 7.4.6.1.4). Such an attachment MUST be rejected, not absorbed as an undeclared extra field (that would decode to a record no encoder produces, breaking the round-trip invariant) |
| Orphan inline attachment | Positional inline body has no eligible attachment-marker cell |
| Missing attachment | Attachment-marker cell has no matching named or positional body |
| Duplicate attachment | More than one attachment targets the same field in one row |
| Inline width mismatch | Positional inline body value count does not match its declared inline schema |

#### Graph profile errors

| Error | Condition |
|-------|-----------|
| Invalid node line | Symbol line does not have exactly 5 positional fields |
| Invalid symbol ID | `@` prefix followed by non-integer |
| Invalid score | Score field does not match the score grammar (`[-]DIGITS.2DIGIT`) |
| Invalid edge syntax | Edge line missing `<` separator |
| Unknown edge reference | Edge references a symbol ID not declared earlier |
| Malformed delta | Delta payload uses an unknown section or a line form invalid for its section |

The tables above define the strict-mode error conditions across 4 categories (header, scalar, structural, graph). A decoder that accepts any of these conditions is non-conforming.

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

Media type: `application/vnd.gcf+text` (IANA registration pending)

File extension: `.gcf`

Charset: always UTF-8.

Implementations SHOULD use `application/vnd.gcf+text` as the Content-Type for GCF payloads. Implementations MAY fall back to `text/plain; charset=utf-8` when the receiver does not recognize the GCF media type.

## 19. Versioning and Status Lifecycle

### 19.1 Wire version

The format version is implicit in the header prefix `GCF`. Future post-adoption incompatible changes would use `GCF2`, `GCF3`, etc. Parsers encountering an unknown version prefix MUST reject the payload with an error rather than attempting best-effort parsing.

### 19.2 Specification status

This specification follows a three-stage lifecycle:

| Status | Meaning |
|--------|---------|
| **Draft** | Under active development. Breaking changes may occur. Implementations should track the spec but not depend on stability. |
| **Stable** | The grammar is frozen. No breaking changes. Additive extensions only. Implementations may depend on stability for production use. |
| **Frozen** | No changes of any kind. The specification is archived. |

Current status: **Stable** (v3.5.2 designated 2026-08-10; v3.5.1 2026-08-09; v3.5.0 2026-08-06).

### 19.3 Version history

This specification (v3.0) supersedes v2.0 and adds inline object schemas, positional inline attachment bodies, shared array attachment schemas, and expanded quoting protections. The graph profile is unchanged.

Since v3.0 the specification has grown additively only (Stable: no breaking changes): **v3.1** made the graph header `tool` field optional; **v3.2** added nested-object flattening (`>` path columns); **v3.3** added delta encoding for the generic profile (Section 10a), with the `@`-marked identity column and the non-normative producer re-anchor guidance (Section 10a.8); **v3.4** added an optional labeled form for the graph streaming trailer's `counts` field (Section 8.4.1), a producer-side comprehension aid whose default positional form is unchanged. Every extension through v3.4 is backward-compatible; a v3.0 decoder ignores what it does not recognize.

**v3.4.1** added a trailing `distance` field to the graph delta `## added` line (Section 10.1), so a consumer can reconstruct the new snapshot and verify `new_root` (`pack_root` includes distance; Sections 10.2, 10.4). A delta-only line-form correction.

**v3.5.0** added keyed-tabular map encoding (Section 7.2a): a JSON object whose values are all objects forming a losslessly-tabular set is encoded with the shared value fields declared once and one `key|values` row per member, marked by `[N:]`, first-class in nested (Sections 7.4.4, 7.6) and streaming (`[?:]`, Section 8) positions and reusing generic delta (Section 10a) unchanged with the map key as the delta identity. This changes the canonical output for such maps from per-key section blocks to a keyed table. Existing payloads are unaffected (the `[N:]` marker was previously an invalid count; all other constructs decode identically); a pre-v3.5 decoder rejects `[N:]`, so decoders MUST be updated to read v3.5 map output. Additive under the Stable lifecycle. v3.5.0 also canonicalizes negative zero to `0` for both integer and floating-point values (Section 2.3.1, superseding the prior sign-preserving guidance, since `-0` and `0` denote the same value and integer negative zero is not representable in most language number models), specifies that a buffered graph header omits zero-valued `budget`, `tokens`, and `edges` (Sections 3.2, 16.1), and states that structural tokens and delimiters are matched at the Unicode scalar (code point) level rather than grapheme clusters (Section 1).

**v3.5.2** (errata) clarifies that the `DIGIT` rules in the number grammar (Section 2.3) and the numeric-like classification (Section 2.4) are ASCII `0`-`9` per [RFC5234], and that non-ASCII Unicode decimal digits are not digits: a token such as `1.٥` does not match the number grammar and decodes as the string `"1.٥"`, never the number `1.5`. Not a grammar change (ABNF `DIGIT` was already ASCII); it makes the ASCII-only intent explicit because several SDKs used a regex `\d` in Unicode mode (matching `\p{Nd}`), which made encoders disagree on whether to quote such a value and let a bare non-ASCII-digit token decode as a number in one runtime while staying a string in another. A generic-encode/decode conformance fixture locks the ASCII-only behavior.

**v3.5.1** (errata) pins the graph score's two-decimal wire form to **round-half-to-even** applied to the exact IEEE-754 double (Section 5). The rounding mode was previously unspecified, so implementations diverged at exact binary midpoints: the printf-family SDKs (Go, Rust, Python, Swift, .NET) rounded half-to-even (`0.125` → `0.12`), while the round-half-up formatters (JavaScript `Number.toFixed`, Java `String.format` %f) produced `0.13`, a silent, non-interoperable wire. A clarification, not a grammar change: the two agree on every value except exact midpoints. TypeScript and Kotlin were corrected to match; a graph-encode midpoint conformance fixture locks it.

V3 is the only supported encoding. Decoders are not required to accept v2-style indented attachments. Encoders emit v3 grammar exclusively.

Versions v1.0 through v2.0 are considered pre-stable development and are not supported. Implementations MUST NOT maintain backward compatibility with pre-v3.0 encoding behavior.

## 20. Internationalization

GCF is a UTF-8 format. All text (keys, values, field names, qualified names) is UTF-8.

- Encoders MUST emit valid UTF-8. Decoders MUST reject malformed UTF-8 (Section 2.2).
- Implementations MUST NOT normalize Unicode. Byte-exact preservation is required for round-trip compliance. NFC, NFD, NFKC, and NFKD normalization are the application's concern, not the format's.
- Surrogate code points (U+D800 through U+DFFF) MUST NOT appear as literal UTF-8. They may only appear as `\uXXXX` escape pairs in quoted strings (Section 2.2).
- Bidirectional text in keys and values is preserved as-is. GCF does not insert or require directional markers.
- String comparison for duplicate-key detection (Section 2a.2) is byte-level, not code-point-level. Two keys that differ only by Unicode normalization form are considered distinct.
- The generic profile supports the full Unicode range in keys and values (via the common key grammar in Section 2a and quoted strings in Section 2.2). The graph profile restricts `qname`, `provenance`, and `edge-type` to printable non-whitespace ASCII (`%x21-7E`) because these fields are positional and whitespace-delimited. This is a deliberate constraint of the graph profile, not a limitation of the format.

## 21. Intellectual Property

This specification is released under the MIT License. No patent disclosures are known at the time of publication. The authors intend this specification to be freely implementable without royalty requirements.
