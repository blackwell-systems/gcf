#!/usr/bin/env python3
"""
Cross-tokenizer delta savings.

The DELTA ENCODING SAVINGS: TOPOLOGY CHANGES table in
docs/guide/delta.md was measured on a single tokenizer (GPT-4o o200k).
This harness runs the *identical* graph-profile delta scenario across the
full 43-tokenizer suite (TOKENIZER_SPECS from hf-tokenizer-analysis.py), so
the published savings figures are validated on every tokenizer, not just one.

It reuses the canonical payload/delta logic from session-savings-benchmark.py
(build_payload, compute_delta, load_tokenizer, token_count) so the numbers
match the main harness exactly; the only thing added here is the loop over
tokenizers and the min/mean/max aggregation.

Run (from eval/, in a venv with tiktoken, tokenizers, huggingface_hub, gcf):
    python delta-cross-tokenizer.py
"""

import importlib.util
import json
import statistics
from pathlib import Path

HERE = Path(__file__).parent


def _load(filename: str, mod_name: str):
    """Import a hyphenated sibling script as a module."""
    spec = importlib.util.spec_from_file_location(mod_name, HERE / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


sb = _load("session-savings-benchmark.py", "session_bench")
hf = _load("hf-tokenizer-analysis.py", "hf_analysis")

from gcf import Session, encode, encode_delta, encode_with_session

# Same topology changes as the single-tokenizer table in delta.md.
CHANGES = [
    ("1 device", 1, 1),
    ("2 devices", 2, 2),
    ("5 devices", 5, 5),
    ("10 devices", 10, 10),
    ("20 devices", 20, 20),
]


def delta_table_for(tok) -> list[dict]:
    """Full / session / delta token counts for each change size, one tokenizer."""
    base_indices = list(range(100))
    base_payload = sb.build_payload(base_indices, 50)

    rows = []
    for change_name, added, removed in CHANGES:
        keep = base_indices[: 100 - removed]
        new = list(range(1000, 1000 + added))
        modified = sb.build_payload(keep + new, (len(keep) + added) // 2)

        full_tokens = sb.token_count(tok, encode(modified))

        sess = Session()
        encode_with_session(base_payload, sess)
        session_tokens = sb.token_count(tok, encode_with_session(modified, sess))

        delta_payload = sb.compute_delta(base_payload, modified)
        if delta_payload is not None:
            delta_tokens = sb.token_count(tok, encode_delta(delta_payload))
        else:
            delta_tokens = full_tokens

        savings = (1.0 - delta_tokens / full_tokens) * 100 if full_tokens else 0.0
        rows.append(
            {
                "change": change_name,
                "full": full_tokens,
                "session": session_tokens,
                "delta": delta_tokens,
                "savings": savings,
            }
        )
    return rows


def main() -> None:
    specs = hf.TOKENIZER_SPECS
    print(f"Loading {len(specs)} tokenizers (all cached)...")

    loaded = []
    for name, repo, *_ in specs:
        tok = sb.load_tokenizer(name, repo)
        if tok is None:
            print(f"  SKIP  {name}")
            continue
        loaded.append((name, tok))
    print(f"{len(loaded)} tokenizers loaded\n")

    # ------------------------------------------------------------------
    # Table 1: delta topology-change savings (100-symbol base)
    # ------------------------------------------------------------------
    per_change: dict[str, list[float]] = {c[0]: [] for c in CHANGES}
    per_tokenizer: dict[str, list[dict]] = {}
    for name, tok in loaded:
        rows = delta_table_for(tok)
        per_tokenizer[name] = rows
        for r in rows:
            per_change[r["change"]].append(r["savings"])

    print("DELTA TOPOLOGY-CHANGE SAVINGS (100-symbol base)")
    print(f"{'Change':<12} {'min%':>7} {'mean%':>7} {'max%':>7} {'stdev':>7} {'n':>4}")
    print("-" * 52)
    summary = []
    for change_name, _, _ in CHANGES:
        vals = per_change[change_name]
        row = {
            "change": change_name,
            "min": min(vals),
            "mean": statistics.mean(vals),
            "max": max(vals),
            "stdev": statistics.pstdev(vals),
            "n": len(vals),
        }
        summary.append(row)
        print(
            f"{change_name:<12} {row['min']:>6.1f}% {row['mean']:>6.1f}% "
            f"{row['max']:>6.1f}% {row['stdev']:>6.2f} {row['n']:>4}"
        )

    # ------------------------------------------------------------------
    # Table 2: stacked session savings, 500 symbols x 10 calls (large_10call)
    # This is the "Combined savings" table in delta.md, also GPT-4o-only.
    # ------------------------------------------------------------------
    scenario = next(s for s in sb.SCENARIOS if s["name"] == "large_10call")
    layers = {"gcf": [], "session": [], "stacked": []}
    for name, tok in loaded:
        r = sb.run_scenario(scenario, tok, name)
        j = r["total_json"]
        layers["gcf"].append((1.0 - r["total_gcf"] / j) * 100)
        layers["session"].append((1.0 - r["total_session"] / j) * 100)
        layers["stacked"].append((1.0 - r["total_stacked"] / j) * 100)

    print()
    print("STACKED SESSION SAVINGS vs JSON (500 symbols, 10 calls)")
    print(f"{'Layer':<22} {'min%':>7} {'mean%':>7} {'max%':>7} {'n':>4}")
    print("-" * 50)
    combined = []
    for key, label in [
        ("gcf", "GCF format alone"),
        ("session", "+ session dedup"),
        ("stacked", "+ delta (stacked)"),
    ]:
        vals = layers[key]
        row = {"layer": label, "min": min(vals), "mean": statistics.mean(vals),
               "max": max(vals), "n": len(vals)}
        combined.append(row)
        print(f"{label:<22} {row['min']:>6.1f}% {row['mean']:>6.1f}% {row['max']:>6.1f}% {row['n']:>4}")

    out = {
        "scenario": "graph delta topology change, 100-symbol base",
        "tokenizer_count": len(loaded),
        "tokenizers": [n for n, _ in loaded],
        "per_change_summary": summary,
        "per_tokenizer": per_tokenizer,
        "stacked_10call_summary": combined,
    }
    outdir = HERE / "results" / "session-savings"
    outdir.mkdir(parents=True, exist_ok=True)
    outfile = outdir / "delta-cross-tokenizer.json"
    outfile.write_text(json.dumps(out, indent=2))
    print(f"\nSaved -> {outfile}")


if __name__ == "__main__":
    main()
