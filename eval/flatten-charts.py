#!/usr/bin/env python3
"""Generate charts for the GCF flatten experiment results."""

import matplotlib.pyplot as plt
import matplotlib
import numpy as np
import os

matplotlib.use("Agg")

# Style constants
BG_COLOR = "#0a0a14"
TEXT_COLOR = "#f8fafc"
DIM_TEXT = "#64748b"
GCF_BLUE = "#18befc"
RED = "#ef4444"
GREEN = "#22c55e"
PURPLE = "#a78bfa"

OUTPUT_DIR = "/Users/dayna.blackwell/code/gcf/eval/flatten-experiment-charts"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def style_ax(ax, fig):
    """Apply dark theme styling to axes."""
    fig.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(DIM_TEXT)
    ax.spines["bottom"].set_color(DIM_TEXT)
    ax.tick_params(colors=DIM_TEXT, which="both")
    ax.xaxis.label.set_color(DIM_TEXT)
    ax.yaxis.label.set_color(DIM_TEXT)
    ax.grid(True, axis="y", alpha=0.1, color=TEXT_COLOR)


# ===========================================================================
# Chart 1: Comprehension by Model
# ===========================================================================

models_comp = [
    "Haiku\n(500)",
    "Sonnet\n(100)",
    "GPT-5.5",
    "Gemini\n2.5 Flash",
    "Gemini\n2.5 Pro",
    "Gemini\n3.5 Flash",
    "Grok\nBuild 0.1",
    "Kimi\nK2.7",
    "DeepSeek\nV3",
    "LLaMA 4\nMaverick",
    "LLaMA\n3.3 70B",
    "Mistral\nSmall",
    "Mistral\nMedium",
    "Mistral\nLarge",
    "Nova\nMicro",
    "LLaMA\n3.1 8B",
    "Qwen\n3.6 35B",
    "Granite\n4.0 Micro",
]

# Aggregated across all runs per model
#                    Haiku  Sonnet GPT5.5 G2.5F  G2.5P  G3.5F  Grok   Kimi   DS     Mav    LL70   MistS  MistM  MistL  Nova   LL8    Qwen   Gran
gcf_comp =          [100,   np.nan,100,   100,   100,   100,   100,   63.5,  72.4,  76.9,  84.6,  64.1,  80.8,  69.2,  53.8,  65.4,  25.0,  30.8]
flat_gt_comp =      [100,   100,   100,   100,   100,   100,   100,   63.5,  74.4,  65.4,  69.2,  54.5,  70.5,  61.5,  46.2,  46.2,  30.8,  23.1]
flat_sc_comp =      [100,   100,   100,   92.3,  100,   100,   100,   75.0,  72.4,  69.2,  76.9,  63.6,  70.5,  61.5,  53.8,  42.4,  0.0,   23.1]
json_comp =         [np.nan,np.nan,np.nan,np.nan,np.nan,np.nan,100,   63.5,  np.nan,61.5,  61.5,  63.6,  80.8,  np.nan,41.7,  58.3,  np.nan,np.nan]
toon_comp =         [np.nan,np.nan,np.nan,np.nan,np.nan,np.nan,100,   np.nan,np.nan,np.nan,np.nan,np.nan,np.nan,np.nan,np.nan,53.8,  np.nan,np.nan]

ORANGE = "#f59e0b"
TOON_RED = "#fb7185"

fig, ax = plt.subplots(figsize=(16, 7), dpi=200)
style_ax(ax, fig)

x = np.arange(len(models_comp))
width = 0.14

# Alternating background bands for visual grouping
for i in range(len(models_comp)):
    if i % 2 == 0:
        ax.axvspan(i - 0.45, i + 0.45, color=TEXT_COLOR, alpha=0.05, zorder=0)

