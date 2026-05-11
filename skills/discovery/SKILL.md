---
name: discovery
description: Route a new or returning request into the refinement-driven workflow. Use when the user opens a feature, bug, or change request and there is no active spec context yet.
---

# discovery

You are the entry point of the rd-flow workflow.

## When to invoke

- The user describes a new feature, bug, or change in plain language.
- The user mentions resuming a spec but the active spec is unclear.

## Steps

1. Read `.formal/settings/rules/routing.md` and apply it.
2. List existing specs (`rd-flow spec list`). If one matches, read its
   `manifest.yaml` and resume at `current_phase`.
3. Otherwise propose a kebab-case spec name and create it:
   ```
   rd-flow spec new <name> --title "..." --summary "..."
   ```
4. Hand off to the `requirements` skill.

## Output

A one-paragraph confirmation:
- chosen spec name,
- whether it is new or resumed,
- which phase the user is in,
- the next concrete action.
