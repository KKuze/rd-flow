// TLA+ / Dafny environment provisioner.
//
// Design
// ------
// Everything we install lives under `.formal/tools/`. The tree is:
//
//   .formal/tools/
//     install-log.json     ← source of truth for what we created
//     tla/
//       tla2tools.jar
//       VERSION
//     dafny/
//       dafny              ← extracted from upstream zip
//       ...
//       VERSION
//     bin/
//       tlc                ← shell wrapper -> java -cp tla2tools.jar ...
//       dafny              ← shell wrapper -> dafny/dafny
//
// Properties we guarantee:
//   - Idempotent: re-running `install` with the same version is a no-op;
//                 re-running with a different version refuses unless --force.
//   - Transactional: any failure during install rolls back every file or
//                    directory created during the call. Pre-existing files
//                    are left untouched.
//   - Self-describing: `install-log.json` is enough to fully uninstall.
//                      `uninstall` only touches paths it sees in the log.
//
// Java is a hard prerequisite for TLA+. We *probe* it but do not install
// it ourselves — installing a JVM is a platform-specific rabbit hole we
// don't want to own. Same story for `unzip`.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ensureDir } from '../utils/fs.js';
import { info, step, warn } from '../utils/log.js';

const DEFAULT_TLA_VERSION = '1.8.0';
const DEFAULT_DAFNY_VERSION = '4.9.1';

const VALID_TOOL_SELECTORS = new Set(['all', 'tla', 'dafny']);
function assertTool(which) {
  if (!VALID_TOOL_SELECTORS.has(which)) {
    throw new Error(`unknown tool '${which}' (expected: tla | dafny | all)`);
  }
}

const TLA_URL = (v) => `https://github.com/tlaplus/tlaplus/releases/download/v${v}/tla2tools.jar`;
const DAFNY_URL = (v, plat) => `https://github.com/dafny-lang/dafny/releases/download/v${v}/dafny-${v}-${plat}.zip`;

// ------------------------------------------------------------------ paths
export function toolsDir(projectRoot) {
  return path.join(projectRoot, '.formal', 'tools');
}
export function binDir(projectRoot) {
  return path.join(toolsDir(projectRoot), 'bin');
}
function logPath(projectRoot) {
  return path.join(toolsDir(projectRoot), 'install-log.json');
}

// Used by tla.js / dafny.js to prefer the local install over PATH.
export function resolveTool(projectRoot, name) {
  const local = path.join(binDir(projectRoot), name);
  return fs.existsSync(local) ? local : name;
}

// ------------------------------------------------------------------ log
function readLog(projectRoot) {
  const p = logPath(projectRoot);
  if (!fs.existsSync(p)) return { tools: {} };
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return { tools: {} };
  }
}
function writeLog(projectRoot, log) {
  ensureDir(toolsDir(projectRoot));
  fs.writeFileSync(logPath(projectRoot), JSON.stringify(log, null, 2) + '\n');
}

// ------------------------------------------------------------------ status
export function status(projectRoot) {
  const log = readLog(projectRoot);
  return {
    tla: log.tools.tla ? { installed: true, ...log.tools.tla } : { installed: false },
    dafny: log.tools.dafny ? { installed: true, ...log.tools.dafny } : { installed: false },
  };
}

// ------------------------------------------------------------------ install
export async function install(projectRoot, opts = {}) {
  const which = opts.tool || 'all';
  assertTool(which);
  const force = !!opts.force;
  const results = {};

  if (which === 'all' || which === 'tla') {
    results.tla = await installTla(projectRoot, {
      force, version: opts.tlaVersion || DEFAULT_TLA_VERSION,
    });
  }
  if (which === 'all' || which === 'dafny') {
    results.dafny = await installDafny(projectRoot, {
      force,
      version: opts.dafnyVersion || DEFAULT_DAFNY_VERSION,
      platform: opts.dafnyPlatform,
    });
  }
  return results;
}

