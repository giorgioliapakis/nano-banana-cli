import { Command } from 'commander';
import { ImageGenerator } from '../lib/imageGenerator.js';
import { ImageGenerationRequest, AuthConfig } from '../types/index.js';
import { createSpinner } from '../utils/spinner.js';
import { writeJson, writeFiles } from '../utils/output.js';
import { addImageOptions, parseCommonOpts } from '../utils/options.js';

export function registerEditCommand(program: Command): void {
  const cmd = new Command('edit')
    .description('Edit existing images with a text prompt')
    .argument('<files...>', 'Image file(s) to edit, followed by prompt as last argument')
    .option('--ref <file>', 'Reference image(s) for combined context (repeatable)', collectRef, []);

  addImageOptions(cmd);

  cmd.action(async (filesAndPrompt: string[], opts: Record<string, unknown>) => {
    const auth = opts['_authConfig'] as AuthConfig;
    const isJson = Boolean(opts['json']);
    const spinner = createSpinner();
    const refs = opts['ref'] as string[];

    if (filesAndPrompt.length < 2 && refs.length === 0) {
      process.stderr.write('Error: Provide at least one file and a prompt.\n');
      process.stderr.write('Usage: nanobanana edit <file(s)> "prompt"\n');
      process.stderr.write('       nanobanana edit --ref file1.png --ref file2.png "prompt"\n');
      process.exit(1);
    }

    let prompt: string;
    let files: string[];

    if (refs.length > 0) {
      prompt = filesAndPrompt.join(' ');
      files = [];
    } else {
      prompt = filesAndPrompt[filesAndPrompt.length - 1];
      files = filesAndPrompt.slice(0, -1);
    }

    if (!isJson) spinner.start('Editing image...');

    try {
      const common = parseCommonOpts(opts);
      const generator = new ImageGenerator(auth, undefined, opts['model'] as string | undefined);
      const baseRequest: Partial<ImageGenerationRequest> = {
        prompt,
        mode: 'edit',
        ...common,
      };

      let result;
      if (refs.length > 0) {
        result = await generator.editImage({ ...baseRequest, inputImages: refs } as ImageGenerationRequest);
      } else if (files.length === 1) {
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

function collectRef(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}
