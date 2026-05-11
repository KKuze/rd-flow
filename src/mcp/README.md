# MCP integration (planned)

This directory is the parking spot for the future MCP server. Today the
workflow operations live as plain functions in `src/services/`; an MCP server
will wrap those functions one-for-one.

Planned tools (1:1 with the existing service functions):

| MCP tool                  | Service function                       |
| ------------------------- | -------------------------------------- |
| `workflow.init`           | `installer/install.install`            |
| `workflow.status`         | `services/workflow.status`             |
| `workflow.advance`        | `services/workflow.advance`            |
| `spec.create`             | `services/spec.createSpec`             |
| `spec.list`               | `services/spec.listSpecs`              |
| `tla.scaffold`            | `services/tla.scaffold`                |
| `tla.check`               | `services/tla.runCheck`                |
| `dafny.scaffold`          | `services/dafny.scaffold`              |
| `dafny.verify`            | `services/dafny.runVerify`             |
| `implementation.scaffold` | `services/implementation.scaffold`     |
| `tools.install`           | `services/tools.install`               |
| `tools.uninstall`         | `services/tools.uninstall`             |
| `tools.status`            | `services/tools.status`                |
| `artifact.validateLinks`  | (not yet implemented)                  |

See `docs/mcp-boundaries.md` for the rationale.
