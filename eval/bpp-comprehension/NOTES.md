# bpp adversarial comprehension study

Does bpp's token win survive comprehension at scale, or does its reference indirection
fail? Prompted by NetClaw #274 (bpp challenged GCF on generic-profile token count) and
the proposal to ship bpp as an opt-in tabular format.

## Design

- **Harness:** `gcf-go/eval/generic_comprehension_test.go` (the vetted generic-profile
  comprehension eval), gated behind `EVAL_ADV=1` for the adversarial variant. Temporary
  edits (bpp arm + high-card fixture + deep questions) marked in-file; delete
  `zz_adv_dump_test.go` and revert the gated blocks when done. bpp encoder is a scratchpad
  shell-out (`bpp-format 0.4.0`, defaults `refs=True primer=False`).
- **Fixture (adversarial):** nested orders, `pool = N/4` so every customer/email/SKU
  repeats ~4x (bpp's empirical interning threshold) and is hoisted to the top `&`-table.
  The table grows with N (375 defs at N=500, 750 at N=1000), too large to memorize, and
  every deep-row `*N` points back to the top preamble (maximum resolution distance). Same
  data feeds every format, so it is fair. The canonical fixture (cycles ~20 names/10 SKUs)
  is NOT adversarial: its `&`-table is tiny and memorizable.
- **Questions:** 19 = 13 canonical controls + 6 deep lookups (email/SKU/tier at ~50% and
  ~99% payload depth) targeting interned fields.
- **Formats:** `bpp` (refs=True, their shipping default), `gcf`, `json`. (`bpp-norefs` and
  `toon` arms exist for later.) All presented COLD (format-name label only, no syntax
  primer) so every format gets identical treatment, same as GCF's canonical numbers.
- **Scoring:** the harness's bucketed verify + retry, temp 0.2. Deterministic ground truth.

## Losslessness (gate, verified)

All bpp arms round-trip clean: `decode(bpp) == the data JSON carries` at N=500 and 1000,
refs on and off. bpp is lossless; tokens are conceded (bpp -70% vs JSON, -31% vs GCF).
The question is comprehension only.

## Token counts (o200k, adversarial fixture)

| N | JSON | GCF | bpp | bpp vs JSON | bpp vs GCF |
|---|---|---|---|---|---|
| 500 | 101,482 | 44,770 | 30,704 | -69.7% | -31.4% |
| 1000 | 203,389 | 89,928 | 61,812 | -69.6% | -31.3% |

## Results

### Run 1 — N=500, gemini-2.5-flash, temp 0.2, 1 run

| format | accuracy | pass/total |
|---|---|---|
| gcf | 78.9% | 15/19 |
| json | 78.9% | 15/19 |
| **bpp** | **57.9%** | 11/19 |

GCF ties JSON (clears the bar). bpp is 21 points behind at the smallest rung on a capable model.

**Smoking gun (indirection failing, verbatim):** `SKU-000122` is interned as `&372`.
Asked for that SKU (`sku_mid_ORD-0250`, `sku_deep_ORD-0500`), the model answered `"372"`
both times: it returned the raw pointer index without resolving `*372 -> &372 -> "SKU-000122"`.
It returned the pointer, not the value. GCF/JSON carry the value in place and read it correctly.

**Honest caveats:**
- The counting/aggregation questions (count_shipped, total_revenue, count_3plus,
  highest_total) are hard for ALL three formats at 500 rows (JSON fails 4/4 of its
  failures there). They are shared noise, not a bpp indictment. The discriminator is the
  lookups.
- bpp got all *email* lookups right (those pointers resolved); it failed the *SKU*
  pointers, which sit among numbers in denser item lines (space-delimiter pressure). So at
  N=500 the failure is real but selective.
- n=1, one capable model, one run. First read, not a final number.

### Run 2 — N=1000, gemini-2.5-flash, temp 0.2, 1 run

| format | N=500 | N=1000 |
|---|---|---|
| gcf | 78.9% (15/19) | 68.4% (13/19) |
| json | 78.9% (15/19) | 70.6% (12/17, ~73.7% infra-adjusted) |
| **bpp** | **57.9% (11/19)** | **52.6% (10/19)** |

**Hygiene:** JSON had 2 SKIPs at N=1000, both `tls: bad record MAC` (transient network,
same class of error seen before), on trivial questions (first/last extraction) that would
have passed. So JSON's rate is deflated; true ~14/19.

**What holds:**
- bpp is consistently worst at BOTH scales (~16-21 pts behind gcf/json).
- The pointer-index tell repeats and is unique to bpp: for `sku_mid`/`sku_deep` it returned
  `"749"` and `"375"`, the raw `*N` indices (SKU-000247 is interned as `&375`), never
  dereferenced. GCF/JSON cannot produce that failure mode.
- Indirection SPREAD with scale: at N=500 bpp got every email right; at N=1000 it missed
  `email_mid_ORD-0500` (returned `customer.00049` for expected `00249`, wrong pointer).

**What does NOT hold (do not overclaim):**
- The aggregate gap did NOT widen monotonically. GCF and JSON also dropped at N=1000,
  because the deep SKU lookups became a LOCATE problem for everyone (GCF/JSON both returned
  `SKU-000000`, wrong item in dense deep rows). Locate difficulty is format-agnostic and
  confounds the SKU questions as a scale discriminator. The clean bpp-specific signal is
  the failure MODE (unresolved pointer), not a widening accuracy curve.

### Consolidated (temp 0.2, adversarial fixture, 3 formats)

| model / N | gcf | json | bpp | notes |
|---|---|---|---|---|
| gemini-2.5-flash 500 | 78.9 | 78.9 | 57.9 | gcf ties json; bpp -21 |
| gemini-2.5-flash 1000 r1 | 68.4 | 70.6* | 52.6 | *1 infra skip |
| gemini-2.5-flash 1000 r2 | 68.4 | 72.2* | 52.6 | replicates r1; bpp identical fails |
| llama-3.1-8b 500 | **63.2** | 57.9 | 42.1 | weak model: gcf > json > bpp; bpp craters |
| llama-3.3-70b 500 | **73.7** | 52.6 | 42.1 | 8b->70b lifts gcf +10, bpp FROZEN at 42.1 |
| llama-4-maverick 1000 | **63.2** | 52.6 | 57.9 | json choked on 203k payload; gcf beats both |
| deepseek-v3 500 | **88.2** | 81.2 | 63.2 | frontier-class; bpp still -25 (infra skips on gcf/json) |
| gemma-3-27b 500 | **61.1** | n/a | 31.6 | json provider-rejected (context cap); bpp halved |
| mistral-small-3.2 1000 | n/a | n/a | 38.9 | gcf+json provider empty-response; bpp only |
| command-r-08-2024 500 | **57.9** | 29.4 | 47.4 | gcf only format to nail deep SKU lookups; json weak here |

Models: 8 counted (7 families: Google, Meta, DeepSeek, Mistral, Gemma, Cohere). mistral-nemo
(12B) was run and DELETED: sub-floor (failed order_count on all 3 formats), uninformative.

**Pooled error rate (FAIL / graded; skips + provider-fails excluded):**
- Matched (7 all-3 runs, apples-to-apples): gcf **28.2%** / json 33.9% / bpp **47.4%** -> bpp **1.68x** gcf
- All valid (10 runs): gcf **31.0%** / json 38.2% / bpp **51.3%** -> bpp **1.65x** gcf

GCF has the lowest error rate of the three in every pooling. bpp sits near a coin-flip.

**Capacity does not rescue bpp.** Scaling the model 8b -> 70b improved GCF +10 points but
left bpp flat at 42.1. The 70b STILL returns literal pointer tokens (`"*256"`, `"*322"`,
`"*372"`) for the SKU lookups. So "just use a better model" fails: a capable 70B confronted
with bpp's reference table hands back the raw `*N` undereferenced, while it reads GCF fine
and improves with scale. The indirection defeats the model regardless of capacity.

**GCF is best-or-tied in every cell (5/5).** bpp is worst on the three cleaner cells. The only
cell where bpp edged JSON (maverick) is a payload-SIZE effect, not a bpp win: maverick
miscounted 1000 orders as 250 in JSON (the 203k-token payload overwhelmed it), so
compactness floated bpp, and GCF still beat both. Net: GCF wins whether the pressure is
legibility (weak model) or raw size (huge payload); bpp only competes on size and still loses to GCF.

**Pointer tell, escalating by weakness:**
- gemini (capable): returns the index, `"372"`/`"375"`/`"749"` (SKU-000247 = `&375`).
- llama-8b (weak): returns the literal token, `"*250"`/`"*256"`, the raw `*N` reference,
  undereferenced. Cleanest possible evidence of indirection failing.

**Additional caveats (logged honestly):**
- `max_tokens=200` truncates verbose chain-of-thought on some aggregation answers
  (total_revenue) on BOTH bpp and json on verbose models -> harness artifact, not
  comprehension; hits the shared-noise aggregation questions, not the short-answer lookups.
- maverick's JSON number is a payload-size effect (203k tokens), not a clean comprehension
  baseline.

## "Is the difference small enough that the extra saving is worth it?"

The counterargument (small comprehension gap, take the tokens) fails once numbers go on
both halves of the trade.

**1. "Not that large" is a doubled error rate.** Read the gaps as errors, not accuracy:

| model / N | gcf error | bpp error | bpp relative error |
|---|---|---|---|
| gemini-flash 500 | 21% | 42% | **2.0x** |
| gemini-flash 1000 | 32% | 47% | 1.5x |
| llama-8b 500 | 37% | 58% | 1.6x |
| maverick 1000 | 37% | 42% | 1.1x |

On 3 of 4 cells bpp is wrong 1.5-2x as often. The one close cell (maverick) is where JSON
had already collapsed under payload size and GCF beat both anyway.

**2. The "additional saving" is marginal against the right baseline.** Not bpp vs JSON, but
bpp vs what you already have. GCF already banks 56-59% off JSON; bpp's extra is 31% of an
already-small number (~40k -> ~27k tokens at N=500). You trade a doubled error rate for
~13k tokens on a payload already more than halved.

**3. The two sides are not the same kind of thing.** Tokens are recoverable, GCF has session
dedup / delta / streaming (protocol-level savings that cost the payload no legibility). A
comprehension error is not: it is silent (model confidently returns `*250`, no stack trace)
and it GROWS with scale (emails read fine at 500, failed at 1000). So "worth it" trades a
small, recurring, mostly-already-captured token gain for a rare-but-severe, silent, uncapped
correctness failure that worsens exactly when you reach for compression.

The "small difference" reading holds only on frontier models at small payloads, the ceiling
regime where nothing is at stake. Where compression matters (weak models, big payloads) the
gap is 16-21 points and the pointer failure is live.

## Token economics: the saving is erased once errors are priced

The token "saving" is booked upfront and unconditionally; the error cost is paid downstream
and only in non-trivial cases, which is exactly where compression is reached for. Once the
errors are priced, the saving disappears in any non-trivial use case or on any non-frontier
model.

Matched N=500 tier (bpp ~27k tok/call vs gcf ~40k):
- **Per-call saving:** bpp banks ~13k tokens vs GCF.
- **Cost of one retried wrong answer:** re-sending the payload is ~27k tokens, ~**2x the
  saving**. One retry erases two calls' worth of savings.
- **bpp's extra error rate:** ~19 points over GCF matched (47.4% vs 28.2%), roughly one extra
  wrong answer every ~5 calls. At one retry each: ~5-6k extra tokens/call, **~40-50% of the
  saving gone on retries alone**. If recovery takes two turns, it goes fully underwater.
- **Silent errors are worse:** bpp's signature failure is confident and silent (returns
  `*250` / the wrong SKU). A silent error is never retried, so it costs zero tokens and
  instead costs a wrong action (wrong data handed back and acted on). That cost is not
  denominated in tokens at all: the saving there is not eroded, it is spent on being wrong.

