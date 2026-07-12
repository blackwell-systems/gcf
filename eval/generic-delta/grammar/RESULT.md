# `@id` identity-marker tokenization check (2026-07-11)

Targeted follow-up to the 43-tokenizer barrier-merge study (`gcf/eval/barrier-merge-rates.py`),
validating the ONE new construct generic delta introduces: an `@`-prefixed field name inside a
tabular field declaration (`{@id,total,status}`). Reuses that study's `load_tokenizer`,
`check_merge`, and `TEST_WORDS`; run against the same cached tokenizer set (42/43 loaded).

Run: `python at-field-merge-check.py` (needs `tokenizers` + `tiktoken`; HF cache; run from `gcf/eval`).

## Result

| Context | Mean @-merge | Max | Clean (0%) |
|---|---|---|---|
| bare `@field` | 4.40% | 15% | 29/42 |
| **`{@field,...}` (actual usage)** | **0.00%** | **0.0%** | **42/42** |
| `## orders [3]{@field,...}` | 0.12% | 5% | 41/42 |
| baseline general `@` (barrier study) | 1.09% | 3.9% | 30/42 |

Field-name integrity: `id` / `order_id` / `uuid` text-recoverable after `@` in 42/42 tokenizers.

## Conclusion

In the actual usage context (`{@id,...}`), `@id` merges 0.00% across all 42 tokenizers - cleaner
than bare `@field` and cleaner than the general `@` baseline, because the preceding `{` forces a
token boundary. `@id` is empirically validated as the generic-delta identity marker (consistent
with the graph profile's `@N` and the experimentally-selected `@` identity sigil).
