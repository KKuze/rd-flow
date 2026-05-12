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

| Phase          | Skill          | CLI                                              |
| -------------- | -------------- | ------------------------------------------------ |
| requirements   | `requirements` | (edit `requirements.md`)                         |
| tla-model      | `tla-model`    | `rd-flow tla scaffold <name>`                    |
| tla-check      | `tla-check`    | `rd-flow tla check <name>`                       |
| dafny-refine   | `dafny-refine` | `rd-flow dafny scaffold <name>`                  |
| dafny-prove    | `dafny-prove`  | `rd-flow dafny verify <name>`                    |
| dafny-build\*  | `dafny-build`  | `rd-flow dafny build <name> --target <lang>`     |
| implement      | `implement`    | `rd-flow impl scaffold <name>`                   |
| validate       | `validate`     | `rd-flow advance <name> validate`                |

\* `dafny-build` is **optional**. Targets: `cs | java | go | js | py | cpp | rs`.
Skip with `rd-flow advance <name> implement` if hand-translating from the
Dafny spec. The emitted artefacts land under
`.formal/specs/<name>/dafny/out/<target>/` and a `build-report.md` is
written alongside the proof report.

Each `tla check` / `dafny verify` / `dafny build` updates `manifest.yaml`
and regenerates `status.md`.

## 4. Resume

```
rd-flow status <name>
```

Prints the manifest. Whatever `current_phase` says is where you pick up.

## 5. Missing tooling

If `tlc` or `dafny` is not on PATH, the runner records `status: skipped`
in the report and manifest. Treat that as "phase incomplete" — install
the tool and re-run.

## 6. Provisioning TLA+ / Dafny

`rd-flow` ships a small installer that drops the upstream releases under
`.formal/tools/` without touching the system:

```
rd-flow tools install                # both tools, default versions
rd-flow tools install --tool tla
rd-flow tools install --tool dafny --dafny-version 4.9.1
rd-flow tools install --force        # overwrite an existing install
rd-flow tools status                 # JSON status of both tools
rd-flow tools uninstall              # remove what we wrote, untouched if nothing tracked
rd-flow tools uninstall --tool tla
```

Properties:

- **Project-local.** Installs land in `.formal/tools/{tla,dafny,bin}/`.
  `tla check` / `dafny verify` prefer wrappers in `.formal/tools/bin/`
  before falling back to PATH, so once tools are installed the rest of
  the workflow "just works".
- **Idempotent.** Re-running `install` with the same version is a no-op.
  Same-tool different-version requires `--force`.
- **Transactional.** Any failure during install rolls back every file or
  directory we created in that call. The install log (`install-log.json`)
  is only updated on success.
- **Java / .NET prerequisites.** TLA+ needs Java on PATH (`brew install
  openjdk`). Recent Dafny self-contained builds ship the .NET runtime;
  the installer warns if `dotnet` is missing but does not block.
