#!/usr/bin/env python3
"""
ASCII Adversarial Surface: Complete Character Safety Ranking

Scans all 94 printable ASCII characters (codes 33-126) across 43 tokenizer
vocabularies. For each character, counts how many unique words exist as
merged vocabulary entries (character + alphabetic content).

Produces a definitive ranking: which characters have the smallest and
largest adversarial surfaces for use as structural delimiters.

Run:
  cd eval
  source .venv/bin/activate
  python3 ascii-adversarial-surface.py
"""

import importlib.util
import json
import time
from pathlib import Path

spec = importlib.util.spec_from_file_location("hf", str(Path(__file__).parent / "hf-tokenizer-analysis.py"))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def main():
    tokenizers = {}
    print("Loading tokenizers...")
    for name, repo, _ in mod.TOKENIZER_SPECS:
        tok = mod.load_tokenizer(name, repo)
        if tok:
            tokenizers[name] = tok
    n = len(tokenizers)
    print(f"Loaded: {n}")
    print()

    # All printable ASCII characters (33-126)
    chars = [chr(c) for c in range(33, 127)]

    results = {}

    for ch in chars:
        words = {}
        for tname, tok in tokenizers.items():
            vocab = tok.get_vocab()
            for token_str in vocab:
                clean = token_str.replace("\u0120", " ").replace("\u2581", " ").replace("\u010a", "\n")

                if ch == "\t":
                    # Tab: check if tab appears with adjacent alpha
                    if "\t" in clean and len(clean) > 1:
                        parts = clean.split("\t")
                        for part in parts:
                            if part and any(c.isalpha() for c in part):
                                words.setdefault(part, set()).add(tname)
                                break
                elif clean.startswith(ch) and len(clean) > 1:
                    rest = clean[1:]
                    if any(c.isalpha() for c in rest):
                        words.setdefault(rest, set()).add(tname)

        results[ch] = {
            "char": ch,
            "code": ord(ch),
            "unique_words": len(words),
            "max_tokenizers": max((len(t) for t in words.values()), default=0),
        }

        label = repr(ch) if ch in (' ', '\t') else ch
        print(f"  {label:<6} (U+{ord(ch):04X})  {len(words):>5} unique mergeable words", flush=True)

    # Sort by adversarial surface size
    ranked = sorted(results.values(), key=lambda x: x["unique_words"])

    print()
    print("=" * 70)
    print(f"ASCII ADVERSARIAL SURFACE RANKING ({n} tokenizers)")
    print("=" * 70)
    print()

    # Safe characters (0 merges)
    safe = [r for r in ranked if r["unique_words"] == 0]
    print(f"PERFECTLY SAFE ({len(safe)} characters, 0 mergeable words):")
    safe_chars = "".join(r["char"] for r in safe)
    print(f"  {safe_chars}")
    print()

    # Low risk (1-10 merges)
    low = [r for r in ranked if 0 < r["unique_words"] <= 10]
    if low:
        print(f"LOW RISK ({len(low)} characters, 1-10 mergeable words):")
        for r in low:
            print(f"  {r['char']:<6} {r['unique_words']:>5} words")
        print()

    # Medium risk (11-100)
    med = [r for r in ranked if 10 < r["unique_words"] <= 100]
    if med:
        print(f"MEDIUM RISK ({len(med)} characters, 11-100 mergeable words):")
        for r in med:
            print(f"  {r['char']:<6} {r['unique_words']:>5} words")
        print()

    # High risk (101+)
    high = [r for r in ranked if r["unique_words"] > 100]
    if high:
        print(f"HIGH RISK ({len(high)} characters, 101+ mergeable words):")
        for r in high:
            print(f"  {r['char']:<6} {r['unique_words']:>5} words")
        print()

    # GCF delimiter check
    print("=" * 70)
    print("GCF DELIMITER STATUS")
    print("=" * 70)
    gcf_chars = {'|': 'field delimiter', '@': 'symbol ID', '<': 'edge direction',
                 '#': 'section header', '{': 'schema open', '}': 'schema close',
                 '[': 'count open', ']': 'count close', ',': 'schema separator'}
    for ch, purpose in gcf_chars.items():
        r = results.get(ch, {})
        status = "SAFE" if r.get("unique_words", 0) == 0 else f"{r['unique_words']} words"
        print(f"  {ch}  ({purpose:<20}) {status}")

    # JSON delimiter check
    print()
    print("=" * 70)
    print("JSON DELIMITER STATUS")
    print("=" * 70)
    json_chars = {'"': 'string delimiter', ':': 'key-value separator',
                  ',': 'field separator', '{': 'object open', '}': 'object close',
                  '[': 'array open', ']': 'array close'}
    total_json = 0
    for ch, purpose in json_chars.items():
        r = results.get(ch, {})
        words = r.get("unique_words", 0)
        total_json += words
        status = "SAFE" if words == 0 else f"{words} words"
        print(f"  {ch}  ({purpose:<20}) {status}")
    print(f"  TOTAL JSON SURFACE: {total_json} words")

    # Save results
    results_dir = Path(__file__).parent / "results" / "tokenizer"
    results_dir.mkdir(parents=True, exist_ok=True)
    output = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "tokenizer_count": n,
        "characters_tested": len(chars),
        "safe_count": len(safe),
        "safe_characters": safe_chars,
        "ranking": ranked,
    }
    outfile = results_dir / f"ascii-adversarial-surface-{n}-tokenizers-{time.strftime('%Y%m%d')}.json"
    with open(outfile, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nResults: {outfile}")


if __name__ == "__main__":
    main()
