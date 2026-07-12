# GCF multi-turn delta comprehension eval

Does an LLM **comprehend** GCF generic-profile `delta` output across a multi-turn
session, or only compress it? This experiment measures answer accuracy on questions
about an evolving table delivered two ways, and isolates where (and why) accuracy drops.

**Status: delta is comprehended losslessly, and it holds at depth.** On short sessions (6 to 15
turns) per-record retrieval scores 100% across three vendors weak to frontier (`gpt-5.5` via codex
CLI, `google/gemini-2.5-flash`, `claude-sonnet-4-6`); the only variance is whole-table arithmetic,
which tracks model strength (deprecated as a delta metric). A follow-on 50-turn study confirms it
holds at depth too: **six of seven cleanly-measured models are flat or better vs full-resend** (two
frontier delta-only runs flat at 100 including `deepseek-v4-flash`, a capable cross-vendor model flat,
an MoE with delta BEATING resend). Treat exact percentages as indicative (modest corpus, no
temperature sweep).

**The one edge case, and its fix.** Exactly one model (llama-3.3-70b) drifts below its own resend
(~12pp at turns 41-50, reproduced 3x, deterministic stale-state misses). It is a narrow per-model
accumulation effect, not a general property of delta or of mid-tier models, and it is closed by a
producer-side **periodic re-anchor** (re-send the full table every ~15 turns = the protocol's "full"
outcome on a schedule, no wire change): deep accuracy back to 100%, reproduced across two runs. Full
detail, per-model tables, gates, provenance, and the corrections we made along the way are in
**[DEPTH-FINDINGS.md](./DEPTH-FINDINGS.md)**.

**Shipped.** The wire format this eval exercises is standardized as **SPEC §10a** (delta encoding for
the generic profile), released in GCF **v3.3.0**, with byte-identical reference implementations across
all six SDKs (go, python, typescript, rust, swift, kotlin).

## The headline result (read this first)

**Generic-profile delta is comprehended losslessly over many turns.** On the delta arm,
every *per-record* question type is answered essentially perfectly, and this held up when
the tables were scaled up and the churn increased:

| Delta-arm question type | Expanded baseline (no trailer), 100-120 row tables |
|---|---|
| changed_stale (was updated, give current) | 48/48 |
| latest_of_multiple (updated 2+ times) | 33/33 |
| removed_absent (deleted, is it gone) | 48/48 |
| present_control | 48/48 |
| unchanged_persistence (silent-carry trap) | 48/48 |
| added_lookup (arrived only via a delta) | 44/44 |
| **count / aggregate_count (whole-table tally)** | **46/48, 36/48** |

Every fact the model must *track* across the delta stream — including facts that only
ever arrived as an incremental add/remove, and rows silently carried unchanged for many
turns — it gets right. This is the result that matters: it turns GCF delta from a
token-count optimization into evidence of a real, comprehensible multi-turn capability.

The **only** weakness is arithmetic: tallying a whole 100-120 row table in the model's
head after many incremental changes. That is an LLM counting limitation, not a failure to
read the delta encoding, and it is separable (below).

## The enhancement (a nice add-on, not the core finding)

The counting gap is closed by emitting the authoritative aggregate the server already
knows in GCF's native `##!` summary trailer, turning a "compute" question into a "lookup":

```
## added
@52 99|shipped|west|Cust8
## removed
@7
##! rows=118 shipped=41 open=22 pending=19 cancelled=20 refunded=16
```

With the trailer, delta count/aggregate go to 48/48 and 48/48, and the delta arm reaches
100% — on the harder corpus it slightly **beats** full-resend, because counting a status
across a large materialized table is exactly where re-sending everything gives the model
no help.

## Cross-model generalization (the important check)

The core capability holds across **three models from three vendors, spanning weak to frontier**
(resolved model recorded per call). Delta arm, full 4-scenario corpus:

