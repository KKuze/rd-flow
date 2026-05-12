// Dafny scaffolding + verify + build runner.
// Mirror of services/tla.js so the phases stay structurally aligned.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { specPaths } from './paths.js';
import { writeRendered } from './templates.js';
import { ensureDir, exists, writeFileSafe } from '../utils/fs.js';
import { updateManifest } from './status.js';
import { resolveTool } from './tools.js';

// Targets accepted by `dafny build -t:<target>`. Kept explicit so the CLI
// can fail fast on typos before spawning dafny.
export const BUILD_TARGETS = ['cs', 'java', 'go', 'js', 'py', 'cpp', 'rs'];

function assertTarget(target) {
  if (!target) {
    throw new Error(`dafny build: missing --target (one of: ${BUILD_TARGETS.join(' | ')})`);
  }
  if (!BUILD_TARGETS.includes(target)) {
    throw new Error(`dafny build: unknown target '${target}' (expected: ${BUILD_TARGETS.join(' | ')})`);
  }
}

export function scaffold(projectRoot, name) {
  const p = specPaths(projectRoot, name);
  ensureDir(p.dafny.dir);
  const vars = { spec_name: name };
  writeRendered(p.dafny.spec, 'dafny/spec.dfy', vars);
  writeRendered(p.dafny.refinement, 'dafny/refinement.md', vars);
  writeRendered(p.dafny.report, 'dafny/proof-report.md', { ...vars, last_run: '(never)', status: 'pending', output: '(not yet executed)' });

  updateManifest(projectRoot, name, (m) => {
    m.artifacts.dafny_spec = 'draft';
    m.current_phase = 'dafny-refine';
    m.next_action = `Refine Dafny spec, then run \`rd-flow dafny verify ${name}\`.`;
  });
  return p.dafny;
}

export function runVerify(projectRoot, name) {
  const p = specPaths(projectRoot, name);
  if (!exists(p.dafny.spec)) {
    throw new Error(`Dafny spec not scaffolded — run \`rd-flow dafny scaffold ${name}\``);
  }

  const result = invokeDafnyVerify(projectRoot, p.dafny.spec);
  const stamp = new Date().toISOString();
  const status = result.ok ? 'verified' : (result.skipped ? 'skipped' : 'failed');
  const summary = result.summary;

  writeFileSafe(
    p.dafny.report,
    renderProofReport({ name, status, summary, stamp, stdout: result.stdout, stderr: result.stderr }),
    { overwrite: true },
  );

  updateManifest(projectRoot, name, (m) => {
    m.artifacts.dafny_proof = status === 'verified' ? 'verified' : (status === 'skipped' ? 'skipped' : 'failed');
    m.checks.dafny = { status, last_run: stamp, summary };
    if (status === 'verified') {
      // Build is optional but recommended; we park the spec there.
      // Users may skip ahead to `implement` manually.
      m.current_phase = 'dafny-build';
      m.next_action = `Optional: \`rd-flow dafny build ${name} --target <lang>\`. Or skip to \`rd-flow impl scaffold ${name}\`.`;
    } else if (status === 'failed') {
      m.next_action = `Fix Dafny proof obligations; see ${p.dafny.report}`;
    }
  });
  return { status, summary, report: p.dafny.report };
}

