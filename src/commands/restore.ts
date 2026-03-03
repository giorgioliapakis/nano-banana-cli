import { Command } from 'commander';
import { ImageGenerator } from '../lib/imageGenerator.js';
import { ImageGenerationRequest, AuthConfig } from '../types/index.js';
import { createSpinner } from '../utils/spinner.js';
import { writeJson, writeFiles } from '../utils/output.js';
import { addImageOptions, parseCommonOpts } from '../utils/options.js';

export function registerRestoreCommand(program: Command): void {
  const cmd = new Command('restore')
    .description('Restore or enhance existing images')
    .argument('<files...>', 'Image file(s) to restore, followed by prompt as last argument');

  addImageOptions(cmd);

  cmd.action(async (filesAndPrompt: string[], opts: Record<string, unknown>) => {
    const auth = opts['_authConfig'] as AuthConfig;
    const isJson = Boolean(opts['json']);
    const spinner = createSpinner();

    if (filesAndPrompt.length < 2) {
      process.stderr.write('Error: Provide at least one file and a prompt.\n');
      process.stderr.write('Usage: nanobanana restore <file(s)> "prompt"\n');
      process.exit(1);
    }

    const prompt = filesAndPrompt[filesAndPrompt.length - 1];
    const files = filesAndPrompt.slice(0, -1);

    if (!isJson) spinner.start('Restoring image...');

    try {
      const common = parseCommonOpts(opts);
      const generator = new ImageGenerator(auth, undefined, opts['model'] as string | undefined);
      const baseRequest: Partial<ImageGenerationRequest> = {
        prompt,
        mode: 'restore',
        ...common,
      };

      let result;
      if (files.length === 1) {
        result = await generator.editImage({ ...baseRequest, inputImage: files[0] } as ImageGenerationRequest);
      } else {
        result = await generator.editBatch(files, baseRequest as ImageGenerationRequest);
      }

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