| Model | resolved | per-record retrieval | count | aggregate | delta acc (no trailer) | delta acc (trailer) |
|---|---|---|---|---|---|---|
| gpt-5.5 | gpt-5.5 (codex CLI default) | all types 100% | 46/48 | 36/48 | 96.2% | 100% |
| gemini-2.5-flash | google/gemini-2.5-flash | all types 100% | 18/48 | 4/48 | 79.7% | 100% |
| claude-sonnet (frontier) | claude-sonnet-4-6 | all types 100% | 47/48 | 47/48 | 99.5% | not run* |

*Sonnet's only 2 misses are arithmetic off-by-one (count/aggregate); the trailer was not run
for it because the trailer -> 100% mechanism is already demonstrated on the two models with far
larger arithmetic gaps.

Two conclusions:

1. **Per-record delta comprehension is model-independent.** All three models score 100% on every
   per-record type (changed/added-via-delta/removed/silently-persisted/latest-of-multiple),
   verified from transcripts: 365 delta questions each, 0 per-record misses, 0 fragile-correct.
   The encoding is comprehensible, not a single-model quirk.
2. **The only variance is arithmetic, and it tracks model strength.** Whole-table tallying is
   the sole failure mode, and it scales monotonically with model capability: gemini-flash worst
   (aggregate 4/48 = 8%), gpt-5.5 middle (36/48 = 75%), Sonnet near-perfect (47/48 = 98%). The
   `##!` trailer converts "compute" to "lookup" and takes every model to 100%, helping most
   exactly where the model is weakest (gemini's no-trailer delta arm jumps 79.7% -> 100% and
   then *beats* full-resend by 11.5pp).

## Full run matrix

Two corpora. Small = the original 2 scenarios (21 count + 21 aggregate probes). Expanded =
4 scenarios including 100- and 120-row tables with churn 10 and 20 (48 + 48 probes).

| Run | Model | Corpus | Trailer | delta acc | full-resend acc | gap |
|---|---|---|---|---|---|---|
| baseline run1 | gpt-5.5 | small | no | 97.3% | 100% | +2.7pp |
| baseline run2 | gpt-5.5 | small | no | 99.3% | 100% | +0.7pp |
| trailer pass1 | gpt-5.5 | small | yes | 100% | 100% | 0.0pp |
| trailer pass2 | gpt-5.5 | small | yes | 100% | 100% | 0.0pp |
| expanded baseline | gpt-5.5 | expanded | no | 96.2% | 98.4% | +2.2pp |
| expanded trailer | gpt-5.5 | expanded | yes | 100% | 99.7% | -0.3pp |
| gemini baseline | gemini-2.5-flash | expanded | no | 79.7% | 86.3% | +6.6pp |
| gemini trailer | gemini-2.5-flash | expanded | yes | 100% | 88.5% | -11.5pp |
| sonnet baseline | claude-sonnet-4-6 | expanded | no | 99.5% | (delta-only) | n/a |

The Sonnet run was delta-only (`--arms delta`) since only the delta arm bears on the claim and
the CLI backend is slow. Across every baseline run, 100% of the delta-arm misses are
count/aggregate_count. On the
expanded corpus full-resend *also* misses aggregates (counting is hard over big tables
regardless of format), and more so for the weaker model.

## Method

- **Two arms** replayed turn-by-turn as a conversation: `delta` (GCF `delta=true` with
  `## added/changed/removed`) vs `full_resend` (full `## orders` table re-encoded every
  turn). At each probe the model answers about the CURRENT table after applying all updates.
- **Ground truth** is computed from the true simulated state; the generator is deterministic
  (seeded), so fixtures are reproducible.
- **Harness self-validation** (the reason the numbers are trustworthy): three stubs run
  against every fixture. `perfect` (accumulates state) = 100% both arms; `wrong` = 0%; and
  the discriminating one, `latestFull` (reads only the last full payload, ignoring deltas)
  = 100% on full-resend but only ~41% on the delta arm. That flip proves the delta arm is a
  real comprehension test, not a giveaway.
