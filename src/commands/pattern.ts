import { Command } from 'commander';
import { ImageGenerator } from '../lib/imageGenerator.js';
import { ImageGenerationRequest, AuthConfig } from '../types/index.js';
import { createSpinner } from '../utils/spinner.js';
import { writeJson, writeFiles } from '../utils/output.js';
import { addImageOptions, parseCommonOpts } from '../utils/options.js';

export function registerPatternCommand(program: Command): void {
  const cmd = new Command('pattern')
    .description('Generate a seamless pattern from a text prompt')
    .argument('<prompt>', 'Description of the pattern to generate');

  addImageOptions(cmd);

  cmd.action(async (prompt: string, opts: Record<string, unknown>) => {
    const auth = opts['_authConfig'] as AuthConfig;
    const isJson = Boolean(opts['json']);
    const spinner = createSpinner();

    if (!isJson) spinner.start('Generating pattern...');

    try {
      const common = parseCommonOpts(opts);
      const generator = new ImageGenerator(auth, undefined, opts['model'] as string | undefined);
      const request: ImageGenerationRequest = {
        prompt: `Generate a seamless pattern: ${prompt}`,
        outputCount: 1,
        mode: 'generate',
        ...common,
      };

      const result = await generator.generateTextToImage(request);

      if (isJson) {
        writeJson(result);
      } else if (result.success) {
        spinner.succeed(result.message);
        writeFiles(result.generatedFiles || []);
      } else {
        spinner.fail(result.error || result.message);
        process.exit(1);
      }
    } catch (err) {
      if (isJson) {
        writeJson({ success: false, message: String(err), error: String(err) });
      } else {
        spinner.fail(err instanceof Error ? err.message : String(err));
      }
      process.exit(1);
    }
  });

  program.addCommand(cmd);
}
