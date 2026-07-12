import sys, tiktoken
from tokenizers import Tokenizer
from huggingface_hub import hf_hub_download

SPECS = [
 ("GPT-4 cl100k","tiktoken:cl100k_base"),("GPT-4o o200k","tiktoken:o200k_base"),
 ("GPT-2","openai-community/gpt2"),
 ("LLaMA-2-7B","NousResearch/Llama-2-7b-hf"),("LLaMA-3-8B","NousResearch/Meta-Llama-3-8B"),
 ("LLaMA-3.1-8B","NousResearch/Meta-Llama-3.1-8B"),("CodeLlama-7B","codellama/CodeLlama-7b-hf"),
 ("TinyLlama-1.1B","TinyLlama/TinyLlama-1.1B-Chat-v1.0"),
 ("Gemma-2-2B","unsloth/gemma-2-2b"),("Gemma-3-1B","unsloth/gemma-3-1b-pt"),("T5-Base","google-t5/t5-base"),
 ("Mistral-7B-v0.1","mistralai/Mistral-7B-v0.1"),("Mistral-7B-v0.3","mistralai/Mistral-7B-v0.3"),
 ("Mistral-Nemo","mistralai/Mistral-Nemo-Base-2407"),("Mixtral-8x7B","mistralai/Mixtral-8x7B-v0.1"),
 ("Codestral-22B","mistralai/Codestral-22B-v0.1"),
 ("Qwen2-7B","Qwen/Qwen2-7B"),("Qwen2.5-7B","Qwen/Qwen2.5-7B"),("Qwen2.5-Coder-7B","Qwen/Qwen2.5-Coder-7B"),
 ("Qwen3-8B","Qwen/Qwen3-8B"),("QwQ-32B","Qwen/QwQ-32B"),
 ("DeepSeek-V2-Lite","deepseek-ai/DeepSeek-V2-Lite"),("DeepSeek-V3","deepseek-ai/DeepSeek-V3"),
 ("DeepSeek-R1","deepseek-ai/DeepSeek-R1"),("DeepSeek-Coder-V2","deepseek-ai/DeepSeek-Coder-V2-Lite-Base"),
 ("Phi-2","microsoft/phi-2"),("Phi-3-Mini","microsoft/Phi-3-mini-4k-instruct"),("Phi-4","microsoft/phi-4"),
 ("Falcon-7B","tiiuae/falcon-7b"),("Falcon-40B","tiiuae/falcon-40b"),("Falcon2-11B","tiiuae/falcon-11B"),
 ("Yi-1.5-9B","01-ai/Yi-1.5-9B"),("Yi-Coder-9B","01-ai/Yi-Coder-9B"),
 ("StarCoder2-7B","bigcode/starcoder2-7b"),("StarCoder2-15B","bigcode/starcoder2-15b"),
 ("Nemotron-Mini-4B","nvidia/Nemotron-Mini-4B-Instruct"),("Jamba-v0.1","AI21Labs/Jamba-v0.1"),
 ("StableLM-2-1.6B","stabilityai/stablelm-2-1_6b"),("Pythia-6.9B","EleutherAI/pythia-6.9b"),
 ("Arctic","Snowflake/snowflake-arctic-base"),("OLMo-7B","allenai/OLMo-7B"),("Marco-o1","AIDC-AI/Marco-o1"),
]

class TT:
    def __init__(s,name): s.e=tiktoken.get_encoding(name)
    def pieces(s,t): return [s.e.decode([i]) for i in s.e.encode(t, allowed_special=set())]
class HF:
    def __init__(s,tok): s.t=tok
    def pieces(s,t):
        ids=s.t.encode(t).ids
        return [s.t.decode([i]) for i in ids]

def load(repo):
    if repo.startswith("tiktoken:"): return TT(repo.split(":",1)[1])
    p=hf_hub_download(repo,"tokenizer.json")
    return HF(Tokenizer.from_file(p))

# delta wire samples (v1, full-row-on-change)
SAMPLES=[
 "## orders [3]{@id,total,status,customer}",
 "1001|59.98|shipped|Alice",
 "GCF profile=generic delta=true base_root=sha256:aaa9f2 new_root=sha256:bbb4c7",
 "## added [1]{@id,total,status,customer}",
 "1004|75.00|pending|Dave",
 "## changed [1]{@id,total,status,customer}",
 "## removed [1]{@id}",
 "1001",
]
DELIMS=["|","@","#","{","}","[","]",",","="]
def merged(piece, d):
    # a delimiter 'merges' if it shares a token with alphanumeric content
    return d in piece and any(c.isalnum() for c in piece)

results={}; loaded=0; failed=[]
for name,repo in SPECS:
    try: tk=load(repo)
    except Exception as e: failed.append((name,str(e)[:60])); continue
    loaded+=1
    per={d:0 for d in DELIMS}
    for s in SAMPLES:
        for pc in tk.pieces(s):
            for d in DELIMS:
                if merged(pc,d): per[d]+=1
    results[name]=per
    print(f"OK  {name:<18} merges: "+", ".join(f"{d}:{per[d]}" for d in DELIMS if per[d]) or f"OK  {name:<18} (all isolated)", flush=True)

print("\n===== SUMMARY =====")
print(f"tokenizers loaded: {loaded}/{len(SPECS)}   (failed: {len(failed)})")
for d in DELIMS:
    bad=[n for n,per in results.items() if per[d]]
    print(f"  '{d}'  isolated on {loaded-len(bad)}/{loaded}"+(f"  MERGED on: {bad}" if bad else "  (100% isolated)"))
# focused: the new '@id' decision
print("\nFocused '@id' check (does @ ever fuse with 'id'?):")
badat=[n for n,per in results.items() if per['@']]
print("  @ fused with content on:", badat or "NONE (100% isolated across all loaded)")
if failed:
    print("\nfailed to load (gated/network):")
    for n,e in failed: print(f"  {n}: {e}")
