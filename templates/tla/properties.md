# TLA+ properties — {{spec_name}}

A short, English-language version of each property in `model.tla`. Keep one
line per property and link it back to the matching name in the spec.

## Safety

- `TypeInvariant` — every variable carries the type its declaration suggests.
- `Inv` — (describe the core safety property in one sentence)

## Liveness

- `Liveness` — (e.g. "every request eventually receives a response under weak
  fairness of the handler action")

## Counter-example bank

When TLC produces a trace, paste a minimal version here with a one-line
explanation of which property it violates.
