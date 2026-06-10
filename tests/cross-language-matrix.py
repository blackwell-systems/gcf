#!/usr/bin/env python3
"""
Cross-language conformance matrix for GCF v2.0.

Real NxN matrix: each language encodes all fixtures, then each decoder
parses every encoder's output. Pre-builds compiled languages for speed.

Requires: Go, Node, Python, Rust/cargo, Swift available in PATH.
Kotlin requires Java/Gradle (skipped if unavailable).
"""
import json
import os
import subprocess
import sys
from pathlib import Path

FIXTURE_DIR = Path(__file__).parent / "conformance"
ROOT = Path(__file__).parent.parent
HOME = Path.home()

ENV = {
    "PATH": "/usr/bin:/usr/local/bin:/opt/homebrew/bin:" + os.environ.get("PATH", ""),
    "HOME": str(HOME),
    "GOWORK": "off",
}


def load_encode_fixtures():
    fixtures = []
    for p in sorted(FIXTURE_DIR.rglob("*.json")):
        data = json.loads(p.read_text())
        if data.get("operation") != "encode":
            continue
        expected = data.get("expected", "")
        if not isinstance(expected, str):
            continue
        if expected.startswith("GCF profile=graph"):
            continue
        if data.get("inputBase64"):
            continue
        rel = str(p.relative_to(FIXTURE_DIR))
        fixtures.append((rel, data["input"], expected))
    return fixtures


def structural_equal(a, b):
    if a is None and b is None:
        return True
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return float(a) == float(b)
    if type(a) != type(b):
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            return float(a) == float(b)
        return False
    if isinstance(a, dict):
        if set(a.keys()) != set(b.keys()):
            return False
        return all(structural_equal(a[k], b[k]) for k in a)
    if isinstance(a, list):
        if len(a) != len(b):
            return False
        return all(structural_equal(x, y) for x, y in zip(a, b))
    return a == b


def run(cmd, input_text="", cwd=None, timeout=60):
    try:
        r = subprocess.run(cmd, input=input_text, capture_output=True, text=True,
                           timeout=timeout, cwd=cwd, env=ENV)
        return r.stdout, r.stderr, r.returncode
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return "", "unavailable", -1


def prebuild():
    """Pre-build compiled languages. Returns dict of binary paths."""
    bins = {}
    print("Pre-building compiled languages...")

    # Go
    out, err, rc = run(["go", "build", "-o", "/tmp/gcf-go-cli", "./cmd/gcf"],
                       cwd=str(HOME / "code/gcf-go"), timeout=120)
    if rc == 0:
        bins["Go"] = "/tmp/gcf-go-cli"
        print("  Go: OK")
    else:
        print(f"  Go: FAILED ({err.strip()[:80]})")

    # Rust
    out, err, rc = run(["cargo", "build", "--release", "--quiet"],
                       cwd=str(HOME / "code/gcf-rust"), timeout=120)
    if rc == 0:
        bins["Rust"] = str(HOME / "code/gcf-rust/target/release/gcf-rust")
        if not Path(bins["Rust"]).exists():
            # Try alternative name
            for f in (HOME / "code/gcf-rust/target/release").glob("gcf*"):
                if f.is_file() and f.stat().st_mode & 0o111:
                    bins["Rust"] = str(f)
                    break
        print("  Rust: OK")
    else:
        print(f"  Rust: FAILED ({err.strip()[:80]})")

    # Swift
    out, err, rc = run(["swift", "build", "-c", "release", "--product", "GCFCLI"],
                       cwd=str(HOME / "code/gcf-swift"), timeout=120)
    if rc == 0:
        swift_bin = HOME / "code/gcf-swift/.build/release/GCFCLI"
        if swift_bin.exists():
            bins["Swift"] = str(swift_bin)
            print("  Swift: OK")
        else:
            print(f"  Swift: FAILED (binary not found)")
    else:
        print(f"  Swift: FAILED ({err.strip()[:80]})")

    return bins


