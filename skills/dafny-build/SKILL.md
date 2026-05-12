---
name: dafny-build
description: Compile a verified Dafny spec to a target language (cs, java, go, js, py, cpp, rs) and capture the emitted artefacts. Use after `dafny-prove` passes and before `implement` if you intend to consume the generated code as a reference or a library.
---

# dafny-build

## When to invoke

- Current phase is `dafny-build`.
- `manifest.checks.dafny.status` is `verified`.
- The team has decided to take the Dafny-emitted code (in full or in
  part) into the implementation rather than hand-translating everything.

## Steps

1. Read `.formal/settings/rules/dafny-build.md`.
2. Decide a target with the user (`cs | java | go | js | py | cpp | rs`).
   - Default to the language already used in the surrounding codebase.
   - Confirm the target's host runtime is installed (e.g. `python3` for
     `py`, `dotnet` for `cs`, `go` for `go`).
3. Run:
   ```
   rd-flow dafny build <name> --target <target>
   ```
4. Inspect `dafny/build-report.md`:
   - `built` → tell the user where the artefacts landed
     (`.formal/specs/<name>/dafny/out/<target>/`) and advance to
     `implement`.
   - `skipped` (no dafny on PATH and no local install) → instruct the
     user to run `rd-flow tools install --tool dafny` first.
   - `failed` → surface stderr; common causes are missing target host
     toolchains (e.g. `go`, `dotnet`) or Dafny features that are not
     supported by the chosen backend.
5. If `built`, append the output path(s) to
   `implementation/mapping.md` so the `validate` phase can trace from
   spec → emitted code → final code.

## Skipping this phase

If the team prefers a fully hand-written implementation, run
`rd-flow advance <name> implement` instead. Record the decision in a
new `blockers` entry on `manifest.yaml` or a one-line note in
`refinement.md` so future readers know why.

## Handoff

On `built`, invoke `implement`.
