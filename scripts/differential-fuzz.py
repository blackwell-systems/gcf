#!/usr/bin/env python3
"""Differential cross-SDK fuzz (testing.md layer 4a).

Generates adversarial random JSON and compares the SDKs in two layers, and the
split between them is load-bearing:

  * ENCODE phase - WIRE layer, BYTE-STRICT. Every SDK encodes the same input; the
    wire must be byte-identical. This is where a wrong wire SHAPE for a type is
    caught: after SPEC 2.3.2 a bare token is an int64 and a decimal/exponent token
    is a double, so bare-vs-exponent is a real int64-vs-double discriminator that
    MUST NOT be normalized away.
  * DECODE phase - VALUE layer, NUMERIC-AND-ORDER-AWARE. Every SDK decodes the
    agreed wire; the decoded VALUES must match, object key order included, with an
    integer-valued double and an integer of the same value treated as equal.

Why the split (and why not re-encode-and-byte-compare, which an earlier version of
this script did): comparing re-encoded canonical wire was immune to "a whole number
rendered as int vs float" ONLY while int and float shared one plain wire form (both
plain below 1e21). SPEC 2.3.2 moved the double plain/exponent threshold to 2^53, so
an integer-valued double now emits exponent (5e+18) while an int emits bare
(5000000000000000000) - distinct wire, deliberately. A decoded double that a
language's JSON stdlib renders plain (go/ts/swift render an integer-valued float64
as plain digits; rust/python/kotlin/dotnet render it in exponent form) re-imports
through GCF's bridge as an int64 and re-encodes bare, so the re-encoded wires
legitimately diverge for the SAME value. That is a JSON-interchange display
difference, not a GCF divergence: the wire codec round-trip is stable and
conformance-green (fixtures 020/024), and the ENCODE phase above already proves the
encoders agree exactly. The value-layer comparison restores the original
int-vs-float immunity where it belongs - at the decoded VALUE - and is kept
STRUCTURALLY separate from the byte-strict wire comparison (values_equal_ordered
operates on parsed structures; the encode phase uses raw-string set-equality) so a
future edit cannot loosen the wire check and blind the fuzz to a real shape
divergence.

This exercises the 6x6 encoder/decoder matrix on inputs the conformance fixtures
do not enumerate. A divergence names the offending SDK. Every divergence it finds
must be pinned with a conformance fixture before it is considered fixed (see
docs/guide/testing.md, "Every discovered bug becomes a fixture").

It also runs a MUTATION-DECODER layer: each agreed-on valid wire is perturbed into
a count-contradicting variant (a surplus or a dropped data row, header unchanged)
that every SDK MUST reject (SPEC 13, Count Validation). A silent accept of such a
wire is a decoder-robustness failure. Round-trip fuzz alone cannot catch this
class: it only ever feeds decoders the encoder's own well-formed output, so it is
blind to decoding malformed/foreign input. This layer surfaces silent
count-truncation (e.g. a declared [N] smaller than the actual number of rows).

Prerequisites: each SDK CLI must be built first. The script resolves each CLI
from an env var, falling back to the conventional built-binary location in the
sibling SDK checkout (this repo and the six gcf-<lang> repos side by side):

  gcf-go      GCF_GO_CLI      (default: build with: cd ../gcf-go && go build -o gcf ./cmd/gcf)
  gcf-rust    GCF_RUST_CLI    (default: ../gcf-rust/target/release/gcf; cargo build --release)
  gcf-python  GCF_PYTHON_CLI  (default: python3 -m gcf, run from ../gcf-python with PYTHONPATH=src)
  gcf-typescript GCF_TS_CLI   (default: node ../gcf-typescript/dist/cli.js; npm run build first)
  gcf-kotlin  GCF_KOTLIN_CLI  (default: ../gcf-kotlin/build/install/gcf/bin/gcf; ./gradlew installDist)
  gcf-swift   GCF_SWIFT_CLI   (default: ../gcf-swift/.build/release/GCFCLI; swift build -c release)

Env: DIFF_SEED (default 1), DIFF_N (default 300).
Exit code is nonzero if any divergence, round-trip failure, or CLI error occurs.
"""
import json, subprocess, random, sys, os, shutil, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))  # parent of the gcf repo (sibling layout)
SEED = int(os.environ.get("DIFF_SEED", "1"))
N = int(os.environ.get("DIFF_N", "300"))


