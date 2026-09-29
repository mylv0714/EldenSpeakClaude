import type { Npc } from '@shared/types';
import { api } from '../api/client';
import { ACCENT_LANG } from '../platform/voices';
import { platform } from '../platform';
import { useGame } from '../state/game';
import { sfx } from './sfx';

function settings() {
  return useGame.getState().save?.settings;
}

// ── Neural voices (server /api/tts), with the device voice as fallback ──────────

let neuralAvailable = false;
void api.health().then((h) => {
  neuralAvailable = !!h?.tts;
});

const CLIP_CACHE = 40;
const clips = new Map<string, string>();
let audio: HTMLAudioElement | null = null;
let analyser: AnalyserNode | null = null;
let samples: Uint8Array<ArrayBuffer> | null = null;
let playing = false;
/** Bumped by every new line and by stop(), so a slow download never talks over a newer line. */
let token = 0;

const SILENT_WAV =
  'data:audio/wav;base64,UklGRmQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';
let primed = false;

function ensureAudio(): HTMLAudioElement {
  audio ??= new Audio();
  return audio;
}

/**
 * Call from a user gesture. In-app WebViews (KakaoTalk, iOS WKWebView) only let a media element play without a gesture
 * once it has played inside one, and clips always start after a network wait, so play a silent clip now.
 */
export function unlockVoice(): void {
  if (primed || playing) return;
  primed = true;
  const el = ensureAudio();
  el.src = SILENT_WAV;
  el.play()
    .then(() => {
      if (el.src === SILENT_WAV) el.pause();
    })
    .catch(() => {
      primed = false;
    });
  platform().tts.unlock?.();
}

/**
 * Routes the element through the shared WebAudio context for lip-sync. Only done once that context is running:
 * a routed element stays silent while its context is suspended, and a context created outside a gesture never resumes.
 */
function connectAnalyser(el: HTMLAudioElement): void {
  const ctx = sfx.context;
  if (analyser || !ctx || ctx.state !== 'running') return;
  try {
    const src = ctx.createMediaElementSource(el);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    samples = new Uint8Array(analyser.fftSize);
    src.connect(analyser);
    analyser.connect(ctx.destination);
    el.addEventListener('play', () => void sfx.resume());
  } catch {
    analyser = null; // Still plays; the mouth just falls back to a generic flap.
  }
}

async function clipUrl(text: string, npcId: string | undefined, speed: number, my: number): Promise<string | null> {
  const key = `${npcId ?? ''}|${speed}|${text}`;
  const hit = clips.get(key);
  if (hit) return hit;
  const blob = await api.tts({ text, npcId, speed });
  if (my !== token) return null;
  const url = URL.createObjectURL(blob);
  clips.set(key, url);
  if (clips.size > CLIP_CACHE) {
    const [oldKey, oldUrl] = clips.entries().next().value!;
    clips.delete(oldKey);
    URL.revokeObjectURL(oldUrl);
  }
  return url;
}

/** Plays a neural clip. Resolves true when played (or interrupted), false when the caller should fall back. */
async function playNeural(text: string, npcId: string | undefined, speed: number, volume: number): Promise<boolean> {
  const my = ++token;
  platform().tts.stop();
  let url: string | null;
  try {
    url = await clipUrl(text, npcId, Math.round(Math.min(1.5, Math.max(0.5, speed)) * 20) / 20, my);
  } catch {
    return my !== token;
  }
  if (!url || my !== token) return true;
  const el = ensureAudio();
  connectAnalyser(el);
  el.pause();
  el.src = url;
  el.volume = Math.min(1, Math.max(0, volume));
  return new Promise<boolean>((resolve) => {
    const done = () => {
      el.removeEventListener('ended', done);
      el.removeEventListener('pause', done);
      el.removeEventListener('error', done);
      if (my === token) playing = false;
      resolve(true);
    };
    el.addEventListener('ended', done);
    el.addEventListener('pause', done);
    el.addEventListener('error', done);
    playing = true;
    el.play().catch(() => {
      el.removeEventListener('ended', done);
      el.removeEventListener('pause', done);
      el.removeEventListener('error', done);
      playing = false;
      resolve(false);
    });
  });
}

function neuralOn(): boolean {
  return neuralAvailable && (settings()?.neuralVoice ?? true);
}

/**
 * Loudness of the neural voice right now (0-1) for lip-sync, or null when the device voice is talking
 * (browsers expose no audio for speechSynthesis, so the caller animates a generic flap instead).
 */
export function speechLevel(): number | null {
  if (!playing || !analyser || !samples) return null;
  analyser.getByteTimeDomainData(samples);
  let sum = 0;
  for (const v of samples) sum += (v - 128) * (v - 128);
  return Math.min(1, Math.sqrt(sum / samples.length) / 40);
}

/** Speaks an NPC line with that character's accent, gender and a stable voice. */
export async function speakNpc(text: string, npc: Npc, slow = false): Promise<void> {
  const s = settings();
  if (neuralOn() && (await playNeural(text, npc.id, (s?.voiceRate ?? 1) * (slow ? 0.75 : 1), s?.voiceVolume ?? 1))) return;
  return platform().tts.speak(text, {
    lang: ACCENT_LANG[npc.accent],
    gender: npc.gender,
    voiceKey: npc.id,
    pitch: npc.voice?.pitch ?? 1,
    rate: (npc.voice?.rate ?? 1) * (s?.voiceRate ?? 1) * (slow ? 0.7 : 1),
    volume: s?.voiceVolume ?? 1,
  });
}

/** Neutral narrator voice for phrases, idioms and the GPS. */
export async function speakPhrase(text: string, slow = false): Promise<void> {
  const s = settings();
  if (neuralOn() && (await playNeural(text, undefined, (s?.voiceRate ?? 1) * (slow ? 0.75 : 0.95), s?.voiceVolume ?? 1))) return;
  return platform().tts.speak(text, {
    lang: 'en-US',
    gender: 'female',
    voiceKey: 'narrator',
    pitch: 1,
    rate: (s?.voiceRate ?? 1) * (slow ? 0.7 : 0.95),
    volume: s?.voiceVolume ?? 1,
  });
}

/** Device voice for background chatter (pedestrians, overheard conversations): free and instant. */
export function speakAmbient(text: string, voice: { gender: 'female' | 'male'; key: string; volume?: number; pitch?: number }): Promise<void> {
  const s = settings();
  return platform().tts.speak(text, {
    lang: 'en-US',
    gender: voice.gender,
    voiceKey: voice.key,
    pitch: voice.pitch ?? 1,
    rate: s?.voiceRate ?? 1,
    volume: (s?.voiceVolume ?? 1) * (voice.volume ?? 1),
  });
}

export function stopSpeaking(): void {
  token++;
  audio?.pause();
  playing = false;
  platform().tts.stop();
}
