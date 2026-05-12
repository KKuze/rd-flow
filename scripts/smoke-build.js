// Smoke test for `rd-flow dafny build`.
//
// We don't need a real Dafny binary: we drop a fake `dafny` shell script
// onto `.formal/tools/bin/` and let `resolveTool` pick it up. The script
// records its arguments, fabricates a target-specific output file, and
// returns a configurable exit status.
//
// Run:  node scripts/smoke-build.js

import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'rd-flow.js');

let failed = 0;
function check(label, cond) {
  if (cond) console.log(`  ok   ${label}`);
  else { console.log(`  FAIL ${label}`); failed += 1; }
}

const project = mkdtempSync(path.join(tmpdir(), 'rd-flow-build-'));
const SPEC = 'build-spec';

// Helper: stamp a fake `dafny` into the project's tools/bin so resolveTool
// picks it up. `mode` selects behaviour:
//   'ok'   — exit 0 and write a target-specific output file
//   'fail' — exit 1 with a clear error
//   'gone' — do not create the wrapper (simulates missing tool)
function installFakeDafny(mode) {
  const bin = path.join(project, '.formal', 'tools', 'bin');
  mkdirSync(bin, { recursive: true });
  const wrapper = path.join(bin, 'dafny');
  if (mode === 'gone') {
    if (existsSync(wrapper)) rmSync(wrapper);
    return;
  }
  const body = mode === 'fail'
    ? `#!/usr/bin/env bash
echo "fake dafny: simulated failure" >&2
exit 1
`
    : `#!/usr/bin/env bash
# Minimal stand-in for dafny. Recognises --version, verify, build.
case "$1" in
  --version) echo "fake-dafny 0.0.0"; exit 0 ;;
  verify) exit 0 ;;
  build)
    shift
    target=""; out=""
    for arg in "$@"; do
      case "$arg" in
        --target:*) target="\${arg#--target:}" ;;
        --output:*) out="\${arg#--output:}" ;;
      esac
    done
    if [ -z "$out" ]; then
      echo "fake dafny: missing --output" >&2
      exit 2
    fi
    mkdir -p "$(dirname "$out")"
    echo "// generated for target $target" > "\${out}.\${target}"
    exit 0
    ;;
  *) exit 0 ;;
esac
`;
  writeFileSync(wrapper, body);
  chmodSync(wrapper, 0o755);
}

function run(args, opts = {}) {
  const r = execSync(`node ${BIN} ${args.join(' ')}`, { cwd: project, encoding: 'utf8', stdio: opts.capture ? 'pipe' : ['pipe', 'pipe', 'pipe'] });
  return r;
}
function runAllow(args) {
  try { return { ok: true, out: execSync(`node ${BIN} ${args.join(' ')}`, { cwd: project, encoding: 'utf8' }) }; }
  catch (e) { return { ok: false, status: e.status, stderr: e.stderr?.toString() || '', stdout: e.stdout?.toString() || '' }; }
}

