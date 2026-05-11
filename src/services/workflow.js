// High-level workflow operations.
//
// The functions exported here are the units we expect to expose as MCP
// tools once we lift the service layer into an MCP server. They each:
//   - take `projectRoot` (or implicit cwd) plus structured args
//   - return plain JSON-serialisable results
//   - never read from process.stdin or print directly (the CLI does that)

import fs from 'node:fs';
import { projectPaths } from './paths.js';
import { listSpecs, createSpec, specExists } from './spec.js';
import { readManifest, updateManifest, PHASES } from './status.js';

export function init(projectRoot) {
  const p = projectPaths(projectRoot);
  // Installer module materialises the files; this function reports the result.
  return { ok: fs.existsSync(p.formal), paths: p };
}

export function status(projectRoot, name) {
  if (name) {
    if (!specExists(projectRoot, name)) throw new Error(`spec '${name}' not found`);
    return { spec: name, manifest: readManifest(projectRoot, name) };
  }
  return { specs: listSpecs(projectRoot).map((n) => ({ name: n, manifest: readManifest(projectRoot, n) })) };
}

export function advance(projectRoot, name, toPhase) {
  if (!PHASES.includes(toPhase)) throw new Error(`unknown phase '${toPhase}'`);
  return updateManifest(projectRoot, name, (m) => {
    m.current_phase = toPhase;
    m.next_action = `(set manually) phase advanced to ${toPhase}`;
  });
}

export function specs(projectRoot) {
  return listSpecs(projectRoot);
}

export { createSpec };
