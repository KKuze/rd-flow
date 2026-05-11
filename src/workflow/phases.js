// Canonical phase ordering for the refinement-driven workflow.
// Kept separate from `services/status.js` so non-status consumers can import
// the list without pulling in YAML helpers.

export const PHASE_ORDER = [
  'discovery',
  'requirements',
  'tla-model',
  'tla-check',
  'dafny-refine',
  'dafny-prove',
  'implement',
  'validate',
];

export function nextPhase(current) {
  const i = PHASE_ORDER.indexOf(current);
  if (i < 0 || i === PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[i + 1];
}
