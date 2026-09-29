import { existsSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './app';
import { loadEnvFiles, readConfig } from './config';
import { createLlm } from './llm';
import { RateLimiter } from './rateLimit';
import { createTts } from './tts';

loadEnvFiles();
const config = readConfig();

if (!config.apiKey) {
  console.warn('[server] OPENAI_API_KEY is not set: conversations will return "ai_unavailable".');
}

const app = createApp({
  config,
  llm: config.apiKey ? createLlm(config) : null,
  tts: config.tts.apiKey ? createTts(config) : null,
  limiter: new RateLimiter(config.dailyLimit),
  getIp: (c) => c.req.header('x-forwarded-for')?.split(',')[0].trim() || getConnInfo(c).remote.address || 'unknown',
});

// In production the same server also hosts the built web app (npm run build → dist/client).
const CLIENT_DIR = './dist/client';
if (existsSync(`${CLIENT_DIR}/index.html`)) {
  app.use('/*', serveStatic({ root: CLIENT_DIR }));
  app.get('*', serveStatic({ path: `${CLIENT_DIR}/index.html` }));
}

// `--port` (used by `npm run dev`) wins over PORT, which dev launchers often set for the web server.
const portFlag = process.argv.indexOf('--port');
const port = portFlag > 0 ? Number(process.argv[portFlag + 1]) : config.port;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[server] EldenSpeak API on http://localhost:${info.port} (model: ${config.model}, daily limit: ${config.dailyLimit || 'unlimited'}, neural voices: ${config.tts.apiKey ? config.tts.model : 'off'})`);
});
