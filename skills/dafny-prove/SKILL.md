---
name: dafny-prove
description: Run Dafny verification on an rd-flow spec and iterate until proofs discharge. Use after `dafny-refine`.
---

# dafny-prove

## When to invoke

- Current phase is `dafny-prove` or `dafny-refine` has just declared the
  refinement complete.

## Steps

1. Read `.formal/settings/rules/dafny-proof.md`.
2. Run:
   ```
   rd-flow dafny verify <name>
   ```
3. Read `dafny/proof-report.md`:
   - `verified` → advance to `dafny-build` (optional) or skip to
     `implement`.
   - `skipped` (no tooling) → block and request Dafny install.
   - `failed` → add lemmas / strengthen `ensures` / split methods. Avoid
     `assume`/`{:axiom}` unless documented in `refinement.md`.

## Handoff

On `verified`, invoke `dafny-build` if you want emitted code for the
implementation, or `implement` directly if hand-translating.
