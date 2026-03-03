import { Command } from 'commander';
import { AspectRatio, ImageSize, ThinkingLevel } from '../types/index.js';

export function addImageOptions(cmd: Command): Command {
  return cmd
    .option('--aspect <ratio>', 'Aspect ratio (1:1, 16:9, 9:16, 4:3, 3:2, 21:9, ...)')
    .option('--resolution <res>', 'Image resolution: 512px, 1K, 2K, 4K', '1K')
    .option('--model <model>', 'Gemini model to use (default: gemini-3.1-flash-image-preview)')
    .option('--seed <number>', 'Seed for reproducible output')
    .option('--temperature <number>', 'Sampling temperature (0.0-2.0)')
    .option('--thinking <level>', 'Thinking mode: off, low, medium, high', 'off')
    .option('--preview', 'Open result in system viewer')
    .option('-o, --output <dir>', 'Output directory')
    .option('--json', 'Output as JSON')
    .option('--api-key <key>', 'API key override');
}

export interface CommonImageOpts {
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
  seed?: number;
  temperature?: number;
  thinking?: ThinkingLevel;
  preview: boolean;
  outputDir?: string;
}

export function parseCommonOpts(opts: Record<string, unknown>): CommonImageOpts {
  return {
    aspectRatio: opts['aspect'] as AspectRatio | undefined,
    imageSize: opts['resolution'] as ImageSize | undefined,
    seed: opts['seed'] ? parseInt(String(opts['seed']), 10) : undefined,
    temperature: opts['temperature'] ? parseFloat(String(opts['temperature'])) : undefined,
    thinking: opts['thinking'] as ThinkingLevel | undefined,
    preview: Boolean(opts['preview']),
    outputDir: opts['output'] as string | undefined,
  };
}
