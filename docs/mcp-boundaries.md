# MCP boundaries

The prototype runs everything in-process from the `rd-flow` CLI. Lifting
the service layer into an MCP server should be mechanical because every
service module already obeys these rules:

1. **Pure JS, file-side-effects only.** No globals, no shared in-memory
   state across calls. Every call takes a `projectRoot` argument.
2. **JSON-serialisable I/O.** All inputs and return values are plain
   objects, strings, numbers, or arrays.
3. **No stdout/stderr in services.** Logging happens in the CLI.
   Subprocess output is captured and returned via the report files.
4. **Idempotent where possible.** Scaffolds default to non-destructive;
   `--force` is opt-in at the CLI.

## Proposed tool surface

| MCP tool                  | Implemented by                          | Notes |
| ------------------------- | --------------------------------------- | ----- |
| `workflow.init`           | `installer/install.install`             | Idempotent. |
| `workflow.status`         | `services/workflow.status`              | Whole project or single spec. |
| `workflow.advance`        | `services/workflow.advance`             | Manual phase override. |
| `spec.create`             | `services/spec.createSpec`              | Throws on duplicate. |
| `spec.list`               | `services/spec.listSpecs`               |  |
| `tla.scaffold`            | `services/tla.scaffold`                 | Writes templates only. |
| `tla.check`               | `services/tla.runCheck`                 | Spawns `tlc`; degrades to `skipped` if absent. |
| `dafny.scaffold`          | `services/dafny.scaffold`               |  |
| `dafny.verify`            | `services/dafny.runVerify`              | Same degradation pattern. |
| `implementation.scaffold` | `services/implementation.scaffold`      |  |
| `artifact.validateLinks`  | (not yet — would walk `mapping.md`)     | TODO once `implement` is heavily used. |

## What stays out of MCP

- Skill prose. Skills live in the agent's runtime, not the server.
- Rule files. They are part of the spec workspace, not the server.
- The artefact files themselves. The server *mutates* them; it does not
  *own* them. Source of truth stays in git.

## Migration sketch

1. `npm install @modelcontextprotocol/sdk`.
2. Add `src/mcp/server.js` exporting a `Server` that registers each tool
   above as a thin wrapper:
   ```js
   server.tool('tla.check', schema, (args) => tla.runCheck(args.projectRoot, args.name));
   ```
3. Run via `stdio` transport, point the agent at it.

No service code should need to change.
