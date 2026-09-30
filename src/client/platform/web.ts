import type { KeyValueStorage, Platform, SpeakOptions, SpeechErrorCode, SpeechRecognizer, TextToSpeech } from './types';
import { pickVoiceIndex } from './voices';

// Minimal typings for the Web Speech API (not in TypeScript's DOM lib).
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const storage: KeyValueStorage = {
  async get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Private mode or quota: the game keeps running from memory.
    }
  },
  async remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

function createRecognizer(): SpeechRecognizer {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  let active: SpeechRecognitionLike | null = null;
  let session: { stopRequested: boolean } | null = null;

  return {
    supported: !!Ctor,
    async start(h) {
      if (!Ctor) {
        h.onError('unsupported');
        h.onEnd();
        return;
      }
      if (session) session.stopRequested = true;
      active?.abort();
      const sess = { stopRequested: false };
      session = sess;
      // Text from earlier engine runs of this session (continuous mode restarts the engine after pauses).
      let carried = '';

      const run = () => {
        const rec = new Ctor();
        active = rec;
        rec.lang = h.lang;
        rec.interimResults = true;
        rec.continuous = !!h.continuous;
        rec.maxAlternatives = 3;
        let finalText = '';
        let latest = carried;
        let alternatives: string[] = [];
        let fatal = false;
        rec.onresult = (e) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) {
              // Alternatives only make sense for a single final chunk (the usual case for short answers).
              alternatives = finalText || carried ? [] : Array.from({ length: r.length }, (_, k) => r[k].transcript.trim()).filter(Boolean);
              finalText += r[0].transcript;
            } else interim += r[0].transcript;
          }
          latest = `${carried} ${finalText + interim}`.trim();
          h.onPartial(latest);
        };
        rec.onerror = (e) => {
          // While the button is held, silence is just thinking time.
          if (h.continuous && !sess.stopRequested && (e.error === 'no-speech' || e.error === 'aborted')) return;
          const map: Record<string, SpeechErrorCode> = {
            'not-allowed': 'not-allowed',
            'service-not-allowed': 'not-allowed',
            'no-speech': 'no-speech',
            network: 'network',
            aborted: 'aborted',
          };
          fatal = true;
          h.onError(map[e.error] ?? 'other');
        };
        rec.onend = () => {
          if (active === rec) active = null;
          const text = latest.trim();
          if (h.continuous && !sess.stopRequested && !fatal && session === sess) {
            carried = text;
            run();
            return;
          }
          if (session === sess) session = null;
          if (text) h.onFinal(text, alternatives.length > 0 ? alternatives : [text]);
          h.onEnd();
        };
        rec.start();
      };
      run();
    },
    stop() {
      if (session) session.stopRequested = true;
      active?.stop();
    },
  };
}

function createTts(): TextToSpeech {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  let voices: SpeechSynthesisVoice[] = synth?.getVoices() ?? [];
  synth?.addEventListener?.('voiceschanged', () => {
    voices = synth.getVoices();
  });

  return {
    supported: !!synth,
    speak(text: string, opts: SpeakOptions) {
      if (!synth) return Promise.resolve();
      synth.cancel();
      return new Promise<void>((resolve) => {
        const u = new SpeechSynthesisUtterance(text);
        if (voices.length === 0) voices = synth.getVoices();
        const idx = pickVoiceIndex(voices, opts.lang, opts.gender, opts.voiceKey);
        if (idx >= 0) u.voice = voices[idx];
        u.lang = idx >= 0 ? voices[idx].lang : opts.lang;
        u.rate = opts.rate;
        u.pitch = opts.pitch;
        u.volume = opts.volume;
        // Chrome occasionally never fires onend; don't let a conversation hang on it.
        const guard = setTimeout(resolve, 1500 + text.length * 120 / Math.max(0.5, opts.rate));
        const done = () => {
          clearTimeout(guard);
          resolve();
        };
        u.onend = done;
        u.onerror = done;
        synth.speak(u);
      });
    },
    stop() {
      synth?.cancel();
    },
    unlock() {
      if (!synth) return;
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      synth.speak(u);
    },
  };
}

export function createWebPlatform(): Platform {
  return {
    kind: 'web',
    storage,
    speech: createRecognizer(),
    tts: createTts(),
    haptic(style) {
      navigator.vibrate?.(style === 'light' ? 8 : style === 'medium' ? 18 : 40);
    },
    onBackButton() {
      return () => {};
    },
    onPause(handler) {
      const fn = () => document.visibilityState === 'hidden' && handler();
      document.addEventListener('visibilitychange', fn);
      return () => document.removeEventListener('visibilitychange', fn);
    },
    onResume(handler) {
      const fn = () => document.visibilityState === 'visible' && handler();
      document.addEventListener('visibilitychange', fn);
      return () => document.removeEventListener('visibilitychange', fn);
    },
  };
}
