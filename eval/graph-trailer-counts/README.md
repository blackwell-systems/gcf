# Graph streaming-trailer counts comprehension eval

Does the graph `##! summary` trailer's **per-group counts** measurably help LLM
counting-task comprehension, and is a **labeled** form better than the shipped
**positional** one? This settles the open question flagged in `SPEC.md` §8.4 and
`ROADMAP.md` ("Streaming trailer, per-group counts").

Background: in graph streaming the trailer reports one `counts=` entry per distance
group followed by the edge count (e.g. `counts=2,1,3` = 2 targets, 1 related, 3 edges).
All six SDKs emit this per-group form; it is never validated by any decoder, so it is
purely a comprehension aid. Comprehension evals to date used **buffered** payloads, so
the trailer's value has never been measured directly. This eval measures it.

## Design

Four arms, **identical graph**, differing only in the trailer the model is given (and a
one-paragraph primer that honestly describes that trailer):

| arm | trailer |
|-----|---------|
| `none` | (no `##! summary` line — the model must count the lines itself) |
| `totals` | `##! summary symbols=N edges=M` |
| `positional` | `##! summary symbols=N edges=M counts=2,1,3` (the shipped form) |
| `labeled` | `##! summary symbols=N edges=M counts=targets:2,related:1,edges:3` |

The decision contrasts, on **per-group counting accuracy**:

- **`totals − none`** — does a trailer help at all.
- **`positional − totals`** — do the per-group counts add anything over the totals (the money question).
- **`labeled − positional`** — is a labeled aid better than positional (i.e. did the historical `sections=`→`counts=` migration cost comprehension). Arm `labeled` doubles as a first data point for the `## _counts` roadmap item.

### Questions and ground truth

Per fixture (all ground truth computed programmatically from the generated graph):

- **per-group counting** (the aid targets these): "how many symbols in the `related` group?", "how many more in `targets` than `related`?", "combined targets+related?"
- **totals**: "how many symbols total?", "how many edges?"
- **controls** (must NOT regress with the aid): random symbol lookups — qualified name, kind, score — answerable only from the lines, independent of any trailer.

### The axis that should dominate: graph size

The mechanism is "read the count vs tally the lines." On a 15-symbol graph every model
counts fine and the aid does nothing; on a 500-symbol graph manual counting degrades and
the aid should shine. Size is a first-class factor: fixtures at **N≈15 / 100 / 500**
(`small`/`medium`/`large`), two seeded graphs each. If `positional − totals` is flat even
at N=500, that settles it toward "the per-group counts don't earn their tokens."

### Models

`scripts/sweep.mjs` `MODELS` spans the ability range via OpenRouter, plus the `codex` and
`claude` CLI backends for frontier models. Per-group aids are expected to help **most on
mid/open-tier models and large graphs**; frontier models mostly guard against a control
regression. Per the measurement-hygiene rule, a single model at low N is an internal signal
only, not a claim — hence `--repeats 3` and the full panel.

## Rigor / resilience (matches the delta eval runner)

- **5 backends**: `codex` (CLI, local auth), `claude` (CLI print mode, local auth), `openrouter` / `openai` / `omniroute` (HTTP).
- **Network resilience**: HTTP retries with exponential backoff + jitter (8 attempts, 45s cap) ride out 429/5xx and sustained rate limits under concurrent load rather than aborting.
- **Crash-partial**: scored probes accumulate incrementally; a terminal error writes PARTIAL results (exit 1) instead of losing the run — rerun to complete.
- **Resume**: a `(model, run)` is done iff its result JSON exists; completed runs are skipped. Stop and re-invoke any time.
- **Parallel, opt-in**: sequential by default; `--conc K` runs K models at once. `sweep.mjs` **refuses to run without an explicit `--model`/`--all` target**, and `--dry-run` shows the plan and spends nothing.
- **Resolved-model capture**: records the exact model each response reports serving (what an OpenRouter slug actually routed to).
- **Full transcripts in repo**: `EVAL_LOGDIR` writes a per-probe log (primer+payload prompt, questions with ground truth, parsed answers, raw output, resolved model). The sweep stores these under `logs/sweep/<model>/run<k>/` and results under `results/sweep/<model>/run<k>/`, both committed.

## Metrics and gates (matches `sweep-analyze.mjs`)

- Report the **arm-to-arm gap** on per-group counting, not absolute accuracy — controls for model/task variance.
- **comp-only** scoring credits format-misses (the right value present in the output but mis-parsed), so a parsing quirk isn't scored as a comprehension failure.
- **Blank-rate gate**: a model returning empty content (a provider artifact on large prompts) is excluded (`>= 5%` blank), not counted as a comprehension result.
- HTTP temperature defaults to `0.2`; note this makes CIs artificially tight — read the SD accordingly.
- Pair the accuracy delta with the token delta (`gen.mjs` prints `none->pos` char cost) so the answer is a tradeoff, not just a p-value.

## What each outcome decides

- **`positional > totals`, especially at large size / mid-tier, no control regression** → the per-group counts earn their tokens; SPEC §8.4 as written is validated. Keep shipping them.
- **`positional ≈ totals` everywhere** → redundant; the evidence-backed argument to make them optional or drop to totals-only.
- **`labeled > positional`** → keep per-group counts but switch to a labeled form; reopens the positional-vs-labeled decision deliberately.

## How to run

```bash
cd eval/graph-trailer-counts
command node scripts/gen.mjs                 # generate fixtures (local, no spend)
command node scripts/run.mjs --self-test     # validate the harness (no spend)

# single model (safe default: refuses without a target)
OPENROUTER_API_KEY=... command node scripts/sweep.mjs --model meta-llama/llama-3.1-8b-instruct
command node scripts/sweep.mjs --model x,y,z --conc 3        # a chosen list, parallel
command node scripts/sweep.mjs --backend claude --model sonnet
command node scripts/sweep.mjs --backend codex  --model gpt-5.5-codex
command node scripts/sweep.mjs --all --conc 4                # full panel (opt-in fan-out)
command node scripts/sweep.mjs --model <slug> --dry-run      # plan only, no spend

command node scripts/analyze.mjs             # gated per-arm contrasts + by-size trend
```

Cost scale: 6 fixtures × 4 arms × 10 questions = 24 model calls per run (~240 scored
answers), × `--repeats` × models. Small per model; the fan-out is the cost. Runs are
resumable and one-model-at-a-time by default — spend is opt-in and incremental.

## Harness self-test (already validated)

`run.mjs --self-test` runs three stubs with no API:

- `perfect` → 100% every arm (scoring + ground truth wired correctly).
- `wrong` → 0%.
- `aidReader` (reads the trailer but cannot tally lines) → **per-group counting 0% on `none`/`totals`, 100% on `positional`/`labeled`** (contrast `positional − totals = +100pp`), controls 100% everywhere. This proves the counting questions genuinely depend on the aid and the arms are separable — the eval can detect the effect if it exists.
