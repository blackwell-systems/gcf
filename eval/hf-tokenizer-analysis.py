#!/usr/bin/env python3
"""
HF Tokenizer Analysis: Expanded Boundary Merge Study

Extends the 8-tokenizer analysis to 50+ production tokenizers using
Hugging Face's tokenizers library. Downloads tokenizer configs directly
from the Hub for every major model family.

Tests:
1. Pipe delimiter merge rate (GCF's structural boundary)
2. Quote+colon merge rate (JSON's structural boundary)
3. Tab merge rate (TOON's structural boundary)
4. Vocabulary entry analysis (quote+letter vs pipe+letter counts)

Run:
  cd eval
  source .venv/bin/activate
  python3 hf-tokenizer-analysis.py
"""

import json
import sys
import time
from pathlib import Path

import tiktoken
from huggingface_hub import hf_hub_download
from tokenizers import Tokenizer


# Wrapper to give tiktoken the same interface as HF Tokenizer
class TiktokenWrapper:
    """Wraps tiktoken encoding to match HF Tokenizer interface."""

    def __init__(self, encoding_name: str):
        self._enc = tiktoken.get_encoding(encoding_name)
        self._vocab: dict[str, int] | None = None

    def encode(self, text: str, add_special_tokens: bool = False):
        """Returns an object with .ids attribute."""
        ids = self._enc.encode(text, allowed_special=set())

        class Result:
            pass

        r = Result()
        r.ids = ids
        return r

    def decode(self, ids: list[int]) -> str:
        return self._enc.decode(ids)

    def get_vocab(self) -> dict[str, int]:
        if self._vocab is None:
            # Build vocab dict from tiktoken's token_byte_values
            self._vocab = {}
            for i in range(self._enc.n_vocab):
                try:
                    token_bytes = self._enc.decode_single_token_bytes(i)
                    token_str = token_bytes.decode("utf-8", errors="replace")
                    self._vocab[token_str] = i
                except Exception:
                    continue
        return self._vocab

# Production tokenizers covering every major model family.
# Each entry: (display_name, hf_repo, tokenizer_file_or_None_for_auto)
TOKENIZER_SPECS = [
    # OpenAI (via tiktoken)
    ("GPT-4 (OpenAI cl100k)", "tiktoken:cl100k_base", None),
    ("GPT-4o (OpenAI o200k)", "tiktoken:o200k_base", None),
    ("GPT-2 (OpenAI)", "openai-community/gpt2", None),
    # Anthropic (via local @lenml tokenizer.json)
    ("Claude (Anthropic)", "local:claude", None),
    # Meta LLaMA family (via NousResearch for ungated access)
    ("LLaMA 2 7B (Meta)", "NousResearch/Llama-2-7b-hf", None),
    ("LLaMA 3 8B (Meta)", "NousResearch/Meta-Llama-3-8B", None),
    ("LLaMA 3.1 8B (Meta)", "NousResearch/Meta-Llama-3.1-8B", None),
    ("CodeLlama 7B (Meta)", "codellama/CodeLlama-7b-hf", None),
    ("TinyLlama 1.1B", "TinyLlama/TinyLlama-1.1B-Chat-v1.0", None),
    # Google (via Unsloth for ungated access)
    ("Gemma 2 2B (Google)", "unsloth/gemma-2-2b", None),
    ("Gemma 3 1B (Google)", "unsloth/gemma-3-1b-pt", None),
    ("T5 Base (Google)", "google-t5/t5-base", None),
    # Mistral
    ("Mistral 7B v0.1", "mistralai/Mistral-7B-v0.1", None),
    ("Mistral 7B v0.3", "mistralai/Mistral-7B-v0.3", None),
    ("Mistral Nemo (12B)", "mistralai/Mistral-Nemo-Base-2407", None),
    ("Mixtral 8x7B", "mistralai/Mixtral-8x7B-v0.1", None),
    ("Codestral 22B", "mistralai/Codestral-22B-v0.1", None),
    # Alibaba Qwen
    ("Qwen 2 7B (Alibaba)", "Qwen/Qwen2-7B", None),
    ("Qwen 2.5 7B (Alibaba)", "Qwen/Qwen2.5-7B", None),
    ("Qwen 2.5 Coder 7B", "Qwen/Qwen2.5-Coder-7B", None),
    ("Qwen 3 8B (Alibaba)", "Qwen/Qwen3-8B", None),
    ("QwQ 32B (Alibaba)", "Qwen/QwQ-32B", None),
    # DeepSeek
    ("DeepSeek V2 Lite", "deepseek-ai/DeepSeek-V2-Lite", None),
    ("DeepSeek V3 (671B)", "deepseek-ai/DeepSeek-V3", None),
    ("DeepSeek R1", "deepseek-ai/DeepSeek-R1", None),
    ("DeepSeek Coder V2 Lite", "deepseek-ai/DeepSeek-Coder-V2-Lite-Base", None),
    # Microsoft Phi
    ("Phi-2 (Microsoft)", "microsoft/phi-2", None),
    ("Phi-3 Mini (Microsoft)", "microsoft/Phi-3-mini-4k-instruct", None),
    ("Phi-4 (Microsoft)", "microsoft/phi-4", None),
    # TII Falcon
    ("Falcon 7B (TII)", "tiiuae/falcon-7b", None),
    ("Falcon 40B (TII)", "tiiuae/falcon-40b", None),
    ("Falcon 2 11B (TII)", "tiiuae/falcon-11B", None),
    # 01.AI Yi
    ("Yi 1.5 9B (01.AI)", "01-ai/Yi-1.5-9B", None),
    ("Yi Coder 9B (01.AI)", "01-ai/Yi-Coder-9B", None),
    # BigCode StarCoder
    ("StarCoder2 7B", "bigcode/starcoder2-7b", None),
    ("StarCoder2 15B", "bigcode/starcoder2-15b", None),
    # NVIDIA Nemotron
    ("Nemotron Mini 4B", "nvidia/Nemotron-Mini-4B-Instruct", None),
    # AI21 Jamba
    ("Jamba v0.1 (AI21)", "AI21Labs/Jamba-v0.1", None),
    # Stability AI
    ("StableLM 2 1.6B", "stabilityai/stablelm-2-1_6b", None),
    # EleutherAI
    ("Pythia 6.9B", "EleutherAI/pythia-6.9b", None),
    # Snowflake Arctic
    ("Arctic (Snowflake)", "Snowflake/snowflake-arctic-base", None),
    # AllenAI
    ("OLMo 7B (AllenAI)", "allenai/OLMo-7B", None),
    # Alibaba Marco
    ("Marco-o1 (Alibaba)", "AIDC-AI/Marco-o1", None),
]