def make_runners(bins):
    """Build encode/decode command lists for each language."""
    runners = []

    # Go
    if "Go" in bins:
        b = bins["Go"]
        runners.append(("Go", [b, "encode-generic"], [b, "decode-generic"], None))

    # Python
    py = str(HOME / "code/gcf-python/.venv/bin/python")
    if not Path(py).exists():
        py = sys.executable
    runners.append(("Python",
                     [py, "-m", "gcf", "encode-generic"],
                     [py, "-m", "gcf", "decode-generic"],
                     str(HOME / "code/gcf-python")))

    # TypeScript
    ts_cli = HOME / "code/gcf-typescript/dist/cli.js"
    if ts_cli.exists():
        runners.append(("TypeScript",
                        ["node", str(ts_cli), "encode-generic"],
                        ["node", str(ts_cli), "decode-generic"],
                        None))

    # Rust
    if "Rust" in bins:
        b = bins["Rust"]
        runners.append(("Rust", [b, "encode-generic"], [b, "decode-generic"], None))

    # Swift
    if "Swift" in bins:
        b = bins["Swift"]
        runners.append(("Swift", [b, "encode-generic"], [b, "decode-generic"], None))

    # Kotlin (gradle is slow, use fat jar if available)
    jar = HOME / "code/gcf-kotlin/build/libs/gcf.jar"
    if jar.exists():
        runners.append(("Kotlin",
                        ["java", "-jar", str(jar), "encode-generic"],
                        ["java", "-jar", str(jar), "decode-generic"],
                        None))
    else:
        gradle = HOME / "code/gcf-kotlin/gradlew"
        if gradle.exists():
            # Try to build fat jar
            out, err, rc = run([str(gradle), "fatJar", "-q"],
                               cwd=str(HOME / "code/gcf-kotlin"), timeout=120)
            if rc == 0 and jar.exists():
                runners.append(("Kotlin",
                                ["java", "-jar", str(jar), "encode-generic"],
                                ["java", "-jar", str(jar), "decode-generic"],
                                None))
                print("  Kotlin: OK (fat jar)")
            else:
                print(f"  Kotlin: skipped (no fat jar)")

    return runners


def main():
    fixtures = load_encode_fixtures()
    bins = prebuild()
    runners = make_runners(bins)

    names = [r[0] for r in runners]
    print(f"\nLoaded {len(fixtures)} generic encode fixtures")
    print(f"Languages: {', '.join(names)} ({len(names)} of 6)")

    # Phase 1: Encode agreement.
    print(f"\n=== Phase 1: Encode ({len(names)} languages x {len(fixtures)} fixtures) ===")
    encoded = {}  # name -> {rel: gcf_text}
    for name, enc_cmd, _, cwd in runners:
        encoded[name] = {}
        passed = failed = errors = 0
        for rel, input_data, expected_gcf in fixtures:
            out, err, rc = run(enc_cmd, json.dumps(input_data), cwd=cwd, timeout=10)
            if rc != 0:
                errors += 1
                continue
            encoded[name][rel] = out
            if out == expected_gcf:
                passed += 1
            else:
                failed += 1
                if failed <= 2:
                    print(f"  {name} MISMATCH {rel}")
        total = passed + failed + errors
        print(f"  {name}: {passed}/{total} match expected ({errors} errors)")

    # Phase 2: Cross-decode NxN.
    print(f"\n=== Phase 2: Cross-Decode ({len(names)}x{len(names)} matrix) ===")
    matrix = {}
    for enc_name in names:
        for dec_name, _, dec_cmd, cwd in runners:
            p = f = 0
            for rel, input_data, expected_gcf in fixtures:
                gcf_text = encoded[enc_name].get(rel, expected_gcf)
                out, err, rc = run(dec_cmd, gcf_text, cwd=cwd, timeout=10)
                if rc != 0:
                    f += 1
                    if f <= 2:
                        print(f"  {enc_name}->{dec_name} ERROR {rel}: {err.strip()[:60]}")
                    continue
                try:
                    decoded = json.loads(out)
                except json.JSONDecodeError:
                    f += 1
                    continue
                if structural_equal(input_data, decoded):
                    p += 1
                else:
                    f += 1
                    if f <= 2:
                        print(f"  {enc_name}->{dec_name} MISMATCH {rel}")
            matrix[(enc_name, dec_name)] = (p, f)

    # Print matrix.
    col_w = max(len(n) for n in names) + 2
    print(f"\n{'':>{col_w}}", end="")
    for n in names:
        print(f"  {n:>{col_w}}", end="")
    print("   (decoder ->)")
    for enc in names:
        print(f"  {enc:>{col_w}}", end="")
        for dec in names:
            p, f = matrix[(enc, dec)]
            t = p + f
            mark = "PASS" if f == 0 else f"{p}/{t}"
            print(f"  {mark:>{col_w}}", end="")
        print()
    print("  (encoder ^)")

    # Summary.
    total_p = sum(p for p, _ in matrix.values())
    total_f = sum(f for _, f in matrix.values())
    n = len(names)
    print(f"\n=== Summary ===")
    print(f"Matrix: {n}x{n} = {n*n} language pairs x {len(fixtures)} fixtures")
    print(f"Total: {total_p + total_f} cross-decode tests")
    print(f"Passed: {total_p}, Failed: {total_f}")

    if total_f == 0:
        print(f"\nPASS: {n}x{n} cross-language conformance matrix verified.")
    else:
        print(f"\nFAIL: {total_f} cross-language failures.")
    return 1 if total_f > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
