# Graph profile: symbol-position and edge-direction comprehension study

This study answered two design questions about the GCF **graph profile**, each run
staged (spec/prototype -> eval -> decision) so a design was measured before it was
implemented across the SDK fleet:

1. **Symbol positions.** How should a graph symbol carry its source position (file /
   line / column) so a model can navigate and edit? Inline on the node line, or in a
   separate id-keyed section?
2. **Edge direction.** Why do non-frontier models misread edge direction, and is it a
   *syntax* problem (the `@target<@source` arrow) or a *presentation* problem?

Results and conclusions are in [FINDINGS.md](./FINDINGS.md). The decision writeup
(what to build, what to shelve) lives in the integration workspace scope note
`gcf-graph-symbol-position-scope.md`.

**Layout note.** The Go test harnesses (`loc_comprehension_test.go`,
`edge_comprehension_test.go`) live in the **gcf-go** repo's `eval/` (they are Go package
tests; the core `gcf` repo has no Go), the same split the existing comprehension harnesses
already use. This study directory (design, findings, the Node quick probes, and copies of
every result log) lives here in **gcf/eval** as a self-contained record, matching
`generic-delta-comprehension/` and `SESSION-DEDUP-EVAL-DESIGN.md`. The harness writes its
canonical logs into `gcf-go/eval/results/comprehension/`; `results/` here holds a copy so
the study reads complete on its own.

All model calls used OpenRouter through the `openai` backend
(`OPENAI_BASE_URL=https://openrouter.ai/api/v1`), temperature 0.2, non-reasoning
instruct models, with one frontier CLI model (codex / gpt-5.5) as a ceiling anchor.
Scoring is bucketed (correct / wrong / none) with robust position/name extraction, so an
answer that echoes payload syntax still scores on content, and a reversed-direction
answer scores `wrong` rather than being hidden by a lenient match.

## Part 1: symbol positions

**Arms** (same 500-symbol / 200-edge fixture, `buildFixture`):
- `json-loc` — positions as natural JSON fields (baseline)
- `gcf-inline` — position appended to the symbol's own node line
- `gcf-loc` — an id-keyed `## loc` side section (the spec's original choice)

One symbol is deliberately omitted from every arm to test that the model declines
("unknown") instead of hallucinating a position.

**Harness:** `gcf-go/eval/loc_comprehension_test.go`
- `TestLocProbeArtifacts` — verifies arm construction with no LLM calls.
- `TestLocComprehension` — the scored run (gated by `EVAL_LOC`).

**Run:**
```
EVAL_LOC=1 EVAL_BACKEND=openai OPENAI_BASE_URL=https://openrouter.ai/api/v1 \
  OPENAI_API_KEY=... EVAL_MODEL=<id> EVAL_TEMPERATURE=0.2 \
  GOWORK=off go test -run TestLocComprehension -v -timeout 30m
```
Backend `codex` (default) uses the local codex CLI for the frontier ceiling run.

**Logs:** `results/loc-probe-*.log` (codex ceiling; llama-8b
hygiene-validation runs; the 5-model x 3-run sweep).

## Part 2: edge direction

**Arms** (same graph, five renderings of the edges):
- `A` — `@1<@0 calls` (current wire: target-first)
- `B` — `@0>@1 calls` (source-first arrow)
- `C` — `@0 calls @1` (natural SVO)
- `ADJ` — per-node adjacency: `@0 X: out=[calls Y, ...]; in=[...]`
- `JSON` — `{source, target, type}` objects (control)

**Queries** (deterministic ground truth from the edge set; `wrong` fires on the
opposite/reversed direction): `fwd_calls`, `bwd_callers` (reverse), `shared_out`,
`shared_in`. `shared_in` is **discounted** in the analysis: the phrasing "which symbols
point to X" was read as *outgoing* by the models even in the ADJ arm, so it measured
wording, not format (see FINDINGS).

**Fixtures:** three sizes, 20, 50, and 500 symbols (500 = flagship scale, matching the
comprehension eval). `EVAL_EDGE_FIXTURES=large` runs only the 500-symbol rung.

**Harness:** `gcf-go/eval/edge_comprehension_test.go`
- `TestEdgeProbeArtifacts` — verifies arm construction + probe selection, no LLM.
- `TestEdgeComprehension` — the scored run (gated by `EVAL_EDGE`).

**Run:**
```
EVAL_EDGE=1 EVAL_BACKEND=openai OPENAI_BASE_URL=https://openrouter.ai/api/v1 \
  OPENAI_API_KEY=... EVAL_MODEL=<id> EVAL_TEMPERATURE=0.2 \
  GOWORK=off go test -run TestEdgeComprehension -v -timeout 30m
```

**Logs:** `results/edge-probe-*.log` (4-model small pilot + 4-model
medium ladder, 12B-72B).

### Quick probes (`scripts/`, `results/`)

Three throwaway Node one-offs preceded the Go harness. They are kept because they are
part of the evidence chain, including a signal the full study later **refuted**:
- `scripts/inline_probe.mjs` -> `results/inline-cold-4models.log` — a hand-written
  payload read cold (no legend) across four models, confirming inline positions and edge
  directions are recoverable without a schema.
- `scripts/edge_probe.mjs` -> `results/edge-syntax-quick-n1.log` — n=1 A/B/C quick probe
  that made source-first (B) look best (63/81/63%).
- `scripts/edge_probe3.mjs` -> `results/edge-syntax-firmed-n3.log` — n=3 firming of the
  same (56/79/69%), still one fixture / one query shape. The full pilot (`ADJ`/`JSON`
  arms, two fixtures, four models) then showed B's lead did not replicate.

Run a quick probe with `OPENROUTER_API_KEY=... node scripts/<name>.mjs`.

## Artifact index

| Artifact | Location |
|---|---|
| Position harness | `gcf-go/eval/loc_comprehension_test.go` |
| Edge harness | `gcf-go/eval/edge_comprehension_test.go` |
| Position logs | `results/loc-probe-*.log` |
| Edge logs | `results/edge-probe-*.log` |
| Quick-probe scripts | `scripts/*.mjs` |
| Quick-probe logs | `results/*.log` |
| Findings + conclusions | `FINDINGS.md` |
| Decision writeup | `gcf-integration-work/gcf-graph-symbol-position-scope.md` |
| Drafted spec (side-section; to revise to inline) | `gcf` branch `feat/graph-loc-section`, SPEC.md §6b |
