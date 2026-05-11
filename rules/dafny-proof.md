# Dafny proof

Goal: discharge all proof obligations in `spec.dfy` via `dafny verify`.

Rules:

1. Run `rd-flow dafny verify <name>`.
2. If Dafny is missing, the runner records "skipped" — that is not a pass.
3. Don't paper over a failure with `{:axiom}` or `assume` unless the
   reason is captured in `refinement.md` *and* the TLA+ side already
   covers it.
4. Long-running verifications: prefer splitting a method or extracting
   lemmas over raising the resource bound.
5. The proof report's stdout is the audit trail; do not hand-edit it.

Exit condition: report shows `status: verified`; all proof obligations
listed in `refinement.md` are discharged or have an explicit deferral.
