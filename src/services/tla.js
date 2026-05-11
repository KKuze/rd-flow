// TLA+ scaffolding + check runner.
//
// `runCheck` is intentionally tolerant: if `tlc` isn't on PATH, we still
// produce a structured report and update the manifest. This lets the
// workflow proceed in environments without TLA+ installed while keeping
// the integration surface unchanged.

import { spawnSync } from 'node:child_process';
import { specPaths } from './paths.js';
import { writeRendered } from './templates.js';
import { ensureDir, exists, writeFileSafe } from '../utils/fs.js';
import { updateManifest } from './status.js';
import { resolveTool } from './tools.js';

export function scaffold(projectRoot, name) {
  const p = specPaths(projectRoot, name);
  ensureDir(p.tla.dir);
  const vars = { spec_name: name, module_name: toModuleName(name) };
  writeRendered(p.tla.model, 'tla/model.tla', vars);
  writeRendered(p.tla.cfg, 'tla/model.cfg', vars);
  writeRendered(p.tla.properties, 'tla/properties.md', vars);
  writeRendered(p.tla.report, 'tla/check-report.md', { ...vars, last_run: '(never)', status: 'pending', output: '(not yet executed)' });

  updateManifest(projectRoot, name, (m) => {
    m.artifacts.tla_model = 'draft';
    m.current_phase = 'tla-model';
    m.next_action = 'Refine TLA+ model, then run `rd-flow tla check <name>`.';
  });
  return p.tla;
}

export function runCheck(projectRoot, name) {
  const p = specPaths(projectRoot, name);
  if (!exists(p.tla.model)) {
    throw new Error(`TLA+ model not scaffolded — run \`rd-flow tla scaffold ${name}\``);
  }

  const result = invokeTLC(projectRoot, p.tla.model, p.tla.cfg);
  const stamp = new Date().toISOString();
  const status = result.ok ? 'passed' : (result.skipped ? 'skipped' : 'failed');
  const summary = result.summary;

  writeFileSafe(
    p.tla.report,
    renderReport({ name, status, summary, stamp, stdout: result.stdout, stderr: result.stderr }),
    { overwrite: true },
  );

  updateManifest(projectRoot, name, (m) => {
    m.artifacts.tla_check = status === 'passed' ? 'passed' : (status === 'skipped' ? 'skipped' : 'failed');
    m.checks.tla = { status, last_run: stamp, summary };
    if (status === 'passed') {
      m.current_phase = 'dafny-refine';
      m.next_action = `Run \`rd-flow dafny scaffold ${name}\` to begin refinement.`;
    } else if (status === 'failed') {
      m.next_action = `Fix TLA+ model; see ${p.tla.report}`;
    }
  });
  return { status, summary, report: p.tla.report };
}

function invokeTLC(projectRoot, modelPath, cfgPath) {
  // Prefer the project-local install at .formal/tools/bin/tlc; fall back to PATH.
  const tlc = resolveTool(projectRoot, 'tlc');
  const probe = spawnSync(tlc, ['-h'], { encoding: 'utf8' });
  if (probe.error && probe.error.code === 'ENOENT') {
    return {
      ok: false,
      skipped: true,
      summary: 'tlc not found — run `rd-flow tools install --tool tla`',
      stdout: '',
      stderr: 'TLA+ tools not installed',
    };
  }
  const run = spawnSync(tlc, ['-config', cfgPath, modelPath], { encoding: 'utf8', timeout: 120_000 });
  return {
    ok: run.status === 0,
    skipped: false,
    summary: run.status === 0 ? 'tlc reported success' : `tlc exited with status ${run.status}`,
    stdout: run.stdout || '',
    stderr: run.stderr || '',
  };
}

function renderReport({ name, status, summary, stamp, stdout, stderr }) {
  return [
    `# TLA+ Check Report — ${name}`,
    '',
    `- Status: **${status}**`,
    `- Last run: ${stamp}`,
    `- Summary: ${summary}`,
    '',
    '## stdout',
    '```',
    stdout || '(empty)',
    '```',
    '',
    '## stderr',
    '```',
    stderr || '(empty)',
    '```',
    '',
  ].join('\n');
}

function toModuleName(name) {
  return name
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}
