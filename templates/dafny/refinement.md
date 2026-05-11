# Refinement notes — {{spec_name}}

A prose companion to `spec.dfy`. The Dafny file shows *what* the refinement
is; this file says *why* each mapping is correct.

## Abstract → concrete mapping

| TLA+ variable / action | Dafny construct | Notes |
| ---------------------- | ---------------- | ----- |
| (e.g. `state`)         | `datatype State` | Concrete fields enumerated below. |

## Invariant preservation

For each TLA+ invariant, state which Dafny `ensures` clause discharges it.

## Open obligations

- (list `requires`/`ensures` that Dafny cannot yet prove and explain why)
