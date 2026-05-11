# Implementation

Goal: turn the verified spec into shipping code without re-doing the
design.

Rules:

1. Do not enter this phase until `manifest.yaml` shows `dafny: verified`
   (or an explicit, justified `skipped` with a written rationale).
2. Every method in `plan.md` cites the Dafny method or TLA+ action it
   realises.
3. `mapping.md` is the ledger: code locations on the right, spec
   references on the left. Keep it in sync as code lands.
4. Resist scope creep. New invariants belong in `requirements.md`, not in
   the implementation diff.
5. Test obligations come from the spec, not from intuition: each test
   names the invariant or `ensures` clause it exercises.

Exit condition: every row of `mapping.md` points at real code, plan.md
has no `(todo)` lines, and tests for each cited obligation exist.
