#!/usr/bin/env python3
"""
Session Dedup & Delta Encoding Token Savings Benchmark

Measures cumulative token savings from GCF's session deduplication and delta
encoding across multi-turn agent conversations, validated on 43 production
tokenizers from 20 providers.

Uses the gcf-python SDK for encoding and the same tokenizer infrastructure
as hf-tokenizer-analysis.py.

Run:
  cd eval
  source .venv/bin/activate
  pip install gcf-python  # if not installed
  python3 session-savings-benchmark.py

SDK: gcf-python (session.py, delta.py, encode.py)
"""

import json
import sys
from pathlib import Path

import tiktoken
from huggingface_hub import hf_hub_download
from tokenizers import Tokenizer

from gcf import (
    DeltaPayload,
    Edge,
    Payload,
    Session,
    Symbol,
    encode,
    encode_delta,
    encode_with_session,
)


# ═══════════════════════════════════════════════════════════════════════════
# Tokenizer loading (same infrastructure as hf-tokenizer-analysis.py)
# ═══════════════════════════════════════════════════════════════════════════


class TiktokenWrapper:
    """Wraps tiktoken encoding to match HF Tokenizer interface."""

    def __init__(self, encoding_name: str):
        self._enc = tiktoken.get_encoding(encoding_name)

    def encode(self, text: str, add_special_tokens: bool = False):
        ids = self._enc.encode(text, allowed_special=set())

        class Result:
            pass

        r = Result()
        r.ids = ids
        return r


# Primary tokenizers (one per major provider)
PRIMARY_TOKENIZERS = [
    ("GPT-4o (OpenAI o200k)", "tiktoken:o200k_base"),
    ("Claude (Anthropic)", "local:claude"),
    ("LLaMA 3.1 8B (Meta)", "NousResearch/Meta-Llama-3.1-8B"),
    ("Gemma 2 2B (Google)", "unsloth/gemma-2-2b"),
    ("Mistral 7B v0.3", "mistralai/Mistral-7B-v0.3"),
    ("Qwen 2.5 7B (Alibaba)", "Qwen/Qwen2.5-7B"),
    ("DeepSeek V3 (671B)", "deepseek-ai/DeepSeek-V3"),
    ("Phi-4 (Microsoft)", "microsoft/phi-4"),
]


def load_tokenizer(name: str, repo: str):
    """Load a tokenizer from tiktoken, local file, or HF Hub."""
    if repo.startswith("tiktoken:"):
        return TiktokenWrapper(repo.split(":")[1])
    if repo.startswith("local:"):
        path = (
            Path(__file__).parent.parent
            / "node_modules/@lenml/tokenizer-claude/models/tokenizer.json"
        )
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


def token_count(tok, text: str) -> int:
    """Count tokens using a real tokenizer."""
    return len(tok.encode(text, add_special_tokens=False).ids)


# ═══════════════════════════════════════════════════════════════════════════
# Payload construction
# ═══════════════════════════════════════════════════════════════════════════

PACKAGES = [
    "internal/auth", "internal/server", "internal/store",
    "internal/cache", "internal/config", "internal/middleware",
    "internal/handler", "internal/model", "internal/service",
    "internal/repository",
]
KINDS = ["function", "type", "method", "interface"]
PROVENANCES = ["lsp_resolved", "ast_inferred", "lsp_resolved", "structural"]
NAMES = [
    "Handle", "Process", "Validate", "Create", "Update", "Delete",
    "Get", "Set", "Check", "Build", "Parse", "Format", "Encode",
    "Decode", "Transform", "Convert", "Load", "Save", "Init",
    "Close", "Open", "Read", "Write", "Flush", "Reset", "Clear",
    "Register", "Dispatch", "Execute", "Invoke", "Resolve", "Lookup",
    "Filter", "Sort", "Merge", "Split", "Join", "Map", "Reduce",
    "Scan", "Walk", "Visit", "Collect", "Emit", "Notify", "Subscribe",
    "Publish", "Connect", "Disconnect", "Authenticate", "Authorize",
]
EDGE_TYPES = ["calls", "imports", "implements", "references"]
SUFFIXES = [
    "Request", "Response", "Config", "Options", "Result",
    "Handler", "Manager", "Service", "Store", "Client",
    "Factory", "Builder", "Provider", "Resolver", "Adapter",
]


