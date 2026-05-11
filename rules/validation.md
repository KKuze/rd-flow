# Validation

Goal: confirm the spec is *closed*: every requirement has a verified
formal statement and a code location that realises it.

Rules:

1. Walk `mapping.md` top-to-bottom; for each row, confirm the cited code
   compiles and the corresponding spec artefact is in a passed/verified
   state in `manifest.yaml`.
2. Re-run TLA+ and Dafny checks if their last run pre-dates the latest
   commit that touched their artefacts.
3. Capture any remaining gaps as `blockers` on the manifest rather than
   silently closing the spec.

Exit condition: `manifest.yaml.current_phase` advances to `validate` with
empty blockers, and a one-line summary is appended to
`.formal/steering/` (optional but recommended).