# Vertical separators between model groups
for sep in [6.5, 8.5]:  # after Grok (frontier), after DeepSeek (mid-tier)
    ax.axvline(x=sep, color=DIM_TEXT, linestyle=":", alpha=0.3, linewidth=0.8, zorder=1)

bars1 = ax.bar(x - 2*width, json_comp, width, label="JSON", color=ORANGE, zorder=3)
bars2 = ax.bar(x - width, toon_comp, width, label="TOON", color=TOON_RED, zorder=3)
bars3 = ax.bar(x, gcf_comp, width, label="gcf (current)", color=DIM_TEXT, zorder=3)
bars4 = ax.bar(x + width, flat_gt_comp, width, label="flat(>)", color=GCF_BLUE, zorder=3)
bars5 = ax.bar(x + 2*width, flat_sc_comp, width, label="flat(;)", color=PURPLE, zorder=3)

ax.axhline(y=100, color=TEXT_COLOR, linestyle="--", alpha=0.3, linewidth=0.8)

# Group labels
ax.text(3, 108, "Proprietary Frontier", ha="center", fontsize=8, color=GREEN, fontstyle="italic")
ax.text(7.5, 108, "Mid", ha="center", fontsize=8, color=DIM_TEXT, fontstyle="italic")
ax.text(13, 108, "Open-Weight / Small", ha="center", fontsize=8, color=RED, fontstyle="italic")

ax.set_xlabel("")
ax.set_ylabel("Accuracy %", fontsize=11)
ax.set_xticks(x)
ax.set_xticklabels(models_comp, fontsize=7, ha="center")
ax.set_ylim(0, 110)
ax.set_yticks([0, 20, 40, 60, 80, 100])

ax.set_title(
    "Comprehension: All Formats Compared",
    color=TEXT_COLOR,
    fontsize=14,
    fontweight="bold",
    pad=20,
)
ax.text(
    0.5,
    1.02,
    "13 questions, 500 orders (100 where noted). JSON/TOON shown where tested.",
    transform=ax.transAxes,
    ha="center",
    fontsize=10,
    color=DIM_TEXT,
)

legend = ax.legend(loc="upper right", framealpha=0.3, edgecolor=DIM_TEXT)
legend.get_frame().set_facecolor(BG_COLOR)
for text in legend.get_texts():
    text.set_color(TEXT_COLOR)

plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "flatten-comprehension-by-model.png"), facecolor=BG_COLOR)
plt.close()
print("Saved: flatten-comprehension-by-model.png")


# ===========================================================================
# Chart 2: Generation Validity
# ===========================================================================

models_gen = [
    "Haiku",
    "Opus",
    "Gemini\n2.5 Flash",
    "Gemini\n3.5 Flash",
    "Mistral Small\n(3 runs)",
    "Mistral Medium\n(5 runs)",
]

gcf_gen = [np.nan, 100, 40, np.nan, 0, 0]
flat_gt_gen = [100, 100, 100, 100, 53, 96]
flat_sc_gen = [80, 100, 40, 100, 60, 100]

fig, ax = plt.subplots(figsize=(12, 7), dpi=200)
style_ax(ax, fig)

x = np.arange(len(models_gen))
width = 0.25

bars1 = ax.bar(x - width, gcf_gen, width, label="gcf (current)", color=DIM_TEXT, zorder=3)
bars2 = ax.bar(x, flat_gt_gen, width, label="flat(>)", color=GCF_BLUE, zorder=3)
bars3 = ax.bar(x + width, flat_sc_gen, width, label="flat(;)", color=PURPLE, zorder=3)

ax.axhline(y=100, color=TEXT_COLOR, linestyle="--", alpha=0.3, linewidth=0.8)

ax.set_xlabel("")
ax.set_ylabel("Validity %", fontsize=11)
ax.set_xticks(x)
ax.set_xticklabels(models_gen, fontsize=10, ha="center")
ax.set_ylim(0, 110)
ax.set_yticks([0, 20, 40, 60, 80, 100])

