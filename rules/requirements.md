# Requirements phase

Goal: produce a `requirements.md` that downstream phases can refine without
guessing.

Rules:

1. Every requirement names a *behaviour*, not a UI element.
2. Distinguish three lists: invariants (safety), liveness, acceptance.
3. Invariants must be statable as a single sentence; if not, split.
4. Mark every open question explicitly — TLA+ modelling must not start with
   ambiguous semantics.

Exit condition: the requirements doc has at least one safety invariant and
one acceptance criterion, and no `(fill in)` placeholders remain.
