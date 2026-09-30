import re, glob, os
LOGDIR="/Users/dayna/code/gcf-integration-work/bpp-adversarial-comprehension/logs"
OUT="/Users/dayna/code/gcf-integration-work/bpp-adversarial-comprehension/results.csv"
rowre=re.compile(r'\b(PASS|FAIL|SKIP)\s+([A-Za-z0-9_.\-]+)\s+(gcf|json|bpp)\b')
modre=re.compile(r'Backend:\s+\w+\s+\(([^)]+)\)'); ordre=re.compile(r'Orders:\s+(\d+)')
SHORT={'google/gemini-2.5-flash':'gemini-2.5-flash','meta-llama/llama-3.1-8b-instruct':'llama-3.1-8b','meta-llama/llama-3.3-70b-instruct':'llama-3.3-70b','meta-llama/llama-4-maverick':'llama-4-maverick','deepseek/deepseek-chat':'deepseek-v3','google/gemma-3-27b-it':'gemma-3-27b','mistralai/mistral-small-3.2-24b-instruct':'mistral-small-3.2-24b','cohere/command-r-08-2024':'command-r'}
FAM=lambda m:('Google' if 'gemini' in m or 'gemma' in m else 'Meta' if 'llama' in m else 'DeepSeek' if 'deepseek' in m else 'Mistral' if 'mistral' in m else 'Cohere' if 'command' in m else '?')
rows=[]
for f in sorted(glob.glob(LOGDIR+"/*.log")):
    txt=open(f).read(); m=modre.search(txt); n=ordre.search(txt)
    model=SHORT.get(m.group(1),m.group(1)); N=n.group(1); run=re.search(r'run(\d+)',f).group(1)
    c={fmt:{'PASS':0,'FAIL':0,'SKIP':0} for fmt in ['gcf','json','bpp']}; seen=set()
    for mark,q,fmt in rowre.findall(txt):
        if (q,fmt) in seen: continue
        seen.add((q,fmt)); c[fmt][mark]+=1
    for fmt in ['gcf','json','bpp']:
        P,F,S=c[fmt]['PASS'],c[fmt]['FAIL'],c[fmt]['SKIP']; g=P+F
        acc=f"{100*P/g:.1f}" if g else ""; err=f"{100*F/g:.1f}" if g else ""
        rows.append((model,FAM(model),N,run,fmt,acc,err,P,F,S,g))
rows.sort(key=lambda r:(int(r[2]),r[0],int(r[3]),['gcf','json','bpp'].index(r[4])))
with open(OUT,"w") as o:
    o.write("model,family,n_orders,run,format,accuracy_pct,error_pct,pass,fail,skip,graded\n")
    for r in rows: o.write(",".join(str(x) for x in r)+"\n")
print(f"results.csv: {len(rows)} rows")
