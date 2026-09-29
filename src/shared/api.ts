// HTTP contract between the client (web / Android) and the API server.
// Request schemas are validated on the server; reply schemas double as the AI's structured-output schema.
import { z } from 'zod';
import { DISTRICT_NAMES } from './content/city';
import { WEAK_POINT_IDS } from './content/weakPoints';
import { EMOTIONS, LEVELS, NATIVE_LANGS } from './types';

const Level = z.enum(LEVELS);
const Lang = z.enum(NATIVE_LANGS);

export const ChatLineSchema = z.object({
  role: z.enum(['npc', 'player']),
  text: z.string().min(1).max(600),
});
export type ChatLine = z.infer<typeof ChatLineSchema>;

const RouteStepSchema = z.object({
  action: z.enum(['start', 'left', 'right', 'straight', 'arrive']),
  street: z.string().max(40),
  heading: z.enum(['north', 'south', 'east', 'west']).optional(),
  blocks: z.number().int().min(0).max(20).optional(),
  side: z.enum(['left', 'right']).optional(),
});

export const ContextSchema = z.object({
  destinationId: z.string().max(32).optional(),
  route: z.array(RouteStepSchema).max(12).optional(),
  minutesLate: z.number().min(0).max(180).optional(),
  order: z.array(z.string().max(60)).max(5).optional(),
  offense: z.enum(['speeding', 'hit_pedestrian', 'hit_police', 'hit_and_run', 'reckless']).optional(),
  stars: z.number().int().min(0).max(3).optional(),
  impact: z.enum(['rear', 'front', 'side']).optional(),
  topicId: z.number().int().min(0).max(50).optional(),
  fare: z.number().min(0).max(1000).optional(),
  district: z.enum(DISTRICT_NAMES).optional(),
  hour: z.number().int().min(0).max(23).optional(),
});

const base = {
  scenarioId: z.string().min(1).max(48),
  npcId: z.string().min(1).max(48),
  level: Level,
  nativeLang: Lang,
  playerName: z.string().trim().min(1).max(32),
  context: ContextSchema.optional(),
};

export const TurnRequestSchema = z.object({
  ...base,
  history: z.array(ChatLineSchema).max(40),
  message: z.string().trim().min(1).max(300),
  inputMode: z.enum(['voice', 'text']),
  completed: z.array(z.string().max(16)).max(12),
  mood: z.number().min(0).max(100),
  memory: z.array(z.string().max(200)).max(4).optional(),
  /** The learner's recurring weak points (fixed ids only), practiced subtly during the scene. */
  focus: z.array(z.enum(WEAK_POINT_IDS)).max(3).optional(),
});
export type TurnRequest = z.infer<typeof TurnRequestSchema>;

/** AI output #1 for a turn: the character's line. */
export const NpcLineSchema = z.strictObject({
  reply: z.string(),
  replyNative: z.string(),
  emotion: z.enum(EMOTIONS),
});
export type NpcLine = z.infer<typeof NpcLineSchema>;

/**
 * AI output #2 for a turn, generated in parallel: a focused judge.
 * Splitting grading from role-play raised goal-detection accuracy from ~60% to ~95% on gpt-oss-20b.
 */
export const JudgeSchema = z.strictObject({
  achieved: z.array(z.string()),
  score: z.number(),
  corrected: z.string().nullable(),
  natural: z.string().nullable(),
  explanation: z.string(),
  moodDelta: z.number(),
});
export type Judge = z.infer<typeof JudgeSchema>;

/** What the client receives for a turn. */
export const TurnReplySchema = z.object({
  reply: z.string(),
  replyNative: z.string(),
  emotion: z.enum(EMOTIONS),
  objectivesCompleted: z.array(z.string()),
  moodDelta: z.number(),
  feedback: z.object({
    score: z.number(),
    corrected: z.string().nullable(),
    natural: z.string().nullable(),
    explanation: z.string(),
  }),
});
export type TurnReply = z.infer<typeof TurnReplySchema>;
export type TurnFeedback = TurnReply['feedback'];

/**
 * Streaming turn (/api/conversation/turn/stream): newline-delimited JSON events.
 * The character's line arrives as soon as it is ready so it can be spoken while the judge is still grading.
 */
export const TurnLineEventSchema = TurnReplySchema.pick({ reply: true, replyNative: true, emotion: true }).extend({ type: z.literal('line') });
export const TurnJudgeEventSchema = TurnReplySchema.pick({ objectivesCompleted: true, moodDelta: true, feedback: true }).extend({ type: z.literal('judge') });
export const TurnErrorEventSchema = z.object({ type: z.literal('error'), message: z.string() });
export const TurnStreamEventSchema = z.discriminatedUnion('type', [TurnLineEventSchema, TurnJudgeEventSchema, TurnErrorEventSchema]);
export type TurnLineEvent = z.infer<typeof TurnLineEventSchema>;
export type TurnJudgeEvent = z.infer<typeof TurnJudgeEventSchema>;
export type TurnStreamEvent = z.infer<typeof TurnStreamEventSchema>;

export const HintRequestSchema = z.object({
  ...base,
  history: z.array(ChatLineSchema).max(40),
  completed: z.array(z.string().max(16)).max(12),
});
export type HintRequest = z.infer<typeof HintRequestSchema>;

export const HintReplySchema = z.strictObject({
  tip: z.string(),
  suggestions: z.array(z.strictObject({ en: z.string(), native: z.string() })),
});
export type HintReply = z.infer<typeof HintReplySchema>;

/** "Say it in English": the learner writes what they want to say in their own language. */
export const TranslateRequestSchema = z.object({
  ...base,
  history: z.array(ChatLineSchema).max(40),
  text: z.string().trim().min(1).max(300),
});
export type TranslateRequest = z.infer<typeof TranslateRequestSchema>;

export const TranslateReplySchema = z.strictObject({
  en: z.string(),
});
export type TranslateReply = z.infer<typeof TranslateReplySchema>;

export const DebriefRequestSchema = z.object({
  ...base,
  history: z.array(ChatLineSchema).max(60),
  outcome: z.enum(['success', 'failure', 'abandoned']),
  completed: z.array(z.string().max(16)).max(12),
});
export type DebriefRequest = z.infer<typeof DebriefRequestSchema>;

export const DebriefReplySchema = z.strictObject({
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  expressions: z.array(z.strictObject({ en: z.string(), native: z.string() })),
  grammar: z.number(),
  vocabulary: z.number(),
  fluency: z.number(),
  level: Level,
  memory: z.string(),
  /** Up to two recurring problems seen in this conversation (ids from the fixed catalogue). */
  weakPoints: z.array(z.enum(WEAK_POINT_IDS)),
});
export type DebriefReply = z.infer<typeof DebriefReplySchema>;

/** Neural TTS (optional server feature). The server picks the voice from the character, or a narrator voice. */
export const TtsRequestSchema = z.object({
  text: z.string().trim().min(1).max(600),
  npcId: z.string().max(48).optional(),
  speed: z.number().min(0.5).max(1.5).optional(),
});
export type TtsRequest = z.infer<typeof TtsRequestSchema>;

export const ERROR_CODES = ['bad_request', 'rate_limited', 'daily_limit', 'ai_unavailable', 'server_error'] as const;
export type ApiErrorCode = (typeof ERROR_CODES)[number];
export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

export interface HealthReply {
  ok: true;
  model: string;
  dailyLimit: number;
  /** True when /api/tts is configured (neural voices). */
  tts: boolean;
}
