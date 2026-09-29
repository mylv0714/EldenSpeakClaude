// Optional neural TTS proxy. Keeps the provider key on the server, picks a stable voice per character
// and caches recent clips (the same NPC lines and phrases are replayed a lot).
import type { TtsRequest } from '@shared/api';
import { NPC_BY_ID } from '@shared/content/npcs';
import type { Accent } from '@shared/types';
import type { ServerConfig } from './config';

export interface TtsClient {
  speak(req: TtsRequest): Promise<ArrayBuffer>;
}

const FEMALE = ['coral', 'nova', 'shimmer', 'sage'];
const MALE = ['ash', 'echo', 'onyx', 'verse'];
const NARRATOR = 'alloy';
const ACCENT: Record<Accent, string> = { us: 'American', uk: 'British', au: 'Australian', in: 'Indian' };
const CACHE_SIZE = 300;
const TIMEOUT_MS = 20_000;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Voice and speaking style for a character (or the neutral narrator). */
export function voiceFor(npcId: string | undefined): { voice: string; instructions: string } {
  const npc = npcId ? NPC_BY_ID.get(npcId) : undefined;
  if (!npc) return { voice: NARRATOR, instructions: 'Speak clearly and warmly, like a friendly English teacher.' };
  const pool = npc.gender === 'female' ? FEMALE : MALE;
  return {
    voice: pool[hash(npc.id) % pool.length],
    instructions: `Speak with a natural ${ACCENT[npc.accent]} English accent. You are ${npc.name}, ${npc.role}, age ${npc.age}. ${npc.personality}`.slice(0, 600),
  };
}

export function createTts(config: ServerConfig): TtsClient {
  const cache = new Map<string, ArrayBuffer>();
  const supportsInstructions = config.tts.model.includes('gpt-4o');

  return {
    async speak(req) {
      const { voice, instructions } = voiceFor(req.npcId);
      const speed = Math.round((req.speed ?? 1) * 20) / 20;
      const key = `${voice}|${req.npcId ?? ''}|${speed}|${req.text}`;
      const hit = cache.get(key);
      if (hit) {
        cache.delete(key);
        cache.set(key, hit);
        return hit;
      }
      const res = await fetch(`${config.tts.baseUrl}/audio/speech`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.tts.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.tts.model,
          voice,
          input: req.text,
          response_format: 'mp3',
          speed,
          ...(supportsInstructions ? { instructions } : {}),
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`tts http ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
      const audio = await res.arrayBuffer();
      cache.set(key, audio);
      if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
      return audio;
    },
  };
}
