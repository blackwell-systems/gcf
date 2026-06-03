# Using GCF with LLMs

GCF is designed to be consumed by LLMs without special instructions. The format is self-documenting: section headers name the groups, positional fields are consistent, and the structure is flat enough that models parse it through pattern recognition.

## No primer needed

Unlike formats that require explanation (YAML's indentation rules, XML's tag semantics), GCF payloads are immediately comprehensible to frontier models. In testing at 500 symbols, models achieved 100% accuracy on structured extraction questions without any format description in the prompt.

If you want to include a primer for clarity:

```
GCF format: Symbols are @id kind qualified_name score provenance. 
Edges are @target<@source type. Sections marked with ##.
```

That's sufficient. Don't over-explain.

## Prompt patterns

### "What symbols are relevant to this task?"

```
Here is the code context:

{gcf_payload}

Based on this context, implement the feature described below.
```

The LLM reads the GCF payload naturally. It can identify top-scored symbols, trace call paths through edges, and understand the code topology from the hierarchical grouping.

### "What changed since last time?"

```
The context has been updated. Here's what changed:

{gcf_delta_payload}

The symbols in ## removed are no longer relevant. 
The symbols in ## added are new context. Adjust your approach.
```

### Session continuity

When using session deduplication, the LLM sees bare references (`@7  # previously transmitted`) alongside full declarations. It doesn't need to act on the bare refs; they're context markers that confirm overlap with prior responses.

## What LLMs extract from GCF

Based on the comprehension eval (6 question types at 500 symbols):

| Question type | What the LLM extracts | Accuracy |
|--------------|----------------------|----------|
| Symbol count | How many symbols total | 100% |
| Edge count | How many edges total | 100% |
| Top symbol | Highest-scored symbol name | 100% |
| Top kind | Kind of the top symbol | 100% |
| Target count | Symbols at distance 0 | 100% |
| Edge types | All unique edge types | 100% |

JSON scored 66.7% on the same questions because field-name noise at 500 records overwhelms the model's counting circuits.

## Token budget management

GCF payloads include `budget` and `tokens` in the header. Use these for client-side budget tracking:

```
GCF tool=context_for_task budget=5000 tokens=1847 symbols=10
```

The producing tool can pack symbols up to the budget, and the consumer can verify how much budget was consumed. This enables multi-tool orchestration where each tool gets a share of the total context budget.

## Structured extraction from GCF

If you need the LLM to extract structured data FROM a GCF payload (e.g., "list all function names"), the format's regularity makes this reliable:

- Every symbol starts with `@{id}` (easy to regex)
- Kind is always the second field (filter by type)
- Score is always the fourth field (sort by relevance)
- The `## targets` section is always the most relevant subset

## Error handling

If the LLM receives malformed GCF (truncated response, encoding error):
- The `symbols=N` header field lets it verify completeness
- Group headers are self-describing (missing `## edges` means no edges)
- Each line is independent (a corrupt line doesn't break parsing of subsequent lines)
