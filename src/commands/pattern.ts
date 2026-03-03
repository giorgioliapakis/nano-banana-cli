import { Command } from 'commander';
import { ImageGenerator } from '../lib/imageGenerator.js';
import { ImageGenerationRequest, AuthConfig } from '../types/index.js';
import { buildPatternPrompt } from '../lib/promptBuilders.js';
import { createSpinner } from '../utils/spinner.js';
import { writeJson, writeFiles } from '../utils/output.js';
import { addImageOptions, parseCommonOpts } from '../utils/options.js';

export function registerPatternCommand(program: Command): void {
  const cmd = new Command('pattern')
    .description('Generate seamless patterns and textures')
    .argument('<prompt>', 'Description of the pattern to generate')
    .option('--size <WxH>', 'Tile size (e.g. 256x256, 512x512)', '256x256')
    .option('--type <type>', 'Pattern type: seamless|texture|wallpaper', 'seamless')
    .option('--style <style>', 'Style: geometric|organic|abstract|floral|tech', 'abstract')
    .option('--density <level>', 'Density: sparse|medium|dense', 'medium')
    .option('--colors <scheme>', 'Colors: mono|duotone|colorful', 'colorful')
    .option('--repeat <method>', 'Repeat: tile|mirror', 'tile');

  addImageOptions(cmd);

  cmd.action(async (prompt: string, opts: Record<string, unknown>) => {
    const auth = opts['_authConfig'] as AuthConfig;
    const isJson = Boolean(opts['json']);
    const spinner = createSpinner();

    if (!isJson) spinner.start('Generating pattern...');

    try {
      const generator = new ImageGenerator(auth, undefined, opts['model'] as string | undefined);
      const patternPrompt = buildPatternPrompt({
        prompt,
        type: opts['type'] as string,
        style: opts['style'] as string,
        density: opts['density'] as string,
        colors: opts['colors'] as string,
        size: opts['size'] as string,
      });

      const common = parseCommonOpts(opts);
      const request: ImageGenerationRequest = {
        prompt: patternPrompt,
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
