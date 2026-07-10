#!/usr/bin/env python3
"""Render the S-TOON structural-injection study as a single heatmap.

Reads results/stoon-taxonomy-v2.json (the raw study output) and draws every one
of the 120 cells: 5 models (rows) x 4 formats x 6 vectors (columns), colored by
leak Attack Success Rate. Safe cells stay dark; leaks light up. Nothing is
averaged away, so the model-dependence and vector-concentration are visible.

Usage: python3 stoon_heatmap.py   (run from eval/)
Output: results/stoon-injection-heatmap.png
"""
import json
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

BG = "#0a0a0a"
CYAN = "#18befc"
FG = "#c9d1d9"

DATA = Path("results/stoon-taxonomy-v2.json")

MODELS = [  # (slug, display, tier)
    ("qwen/qwen-2.5-7b-instruct", "Qwen-2.5-7B", "small"),
    ("meta-llama/llama-3.1-8b-instruct", "Llama-3.1-8B", "small"),
    ("anthropic/claude-opus-4.8", "Claude-opus-4.8", "frontier"),
    ("openai/gpt-5.6-terra-pro", "GPT-5.6", "frontier"),
    ("google/gemini-2.5-pro", "Gemini-2.5-pro", "frontier"),
]
FORMATS = [("json", "JSON"), ("toon", "TOON"), ("stoon", "S-TOON"), ("gcf", "GCF")]
VECTORS = [  # (class, short)
    ("delimiter_dissolution", "DD"),
    ("type_smuggling", "TS"),
    ("invisible_indentation", "II"),
    ("comment_masquerading", "CM"),
    ("schema_hallucination", "SH"),
    ("tokenization_drift", "TD"),
]


def main():
    d = json.load(open(DATA))
    cell = {(c["model"], c["format"], c["class"]): c for c in d["leak"]}

    nrows, ncols = len(MODELS), len(FORMATS) * len(VECTORS)
    M = np.full((nrows, ncols), np.nan)
    for r, (slug, _, _) in enumerate(MODELS):
        for fi, (fmt, _) in enumerate(FORMATS):
            for vi, (cls, _) in enumerate(VECTORS):
                c = cell.get((slug, fmt, cls))
                if c is not None:
                    M[r, fi * len(VECTORS) + vi] = c["asr_pct"]

    fig, ax = plt.subplots(figsize=(13.5, 4.9))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    im = ax.imshow(M, cmap="inferno", vmin=0, vmax=100, aspect="auto")

    # annotate nonzero cells; leaves safe (0%) cells dark and unlabeled
    for r in range(nrows):
        for cidx in range(ncols):
            v = M[r, cidx]
            if not np.isnan(v) and v > 0:
                ax.text(cidx, r, "%.0f" % v, ha="center", va="center",
                        fontsize=7.5, color=("black" if v >= 50 else "white"),
                        fontweight="bold")

    # column ticks: vector short codes
    ax.set_xticks(range(ncols))
    ax.set_xticklabels([v[1] for _ in FORMATS for v in VECTORS],
                       fontsize=7.5, color=FG)
    ax.set_yticks(range(nrows))
    ax.set_yticklabels([m[1] for m in MODELS], fontsize=9, color=FG)
    ax.tick_params(colors=FG, length=0)

    # format group labels + separators
    for fi, (_, fname) in enumerate(FORMATS):
        center = fi * len(VECTORS) + (len(VECTORS) - 1) / 2
        ax.text(center, -0.85, fname, ha="center", va="bottom",
                fontsize=10, color=CYAN, fontweight="bold")
        if fi > 0:
            ax.axvline(fi * len(VECTORS) - 0.5, color=BG, lw=3)
            ax.axvline(fi * len(VECTORS) - 0.5, color=FG, lw=0.6, alpha=0.4)

    # tier separator (small vs frontier) after Llama (row index 1)
    ax.axhline(1.5, color=CYAN, lw=1.2, alpha=0.7)
    ax.text(ncols - 0.3, 0.5, "small", rotation=90, va="center", ha="left",
            fontsize=7.5, color=FG, alpha=0.6)
    ax.text(ncols - 0.3, 3, "frontier", rotation=90, va="center", ha="left",
            fontsize=7.5, color=FG, alpha=0.6)

    ax.set_xlim(-0.5, ncols - 0.5)
    ax.set_ylim(nrows - 0.5, -0.5)
    for s in ax.spines.values():
        s.set_visible(False)

    cbar = fig.colorbar(im, ax=ax, fraction=0.025, pad=0.06)
    cbar.set_label("Leak rate (ASR%)", color=FG, fontsize=9)
    cbar.ax.yaxis.set_tick_params(color=FG, labelcolor=FG, labelsize=8)
    cbar.outline.set_edgecolor(FG)

    fig.suptitle("Structural-injection leak rate: 5 models x 4 formats x 6 vectors",
                 color=CYAN, fontsize=12.5, fontweight="bold", y=0.98)
    fig.text(0.5, 0.055,
             "DD delimiter_dissolution    TS type_smuggling    II invisible_indentation    "
             "CM comment_masquerading    SH schema_hallucination    TD tokenization_drift",
             ha="center", fontsize=7, color=FG, alpha=0.75)
    fig.text(0.5, 0.017,
             "30 trials/cell @ temp 0.7. Dark = safe (0%). GCF never exceeds JSON; "
             "S-TOON (Alshaer's fix) lights up; frontier resists every format.",
             ha="center", fontsize=8, color=FG, alpha=0.85)

    fig.tight_layout(rect=[0, 0.09, 1, 0.93])
    out = Path("results/stoon-injection-heatmap.png")
    fig.savefig(out, dpi=200, facecolor=BG, bbox_inches="tight")
    print("wrote %s" % out)


if __name__ == "__main__":
    main()
