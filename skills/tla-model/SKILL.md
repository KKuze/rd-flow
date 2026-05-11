---
name: tla-model
description: Author the TLA+ abstract behavioural spec for an rd-flow workspace. Use after requirements are stable and before TLA+ checking.
---

# tla-model

## When to invoke

- Current phase is `tla-model`.
- `requirements.md` has no `(fill in)` placeholders.

## Steps

1. Read `.formal/settings/rules/tla-modeling.md`.
2. Run `rd-flow tla scaffold <name>` if the TLA+ files don't yet exist.
3. Edit `tla/model.tla`:
   - declare variables that are *necessary* to state the invariants,
   - define `Init`, `Next` (as named action disjuncts), `Spec`,
   - fill `Inv` so each requirement-level invariant is referenced.
4. Update `tla/properties.md` so every formula in the model has a one-line
   English gloss.
5. Configure `model.cfg` (constants, fairness) only as needed.

## Handoff

Tell the user to invoke `tla-check`, or run `rd-flow tla check <name>`.
