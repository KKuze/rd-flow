# Dafny refinement

Goal: lift the TLA+ abstract spec into a Dafny module with concrete types
and machine-checkable contracts.

Rules:

1. Every TLA+ state variable maps to a Dafny field, datatype, or ghost
   variable. Record the mapping in `refinement.md`.
2. Every TLA+ action becomes a Dafny method whose `requires` / `ensures`
   pair refines the action's precondition / postcondition.
3. The Dafny invariant predicate (`Inv`) must imply the TLA+ invariant
   under the mapping. Note any conjuncts you weakened.
4. Don't introduce algorithmic choices that the TLA+ spec did not allow.
   If you need to, go back and update the TLA+ first.

Exit condition: `refinement.md` lists every TLA+ variable/action and its
Dafny counterpart; `spec.dfy` compiles under `dafny`.
