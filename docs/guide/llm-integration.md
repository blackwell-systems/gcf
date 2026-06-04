# Using GCF with LLMs

GCF is a **tool-to-LLM format**. Tools produce GCF; LLMs consume it. The LLM never needs to generate GCF, only understand what it reads. This is a deliberate design choice: encoding correctness is the tool's responsibility, not the model's.

## No primer needed (proven)

GCF payloads are immediately comprehensible to frontier models without any format description in the prompt. This isn't a claim; it's measured.

The [comprehension eval](https://github.com/blackwell-systems/gcf-go/tree/main/eval) sends a 500-symbol, 200-edge GCF payload to an LLM with **zero format instructions**, only the raw payload and a question. Results:

| Question | What the LLM must extract | GCF | TOON | JSON |
|----------|--------------------------|-----|------|------|
| How many symbols? | Count all records | **500** | 500 | 320 |
| How many edges? | Count relationships | **200** | 200 | 200 |
| Highest-scored symbol name? | Find max by 4th field | **Correct** | Correct | Correct |
| Kind of highest-scored symbol? | Read 2nd field of top record | **Correct** | Correct | Correct |
| How many targets (distance 0)? | Count records in first section | **166** | 166 | 240 |
| All unique edge types? | Deduplicate 3rd field of edges | **Correct** | Correct | Correct |

**GCF: 6/6. TOON: 6/6. JSON: 4/6.**

JSON fails on counting tasks at scale because field-name repetition creates noise that overwhelms the model's counting circuits. GCF and TOON both score 100%, but GCF does it in **32% fewer tokens** than TOON and **79% fewer** than JSON.

The model was never told what `@0`, `##`, or `<` mean. It figured it out from the structure. The format is regular enough (positional fields, consistent prefixes, section headers) that pattern recognition handles it.

If you want to include a primer for clarity:

```
GCF format: Symbols are @id kind qualified_name score provenance. 
Edges are @target<@source type. Sections marked with ##.
```

That's sufficient. Don't over-explain.

## Why not bidirectional?

TOON positions itself as bidirectional: LLMs read and write TOON. This means TOON must worry about output validation, strict mode, count mismatches, and model-generated formatting errors.

GCF avoids this entirely. The tool encodes; the LLM reads. Benefits:

- **No output validation needed.** The tool produces correct GCF every time. No strict mode, no count checking, no error recovery.
- **No generation prompts needed.** You never need to teach the model TOON's syntax rules, indentation, or delimiter conventions.
- **Simpler integration.** One function call (`encode()`) on the tool side. Nothing on the LLM side.

If the LLM needs to return structured data, it returns JSON (which every model already knows). GCF handles the expensive direction: tool responses that consume context window tokens.

## Prompt patterns

### Code intelligence context

```
Here is the code context for this task:

{gcf_payload}

Based on this context, implement the requested feature.
```

The LLM reads the GCF payload naturally. It identifies top-scored symbols, traces call paths through edges, and understands code topology from the hierarchical grouping (`## targets`, `## related`, `## extended`).

### Incremental updates (delta)

```
The context has been updated. Here's what changed:

{gcf_delta_payload}

The symbols in ## removed are no longer relevant. 
The symbols in ## added are new. Adjust your approach.
```

### Session continuity

When using session deduplication, the LLM sees bare references (`@7  # previously transmitted`) alongside full declarations. It doesn't need to act on the bare refs; they're context markers confirming overlap with prior responses. The LLM already has the full declaration from an earlier message in the conversation.

### Generic data

```
Here is the data:

{gcf_tabular_payload}

Analyze the trends and summarize.
```

The tabular format (`## employees [3]{id,name,department,salary}` followed by pipe-separated rows) is structurally similar to CSV with headers, which every model handles natively.

## What LLMs extract from GCF

The format's regularity makes structured extraction reliable:

- Every symbol starts with `@{id}` (filter by prefix)
- Kind is always the 2nd field (filter by type)
- Score is always the 4th field (sort by relevance)
- `## targets` is always the most relevant subset (skip to what matters)
- Edges use `@target<@source type` (trace call paths)

For the tabular profile:
- `## name [count]{fields}` declares the schema (one line)
- Rows are positional values separated by `|`
- Nested objects appear indented with `.fieldname`

## Token budget management

GCF payloads include `budget` and `tokens` in the header:

```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=10
```

The producing tool packs symbols up to the budget. The consumer can verify how much budget was consumed. This enables multi-tool orchestration where each tool gets a share of the total context budget.

## Error handling

If the LLM receives truncated GCF (response cut off):
- The `symbols=N` header field lets it verify completeness
- Group headers are self-describing (missing `## edges` means no edges were included)
- Each line is independent (a truncated line doesn't break parsing of prior lines)

## Reproduce the eval

```bash
git clone https://github.com/blackwell-systems/gcf-go
cd gcf-go/eval
GOWORK=off go test -run TestComprehension -v -timeout 15m
```

The eval generates a 500-symbol, 200-edge payload, encodes it in GCF, TOON, and JSON, sends each to an LLM, and measures accuracy on the 6 questions above. Deterministic ground truth, no LLM judge.
