import importlib.util, statistics
from pathlib import Path
# gcf/eval (two levels up: grammar/ -> generic-delta/ -> eval/), where barrier-merge-rates.py lives.
EVAL = Path(__file__).resolve().parents[2]
def load_mod(name, file):
    spec = importlib.util.spec_from_file_location(name, EVAL/file)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
bm = load_mod("bm", "barrier-merge-rates.py")

toks = {}
for name, repo in bm.TOKENIZER_SPECS:
    try:
        t = bm.load_tokenizer(name, repo)
        if t: toks[name] = t
    except Exception: pass
print(f"loaded {len(toks)} tokenizers\n")

FIELDS = ["id","order_id","sku","uuid","key","pk","user_id","email","code","ref",
          "hash","name","isbn","guid","ID","Id","rowid","_id","customer_id","account"]

sets = {
  "bare  @field":        [f"@{f}" for f in FIELDS],
  "decl  {@field,...}":  [f"{{@{f},total,status}}" for f in FIELDS],
  "hdr   ## orders [3]{@field,...}": [f"## orders [3]{{@{f},total,status,customer}}" for f in FIELDS],
}
print(f"{'context':36} {'mean @-merge':>12} {'max':>6} {'clean(0%) tokenizers':>22}")
for label, pats in sets.items():
    rates = [bm.check_merge(t, "@", pats) for t in toks.values()]
    clean = sum(1 for r in rates if r == 0.0)
    print(f"{label:36} {statistics.mean(rates)*100:>11.2f}% {max(rates)*100:>5.1f}% {clean:>10}/{len(rates)}")

# baseline: general @ merge (the barrier study's own patterns)
base = bm.make_patterns("@", bm.TEST_WORDS)
brates = [bm.check_merge(t, "@", base) for t in toks.values()]
print(f"{'baseline general @ (barrier study)':36} {statistics.mean(brates)*100:>11.2f}% {max(brates)*100:>5.1f}% {sum(1 for r in brates if r==0.0):>10}/{len(brates)}")

# integrity: after @, is the field name still recoverable as text?
def intact(tok, field):
    ids = bm.encode(tok, f"@{field}")
    dec = "".join(bm.decode_tokens(tok, ids))
    dec = dec.replace("Ġ"," ").replace("▁"," ").replace("Ċ","\n")
    i = dec.find("@")
    return field in dec[i+1:] if i>=0 else (field in dec)
for f in ["id","order_id","uuid"]:
    n = sum(1 for t in toks.values() if intact(t, f))
    print(f"  '{f}' text-recoverable after @ : {n}/{len(toks)} tokenizers")
