import { Command } from 'commander';
import { saveCredentials, removeCredentials } from '../utils/credentials.js';
import * as readline from 'readline';

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

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stderr,
      });

      const key = await new Promise<string>((resolve) => {
        rl.question('Enter your Gemini API key: ', (answer) => {
          rl.close();
          resolve(answer.trim());
        });
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