def sdk_table():
    node = os.environ.get("NODE", shutil.which("node") or "node")
    py = os.environ.get("PYTHON", sys.executable or "python3")
    java_home = os.environ.get("JAVA_HOME")
    kenv = {"PATH": os.environ["PATH"]}
    if java_home:
        kenv["JAVA_HOME"] = java_home

    def go_argv(sub):
        cli = os.environ.get("GCF_GO_CLI", os.path.join(ROOT, "gcf-go", "gcf"))
        return (None, [cli, sub], None)

    def rust_argv(sub):
        cli = os.environ.get("GCF_RUST_CLI", os.path.join(ROOT, "gcf-rust", "target", "release", "gcf"))
        return (None, [cli, sub], None)

    def py_argv(sub):
        cli = os.environ.get("GCF_PYTHON_CLI")
        if cli:
            return (None, cli.split() + [sub], None)
        return (os.path.join(ROOT, "gcf-python"), [py, "-m", "gcf", sub],
                {"PYTHONPATH": "src", "PATH": os.environ["PATH"]})

    def ts_argv(sub):
        cli = os.environ.get("GCF_TS_CLI", os.path.join(ROOT, "gcf-typescript", "dist", "cli.js"))
        return (None, [node, cli, sub], None)

    def kt_argv(sub):
        cli = os.environ.get("GCF_KOTLIN_CLI", os.path.join(ROOT, "gcf-kotlin", "build", "install", "gcf", "bin", "gcf"))
        return (None, [cli, sub], kenv)

    def sw_argv(sub):
        cli = os.environ.get("GCF_SWIFT_CLI", os.path.join(ROOT, "gcf-swift", ".build", "release", "GCFCLI"))
        return (None, [cli, sub], None)

    def dotnet_argv(sub):
        cli = os.environ.get("GCF_DOTNET_CLI",
                             os.path.join(ROOT, "gcf-dotnet", "src", "BlackwellSystems.Gcf.Cli",
                                          "bin", "Release", "net8.0", "gcf.dll"))
        return (None, ["dotnet", cli, sub], None)

    return {
        "go": go_argv, "rust": rust_argv, "python": py_argv,
        "ts": ts_argv, "kotlin": kt_argv, "swift": sw_argv, "dotnet": dotnet_argv,
    }


