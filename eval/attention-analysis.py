#!/usr/bin/env python3
"""
Attention Analysis: GCF vs JSON Structural Stress

Loads Pythia 410M on CPU, feeds it identical data in GCF vs JSON format,
extracts attention weights from every layer and head, and measures:

1. Attention entropy (high = diffuse/noise, low = focused/signal)
2. Attention to grammar tokens vs payload tokens
3. Attention concentration on repeated vs unique tokens

Proves the mechanism behind comprehension failure: JSON's repeated field
names create uniform attention distribution that scales with row count.
GCF's structural tokens receive focused attention.

Run:
  cd eval
  source .venv/bin/activate
  python3 attention-analysis.py
"""

import json
import math
import time
from pathlib import Path

import numpy as np


class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.floating, np.float32, np.float64)):
            return float(obj)
        if isinstance(obj, (np.integer, np.int32, np.int64)):
            return int(obj)
        return super().default(obj)

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


def entropy(probs):
    """Shannon entropy of a probability distribution."""
    return -sum(p * math.log2(p) for p in probs if p > 1e-10)


def build_orders_json(n):
    """Build n-order JSON payload."""
    statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
    names = ["Alice Chen", "Bob Smith", "Carla Rodriguez", "David Park", "Eva Johansson"]
    orders = []
    for i in range(n):
        orders.append({
            "orderId": f"ORD-{i+1:05d}",
            "customer": names[i % 5],
            "status": statuses[i % 5],
            "total": round(29.97 + i * 12.5, 2),
        })
    return json.dumps(orders, indent=2)


def build_orders_gcf(n):
    """Build n-order GCF payload."""
    statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
    names = ["Alice Chen", "Bob Smith", "Carla Rodriguez", "David Park", "Eva Johansson"]
    lines = [f"## orders [{n}]{{orderId,customer,status,total}}"]
    for i in range(n):
        lines.append(f"ORD-{i+1:05d}|{names[i % 5]}|{statuses[i % 5]}|{round(29.97 + i * 12.5, 2)}")
    return "\n".join(lines)


def classify_tokens_gcf(tokens):
    """Classify each GCF token as grammar or payload."""
    labels = []
    for t in tokens:
        t_clean = t.replace("Ġ", " ").replace("Ċ", "\n")
        if t_clean.strip() in ("|", "@", "<", "##", "{", "}", "[", "]", ",", ""):
            labels.append("grammar")
        elif "|" in t_clean or "@" in t_clean or "<" in t_clean or "##" in t_clean:
            labels.append("grammar")
        elif t_clean.strip() == "":
            labels.append("whitespace")
        else:
            labels.append("payload")
    return labels


def classify_tokens_json(tokens):
    """Classify each JSON token as grammar, field-name, or payload."""
    labels = []
    for t in tokens:
        t_clean = t.replace("Ġ", " ").replace("Ċ", "\n").strip()
        # Pure grammar
        if t_clean in ('"', ':', ',', '{', '}', '[', ']', '":"', '","', '{"', '"}', '":', ',"'):
            labels.append("grammar")
        # Merged quote+field (like "name, "id, etc.)
        elif t_clean.startswith('"') and any(c.isalpha() for c in t_clean):
            labels.append("field_name")
        # Field names (standalone)
        elif t_clean in ("orderId", "customer", "status", "total", "id", "name", "type", "value"):
            labels.append("field_name")
        elif t_clean == "":
            labels.append("whitespace")
        else:
            labels.append("payload")
    return labels


