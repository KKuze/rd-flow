// Identifier helpers shared across phases.
//
// Spec names are kebab-case (enforced in services/spec.js), but TLA+ module
// names and Dafny module identifiers don't permit hyphens. `toModuleName`
// folds kebab/snake casing into PascalCase so the same spec name works as
// both a directory key and a language identifier.

export function toModuleName(name) {
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}
