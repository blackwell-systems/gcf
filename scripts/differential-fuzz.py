#!/usr/bin/env python3
"""Differential cross-SDK fuzz (testing.md layer 4a).

Generates adversarial random JSON, encodes each input through every SDK's
`encode-generic` CLI, and requires the wire to be BYTE-IDENTICAL across all six.
It then decodes that wire through every SDK and RE-ENCODES the decoded value
through the same SDK; the re-encoded canonical wire must be identical across all
SDKs and equal to the original wire.

Comparing re-encoded canonical wire (not each language's native JSON object) is
immune to representation-only differences that are not GCF divergences: whole
numbers rendered as int vs float, or JSON key order in a language's own model.
A genuine value or ordering divergence still surfaces, because encode() maps
distinct values (and distinct field orders) to distinct wire.

This exercises the 6x6 encoder/decoder matrix on inputs the conformance fixtures
do not enumerate. A divergence names the offending SDK. Every divergence it finds
must be pinned with a conformance fixture before it is considered fixed (see
docs/guide/testing.md, "Every discovered bug becomes a fixture").

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
import json, subprocess, random, sys, os, shutil

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

    return {
        "go": go_argv, "rust": rust_argv, "python": py_argv,
        "ts": ts_argv, "kotlin": kt_argv, "swift": sw_argv,
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
           "@x", "a|b", "a,b", "café", "x\n", "", "^{a}", "plain", "=v", " ૌx", "ௗv"]


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


def gen_input():
    r = rng.random()
    if r < 0.45:
        return gmap_of_objects(4)
    if r < 0.75:
        return [gval(4) for _ in range(rng.randint(1, 4))]
    if r < 0.92:
        return gval(5)
    return gscalar()


def main():
    tbl = sdk_table()
    names = list(tbl.keys())
    print(f"SDKs: {names}  seed={SEED} N={N}", flush=True)
    enc_div = dec_div = rt_fail = errors = 0
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
        rencs = {}
        for s in names:
            cwd, denc, denv = tbl[s]("decode-generic")
            rc, out, err = run(cwd, denc, denv, wire)
            if rc != 0:
                errors += 1
                print(f"[{i}] DECODE ERROR {s} rc={rc}: {err.strip()[:300]}\n  wire={json.dumps(wire)[:300]}", flush=True)
                rencs[s] = ("DECODE_FAIL",); continue
            cwd2, eenc, eenv = tbl[s]("encode-generic")
            rc2, out2, _ = run(cwd2, eenc, eenv, out)
            rencs[s] = out2 if rc2 == 0 else ("REENC_FAIL",)
        groups = {}
        for s in names:
            groups.setdefault(rencs[s], []).append(s)
        if len(groups) != 1:
            dec_div += 1
            ordered = sorted(groups.items(), key=lambda kv: -len(kv[1]))
            print(f"[{i}] DECODE DIVERGENCE majority={ordered[0][1]}\n  wire={json.dumps(wire)[:300]}", flush=True)
            for out, ss in ordered[1:]:
                print(f"    MIN {ss}: {json.dumps(out)[:300]}", flush=True)
            continue
        if next(iter(groups)) != wire:
            rt_fail += 1
            print(f"[{i}] ROUNDTRIP MISMATCH\n  wire={json.dumps(wire)[:300]}\n  renc={json.dumps(next(iter(groups)))[:300]}", flush=True)
    print(f"\nDONE N={N} seed={SEED}: encode_divergence={enc_div} decode_divergence={dec_div} "
          f"roundtrip_fail={rt_fail} errors={errors}", flush=True)
    sys.exit(1 if (enc_div or dec_div or rt_fail or errors) else 0)


if __name__ == "__main__":
    main()
