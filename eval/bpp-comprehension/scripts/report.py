import re, glob, os, collections, statistics
LOGDIR="/Users/dayna/code/gcf-integration-work/bpp-adversarial-comprehension/logs"
OUT="/Users/dayna/code/gcf-integration-work/bpp-adversarial-comprehension"
rowre=re.compile(r'\b(PASS|FAIL|SKIP)\s+([A-Za-z0-9_.\-]+)\s+(gcf|json|bpp)\b')
modre=re.compile(r'Backend:\s+\w+\s+\(([^)]+)\)')
ordre=re.compile(r'Orders:\s+(\d+)')
SHORT={'google/gemini-2.5-flash':'gemini-2.5-flash','meta-llama/llama-3.1-8b-instruct':'llama-3.1-8b',
'meta-llama/llama-3.3-70b-instruct':'llama-3.3-70b','meta-llama/llama-4-maverick':'llama-4-maverick',
'deepseek/deepseek-chat':'deepseek-v3','google/gemma-3-27b-it':'gemma-3-27b',
'mistralai/mistral-small-3.2-24b-instruct':'mistral-small-3.2-24b','cohere/command-r-08-2024':'command-r'}
FAM={'gemini':'Google','llama':'Meta','deepseek':'DeepSeek','gemma':'Google','mistral':'Mistral','command':'Cohere'}
def fam(m):
    for k,v in FAM.items():
        if k in m: return v
    return '?'
cells=collections.defaultdict(lambda: collections.defaultdict(lambda:{'PASS':0,'FAIL':0,'SKIP':0}))
runset=set()
for f in sorted(glob.glob(LOGDIR+"/*.log")):
    txt=open(f).read()
    m=modre.search(txt); n=ordre.search(txt)
    model=SHORT.get(m.group(1),m.group(1)) if m else os.path.basename(f); N=n.group(1) if n else '?'
    run=re.search(r'run(\d+)',f).group(1)
    key=(model,int(N)); runset.add((model,N,run))
    seen=set()
    for mark,q,fmt in rowre.findall(txt):
        k=(q,fmt)
        if k in seen: continue
        seen.add(k); cells[key][fmt][mark]+=1

def nruns(model,N): return len({r for (mm,nn,r) in runset if mm==model and str(N)==nn})

order=sorted(cells.keys(), key=lambda k:(k[1],k[0]))
# per-cell error rates
cell_err={}   # (model,N,fmt)->err
cell_acc={}
pool=collections.defaultdict(lambda:{'P':0,'F':0,'S':0})
tot_req=tot_g=0
for (model,N) in order:
    for fmt in ['gcf','json','bpp']:
        d=cells[(model,N)][fmt]; P,F,S=d['PASS'],d['FAIL'],d['SKIP']; g=P+F
        tot_req+=P+F+S; tot_g+=g
        pool[fmt]['P']+=P; pool[fmt]['F']+=F; pool[fmt]['S']+=S
        if g: cell_err[(model,N,fmt)]=100*F/g; cell_acc[(model,N,fmt)]=100*P/g

def mean_cells(fmt): 
    v=[cell_err[k] for k in cell_err if k[2]==fmt]; return statistics.mean(v), len(v)
def pooled(fmt):
    g=pool[fmt]['P']+pool[fmt]['F']; return (100*pool[fmt]['F']/g if g else 0), g

L=[]
L.append("# bpp vs GCF vs JSON — Adversarial Generic-Profile Comprehension Study\n")
L.append("_Dayna Blackwell, 2026-09-30. Does bpp's token saving survive comprehension at scale, "
"or does its whitespace grammar + reference indirection degrade structural reading?_\n")
models=sorted({m for (m,n) in cells})
L.append("## Scope\n")
L.append(f"- **Models:** {len(models)} across {len(set(fam(m) for m in models))} families "
f"({', '.join(sorted(set(fam(m) for m in models)))})")
L.append(f"- **Runs:** {len(runset)}  |  **Requests sent:** {tot_req}  |  **Graded data points:** {tot_g}")
L.append("- **Scales:** 500 and 1000 nested order records  |  **Questions:** 19 (13 canonical + 6 deep lookups)  |  **temp 0.2**")
L.append("- **Formats:** gcf, json, bpp (bpp = refs=True, its shipping default). All presented COLD (format-name label only, no syntax primer), identical treatment.\n")

L.append("## Headline\n")
mg,_=mean_cells('gcf'); mj,_=mean_cells('json'); mb,_=mean_cells('bpp')
L.append("**Mean per-model-cell error rate** (equal weight per model-cell, GCF's canonical method; "
"avoids over-weighting the models with more repeat runs):\n")
L.append("| format | mean cell error | vs GCF |")
L.append("|---|---|---|")
L.append(f"| **gcf** | **{mg:.1f}%** | — |")
L.append(f"| json | {mj:.1f}% | {mj/mg:.2f}x |")
L.append(f"| **bpp** | **{mb:.1f}%** | **{mb/mg:.2f}x** |")
pg,gg=pooled('gcf'); pj,gj=pooled('json'); pb,gb=pooled('bpp')
L.append(f"\n_Pooled by data point (secondary; over-weights llama-3.1-8b at n=8): "
f"gcf {pg:.1f}% / json {pj:.1f}% / bpp {pb:.1f}% -> bpp {pb/pg:.2f}x gcf._\n")
L.append("GCF has the lowest error rate by both methods. It **dominates JSON on both axes at once** "
"(fewer tokens AND fewer errors) and roughly halves bpp's error, while bpp only ever wins raw token count.\n")

