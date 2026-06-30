#!/usr/bin/env python3
"""
Compute merge rates for all 16 barrier characters across 43 tokenizers.

For each barrier character, tests whether it merges with adjacent content
in realistic structured data patterns. Reports the merge rate (fraction of
test patterns where the character fuses with content) per tokenizer, averaged
across all tokenizers.

Cross-references with the cross-format transfer results to test whether
merge rate predicts transfer.

Run:
  cd eval
  source .venv/bin/activate
  python3 barrier-merge-rates.py
"""

import json
from pathlib import Path

import tiktoken
from huggingface_hub import hf_hub_download
from tokenizers import Tokenizer


# Same tokenizer loading as hf-tokenizer-analysis.py
class TiktokenWrapper:
    def __init__(self, encoding_name):
        self._enc = tiktoken.get_encoding(encoding_name)

    def encode(self, text, add_special_tokens=False):
        ids = self._enc.encode(text, allowed_special=set())
        class Result: pass
        r = Result()
        r.ids = ids
        return r

    def decode(self, ids):
        return self._enc.decode(ids)

    def get_vocab(self):
        vocab = {}
        for i in range(self._enc.n_vocab):
            try:
                token_bytes = self._enc.decode_single_token_bytes(i)
                token_str = token_bytes.decode("utf-8", errors="replace")
                vocab[token_str] = i
            except Exception:
                continue
        return vocab


TOKENIZER_SPECS = [
    ("GPT-4 (cl100k)", "tiktoken:cl100k_base"),
    ("GPT-4o (o200k)", "tiktoken:o200k_base"),
    ("GPT-2", "openai-community/gpt2"),
    ("Claude", "local:claude"),
    ("LLaMA 2 7B", "NousResearch/Llama-2-7b-hf"),
    ("LLaMA 3 8B", "NousResearch/Meta-Llama-3-8B"),
    ("LLaMA 3.1 8B", "NousResearch/Meta-Llama-3.1-8B"),
    ("CodeLlama 7B", "codellama/CodeLlama-7b-hf"),
    ("TinyLlama 1.1B", "TinyLlama/TinyLlama-1.1B-Chat-v1.0"),
    ("Gemma 2 2B", "unsloth/gemma-2-2b"),
    ("Gemma 3 1B", "unsloth/gemma-3-1b-pt"),
    ("T5 Base", "google-t5/t5-base"),
    ("Mistral 7B v0.1", "mistralai/Mistral-7B-v0.1"),
    ("Mistral 7B v0.3", "mistralai/Mistral-7B-v0.3"),
    ("Mistral Nemo", "mistralai/Mistral-Nemo-Base-2407"),
    ("Mixtral 8x7B", "mistralai/Mixtral-8x7B-v0.1"),
    ("Codestral 22B", "mistralai/Codestral-22B-v0.1"),
    ("Qwen 2 7B", "Qwen/Qwen2-7B"),
    ("Qwen 2.5 7B", "Qwen/Qwen2.5-7B"),
    ("Qwen 2.5 Coder", "Qwen/Qwen2.5-Coder-7B"),
    ("Qwen 3 8B", "Qwen/Qwen3-8B"),
    ("QwQ 32B", "Qwen/QwQ-32B"),
    ("DeepSeek V2 Lite", "deepseek-ai/DeepSeek-V2-Lite"),
    ("DeepSeek V3", "deepseek-ai/DeepSeek-V3"),
    ("DeepSeek R1", "deepseek-ai/DeepSeek-R1"),
    ("DeepSeek Coder V2", "deepseek-ai/DeepSeek-Coder-V2-Lite-Base"),
    ("Phi-2", "microsoft/phi-2"),
    ("Phi-3 Mini", "microsoft/Phi-3-mini-4k-instruct"),
    ("Phi-4", "microsoft/phi-4"),
    ("Falcon 7B", "tiiuae/falcon-7b"),
    ("Falcon 40B", "tiiuae/falcon-40b"),
    ("Falcon 2 11B", "tiiuae/falcon-11B"),
    ("Yi 1.5 9B", "01-ai/Yi-1.5-9B"),
    ("Yi Coder 9B", "01-ai/Yi-Coder-9B"),
    ("StarCoder2 7B", "bigcode/starcoder2-7b"),
    ("StarCoder2 15B", "bigcode/starcoder2-15b"),
    ("Nemotron Mini 4B", "nvidia/Nemotron-Mini-4B-Instruct"),
    ("Jamba v0.1", "AI21Labs/Jamba-v0.1"),
    ("StableLM 2 1.6B", "stabilityai/stablelm-2-1_6b"),
    ("Pythia 6.9B", "EleutherAI/pythia-6.9b"),
    ("Arctic", "Snowflake/snowflake-arctic-base"),
    ("OLMo 7B", "allenai/OLMo-7B"),
    ("Marco-o1", "AIDC-AI/Marco-o1"),
]


