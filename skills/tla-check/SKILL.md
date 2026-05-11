---
name: tla-check
description: Run TLC against an rd-flow TLA+ model and triage the result. Use once `tla-model` reports the model is ready.
---

# tla-check

## When to invoke

- Current phase is `tla-check`, or `tla-model` has just declared the model
  ready.

## Steps

1. Read `.formal/settings/rules/tla-checking.md`.
2. Run:
   ```
   rd-flow tla check <name>
   ```
3. Read the produced `tla/check-report.md`:
   - `status: passed` → advance phase to `dafny-refine`.
   - `status: skipped` (no tooling) → tell the user TLC must be installed
     before this phase can complete; do not advance.
   - `status: failed` → extract the counter-example, copy a minimal form
     into `properties.md`, decide whether the model or the requirement is
     wrong, and loop.

## Handoff

On pass, invoke `dafny-refine`.