def analyze_attention(model, tokenizer, text, format_name):
    """Run text through model and analyze attention patterns."""
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=2048)
    seq_len = inputs["input_ids"].shape[1]

    with torch.no_grad():
        outputs = model(**inputs, output_attentions=True)

    attentions = outputs.attentions  # tuple of (batch, heads, seq, seq)
    n_layers = len(attentions)
    n_heads = attentions[0].shape[1]

    # Get token strings for classification
    token_ids = inputs["input_ids"][0].tolist()
    token_strings = [tokenizer.decode([tid]) for tid in token_ids]

    # Classify tokens
    if format_name == "GCF":
        labels = classify_tokens_gcf(token_strings)
    else:
        labels = classify_tokens_json(token_strings)

    # Per-layer attention entropy (averaged across heads)
    layer_entropies = []
    for layer_idx, attn in enumerate(attentions):
        head_entropies = []
        for head_idx in range(n_heads):
            # Attention from last token (the "query" position for next-token prediction)
            attn_weights = attn[0, head_idx, -1, :].float().numpy()
            head_entropies.append(entropy(attn_weights))
        layer_entropies.append(sum(head_entropies) / len(head_entropies))

    # Attention to grammar vs payload (last token's attention, averaged across layers and heads)
    # Each head's attention sums to 1.0. We accumulate the share going to each label type.
    grammar_shares = []
    payload_shares = []
    field_name_shares = []

    for attn in attentions:
        for head_idx in range(n_heads):
            attn_weights = attn[0, head_idx, -1, :].float().numpy()
            g, p, f = 0.0, 0.0, 0.0
            for i, label in enumerate(labels):
                if label == "grammar":
                    g += float(attn_weights[i])
                elif label == "field_name":
                    f += float(attn_weights[i])
                elif label == "payload":
                    p += float(attn_weights[i])
            grammar_shares.append(g)
            payload_shares.append(p)
            field_name_shares.append(f)

    grammar_attn_avg = sum(grammar_shares) / len(grammar_shares) if grammar_shares else 0.0
    payload_attn_avg = sum(payload_shares) / len(payload_shares) if payload_shares else 0.0
    field_name_attn_avg = sum(field_name_shares) / len(field_name_shares) if field_name_shares else 0.0

    # Debug: check if labels actually matched tokens
    label_counts = {"grammar": labels.count("grammar"), "payload": labels.count("payload"),
                    "field_name": labels.count("field_name"), "whitespace": labels.count("whitespace")}
    unclassified = seq_len - sum(label_counts.values())
    print(f"    DEBUG {format_name}: labels={label_counts}, unclassified={unclassified}, "
          f"g_avg={grammar_attn_avg:.6f}, p_avg={payload_attn_avg:.6f}, "
          f"g_shares_sum={sum(grammar_shares):.6f}, p_shares_sum={sum(payload_shares):.6f}, "
          f"n_shares={len(grammar_shares)}")

    # Token repetition: how many unique token IDs vs total
    unique_ids = len(set(token_ids))
    repetition_ratio = 1 - (unique_ids / len(token_ids))

    # Count label types
    n_grammar = labels.count("grammar")
    n_payload = labels.count("payload")
    n_field = labels.count("field_name")

    # Grammar attention share (% of total attention going to grammar vs payload)
    total_attn = grammar_attn_avg + payload_attn_avg + field_name_attn_avg
    grammar_share = (grammar_attn_avg / total_attn * 100) if total_attn > 0 else 0.0
    payload_share = (payload_attn_avg / total_attn * 100) if total_attn > 0 else 0.0
    field_share = (field_name_attn_avg / total_attn * 100) if total_attn > 0 else 0.0

    return {
        "format": format_name,
        "seq_len": seq_len,
        "unique_tokens": unique_ids,
        "repetition_ratio": float(repetition_ratio),
        "n_grammar": n_grammar,
        "n_payload": n_payload,
        "n_field_name": n_field,
        "layer_entropies": layer_entropies,
        "mean_entropy": sum(layer_entropies) / len(layer_entropies),
        "grammar_attn": float(grammar_attn_avg),
        "payload_attn": float(payload_attn_avg),
        "field_name_attn": float(field_name_attn_avg),
        "grammar_share": float(grammar_share),
        "payload_share": float(payload_share),
        "field_share": float(field_share),
    }