ax.set_title(
    "Generation: Flat GCF vs Current GCF",
    color=TEXT_COLOR,
    fontsize=14,
    fontweight="bold",
    pad=20,
)
ax.text(
    0.5,
    1.02,
    "5 sizes (3-50 orders), with primer, validity %",
    transform=ax.transAxes,
    ha="center",
    fontsize=10,
    color=DIM_TEXT,
)

legend = ax.legend(loc="upper right", framealpha=0.3, edgecolor=DIM_TEXT)
legend.get_frame().set_facecolor(BG_COLOR)
for text in legend.get_texts():
    text.set_color(TEXT_COLOR)

plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "flatten-generation-by-model.png"), facecolor=BG_COLOR)
plt.close()
print("Saved: flatten-generation-by-model.png")


# ===========================================================================
# Chart 3: Token Savings (horizontal bar)
# ===========================================================================

apis = [
    "Jira issues",
    "Stripe charges",
    "Kubernetes pods",
    "Elasticsearch",
    "AWS EC2",
    "Datadog monitors",
    "GitHub PRs",
    "Salesforce opps",
    "Shopify orders",
    "Twilio messages",
]

toon_vs_json = [13.4, 17.1, 13.8, 17.1, 12.8, 17.3, 12.1, 15.3, 18.8, 10.6]
current_vs_json = [13.8, 3.1, 1.6, 7.0, -6.5, -4.9, -4.1, -11.5, -34.3, -16.0]
flat_vs_json = [-41.7, -37.1, -35.7, -34.1, -36.7, -30.3, -23.6, -29.5, -41.3, -22.4]

# Sort by flat GCF savings (most negative first = best savings)
sort_idx = np.argsort(flat_vs_json)
apis_sorted = [apis[i] for i in sort_idx]
toon_sorted = [toon_vs_json[i] for i in sort_idx]
current_sorted = [current_vs_json[i] for i in sort_idx]
flat_sorted = [flat_vs_json[i] for i in sort_idx]

fig, ax = plt.subplots(figsize=(12, 8), dpi=200)
style_ax(ax, fig)

y = np.arange(len(apis_sorted))
height = 0.25

bars1 = ax.barh(y + height, toon_sorted, height, label="TOON", color=RED, zorder=3)
bars2 = ax.barh(y, current_sorted, height, label="Current GCF", color=DIM_TEXT, zorder=3)
bars3 = ax.barh(y - height, flat_sorted, height, label="Flat GCF", color=GCF_BLUE, zorder=3)

# Zero line
ax.axvline(x=0, color=TEXT_COLOR, linewidth=0.8, alpha=0.4)

ax.set_xlabel("% vs JSON (negative = fewer tokens)", fontsize=11, color=DIM_TEXT)
ax.set_ylabel("")
ax.set_yticks(y)
ax.set_yticklabels(apis_sorted, fontsize=10, color=TEXT_COLOR)
ax.grid(True, axis="x", alpha=0.1, color=TEXT_COLOR)
ax.grid(False, axis="y")

ax.set_title(
    "Token Savings: Flat GCF vs Current GCF vs TOON",
    color=TEXT_COLOR,
    fontsize=14,
    fontweight="bold",
    pad=20,
)
ax.text(
    0.5,
    1.02,
    "10 real-world API shapes, 50 items each, vs JSON baseline",
    transform=ax.transAxes,
    ha="center",
    fontsize=10,
    color=DIM_TEXT,
)

legend = ax.legend(loc="lower right", framealpha=0.3, edgecolor=DIM_TEXT)
legend.get_frame().set_facecolor(BG_COLOR)
for text in legend.get_texts():
    text.set_color(TEXT_COLOR)

plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "flatten-token-savings.png"), facecolor=BG_COLOR)
plt.close()
print("Saved: flatten-token-savings.png")

print(f"\nAll charts saved to: {OUTPUT_DIR}")
