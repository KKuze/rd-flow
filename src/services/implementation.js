import { specPaths } from './paths.js';
import { writeRendered } from './templates.js';
import { ensureDir } from '../utils/fs.js';
import { updateManifest } from './status.js';

export function scaffold(projectRoot, name) {
  const p = specPaths(projectRoot, name);
  ensureDir(p.implementation.dir);
  const vars = { spec_name: name };
  writeRendered(p.implementation.plan, 'implementation/plan.md', vars);
  writeRendered(p.implementation.mapping, 'implementation/mapping.md', vars);

  updateManifest(projectRoot, name, (m) => {
    m.artifacts.implementation_plan = 'draft';
    m.current_phase = 'implement';
    m.next_action = `Author plan.md & mapping.md, then run \`rd-flow validate ${name}\`.`;
  });
  return p.implementation;
}
