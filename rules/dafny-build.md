# Dafny build

Goal: optionally compile the verified Dafny spec to a target language so
the `implement` phase can consume real artefacts instead of (or in
addition to) a hand translation.

This phase is **optional**. The cost of doing it is small; the cost of
skipping it is that the implementation has to reproduce by hand whatever
Dafny would have generated for you.

## When to run

- The verified Dafny module describes pure logic / data transformations
  / a state machine — i.e. the kind of code that compiles cleanly.
- The target runtime is already present in the codebase (matching host
  language).
- There is value in keeping the emitted code in the repository as a
  living reference that re-runs with every `rd-flow dafny build`.

## When to skip

- The implementation needs heavy I/O / framework integration and the
  Dafny module is intentionally narrow (just the invariants). Skipping
  is fine; record the reason in `refinement.md`.
- The target language has no Dafny backend you trust (e.g. the C++ or
  Rust backends in very early Dafny releases).

## Rules

1. Choose **one** primary target per spec. Multi-target builds are
   technically possible but make the `mapping.md` audit ambiguous —
   prefer a single canonical output that the implementation consumes.
2. The emitted files live under `.formal/specs/<name>/dafny/out/<target>/`
   and are owned by `rd-flow`. Do not hand-edit them; if a tweak is
   needed, change the Dafny spec or write the tweak in a wrapper file
   in your codebase.
3. Every consumption point in your codebase must appear in
   `implementation/mapping.md` with a row pointing back at the emitted
   artefact path. Otherwise `validate` cannot trace it.
4. Re-build before every `validate` if the Dafny spec has changed since
   the last build. The build report carries the timestamp.

## Exit condition

`build-report.md` shows `status: built`, the `out/<target>/` directory
contains at least one file, and `mapping.md` has at least one row
referencing it.
