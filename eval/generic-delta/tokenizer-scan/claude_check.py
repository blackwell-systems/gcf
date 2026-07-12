from tokenizers import Tokenizer
tk=Tokenizer.from_file("node_modules/@lenml/tokenizer-claude/models/tokenizer.json")
SAMPLES=["## orders [3]{@id,total,status,customer}","1001|59.98|shipped|Alice",
 "GCF profile=generic delta=true base_root=sha256:aaa9f2 new_root=sha256:bbb4c7",
 "## added [1]{@id,total,status,customer}","1004|75.00|pending|Dave",
 "## changed [1]{@id,total,status,customer}","## removed [1]{@id}","1001"]
DELIMS=["|","@","#","{","}","[","]",",","="]
def merged(pc,d): return d in pc and any(c.isalnum() for c in pc)
per={d:0 for d in DELIMS}
for s in SAMPLES:
    for i in tk.encode(s).ids:
        pc=tk.decode([i])
        for d in DELIMS:
            if merged(pc,d): per[d]+=1
print("Claude (Anthropic):", ", ".join(f"{d}:{per[d]}" for d in DELIMS if per[d]) or "all isolated")
print("  @ (identity marker) isolated:", per["@"]==0)
print("  | (row delimiter) isolated:", per["|"]==0)
