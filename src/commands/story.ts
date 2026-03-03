import { Command } from 'commander';
import { ImageGenerator } from '../lib/imageGenerator.js';
import { ImageGenerationRequest, AuthConfig } from '../types/index.js';
import { createSpinner } from '../utils/spinner.js';
import { writeJson, writeFiles } from '../utils/output.js';
import { addImageOptions, parseCommonOpts } from '../utils/options.js';

export function registerStoryCommand(program: Command): void {
  const cmd = new Command('story')
    .description('Generate a sequence of images that tell a visual story')
    .argument('<prompt>', 'Description of the story or process to visualize')
    .option('-n, --steps <number>', 'Number of images in sequence (2-8)', '4')
    .option('--type <type>', 'Sequence type: story|process|tutorial|timeline', 'story')
    .option('--style <style>', 'Visual consistency: consistent|evolving', 'consistent')
    .option('--layout <layout>', 'Output layout: separate|grid|comic', 'separate')
    .option('--transition <type>', 'Transition style: smooth|dramatic|fade', 'smooth');

  addImageOptions(cmd);

  cmd.action(async (prompt: string, opts: Record<string, unknown>) => {
    const auth = opts['_authConfig'] as AuthConfig;
    const isJson = Boolean(opts['json']);
    const spinner = createSpinner();
    const steps = parseInt(String(opts['steps']), 10);

    if (!isJson) spinner.start(`Generating ${steps}-step story...`);

    try {
      const common = parseCommonOpts(opts);
      const generator = new ImageGenerator(auth, undefined, opts['model'] as string | undefined);
      const request: ImageGenerationRequest = {
        prompt,
        outputCount: steps,
        mode: 'generate',
        ...common,
      };

      const result = await generator.generateStorySequence(request, {
        type: opts['type'] as string,
        style: opts['style'] as string,
        transition: opts['transition'] as string,
      });

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
