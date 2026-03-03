export type AspectRatio =
  | '1:1' | '1:4' | '1:8'
  | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4'
  | '4:1' | '8:1'
  | '9:16' | '16:9' | '21:9';

export type ImageSize = '512px' | '1K' | '2K' | '4K';

export type ThinkingLevel = 'off' | 'low' | 'medium' | 'high';

export interface ImageGenerationRequest {
  prompt: string;
  inputImage?: string;
  inputImages?: string[];
  outputCount?: number;
  mode: 'generate' | 'edit' | 'restore';
  styles?: string[];
  variations?: string[];
  format?: 'grid' | 'separate';
  fileFormat?: 'png' | 'jpeg';
  seed?: number;
  temperature?: number;
  thinking?: ThinkingLevel;
  preview?: boolean;
  noPreview?: boolean;
  outputDir?: string;
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
  model?: string;
}

export interface ImageGenerationResponse {
  success: boolean;
  message: string;
  generatedFiles?: string[];
  error?: string;
}

export interface AuthConfig {
  apiKey: string;
  keyType: 'GEMINI_API_KEY' | 'GOOGLE_API_KEY';
}

export interface FileSearchResult {
  found: boolean;
  filePath?: string;
  searchedPaths: string[];
}

export interface StorySequenceArgs {
  type?: string;
  style?: string;
  transition?: string;
}

export interface IconPromptArgs {
  prompt?: string;
  type?: string;
  style?: string;
  background?: string;
  corners?: string;
}

export interface PatternPromptArgs {
  prompt?: string;
  type?: string;
  style?: string;
  density?: string;
  colors?: string;
  size?: string;
}

export interface DiagramPromptArgs {
  prompt?: string;
  type?: string;
  style?: string;
  layout?: string;
  complexity?: string;
  colors?: string;
  annotations?: string;
}

export interface Logger {
  debug: (msg: string, ...args: unknown[]) => void;
  info: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}

export const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  error: () => {},
};

export const stderrLogger: Logger = {
  debug: (...args) => console.error(...args),
  info: (...args) => console.error(...args),
  error: (...args) => console.error(...args),
};
