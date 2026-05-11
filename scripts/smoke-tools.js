// Smoke test for `rd-flow tools install/uninstall`.
//
// We deliberately avoid hitting the public network. Instead we stub
// `globalThis.fetch` so we can:
//   - exercise the happy path (write a fake JAR + fake zip),
//   - exercise a forced failure mid-install to confirm rollback,
//   - exercise idempotent re-install,
//   - exercise uninstall.
//
// Requirements
// ------------
//   - `zip` CLI must be on PATH (used to build the fake Dafny archive
//     consumed by the real `unzip` step inside the installer). On macOS
//     it ships by default; on Debian/Ubuntu install `zip` (`apt install
//     zip`). The package itself stays dep-free; if a CI image without
//     `zip` becomes a real constraint, switch this fixture to a
//     committed `scripts/fixtures/fake-dafny.zip` rather than adding a
//     Node ZIP dependency.
//
// Run:  node scripts/smoke-tools.js

import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let failed = 0;
function check(label, cond) {
  if (cond) console.log(`  ok   ${label}`);
  else { console.log(`  FAIL ${label}`); failed += 1; }
}

const project = mkdtempSync(path.join(tmpdir(), 'rd-flow-tools-'));
// Pre-init the project so `.formal/` exists (mirrors real usage).
execSync(`node ${path.join(ROOT, 'bin/rd-flow.js')} init`, { cwd: project });

// Build a minimal valid zip for the fake Dafny payload.
// (Empty central directory is enough for `unzip -q` to succeed and produce
//  no files; but we want a top-level `dafny/dafny` entry.)
function buildFakeDafnyZip() {
  // Use `zip` if available — easier than hand-rolling a zip in pure JS.
  const tmp = mkdtempSync(path.join(tmpdir(), 'fake-dafny-'));
  mkdirSync(path.join(tmp, 'dafny'));
  writeFileSync(path.join(tmp, 'dafny', 'dafny'), '#!/usr/bin/env bash\necho dafny-fake "$@"\n');
  chmodSync(path.join(tmp, 'dafny', 'dafny'), 0o755);
  const zipPath = path.join(tmpdir(), `fake-dafny-${Date.now()}.zip`);
  execSync(`cd "${tmp}" && zip -qr "${zipPath}" dafny`);
  rmSync(tmp, { recursive: true, force: true });
  return zipPath;
}

const fakeJar = Buffer.from('FAKE_JAR_BYTES');
let fakeDafnyZipBytes;
try {
  fakeDafnyZipBytes = readFileSync(buildFakeDafnyZip());
} catch (e) {
  console.error('FAIL: could not build fake dafny zip (need `zip` CLI):', e.message);
  process.exit(1);
}

// In-process: stub global fetch.
const realFetch = globalThis.fetch;
let nextFetchShouldFail = false;
globalThis.fetch = async function stubFetch(url) {
  if (nextFetchShouldFail) {
    return new Response('not found', { status: 404 });
  }
  if (url.includes('tla2tools.jar')) {
    return new Response(fakeJar, { status: 200 });
  }
  if (url.includes('dafny-')) {
    return new Response(fakeDafnyZipBytes, { status: 200 });
  }
  return new Response('no stub', { status: 500 });
};

const tools = await import(path.join(ROOT, 'src/services/tools.js'));

try {
  console.log(`tools smoke project: ${project}`);

  // ---- 1. fresh install both ----
  console.log('# install both');
  const r1 = await tools.install(project, { tool: 'all' });
  check('tla installed', r1.tla.status === 'installed');
  check('dafny installed', r1.dafny.status === 'installed');
  check('tlc wrapper exists', existsSync(path.join(project, '.formal/tools/bin/tlc')));
  check('dafny wrapper exists', existsSync(path.join(project, '.formal/tools/bin/dafny')));
  check('tla2tools.jar exists', existsSync(path.join(project, '.formal/tools/tla/tla2tools.jar')));
  check('dafny extracted', existsSync(path.join(project, '.formal/tools/dafny/dafny')));
  check('install-log present', existsSync(path.join(project, '.formal/tools/install-log.json')));

  // ---- 2. idempotency: re-running install with same version is a no-op ----
  console.log('# idempotent re-install');
  const r2 = await tools.install(project, { tool: 'tla' });
  check('tla re-install reports already-installed', r2.tla.status === 'already-installed');

  // ---- 3. version mismatch w/o --force is a refusal ----
  console.log('# version mismatch refusal');
  let refused = false;
  try {
    await tools.install(project, { tool: 'tla', tlaVersion: '9.9.9' });
  } catch (e) {
    refused = /already installed/.test(e.message);
  }
  check('version mismatch refused without --force', refused);

  // ---- 4. rollback on failure ----
  console.log('# rollback on failed download');
  // First uninstall the dafny entry so we have something to install.
  tools.uninstall(project, { tool: 'dafny' });
  check('dafny uninstalled', !existsSync(path.join(project, '.formal/tools/dafny')));
  // Now force the next fetch to fail.
  nextFetchShouldFail = true;
  let rollbackHappened = false;
  try {
    await tools.install(project, { tool: 'dafny' });
  } catch {
    rollbackHappened = true;
  }
  nextFetchShouldFail = false;
  check('install threw on download failure', rollbackHappened);
  check('rollback removed dafny dir', !existsSync(path.join(project, '.formal/tools/dafny')));
  check('rollback removed dafny wrapper', !existsSync(path.join(project, '.formal/tools/bin/dafny')));
  // Log entry must NOT have been written.
  const logAfter = JSON.parse(readFileSync(path.join(project, '.formal/tools/install-log.json'), 'utf8'));
  check('install-log has no dafny entry after rollback', !logAfter.tools.dafny);
  // TLA install is still intact.
  check('tla install survived dafny failure', existsSync(path.join(project, '.formal/tools/tla/tla2tools.jar')));

  // ---- 5. clean install of dafny again ----
  console.log('# recover after failure');
  const r3 = await tools.install(project, { tool: 'dafny' });
  check('dafny re-installs cleanly', r3.dafny.status === 'installed');

  // ---- 6. uninstall removes everything ----
  console.log('# uninstall all');
  const u = tools.uninstall(project, { tool: 'all' });
  check('uninstall reports tla', u.tla.status === 'uninstalled');
  check('uninstall reports dafny', u.dafny.status === 'uninstalled');
  check('tools dir gone', !existsSync(path.join(project, '.formal/tools')));

  // ---- 7. uninstall again is a no-op ----
  console.log('# uninstall idempotent');
  const u2 = tools.uninstall(project, { tool: 'all' });
  check('repeat uninstall reports not-installed', u2.tla.status === 'not-installed' && u2.dafny.status === 'not-installed');

  console.log('');
  if (failed === 0) console.log('SMOKE-TOOLS OK');
  else {
    console.log(`SMOKE-TOOLS FAILED — ${failed} check(s) failed`);
    process.exitCode = 1;
  }
} finally {
  globalThis.fetch = realFetch;
  rmSync(project, { recursive: true, force: true });
}
