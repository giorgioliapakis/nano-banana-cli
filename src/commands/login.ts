import { Command } from 'commander';
import { saveCredentials, removeCredentials } from '../utils/credentials.js';

export function registerLoginCommand(program: Command): void {
  program
    .command('login')
    .description('Save your Gemini API key for future use')
    .option('--api-key <key>', 'API key to store')
    .action(async (opts: Record<string, unknown>) => {
      const apiKey = opts['apiKey'] as string | undefined;

      if (apiKey) {
        saveCredentials({ apiKey, keyType: 'GEMINI_API_KEY' });
        process.stderr.write('API key saved.\n');
        return;
      }

      const key = await new Promise<string>((resolve) => {
        process.stderr.write('Enter your Gemini API key: ');
        const stdin = process.stdin;
        const wasRaw = stdin.isRaw;
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');
        let input = '';
        const onData = (ch: string) => {
          if (ch === '\n' || ch === '\r' || ch === '\u0004') {
            stdin.setRawMode(wasRaw ?? false);
            stdin.pause();
            stdin.removeListener('data', onData);
            process.stderr.write('\n');
            resolve(input.trim());
          } else if (ch === '\u0003') {
            process.exit(130);
          } else if (ch === '\u007f' || ch === '\b') {
            input = input.slice(0, -1);
          } else {
            input += ch;
          }
        };
        stdin.on('data', onData);
      });

      if (!key) {
        process.stderr.write('No key provided.\n');
        process.exit(1);
      }

      saveCredentials({ apiKey: key, keyType: 'GEMINI_API_KEY' });
      process.stderr.write('API key saved.\n');
    });
}

export function registerLogoutCommand(program: Command): void {
  program
    .command('logout')
    .description('Remove stored API key')
    .action(() => {
      const removed = removeCredentials();
      if (removed) {
        process.stderr.write('API key removed.\n');
      } else {
        process.stderr.write('No stored credentials found.\n');
      }
    });
}
