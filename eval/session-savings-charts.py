#!/usr/bin/env python3
"""Generate session savings benchmark charts for GCF documentation.

Usage:
    python session-savings-charts.py             # dark theme (default)
    python session-savings-charts.py --light     # light theme
    python session-savings-charts.py --both      # generate both variants
"""

import argparse
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Style constants
BG = '#0a0a0a'
TEXT = '#ffffff'
GRID = '#333333'
LEGEND_BG = '#1a1a1a'
CYAN = '#18befc'
GREEN = '#00ff88'
GRAY = '#888888'
DPI = 150
FIGSIZE = (10, 6)
LIGHT = False

OUT = '/Users/dayna.blackwell/code/gcf/docs/public/charts'


def set_theme(light=False):
    global BG, TEXT, GRID, LEGEND_BG, LIGHT
    LIGHT = light
    if light:
        BG, TEXT, GRID, LEGEND_BG = 'white', '#1a1a1a', '#cccccc', '#f0f0f0'
        plt.style.use('default')
    else:
        BG, TEXT, GRID, LEGEND_BG = '#0a0a0a', '#ffffff', '#333333', '#1a1a1a'
        plt.style.use('dark_background')


def suffix():
    return '-light' if LIGHT else ''


def style_ax(ax, title):
    ax.set_facecolor(BG)
    ax.figure.set_facecolor(BG)
    ax.set_title(title, color=TEXT, fontsize=14, fontweight='bold', pad=12)
    ax.tick_params(colors=TEXT, labelsize=10)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_color(GRID)
    ax.spines['left'].set_color(GRID)
    ax.grid(axis='y', color=GRID, linewidth=0.5, alpha=0.5 if not LIGHT else 0.7)
    ax.xaxis.label.set_color(TEXT)
    ax.yaxis.label.set_color(TEXT)


def chart1():
    calls = list(range(1, 11))
    json_t  = [34854, 32862, 31666, 30870, 30474, 30070, 29672, 29473, 29272, 29072]
    sess_t  = [11154, 5257, 4380, 4240, 4170, 4100, 4030, 3995, 3960, 3925]
    stack_t = [11154, 2636, 1587, 610, 305, 306, 268, 173, 169, 171]

    fig, ax = plt.subplots(figsize=FIGSIZE)
    style_ax(ax, 'Cumulative Token Cost Per Call')

    ax.plot(calls, [t / 1000 for t in json_t],  color=GRAY,  linewidth=2.5, marker='o', markersize=5, label='JSON')
    ax.plot(calls, [t / 1000 for t in sess_t],  color=CYAN,  linewidth=2.5, marker='s', markersize=5, label='GCF Session')
    ax.plot(calls, [t / 1000 for t in stack_t], color=GREEN, linewidth=2.5, marker='^', markersize=5, label='GCF Stacked (delta+session)')

    ax.set_xlabel('Call Number', fontsize=11)
    ax.set_ylabel('Tokens (thousands)', fontsize=11)
    ax.set_xticks(calls)
    ax.legend(facecolor=LEGEND_BG, edgecolor=GRID, labelcolor=TEXT, fontsize=10)
    ax.set_ylim(bottom=0)

    fig.tight_layout()
    name = f'session-savings-curve{suffix()}.png'
    fig.savefig(f'{OUT}/{name}', dpi=DPI, facecolor=BG)
    plt.close(fig)
    print(f'Saved {name}')


def chart2():
    tokenizers = ['Phi-4', 'DeepSeek V3', 'Qwen 2.5', 'Mistral 7B',
                  'Gemma 2', 'Claude', 'LLaMA 3.1', 'GPT-4o']
    savings =    [89.5, 88.3, 88.1, 87.2, 87.3, 87.3, 89.5, 89.4]

    fig, ax = plt.subplots(figsize=FIGSIZE)
    style_ax(ax, 'Session Savings Across Tokenizers (5-call, 500 symbols)')

    y_pos = np.arange(len(tokenizers))
    bars = ax.barh(y_pos, savings, color=CYAN, height=0.6, edgecolor='none')
    ax.set_yticks(y_pos)
    ax.set_yticklabels(tokenizers)
    ax.set_xlabel('Savings vs JSON (%)', fontsize=11)
    ax.set_xlim(80, 92)
    ax.grid(axis='x', color=GRID, linewidth=0.5, alpha=0.5)
    ax.grid(axis='y', visible=False)

    for bar, val in zip(bars, savings):
        ax.text(bar.get_width() + 0.2, bar.get_y() + bar.get_height() / 2,
                f'{val}%', va='center', color=TEXT, fontsize=10, fontweight='bold')

    fig.tight_layout()
    name = f'session-savings-cross-tokenizer{suffix()}.png'
    fig.savefig(f'{OUT}/{name}', dpi=DPI, facecolor=BG)
    plt.close(fig)
    print(f'Saved {name}')


def chart3():
    changes = ['1', '2', '5', '10', '20']
    full  = [2327, 2326, 2325, 2327, 2329]
    sess  = [1100, 1112, 1148, 1213, 1340]
    delta = [110, 139, 267, 501, 920]

    x = np.arange(len(changes))
    width = 0.25

    fig, ax = plt.subplots(figsize=FIGSIZE)
    style_ax(ax, 'Delta Encoding: Topology Change Savings')

    ax.bar(x - width, full,  width, color=GRAY,  label='Full', edgecolor='none')
    ax.bar(x,         sess,  width, color=CYAN,  label='Session', edgecolor='none')
    ax.bar(x + width, delta, width, color=GREEN, label='Delta', edgecolor='none')

    ax.set_xlabel('Devices Changed', fontsize=11)
    ax.set_ylabel('Tokens', fontsize=11)
    ax.set_xticks(x)
    ax.set_xticklabels(changes)
    ax.legend(facecolor=LEGEND_BG, edgecolor=GRID, labelcolor=TEXT, fontsize=10)
    ax.set_ylim(bottom=0)

    fig.tight_layout()
    name = f'delta-topology-savings{suffix()}.png'
    fig.savefig(f'{OUT}/{name}', dpi=DPI, facecolor=BG)
    plt.close(fig)
    print(f'Saved {name}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate session savings charts')
    parser.add_argument('--light', action='store_true')
    parser.add_argument('--both', action='store_true')
    args = parser.parse_args()

    themes = [False, True] if args.both else [args.light]
    for light in themes:
        set_theme(light)
        chart1()
        chart2()
        chart3()
    print('All charts generated.')