export function runBuild(projectRoot, name, { target } = {}) {
  assertTarget(target);
  const p = specPaths(projectRoot, name);
  if (!exists(p.dafny.spec)) {
    throw new Error(`Dafny spec not scaffolded — run \`rd-flow dafny scaffold ${name}\``);
  }

  const outDir = p.dafny.outForTarget(target);
  // Clean prior output for this target so the report reflects a fresh run.
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
  ensureDir(outDir);

  const result = invokeDafnyBuild(projectRoot, p.dafny.spec, target, outDir);
  const stamp = new Date().toISOString();
  const status = result.ok ? 'built' : (result.skipped ? 'skipped' : 'failed');
  const summary = result.summary;

  const artefacts = result.ok ? listFiles(outDir).map((f) => path.relative(projectRoot, f)) : [];

  writeFileSafe(
    p.dafny.buildReport,
    renderBuildReport({ name, target, status, summary, stamp, outDir, artefacts, stdout: result.stdout, stderr: result.stderr }),
    { overwrite: true },
  );

  updateManifest(projectRoot, name, (m) => {
    if (!m.artifacts.dafny_build) m.artifacts.dafny_build = 'pending';
    m.artifacts.dafny_build = status === 'built' ? 'built' : (status === 'skipped' ? 'skipped' : 'failed');
    if (!m.checks.dafny_build) m.checks.dafny_build = { status: 'pending', last_run: null, summary: '' };
    m.checks.dafny_build = { status, last_run: stamp, summary, target };
    if (status === 'built') {
      m.current_phase = 'implement';
      m.next_action = `Run \`rd-flow impl scaffold ${name}\` and consume ${path.relative(projectRoot, outDir)} from the implementation.`;
    } else if (status === 'failed') {
      m.next_action = `Fix dafny build errors for target ${target}; see ${p.dafny.buildReport}`;
    }
  });
  return { status, summary, report: p.dafny.buildReport, outDir, artefacts };
}

function invokeDafnyVerify(projectRoot, specPath) {
  const dafny = resolveTool(projectRoot, 'dafny');
  const probe = spawnSync(dafny, ['--version'], { encoding: 'utf8' });
  if (probe.error && probe.error.code === 'ENOENT') {
    return {
      ok: false,
      skipped: true,
      summary: 'dafny not found — run `rd-flow tools install --tool dafny`',
      stdout: '',
      stderr: 'Dafny not installed',
    };
  }
  const run = spawnSync(dafny, ['verify', specPath], { encoding: 'utf8', timeout: 120_000 });
  return {
    ok: run.status === 0,
    skipped: false,
    summary: run.status === 0 ? 'dafny verify reported success' : `dafny verify exited with status ${run.status}`,
    stdout: run.stdout || '',
    stderr: run.stderr || '',
  };
}

function invokeDafnyBuild(projectRoot, specPath, target, outDir) {
  const dafny = resolveTool(projectRoot, 'dafny');
  const probe = spawnSync(dafny, ['--version'], { encoding: 'utf8' });
  if (probe.error && probe.error.code === 'ENOENT') {
    return {
      ok: false,
      skipped: true,
      summary: 'dafny not found — run `rd-flow tools install --tool dafny`',
      stdout: '',
      stderr: 'Dafny not installed',
    };
  }
  // `--output` controls where dafny places the emitted artefacts. We point
  // it at our per-target subdir so re-running for a different target does
  // not clobber prior output.
  const outBase = path.join(outDir, 'spec');
  const args = ['build', `--target:${target}`, `--output:${outBase}`, specPath];
  const run = spawnSync(dafny, args, { encoding: 'utf8', timeout: 180_000 });
  return {
    ok: run.status === 0,
    skipped: false,
    summary: run.status === 0
      ? `dafny build --target ${target} reported success`
      : `dafny build --target ${target} exited with status ${run.status}`,
    stdout: run.stdout || '',
    stderr: run.stderr || '',
  };
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (fs.statSync(p).isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

function renderProofReport({ name, status, summary, stamp, stdout, stderr }) {
  return [
    `# Dafny Proof Report — ${name}`,
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

function renderBuildReport({ name, target, status, summary, stamp, outDir, artefacts, stdout, stderr }) {
  const list = artefacts.length ? artefacts.map((f) => `- ${f}`).join('\n') : '(none)';
  return [
    `# Dafny Build Report — ${name}`,
    '',
    `- Status: **${status}**`,
    `- Target: \`${target}\``,
    `- Last run: ${stamp}`,
    `- Summary: ${summary}`,
    `- Output dir: ${outDir}`,
    '',
    '## Artefacts',
    list,
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
