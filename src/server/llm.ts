import { z } from 'zod';
import type { ServerConfig } from './config';

export interface JsonRequest<T> {
  /** Short schema name, sent to the provider and used in logs. */
  name: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  temperature?: number;
  maxTokens?: number;
  /** Per-attempt timeout; long outputs (the debrief) need more than the default on slower models. */
  timeoutMs?: number;
}

export interface LlmClient {
  json<T>(req: JsonRequest<T>): Promise<T>;
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 20_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toProviderSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: 'draft-7' }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/** Some providers wrap JSON in code fences despite response_format; tolerate it. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  const body = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(body);
  } catch {
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1));
    throw new Error('No JSON object in model output');
  }
}

/**
 * Structured-output client for any OpenAI-compatible Chat Completions API.
 * On OpenRouter it asks for the highest-throughput provider (gpt-oss on Groq answers in ~0.5s)
 * and medium reasoning by default, which proved far more reliable for strict JSON than "low" on gpt-oss
 * (OPENAI_REASONING_EFFORT overrides it).
 */
export function createLlm(config: ServerConfig): LlmClient {
  const schemaCache = new WeakMap<z.ZodType, Record<string, unknown>>();

  async function attempt<T>(req: JsonRequest<T>, jsonSchema: Record<string, unknown>): Promise<T> {
    const body = {
      model: config.model,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 1400,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: req.name, strict: true, schema: jsonSchema },
      },
      ...(config.isOpenRouter
        ? { reasoning: { effort: config.reasoningEffort }, provider: { sort: 'throughput', require_parameters: true } }
        : {}),
    };

    let res: Response;
    try {
      res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'EldenSpeak',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(req.timeoutMs ?? TIMEOUT_MS),
      });
    } catch (err) {
      throw new LlmError(`network: ${(err as Error).message}`, true);
    }

    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 200);
      throw new LlmError(`http ${res.status}: ${detail}`, res.status === 429 || res.status >= 500);
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new LlmError('empty content', true);

    let raw: unknown;
    try {
      raw = extractJson(content);
    } catch (err) {
      throw new LlmError(`invalid json: ${(err as Error).message}`, true);
    }
    const parsed = req.schema.safeParse(raw);
    if (!parsed.success) throw new LlmError(`schema mismatch: ${parsed.error.issues[0]?.message}`, true);
    return parsed.data;
  }

  return {
    async json<T>(req: JsonRequest<T>): Promise<T> {
      let jsonSchema = schemaCache.get(req.schema);
      if (!jsonSchema) {
        jsonSchema = toProviderSchema(req.schema);
        schemaCache.set(req.schema, jsonSchema);
      }
      let lastError: LlmError | undefined;
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const started = Date.now();
        try {
          const result = await attempt(req, jsonSchema);
          console.log(`[llm] ${req.name} ok in ${Date.now() - started}ms (attempt ${i + 1})`);
          return result;
        } catch (err) {
          lastError = err instanceof LlmError ? err : new LlmError(String(err), false);
          console.warn(`[llm] ${req.name} attempt ${i + 1} failed: ${lastError.message}`);
          if (!lastError.retryable) break;
          await sleep(250 * (i + 1));
        }
      }
      throw lastError ?? new LlmError('unknown failure', false);
    },
  };
}
