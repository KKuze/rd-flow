# rd-flow

**Refinement-Driven Flow** — a minimum scaffold for formal-spec-driven
feature work, inspired by `cc-sdd` but oriented around
*TLA+ → check → Dafny → prove → implement* rather than design/tasks docs.

This is an extensible **prototype**, not a finished product. The goal is
to lock in the right boundaries (skills / services / artefacts) so that
future work — multi-agent support, an MCP server, deeper tool integration —
plugs in without re-architecting.

## Install

From this repo:

```bash
cd /path/to/your/project
node /path/to/rd-flow/bin/rd-flow.js init
```

Or once published:

```bash
npx rd-flow init
```

## Quick start

```bash
rd-flow init
rd-flow spec new my-feature --title "My feature" --summary "..."
rd-flow tla scaffold my-feature
# edit .formal/specs/my-feature/tla/model.tla
rd-flow tla check my-feature
rd-flow dafny scaffold my-feature
# edit .formal/specs/my-feature/dafny/spec.dfy
rd-flow dafny verify my-feature
# optional: emit code in the target language
rd-flow dafny build my-feature --target py
rd-flow impl scaffold my-feature
rd-flow status my-feature
```

If `tlc` / `dafny` aren't installed, the runners record a `skipped`
status — the workflow still proceeds without crashing.

## Layout

```
.formal/
  config.json
  settings/
    templates/     # copied from the package, project-tweakable
    rules/         # per-phase prescriptive guidance
  specs/
    <name>/
      brief.md
      requirements.md
      tla/
      dafny/
      implementation/
      manifest.yaml
      status.md
  steering/

.claude/
  skills/          # one folder per phase
```

## Docs

- `docs/architecture.md` — three-layer design (skills / services / artefacts)
- `docs/workflow.md`     — end-to-end walkthrough
- `docs/mcp-boundaries.md` — how the service layer maps to a future MCP server
