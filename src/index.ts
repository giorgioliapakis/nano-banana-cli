#!/usr/bin/env node

import { Command } from 'commander';
import { resolveApiKey } from './utils/auth.js';
import { registerGenerateCommand } from './commands/generate.js';
import { registerEditCommand } from './commands/edit.js';
import { registerRestoreCommand } from './commands/restore.js';
import { registerIconCommand } from './commands/icon.js';
import { registerPatternCommand } from './commands/pattern.js';
import { registerStoryCommand } from './commands/story.js';
import { registerDiagramCommand } from './commands/diagram.js';
import { registerLoginCommand, registerLogoutCommand } from './commands/login.js';

const AUTH_REQUIRED = [
  'generate',
  'edit',
  'restore',
  'icon',
  'pattern',
  'story',
  'diagram',
];

const program = new Command();

program
  .name('nanobanana')
  .description('Generate and manipulate images with AI')
  .version('1.0.0');

program.hook('preAction', (_thisCommand, actionCommand) => {
  const cmdName = actionCommand.name();
  if (!AUTH_REQUIRED.includes(cmdName)) return;

  try {
    const opts = actionCommand.optsWithGlobals();
    const auth = resolveApiKey(opts['apiKey'] as string | undefined);
    actionCommand.setOptionValue('_authConfig', auth);
  } catch (err) {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
});

process.on('SIGINT', () => {
  process.stderr.write('\nAborted.\n');
  process.exit(130);
});

registerGenerateCommand(program);
registerEditCommand(program);
registerRestoreCommand(program);
registerIconCommand(program);
registerPatternCommand(program);
registerStoryCommand(program);
registerDiagramCommand(program);
registerLoginCommand(program);
registerLogoutCommand(program);

program.parse();
