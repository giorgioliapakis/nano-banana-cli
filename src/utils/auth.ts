import { ImageGenerator } from '../lib/imageGenerator.js';
import { loadCredentials } from './credentials.js';
import { AuthConfig } from '../types/index.js';

export function resolveApiKey(flagValue?: string): AuthConfig {
  // 1. CLI flag
  if (flagValue) {
    return { apiKey: flagValue, keyType: 'GEMINI_API_KEY' };
  }

  // 2. Env var chain
  try {
    return ImageGenerator.validateAuthentication();
  } catch {
    // 3. Stored credentials
    const stored = loadCredentials();
    if (stored) {
      return stored;
    }
    throw new Error(
      'No API key found. Run `nanobanana login` or set GEMINI_API_KEY environment variable.',
    );
  }
}