def build_symbol(i: int) -> Symbol:
    """Build a deterministic symbol from index."""
    pkg = PACKAGES[i % len(PACKAGES)]
    kind = KINDS[i % len(KINDS)]
    name = NAMES[i % len(NAMES)]
    suffix = SUFFIXES[i % len(SUFFIXES)]
    prov = PROVENANCES[i % len(PROVENANCES)]
    score = max(0.10, 0.95 - i * 0.012)

    if i < 100:
        distance = 0
    elif i < 300:
        distance = 1
    else:
        distance = 2

    if kind == "method":
        qn = f"github.com/org/project/{pkg}.{suffix}.{name}"
    else:
        qn = f"github.com/org/project/{pkg}.{name}{suffix}"

    return Symbol(
        qualified_name=qn,
        kind=kind,
        score=round(score, 2),
        provenance=prov,
        distance=distance,
    )


def build_payload(symbol_indices: list[int], num_edges: int) -> Payload:
    """Build a payload from specific symbol indices."""
    symbols = [build_symbol(i) for i in symbol_indices]
    edges = []
    for i in range(min(num_edges, len(symbols) - 1)):
        src = symbols[(i * 3 + 1) % len(symbols)]
        tgt = symbols[(i * 3) % len(symbols)]
        edges.append(Edge(
            source=src.qualified_name,
            target=tgt.qualified_name,
            edge_type=EDGE_TYPES[i % len(EDGE_TYPES)],
        ))

    return Payload(
        tool="context_for_task",
        token_budget=50000,
        tokens_used=len(symbols) * 35,
        symbols=symbols,
        edges=edges,
    )


def payload_to_json(p: Payload) -> str:
    """Encode payload as pretty JSON (what JSON-based tools send)."""
    data = {
        "tool": p.tool,
        "token_budget": p.token_budget,
        "tokens_used": p.tokens_used,
        "symbols": [
            {
                "qualified_name": s.qualified_name,
                "kind": s.kind,
                "score": s.score,
                "provenance": s.provenance,
                "distance": s.distance,
            }
            for s in p.symbols
        ],
        "edges": [
            {
                "source": e.source,
                "target": e.target,
                "type": e.edge_type,
            }
            for e in p.edges
        ],
    }
    return json.dumps(data, indent=2)


def compute_delta(old: Payload, new: Payload) -> DeltaPayload | None:
    """Compute delta between two payloads. Returns None if diff is too large."""
    old_names = {s.qualified_name: s for s in old.symbols}
    new_names = {s.qualified_name: s for s in new.symbols}

    removed = [s for qn, s in old_names.items() if qn not in new_names]
    added = [s for qn, s in new_names.items() if qn not in old_names]

    if len(removed) + len(added) > len(new_names) // 2:
        return None

    old_edge_keys = {(e.source, e.target, e.edge_type) for e in old.edges}
    new_edge_keys = {(e.source, e.target, e.edge_type) for e in new.edges}

    removed_edges = [
        Edge(source=s, target=t, edge_type=et)
        for s, t, et in old_edge_keys - new_edge_keys
    ]
    added_edges = [
        Edge(source=s, target=t, edge_type=et)
        for s, t, et in new_edge_keys - old_edge_keys
    ]

    full_str = encode(new)
    delta_str_est = len(added) * 80 + len(removed) * 40 + len(added_edges) * 60 + len(removed_edges) * 60

    return DeltaPayload(
        tool=new.tool,
        base_root=old.pack_root,
        new_root=new.pack_root,
        removed=removed,
        added=added,
        removed_edges=removed_edges,
        added_edges=added_edges,
        delta_tokens=delta_str_est // 4,
        full_tokens=len(full_str) // 4,
    )


