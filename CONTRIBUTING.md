# Contributing to gcf

Thanks for your interest. A few things keep the project healthy and its licensing clean.

## License and CLA

gcf is licensed under **Apache-2.0** (see `LICENSE` and `NOTICE`). By contributing, you agree to the **Contributor License Agreement** in [`CLA.md`](CLA.md). The CLA grants the maintainer the rights needed to keep the project relicensable (including future commercial terms); without it, outside contributions can block relicensing. Sign it on your first pull request (CLA-assistant check) or as described in `CLA.md`.

## IP hygiene (please read)

- **Contribute only your own work**, or work you have the right to submit.
- **No copyleft or license-incompatible dependencies.** Do not add GPL/AGPL/SSPL dependencies or copy code under terms incompatible with Apache-2.0. New dependencies should be permissive (Apache-2.0, MIT, BSD, ISC); flag anything unusual in the PR.
- **No employer-owned code** unless you have permission or your employer has signed a corporate CLA.
- Clearly identify any third-party material you include and its license.

## Third-party implementations

The implementations list is limited to the SDKs maintained in this repository. The project does not list, endorse, or bless community or third-party implementations, regardless of quality or conformance results. Every listed SDK is fuzzed, conformance-gated, and versioned in lockstep here; the project cannot resource that guarantee for code it does not maintain, and listing an unverified implementation would undercut what the list signals.

Independent implementations are permitted under the Apache-2.0 license and may describe themselves as GCF-compatible, provided they do so under their own name and state they are not affiliated with or endorsed by Blackwell Systems. Requests to add a third-party implementation to the list will be declined.

## Development

- Match the surrounding code style and run the project's formatter/linter.
- Add or update tests; the test suite should pass.
- Keep changes focused; describe the why in the PR.

## Reporting issues

Open a GitHub issue with a minimal reproduction where possible.