try {
  console.log(`build smoke project: ${project}`);

  // Bootstrap workspace.
  run(['init']);
  run(['spec', 'new', SPEC, '--title', 'Build smoke', '--summary', 'covers dafny build']);
  run(['dafny', 'scaffold', SPEC]);

  // --- 1. Missing dafny: build records `skipped` and does not crash.
  console.log('# missing dafny → skipped');
  installFakeDafny('gone');
  const r1 = runAllow(['dafny', 'build', SPEC, '--target', 'py']);
  check('command exits 0 even when tool missing', r1.ok);
  const report1 = readFileSync(path.join(project, `.formal/specs/${SPEC}/dafny/build-report.md`), 'utf8');
  check('report shows skipped', /Status: \*\*skipped\*\*/.test(report1));
  const manifest1 = readFileSync(path.join(project, `.formal/specs/${SPEC}/manifest.yaml`), 'utf8');
  check('manifest dafny_build = skipped', /dafny_build: skipped/.test(manifest1));

  // --- 2. Invalid target rejected before any subprocess.
  console.log('# invalid target → hard error');
  const r2 = runAllow(['dafny', 'build', SPEC, '--target', 'xyz']);
  check('invalid target exits non-zero', !r2.ok);
  check('error names valid targets', /unknown target/.test(r2.stderr) || /unknown target/.test(r2.stdout));

  // --- 3. Missing --target rejected.
  console.log('# missing --target → hard error');
  const r3 = runAllow(['dafny', 'build', SPEC]);
  check('missing --target exits non-zero', !r3.ok);
  check('error mentions missing target', /missing --target/.test(r3.stderr) || /missing --target/.test(r3.stdout));

  // --- 4. Happy path with fake dafny: build → built, output dir populated.
  console.log('# happy path');
  installFakeDafny('ok');
  const r4 = runAllow(['dafny', 'build', SPEC, '--target', 'py']);
  check('build exits 0', r4.ok);
  const report4 = readFileSync(path.join(project, `.formal/specs/${SPEC}/dafny/build-report.md`), 'utf8');
  check('report shows built', /Status: \*\*built\*\*/.test(report4));
  check('report records target', /Target: `py`/.test(report4));
  const outDir = path.join(project, `.formal/specs/${SPEC}/dafny/out/py`);
  check('per-target output dir exists', existsSync(outDir));
  const manifest4 = readFileSync(path.join(project, `.formal/specs/${SPEC}/manifest.yaml`), 'utf8');
  check('manifest dafny_build = built', /dafny_build: built/.test(manifest4));
  check('manifest current_phase advanced to implement', /current_phase: implement/.test(manifest4));

  // --- 5. Re-building a different target keeps the old one and adds new.
  console.log('# second target run');
  const r5 = runAllow(['dafny', 'build', SPEC, '--target', 'go']);
  check('second build exits 0', r5.ok);
  check('first target dir still exists', existsSync(path.join(project, `.formal/specs/${SPEC}/dafny/out/py`)));
  check('new target dir exists', existsSync(path.join(project, `.formal/specs/${SPEC}/dafny/out/go`)));

  // --- 6. Failing build records `failed`, does not advance phase to implement.
  console.log('# build failure');
  // Roll back: pretend dafny verify already happened so we are at dafny-build phase.
  execSync(`node ${BIN} advance ${SPEC} dafny-build`, { cwd: project });
  installFakeDafny('fail');
  const r6 = runAllow(['dafny', 'build', SPEC, '--target', 'py']);
  check('build command itself exits 0 (failure is recorded in report)', r6.ok);
  const report6 = readFileSync(path.join(project, `.formal/specs/${SPEC}/dafny/build-report.md`), 'utf8');
  check('report shows failed', /Status: \*\*failed\*\*/.test(report6));
  const manifest6 = readFileSync(path.join(project, `.formal/specs/${SPEC}/manifest.yaml`), 'utf8');
  check('manifest dafny_build = failed', /dafny_build: failed/.test(manifest6));
  check('phase did not auto-advance on failure', !/current_phase: implement/.test(manifest6));

  // --- 7. status command surfaces build state.
  console.log('# status surfaces build state');
  const r7 = runAllow(['status', SPEC]);
  const parsed = JSON.parse(r7.out);
  check('status JSON parses', !!parsed && parsed.spec === SPEC);
  check('status has dafny_build artefact entry', 'dafny_build' in parsed.manifest.artifacts);
  check('status has dafny_build check entry', 'dafny_build' in parsed.manifest.checks);

  console.log('');
  if (failed === 0) console.log('SMOKE-BUILD OK');
  else {
    console.log(`SMOKE-BUILD FAILED — ${failed} check(s) failed`);
    process.exitCode = 1;
  }
} finally {
  rmSync(project, { recursive: true, force: true });
}