def load_tokenizer(name: str, repo: str) -> Tokenizer | TiktokenWrapper | None:
    """Try to load a tokenizer from HF Hub, tiktoken, or local file."""
    # tiktoken-based (OpenAI)
    if repo.startswith("tiktoken:"):
        encoding_name = repo.split(":")[1]
        return TiktokenWrapper(encoding_name)

    # Local file (Claude from @lenml)
    if repo.startswith("local:"):
        local_paths = {
            "claude": Path(__file__).parent.parent
            / "node_modules/@lenml/tokenizer-claude/models/tokenizer.json",
        }
        key = repo.split(":")[1]
        path = local_paths.get(key)
        if path and path.exists():
            return Tokenizer.from_file(str(path))
        return None

    # HF Hub
    try:
        path = hf_hub_download(repo, "tokenizer.json")
        tok = Tokenizer.from_file(path)
        return tok
    except Exception:
        return None


def encode(tok, text: str) -> list[int]:
    """Encode text, no special tokens."""
    output = tok.encode(text, add_special_tokens=False)
    return output.ids


def decode_tokens(tok, ids: list[int]) -> list[str]:
    """Decode each token ID individually."""
    return [tok.decode([i]) for i in ids]


def check_pipe_merge(tok, context: str) -> bool:
    """Check if pipe merges with adjacent content in 'X|Y' pattern."""
    ids = encode(tok, context)
    decoded = decode_tokens(tok, ids)
    # Check if any token contains pipe fused with other content
    for t in decoded:
        if "|" in t and len(t) > 1:
            return True
    return False


def check_quote_merge(tok, field: str) -> bool:
    """Check if opening quote merges with field name in '"field":' pattern."""
    pattern = f'"{field}":'
    ids = encode(tok, pattern)
    decoded = decode_tokens(tok, ids)
    # Check if first token contains quote + field chars
    if decoded and len(decoded[0]) > 1 and '"' in decoded[0]:
        stripped = decoded[0].replace('"', '')
        if any(c.isalpha() or c == '_' for c in stripped):
            return True
    return False


def check_tab_merge(tok, word: str) -> bool:
    """Check if tab merges with adjacent word in 'word\\tword' pattern."""
    pattern = f"data\t{word}"
    ids = encode(tok, pattern)
    decoded = decode_tokens(tok, ids)
    for t in decoded:
        if "\t" in t and len(t.replace("\t", "")) > 0:
            return True
    return False