def load_tokenizer(name, repo):
    if repo.startswith("tiktoken:"):
        return TiktokenWrapper(repo.split(":")[1])
    if repo.startswith("local:"):
        path = Path(__file__).parent.parent / "node_modules/@lenml/tokenizer-claude/models/tokenizer.json"
        if path.exists():
            tok = Tokenizer.from_file(str(path))
            tok.no_truncation()
            return tok
        return None
    try:
        path = hf_hub_download(repo, "tokenizer.json")
        tok = Tokenizer.from_file(path)
        tok.no_truncation()
        return tok
    except Exception:
        return None


def encode(tok, text):
    return tok.encode(text, add_special_tokens=False).ids


def decode_tokens(tok, ids):
    return [tok.decode([i]) for i in ids]


def check_merge(tok, char, test_patterns):
    """Check if char merges with adjacent content across test patterns.
    Returns fraction of patterns where merge occurs."""
    merges = 0
    total = 0
    for pattern in test_patterns:
        ids = encode(tok, pattern)
        decoded = decode_tokens(tok, ids)
        merged = False
        for t in decoded:
            if char in t and len(t) > 1:
                # Token contains the char fused with other content
                stripped = t.replace(char, "")
                if any(c.isalpha() or c.isdigit() or c == "_" for c in stripped):
                    merged = True
                    break
        if merged:
            merges += 1
        total += 1
    return merges / max(total, 1)


# Test patterns for each barrier character
# Designed to mimic realistic structured data contexts
TEST_WORDS = [
    "name", "id", "type", "value", "status", "total", "count", "data",
    "result", "error", "config", "server", "client", "handler", "model",
    "user", "order", "item", "price", "active", "role", "email", "key",
    "host", "port", "path", "method", "query", "field", "index",
    "validate", "process", "create", "update", "delete", "check", "build",
    "parse", "format", "encode", "decode", "transform", "connect", "load",
    "null", "true", "false", "string", "number", "array", "object",
]

def make_patterns(char, words):
    """Generate test patterns for a delimiter character."""
    patterns = []
    for w in words:
        # char before word
        patterns.append(f"{char}{w}")
        # char after word
        patterns.append(f"{w}{char}")
        # char between words
        patterns.append(f"data{char}{w}")
    return patterns


