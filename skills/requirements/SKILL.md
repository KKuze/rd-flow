---
name: requirements
description: Drive the requirements phase of an rd-flow spec. Use after `discovery` has created or selected a spec and `requirements.md` still has placeholders.
---

# requirements

## When to invoke

- `manifest.yaml.current_phase` is `discovery` or `requirements`.
- `requirements.md` contains unresolved `(fill in)` markers.

## Steps

1. Read `.formal/settings/rules/requirements.md`.
2. Open `requirements.md` for the active spec.
3. Elicit and write down, in order:
   - functional + non-functional requirements,
   - candidate invariants (safety),
   - candidate liveness properties,
   - acceptance criteria.
4. Resolve every "Open questions" entry or mark it as a `blocker` on the
   manifest.
5. Once the exit condition in the rule file is met, advance:
   ```
   rd-flow advance <name> tla-model
   ```

## Handoff

Tell the user to invoke the `tla-model` skill next, or simply run
`rd-flow tla scaffold <name>` to start.
