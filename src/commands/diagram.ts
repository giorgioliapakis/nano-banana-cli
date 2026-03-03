import { Command } from 'commander';
import { ImageGenerator } from '../lib/imageGenerator.js';
import { ImageGenerationRequest, AuthConfig } from '../types/index.js';
import { buildDiagramPrompt } from '../lib/promptBuilders.js';
import { createSpinner } from '../utils/spinner.js';
import { writeJson, writeFiles } from '../utils/output.js';
import { addImageOptions, parseCommonOpts } from '../utils/options.js';

export function registerDiagramCommand(program: Command): void {
  const cmd = new Command('diagram')
    .description('Generate technical diagrams and flowcharts')
    .argument('<prompt>', 'Description of the diagram to generate')
    .option('--type <type>', 'Diagram type: flowchart|architecture|network|database|wireframe|mindmap|sequence', 'flowchart')
    .option('--style <style>', 'Visual style: professional|clean|hand-drawn|technical', 'professional')
    .option('--layout <layout>', 'Layout: horizontal|vertical|hierarchical|circular', 'hierarchical')
    .option('--complexity <level>', 'Detail level: simple|detailed|comprehensive', 'detailed')
    .option('--colors <scheme>', 'Color scheme: mono|accent|categorical', 'accent')
    .option('--annotations <level>', 'Annotation level: minimal|detailed', 'detailed');

  addImageOptions(cmd);

  cmd.action(async (prompt: string, opts: Record<string, unknown>) => {
    const auth = opts['_authConfig'] as AuthConfig;
    const isJson = Boolean(opts['json']);
    const spinner = createSpinner();

    if (!isJson) spinner.start('Generating diagram...');

    try {
      const generator = new ImageGenerator(auth, undefined, opts['model'] as string | undefined);
      const diagramPrompt = buildDiagramPrompt({
        prompt,
        type: opts['type'] as string,
        style: opts['style'] as string,
        layout: opts['layout'] as string,
        complexity: opts['complexity'] as string,
        colors: opts['colors'] as string,
        annotations: opts['annotations'] as string,
      });

      const common = parseCommonOpts(opts);
      const request: ImageGenerationRequest = {
        prompt: diagramPrompt,
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
