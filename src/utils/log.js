// Tiny logger. Kept dependency-free so we can run from a fresh checkout.

const PREFIX = '[rd-flow]';

export function info(msg) {
  console.log(`${PREFIX} ${msg}`);
}

export function warn(msg) {
  console.warn(`${PREFIX} WARN ${msg}`);
}

export function error(msg) {
  console.error(`${PREFIX} ERROR ${msg}`);
}

export function step(msg) {
  console.log(`${PREFIX}   - ${msg}`);
}