def main():
    print("=" * 70)
    print("ATTENTION ANALYSIS: GCF vs JSON")
    print("Pythia 410M, CPU inference, attention extraction")
    print("=" * 70)
    print()

    # Model selection: Gemma 2B has 8192 context (fits 100 orders in both formats)
    model_name = "unsloth/gemma-2-2b"
    print(f"Loading {model_name}...")
    t0 = time.time()
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name, attn_implementation="eager", dtype=torch.float32)
    model.eval()
    print(f"Loaded in {time.time()-t0:.1f}s")
    print()

    results = []

    for n_orders in [5, 10, 20, 50, 100]:
        gcf_text = build_orders_gcf(n_orders)
        json_text = build_orders_json(n_orders)

        print(f"--- {n_orders} orders ---")
        print(f"  GCF: {len(gcf_text)} chars")
        print(f"  JSON: {len(json_text)} chars")

        gcf_result = analyze_attention(model, tokenizer, gcf_text, "GCF")
        json_result = analyze_attention(model, tokenizer, json_text, "JSON")

        results.append((n_orders, gcf_result, json_result))

        print(f"  {'':20s} {'GCF':>10s} {'JSON':>10s}")
        print(f"  {'Tokens':20s} {gcf_result['seq_len']:>10d} {json_result['seq_len']:>10d}")
        print(f"  {'Unique tokens':20s} {gcf_result['unique_tokens']:>10d} {json_result['unique_tokens']:>10d}")
        print(f"  {'Repetition ratio':20s} {gcf_result['repetition_ratio']:>9.1%} {json_result['repetition_ratio']:>9.1%}")
        print(f"  {'Mean entropy':20s} {gcf_result['mean_entropy']:>10.2f} {json_result['mean_entropy']:>10.2f}")
        print(f"  {'Grammar tokens':20s} {gcf_result['n_grammar']:>10d} {json_result['n_grammar']:>10d}")
        print(f"  {'Field name tokens':20s} {gcf_result['n_field_name']:>10d} {json_result['n_field_name']:>10d}")
        print(f"  {'Payload tokens':20s} {gcf_result['n_payload']:>10d} {json_result['n_payload']:>10d}")
        print(f"  {'Grammar attn share':20s} {gcf_result['grammar_share']:>9.1f}% {json_result['grammar_share']:>9.1f}%")
        print(f"  {'Field name attn':20s} {gcf_result['field_share']:>9.1f}% {json_result['field_share']:>9.1f}%")
        print(f"  {'Payload attn share':20s} {gcf_result['payload_share']:>9.1f}% {json_result['payload_share']:>9.1f}%")
        print()

    # Scale analysis
    print("=" * 70)
    print("ENTROPY SCALING")
    print("=" * 70)
    print()
    print(f"{'Orders':>8s} {'GCF entropy':>14s} {'JSON entropy':>14s} {'Delta':>10s} {'JSON/GCF':>10s}")
    print("-" * 58)
    for n_orders, gcf_r, json_r in results:
        delta = json_r["mean_entropy"] - gcf_r["mean_entropy"]
        ratio = json_r["mean_entropy"] / gcf_r["mean_entropy"] if gcf_r["mean_entropy"] > 0 else 0
        print(f"{n_orders:>8d} {gcf_r['mean_entropy']:>14.2f} {json_r['mean_entropy']:>14.2f} {delta:>+10.2f} {ratio:>9.2f}x")

    print()
    print("=" * 70)
    print("REPETITION SCALING")
    print("=" * 70)
    print()
    print(f"{'Orders':>8s} {'GCF repeat%':>14s} {'JSON repeat%':>14s}")
    print("-" * 38)
    for n_orders, gcf_r, json_r in results:
        print(f"{n_orders:>8d} {gcf_r['repetition_ratio']:>13.1%} {json_r['repetition_ratio']:>13.1%}")

    print()
    print("=" * 70)
    print("ATTENTION DISTRIBUTION SCALING")
    print("=" * 70)
    print()
    print(f"{'Orders':>8s} {'GCF grammar%':>13s} {'GCF payload%':>13s} {'JSON grammar%':>14s} {'JSON field%':>12s} {'JSON payload%':>14s}")
    print("-" * 68)
    for n_orders, gcf_r, json_r in results:
        print(f"{n_orders:>8d} {gcf_r['grammar_share']:>12.1f}% {gcf_r['payload_share']:>12.1f}% {json_r['grammar_share']:>13.1f}% {json_r['field_share']:>11.1f}% {json_r['payload_share']:>13.1f}%")

    # Save
    results_dir = Path(__file__).parent / "results" / "attention"
    results_dir.mkdir(parents=True, exist_ok=True)
    output = {
        "model": model_name,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "results": [
            {
                "n_orders": n,
                "gcf": {k: (float(v) if isinstance(v, (float, int)) else v) for k, v in g.items() if k != "layer_entropies"},
                "json": {k: (float(v) if isinstance(v, (float, int)) else v) for k, v in j.items() if k != "layer_entropies"},
            }
            for n, g, j in results
        ],
    }
    model_short = model_name.split("/")[-1]
    outfile = results_dir / f"attention-{model_short}-{time.strftime('%Y%m%d')}.json"
    with open(outfile, "w") as f:
        json.dump(output, f, indent=2, cls=NumpyEncoder)
    print(f"\nResults: {outfile}")


if __name__ == "__main__":
    main()