async function installTla(projectRoot, { force, version }) {
  const log = readLog(projectRoot);
  const existing = log.tools.tla;
  if (existing && !force) {
    if (existing.version === version) {
      info(`tla ${version} already installed (no change)`);
      return { status: 'already-installed', version };
    }
    throw new Error(
      `tla already installed at version ${existing.version}; pass --force to reinstall as ${version}`,
    );
  }

  if (!hasBinary('java')) {
    throw new Error('java not found on PATH — install a JRE (e.g. `brew install openjdk`) then retry');
  }
  if (existing && force) uninstallEntry(projectRoot, 'tla');

  const tx = new Tx();
  try {
    const tla = path.join(toolsDir(projectRoot), 'tla');
    const bin = binDir(projectRoot);
    tx.mkdirIfNew(toolsDir(projectRoot));
    tx.mkdirIfNew(tla);
    tx.mkdirIfNew(bin);

    info(`downloading tla2tools.jar v${version}`);
    const jar = path.join(tla, 'tla2tools.jar');
    await download(TLA_URL(version), jar);
    tx.fileWritten(jar);
    step(`wrote ${path.relative(projectRoot, jar)}`);

    const verFile = path.join(tla, 'VERSION');
    fs.writeFileSync(verFile, version + '\n');
    tx.fileWritten(verFile);

    const tlc = path.join(bin, 'tlc');
    fs.writeFileSync(tlc, [
      '#!/usr/bin/env bash',
      'set -e',
      'DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
      'exec java -XX:+UseParallelGC -cp "$DIR/../tla/tla2tools.jar" tlc2.TLC "$@"',
      '',
    ].join('\n'));
    fs.chmodSync(tlc, 0o755);
    tx.fileWritten(tlc);
    step(`installed wrapper ${path.relative(projectRoot, tlc)}`);

    // Commit
    const log2 = readLog(projectRoot);
    log2.tools.tla = {
      installed_at: new Date().toISOString(),
      version,
      files: tx.files,
      dirs: tx.dirs,
    };
    writeLog(projectRoot, log2);
    return { status: 'installed', version, bin: tlc };
  } catch (err) {
    warn(`tla install failed (${err.message}); rolling back`);
    tx.rollback();
    throw err;
  }
}

async function installDafny(projectRoot, { force, version, platform }) {
  const log = readLog(projectRoot);
  const existing = log.tools.dafny;
  if (existing && !force) {
    if (existing.version === version) {
      info(`dafny ${version} already installed (no change)`);
      return { status: 'already-installed', version };
    }
    throw new Error(
      `dafny already installed at version ${existing.version}; pass --force to reinstall as ${version}`,
    );
  }

  if (!hasBinary('unzip')) {
    throw new Error('unzip not found on PATH — install it (e.g. `brew install unzip`) then retry');
  }
  if (!hasBinary('dotnet')) {
    warn('dotnet not found — recent Dafny self-contained builds ship the runtime, but some platforms require .NET 6+ at runtime');
  }
  if (existing && force) uninstallEntry(projectRoot, 'dafny');

  const plat = platform || dafnyPlatformId();
  const tx = new Tx();
  try {
    const tools = toolsDir(projectRoot);
    const bin = binDir(projectRoot);
    tx.mkdirIfNew(tools);
    tx.mkdirIfNew(bin);

    info(`downloading dafny v${version} (${plat})`);
    const zip = path.join(tools, '_dafny.zip');
    await download(DAFNY_URL(version, plat), zip);
    tx.fileWritten(zip);

    info('extracting dafny archive');
    const dafnyDir = path.join(tools, 'dafny');
    if (fs.existsSync(dafnyDir)) {
      throw new Error(`refusing to extract over existing ${dafnyDir}`);
    }
    const ex = spawnSync('unzip', ['-q', '-o', zip, '-d', tools], { encoding: 'utf8' });
    if (ex.status !== 0) {
      throw new Error(`unzip exited ${ex.status}: ${ex.stderr || ex.stdout}`);
    }
    if (!fs.existsSync(dafnyDir)) {
      throw new Error(`expected ${dafnyDir} after extraction; archive layout unexpected`);
    }
    tx.adoptTree(dafnyDir);

    fs.unlinkSync(zip);
    tx.forget(zip);

    const verFile = path.join(dafnyDir, 'VERSION');
    fs.writeFileSync(verFile, version + '\n');
    tx.fileWritten(verFile);

    const dafnyBin = path.join(dafnyDir, 'dafny');
    if (!fs.existsSync(dafnyBin)) {
      throw new Error(`dafny binary missing inside archive at ${dafnyBin}`);
    }
    try { fs.chmodSync(dafnyBin, 0o755); } catch { /* may already be executable */ }

    const wrapper = path.join(bin, 'dafny');
    fs.writeFileSync(wrapper, [
      '#!/usr/bin/env bash',
      'set -e',
      'DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
      'exec "$DIR/../dafny/dafny" "$@"',
      '',
    ].join('\n'));
    fs.chmodSync(wrapper, 0o755);
    tx.fileWritten(wrapper);
    step(`installed wrapper ${path.relative(projectRoot, wrapper)}`);

    const log2 = readLog(projectRoot);
    log2.tools.dafny = {
      installed_at: new Date().toISOString(),
      version,
      platform: plat,
      files: tx.files,
      dirs: tx.dirs,
    };
    writeLog(projectRoot, log2);
    return { status: 'installed', version, bin: wrapper };
  } catch (err) {
    warn(`dafny install failed (${err.message}); rolling back`);
    tx.rollback();
    throw err;
  }
}