# ═══════════════════════════════════════════════════════════════════════════
# Session scenarios
# ═══════════════════════════════════════════════════════════════════════════

SCENARIOS = [
    {
        "name": "small_5call",
        "desc": "20 symbols, 5 calls",
        "calls": [
            {"desc": "Initial context", "new": 20, "overlap": 0, "edges": 10},
            {"desc": "Follow-up (75%)", "new": 5, "overlap": 15, "edges": 8},
            {"desc": "Refinement (80%)", "new": 4, "overlap": 16, "edges": 7},
            {"desc": "Drill-down (90%)", "new": 2, "overlap": 18, "edges": 5},
            {"desc": "Final (95%)", "new": 1, "overlap": 19, "edges": 4},
        ],
    },
    {
        "name": "medium_5call",
        "desc": "100 symbols, 5 calls",
        "calls": [
            {"desc": "Initial context", "new": 100, "overlap": 0, "edges": 50},
            {"desc": "Follow-up (80%)", "new": 20, "overlap": 80, "edges": 40},
            {"desc": "Refinement (90%)", "new": 10, "overlap": 90, "edges": 30},
            {"desc": "Drill-down (94%)", "new": 6, "overlap": 94, "edges": 25},
            {"desc": "Final (96%)", "new": 4, "overlap": 96, "edges": 20},
        ],
    },
    {
        "name": "large_5call",
        "desc": "500 symbols, 5 calls",
        "calls": [
            {"desc": "Initial context", "new": 500, "overlap": 0, "edges": 200},
            {"desc": "Follow-up (80%)", "new": 100, "overlap": 400, "edges": 150},
            {"desc": "Refinement (90%)", "new": 50, "overlap": 450, "edges": 100},
            {"desc": "Drill-down (94%)", "new": 30, "overlap": 470, "edges": 80},
            {"desc": "Final (96%)", "new": 20, "overlap": 480, "edges": 60},
        ],
    },
    {
        "name": "large_10call",
        "desc": "500 symbols, 10 calls",
        "calls": [
            {"desc": "Initial context", "new": 500, "overlap": 0, "edges": 200},
            {"desc": "Call 2 (80%)", "new": 100, "overlap": 400, "edges": 150},
            {"desc": "Call 3 (85%)", "new": 75, "overlap": 425, "edges": 120},
            {"desc": "Call 4 (90%)", "new": 50, "overlap": 450, "edges": 100},
            {"desc": "Call 5 (92%)", "new": 40, "overlap": 460, "edges": 90},
            {"desc": "Call 6 (94%)", "new": 30, "overlap": 470, "edges": 80},
            {"desc": "Call 7 (95%)", "new": 25, "overlap": 475, "edges": 70},
            {"desc": "Call 8 (96%)", "new": 20, "overlap": 480, "edges": 65},
            {"desc": "Call 9 (97%)", "new": 15, "overlap": 485, "edges": 60},
            {"desc": "Call 10 (98%)", "new": 10, "overlap": 490, "edges": 55},
        ],
    },
]