def main():
    print("=" * 90)
    print("BARRIER CHARACTER MERGE RATES ACROSS 43 TOKENIZERS")
    print("=" * 90)
    print()

    # Load tokenizers
    print("Loading tokenizers...")
    tokenizers = {}
    for name, repo in TOKENIZER_SPECS:
        tok = load_tokenizer(name, repo)
        if tok:
            tokenizers[name] = tok
    print(f"Loaded {len(tokenizers)} tokenizers")
    print()

    # Barrier characters with labels
    barriers = [
        ("|", "pipe"),
        ("@", "at"),
        ("<", "less-than"),
        (">", "greater-than"),
        ('"', "double-quote"),
        ("'", "single-quote"),
        (":", "colon"),
        (",", "comma"),
        (";", "semicolon"),
        ("\t", "tab"),
        ("{", "open-brace"),
        ("}", "close-brace"),
        ("[", "open-bracket"),
        ("]", "close-bracket"),
        ("(", "open-paren"),
        (")", "close-paren"),
    ]

    results = {}

    print(f"{'Character':<16} {'Avg merge rate':>14} {'Min':>6} {'Max':>6} {'Tokenizers merging':>20}")
    print("-" * 66)

    for char, label in barriers:
        patterns = make_patterns(char, TEST_WORDS)
        rates = []

        for tok_name, tok in tokenizers.items():
            rate = check_merge(tok, char, patterns)
            rates.append({"tokenizer": tok_name, "rate": rate})

        avg_rate = sum(r["rate"] for r in rates) / len(rates)
        min_rate = min(r["rate"] for r in rates)
        max_rate = max(r["rate"] for r in rates)
        merging_count = sum(1 for r in rates if r["rate"] > 0)

        results[label] = {
            "char": char,
            "avg_merge_rate": round(avg_rate, 4),
            "min_merge_rate": round(min_rate, 4),
            "max_merge_rate": round(max_rate, 4),
            "tokenizers_merging": merging_count,
            "tokenizers_total": len(rates),
            "per_tokenizer": rates,
        }

        print(f"{label:<16} {avg_rate:>13.1%} {min_rate:>5.1%} {max_rate:>5.1%} {merging_count:>12}/{len(rates)}")

    # Cross-reference with transfer results
    print()
    print("=" * 90)
    print("CROSS-REFERENCE: MERGE RATE vs CROSS-FORMAT TRANSFER")
    print("=" * 90)
    print()

    transfer_data = {
        "md_table":      {"delta": +30.4, "transfer": True,  "primary_delim": "pipe"},
        "csv":           {"delta": +30.0, "transfer": True,  "primary_delim": "comma"},
        "protobuf_text": {"delta":+102.4, "transfer": True,  "primary_delim": "open-brace"},
        "ini":           {"delta": +36.4, "transfer": True,  "primary_delim": "open-bracket"},
        "s_expression":  {"delta": +38.5, "transfer": True,  "primary_delim": "open-paren"},
        "sql":           {"delta": +57.2, "transfer": True,  "primary_delim": "open-paren"},
        "toml":          {"delta":  +3.5, "transfer": None,  "primary_delim": "open-bracket"},
        "toon":          {"delta": -15.8, "transfer": False, "primary_delim": "tab"},
        "xml":           {"delta": -31.5, "transfer": False, "primary_delim": "less-than"},
    }

    print(f"{'Format':<16} {'Transfer':>9} {'Delta':>8} {'Delimiter':>14} {'Merge rate':>11}")
    print("-" * 62)

    for fmt in sorted(transfer_data.keys(), key=lambda x: transfer_data[x]["delta"], reverse=True):
        info = transfer_data[fmt]
        delim_label = info["primary_delim"]
        rate = results.get(delim_label, {}).get("avg_merge_rate", 0)
        transfer_str = "YES" if info["transfer"] else ("NO" if info["transfer"] is False else "weak")
        print(f"{fmt:<16} {transfer_str:>9} {info['delta']:>+7.1f}% {delim_label:>14} {rate:>10.1%}")

    # Check correlation
    transfer_rates = []
    no_transfer_rates = []
    for fmt, info in transfer_data.items():
        delim_label = info["primary_delim"]
        rate = results.get(delim_label, {}).get("avg_merge_rate", 0)
        if info["transfer"] is True:
            transfer_rates.append(rate)
        elif info["transfer"] is False:
            no_transfer_rates.append(rate)

    if transfer_rates and no_transfer_rates:
        avg_transfer = sum(transfer_rates) / len(transfer_rates)
        avg_no_transfer = sum(no_transfer_rates) / len(no_transfer_rates)
        print(f"\nAvg merge rate of transfer formats' delimiters: {avg_transfer:.1%}")
        print(f"Avg merge rate of non-transfer formats' delimiters: {avg_no_transfer:.1%}")
        if avg_no_transfer > avg_transfer * 2:
            print(f"Non-transfer delimiters merge {avg_no_transfer/max(avg_transfer, 0.001):.1f}x more than transfer delimiters.")

    # Save
    output = {
        "tokenizer_count": len(tokenizers),
        "test_words": len(TEST_WORDS),
        "patterns_per_char": len(TEST_WORDS) * 3,
        "results": results,
        "transfer_cross_reference": transfer_data,
    }

    out_path = Path(__file__).parent / "results" / "tokenizer" / "barrier-merge-rates.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2, default=str)
    print(f"\nResults saved to {out_path}")


if __name__ == "__main__":
    main()