def run(cwd, argv, env, stdin):
    p = subprocess.run(argv, cwd=cwd, env=env, input=stdin.encode(),
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return p.returncode, p.stdout.decode("utf-8", "replace"), p.stderr.decode("utf-8", "replace")


rng = random.Random(SEED)
# Adversarial alphabets: structural delimiters, empty/`>`/quote/comma keys, and
# grapheme-extending scalars (which cluster with an adjacent delimiter in
# grapheme-segmented languages) as both keys and values.
KEYS = ["", ">", ">>", "a>b", "a>>b", ">b", "a|b", "a,b", "a=b", "@x", "#x", "5",
        "true", "key", "a b", "café", "x\n", '"q"', "a\\b", "id", "name", "ௗid", "aௗb"]
SCALARS = [True, False, None, 0, -1, 42, 3.14, -0.0, 1e18, "5", "true", "-", "~", "^",
           "@x", "a|b", "a,b", "café", "x\n", "", "^{a}", "plain", "=v", " ૌx", "ௗv",
           # Non-ASCII digits: a Unicode-mode regex \d used to accept these in the
           # number grammar (SPEC 2.3, ASCII-only), diverging across SDKs and letting
           # a bare token decode as a number. All must stay strings, encoded bare.
           "1.٥", "+٥", "0٥", "1٥", ".٥", "1.５", "٠١",
           # Numeric-domain boundary seeds (SPEC 2.3.2), in random nested and tabular
           # positions. Two things are intentionally NOT seeded here, because they
           # exercise the JSON interchange, not a GCF codec property (both are pinned
           # in-process by the numbers/ and errors-v2/ conformance fixtures across all
           # seven SDKs):
           #   - Past-2^53 BARE integers: the reference JavaScript CLI decodes them
           #     under its default 'error' largeInt policy, so a bare big-int round-trip
           #     would need a per-SDK decode-mode flag.
           #   - Doubles in [2^63, 1e21) (e.g. 1e20): a language whose JSON stdlib
           #     renders an integer-valued float64 as plain digits (go/ts/swift) emits
           #     a bare integer ABOVE int64 max, so re-encoding that JSON correctly
           #     errors (out of domain). That is a JSON-interchange limit, not a codec
           #     bug (fixture 020 pins the double 1e20 -> 1e+20 in-process).
           # Seeded: safe-range int64 edges, and doubles that either stay below 2^63
           # (rendered plain, a valid int64 -> absorbed by the value-layer compare) or
           # sit above 1e21 (rendered exponent everywhere -> a clean double).
           9007199254740991, -9007199254740991,   # +/- (2^53 - 1), the max safe integer
           5e18, 9e18, -9e18, 1.5e300]             # doubles: below 2^63, and above 1e21


def gkey():    return rng.choice(KEYS)
def gscalar(): return rng.choice(SCALARS)


def gval(depth):
    if depth <= 0 or rng.random() < 0.35:
        return gscalar()
    r = rng.random()
    if r < 0.6:
        o = {}
        for _ in range(rng.randint(0, 4)):
            o[gkey()] = gval(depth - 1)
        return o
    if r < 0.85:
        return [gval(depth - 1) for _ in range(rng.randint(0, 3))]
    return gscalar()


def gmap_of_objects(depth):
    o = {}
    for _ in range(rng.randint(1, 5)):
        vo = {}
        for _ in range(rng.randint(0, 4)):
            vo[gkey()] = gval(depth - 1)
        o[gkey()] = vo
    return o


def treesitter_check(wires):
    """Parse every canonical wire the six SDKs agreed on through the tree-sitter
    grammar, asserting zero ERROR/MISSING nodes. This makes the grammar a seventh
    participant in the differential: whatever the SDKs emit, the grammar must parse.
    Returns the failure count, or None if the grammar repo/CLI is unavailable
    (skipped, not failed). Set GCF_SKIP_GRAMMAR=1 to skip explicitly."""
    if os.environ.get("GCF_SKIP_GRAMMAR"):
        return None
    ts_dir = os.environ.get("GCF_TREESITTER_DIR", os.path.join(ROOT, "tree-sitter-gcf"))
    if not os.path.isdir(ts_dir):
        print(f"grammar: {ts_dir} not found; skipping grammar interop (set GCF_TREESITTER_DIR)", flush=True)
        return None
    ts = os.environ.get("TREE_SITTER", shutil.which("tree-sitter"))
    base_argv = [ts, "parse", "-q"] if ts else ["npx", "tree-sitter", "parse", "-q"]
    fails = 0
    with tempfile.TemporaryDirectory() as td:
        paths = []
        for idx, w in enumerate(sorted(wires)):
            p = os.path.join(td, f"w{idx:05d}.gcf")
            with open(p, "w") as f:
                f.write(w)
            paths.append(p)
        # tree-sitter parse -q prints a summary line only for files with an error,
        # containing (ERROR ...) or (MISSING ...), and exits nonzero if any fail.
        p = subprocess.run(base_argv + paths, cwd=ts_dir,
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        out = p.stdout.decode("utf-8", "replace") + p.stderr.decode("utf-8", "replace")
        for line in out.splitlines():
            if "ERROR" in line or "MISSING" in line:
                fails += 1
                fname = line.split()[0] if line.split() else ""
                wire = ""
                try:
                    wire = open(fname).read() if os.path.exists(fname) else ""
                except Exception:
                    pass
                print(f"[grammar] PARSE FAIL: {line.strip()[:200]}\n  wire={json.dumps(wire)[:300]}", flush=True)
    print(f"grammar: {len(wires)} unique canonical wires parsed, {fails} grammar parse failures", flush=True)
    return fails


# Scalars safe to place unquoted in tabular rows, so the uniform generators below
# reliably yield the tabular/keyed shapes whose surplus is silently truncated.
SAFE_CELLS = [0, 1, 42, -3, 7, "x", "y", "ok", "val", "aa"]


def guniform_array():
    """An array of uniform objects -> tabular `## [N]{...}` wire (the shape whose
    surplus row is silently truncated by an unfixed decoder)."""
    keys = rng.sample(["a", "b", "c", "d", "id", "name"], rng.randint(2, 3))
    return [{k: rng.choice(SAFE_CELLS) for k in keys} for _ in range(rng.randint(2, 5))]


def gkeyed_uniform():
    """An object of uniform objects with distinct keys -> keyed `## [N:]{...}` wire."""
    keys = rng.sample(["a", "b", "c", "d"], rng.randint(2, 3))
    return {f"k{i}": {k: rng.choice(SAFE_CELLS) for k in keys} for i in range(rng.randint(2, 5))}


def gen_input():
    r = rng.random()
    if r < 0.15:
        return guniform_array()
    if r < 0.30:
        return gkeyed_uniform()
    if r < 0.55:
        return gmap_of_objects(4)
    if r < 0.78:
        return [gval(4) for _ in range(rng.randint(1, 4))]
    if r < 0.92:
        return gval(5)
    return gscalar()


def mutate_count(wire):
    """Perturb a valid tabular/keyed/array wire into count-contradicting variants
    the encoder never emits: a surplus data row and a dropped data row, header
    (and its declared [N]) unchanged. Every SDK MUST reject each variant (SPEC 13).
    Returns [] for wires without a counted section (e.g. inline arrays, whose count
    is validated on the header line and covered elsewhere)."""
    lines = wire.rstrip("\n").split("\n")
    hi = next((i for i, l in enumerate(lines) if l.startswith("## [")), -1)
    if hi < 0:
        return []
    di = hi + 1
    dj = di
    while dj < len(lines) and not lines[dj].startswith("## ") and not lines[dj].startswith("##! "):
        dj += 1
    if dj - di < 1:  # no separate data rows (e.g. inline array on the header line)
        return []
    # Only simple positional rows have a clean one-line-per-row count model. An
    # attachment line (".field"), the missing marker ("~"), or an expanded "@N" item
    # spans or shifts rows, so a naive line add/drop does not cleanly change the row
    # count and would false-positive. Skip those shapes (the uniform generators
    # produce attachment-free rows, so the count class stays reliably covered).
    for r in lines[di:dj]:
        if r.startswith(".") or r.startswith("@") or r.strip() == "~":
            return []
    # For the surplus row, a keyed map (## [N:]) needs a row with a FRESH key so the
    # mutation tests the count, not duplicate-key detection; a tabular array can
    # reuse a row verbatim. (An expanded `@N` array's dup row is caught by the ID
    # sequence check, which is a correct rejection, so it is harmless here.)
    keyed = ":]" in lines[hi].split("{", 1)[0]
    extra = lines[di]
    if keyed:
        bar = extra.find("|")
        extra = ("z" + extra) if bar < 0 else ("z" + extra[:bar] + extra[bar:])
    muts = []
    # surplus: add a row -> actual rows = N+1 vs declared N
    muts.append("\n".join(lines[:di] + [extra] + lines[di:]) + "\n")
    # deficit: drop the first data row -> actual rows = N-1 vs declared N
    muts.append("\n".join(lines[:di] + lines[di + 1:]) + "\n")
    return muts


def values_equal_ordered(a, b):
    """VALUE-layer equality for two DECODED JSON structures (the output of the
    decode-generic CLIs, parsed with json.loads). Deep, object-key-ORDER-sensitive,
    and NUMERIC-VALUE aware: an integer-valued double and an integer of the same
    value compare equal (5e18 == 5000000000000000000).

    This is deliberately NOT the wire comparison. It takes PARSED structures, never
    wire strings (a GCF wire is not valid JSON, so json.loads would reject it): that
    is the structural guard that keeps this normalization off the wire layer. The
    int64-vs-double wire-SHAPE discriminator (bare vs exponent) stays byte-strict in
    the ENCODE phase; here we only absorb the type-lossy JSON rendering of an
    integer-valued number, which is a display difference, not a GCF divergence.
    """
    # bool is an int subclass in Python; keep True/False distinct from 1/0.
    if isinstance(a, bool) or isinstance(b, bool):
        return a is b
    if isinstance(a, dict) and isinstance(b, dict):
        ia, ib = list(a.items()), list(b.items())
        if len(ia) != len(ib):
            return False
        return all(ka == kb and values_equal_ordered(va, vb)
                   for (ka, va), (kb, vb) in zip(ia, ib))
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(values_equal_ordered(x, y) for x, y in zip(a, b))
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return a == b  # numeric value equality across int/float rendering
    return a == b


def main():
    tbl = sdk_table()
    names = list(tbl.keys())
    print(f"SDKs: {names}  seed={SEED} N={N}", flush=True)
    enc_div = dec_div = rt_fail = errors = mut_accept = 0
    wires_seen = set()
    for i in range(N):
        src = json.dumps(gen_input())
        wires, errored = {}, False
        for s in names:
            cwd, argv, env = tbl[s]("encode-generic")
            rc, out, err = run(cwd, argv, env, src)
            if rc != 0:
                errors += 1; errored = True
                print(f"[{i}] ENCODE ERROR {s} rc={rc}: {err.strip()[:300]}\n  input={src[:300]}", flush=True)
            wires[s] = out
        if errored:
            continue
        if len(set(wires.values())) != 1:
            enc_div += 1
            groups = {}
            for s in names:
                groups.setdefault(wires[s], []).append(s)
            ordered = sorted(groups.items(), key=lambda kv: -len(kv[1]))
            print(f"[{i}] ENCODE DIVERGENCE majority={ordered[0][1]}  input={src[:300]}", flush=True)
            for out, ss in ordered[1:]:
                print(f"    MINORITY {ss}: {json.dumps(out)[:300]}", flush=True)
            continue
        wire = next(iter(wires.values()))
        wires_seen.add(wire)
        # DECODE phase - VALUE layer (see values_equal_ordered and the module
        # docstring). Decode the agreed wire through every SDK, parse each decoded
        # JSON, and compare the VALUES (order-sensitive, numeric-aware). This is kept
        # structurally separate from the byte-strict wire comparison above: it never
        # touches a wire string, only parsed structures.
        decoded, dec_errored = {}, False
        for s in names:
            cwd, denc, denv = tbl[s]("decode-generic")
            rc, out, err = run(cwd, denc, denv, wire)
            if rc != 0:
                errors += 1; dec_errored = True
                print(f"[{i}] DECODE ERROR {s} rc={rc}: {err.strip()[:300]}\n  wire={json.dumps(wire)[:300]}", flush=True)
                continue
            try:
                decoded[s] = json.loads(out)
            except Exception as e:
                errors += 1; dec_errored = True
                print(f"[{i}] DECODE OUTPUT NOT JSON {s}: {e}\n  out={out[:300]}", flush=True)
        if dec_errored or len(decoded) != len(names):
            continue
        ref = decoded[names[0]]
        minority = [s for s in names[1:] if not values_equal_ordered(decoded[s], ref)]
        if minority:
            dec_div += 1
            print(f"[{i}] DECODE DIVERGENCE (decoded values differ) minority={minority}\n"
                  f"  wire={json.dumps(wire)[:300]}\n  {names[0]}={json.dumps(ref)[:300]}", flush=True)
            for s in minority:
                print(f"    {s}={json.dumps(decoded[s])[:300]}", flush=True)
            continue
        # Round-trip IDEMPOTENCE at the VALUE layer, via the reference SDK: re-encode
        # the decoded value and decode it again; the twice-decoded value must equal
        # the once-decoded value. This is the round-trip check that survives both
        # confounds: it is immune to the JSON int-vs-double display difference (value
        # compare, not wire compare) AND to the encoder's deterministic key reordering
        # (tabular column promotion moves e.g. a null/attachment field after the
        # columns) - both sides undergo the same encode->decode, so a stable round-trip
        # is a value fixed point. It deliberately does NOT compare against the original
        # input: that order is not preserved through tabular encoding, and requiring it
        # would flag accepted, stable reordering. The codec's byte-strict wire fixed
        # point is pinned separately by the roundtrip-wire conformance fixtures.
        cwd_e, eenc, eenv = tbl[names[0]]("encode-generic")
        rc_e, wire2, err_e = run(cwd_e, eenc, eenv, json.dumps(ref))
        if rc_e != 0:
            errors += 1
            print(f"[{i}] REENCODE ERROR {names[0]} rc={rc_e}: {err_e.strip()[:300]}", flush=True)
        else:
            cwd_d, ddec, ddenv = tbl[names[0]]("decode-generic")
            rc_d, out2, err_d = run(cwd_d, ddec, ddenv, wire2)
            if rc_d != 0:
                errors += 1
                print(f"[{i}] REDECODE ERROR {names[0]} rc={rc_d}: {err_d.strip()[:300]}", flush=True)
            elif not values_equal_ordered(json.loads(out2), ref):
                rt_fail += 1
                print(f"[{i}] ROUNDTRIP NOT VALUE-IDEMPOTENT ({names[0]})\n  wire={json.dumps(wire)[:300]}\n"
                      f"  once={json.dumps(ref)[:300]}\n  twice={out2[:300]}", flush=True)
        # Mutation-decoder layer: a count-contradicting variant of the valid wire
        # MUST be rejected by every SDK (SPEC 13). A silent accept (rc==0) is a
        # decoder-robustness failure the round-trip layer above cannot see.
        for mw in mutate_count(wire):
            for s in names:
                cwd, denc, denv = tbl[s]("decode-generic")
                rc, _out, _err = run(cwd, denc, denv, mw)
                if rc == 0:
                    mut_accept += 1
                    print(f"[{i}] MUTATION SILENTLY ACCEPTED by {s}: count-contradicting wire not rejected\n  wire={json.dumps(mw)[:300]}", flush=True)
    grammar_fail = treesitter_check(wires_seen)
    gf = grammar_fail or 0
    print(f"\nDONE N={N} seed={SEED}: encode_divergence={enc_div} decode_divergence={dec_div} "
          f"roundtrip_fail={rt_fail} mutation_silent_accept={mut_accept} errors={errors} "
          f"grammar_parse_fail={'skipped' if grammar_fail is None else gf}", flush=True)
    sys.exit(1 if (enc_div or dec_div or rt_fail or mut_accept or errors or gf) else 0)


if __name__ == "__main__":
    main()
