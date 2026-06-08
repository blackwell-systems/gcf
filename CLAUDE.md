# GCF Project Instructions

## Eval Data Update Procedure

When new comprehension or generation eval runs are added, the following files must be updated. Do all of them in a single pass. Do not wait to be asked.

### Step 1: Record the run

- Save log file to `eval/results/comprehension/` or `eval/results/generation/` with standard naming: `comprehension-13q-{model}-run{N}-{date}.log` or `generation-{model}-run{N}-{date}.log`

### Step 2: Update SUMMARY (this repo)

- `eval/results/SUMMARY.md`: Add to "All runs" table, update "Averages by model" table, update file listing. If failure taxonomy counts change, update those too.

### Step 3: Recalculate headline numbers

After updating the SUMMARY, recalculate:
- **Overall GCF average**: average of model averages (not average of all runs)
- **Run count**: total comprehension runs, total generation runs
- **Win/tie/loss record**: GCF vs TOON across all comprehension runs
- **Total evaluations**: (comprehension runs x 13 questions x 3 formats) + (generation runs x 5 sizes x 3 formats)

### Step 4: Update all surfaces

These files contain hardcoded eval numbers. **All must be updated when headline numbers change.**

**gcf repo (spec/docs):**
- `README.md` (headline stats, benchmark table)
- `eval/README.md`
- `ROADMAP.md`
- `.zenodo.json`
- `docs/index.md` (landing page tagline, feature cards)
- `docs/.vitepress/config.ts` (OG/Twitter meta descriptions)
- `docs/guide/benchmarks.md` (summary table, per-model table)
- `docs/guide/eval-results.md` (all runs table, failure taxonomy)
- `docs/guide/format-overview.md`
- `docs/guide/getting-started.md`
- `docs/guide/llm-integration.md`
- `docs/guide/mcp.md`
- `docs/guide/vs-toon.md`
- `docs/whitepaper.md`
- `docs/.vitepress/theme/components/Playground.vue`
- `eval/OPERATIONAL-EVAL-DESIGN.md`

**Other repos:**
- `../gcf-proxy/README.md`
- `../gcf-proxy/pypi/README.md`
- `../gcf-proxy/npm/gcf-proxy/README.md`
- `../gcf-go/README.md`
- `../gcf-typescript/README.md`
- `../gcf-python/README.md`
- `../gcf-rust/README.md`
- `../gcf-swift/README.md`
- `../gcf-kotlin/README.md`
- `../agent-lsp/README.md`
- `../betterthanjson/index.html`
- `../betterthanjson/README.md`
- `../blog/content/posts/llm-wire-format-comprehension-benchmark.md`
- `../blog/content/oss.md`
- `../toon-benchmark/GCF-COMPARISON.md`
- `../gcf-charts/charts.py` (data arrays for all charts, regenerate PNGs after updating)

### Step 5: Commit and push

- Commit gcf repo first with all doc updates
- Then commit and push each external repo separately

### Numbers that cascade

| Number | Where it comes from |
|--------|-------------------|
| Overall GCF avg (e.g. 90.7%) | Average of per-model averages |
| TOON avg (e.g. 68.5%) | Average of per-model TOON averages |
| JSON avg (e.g. 53.6%) | Average of per-model JSON averages |
| Run count (e.g. 23 comprehension) | Count of rows in "All runs" table |
| Total evaluations (e.g. 1,300+) | Comprehension + generation totals |
| Win/tie/loss (e.g. 22/1/0) | Per-run GCF vs TOON comparison |
| Per-model averages | Mean of that model's runs |
| Per-model GCF margin | Model GCF avg minus model TOON avg |

### Step 6: Regenerate charts

If headline numbers, per-model averages, or failure counts changed:

1. Update data arrays in `../gcf-charts/charts.py`
2. Run `python3 charts.py` to regenerate PNGs in `../gcf-charts/output/`
3. Copy updated PNGs to `docs/public/charts/` (same filenames, docs pick them up automatically)
4. Commit both repos

### What NOT to update on every run

- Whitepaper PDF on Zenodo (only republish for major changes)
- LinkedIn/Reddit posts (they're snapshots in time)
- Charts in gcf-charts repo (update in batches, not per-run)
