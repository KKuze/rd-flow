// Claude Code agent adapter.
//
// Right now the only difference between agents is where the skills get
// copied to. This file exists so that adding a second agent (Copilot,
// Codex, Cursor, …) is mechanical: drop a sibling module that exports the
// same shape, then wire it through `src/installer/install.js`.

export const claudeCode = {
  id: 'claude-code',
  skillsDestRelative: '.claude/skills',
};
