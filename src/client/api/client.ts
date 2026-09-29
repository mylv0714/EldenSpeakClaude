import {
  type ApiErrorCode,
  type DebriefReply,
  DebriefReplySchema,
  type DebriefRequest,
  type HintReply,
  HintReplySchema,
  type HealthReply,
  type HintRequest,
  type TranslateReply,
  TranslateReplySchema,
  type TranslateRequest,
  type TtsRequest,
  type TurnJudgeEvent,
  type TurnLineEvent,
  type TurnReply,
  TurnReplySchema,
  type TurnRequest,
  TurnStreamEventSchema,
} from '@shared/api';
import type { z } from 'zod';
import { platform } from '../platform';

// Web: same-origin "/api" (Vite proxies it in dev). Android: VITE_API_BASE_URL points at the deployed server.
const BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/+$/, '');
const CLIENT_ID_KEY = 'eldenspeak.clientId';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode | 'network' | 'timeout',
    message: string,
  ) {
    super(message);
  }
}

let clientId: string | null = null;
async function getClientId(): Promise<string> {
  if (clientId) return clientId;
  const store = platform().storage;
  clientId = await store.get(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID();
    await store.set(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

/** Raw POST with the client id; maps network failures and HTTP errors to ApiError. Aborts rethrow as-is. */
async function request(path: string, body: unknown, timeoutMs: number, signal?: AbortSignal): Promise<Response> {
  let res: Response;
  const timeout = AbortSignal.timeout(timeoutMs);
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client-Id': await getClientId() },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    const timedOut = (err as Error).name === 'TimeoutError';
    throw new ApiError(timedOut ? 'timeout' : 'network', timedOut ? 'Request timed out' : 'Network error');
  }
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null);
    const e = (data as { error?: { code?: ApiErrorCode; message?: string } } | null)?.error;
    throw new ApiError(e?.code ?? 'server_error', e?.message ?? `HTTP ${res.status}`);
  }
  return res;
}

async function post<T>(path: string, body: unknown, schema: z.ZodType<T>, timeoutMs = 30_000): Promise<T> {
  const res = await request(path, body, timeoutMs);
  const data: unknown = await res.json().catch(() => null);
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ApiError('server_error', 'Unexpected response');
  return parsed.data;
}

/**
 * Streaming turn: `onLine` fires as soon as the character's line arrives (so it can be spoken right away);
 * the promise resolves with the grading, or null when only the grading failed.
 */
async function turnStream(req: TurnRequest, onLine: (line: TurnLineEvent) => void, signal?: AbortSignal): Promise<TurnJudgeEvent | null> {
  const res = await request('/api/conversation/turn/stream', req, 30_000, signal);
  if (!res.body) throw new ApiError('server_error', 'Empty response');
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let gotLine = false;
  const handle = (text: string): TurnJudgeEvent | null | undefined => {
    if (!text.trim()) return undefined;
    const parsed = TurnStreamEventSchema.safeParse(JSON.parse(text));
    if (!parsed.success) throw new ApiError('server_error', 'Unexpected response');
    const e = parsed.data;
    if (e.type === 'line') {
      gotLine = true;
      onLine(e);
      return undefined;
    }
    return e.type === 'judge' ? e : null;
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (value) buffer += value;
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const out = handle(buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
        if (out !== undefined) return out;
      }
      if (done) break;
    }
    const last = handle(buffer);
    if (last !== undefined) return last;
  } catch (err) {
    if (signal?.aborted || err instanceof ApiError) throw err;
    throw new ApiError('network', 'Network error');
  } finally {
    reader.releaseLock();
  }
  if (!gotLine) throw new ApiError('server_error', 'Unexpected response');
  return null;
}

let health: Promise<HealthReply | null> | null = null;

export const api = {
  turn: (req: TurnRequest): Promise<TurnReply> => post('/api/conversation/turn', req, TurnReplySchema),
  turnStream,
  hint: (req: HintRequest): Promise<HintReply> => post('/api/conversation/hint', req, HintReplySchema),
  translate: (req: TranslateRequest): Promise<TranslateReply> => post('/api/conversation/translate', req, TranslateReplySchema),
  debrief: (req: DebriefRequest): Promise<DebriefReply> => post('/api/conversation/debrief', req, DebriefReplySchema, 45_000),
  /** Server capabilities, fetched once. Null when the server is unreachable. */
  health(): Promise<HealthReply | null> {
    health ??= fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? (r.json() as Promise<HealthReply>) : null))
      .catch(() => {
        health = null;
        return null;
      });
    return health;
  },
  /** Neural TTS clip (mp3). */
  async tts(req: TtsRequest, signal?: AbortSignal): Promise<Blob> {
    const res = await request('/api/tts', req, 20_000, signal);
    return res.blob();
  },
};
