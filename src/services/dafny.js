// Dafny scaffolding + verify runner.
// Mirror of services/tla.js so the two phases stay structurally aligned.

import { spawnSync } from 'node:child_process';
import { specPaths } from './paths.js';
import { writeRendered } from './templates.js';
import { ensureDir, exists, writeFileSafe } from '../utils/fs.js';
import { updateManifest } from './status.js';

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

  const result = invokeDafny(p.dafny.spec);
  const stamp = new Date().toISOString();
  const status = result.ok ? 'verified' : (result.skipped ? 'skipped' : 'failed');
  const summary = result.summary;

  writeFileSafe(
    p.dafny.report,
    renderReport({ name, status, summary, stamp, stdout: result.stdout, stderr: result.stderr }),
    { overwrite: true },
  );

  updateManifest(projectRoot, name, (m) => {
    m.artifacts.dafny_proof = status === 'verified' ? 'verified' : (status === 'skipped' ? 'skipped' : 'failed');
    m.checks.dafny = { status, last_run: stamp, summary };
    if (status === 'verified') {
      m.current_phase = 'implement';
      m.next_action = `Run \`rd-flow impl scaffold ${name}\` to draft the implementation plan.`;
    } else if (status === 'failed') {
      m.next_action = `Fix Dafny proof obligations; see ${p.dafny.report}`;
    }
  });
  return { status, summary, report: p.dafny.report };
}

function invokeDafny(specPath) {
  const probe = spawnSync('dafny', ['--version'], { encoding: 'utf8' });
  if (probe.error && probe.error.code === 'ENOENT') {
    return {
      ok: false,
      skipped: true,
      summary: 'dafny CLI not found on PATH — stub recorded',
      stdout: '',
      stderr: 'install Dafny to run real verification',
    };
  }
  const run = spawnSync('dafny', ['verify', specPath], { encoding: 'utf8', timeout: 60_000 });
  return {
    ok: run.status === 0,
    skipped: false,
    summary: run.status === 0 ? 'dafny verify reported success' : `dafny verify exited with status ${run.status}`,
    stdout: run.stdout || '',
    stderr: run.stderr || '',
  };
}

function renderReport({ name, status, summary, stamp, stdout, stderr }) {
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
