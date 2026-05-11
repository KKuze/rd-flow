# TLA+ checking

Goal: drive TLC (or an equivalent checker) until every property in
`properties.md` passes for a sensibly bounded model.

Rules:

1. Run `rd-flow tla check <name>` — it captures stdout/stderr into the
   check report.
2. If TLC is missing, the runner records a "skipped" status. That is *not*
   a pass; treat the phase as incomplete until a real run lands.
3. On a counter-example: copy a minimal version into the "Counter-example
   bank" section of `properties.md`, then decide *whether to fix the model
   or the requirement* before re-running.
4. Bound the state space deliberately. A passing check at `MaxN = 2` is a
   weaker statement than `MaxN = 5`; document the bound used.

Exit condition: report shows `status: passed`, every property listed in
`properties.md` is referenced in the run output, and the bound is
documented.
