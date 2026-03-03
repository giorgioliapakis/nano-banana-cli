import { GoogleGenAI } from '@google/genai';
import { FileHandler } from './fileHandler.js';
import {
  ImageGenerationRequest,
  ImageGenerationResponse,
  AuthConfig,
  StorySequenceArgs,
  Logger,
  silentLogger,
  ThinkingLevel,
} from '../types/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ImageGenerator {
  private ai: GoogleGenAI;
  private modelName: string;
  private logger: Logger;
  private static readonly DEFAULT_MODEL = 'gemini-3.1-flash-image-preview';

  constructor(authConfig: AuthConfig, logger: Logger = silentLogger, model?: string) {
    this.ai = new GoogleGenAI({ apiKey: authConfig.apiKey });
    this.logger = logger;
    this.modelName =
      model || process.env.NANOBANANA_MODEL || ImageGenerator.DEFAULT_MODEL;
    this.logger.debug(`Using image model: ${this.modelName}`);
  }

  private buildConfig(request: ImageGenerationRequest): Record<string, unknown> {
    const imageConfig: Record<string, unknown> = {};
    if (request.aspectRatio) {
      imageConfig.aspectRatio = request.aspectRatio;
    }
    if (request.imageSize) {
      imageConfig.imageSize = request.imageSize;
    }

    const config: Record<string, unknown> = {
      responseModalities: ['IMAGE'],
      personGeneration: 'ALLOW_ALL',
    };

    if (Object.keys(imageConfig).length > 0) {
      config.imageConfig = imageConfig;
    }

    if (request.seed !== undefined) {
      config.seed = request.seed;
    }
    if (request.temperature !== undefined) {
      config.temperature = request.temperature;
    }
    if (request.thinking && request.thinking !== 'off') {
      config.thinkingConfig = {
        thinkingLevel: request.thinking.toUpperCase(),
      };
    }

    return config;
  }

  private async openImagePreview(filePath: string): Promise<void> {
    try {
      let command: string;
      switch (process.platform) {
        case 'darwin':
          command = `open "${filePath}"`;
          break;
        case 'win32':
          command = `start "" "${filePath}"`;
          break;
        default:
          command = `xdg-open "${filePath}"`;
          break;
      }
      await execAsync(command);
    } catch {
      // Preview failure shouldn't break image generation
    }
  }

  private shouldAutoPreview(request: ImageGenerationRequest): boolean {
    if (request.noPreview) return false;
    if (request.preview) return true;
    return false;
  }

  private async handlePreview(
    files: string[],
    request: ImageGenerationRequest,
  ): Promise<void> {
    if (!this.shouldAutoPreview(request) || !files.length) return;
    const previewPromises = files.map((file) => this.openImagePreview(file));
    await Promise.all(previewPromises);
  }

  static validateAuthentication(): AuthConfig {
    const envKeys: Array<{
      name: string;
      keyType: 'GEMINI_API_KEY' | 'GOOGLE_API_KEY';
    }> = [
      { name: 'NANOBANANA_GEMINI_API_KEY', keyType: 'GEMINI_API_KEY' },
      { name: 'NANOBANANA_GOOGLE_API_KEY', keyType: 'GOOGLE_API_KEY' },
      { name: 'GEMINI_API_KEY', keyType: 'GEMINI_API_KEY' },
      { name: 'GOOGLE_API_KEY', keyType: 'GOOGLE_API_KEY' },
    ];

    for (const { name, keyType } of envKeys) {
      const value = process.env[name];
      if (value) {
        return { apiKey: value, keyType };
      }
    }

    throw new Error(
      'No API key found. Run `nanobanana login` or set GEMINI_API_KEY environment variable.',
    );
  }

  private isValidBase64ImageData(data: string): boolean {
    if (!data || data.length < 1000) return false;
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(data);
  }

  private buildBatchPrompts(request: ImageGenerationRequest): string[] {
    const prompts: string[] = [];
    const basePrompt = request.prompt;

    if (!request.styles && !request.variations && !request.outputCount) {
      return [basePrompt];
    }

    if (request.styles && request.styles.length > 0) {
      for (const style of request.styles) {
        prompts.push(`${basePrompt}, ${style} style`);
      }
    }

    if (request.variations && request.variations.length > 0) {
      const basePrompts = prompts.length > 0 ? prompts : [basePrompt];
      const variationPrompts: string[] = [];

      for (const baseP of basePrompts) {
        for (const variation of request.variations) {
          const variations: Record<string, string[]> = {
            lighting: ['dramatic lighting', 'soft lighting'],
            angle: ['from above', 'close-up view'],
            'color-palette': ['warm color palette', 'cool color palette'],
            composition: [
              'centered composition',
              'rule of thirds composition',
            ],
            mood: ['cheerful mood', 'dramatic mood'],
            season: ['in spring', 'in winter'],
            'time-of-day': ['at sunrise', 'at sunset'],
          };
          const mods = variations[variation];
          if (mods) {
            for (const mod of mods) {
              variationPrompts.push(`${baseP}, ${mod}`);
            }
          }
        }
      }
      if (variationPrompts.length > 0) {
        prompts.splice(0, prompts.length, ...variationPrompts);
      }
    }

    if (
      prompts.length === 0 &&
      request.outputCount &&
      request.outputCount > 1
    ) {
      for (let i = 0; i < request.outputCount; i++) {
        prompts.push(basePrompt);
      }
    }

    if (request.outputCount && prompts.length > request.outputCount) {
      prompts.splice(request.outputCount);
    }

    return prompts.length > 0 ? prompts : [basePrompt];
  }

  private extractImageFromResponse(
    parts: Array<{ inlineData?: { data: string; mimeType?: string }; text?: string }>,
  ): string | undefined {
    for (const part of parts) {
      if (part.inlineData?.data) {
        return part.inlineData.data;
      }
      if (part.text && this.isValidBase64ImageData(part.text)) {
        return part.text;
      }
    }
    return undefined;
  }

  async generateTextToImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResponse> {
    try {
      const outputPath = FileHandler.ensureOutputDirectory(request.outputDir);
      const generatedFiles: string[] = [];
      const prompts = this.buildBatchPrompts(request);
      let firstError: string | null = null;

      this.logger.debug(`Generating ${prompts.length} image variation(s)`);
      const config = this.buildConfig(request);

      for (let i = 0; i < prompts.length; i++) {
        const currentPrompt = prompts[i];
        this.logger.debug(
          `Generating variation ${i + 1}/${prompts.length}: ${currentPrompt}`,
        );

        try {
          const response = await this.ai.models.generateContent({
            model: this.modelName,
            contents: [
              { role: 'user', parts: [{ text: currentPrompt }] },
            ],
            config,
          });

          const parts = response.candidates?.[0]?.content?.parts;
          if (parts) {
            const imageBase64 = this.extractImageFromResponse(parts as Array<{ inlineData?: { data: string; mimeType?: string }; text?: string }>);
            if (imageBase64) {
              const filename = FileHandler.generateFilename(
                request.styles || request.variations
                  ? currentPrompt
                  : request.prompt,
                request.fileFormat,
                i,
                request.outputDir,
              );
              const fullPath = await FileHandler.saveImageFromBase64(
                imageBase64,
                outputPath,
                filename,
              );
              generatedFiles.push(fullPath);
            }
          }
        } catch (error: unknown) {
          const errorMessage = this.handleApiError(error);
          if (!firstError) firstError = errorMessage;
          this.logger.error(`Error generating variation ${i + 1}: ${errorMessage}`);

          if (errorMessage.toLowerCase().includes('authentication failed')) {
            return {
              success: false,
              message: 'Image generation failed',
              error: errorMessage,
            };
          }
        }
      }

      if (generatedFiles.length === 0) {
        return {
          success: false,
          message: 'Failed to generate any images',
          error: firstError || 'No image data found in API responses',
        };
      }

      await this.handlePreview(generatedFiles, request);

      return {
        success: true,
        message: `Successfully generated ${generatedFiles.length} image variation(s)`,
        generatedFiles,
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: 'Failed to generate image',
        error: this.handleApiError(error),
      };
    }
  }

  async generateStorySequence(
    request: ImageGenerationRequest,
    args?: StorySequenceArgs,
  ): Promise<ImageGenerationResponse> {
    try {
      const outputPath = FileHandler.ensureOutputDirectory(request.outputDir);
      const generatedFiles: string[] = [];
      const steps = request.outputCount || 4;
      const type = args?.type || 'story';
      const style = args?.style || 'consistent';
      const transition = args?.transition || 'smooth';
      let firstError: string | null = null;

      this.logger.debug(`Generating ${steps}-step ${type} sequence`);
      const config = this.buildConfig(request);

      for (let i = 0; i < steps; i++) {
        const stepNumber = i + 1;
        let stepPrompt = `${request.prompt}, step ${stepNumber} of ${steps}`;

        switch (type) {
          case 'story':
            stepPrompt += `, narrative sequence, ${style} art style`;
            break;
          case 'process':
            stepPrompt += `, procedural step, instructional illustration`;
            break;
          case 'tutorial':
            stepPrompt += `, tutorial step, educational diagram`;
            break;
          case 'timeline':
            stepPrompt += `, chronological progression, timeline visualization`;
            break;
        }

        if (i > 0) {
          stepPrompt += `, ${transition} transition from previous step`;
        }

        this.logger.debug(`Generating step ${stepNumber}: ${stepPrompt}`);

        try {
          const response = await this.ai.models.generateContent({
            model: this.modelName,
            contents: [
              { role: 'user', parts: [{ text: stepPrompt }] },
            ],
            config,
          });

          const parts = response.candidates?.[0]?.content?.parts;
          if (parts) {
            const imageBase64 = this.extractImageFromResponse(parts as Array<{ inlineData?: { data: string; mimeType?: string }; text?: string }>);
            if (imageBase64) {
              const filename = FileHandler.generateFilename(
                `${type}_step${stepNumber}_${request.prompt}`,
                'png',
                0,
                request.outputDir,
              );
              const fullPath = await FileHandler.saveImageFromBase64(
                imageBase64,
                outputPath,
                filename,
              );
              generatedFiles.push(fullPath);
            }
          }
        } catch (error: unknown) {
          const errorMessage = this.handleApiError(error);
          if (!firstError) firstError = errorMessage;
          this.logger.error(`Error generating step ${stepNumber}: ${errorMessage}`);
          if (errorMessage.toLowerCase().includes('authentication failed')) {
            return {
              success: false,
              message: 'Story generation failed',
              error: errorMessage,
            };
          }
        }
      }

      if (generatedFiles.length === 0) {
        return {
          success: false,
          message: 'Failed to generate any story sequence images',
          error: firstError || 'No image data found in API responses',
        };
      }

      await this.handlePreview(generatedFiles, request);

      const wasFullySuccessful = generatedFiles.length === steps;
      const successMessage = wasFullySuccessful
        ? `Successfully generated complete ${steps}-step ${type} sequence`
        : `Generated ${generatedFiles.length} out of ${steps} requested ${type} steps`;

      return {
        success: true,
        message: successMessage,
        generatedFiles,
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: 'Failed to generate story sequence',
        error: this.handleApiError(error),
      };
    }
  }

  async editImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResponse> {
    try {
      if (!request.inputImage && (!request.inputImages || request.inputImages.length === 0)) {
        return {
          success: false,
          message: 'Input image file is required for editing',
          error: 'Missing inputImage parameter',
        };
      }

      const outputPath = FileHandler.ensureOutputDirectory(request.outputDir);

      // Multi-reference mode: combine multiple images as context for one output
      if (request.inputImages && request.inputImages.length > 0) {
        return this.editWithMultipleInputs(request, outputPath);
      }

      // Single or batch mode
      const fileResult = FileHandler.findInputFile(request.inputImage!);
      if (!fileResult.found) {
        return {
          success: false,
          message: `Input image not found: ${request.inputImage}`,
          error: `Searched in: ${fileResult.searchedPaths.join(', ')}`,
        };
      }

      const imageBase64 = await FileHandler.readImageAsBase64(fileResult.filePath!);
      const config = this.buildConfig(request);

      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: [
          {
            role: 'user',
            parts: [
              { text: request.prompt },
              { inlineData: { data: imageBase64, mimeType: 'image/png' } },
            ],
          },
        ],
        config,
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        const resultImageBase64 = this.extractImageFromResponse(parts as Array<{ inlineData?: { data: string; mimeType?: string }; text?: string }>);
        if (resultImageBase64) {
          const filename = FileHandler.generateFilename(
            `${request.mode}_${request.prompt}`,
            'png',
            0,
            request.outputDir,
          );
          const fullPath = await FileHandler.saveImageFromBase64(
            resultImageBase64,
            outputPath,
            filename,
          );
          const generatedFiles = [fullPath];
          await this.handlePreview(generatedFiles, request);
          return {
            success: true,
            message: `Successfully ${request.mode}d image`,
            generatedFiles,
          };
        }
      }

      return {
        success: false,
        message: `Failed to ${request.mode} image`,
        error: 'No image data in response',
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: `Failed to ${request.mode} image`,
        error: this.handleApiError(error),
      };
    }
  }

  private async editWithMultipleInputs(
    request: ImageGenerationRequest,
    outputPath: string,
  ): Promise<ImageGenerationResponse> {
    const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [
      { text: request.prompt },
    ];

    for (const imagePath of request.inputImages!) {
      const fileResult = FileHandler.findInputFile(imagePath);
      if (!fileResult.found) {
        return {
          success: false,
          message: `Input image not found: ${imagePath}`,
          error: `Searched in: ${fileResult.searchedPaths.join(', ')}`,
        };
      }
      const imageBase64 = await FileHandler.readImageAsBase64(fileResult.filePath!);
      parts.push({ inlineData: { data: imageBase64, mimeType: 'image/png' } });
    }

    const config = this.buildConfig(request);

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: [{ role: 'user', parts }],
      config,
    });

    const responseParts = response.candidates?.[0]?.content?.parts;
    if (responseParts) {
      const resultImageBase64 = this.extractImageFromResponse(responseParts as Array<{ inlineData?: { data: string; mimeType?: string }; text?: string }>);
      if (resultImageBase64) {
        const filename = FileHandler.generateFilename(
          `${request.mode}_${request.prompt}`,
          'png',
          0,
          request.outputDir,
        );
        const fullPath = await FileHandler.saveImageFromBase64(
          resultImageBase64,
          outputPath,
          filename,
        );
        const generatedFiles = [fullPath];
        await this.handlePreview(generatedFiles, request);
        return {
          success: true,
          message: `Successfully ${request.mode}d image with ${request.inputImages!.length} reference images`,
          generatedFiles,
        };
      }
    }

    return {
      success: false,
      message: `Failed to ${request.mode} image`,
      error: 'No image data in response',
    };
  }

  async editBatch(
    files: string[],
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResponse> {
    const outputPath = FileHandler.ensureOutputDirectory(request.outputDir);
    const generatedFiles: string[] = [];
    let firstError: string | null = null;

    for (let i = 0; i < files.length; i++) {
      this.logger.debug(`Processing file ${i + 1}/${files.length}: ${files[i]}`);
      const singleRequest: ImageGenerationRequest = {
        ...request,
        inputImage: files[i],
      };

      const result = await this.editImage(singleRequest);
      if (result.success && result.generatedFiles) {
        generatedFiles.push(...result.generatedFiles);
      } else if (!firstError) {
        firstError = result.error || result.message;
      }
    }

    if (generatedFiles.length === 0) {
      return {
        success: false,
        message: `Failed to ${request.mode} any images`,
        error: firstError || 'No image data found in API responses',
      };
    }

    return {
      success: true,
      message: `Successfully ${request.mode}d ${generatedFiles.length} of ${files.length} images`,
      generatedFiles,
    };
  }

  private handleApiError(error: unknown): string {
    const errorMessage =
      error instanceof Error ? error.message : String(error).toLowerCase();

    if (errorMessage.includes('api key not valid')) {
      return 'Authentication failed: The provided API key is invalid. Check your API key with `nanobanana login`.';
    }
    if (errorMessage.includes('permission denied')) {
      return 'Authentication failed: The API key does not have the necessary permissions.';
    }
    if (errorMessage.includes('quota exceeded')) {
      return 'API quota exceeded. Check your usage and limits in the Google Cloud console.';
    }

    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response
    ) {
      const responseError = error as {
        response: { status: number; statusText: string };
      };
      const { status } = responseError.response;

      switch (status) {
        case 400:
          return 'The request was malformed. Check for safety violations or unsupported content in your prompt.';
        case 403:
          return 'Authentication failed. Check your API key with `nanobanana login`.';
        case 500:
          return 'The image generation service encountered a temporary error. Please try again.';
        default:
          return `API request failed with status ${status}.`;
      }
    }

    return `An unexpected error occurred: ${errorMessage}`;
  }
}
