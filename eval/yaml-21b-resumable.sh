#!/usr/bin/env bash
#
# Resumable driver to extend YAML round-trip coverage by 10B (seed band 11B-21B),
# bringing the cumulative YAML total to ~21B (and the multi-format grand total to
# ~43.27B). See docs/guide/lossless-verification.md.
#
# The 10B is split into fixed-size chunks. Each chunk:
#   - runs gcf-rust's yaml_10b_2 test over one seed slice (FUZZ_SEED_OFFSET),
#   - streams its progress to a per-chunk log AS IT RUNS (tee),
#   - and, only after it confirms "0 failed", records a checkpoint.
# Re-running the script reads the checkpoint and skips completed chunks, so an
# interruption loses at most the in-flight chunk (~one CHUNK worth of work).
#
# Env overrides (defaults target the real 10B run):
#   RUST_DIR   path to gcf-rust                (default ../gcf-rust from this repo)
#   OUT_DIR    where logs + checkpoint live
#   BASE_OFFSET first seed of the band         (default 11000000000)
#   TOTAL      total iterations to add         (default 10000000000)
#   CHUNK      iterations per chunk            (default 500000000  -> 20 chunks, ~32 min each)
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUST_DIR="${RUST_DIR:-$(cd "$REPO_ROOT/../gcf-rust" && pwd)}"
BASE_OFFSET="${BASE_OFFSET:-11000000000}"
TOTAL="${TOTAL:-10000000000}"
CHUNK="${CHUNK:-500000000}"
OUT_DIR="${OUT_DIR:-$REPO_ROOT/eval/results/multiformat/yaml-21b-run}"

NUM_CHUNKS=$(( (TOTAL + CHUNK - 1) / CHUNK ))
CKPT="$OUT_DIR/checkpoint"        # index of the last fully-completed chunk
MASTER="$OUT_DIR/master.log"      # running summary across chunks
mkdir -p "$OUT_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$MASTER"; }

last_done=-1
[ -f "$CKPT" ] && last_done="$(cat "$CKPT")"

log "start/resume: RUST_DIR=$RUST_DIR band=${BASE_OFFSET}..$((BASE_OFFSET+TOTAL)) chunk=$CHUNK chunks=$NUM_CHUNKS last_done=$last_done"

for (( i=0; i<NUM_CHUNKS; i++ )); do
  if [ "$i" -le "$last_done" ]; then
    log "chunk $i: already complete, skipping"
    continue
  fi
  offset=$(( BASE_OFFSET + i * CHUNK ))
  # last chunk may be short if TOTAL is not a multiple of CHUNK
  iters=$CHUNK
  if [ $(( (i+1) * CHUNK )) -gt "$TOTAL" ]; then
    iters=$(( TOTAL - i * CHUNK ))
  fi
  chunklog="$OUT_DIR/chunk-$(printf '%02d' "$i")-seed${offset}-n${iters}.log"
  log "chunk $i: seeds ${offset}..$((offset+iters)) (${iters} iters) -> $(basename "$chunklog")"

  if ( cd "$RUST_DIR" && FUZZ_ITERATIONS="$iters" FUZZ_SEED_OFFSET="$offset" \
        cargo test --release --test fuzz_parallel yaml_10b_2 -- --nocapture --exact ) 2>&1 | tee "$chunklog"; then
    if grep -q "test result: ok" "$chunklog" && grep -Eq "[0-9]+ passed, 0 failed" "$chunklog"; then
      echo "$i" > "$CKPT"
      log "chunk $i OK: $(grep -E "passed, 0 failed" "$chunklog" | tail -1 | sed 's/^ *//')"
    else
      log "chunk $i FAILED to confirm pass (no clean summary); stopping for inspection"
      exit 1
    fi
  else
    log "chunk $i cargo exited non-zero; stopping (re-run this script to resume from here)"
    exit 1
  fi
done

# Assemble the canonical single-file log the docs reference.
STAMP="${LOG_STAMP:-$(date '+%Y-%m-%d')}"
CANON="$OUT_DIR/rust-yaml10B-parallel-${STAMP}.log"
{
  echo "YAML 10B (seeds ${BASE_OFFSET}..$((BASE_OFFSET+TOTAL))), $NUM_CHUNKS chunks of $CHUNK, resumable driver."
  echo "Per-chunk summaries:"
  grep -hE "passed, 0 failed" "$OUT_DIR"/chunk-*.log | sed 's/^ *//'
} > "$CANON"
log "ALL $NUM_CHUNKS chunks complete. Cumulative added: $TOTAL YAML round-trips. Canonical log: $(basename "$CANON")"
