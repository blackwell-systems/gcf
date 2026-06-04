"""GCF generation eval v4: explicit edge direction in example."""
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

FORMAT_PRIMER = """GCF format example (2 symbols, 1 edge where Foo calls Bar):
GCF tool=example budget=5000 tokens=100 symbols=2
## targets
@0 fn pkg.Foo 0.90 lsp_resolved
## related
@1 type pkg.Bar 0.50 ast_inferred
## edges
@1<@0 calls

CRITICAL: edges use < not >. @target<@source means source->target. If A calls B, write @B<@A calls."""

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
    return f"""Output ONLY raw GCF text. No explanation, no code fences. First line must start with "GCF tool=".

{FORMAT_PRIMER}

Now encode this data:
Tool: context_for_task, Budget: 50000, Tokens: {n_symbols * 35}
Symbols ({n_symbols}):
{chr(10).join(symbols)}
Edges ({n_edges}):
{chr(10).join(edges)}

Kind abbreviations: function=fn, type=type, method=method, interface=iface. Distance 0=## targets, 1=## related, 2=## extended."""

def strip_to_gcf(output):
    for i, line in enumerate(output.strip().split("\n")):
        if line.strip().startswith("GCF "):
            return "\n".join(output.strip().split("\n")[i:]).strip()
    return output.strip()

def call_claude(prompt):
    result = subprocess.run(["claude", "-p", prompt], capture_output=True, text=True, timeout=300)
    return strip_to_gcf(result.stdout)

def validate_gcf(gcf_text):
    with open("/tmp/eval-gcf.txt", "w") as f:
        f.write(gcf_text)
    try:
        result = subprocess.run(
            ["go", "run", "./cmd/gcf", "decode", "/tmp/eval-gcf.txt"],
            capture_output=True, text=True, timeout=15,
            cwd="/Users/dayna.blackwell/code/gcf-go",
            env={**os.environ, "GOWORK": "off"})
        if result.returncode != 0:
            return False, result.stderr.strip()[:120], ""
        return True, "", result.stdout
    except Exception as e:
        return False, str(e), ""

TESTS = [(5, 3), (10, 6), (20, 12), (50, 25), (100, 50)]

print("=" * 70)
print("  GCF Generation Eval v4 (explicit edge direction)")
print("=" * 70)
print()

results = []
for n_sym, n_edge in TESTS:
    print(f"Testing {n_sym} symbols, {n_edge} edges...", end=" ", flush=True)
    start = time.time()
    try:
        gcf_output = call_claude(generate_prompt(n_sym, n_edge))
    except subprocess.TimeoutExpired:
        print("TIMEOUT"); results.append((n_sym, n_edge, False, 0, 0, 0)); continue
    elapsed = time.time() - start
    valid, err, json_out = validate_gcf(gcf_output)
    gcf_bytes = len(gcf_output.encode())
    if valid:
        json_bytes = len(json_out.encode())
        savings = 100 * (1 - gcf_bytes / json_bytes)
        parsed = json.loads(json_out)
        print(f"VALID  {len(parsed['symbols'])} sym, {len(parsed['edges'])} edges  ({gcf_bytes}B GCF, {json_bytes}B JSON, {savings:.0f}%, {elapsed:.1f}s)")
        results.append((n_sym, n_edge, True, gcf_bytes, json_bytes, savings))
    else:
        print(f"INVALID  {err}  ({elapsed:.1f}s)")
        results.append((n_sym, n_edge, False, gcf_bytes, 0, 0))

print()
print("=" * 70)
print(f"  {'Symbols':>8} {'Edges':>6} {'Valid':>6} {'GCF':>8} {'JSON':>8} {'Savings':>8}")
print("-" * 70)
for n_sym, n_edge, valid, gcf_b, json_b, sav in results:
    print(f"  {n_sym:>8} {n_edge:>6} {'YES' if valid else 'NO':>6} {gcf_b:>8} {json_b:>8} {sav:>7.0f}%")
print("=" * 70)
vc = sum(1 for r in results if r[2])
print(f"\n  {vc}/{len(results)} valid.{' LLMs CAN produce GCF at scale.' if vc == len(results) else ''}")