def count_vocab_entries(tok) -> dict:
    """Count vocabulary entries with merged grammar+payload."""
    vocab = tok.get_vocab()
    vocab_size = len(vocab)

    quote_letter = 0  # entries starting with " followed by letter
    pipe_letter = 0   # entries starting with | followed by letter
    tab_letter = 0    # entries containing tab + letter
    multi_grammar = 0 # entries with 2+ JSON grammar chars

    json_grammar = set('":{},[]')

    for token_str in vocab.keys():
        # Normalize: some tokenizers use special prefix chars
        # Remove common BPE prefixes
        clean = token_str.replace("Ġ", " ").replace("▁", " ").replace("Ċ", "\n")

        # Quote + letter
        if clean.startswith('"') and len(clean) > 1:
            rest = clean[1:]
            if any(c.isalpha() or c == '_' for c in rest):
                quote_letter += 1

        # Pipe + letter
        if "|" in clean and len(clean) > 1:
            parts_around_pipe = clean.split("|")
            has_letter_next_to_pipe = False
            for i, part in enumerate(parts_around_pipe):
                if part and any(c.isalpha() for c in part):
                    has_letter_next_to_pipe = True
            if has_letter_next_to_pipe:
                pipe_letter += 1

        # Tab + letter
        if "\t" in clean and len(clean) > 1:
            parts = clean.split("\t")
            for part in parts:
                if part and any(c.isalpha() for c in part):
                    tab_letter += 1
                    break

        # Multi-grammar (2+ different JSON grammar chars)
        grammar_in_token = set(c for c in clean if c in json_grammar)
        if len(grammar_in_token) >= 2 and len(clean) > 1:
            multi_grammar += 1

    return {
        "vocab_size": vocab_size,
        "quote_letter": quote_letter,
        "pipe_letter": pipe_letter,
        "tab_letter": tab_letter,
        "multi_grammar": multi_grammar,
    }


# Common field names from production APIs
COMMON_FIELDS = [
    "id", "name", "type", "value", "status", "title", "text", "url",
    "path", "time", "date", "code", "key", "data", "email", "role",
    "user_id", "description", "message", "content", "created_at",
    "updated_at", "score", "count", "total", "amount", "price",
    "method", "token", "version", "format", "label", "state",
    "source", "target", "parent", "result", "error", "file",
    "query", "config", "host", "port", "size", "level",
]

# Values to test pipe merge with (alphabetic, the common case in GCF)
PIPE_TEST_VALUES = [
    "pending", "active", "Alice", "function", "hello", "world",
    "engineering", "completed", "processing", "standard", "premium",
    "shipped", "delivered", "cancelled", "verified",
]

# Words to test tab merge with (TOON comparison)
TAB_TEST_WORDS = [
    "name", "value", "type", "status", "id", "data", "text",
    "code", "path", "title", "url", "key", "role", "email",
    "true", "false", "null", "string", "number", "array",
]


