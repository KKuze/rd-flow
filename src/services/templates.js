// Template loader + minimal variable substitution.
// Templates live under <package>/templates. We deliberately keep substitution
// simple ({{name}}) so templates remain valid documents on their own.

import path from 'node:path';
import { PKG_TEMPLATES } from './paths.js';
import { readFile, writeFileSafe } from '../utils/fs.js';

const VAR_RE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export function renderTemplate(relPath, vars = {}) {
  const src = readFile(path.join(PKG_TEMPLATES, relPath));
  return src.replace(VAR_RE, (_, key) => {
    if (key in vars) return String(vars[key]);
    return `{{${key}}}`; // leave unresolved placeholders intact
  });
}

export function writeRendered(dest, relTemplate, vars, { overwrite = false } = {}) {
  const rendered = renderTemplate(relTemplate, vars);
  return writeFileSafe(dest, rendered, { overwrite });
}
