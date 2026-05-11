import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeFileSafe(file, content, { overwrite = false } = {}) {
  ensureDir(path.dirname(file));
  if (!overwrite && fs.existsSync(file)) return { written: false, file };
  fs.writeFileSync(file, content);
  return { written: true, file };
}

export function readFile(file) {
  return fs.readFileSync(file, 'utf8');
}

export function exists(p) {
  return fs.existsSync(p);
}

export function copyTree(src, dest, { overwrite = false } = {}) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    const results = [];
    for (const entry of fs.readdirSync(src)) {
      results.push(...copyTree(path.join(src, entry), path.join(dest, entry), { overwrite }));
    }
    return results;
  }
  return [writeFileSafe(dest, fs.readFileSync(src), { overwrite })];
}
