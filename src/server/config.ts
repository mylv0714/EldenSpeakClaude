import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ServerConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  /** Max AI conversation turns per client per day; 0 = unlimited. */
  dailyLimit: number;
  port: number;
  corsOrigins: string[];
  isOpenRouter: boolean;
  /** Optional neural TTS (OpenAI-compatible /audio/speech). Disabled when apiKey is empty. */
  tts: { apiKey: string; baseUrl: string; model: string };
}

// Origins used by the Vite dev server and by Capacitor's Android/iOS WebViews.
const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
];

/** Loads .env.local then .env (real environment variables always win). */
export function loadEnvFiles(cwd = process.cwd()): void {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(cwd, file);
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const baseUrl = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const extraOrigins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    apiKey: env.OPENAI_API_KEY ?? '',
    baseUrl,
    model: env.OPENAI_MODEL || 'openai/gpt-oss-20b',
    dailyLimit: Math.max(0, Number(env.CHAT_DAILY_LIMIT) || 0),
    port: Number(env.PORT) || 8787,
    corsOrigins: [...DEFAULT_ORIGINS, ...extraOrigins],
    isOpenRouter: baseUrl.includes('openrouter.ai'),
    tts: {
      apiKey: env.TTS_API_KEY ?? '',
      baseUrl: (env.TTS_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
      model: env.TTS_MODEL || 'gpt-4o-mini-tts',
    },
  };
}