- **Token context:** the delta feed is 65-89% smaller than re-sending the full table each
  turn (per-scenario, in `scripts/step2-gen.mjs` output). The comprehension parity is
  achieved while sending a fraction of the bytes.

## Layout

```
scripts/       step2-gen.mjs (fixtures), trailer-augment.mjs (##! trailer), step2-run.mjs (runner)
fixtures/
  original/    4 scenarios, plain delta
  trailer/     4 scenarios, delta + ##! authoritative-count trailer
results/
  small-corpus-baseline/   run1, run2
  small-corpus-trailer/    pass1, pass2
  expanded-baseline/       codex.json  (delta 96.2% / full 98.4%)
  expanded-trailer/        codex.json  (delta 100%  / full 99.7%)
logs/
  expanded-baseline/       96 per-probe transcripts (prompt + questions + raw codex I/O)
  expanded-trailer/        96 per-probe transcripts
  task-summaries/          harness stdout (progress + summary blocks) per run
```

Each `results/*/codex.json` keeps `summary` + a `rows[]` array with `{arm, depth, type,
ok, got, want}` for every probe, so any accuracy cut is reconstructable. Small-corpus runs
predate transcript logging, so they have result JSONs but no per-probe transcripts;
expanded runs have both.

## Reproduce

Run from this directory (the canonical home; scripts use only node builtins, no deps):

```bash
# Self-test the harness (no API): perfect=100% both arms, wrong=0%,
# latestFull ~100% on full-resend but low on delta (proves the delta arm is real).
node scripts/step2-run.mjs --self-test --fixtures fixtures/original

# A live pass (codex CLI, local auth):
STEP2_LOGDIR=logs/<run-name> node scripts/step2-run.mjs \
  --backend codex --fixtures fixtures/{original|trailer} --outdir results/<run-name>

# Delta-only (skip the slow full-resend arm), e.g. the 50-turn deep sweep:
STEP2_LOGDIR=logs/codex-delta50 node scripts/step2-run.mjs \
  --backend codex --arms delta --fixtures fixtures/deep50 --outdir results/codex-delta50
```

**Backends** (`--backend`): `codex` and `claude` (local CLI auth; `--model sonnet` etc.),
`openrouter` / `openai` / `omniroute` (HTTP; `openrouter` needs `OPENROUTER_API_KEY`,
`--model <slug>`). HTTP runs record the **exact resolved model** per call, both in the result
JSON (`resolvedModels`) and in each transcript (`resolved=`).

**Flags:** `--fixtures DIR`, `--outdir DIR`, `--model SLUG`, `--arms delta[,full_resend]`,
plus `--base-url` / `--api-key-env` for HTTP. Set `STEP2_LOGDIR=DIR` to capture per-probe
transcripts (prompt, questions, parsed answers, raw model output). The full flag reference is
the header comment in `scripts/step2-run.mjs`.

**Regenerating fixtures:** `node scripts/step2-gen.mjs` writes to `fixtures/original/`
(deterministic per seed); `node scripts/trailer-augment.mjs` derives `fixtures/trailer/` (the
`##!` summary variant) from it.

## Next

1. **Depth hardening — done.** The 50-turn depth study (**[DEPTH-FINDINGS.md](./DEPTH-FINDINGS.md)**)
   took this past internal signal: seven cleanly-measured models across many vendors, with the
   full-resend control alongside where it matters. Remaining genuine open items are narrower: a
   *second* drifting model to confirm the re-anchor beyond llama-3.3-70b, and churn/table-size
   sensitivity (map where the drift onsets).
2. **A separate session-dedup eval.** Dedup (`session=true`, bare `@id  # previously
   transmitted`) is the next capability, but it asks a *different, harder* question and must
   be proven on its own terms, not assumed from this delta result: can the model resolve a
   bare `@id` to a symbol definition that was deliberately withheld from the current call and
   last sent N turns ago? That needs its own discriminating stub (a `lastCallOnly` responder
   that must fail the session arm) and a recall-distance metric. Delta comprehension does not
   imply dedup comprehension: applying a visible update is easier than recalling a withheld one.
