// Spec status / manifest service.
//
// Two artefacts per spec:
//   - manifest.yaml: the *machine-readable* source of truth.
//   - status.md:     a *rendered* human-readable view.
//
// We keep our own minimal YAML serializer for the shape we use (flat keys +
// nested objects of strings and arrays of strings). Anything richer should
// trigger a switch to a real YAML lib.

import fs from 'node:fs';
import { specPaths } from './paths.js';
import { ensureDir, writeFileSafe } from '../utils/fs.js';

export const PHASES = [
  'discovery',
  'requirements',
  'tla-model',
  'tla-check',
  'dafny-refine',
  'dafny-prove',
  'implement',
  'validate',
];

export function initialManifest(name) {
  return {
    spec: name,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    current_phase: 'discovery',
    artifacts: {
      brief: 'pending',
      requirements: 'pending',
      tla_model: 'pending',
      tla_check: 'pending',
      dafny_spec: 'pending',
      dafny_proof: 'pending',
      implementation_plan: 'pending',
    },
    checks: {
      tla: { status: 'pending', last_run: null, summary: '' },
      dafny: { status: 'pending', last_run: null, summary: '' },
    },
    blockers: [],
    next_action: 'Fill in requirements.md, then run `rd-flow tla scaffold`.',
  };
}

export function readManifest(projectRoot, name) {
  const p = specPaths(projectRoot, name);
  if (!fs.existsSync(p.manifestYaml)) return null;
  return parseYaml(fs.readFileSync(p.manifestYaml, 'utf8'));
}

export function writeManifest(projectRoot, name, manifest) {
  const p = specPaths(projectRoot, name);
  ensureDir(p.root);
  manifest.updated = new Date().toISOString();
  fs.writeFileSync(p.manifestYaml, dumpYaml(manifest));
  renderStatusMd(projectRoot, name, manifest);
  return manifest;
}

export function updateManifest(projectRoot, name, mutator) {
  const current = readManifest(projectRoot, name);
  if (!current) throw new Error(`spec '${name}' has no manifest.yaml`);
  mutator(current);
  return writeManifest(projectRoot, name, current);
}

function renderStatusMd(projectRoot, name, m) {
  const p = specPaths(projectRoot, name);
  const lines = [];
  lines.push(`# Status: ${m.spec}`);
  lines.push('');
  lines.push(`- Current phase: **${m.current_phase}**`);
  lines.push(`- Created: ${m.created}`);
  lines.push(`- Updated: ${m.updated}`);
  lines.push('');
  lines.push('## Artifacts');
  for (const [k, v] of Object.entries(m.artifacts)) {
    lines.push(`- ${k}: ${v}`);
  }
  lines.push('');
  lines.push('## Checks');
  lines.push(`- TLA+: ${m.checks.tla.status}` + (m.checks.tla.last_run ? ` (last: ${m.checks.tla.last_run})` : ''));
  if (m.checks.tla.summary) lines.push(`  - ${m.checks.tla.summary}`);
  lines.push(`- Dafny: ${m.checks.dafny.status}` + (m.checks.dafny.last_run ? ` (last: ${m.checks.dafny.last_run})` : ''));
  if (m.checks.dafny.summary) lines.push(`  - ${m.checks.dafny.summary}`);
  lines.push('');
  lines.push('## Blockers');
  if (!m.blockers.length) lines.push('- (none)');
  else for (const b of m.blockers) lines.push(`- ${b}`);
  lines.push('');
  lines.push('## Next action');
  lines.push(m.next_action || '(none)');
  lines.push('');
  writeFileSafe(p.statusMd, lines.join('\n'), { overwrite: true });
}

// ---------------- minimal YAML helpers ----------------
// Intentionally small; covers our schema only.

function dumpYaml(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      lines.push(`${pad}${k}: null`);
    } else if (Array.isArray(v)) {
      if (!v.length) {
        lines.push(`${pad}${k}: []`);
      } else {
        lines.push(`${pad}${k}:`);
        for (const item of v) {
          lines.push(`${pad}  - ${scalar(item)}`);
        }
      }
    } else if (typeof v === 'object') {
      lines.push(`${pad}${k}:`);
      lines.push(dumpYaml(v, indent + 1));
    } else {
      lines.push(`${pad}${k}: ${scalar(v)}`);
    }
  }
  return lines.join('\n');
}

function scalar(v) {
  if (v === null) return 'null';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  if (/^[\w\-:./@T+Z]+$/.test(s) && s.length < 80) return s;
  return JSON.stringify(s); // JSON strings are valid YAML strings
}

function parseYaml(text) {
  // Very small parser tailored to what dumpYaml writes.
  const lines = text.split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, value: root }];

  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = raw.match(/^ */)[0].length;
    const line = raw.slice(indent);

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].value;

    if (line.startsWith('- ')) {
      const item = parseScalar(line.slice(2));
      if (!Array.isArray(parent.__list)) parent.__list = [];
      parent.__list.push(item);
      continue;
    }

    const colon = line.indexOf(':');
    const key = line.slice(0, colon).trim();
    const rest = line.slice(colon + 1).trim();
    if (rest === '') {
      const obj = {};
      parent[key] = obj;
      stack.push({ indent, value: obj });
    } else if (rest === '[]') {
      parent[key] = [];
    } else {
      parent[key] = parseScalar(rest);
    }
  }

  // Convert any nested __list collectors into actual arrays bound to a parent key.
  // (Our shape never mixes list + map at the same level, so this is fine.)
  return normaliseLists(root);
}

function parseScalar(s) {
  if (s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s.startsWith('"') && s.endsWith('"')) {
    try { return JSON.parse(s); } catch { return s.slice(1, -1); }
  }
  return s;
}

function normaliseLists(node) {
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    if ('__list' in node) {
      return node.__list;
    }
    for (const k of Object.keys(node)) {
      node[k] = normaliseLists(node[k]);
    }
  }
  return node;
}
