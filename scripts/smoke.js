// End-to-end smoke test: runs the full CLI surface against a temp project,
// asserts the artefacts and status mutations land where we expect.
//
// Run:  node scripts/smoke.js

import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.resolve(__dirname, '..', 'bin', 'rd-flow.js');

const project = mkdtempSync(path.join(tmpdir(), 'rd-flow-smoke-'));
const SPEC = 'demo-spec';
let failed = 0;

function run(args, opts = {}) {
  const r = spawnSync('node', [BIN, ...args], { cwd: project, encoding: 'utf8' });
  if (!opts.allowFail && r.status !== 0) {
    console.error(`FAIL: rd-flow ${args.join(' ')}`);
    console.error('stdout:', r.stdout);
    console.error('stderr:', r.stderr);
    failed += 1;
  }
  return r;
}

function check(label, cond) {
  if (cond) {
    console.log(`  ok   ${label}`);
  } else {
    console.log(`  FAIL ${label}`);
    failed += 1;
  }
}

try {
  console.log(`smoke project: ${project}`);

  console.log('# init');
  run(['init']);
  check('.formal/ exists', existsSync(path.join(project, '.formal')));
  check('.claude/skills/discovery/SKILL.md exists', existsSync(path.join(project, '.claude/skills/discovery/SKILL.md')));
  check('.formal/settings/templates/ exists', existsSync(path.join(project, '.formal/settings/templates/brief.md')));
  check('.formal/settings/rules/ exists', existsSync(path.join(project, '.formal/settings/rules/routing.md')));
  check('config.json present', existsSync(path.join(project, '.formal/config.json')));

  console.log('# spec new');
  run(['spec', 'new', SPEC, '--title', 'Demo', '--summary', 'smoke test']);
  const specDir = path.join(project, '.formal', 'specs', SPEC);
  check('spec dir created', existsSync(specDir));
  check('brief.md present', existsSync(path.join(specDir, 'brief.md')));
  check('requirements.md present', existsSync(path.join(specDir, 'requirements.md')));
  check('manifest.yaml present', existsSync(path.join(specDir, 'manifest.yaml')));
  check('status.md present', existsSync(path.join(specDir, 'status.md')));

  console.log('# spec list');
  const list = run(['spec', 'list']);
  check('list includes spec', list.stdout.includes(SPEC));

  console.log('# tla scaffold + check');
  run(['tla', 'scaffold', SPEC]);
  check('model.tla present', existsSync(path.join(specDir, 'tla', 'model.tla')));
  check('model.cfg present', existsSync(path.join(specDir, 'tla', 'model.cfg')));
  run(['tla', 'check', SPEC], { allowFail: true });
  const tlaReport = readFileSync(path.join(specDir, 'tla', 'check-report.md'), 'utf8');
  check('tla check report mentions status', /Status: \*\*(passed|skipped|failed)\*\*/.test(tlaReport));

  console.log('# dafny scaffold + verify');
  run(['dafny', 'scaffold', SPEC]);
  check('spec.dfy present', existsSync(path.join(specDir, 'dafny', 'spec.dfy')));
  run(['dafny', 'verify', SPEC], { allowFail: true });
  const dafnyReport = readFileSync(path.join(specDir, 'dafny', 'proof-report.md'), 'utf8');
  check('dafny proof report mentions status', /Status: \*\*(verified|skipped|failed)\*\*/.test(dafnyReport));

  console.log('# impl scaffold');
  run(['impl', 'scaffold', SPEC]);
  check('plan.md present', existsSync(path.join(specDir, 'implementation', 'plan.md')));
  check('mapping.md present', existsSync(path.join(specDir, 'implementation', 'mapping.md')));

  console.log('# status');
  const status = run(['status', SPEC]);
  const parsed = JSON.parse(status.stdout);
  check('status JSON parses', !!parsed && parsed.spec === SPEC);
  check('manifest has current_phase', typeof parsed.manifest.current_phase === 'string');

  console.log('# advance');
  run(['advance', SPEC, 'validate']);
  const status2 = run(['status', SPEC]);
  const parsed2 = JSON.parse(status2.stdout);
  check('advance updated current_phase', parsed2.manifest.current_phase === 'validate');

  console.log('');
  if (failed === 0) {
    console.log('SMOKE OK');
  } else {
    console.log(`SMOKE FAILED — ${failed} check(s) failed`);
    process.exitCode = 1;
  }
} finally {
  rmSync(project, { recursive: true, force: true });
}
