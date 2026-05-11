---
name: dafny-refine
description: Refine an rd-flow TLA+ spec into a Dafny module with concrete types and contracts. Use after TLA+ checks have passed.
---

# dafny-refine

## When to invoke

- Current phase is `dafny-refine`.
- `manifest.checks.tla.status` is `passed`.

## Steps

1. Read `.formal/settings/rules/dafny-refinement.md`.
2. Run `rd-flow dafny scaffold <name>` if `dafny/spec.dfy` is missing.
3. For each TLA+ variable and action, add the corresponding Dafny
   datatype/field/method. Update the mapping table in
   `dafny/refinement.md`.
4. State `Inv` in Dafny and add `requires` / `ensures` clauses; do not yet
   discharge the proofs — that is the next phase.

## Handoff

Tell the user to invoke `dafny-prove`, or run `rd-flow dafny verify <name>`.