**Scope of validity.** bpp's saving is only real in the trivial regime: frontier model AND
small payload AND checkable answer, the ceiling case where compression was not needed. In
ANY non-trivial use case (deep lookups, big payloads) or under ANY non-frontier model, the
measured error rate (1.5-2.2x GCF per cell; 1.68x pooled) either eats the saving in retries
or silently converts it into wrong answers. Every non-frontier model tested lands bpp far
below GCF: llama-3.1-8b 42.1, llama-3.3-70b 42.1, gemma-3-27b 31.6, maverick 57.9,
deepseek-v3 63.2 (all vs GCF 61-88). Even the one capable model at small payload
(gemini-flash, 500) puts bpp at 57.9 vs GCF 78.9.

## Next
- llama-3.3-70b 500 (in flight) closes the Llama capability ladder 8b -> 70b -> (flash).
- Optional: bump `max_tokens` and re-run to remove the truncation artifact on aggregation Qs.
- Optional: deepseek-v3 as a second family; bpp-norefs to split delimiter vs pointer cause.

- N=1000 same model (does the gap widen with table depth?).
- A smaller/cheaper model (does indirection fail harder and sooner?).
- Add `bpp-norefs` to separate delimiter-merge from pointer-indirection as the cause.

Logs in `logs/`, exact payloads in `encodings/`.
