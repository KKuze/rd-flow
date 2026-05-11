---------------------------- MODULE {{module_name}} ----------------------------
(*
  Abstract behavioural specification for `{{spec_name}}`.

  Intent
  ------
  Capture the smallest state machine that makes the safety + liveness
  properties listed in `properties.md` checkable. Resist the urge to
  model implementation detail — that is what the Dafny phase is for.

  Conventions
  -----------
  - Keep state variables to a minimum.
  - Distinguish `Init`, `Next`, and `Spec` clearly.
  - Add fairness conditions only when required for a liveness property.
*)

EXTENDS Naturals, Sequences, TLC

CONSTANTS
    \* declare constants here (e.g. MaxN, Nodes)

VARIABLES
    \* declare variables here (e.g. state, log)

vars == << >>

TypeInvariant ==
    \* per-variable type predicates
    TRUE

Init ==
    \* initial state predicate
    TRUE

Next ==
    \* disjunction of action subformulas
    UNCHANGED vars

Spec ==
    Init /\ [][Next]_vars

\* ----------------------------------------------------------------
\* Safety properties
\* ----------------------------------------------------------------

Inv == TypeInvariant
    \* /\ <additional safety invariants>

\* ----------------------------------------------------------------
\* Liveness properties (uncomment + add fairness in model.cfg)
\* ----------------------------------------------------------------

\* Liveness == <> <something good>

================================================================================
