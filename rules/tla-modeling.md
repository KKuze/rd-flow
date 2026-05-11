# TLA+ modelling

Goal: capture the *smallest* state machine that lets us state and check the
safety + liveness properties from `requirements.md`.

Rules:

1. State variables answer the question "what must I know to evaluate the
   invariant?" Anything beyond that is implementation detail — leave it for
   Dafny.
2. `Init` is a predicate, not a procedure.
3. `Next` is the disjunction of named actions. Name actions after what they
   *do* in the world, not how they update state.
4. Every safety property from `requirements.md` must appear in `Inv` or as a
   stand-alone invariant.
5. Fairness is opt-in: add `WF_` / `SF_` only for the action a liveness
   property depends on.
6. Constants are the model's knobs: keep them small for TLC, but make sure
   the bound is documented in `properties.md`.

Exit condition: `Inv` references each safety requirement by name, every
liveness requirement has a TLA+ formula, and the model type-checks under
`SANY`.
