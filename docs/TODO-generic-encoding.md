# TODO: Generic Tabular Encoding (Priority)

## Problem

The GCF spec defines a grammar (## headers, @id, positional fields, pipe separators)
that works on any structured data. But the libraries (gcf-go, gcf-typescript, gcf-python)
only implement encoding for the `Payload` type (symbols + edges, the code graph shape
that knowing produces).

We ran TOON's benchmark by writing a custom formatter (`toon-benchmark/benchmarks/src/gcf-formatter.ts`)
that applies GCF's grammar to generic JSON arrays. This formatter uses valid GCF syntax
but is a standalone script, not part of the published libraries.

This means: the benchmark claims ("GCF 34% fewer tokens than TOON") are backed by
a one-off formatter, not by shipped library code. We need to close this gap.

## What the benchmark formatter does

File: `/Users/dayna.blackwell/code/toon-benchmark/benchmarks/src/gcf-formatter.ts`

For arrays of uniform objects, it produces:
```
## employees [3]{id,name,email,department,salary}
1|Alice Smith|alice@co.com|Engineering|95000
2|Bob Jones|bob@co.com|Sales|72000
3|Carol Wu|carol@co.com|Marketing|85000
```

For nested objects, it uses `@N` IDs and indented sub-objects.
For mixed data, primitive fields go in the tabular row, nested fields inline below.

This IS valid GCF grammar (## headers, positional fields, pipe separators). But our
published `Decode()` functions won't parse it because they expect Payload/Symbol/Edge.

## What needs to happen

1. **Add generic encoding to all three libraries:**
   - gcf-go: `func EncodeGeneric(data any) string`
   - gcf-typescript: `export function encodeGeneric(data: unknown): string`
   - gcf-python: `def encode_generic(data: Any) -> str`

2. **Add generic decoding (optional, lower priority):**
   - Parse the tabular format back into structured data
   - Less critical since LLMs consume but don't produce GCF

3. **Update the spec** to explicitly document the tabular profile:
   - Section 4 currently only shows `@id kind qname score provenance` (graph nodes)
   - Add a section for generic tabular encoding: `## name [N]{field1,field2,...}` + rows

4. **Replace the benchmark formatter** with a call to the actual library:
   - `toon-benchmark/benchmarks/src/formatters.ts` should import from `@blackwell-systems/gcf`
   - Uses `encodeGeneric(data)` instead of the custom `encodeGCF(data)`

5. **Verify benchmark numbers don't change** (they shouldn't; same encoding logic)

## Design for EncodeGeneric

The formatter already has the right algorithm:
- Detect uniform object arrays → tabular encoding (header + positional rows)
- Nested objects → `key=value` or `## section` depending on depth
- Pipe separator (no spaces) for maximum density
- No @id prefix for pure flat rows (only when nested data needs cross-referencing)

The conservative version (no @id for flat rows) is what won the benchmark.
The full version (with @id) is what the graph profile uses.

Both are valid. EncodeGeneric should use the benchmark's approach (no @id for flat,
@id only when nested fields need referencing).

## Reference files

- Benchmark formatter: `/Users/dayna.blackwell/code/toon-benchmark/benchmarks/src/gcf-formatter.ts`
- GCF spec: `/Users/dayna.blackwell/code/gcf/SPEC.md`
- gcf-go encode: `/Users/dayna.blackwell/code/gcf-go/gcf.go` (Encode function)
- gcf-typescript encode: `/Users/dayna.blackwell/code/gcf-typescript/src/encode.ts`
- gcf-python encode: `/Users/dayna.blackwell/code/gcf-python/src/gcf/encode.py`
- Blog post claiming the numbers: `/Users/dayna.blackwell/code/blog/content/posts/gcf-wire-format-benchmark.md`
- LinkedIn post references same data

## Urgency

The benchmark numbers are public (blog, LinkedIn, READMEs). They're technically correct
(the encoding IS GCF grammar applied to generic data) but the claim is stronger when
backed by a shipped library function, not a standalone script. This should be done
before anyone looks closely enough to notice the gap.
