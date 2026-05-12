// Path conventions for both the package itself and target projects.
// Centralised so the rest of the code never hard-codes layout strings.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Package layout (read-only, source of templates/rules/skills).
export const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
export const PKG_TEMPLATES = path.join(PACKAGE_ROOT, 'templates');
export const PKG_RULES = path.join(PACKAGE_ROOT, 'rules');
export const PKG_SKILLS = path.join(PACKAGE_ROOT, 'skills');

// Project layout (writable, generated in target repo).
export function projectPaths(projectRoot) {
  const formal = path.join(projectRoot, '.formal');
  return {
    root: projectRoot,
    claudeSkills: path.join(projectRoot, '.claude', 'skills'),
    formal,
    settings: path.join(formal, 'settings'),
    settingsTemplates: path.join(formal, 'settings', 'templates'),
    settingsRules: path.join(formal, 'settings', 'rules'),
    specs: path.join(formal, 'specs'),
    steering: path.join(formal, 'steering'),
    config: path.join(formal, 'config.json'),
  };
}

export function specPaths(projectRoot, name) {
  const p = projectPaths(projectRoot);
  const root = path.join(p.specs, name);
  return {
    name,
    root,
    brief: path.join(root, 'brief.md'),
    requirements: path.join(root, 'requirements.md'),
    statusMd: path.join(root, 'status.md'),
    manifestYaml: path.join(root, 'manifest.yaml'),
    tla: {
      dir: path.join(root, 'tla'),
      model: path.join(root, 'tla', 'model.tla'),
      cfg: path.join(root, 'tla', 'model.cfg'),
      properties: path.join(root, 'tla', 'properties.md'),
      report: path.join(root, 'tla', 'check-report.md'),
    },
    dafny: {
      dir: path.join(root, 'dafny'),
      spec: path.join(root, 'dafny', 'spec.dfy'),
      refinement: path.join(root, 'dafny', 'refinement.md'),
      report: path.join(root, 'dafny', 'proof-report.md'),
      buildReport: path.join(root, 'dafny', 'build-report.md'),
      outDir: path.join(root, 'dafny', 'out'),
      outForTarget: (target) => path.join(root, 'dafny', 'out', target),
    },
    implementation: {
      dir: path.join(root, 'implementation'),
      plan: path.join(root, 'implementation', 'plan.md'),
      mapping: path.join(root, 'implementation', 'mapping.md'),
    },
  };
}
