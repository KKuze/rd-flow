// Spec workspace lifecycle.
//
// Each spec lives at `.formal/specs/<name>/` and owns its full artefact set.
// Spec creation only writes templates that don't already exist — we never
// overwrite human-edited content unless an explicit { overwrite: true } is
// passed.

import fs from 'node:fs';
import path from 'node:path';
import { projectPaths, specPaths } from './paths.js';
import { writeRendered } from './templates.js';
import { ensureDir } from '../utils/fs.js';
import { initialManifest, writeManifest } from './status.js';

export function createSpec(projectRoot, name, { title, summary } = {}) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new Error(`spec name must be kebab-case: '${name}'`);
  }
  const project = projectPaths(projectRoot);
  if (!fs.existsSync(project.formal)) {
    throw new Error(`.formal/ not found — run \`rd-flow init\` first`);
  }
  const p = specPaths(projectRoot, name);
  if (fs.existsSync(p.root)) {
    throw new Error(`spec '${name}' already exists at ${p.root}`);
  }

  ensureDir(p.root);
  ensureDir(p.tla.dir);
  ensureDir(p.dafny.dir);
  ensureDir(p.implementation.dir);

  const vars = {
    spec_name: name,
    title: title || name,
    summary: summary || '(fill in)',
    date: new Date().toISOString().slice(0, 10),
  };

  // Phase 0/1: brief + requirements
  writeRendered(p.brief, 'brief.md', vars);
  writeRendered(p.requirements, 'requirements.md', vars);

  // We intentionally do *not* materialise TLA+/Dafny/implementation
  // artefacts at spec creation time — each phase brings them into being
  // through its own scaffold call, mirroring the skill boundaries.

  const manifest = initialManifest(name);
  manifest.artifacts.brief = 'draft';
  manifest.artifacts.requirements = 'draft';
  writeManifest(projectRoot, name, manifest);

  return { root: p.root, name };
}

export function listSpecs(projectRoot) {
  const p = projectPaths(projectRoot);
  if (!fs.existsSync(p.specs)) return [];
  return fs.readdirSync(p.specs).filter((entry) => {
    return fs.statSync(path.join(p.specs, entry)).isDirectory();
  });
}

export function specExists(projectRoot, name) {
  return fs.existsSync(specPaths(projectRoot, name).root);
}
