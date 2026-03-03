import { Command } from 'commander';
import { ImageGenerator } from '../lib/imageGenerator.js';
import { ImageGenerationRequest, AuthConfig } from '../types/index.js';
import { buildIconPrompt } from '../lib/promptBuilders.js';
import { createSpinner } from '../utils/spinner.js';
import { writeJson, writeFiles } from '../utils/output.js';
import { addImageOptions, parseCommonOpts } from '../utils/options.js';

export function registerIconCommand(program: Command): void {
  const cmd = new Command('icon')
    .description('Generate app icons, favicons, and UI elements')
    .argument('<prompt>', 'Description of the icon to generate')
    .option('--sizes <sizes>', 'Comma-separated sizes in px (e.g. 64,128,256,512)')
    .option('--type <type>', 'Icon type: app-icon|favicon|ui-element', 'app-icon')
    .option('--style <style>', 'Visual style: flat|skeuomorphic|minimal|modern', 'modern')
    .option('--file-format <format>', 'Output format: png|jpeg', 'png')
    .option('--background <bg>', 'Background: transparent|white|black|<color>', 'transparent')
    .option('--corners <type>', 'Corner style: rounded|sharp', 'rounded');

  addImageOptions(cmd);

  cmd.action(async (prompt: string, opts: Record<string, unknown>) => {
    const auth = opts['_authConfig'] as AuthConfig;
    const isJson = Boolean(opts['json']);
    const spinner = createSpinner();

    const sizes = opts['sizes']
      ? String(opts['sizes']).split(',').map(Number)
      : undefined;

    if (!isJson) spinner.start('Generating icon...');

    try {
      const generator = new ImageGenerator(auth, undefined, opts['model'] as string | undefined);
      const iconPrompt = buildIconPrompt({
        prompt,
        type: opts['type'] as string,
        style: opts['style'] as string,
        background: opts['background'] as string,
        corners: opts['corners'] as string,
      });

      const common = parseCommonOpts(opts);
      const request: ImageGenerationRequest = {
        prompt: iconPrompt,
        outputCount: sizes?.length || 1,
        mode: 'generate',
        fileFormat: opts['fileFormat'] as 'png' | 'jpeg',
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