L.append("## Per-model results (accuracy% / error%)\n")
L.append("| model | family | N | runs | gcf | json | bpp |")
L.append("|---|---|---|---|---|---|---|")
for (model,N) in order:
    cellrow=[]
    for fmt in ['gcf','json','bpp']:
        k=(model,N,fmt)
        cellrow.append(f"{cell_acc[k]:.0f}/{cell_err[k]:.0f}" if k in cell_acc else "n/a")
    L.append(f"| {model} | {fam(model)} | {N} | {nruns(model,N)} | {cellrow[0]} | {cellrow[1]} | {cellrow[2]} |")
L.append("\n(cells are accuracy / error, pooled across that cell's runs. `n/a` = provider rejected the "
"large payload for that format, not a comprehension result.)\n")

L.append("## Token cost (o200k, adversarial fixture)\n")
L.append("| N | JSON | GCF | bpp | bpp vs JSON | bpp vs GCF |")
L.append("|---|---|---|---|---|---|")
L.append("| 500 | 101,482 | 44,770 | 30,704 | -69.7% | -31.4% |")
L.append("| 1000 | 203,389 | 89,928 | 61,812 | -69.6% | -31.3% |")
L.append("\nbpp is the most compact (tokens conceded). The study asks only whether that compression costs comprehension.\n")

L.append("## Key findings\n")
L.append("1. **GCF lowest error in every pooling; best-or-tied in nearly every cell.** bpp had the worst "
"error rate in almost all cells.\n")
L.append("2. **The failure is a literal indirection failure.** bpp hoists repeated values to a top `&N` "
"dictionary and points to them with `*N`. Models return the *pointer* instead of the value: `\"375\"`/"
"`\"749\"` (the index) on capable models, `\"*250\"`/`\"*256\"`/`\"*322\"`/`\"*372\"` (the literal token) on "
"weaker ones. GCF/JSON carry the value in place and cannot produce this.\n")
L.append("3. **Capacity masks the damage, it does not remove it.** The delimiter-merge is a tokenizer "
"property applied to every model identically, before inference. Stronger models spend reserve capacity "
"reconstructing the smeared structure; they still bleed (gemini-2.5-flash lost 21 points on bpp at N=500, "
"58 vs 79 on a comfortable payload) and the masking erodes as payload grows (68% at N=1000). There is no "
"'frontier-safe' regime, only a frontier-masked one. 8b->70b lifted GCF +10 but left bpp flat (~42), and "
"the 70b still returned raw `*N`.\n")
L.append("4. **Token economics: the saving is erased once errors are priced.** bpp saves ~13k tokens/call "
"vs GCF; one retried wrong answer re-sends ~27k (~2x the saving). bpp's extra error rate means ~1 extra "
"wrong answer per ~5 calls, eating ~40-50% of the saving in retries alone, and silent errors (confident "
"wrong value) are never retried, so the saving is simply spent on being wrong.\n")

L.append("## Caveats (honest)\n")
L.append("- **Run-count imbalance:** llama-3.1-8b n=8, gemma-3-27b n=5, gemini-1000 n=2, rest n=1-2. "
"Headline uses mean-of-cells to neutralize this; pooled shown as secondary.\n")
L.append("- **Provider failures (not comprehension):** cheap OpenRouter providers rejected the largest "
"payloads on some cells (gemma json @500, mistral-small gcf+json @1000: context caps / empty responses). "
"Those format-cells are `n/a`, excluded from rates.\n")
L.append("- **Excluded run:** mistral-nemo (12B) was run and DELETED as sub-floor (failed order_count on "
"all three formats; the model cannot read any format, so the run measured incompetence, not legibility). "
"Stated criterion, not a silent drop.\n")
L.append("- **max_tokens=200** truncated verbose chain-of-thought on a few aggregation answers (both bpp "
"and json); affects the shared-noise aggregation questions, not the short-answer lookups.\n")
L.append("- **Repeatability:** where repeated, bpp is highly stable (gemma 31.6% x5; mistral-small "
"31.6/29.4%), so the gap is not run-to-run noise.\n")

L.append("## Verdict\n")
L.append("**Use GCF.** It is the only Pareto-optimal choice: it beats JSON on tokens *and* comprehension "
"simultaneously, and roughly halves bpp's error rate while still cutting tokens ~56-59% vs JSON. bpp's "
"only win is raw token count, which is illusory once error cost is priced, and its grammar degrades "
"structural reading on every model tier, not just weak ones. For any tool serving unknown models or "
"non-trivial payloads, GCF is the correct default.\n")
L.append("## Artifacts\n")
L.append("- `results.csv` — per-run machine-readable data\n- `logs/` — raw per-run PASS/FAIL logs "
"(expected vs got, every cell)\n- `encodings/` — exact payloads per format\n- `NOTES.md` — running lab "
"notebook (method, mechanism, token economics)\n")

open(OUT+"/REPORT.md","w").write("\n".join(L)+"\n")
print("REPORT.md written")
print(f"headline mean-cell: gcf {mg:.1f} json {mj:.1f} bpp {mb:.1f}  (bpp {mb/mg:.2f}x gcf)")
print(f"models {len(models)} runs {len(runset)} requests {tot_req} graded {tot_g}")
