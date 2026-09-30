#!/usr/bin/env python3
"""Charts for the bpp adversarial comprehension study. Reads ../results.csv, emits
dark+light PNGs into ../charts/. Run: python3 charts.py"""
import csv, os, collections, statistics
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.dirname(HERE)
CSV=os.path.join(ROOT,"results.csv"); OUT=os.path.join(ROOT,"charts")
os.makedirs(OUT,exist_ok=True)
C={'gcf':'#22A06B','json':'#8B93A7','bpp':'#E5484D'}   # green good / gray / red bad
FMTS=['gcf','json','bpp']; LBL={'gcf':'GCF','json':'JSON','bpp':'bpp'}

# --- load + collapse runs per (model,N,format) ---
cell=collections.defaultdict(lambda:{'P':0,'F':0})
for r in csv.DictReader(open(CSV)):
    if r['graded'] and int(r['graded'])>0:
        cell[(r['model'],int(r['n_orders']),r['format'])]['P']+=int(r['pass'])
        cell[(r['model'],int(r['n_orders']),r['format'])]['F']+=int(r['fail'])
def err(m,n,f):
    d=cell.get((m,n,f)); 
    return (100*d['F']/(d['P']+d['F'])) if d and (d['P']+d['F']) else None
cells=sorted({(m,n) for (m,n,f) in cell}, key=lambda x:(x[1],x[0]))
mean_cell={f:statistics.mean([err(m,n,f) for (m,n) in cells if err(m,n,f) is not None]) for f in FMTS}

TOK={500:{'json':101482,'gcf':44770,'bpp':30704},1000:{'json':203389,'gcf':89928,'bpp':61812}}

def theme(dark):
    if dark:
        return dict(bg='#0d1117',fg='#e6edf3',grid='#30363d',sub='#8b949e')
    return dict(bg='#ffffff',fg='#1f2328',grid='#d0d7de',sub='#57606a')

def style(ax,t):
    ax.set_facecolor(t['bg']); ax.figure.set_facecolor(t['bg'])
    for s in ax.spines.values(): s.set_color(t['grid'])
    ax.tick_params(colors=t['fg']); ax.yaxis.label.set_color(t['fg']); ax.xaxis.label.set_color(t['fg'])
    ax.title.set_color(t['fg']); ax.grid(axis='y',color=t['grid'],alpha=.5,lw=.7)

def save(fig,name,t):
    fig.savefig(os.path.join(OUT,name),dpi=150,bbox_inches='tight',facecolor=t['bg']); plt.close(fig)

def chart_aggregate(dark):
    t=theme(dark); fig,ax=plt.subplots(figsize=(6,4.2))
    vals=[mean_cell[f] for f in FMTS]
    bars=ax.bar([LBL[f] for f in FMTS],vals,color=[C[f] for f in FMTS],width=.6)
    for b,v in zip(bars,vals): ax.text(b.get_x()+b.get_width()/2,v+1,f"{v:.0f}%",ha='center',color=t['fg'],fontweight='bold')
    ax.set_ylabel("Mean comprehension error rate (%)"); ax.set_ylim(0,70)
    ax.set_title("Comprehension error by format\n(mean per-model-cell, 8 models, adversarial generic payloads)",fontsize=11)
    style(ax,t); save(fig,f"aggregate-error-{'dark' if dark else 'light'}.png",t)

def chart_per_model(dark):
    t=theme(dark); fig,ax=plt.subplots(figsize=(11,4.8))
    labels=[f"{m} · N={n}" for (m,n) in cells]; x=range(len(cells)); w=.26
    for i,f in enumerate(FMTS):
        vals=[err(m,n,f) for (m,n) in cells]
        xs=[j+(i-1)*w for j in x]
        ax.bar([xj for xj,v in zip(xs,vals) if v is not None],
               [v for v in vals if v is not None],width=w,color=C[f],label=LBL[f])
    ax.set_xticks(list(x)); ax.set_xticklabels(labels,fontsize=8,rotation=35,ha='right')
    ax.set_ylabel("Comprehension error rate (%)"); ax.set_ylim(0,80)
    ax.set_title("Comprehension error by model and format (higher = worse)",fontsize=12)
    lg=ax.legend(facecolor=t['bg'],edgecolor=t['grid'],labelcolor=t['fg'])
    style(ax,t); save(fig,f"per-model-error-{'dark' if dark else 'light'}.png",t)

def chart_tradeoff(dark):
    t=theme(dark); fig,ax=plt.subplots(figsize=(6.5,4.6))
    # x = tokens at N=500 (fewer = cheaper), y = mean-cell error (lower = better)
    for f in FMTS:
        x=TOK[500][f]/1000; y=mean_cell[f]
        ax.scatter(x,y,s=260,color=C[f],zorder=3,edgecolor=t['bg'],linewidth=1.5)
        ax.annotate(f"{LBL[f]}\n{x:.0f}k tok, {y:.0f}% err",(x,y),
                    textcoords="offset points",xytext=(10,8),color=t['fg'],fontsize=9,fontweight='bold')
    ax.set_xlabel("Tokens per payload, N=500 (o200k; fewer = cheaper →)")
    ax.set_ylabel("Comprehension error (%) — lower = better")
    ax.set_title("The trade: bpp is cheapest and least correct;\nGCF is the sweet spot (cheap AND correct)",fontsize=11)
    ax.set_xlim(0,115); ax.set_ylim(20,62)
    style(ax,t); save(fig,f"token-vs-error-{'dark' if dark else 'light'}.png",t)

for dark in (True,False):
    chart_aggregate(dark); chart_per_model(dark); chart_tradeoff(dark)
print("mean-cell error:", {k:round(v,1) for k,v in mean_cell.items()})
print("charts written to", OUT)
for p in sorted(os.listdir(OUT)): print(" ",p)
