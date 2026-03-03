import { ImageGenerationResponse } from '../types/index.js';

export function writeJson(data: ImageGenerationResponse): void {
  const output = {
    success: data.success,
    message: data.message,
    files: data.generatedFiles || [],
    ...(data.error ? { error: data.error } : {}),
  };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

export function writeFiles(files: string[]): void {
  for (const file of files) {
    process.stdout.write(`  ${file}\n`);
  }
}
