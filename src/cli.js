// rd-flow CLI.
//
// Thin command dispatcher. Each command is a one-liner that calls into the
// service layer. Keep it that way — anything else belongs in src/services/.

import path from 'node:path';
import { install } from './installer/install.js';
import * as workflow from './services/workflow.js';
import * as tla from './services/tla.js';
import * as dafny from './services/dafny.js';
import * as impl from './services/implementation.js';
import * as tools from './services/tools.js';
import { info, error } from './utils/log.js';

const HELP = `rd-flow — refinement-driven workflow scaffold

Usage:
  rd-flow init [--force] [--agent <name>]
  rd-flow spec new <name> [--title "..."] [--summary "..."]
  rd-flow spec list
  rd-flow status [<name>]
  rd-flow tla scaffold <name>
  rd-flow tla check <name>
  rd-flow dafny scaffold <name>
  rd-flow dafny verify <name>
  rd-flow impl scaffold <name>
  rd-flow advance <name> <phase>
  rd-flow tools install   [--tool tla|dafny|all] [--force]
                          [--tla-version <v>] [--dafny-version <v>]
                          [--dafny-platform <id>]
  rd-flow tools uninstall [--tool tla|dafny|all]
  rd-flow tools status
  rd-flow help

Phases: discovery | requirements | tla-model | tla-check |
        dafny-refine | dafny-prove | implement | validate
`;

export async function run(argv) {
  const cwd = process.cwd();
  const [cmd, sub, ...rest] = argv;

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    process.stdout.write(HELP);
    return;
  }

  switch (cmd) {
    case 'init': {
      const opts = parseFlags(argv.slice(1));
      install(cwd, { force: !!opts.force, agent: opts.agent || 'claude-code' });
      return;
    }
    case 'spec': {
      if (sub === 'new') {
        const [name, ...flagArgs] = rest;
        if (!name) throw new Error('spec new: missing <name>');
        const opts = parseFlags(flagArgs);
        const result = workflow.createSpec(cwd, name, { title: opts.title, summary: opts.summary });
        info(`spec '${result.name}' created at ${path.relative(cwd, result.root)}`);
        return;
      }
      if (sub === 'list') {
        const names = workflow.specs(cwd);
        if (!names.length) info('(no specs yet)');
        else names.forEach((n) => process.stdout.write(`${n}\n`));
        return;
      }
      throw new Error(`unknown subcommand: spec ${sub}`);
    }
    case 'status': {
      const result = workflow.status(cwd, sub);
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      return;
    }
    case 'tla': {
      if (sub === 'scaffold') {
        ensureName(rest[0], 'tla scaffold');
        tla.scaffold(cwd, rest[0]);
        info(`TLA+ scaffold materialised for '${rest[0]}'`);
        return;
      }
      if (sub === 'check') {
        ensureName(rest[0], 'tla check');
        const r = tla.runCheck(cwd, rest[0]);
        info(`TLA+ check status: ${r.status} — see ${path.relative(cwd, r.report)}`);
        return;
      }
      throw new Error(`unknown subcommand: tla ${sub}`);
    }
    case 'dafny': {
      if (sub === 'scaffold') {
        ensureName(rest[0], 'dafny scaffold');
        dafny.scaffold(cwd, rest[0]);
        info(`Dafny scaffold materialised for '${rest[0]}'`);
        return;
      }
      if (sub === 'verify') {
        ensureName(rest[0], 'dafny verify');
        const r = dafny.runVerify(cwd, rest[0]);
        info(`Dafny verify status: ${r.status} — see ${path.relative(cwd, r.report)}`);
        return;
      }
      throw new Error(`unknown subcommand: dafny ${sub}`);
    }
    case 'impl': {
      if (sub === 'scaffold') {
        ensureName(rest[0], 'impl scaffold');
        impl.scaffold(cwd, rest[0]);
        info(`implementation scaffold materialised for '${rest[0]}'`);
        return;
      }
      throw new Error(`unknown subcommand: impl ${sub}`);
    }
    case 'tools': {
      if (sub === 'install') {
        const opts = parseFlags(rest);
        const result = await tools.install(cwd, {
          tool: typeof opts.tool === 'string' ? opts.tool : 'all',
          force: !!opts.force,
          tlaVersion: typeof opts['tla-version'] === 'string' ? opts['tla-version'] : undefined,
          dafnyVersion: typeof opts['dafny-version'] === 'string' ? opts['dafny-version'] : undefined,
          dafnyPlatform: typeof opts['dafny-platform'] === 'string' ? opts['dafny-platform'] : undefined,
        });
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        return;
      }
      if (sub === 'uninstall') {
        const opts = parseFlags(rest);
        const result = tools.uninstall(cwd, {
          tool: typeof opts.tool === 'string' ? opts.tool : 'all',
        });
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        return;
      }
      if (sub === 'status') {
        process.stdout.write(JSON.stringify(tools.status(cwd), null, 2) + '\n');
        return;
      }
      throw new Error(`unknown subcommand: tools ${sub}`);
    }
    case 'advance': {
      const [name, phase] = [sub, rest[0]];
      if (!name || !phase) throw new Error('advance: usage `rd-flow advance <name> <phase>`');
      workflow.advance(cwd, name, phase);
      info(`spec '${name}' advanced to '${phase}'`);
      return;
    }
    default:
      throw new Error(`unknown command: ${cmd} (run \`rd-flow help\`)`);
  }
}

function ensureName(name, ctx) {
  if (!name) throw new Error(`${ctx}: missing <name>`);
}

function parseFlags(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = args[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}
