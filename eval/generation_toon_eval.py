"""TOON generation eval: can LLMs produce valid TOON at scale?"""
import subprocess, json, time, os

PACKAGES = [
    "github.com/org/repo/api", "github.com/org/repo/auth",
    "github.com/org/repo/store", "github.com/org/repo/service",
    "github.com/org/repo/middleware", "github.com/org/repo/handler",
    "github.com/org/repo/model", "github.com/org/repo/config",
    "github.com/org/repo/cache", "github.com/org/repo/worker",
]
NAMES = [
    "Handle", "Process", "Validate", "Create", "Update", "Delete",
    "Get", "Set", "Check", "Build", "Parse", "Format", "Encode",
    "Decode", "Transform", "Load", "Save", "Init", "Close", "Open",
    "Read", "Write", "Flush", "Reset", "Register", "Dispatch",
    "Execute", "Invoke", "Resolve", "Filter", "Sort", "Merge",
]
SUFFIXES = [
    "Request", "Response", "Config", "Handler", "Manager", "Service",
    "Store", "Client", "Factory", "Builder", "Provider", "Resolver",
]
KINDS = ["function", "type", "method", "interface"]
PROVS = ["lsp_resolved", "ast_inferred", "structural"]
EDGE_TYPES = ["calls", "imports", "implements", "references"]

# Same primer style as TOON's own LLM guide
FORMAT_PRIMER = """TOON format example (tool response with symbols and edges):
tool: context_for_task
tokenBudget: 5000
tokensUsed: 100
symbols[2]{qualifiedName,kind,score,provenance,distance}:
  pkg.Foo,function,0.9,lsp_resolved,0
  pkg.Bar,type,0.5,ast_inferred,1
edges[1]{source,target,edgeType}:
  pkg.Foo,pkg.Bar,calls"""

def generate_prompt(n_symbols, n_edges):
    symbols = []
    for i in range(n_symbols):
        pkg = PACKAGES[i % len(PACKAGES)]
        name = NAMES[i % len(NAMES)] + SUFFIXES[i % len(SUFFIXES)]
        kind = KINDS[i % len(KINDS)]
        score = round(0.95 - i * (0.85 / max(n_symbols - 1, 1)), 2)
        prov = PROVS[i % len(PROVS)]
        dist = 0 if i < n_symbols // 3 else (1 if i < 2 * n_symbols // 3 else 2)
        symbols.append(f"- {pkg}.{name} ({kind}, score {score}, {prov}, distance {dist})")
    edges = []
    for i in range(n_edges):
        src_idx = (i * 3 + 1) % n_symbols
        tgt_idx = (i * 3) % n_symbols
        src_pkg = PACKAGES[src_idx % len(PACKAGES)]
        src_name = NAMES[src_idx % len(NAMES)] + SUFFIXES[src_idx % len(SUFFIXES)]
        tgt_pkg = PACKAGES[tgt_idx % len(PACKAGES)]
        tgt_name = NAMES[tgt_idx % len(NAMES)] + SUFFIXES[tgt_idx % len(SUFFIXES)]
        et = EDGE_TYPES[i % len(EDGE_TYPES)]
        edges.append(f"- {src_pkg}.{src_name} {et} {tgt_pkg}.{tgt_name}")
    return f"""Output ONLY raw TOON text. No explanation, no code fences. First line must be a key: value pair.

{FORMAT_PRIMER}

Now encode this data:
Tool: context_for_task, Budget: 50000, Tokens: {n_symbols * 35}
Symbols ({n_symbols}):
{chr(10).join(symbols)}
Edges ({n_edges}):
{chr(10).join(edges)}

Use TOON tabular format: symbols[N]{{fields}}: with comma-separated rows, edges[N]{{fields}}: with comma-separated rows. 2-space indent for rows."""

def strip_preamble(output):
    lines = output.strip().split("\n")
    for i, line in enumerate(lines):
        s = line.strip()
        if s.startswith("```"):
            continue
        if ":" in s and not s.startswith("#") and not s.startswith("*") and not s.startswith("-"):
            return "\n".join(l for l in lines[i:] if not l.strip().startswith("```")).strip()
    return output.strip()

def call_claude(prompt):
    result = subprocess.run(["claude", "-p", prompt], capture_output=True, text=True, timeout=300)
    return strip_preamble(result.stdout)

def validate_toon(toon_text):
    """Validate by decoding with the real @toon-format/toon library."""
    with open("/tmp/eval-toon.txt", "w") as f:
        f.write(toon_text)
    try:
        result = subprocess.run(
            ["node", "--input-type=module", "-e", """
import { decode } from '@toon-format/toon';
import { readFileSync } from 'fs';
const input = readFileSync('/tmp/eval-toon.txt', 'utf-8');
try {
    const parsed = decode(input);
    console.log(JSON.stringify(parsed));
} catch(e) {
    console.error('DECODE_ERROR: ' + e.message);
    process.exit(1);
}
"""],
            capture_output=True, text=True, timeout=15,
            cwd="/Users/dayna.blackwell/code/gcf/docs")
        if result.returncode != 0:
            err = result.stderr.strip()
            if "DECODE_ERROR:" in err:
                return False, err.split("DECODE_ERROR:")[1].strip()[:120], ""
            return False, err[:120], ""
        return True, "", result.stdout
    except Exception as e:
        return False, str(e)[:120], ""

TESTS = [(5, 3), (10, 6), (20, 12), (50, 25), (100, 50)]

print("=" * 70)
print("  TOON Generation Eval (same data, same model, same prompt style)")
print("=" * 70)
print()

results = []
for n_sym, n_edge in TESTS:
    print(f"Testing {n_sym} symbols, {n_edge} edges...", end=" ", flush=True)
    start = time.time()
    try:
        toon_output = call_claude(generate_prompt(n_sym, n_edge))
    except subprocess.TimeoutExpired:
        print("TIMEOUT"); results.append((n_sym, n_edge, False, 0, 0, 0)); continue
    elapsed = time.time() - start
    valid, err, json_out = validate_toon(toon_output)
    toon_bytes = len(toon_output.encode())
    if valid:
        json_bytes = len(json_out.encode())
        savings = 100 * (1 - toon_bytes / json_bytes)
        print(f"VALID  ({toon_bytes}B TOON, {json_bytes}B JSON, {savings:.0f}%, {elapsed:.1f}s)")
        results.append((n_sym, n_edge, True, toon_bytes, json_bytes, savings))
    else:
        print(f"INVALID  {err}  ({elapsed:.1f}s)")
        results.append((n_sym, n_edge, False, toon_bytes, 0, 0))

print()
print("=" * 70)
print(f"  {'Symbols':>8} {'Edges':>6} {'Valid':>6} {'TOON':>8} {'JSON':>8} {'Savings':>8}")
print("-" * 70)
for n_sym, n_edge, valid, t_b, j_b, sav in results:
    print(f"  {n_sym:>8} {n_edge:>6} {'YES' if valid else 'NO':>6} {t_b:>8} {j_b:>8} {sav:>7.0f}%")
print("=" * 70)
vc = sum(1 for r in results if r[2])
print(f"\n  {vc}/{len(results)} valid.")