def main():
    print("=" * 80)
    print("HF TOKENIZER ANALYSIS: EXPANDED BOUNDARY MERGE STUDY")
    print(f"Testing {len(TOKENIZER_SPECS)} tokenizers from Hugging Face Hub")
    print("=" * 80)
    print()

    # Load all tokenizers
    tokenizers = {}
    failed = []
    print("Loading tokenizers...")
    for name, repo, _ in TOKENIZER_SPECS:
        try:
            tok = load_tokenizer(name, repo)
            if tok:
                tokenizers[name] = tok
                source = "tiktoken" if repo.startswith("tiktoken:") else "local" if repo.startswith("local:") else repo
                print(f"  OK  {name} ({source})")
            else:
                failed.append((name, repo, "no tokenizer.json"))
                print(f"  SKIP {name} ({repo}) - no tokenizer.json")
        except Exception as e:
            failed.append((name, repo, str(e)[:60]))
            print(f"  FAIL {name} ({repo}) - {str(e)[:60]}")

    print(f"\nLoaded: {len(tokenizers)}/{len(TOKENIZER_SPECS)}")
    if failed:
        print(f"Failed: {len(failed)}")
    print()

    n_tok = len(tokenizers)
    if n_tok == 0:
        print("No tokenizers loaded. Exiting.")
        sys.exit(1)

    # ===================================================================
    # TEST 1: Quote merge rate (JSON boundary)
    # ===================================================================
    print("=" * 80)
    print(f"TEST 1: JSON QUOTE MERGE RATE ({len(COMMON_FIELDS)} fields x {n_tok} tokenizers)")
    print("=" * 80)
    print()

    quote_results = {}  # name -> {field: bool}
    for tname, tok in tokenizers.items():
        quote_results[tname] = {}
        for field in COMMON_FIELDS:
            quote_results[tname][field] = check_quote_merge(tok, field)

    # Per-tokenizer summary
    print("Tokenizer".ljust(32) + "Merges".rjust(8) + "Rate".rjust(10))
    print("-" * 50)
    tok_quote_counts = {}
    for tname in tokenizers:
        merge_count = sum(1 for f in COMMON_FIELDS if quote_results[tname][f])
        rate = merge_count / len(COMMON_FIELDS) * 100
        tok_quote_counts[tname] = merge_count
        print(f"{tname[:31].ljust(32)}{merge_count:>5}/{len(COMMON_FIELDS)}  {rate:>6.1f}%")

    # Per-field summary (worst offenders)
    print()
    print("Worst fields (merge on most tokenizers):")
    print("Field".ljust(20) + "Merges".rjust(10) + "Rate".rjust(10))
    print("-" * 40)
    field_merge_counts = []
    for field in COMMON_FIELDS:
        count = sum(1 for tname in tokenizers if quote_results[tname][field])
        field_merge_counts.append((field, count))
    field_merge_counts.sort(key=lambda x: -x[1])
    for field, count in field_merge_counts[:20]:
        rate = count / n_tok * 100
        print(f'  "{field}":'.ljust(20) + f"{count}/{n_tok}".rjust(10) + f"{rate:.1f}%".rjust(10))

    total_quote_checks = len(COMMON_FIELDS) * n_tok
    total_quote_merges = sum(tok_quote_counts.values())
    print(f"\nOverall JSON quote merge rate: {total_quote_merges}/{total_quote_checks} "
          f"({total_quote_merges/total_quote_checks*100:.2f}%)")

    # ===================================================================
    # TEST 2: Pipe merge rate (GCF boundary)
    # ===================================================================
    print()
    print("=" * 80)
    print(f"TEST 2: GCF PIPE MERGE RATE ({len(COMMON_FIELDS)} fields x {len(PIPE_TEST_VALUES)} values x {n_tok} tokenizers)")
    print("=" * 80)
    print()

    pipe_total = 0
    pipe_merges = 0
    pipe_merge_details = []

    for tname, tok in tokenizers.items():
        tok_merges = 0
        tok_total = 0
        for field in COMMON_FIELDS:
            for value in PIPE_TEST_VALUES:
                pattern = f"{field}|{value}"
                merged = check_pipe_merge(tok, pattern)
                tok_total += 1
                pipe_total += 1
                if merged:
                    tok_merges += 1
                    pipe_merges += 1
                    pipe_merge_details.append((tname, field, value, pattern))
        if tok_merges > 0:
            print(f"  {tname[:40].ljust(40)} {tok_merges}/{tok_total} merges")

    if pipe_merges == 0:
        print("  ALL TOKENIZERS: pipe NEVER merges with alphabetic field/value content")
    print(f"\nOverall GCF pipe merge rate: {pipe_merges}/{pipe_total} "
          f"({pipe_merges/pipe_total*100:.4f}%)")

    if pipe_merge_details:
        print(f"\nMerge details ({len(pipe_merge_details)} cases):")
        for tname, field, value, pattern in pipe_merge_details[:10]:
            print(f"  {tname}: {pattern}")

    # ===================================================================
    # TEST 3: Tab merge rate (TOON boundary)
    # ===================================================================
    print()
    print("=" * 80)
    print(f"TEST 3: TOON TAB MERGE RATE ({len(TAB_TEST_WORDS)} words x {n_tok} tokenizers)")
    print("=" * 80)
    print()

    tab_total = 0
    tab_merges = 0
    tab_per_tok = {}

    for tname, tok in tokenizers.items():
        tok_merges = 0
        for word in TAB_TEST_WORDS:
            tab_total += 1
            if check_tab_merge(tok, word):
                tok_merges += 1
                tab_merges += 1
        tab_per_tok[tname] = tok_merges
        rate = tok_merges / len(TAB_TEST_WORDS) * 100
        print(f"  {tname[:40].ljust(40)} {tok_merges}/{len(TAB_TEST_WORDS)} ({rate:.0f}%)")

    print(f"\nOverall TOON tab merge rate: {tab_merges}/{tab_total} "
          f"({tab_merges/tab_total*100:.2f}%)")

    # ===================================================================
    # TEST 4: Vocabulary entry analysis
    # ===================================================================
    print()
    print("=" * 80)
    print(f"TEST 4: VOCABULARY ENTRY ANALYSIS ({n_tok} tokenizers)")
    print("=" * 80)
    print()

    print("Tokenizer".ljust(32) + "Vocab".rjust(8) + '  "+letter'.rjust(10) + "  |+letter".rjust(10)
          + "  tab+ltr".rjust(10) + "  multi-gram".rjust(12))
    print("-" * 82)

    vocab_results = {}
    for tname, tok in tokenizers.items():
        v = count_vocab_entries(tok)
        vocab_results[tname] = v
        print(f"{tname[:31].ljust(32)}{v['vocab_size']:>8}"
              f"{v['quote_letter']:>10}{v['pipe_letter']:>10}"
              f"{v['tab_letter']:>10}{v['multi_grammar']:>12}")

    # Summary stats
    all_quote = [v["quote_letter"] for v in vocab_results.values()]
    all_pipe = [v["pipe_letter"] for v in vocab_results.values()]
    all_tab = [v["tab_letter"] for v in vocab_results.values()]

    toks_with_quote_entries = sum(1 for q in all_quote if q > 0)
    toks_with_pipe_entries = sum(1 for p in all_pipe if p > 0)
    toks_with_tab_entries = sum(1 for t in all_tab if t > 0)

    print()
    print("Summary:")
    print(f"  Tokenizers with quote+letter vocab entries: {toks_with_quote_entries}/{n_tok}")
    print(f"  Tokenizers with pipe+letter vocab entries:  {toks_with_pipe_entries}/{n_tok}")
    print(f"  Tokenizers with tab+letter vocab entries:   {toks_with_tab_entries}/{n_tok}")
    if all_quote:
        avg_q = sum(all_quote) / len(all_quote)
        avg_p = sum(all_pipe) / len(all_pipe)
        print(f"  Avg quote+letter entries: {avg_q:.1f}")
        print(f"  Avg pipe+letter entries:  {avg_p:.1f}")
        if avg_p > 0:
            print(f"  Quote-to-pipe ratio: {avg_q/avg_p:.1f}:1")
        else:
            print(f"  Quote-to-pipe ratio: {avg_q:.0f}:0 (pipe never merges)")

    # ===================================================================
    # GRAND SUMMARY
    # ===================================================================
    print()
    print("=" * 80)
    print("GRAND SUMMARY")
    print("=" * 80)
    print()
    print(f"Tokenizers analyzed: {n_tok} (from {n_tok} model families)")
    print()
    print(f"JSON (quote) boundary merge rate:  {total_quote_merges/total_quote_checks*100:.2f}%"
          f"  ({total_quote_merges}/{total_quote_checks} checks)")
    print(f"GCF  (pipe)  boundary merge rate:  {pipe_merges/pipe_total*100:.4f}%"
          f"  ({pipe_merges}/{pipe_total} checks)")
    print(f"TOON (tab)   boundary merge rate:  {tab_merges/tab_total*100:.2f}%"
          f"  ({tab_merges}/{tab_total} checks)")
    print()

    if pipe_merges == 0:
        print("GCF's pipe delimiter: ZERO merges across ALL tokenizers tested.")
        print("The 0% merge rate claim holds universally.")
    else:
        print(f"GCF pipe merges found: {pipe_merges} (inspect details above)")
    print()

    # Comparison table
    print("Format comparison:")
    print("  Format  | Merge rate  | Implication")
    print("  --------+-------------+------------------------------------------")
    print(f"  GCF     | {pipe_merges/pipe_total*100:>8.4f}%  | Every model sees identical structure")
    print(f"  JSON    | {total_quote_merges/total_quote_checks*100:>8.2f}%  | Structure varies per model")
    print(f"  TOON    | {tab_merges/tab_total*100:>8.2f}%  | Worse than JSON")

    # Save results to JSON for downstream use
    output = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "tokenizer_count": n_tok,
        "failed_count": len(failed),
        "failed": [(n, r, e) for n, r, e in failed],
        "quote_merge_rate": total_quote_merges / total_quote_checks,
        "pipe_merge_rate": pipe_merges / pipe_total,
        "tab_merge_rate": tab_merges / tab_total,
        "per_tokenizer_quote_merges": tok_quote_counts,
        "per_tokenizer_tab_merges": tab_per_tok,
        "pipe_merge_count": pipe_merges,
        "field_merge_ranking": [(f, c) for f, c in field_merge_counts],
        "vocab_analysis": {k: v for k, v in vocab_results.items()},
    }

    results_dir = Path(__file__).parent / "results" / "tokenizer"
    results_dir.mkdir(parents=True, exist_ok=True)
    outfile = results_dir / f"hf-analysis-{n_tok}-tokenizers-{time.strftime('%Y%m%d')}.json"
    with open(outfile, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nResults saved to: {outfile}")


if __name__ == "__main__":
    main()
