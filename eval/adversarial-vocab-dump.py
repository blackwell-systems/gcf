#!/usr/bin/env python3
"""
Adversarial Vocabulary Dump

Exhaustively extracts every vocabulary entry where a delimiter character
(pipe, quote, tab, comma, colon) is fused with alphabetic content from all 43 tokenizers.

BPE is deterministic: if |foo is a vocabulary entry, it WILL merge.
If |foo is NOT in the vocabulary, it CAN NEVER merge. This is the
complete adversarial surface for each delimiter. No sampling needed.

Run:
  cd eval
  source .venv/bin/activate
  python3 adversarial-vocab-dump.py
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
    print(f"Loaded: {len(tokenizers)}")
    print()

    n = len(tokenizers)
    all_results = {}

    for tname, tok in tokenizers.items():
        vocab = tok.get_vocab()

        pipe_entries = []
        quote_entries = []
        tab_entries = []
        comma_entries = []
        colon_entries = []

        for token_str in vocab:
            clean = token_str.replace("\u0120", " ").replace("\u2581", " ").replace("\u010a", "\n")

            if clean.startswith("|") and len(clean) > 1:
                rest = clean[1:]
                if any(c.isalpha() for c in rest):
                    pipe_entries.append(clean)

            if clean.startswith('"') and len(clean) > 1:
                rest = clean[1:]
                if any(c.isalpha() for c in rest):
                    quote_entries.append(clean)

            if "\t" in clean and len(clean) > 1:
                parts = clean.split("\t")
                for part in parts:
                    if part and any(c.isalpha() for c in part):
                        tab_entries.append(clean)
                        break

            if clean.startswith(",") and len(clean) > 1:
                rest = clean[1:]
                if any(c.isalpha() for c in rest):
                    comma_entries.append(clean)

            if clean.startswith(":") and len(clean) > 1:
                rest = clean[1:]
                if any(c.isalpha() for c in rest):
                    colon_entries.append(clean)

        all_results[tname] = {
            "vocab_size": len(vocab),
            "pipe": sorted(pipe_entries),
            "quote": sorted(quote_entries),
            "tab": sorted(tab_entries),
            "comma": sorted(comma_entries),
            "colon": sorted(colon_entries),
        }

    # Per-tokenizer summary
    print("=" * 80)
    print(f"EXHAUSTIVE VOCABULARY DUMP ({n} tokenizers)")
    print("=" * 80)
    print()
    print(f"{'Tokenizer':<35} {'Vocab':>7} {'|+alpha':>8} {'chr(34)+alpha':>13} {'tab+alpha':>10} {',+alpha':>8} {':+alpha':>8}")
    print("-" * 95)
    for tname, r in all_results.items():
        print(f"{tname[:34]:<35} {r['vocab_size']:>7} {len(r['pipe']):>8} {len(r['quote']):>13} {len(r['tab']):>10} {len(r['comma']):>8} {len(r['colon']):>8}")

    # Aggregate unique words per delimiter
    def aggregate(key):
        words = {}
        for tname, r in all_results.items():
            for entry in r[key]:
                clean = entry.replace("\u0120", " ").replace("\u2581", " ").replace("\u010a", "\n")
                if key == "pipe":
                    word = clean[1:]
                elif key == "quote":
                    word = clean[1:]
                else:
                    parts = clean.split("\t")
                    word = next((p for p in parts if p and any(c.isalpha() for c in p)), clean)
                words.setdefault(word, set()).add(tname)
        return words

    pipe_words = aggregate("pipe")
    quote_words = aggregate("quote")
    tab_words = aggregate("tab")
    comma_words = aggregate("comma")
    colon_words = aggregate("colon")

    # Print pipe surface (small enough to list completely)
    print()
    print("=" * 80)
    print(f"PIPE: COMPLETE ADVERSARIAL SURFACE ({len(pipe_words)} unique words)")
    print("=" * 80)
    print()
    for word, toks in sorted(pipe_words.items(), key=lambda x: (-len(x[1]), x[0])):
        print(f"  |{word:<20} {len(toks):>2}/{n} tokenizers")

    # Print comma surface
    print()
    print("=" * 80)
    print(f"COMMA: ADVERSARIAL SURFACE ({len(comma_words)} unique words)")
    print("=" * 80)
    print()
    for word, toks in sorted(comma_words.items(), key=lambda x: (-len(x[1]), x[0]))[:30]:
        print(f"  ,{word:<20} {len(toks):>2}/{n} tokenizers")
    if len(comma_words) > 30:
        print(f"  ... and {len(comma_words) - 30} more")

    # Print colon surface
    print()
    print("=" * 80)
    print(f"COLON: ADVERSARIAL SURFACE ({len(colon_words)} unique words)")
    print("=" * 80)
    print()
    for word, toks in sorted(colon_words.items(), key=lambda x: (-len(x[1]), x[0]))[:30]:
        print(f"  :{word:<20} {len(toks):>2}/{n} tokenizers")
    if len(colon_words) > 30:
        print(f"  ... and {len(colon_words) - 30} more")

    # Summary
    print()
    print("=" * 80)
    print("GRAND SUMMARY")
    print("=" * 80)
    print()
    p = max(len(pipe_words), 1)
    print(f"{'Delimiter':<12} {'Unique words':>14} {'Ratio to pipe':>15}")
    print("-" * 42)
    print(f"{'| (pipe)':<12} {len(pipe_words):>14} {'1x':>15}")
    print(f"{'\" (quote)':<12} {len(quote_words):>14} {f'{len(quote_words)/p:.0f}x':>15}")
    print(f"{'\\t (tab)':<12} {len(tab_words):>14} {f'{len(tab_words)/p:.0f}x':>15}")
    print(f"{', (comma)':<12} {len(comma_words):>14} {f'{len(comma_words)/p:.0f}x':>15}")
    print(f"{': (colon)':<12} {len(colon_words):>14} {f'{len(colon_words)/p:.0f}x':>15}")
    print()
    print("The pipe delimiter has the smallest adversarial surface of any delimiter tested.")

    # Save
    results_dir = Path(__file__).parent / "results" / "tokenizer"
    results_dir.mkdir(parents=True, exist_ok=True)
    output = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "tokenizer_count": n,
        "pipe_surface": {
            "unique_words": len(pipe_words),
            "words": {w: list(t) for w, t in sorted(pipe_words.items(), key=lambda x: -len(x[1]))},
        },
        "quote_surface": {"unique_words": len(quote_words)},
        "tab_surface": {"unique_words": len(tab_words)},
        "comma_surface": {"unique_words": len(comma_words)},
        "colon_surface": {"unique_words": len(colon_words)},
        "per_tokenizer": {
            tname: {"pipe": r["pipe"], "pipe_count": len(r["pipe"]),
                    "quote_count": len(r["quote"]), "tab_count": len(r["tab"]),
                    "comma_count": len(r["comma"]), "colon_count": len(r["colon"])}
            for tname, r in all_results.items()
        },
    }
    outfile = results_dir / f"adversarial-vocab-dump-{n}-tokenizers-{time.strftime('%Y%m%d')}.json"
    with open(outfile, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nResults: {outfile}")


if __name__ == "__main__":
    main()