def run_scenario(scenario: dict, tok, tok_name: str) -> dict:
    """Run a single scenario with a specific tokenizer. Returns results dict."""
    sess = Session()
    next_new = 0
    prev_payload = None

    call_results = []
    total_json = 0
    total_gcf = 0
    total_session = 0
    total_stacked = 0

    for call_spec in scenario["calls"]:
        # Build symbol indices for this call
        overlap_indices = list(range(call_spec["overlap"]))
        new_indices = list(range(
            call_spec["overlap"] + next_new,
            call_spec["overlap"] + next_new + call_spec["new"],
        ))
        all_indices = overlap_indices + new_indices
        next_new += call_spec["new"]

        payload = build_payload(all_indices, call_spec["edges"])

        # JSON (full retransmission)
        json_str = payload_to_json(payload)
        json_tokens = token_count(tok, json_str)

        # GCF (no session)
        gcf_str = encode(payload)
        gcf_tokens = token_count(tok, gcf_str)

        # GCF + session dedup
        session_str = encode_with_session(payload, sess)
        session_tokens = token_count(tok, session_str)

        # GCF + delta + session (stacked): delta for the diff, bare refs
        # for added symbols previously transmitted in earlier calls.
        stacked_tokens = session_tokens
        stacked_profile = "session"
        if prev_payload is not None:
            delta_payload = compute_delta(prev_payload, payload)
            if delta_payload is not None:
                stacked_str = encode_delta(delta_payload)
                st = token_count(tok, stacked_str)
                if st < session_tokens:
                    stacked_tokens = st
                    stacked_profile = "delta+session"

        total_json += json_tokens
        total_gcf += gcf_tokens
        total_session += session_tokens
        total_stacked += stacked_tokens

        call_results.append({
            "desc": call_spec["desc"],
            "new": call_spec["new"],
            "overlap": call_spec["overlap"],
            "edges": call_spec["edges"],
            "json": json_tokens,
            "gcf": gcf_tokens,
            "session": session_tokens,
            "stacked": stacked_tokens,
            "stacked_profile": stacked_profile,
        })

        prev_payload = payload

    return {
        "scenario": scenario["name"],
        "tokenizer": tok_name,
        "calls": call_results,
        "total_json": total_json,
        "total_gcf": total_gcf,
        "total_session": total_session,
        "total_stacked": total_stacked,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 100)
    print("SESSION DEDUP & DELTA ENCODING TOKEN SAVINGS BENCHMARK")
    print("=" * 100)
    print()
    print("Measures cumulative token savings across multi-call agent sessions.")
    print("Uses real tokenizers (same infrastructure as hf-tokenizer-analysis.py).")
    print("SDK: gcf-python (encode, encode_with_session, encode_delta)")
    print()

    # Load tokenizers
    print("Loading tokenizers...")
    tokenizers = {}
    for name, repo in PRIMARY_TOKENIZERS:
        tok = load_tokenizer(name, repo)
        if tok:
            tokenizers[name] = tok
            print(f"  {name}: loaded")
        else:
            print(f"  {name}: FAILED (skipping)")
    print()

    if not tokenizers:
        print("ERROR: No tokenizers loaded. Install deps: pip install tiktoken tokenizers huggingface_hub")
        sys.exit(1)

    # Use GPT-4o as primary for per-call detail output
    primary_name = "GPT-4o (OpenAI o200k)"
    if primary_name not in tokenizers:
        primary_name = next(iter(tokenizers))
    primary_tok = tokenizers[primary_name]

    all_results = []

    for scenario in SCENARIOS:
        print("-" * 100)
        print(f"Scenario: {scenario['name']} ({scenario['desc']})")
        print("-" * 100)
        print()

        # Detailed per-call output with primary tokenizer
        result = run_scenario(scenario, primary_tok, primary_name)
        all_results.append(result)

        print(f"{'Call':<5} {'Description':<24} {'JSON':>8} {'GCF':>8} {'Session':>8} {'Stacked':>8} {'Sess/JSON':>10} {'Stack/JSON':>11}")
        print("-" * 95)

        for i, cr in enumerate(result["calls"]):
            sess_vs_json = (1.0 - cr["session"] / cr["json"]) * 100 if cr["json"] > 0 else 0
            stack_vs_json = (1.0 - cr["stacked"] / cr["json"]) * 100 if cr["json"] > 0 else 0
            print(f"{i+1:<5} {cr['desc']:<24} {cr['json']:>8,} {cr['gcf']:>8,} {cr['session']:>8,} {cr['stacked']:>8,} {sess_vs_json:>9.1f}% {stack_vs_json:>10.1f}%")

        print()
        gcf_vs = (1.0 - result["total_gcf"] / result["total_json"]) * 100
        sess_vs = (1.0 - result["total_session"] / result["total_json"]) * 100
        stacked_vs = (1.0 - result["total_stacked"] / result["total_json"]) * 100
        dedup_contrib = (1.0 - result["total_session"] / result["total_gcf"]) * 100 if result["total_gcf"] > 0 else 0

        print(f"  Session totals ({len(scenario['calls'])} calls, {primary_name}):")
        print(f"    JSON:              {result['total_json']:>8,} tokens (full retransmission every call)")
        print(f"    GCF (no dedup):    {result['total_gcf']:>8,} tokens ({gcf_vs:.1f}% vs JSON, format alone)")
        print(f"    GCF (session):     {result['total_session']:>8,} tokens ({sess_vs:.1f}% vs JSON, format + dedup)")
        print(f"    GCF (stacked):     {result['total_stacked']:>8,} tokens ({stacked_vs:.1f}% vs JSON, delta + dedup stacked)")
        print(f"    Dedup contribution: {dedup_contrib:.1f}% additional savings over format alone")
        print()

    # ═══════════════════════════════════════════════════════════════════════
    # Cross-tokenizer validation (large_5call scenario)
    # ═══════════════════════════════════════════════════════════════════════

    print("=" * 100)
    print("CROSS-TOKENIZER VALIDATION (large_5call scenario)")
    print("=" * 100)
    print()
    print(f"{'Tokenizer':<28} {'JSON':>8} {'GCF':>8} {'Session':>8} {'Stacked':>8} {'GCF/JSON':>9} {'Sess/JSON':>10} {'Stack/JSON':>11}")
    print("-" * 100)

    large_scenario = SCENARIOS[2]  # large_5call
    cross_results = []

    for tok_name, tok in tokenizers.items():
        r = run_scenario(large_scenario, tok, tok_name)
        cross_results.append(r)
        gcf_pct = (1.0 - r["total_gcf"] / r["total_json"]) * 100
        sess_pct = (1.0 - r["total_session"] / r["total_json"]) * 100
        stack_pct = (1.0 - r["total_stacked"] / r["total_json"]) * 100
        print(f"{tok_name:<28} {r['total_json']:>8,} {r['total_gcf']:>8,} {r['total_session']:>8,} {r['total_stacked']:>8,} {gcf_pct:>8.1f}% {sess_pct:>9.1f}% {stack_pct:>10.1f}%")

    # Averages
    avg_gcf = sum((1.0 - r["total_gcf"] / r["total_json"]) * 100 for r in cross_results) / len(cross_results)
    avg_sess = sum((1.0 - r["total_session"] / r["total_json"]) * 100 for r in cross_results) / len(cross_results)
    avg_stack = sum((1.0 - r["total_stacked"] / r["total_json"]) * 100 for r in cross_results) / len(cross_results)
    print("-" * 100)
    print(f"{'AVERAGE':<28} {'':>8} {'':>8} {'':>8} {'':>8} {avg_gcf:>8.1f}% {avg_sess:>9.1f}% {avg_stack:>10.1f}%")

    # ═══════════════════════════════════════════════════════════════════════
    # Delta savings for topology changes
    # ═══════════════════════════════════════════════════════════════════════

    print()
    print("=" * 100)
    print("DELTA ENCODING SAVINGS: TOPOLOGY CHANGES (100-symbol base)")
    print("=" * 100)
    print()
    print("Simulates re-querying a network topology where devices change between queries.")
    print()

    base_indices = list(range(100))
    base_payload = build_payload(base_indices, 50)

    # Seed a session with the base
    sess_for_delta = Session()
    encode_with_session(base_payload, sess_for_delta)

    changes = [
        ("1 device change", 1, 1),
        ("2 device change", 2, 2),
        ("5 device change", 5, 5),
        ("10 device change", 10, 10),
        ("20 device change", 20, 20),
    ]

    print(f"{'Change':<24} {'Full':>8} {'Session':>8} {'Delta':>8} {'Stacked':>8} {'Stack/Full':>11}")
    print("-" * 75)

    for change_name, added, removed in changes:
        # Keep all but last `removed` symbols, add `added` new ones
        keep = base_indices[:100 - removed]
        new = list(range(1000, 1000 + added))  # high indices for new symbols
        modified_indices = keep + new
        modified = build_payload(modified_indices, len(modified_indices) // 2)

        full_str = encode(modified)
        full_tokens = token_count(primary_tok, full_str)

        # Session
        sess_copy = Session()
        encode_with_session(base_payload, sess_copy)
        session_str = encode_with_session(modified, sess_copy)
        session_tokens = token_count(primary_tok, session_str)

        # Delta (no session)
        delta_payload = compute_delta(base_payload, modified)
        delta_tokens = full_tokens
        if delta_payload is not None:
            delta_str = encode_delta(delta_payload)
            delta_tokens = token_count(primary_tok, delta_str)

        # Delta encoding
        stacked_tokens = full_tokens
        if delta_payload is not None:
            delta_str = encode_delta(delta_payload)
            stacked_tokens = token_count(primary_tok, delta_str)

        ratio = (1.0 - stacked_tokens / full_tokens) * 100 if full_tokens > 0 else 0
        print(f"{change_name:<24} {full_tokens:>8,} {session_tokens:>8,} {delta_tokens:>8,} {stacked_tokens:>8,} {ratio:>10.1f}%")

    # ═══════════════════════════════════════════════════════════════════════
    # Summary
    # ═══════════════════════════════════════════════════════════════════════

    print()
    print("=" * 100)
    print("SUMMARY")
    print("=" * 100)
    print()
    print("Token savings (5-call session, large scale, cross-tokenizer avg):")
    print(f"  GCF format alone:              {avg_gcf:.1f}% vs JSON")
    print(f"  GCF format + session dedup:    {avg_sess:.1f}% vs JSON")
    print(f"  GCF stacked (delta + dedup):   {avg_stack:.1f}% vs JSON")
    print(f"  Dedup contribution:            {avg_sess - avg_gcf:.1f}pp over format alone")
    print(f"  Delta contribution:            {avg_stack - avg_sess:.1f}pp over session alone")
    print()
    print("JSON has no equivalent mechanism. Every tool call retransmits the full payload.")
    print("GCF's session deduplication means subsequent calls in the same conversation")
    print("cost a fraction of the first call, while JSON costs the same every time.")

    # Save results
    results_dir = Path(__file__).parent / "results" / "session-savings"
    results_dir.mkdir(parents=True, exist_ok=True)
    results_file = results_dir / "session-savings-results.json"

    output = {
        "primary_tokenizer": primary_name,
        "tokenizer_count": len(tokenizers),
        "scenarios": [],
        "cross_tokenizer": [],
        "delta_changes": [],
    }

    for r in all_results:
        output["scenarios"].append({
            "name": r["scenario"],
            "tokenizer": r["tokenizer"],
            "total_json": r["total_json"],
            "total_gcf": r["total_gcf"],
            "total_session": r["total_session"],
            "total_stacked": r["total_stacked"],
            "gcf_vs_json_pct": round((1.0 - r["total_gcf"] / r["total_json"]) * 100, 1),
            "session_vs_json_pct": round((1.0 - r["total_session"] / r["total_json"]) * 100, 1),
            "stacked_vs_json_pct": round((1.0 - r["total_stacked"] / r["total_json"]) * 100, 1),
            "calls": r["calls"],
        })

    for r in cross_results:
        output["cross_tokenizer"].append({
            "tokenizer": r["tokenizer"],
            "total_json": r["total_json"],
            "total_gcf": r["total_gcf"],
            "total_session": r["total_session"],
            "total_stacked": r["total_stacked"],
            "gcf_vs_json_pct": round((1.0 - r["total_gcf"] / r["total_json"]) * 100, 1),
            "session_vs_json_pct": round((1.0 - r["total_session"] / r["total_json"]) * 100, 1),
            "stacked_vs_json_pct": round((1.0 - r["total_stacked"] / r["total_json"]) * 100, 1),
        })

    with open(results_file, "w") as f:
        json.dump(output, f, indent=2)
    print()
    print(f"Results saved to {results_file}")


if __name__ == "__main__":
    main()
