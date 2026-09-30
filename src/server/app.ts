import {
  type ApiErrorCode,
  DebriefReplySchema,
  DebriefRequestSchema,
  type HealthReply,
  HintReplySchema,
  HintRequestSchema,
  JudgeSchema,
  NpcLineSchema,
  TranslateReplySchema,
  TranslateRequestSchema,
  TtsRequestSchema,
  type TurnJudgeEvent,
  TurnRequestSchema,
  type TurnStreamEvent,
} from '@shared/api';
import { NPC_BY_ID } from '@shared/content/npcs';
import { isNpcAllowed, SCENARIO_BY_ID } from '@shared/content/scenarios';
import type { Npc, Scenario } from '@shared/types';
import { type Context, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import type { z } from 'zod';
import type { ServerConfig } from './config';
import type { LlmClient } from './llm';
import {
  buildDebriefPrompt,
  buildHintPrompt,
  buildJudgePrompt,
  buildNpcPrompt,
  buildTranslatePrompt,
  judgeReply,
  lineReply,
  mergeTurn,
  sanitizeDebrief,
  sanitizeHint,
} from './prompts';
import type { RateLimiter } from './rateLimit';
import type { TtsClient } from './tts';

export interface AppDeps {
  config: ServerConfig;
  llm: LlmClient | null;
  /** Optional neural voices; null when TTS_API_KEY is not configured. */
  tts?: TtsClient | null;
  limiter: RateLimiter;
  /** Resolves the caller IP; injected so tests and different runtimes can supply it. */
  getIp?: (c: Context) => string;
}

const STATUS: Record<ApiErrorCode, 400 | 429 | 500 | 503> = {
  bad_request: 400,
  rate_limited: 429,
  daily_limit: 429,
  ai_unavailable: 503,
  server_error: 500,
};

function fail(c: Context, code: ApiErrorCode, message: string, retryAfterSec?: number) {
  if (retryAfterSec) c.header('Retry-After', String(retryAfterSec));
  return c.json({ error: { code, message } }, STATUS[code]);
}

export function createApp({ config, llm, tts = null, limiter, getIp = () => 'local' }: AppDeps) {
  const app = new Hono();

  app.use(
    '/api/*',
    cors({
      origin: (origin) => (config.corsOrigins.includes(origin) ? origin : null),
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'X-Client-Id'],
      maxAge: 600,
    }),
  );
  app.use('/api/*', bodyLimit({ maxSize: 64 * 1024, onError: (c) => fail(c, 'bad_request', 'Request too large') }));

  app.get('/api/health', (c) =>
    c.json<HealthReply>({ ok: true, model: config.model, dailyLimit: config.dailyLimit, tts: !!tts }),
  );

  /** Shared plumbing: validate, resolve content, rate-limit, call the model, sanitize. */
  async function handle<Req extends { scenarioId: string; npcId: string }, Out>(
    c: Context,
    opts: {
      schema: z.ZodType<Req>;
      countsTowardDaily: boolean;
      /** Returns the JSON body, or a ready Response (streams). */
      run: (req: Req, scenario: Scenario, npc: Npc, llm: LlmClient) => Promise<Out | Response>;
    },
  ) {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return fail(c, 'bad_request', 'Body must be JSON');
    }
    const parsed = opts.schema.safeParse(body);
    if (!parsed.success) return fail(c, 'bad_request', parsed.error.issues[0]?.message ?? 'Invalid request');
    const req = parsed.data;

    const scenario = SCENARIO_BY_ID.get(req.scenarioId);
    const npc = NPC_BY_ID.get(req.npcId);
    if (!scenario || !npc || !isNpcAllowed(scenario, npc.id)) return fail(c, 'bad_request', 'Unknown scenario or character');

    if (!llm) return fail(c, 'ai_unavailable', 'AI is not configured on the server (OPENAI_API_KEY missing).');

    const clientId = (c.req.header('X-Client-Id') ?? '').slice(0, 64) || 'anonymous';
    const limit = limiter.check(getIp(c), clientId, opts.countsTowardDaily);
    if (!limit.ok) {
      const message = limit.code === 'daily_limit' ? 'Daily conversation limit reached.' : 'Too many requests. Slow down a little.';
      return fail(c, limit.code, message, limit.retryAfterSec);
    }

    try {
      const out = await opts.run(req, scenario, npc, llm);
      return out instanceof Response ? out : c.json(out);
    } catch (err) {
      console.error(`[api] ${c.req.path} failed:`, (err as Error).message);
      return fail(c, 'ai_unavailable', 'The AI service did not respond. Please try again.');
    }
  }

  app.post('/api/conversation/turn', (c) =>
    handle(c, {
      schema: TurnRequestSchema,
      countsTowardDaily: true,
      run: async (req, scenario, npc, llm) => {
        const [line, judge] = await Promise.all([
          llm.json({ name: 'npc_line', schema: NpcLineSchema, temperature: 0.8, ...buildNpcPrompt(req, scenario, npc) }),
          llm.json({ name: 'judge', schema: JudgeSchema, temperature: 0.2, ...buildJudgePrompt(req, scenario, npc) }),
        ]);
        return mergeTurn(line, judge, req, scenario);
      },
    }),
  );

  // Same turn, streamed as NDJSON: the character's line is sent the moment it is ready (so the client can
  // start speaking), the judge's grading follows. A failing line still returns a normal JSON error.
  app.post('/api/conversation/turn/stream', (c) =>
    handle(c, {
      schema: TurnRequestSchema,
      countsTowardDaily: true,
      run: async (req, scenario, npc, llm) => {
        const judgeP = llm.json({ name: 'judge', schema: JudgeSchema, temperature: 0.2, ...buildJudgePrompt(req, scenario, npc) });
        judgeP.catch(() => {});
        const line = await llm.json({ name: 'npc_line', schema: NpcLineSchema, temperature: 0.8, ...buildNpcPrompt(req, scenario, npc) });
        const encoder = new TextEncoder();
        const body = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (e: TurnStreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
            send({ type: 'line', ...lineReply(line) });
            try {
              const judge: TurnJudgeEvent = { type: 'judge', ...judgeReply(await judgeP, req, scenario) };
              send(judge);
            } catch (err) {
              console.error('[api] judge failed:', (err as Error).message);
              send({ type: 'error', message: 'Grading is unavailable for this turn.' });
            }
            controller.close();
          },
        });
        return c.body(body, 200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' });
      },
    }),
  );

  app.post('/api/tts', async (c) => {
    if (!tts) return fail(c, 'ai_unavailable', 'Neural voices are not configured on the server.');
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return fail(c, 'bad_request', 'Body must be JSON');
    }
    const parsed = TtsRequestSchema.safeParse(body);
    if (!parsed.success) return fail(c, 'bad_request', parsed.error.issues[0]?.message ?? 'Invalid request');
    const clientId = (c.req.header('X-Client-Id') ?? '').slice(0, 64) || 'anonymous';
    const limit = limiter.check(getIp(c), clientId, false);
    if (!limit.ok) return fail(c, limit.code, 'Too many requests. Slow down a little.', limit.retryAfterSec);
    try {
      const audio = await tts.speak(parsed.data);
      return c.body(audio, 200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=86400' });
    } catch (err) {
      console.error('[api] tts failed:', (err as Error).message);
      return fail(c, 'ai_unavailable', 'The voice service did not respond.');
    }
  });

  app.post('/api/conversation/hint', (c) =>
    handle(c, {
      schema: HintRequestSchema,
      countsTowardDaily: false,
      run: async (req, scenario, npc, llm) => {
        const prompt = buildHintPrompt(req, scenario, npc);
        return sanitizeHint(await llm.json({ name: 'hint', schema: HintReplySchema, temperature: 0.5, ...prompt }));
      },
    }),
  );

  app.post('/api/conversation/translate', (c) =>
    handle(c, {
      schema: TranslateRequestSchema,
      countsTowardDaily: false,
      run: async (req, scenario, npc, llm) => {
        const prompt = buildTranslatePrompt(req, scenario, npc);
        const reply = await llm.json({ name: 'translate', schema: TranslateReplySchema, temperature: 0.3, ...prompt });
        return { en: reply.en.trim().slice(0, 300) };
      },
    }),
  );

  app.post('/api/conversation/debrief', (c) =>
    handle(c, {
      schema: DebriefRequestSchema,
      countsTowardDaily: false,
      run: async (req, scenario, npc, llm) => {
        const prompt = buildDebriefPrompt(req, scenario, npc);
        // gpt-oss reasons for ~2,200 tokens on a full conversation; at 2,000 most debriefs came back empty.
        return sanitizeDebrief(await llm.json({ name: 'debrief', schema: DebriefReplySchema, temperature: 0.4, maxTokens: 6000, timeoutMs: 40_000, ...prompt }));
      },
    }),
  );

  app.all('/api/*', (c) => fail(c, 'bad_request', 'Not found'));

  app.onError((err, c) => {
    console.error('[api] unhandled error:', err);
    return fail(c, 'server_error', 'Unexpected server error');
  });

  return app;
}
