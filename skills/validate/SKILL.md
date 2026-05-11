---
name: validate
description: Close the loop on an rd-flow spec by confirming every requirement maps to verified specs and shipping code. Use last.
---

# validate

## When to invoke

- Current phase is `implement` and `mapping.md` rows reference real code.

## Steps

1. Read `.formal/settings/rules/validation.md`.
2. For each row of `mapping.md`:
   - confirm the cited code file:line still exists,
   - confirm the spec artefact it points to is in a passed/verified state
     in `manifest.yaml`.
3. If either side has drifted, re-run the relevant `rd-flow tla check` or
   `rd-flow dafny verify` and update the mapping.
4. Set `current_phase` to `validate` (`rd-flow advance <name> validate`).
5. Optionally append a one-line summary to `.formal/steering/`.

## Handoff

The spec is closed. Future work on it re-enters at `discovery`.
