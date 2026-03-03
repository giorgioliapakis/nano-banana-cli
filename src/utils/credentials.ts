import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AuthConfig } from '../types/index.js';

function getConfigDir(): string {
  const home = os.homedir();
  switch (process.platform) {
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'nanobanana');
    case 'win32':
      return path.join(home, 'AppData', 'Roaming', 'nanobanana');
    default:
      return path.join(home, '.config', 'nanobanana');
  }
}

function getCredentialsPath(): string {
  return path.join(getConfigDir(), 'credentials.json');
}

export function loadCredentials(): AuthConfig | null {
  try {
    const credPath = getCredentialsPath();
    if (!fs.existsSync(credPath)) return null;
    const data = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    if (data.apiKey) {
      return {
        apiKey: data.apiKey,
        keyType: data.keyType || 'GEMINI_API_KEY',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCredentials(auth: AuthConfig): void {
  const configDir = getConfigDir();
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }
  const credPath = getCredentialsPath();
  fs.writeFileSync(
    credPath,
    JSON.stringify({ apiKey: auth.apiKey, keyType: auth.keyType }, null, 2),
    { mode: 0o600 },
  );
}

export function removeCredentials(): boolean {
  const credPath = getCredentialsPath();
  if (fs.existsSync(credPath)) {
    fs.unlinkSync(credPath);
    return true;
  }
  return false;
}
