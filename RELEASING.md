# Releasing GCF (spec + fleet)

The runbook for a coordinated change across the spec and all seven SDKs. The *change
order* is the law in [`docs/guide/testing.md`](docs/guide/testing.md) ("Spec-first is
the rule"); this document is the *execution* companion: the per-SDK gotchas and the
publish choreography that otherwise get re-derived every release.

Applies to any change that alters the wire or the value model (grammar, canonical form,
numeric domain, a new construct, a losslessness fix). A single-SDK doc/typo fix does not
need this.

## The invariant

1. **Spec first.** Nothing is "correct" until `SPEC.md` says so. A behavior implemented in
   one SDK first defines correctness by that implementation; the others drift toward it.
2. **Fixture-pinned.** Every behavior (and every bug) is pinned by a conformance fixture
   that fails **red** against the unfixed code and passes **green** after, in every SDK. A
   fix without a fixture is incomplete.
3. **Fleet-coordinated.** All seven SDKs move together; the wire stays byte-identical.
4. **Fail loud, never silently change value or type.** The property every release protects.

## Phases

### 1. Spec (`gcf` repo)
- Edit `SPEC.md`: the normative section, bump `**Version:**`, add the `### 19.3` history
  entry, update the status line. Add a matching `CHANGELOG.md` entry.
- **Tone: neutral and factual** ("specifies X so Y"), never self-damning ("defect",
  "silently lost", "impossible"). Say **normative** vs **clarification** explicitly, and
  gate a normative behavior change at the version boundary (an upgraded decoder erroring on
  a legacy payload is correct-at-a-known-line, not a regression).
- Versioning: errata/behavior-pin = patch; additive construct = minor.

### 2. Conformance fixtures (`gcf/tests/conformance/`)
- Write the fixtures **first** and confirm they fail (red) against unfixed SDKs, then pass
  (green) after the fix. Runners **fail open** if a fixture category is missing, so a fixture
  that is never loaded looks green, verify it actually runs and actually fails first.
- Cover **both directions** (encode + decode + round-trip) and the exact **boundary values**,
  not the interior (off-by-ones live at edges; e.g. signed-min `-2^63` vs `-2^63-1`).
- **Mode/representation split:** where an SDK has an opt-in output mode, default-mode fixtures
  assert **wire idempotence** (`encode(decode(w)) == w`); opt-in-mode fixtures assert **value
  preservation** (the data survives), *not* wire-equality, or the suite red-flags correct
  opt-in behavior.
- Regenerate the golden with the **Go reference** once step 3 lands.

### 3. Go reference SDK (`gcf-go`)
- Go is the oracle. Implement here first, generate/verify the fixture golden from it.
- Test with cache busting: `go test -run Conformance -count=1 ./...` (Go caches green results).

### 4. Fan out to the other five SDKs
Implement the same behavior; each must pass the shared fixtures. Per-SDK gotchas:

| SDK | test (from repo root) | gotchas |
|-----|-----------------------|---------|
| `gcf-rust` | `cargo test --test conformance_v2 --test roundtrip_v2` | Do **not** run blanket `cargo test` (the `*_1b` stress tests take 90+ min). **`cargo fmt` gate**: run `cargo fmt` before tagging, this is the recurring publish failure, and rust is the only SDK with a fmt CI gate. |
| `gcf-python` | `PYTHONPATH=src python -m pytest tests/test_conformance*.py` | Needs `PYTHONPATH=src`. `__version__` in `__init__.py` drifts; `pyproject.toml` is authoritative. |
| `gcf-typescript` | `npm run build && npx vitest run` | `command node` / `command npm` to bypass the nvm shim. `number` is IEEE-754 double (2^53 safe range) — relevant to any numeric behavior. |
| `gcf-kotlin` | `JAVA_HOME=/opt/homebrew/opt/openjdk@21/... ./gradlew test --rerun-tasks` | Without `--rerun-tasks` gradle returns **stale green**. Needs `JAVA_HOME`. |
| `gcf-swift` | `swift test` | The XCTest summary is separate from the swift-testing "0 tests" line; read both. |
| `gcf-dotnet` | `dotnet test -c Release` | See NuGet publish note below (`user:` = admin, not org). |

- **conformance-green != suite-green.** Also run each SDK's hand-written unit tests (they
  hardcode encoder output and go stale). Use targeted gates, not blanket runs.
- Fixtures are read from the sibling `../gcf` checkout; make sure it's the branch under test.

### 5. Differential fuzz (`gcf/scripts/differential-fuzz.py`)
- Add the new behavior's inputs (e.g. boundary values) to the corpus, then run across all
  seven CLIs: `DIFF_N=… DIFF_SEED=… python scripts/differential-fuzz.py`.
- Requires each SDK CLI built (go build, cargo build --release, npm run build, gradlew
  installDist, swift build -c release, dotnet build). Every discovered divergence becomes a
  fixture (back to step 2).

### 6. Versioning & changelogs
- Bump each changed SDK; leave unchanged SDKs alone (docs-only if the spec version is cited).
- **Pin the GCF dep EXACT** in any consumer (`"2.5.3"`, never `^2.5.3`); update the lockfile
  (`uv lock`, `package-lock.json`, etc.) to match.
- One neutral CHANGELOG entry per changed SDK.

### 7. Coordinated release
Build everything locally and get every SDK green **before** anything is pushed.

1. Regenerate the coverage ratchet: `node scripts/coverage-matrix.mjs` (CI fails if
   `COVERAGE.md` is stale — it triggers on `SPEC.md`/`tests/conformance/**` pushes).
2. Push the **SDK code commits** to their mains first (no tags = **no publish**) so their CI
   is consistent with the new fixtures.
3. Push `gcf` main (spec + fixtures + fuzz corpus). If a local `eval/` WIP blocks the rebase:
   `git stash push --include-untracked` → `git pull --rebase` → push → `git stash pop`. Rebase
   past the download-stats bot commit.
4. Tag `gcf` `vX.Y.Z` and create the GitHub release (neutral notes; no em dashes; no
   self-disclosure).
5. Push each SDK's `vX.Y.Z` tag — **this is the publish trigger** (PyPI, crates.io, npm,
   NuGet, JitPack; Swift/SPM is the tag itself). Watch each workflow.
6. Verify each registry actually indexes the new version, then set proper GitHub release notes
   per SDK.

**NuGet (`gcf-dotnet`) gotcha:** the publish workflow's `NuGet/login` `user:` must be the
**admin account (`dayna-blackwell`)**, not the `blackwell-systems` org, or the token exchange
fails with HTTP 400 ("fetching tokens directly for organizations is not supported").

### 8. Post-release
- Update the docs-site SDK version numbers only (LanguageStrip chips, `implementations.md`
  table + install pins, `whats-new.md` ecosystem line, `faq.md`, install snippets,
  `whitepaper.md`). VitePress build:
  `command node node_modules/vitepress/bin/vitepress.js build`.
- `scripts/download-stats.sh` if a new SDK/registry was added.
- Bump `gcf-proxy` if it depends on the changed `gcf-go`.

## Gates (do not skip)
- **Review before push.** Show the full change/PR/release-notes before pushing or publishing.
- **Publishing is spend + outbound.** Build and verify locally freely; do the actual
  registry publish (tag pushes) only on an explicit go, and one coordinated batch, not ad hoc.
- **Identity.** Commits to `blackwell-systems` fork repos use `dayna@blackwell-systems.com`
  (match `git log -1 --format=%ae` on the branch).
- **Environment.** `command node`/`command npm` (nvm shim), `github-blackwell` SSH alias for
  blackwell-systems repos, `JAVA_HOME` for gradle.
