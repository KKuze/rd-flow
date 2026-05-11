# Workflow

End-to-end walkthrough for a single spec.

## 1. Install once per project

```
rd-flow init
```

Creates:

- `.formal/settings/templates/` — copied from the package
- `.formal/settings/rules/`     — copied from the package
- `.formal/specs/`              — empty, ready for new specs
- `.formal/steering/`           — optional, project-wide notes
- `.claude/skills/`             — agent-facing skill briefs
- `.formal/config.json`         — bookkeeping

Re-run with `--force` to overwrite local edits.

## 2. Create a spec

```
rd-flow spec new payment-finality --title "Atomic payment finality" \
    --summary "Two-phase commit between ledger and wallet."
```

Produces a spec workspace with `brief.md`, `requirements.md`,
`manifest.yaml`, and `status.md`.

## 3. Work the phases

| Phase          | Skill          | CLI                                    |
| -------------- | -------------- | -------------------------------------- |
| requirements   | `requirements` | (edit `requirements.md`)               |
| tla-model      | `tla-model`    | `rd-flow tla scaffold <name>`          |
| tla-check      | `tla-check`    | `rd-flow tla check <name>`             |
| dafny-refine   | `dafny-refine` | `rd-flow dafny scaffold <name>`        |
| dafny-prove    | `dafny-prove`  | `rd-flow dafny verify <name>`          |
| implement      | `implement`    | `rd-flow impl scaffold <name>`         |
| validate       | `validate`     | `rd-flow advance <name> validate`      |

Each `tla check` / `dafny verify` updates `manifest.yaml` and
regenerates `status.md`.

## 4. Resume

```
rd-flow status <name>
```

Prints the manifest. Whatever `current_phase` says is where you pick up.

## 5. Missing tooling

If `tlc` or `dafny` is not on PATH, the runner records `status: skipped`
in the report and manifest. Treat that as "phase incomplete" — install
the tool and re-run.
