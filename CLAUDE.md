# GCF Project Instructions

## Eval Data Update Procedure

When new comprehension or generation eval runs are added, the following files must be updated. Do all of them in a single pass. Do not wait to be asked.

**CRITICAL: Never copy numbers from existing docs or memory. Always recompute from the raw log files.** Stale numbers have propagated before because averages were copied from one surface to another instead of recomputed. The log files in `eval/results/comprehension/` are the single source of truth.

### Step 0: Verify from raw logs

Before updating anything, recompute all headline numbers from the raw log files:

```python
# Run this from eval/results/comprehension/
# Parse ALL comprehension-13q-*.log AND any .txt files with comprehension data
# Extract per-format scores, group by model, compute per-model averages
# Then average the per-model averages (NOT the per-run averages)
# This is the "average of model averages" methodology
```

**Known naming inconsistencies in log files:**
- Some runs use hyphens (`gemini-2.5-flash`), others don't (`gemini25flash`). Same model.
- Some runs are `.txt` not `.log` (e.g., `haiku-4.5-run2.txt`). Still valid data.
- Opus has `run2` but no `run1` comprehension log. Only 1 adversarial run exists.
- Always glob for both `comprehension-13q-*` AND any other `.txt` files with comprehension data.

### Step 1: Record the run

- Save log file to `eval/results/comprehension/` or `eval/results/generation/` with standard naming: `comprehension-13q-{model}-run{N}-{date}.log` or `generation-{model}-run{N}-{date}.log`

### Step 2: Update SUMMARY (this repo)

- `eval/results/SUMMARY.md`: Add to "All runs" table, update "Averages by model" table, update file listing. If failure taxonomy counts change, update those too.

### Step 3: Recalculate headline numbers

After updating the SUMMARY, recalculate FROM RAW LOGS (not from existing docs):
- **Overall GCF average**: average of per-model averages (not average of all runs; models with more runs should not be overweighted)
- **Run count**: total comprehension runs, total generation runs
- **Win/tie/loss record**: GCF vs TOON across all comprehension runs
- **Total evaluations**: (comprehension runs x 13 questions x 3 formats) + (generation runs x 5 sizes x 3 formats)
- **Model count**: count of distinct models (combine same-model runs with different naming)

### Step 4: Update all surfaces

These files contain hardcoded eval numbers. **All must be updated when headline numbers change.**

**gcf repo (spec/docs):**
- `README.md` (headline stats, benchmark table)
- `eval/README.md`
- `ROADMAP.md`
- `.zenodo.json`
- `docs/index.md` (landing page tagline, feature cards)
- `docs/.vitepress/config.ts` (OG/Twitter meta descriptions)
- `docs/.vitepress/theme/components/FeatureCards.vue`
- `docs/.vitepress/theme/components/Playground.vue`
- `docs/guide/benchmarks.md` (summary table, per-model table)
- `docs/guide/eval-results.md` (all runs table, failure taxonomy)
- `docs/guide/format-overview.md`
- `docs/guide/getting-started.md`
- `docs/guide/llm-integration.md`
- `docs/guide/mcp.md`
- `docs/guide/vs-toon.md`
- `docs/guide/story.md`
- `docs/guide/faq.md`
- `docs/whitepaper.md`
- `docs/merge-barriers-in-bpe-tokenization.md`
- `docs/zenodo-tokenizer-metadata.json`
- `eval/OPERATIONAL-EVAL-DESIGN.md`

**Other repos:**
- `../gcf-proxy/README.md`
- `../gcf-proxy/pypi/README.md`
- `../gcf-go/README.md`
- `../gcf-typescript/README.md`
- `../gcf-python/README.md`
- `../gcf-rust/README.md`
- `../gcf-swift/README.md`
- `../gcf-kotlin/README.md`
- `../agent-lsp/README.md`
- `../betterthanjson/index.html`
- `../betterthanjson/README.md`
- `../jsonalternative/index.html`
- `../jsonalternative/README.md`
- `../betterthantoon/index.html`
- `../betterthantoon/README.md`
- `../blog/content/posts/llm-wire-format-comprehension-benchmark.md`
- `../blog/content/oss.md`
- `../toon-benchmark/GCF-COMPARISON.md`
- `../gcf-charts/charts.py` (data arrays for all charts, regenerate PNGs after updating)
- `../merge-barriers/RESEARCH.md`
- `../structok/paper/revision-v3.md` (if comprehension numbers are cited)

### Step 5: Commit and push

- Commit gcf repo first with all doc updates
- Then commit and push each external repo separately
- Use `git push` with the correct SSH alias (`github-blackwell` for blackwell-systems repos)

### Numbers that cascade

| Number | Where it comes from | How to compute |
|--------|-------------------|----------------|
| Overall GCF avg | Average of per-model averages | Group runs by model, avg each model, avg the model avgs |
| TOON avg | Average of per-model TOON averages | Same methodology |
| JSON avg | Average of per-model JSON averages | Same methodology |
| Run count | Count of log files | `ls comprehension-13q-*.log *.txt \| wc -l` (check for non-.log files) |
| Model count | Count of distinct models | Combine same-model runs with different naming |
| Total evaluations | Comprehension + generation totals | (comp runs x 13 x 3) + (gen runs x 5 x 3) |
| Win/tie/loss | Per-run GCF vs TOON comparison | GCF score > TOON score = win |
| Per-model averages | Mean of that model's runs | Used in charts.py data arrays |

### Step 6: Regenerate charts

If headline numbers, per-model averages, or failure counts changed:

1. Update data arrays in `../gcf-charts/charts.py` (verify each number against raw logs)
2. Run `python3 charts.py` to regenerate PNGs in `../gcf-charts/output/`
3. Copy updated PNGs to `docs/public/charts/` (same filenames, docs pick them up automatically)
4. Copy any shared charts to `../structok/charts/` and `../merge-barriers/charts/` if they appear in the paper
5. Commit all repos

### What NOT to update on every run

- Whitepaper PDF on Zenodo (only republish for major changes)
- LinkedIn/Reddit posts (they're snapshots in time)
- Merge barriers paper PDF (only re-render if the cited numbers change)
