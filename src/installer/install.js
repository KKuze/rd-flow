// Installer.
//
// What `rd-flow init` does, in order:
//   1. Create `.formal/` + subdirs in the target project.
//   2. Copy package `templates/` -> `.formal/settings/templates/`.
//   3. Copy package `rules/`     -> `.formal/settings/rules/`.
//   4. Copy package `skills/`    -> `.claude/skills/`.
//   5. Write `.formal/config.json` describing the install.
//
// All copies are idempotent: existing files are preserved unless --force is
// passed, so the installer is safe to re-run after manual edits.

import fs from 'node:fs';
import path from 'node:path';
import { PACKAGE_ROOT, PKG_TEMPLATES, PKG_RULES, PKG_SKILLS, projectPaths } from '../services/paths.js';
import { ensureDir, copyTree, writeFileSafe } from '../utils/fs.js';
import { info, step } from '../utils/log.js';

export function install(projectRoot, { force = false, agent = 'claude-code' } = {}) {
  const p = projectPaths(projectRoot);
  info(`installing rd-flow into ${projectRoot}`);

  // 1. Skeleton directories
  for (const dir of [p.formal, p.settings, p.settingsTemplates, p.settingsRules, p.specs, p.steering]) {
    ensureDir(dir);
  }
  step(`created .formal/ skeleton`);

  // 2-3. Templates + rules
  const tResults = copyTree(PKG_TEMPLATES, p.settingsTemplates, { overwrite: force });
  step(`templates: ${tResults.filter((r) => r.written).length}/${tResults.length} written`);
  const rResults = copyTree(PKG_RULES, p.settingsRules, { overwrite: force });
  step(`rules: ${rResults.filter((r) => r.written).length}/${rResults.length} written`);

  // 4. Skills — currently only Claude Code is wired up; add agent adapters under
  // src/agents/ when extending to Copilot / Codex / etc.
  ensureDir(p.claudeSkills);
  const sResults = copyTree(PKG_SKILLS, p.claudeSkills, { overwrite: force });
  step(`skills (${agent}): ${sResults.filter((r) => r.written).length}/${sResults.length} written`);

  // 5. Config
  const config = {
    rd_flow_version: readPkgVersion(),
    installed_at: new Date().toISOString(),
    agent,
    paths: {
      formal: '.formal',
      specs: '.formal/specs',
      templates: '.formal/settings/templates',
      rules: '.formal/settings/rules',
      skills: '.claude/skills',
    },
  };
  writeFileSafe(p.config, JSON.stringify(config, null, 2) + '\n', { overwrite: true });
  step(`wrote ${path.relative(projectRoot, p.config)}`);

  info('install complete');
  return p;
}

function readPkgVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}
