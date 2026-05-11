# rd-flow architecture

rd-flow is a scaffold for **refinement-driven** feature work:

```
discovery → requirements → tla-model → tla-check
                                   ↓
                            dafny-refine → dafny-prove
                                                    ↓
                                         implement → validate
```

Each phase produces a small, auditable artefact. The pipeline's value is
not "AI generates code from prose"; it is **stepwise refinement with
mechanical verification gates**:

- **TLA+** carries the *abstract* behavioural spec.
- **Dafny** carries the *concrete*, machine-checkable refinement.
- Implementation only begins after both have been checked.

## Layered design

There are three layers, deliberately separated:

### A. Skills layer (`skills/` → `.claude/skills/`)

- Hosts the *agent-facing* logic.
- One skill per phase. Each skill is a short markdown brief: when to
  invoke, what rule file to read, which CLI command to run, who to hand
  off to.
- Skills *orchestrate*; they do not perform tool execution themselves.

### B. Service / MCP layer (`src/services/`)

- One module per workflow operation. Pure functions over a project root
  and structured args, returning JSON-serialisable results.
- This is the future MCP server surface. See `mcp-boundaries.md`.
- File I/O, subprocess spawning, and YAML/JSON shape all live here.

### C. Artefact layer (`.formal/specs/<name>/`)

- The source of truth for spec state.
- File-based, human-readable, version-controllable.
- `manifest.yaml` is the machine-readable spine; `status.md` is the
  rendered view.

## Why this split

| Layer    | Stable shape  | Volatile         |
| -------- | ------------- | ---------------- |
| Skills   | High          | Phrasing, agents |
| Services | Highest       | Implementations  |
| Artefact | Per-spec only | Per-spec content |

We can replace the skills (Claude Code → Copilot, …) without rewriting
services. We can lift services into an MCP server without touching the
artefact format. And every artefact is just a file in git.

## Extension points

- **New agent**: add a module under `src/agents/`, wire its skills
  destination into `src/installer/install.js`.
- **New phase**: add a service module, a rule file, a template, and a
  skill. Update `PHASES` in `src/services/status.js` and `PHASE_ORDER` in
  `src/workflow/phases.js`.
- **MCP server**: wrap each function in `src/services/` as a tool. See
  `mcp-boundaries.md`.
