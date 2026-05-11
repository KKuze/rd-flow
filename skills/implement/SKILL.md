---
name: implement
description: Build the implementation plan and code mapping from a verified rd-flow spec. Use only after Dafny verification has passed.
---

# implement

## When to invoke

- Current phase is `implement`.
- `manifest.checks.dafny.status` is `verified`.

## Steps

1. Read `.formal/settings/rules/implementation.md`.
2. Run `rd-flow impl scaffold <name>` if `implementation/plan.md` does not
   yet exist.
3. Fill `plan.md`: every component lists the Dafny method or TLA+ action
   it realises.
4. Maintain `mapping.md` as code lands. Each spec row points at a real
   `file:line` location.

## Handoff

Tell the user to invoke `validate` once code and mapping are in sync.