// ------------------------------------------------------------------ uninstall
export function uninstall(projectRoot, opts = {}) {
  const which = opts.tool || 'all';
  assertTool(which);
  const results = {};
  for (const name of ['tla', 'dafny']) {
    if (which !== 'all' && which !== name) continue;
    results[name] = uninstallEntry(projectRoot, name);
  }
  // Tidy: remove bin/, tools/, log if everything is gone.
  const log = readLog(projectRoot);
  const tools = toolsDir(projectRoot);
  const bin = binDir(projectRoot);
  rmIfEmpty(bin);
  if (Object.keys(log.tools).length === 0) {
    const lp = logPath(projectRoot);
    if (fs.existsSync(lp)) fs.unlinkSync(lp);
    rmIfEmpty(tools);
  }
  return results;
}

function uninstallEntry(projectRoot, name) {
  const log = readLog(projectRoot);
  const entry = log.tools[name];
  if (!entry) return { status: 'not-installed' };

  // Files first.
  for (const f of (entry.files || []).slice().reverse()) {
    try { if (fs.existsSync(f)) fs.rmSync(f, { force: true }); } catch { /* ignore */ }
  }
  // Then directories, deepest first; only remove if empty.
  for (const d of (entry.dirs || []).slice().sort((a, b) => b.length - a.length)) {
    rmIfEmpty(d);
  }
  delete log.tools[name];
  writeLog(projectRoot, log);
  return { status: 'uninstalled', version: entry.version };
}

// ------------------------------------------------------------------ helpers
class Tx {
  constructor() {
    this.files = [];
    this.dirs = [];
  }
  mkdirIfNew(p) {
    if (fs.existsSync(p)) return;
    ensureDir(p);
    this.dirs.push(p);
  }
  fileWritten(p) {
    this.files.push(p);
  }
  forget(p) {
    this.files = this.files.filter((x) => x !== p);
  }
  // Used after a successful extraction: every file under `root` is now
  // owned by us.
  adoptTree(root) {
    this.dirs.push(root);
    for (const entry of walk(root)) {
      if (fs.statSync(entry).isDirectory()) this.dirs.push(entry);
      else this.files.push(entry);
    }
  }
  rollback() {
    for (const f of this.files.slice().reverse()) {
      try { if (fs.existsSync(f)) fs.rmSync(f, { force: true }); } catch { /* ignore */ }
    }
    for (const d of this.dirs.slice().sort((a, b) => b.length - a.length)) {
      rmIfEmpty(d);
    }
  }
}

function walk(d) {
  const out = [];
  for (const e of fs.readdirSync(d)) {
    const p = path.join(d, e);
    out.push(p);
    if (fs.statSync(p).isDirectory()) out.push(...walk(p));
  }
  return out;
}

function rmIfEmpty(d) {
  try {
    if (fs.existsSync(d) && fs.readdirSync(d).length === 0) fs.rmdirSync(d);
  } catch { /* ignore */ }
}

function hasBinary(name) {
  const probe = spawnSync(name, ['--version'], { encoding: 'utf8' });
  if (probe.error && probe.error.code === 'ENOENT') return false;
  return true;
}

// Suffixes are pinned to the default Dafny version (currently 4.9.1).
// Upstream changes its OS suffix on every minor release — e.g. v4.10
// keeps `-macos-11` / `-ubuntu-20.04`, but v4.11 bumped to `-macos-13`
// / `-ubuntu-22.04`. When changing DEFAULT_DAFNY_VERSION, re-check the
// release assets and update these in lockstep, or expect users to pass
// `--dafny-platform`.
function dafnyPlatformId() {
  const arch = process.arch;
  const platform = process.platform;
  if (platform === 'darwin') {
    if (arch === 'arm64') return 'arm64-macos-11';
    if (arch === 'x64') return 'x64-macos-11';
  }
  if (platform === 'linux' && arch === 'x64') return 'x64-ubuntu-20.04';
  throw new Error(`unsupported platform for Dafny binary: ${platform}/${arch} (override via --dafny-platform=...)`);
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`download failed (${res.status}) ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, buf);
}
