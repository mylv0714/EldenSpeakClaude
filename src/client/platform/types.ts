// Platform abstraction: the only place where web and native (Capacitor/Android) differ.
// Game and UI code talk to these interfaces and never to browser speech/storage APIs directly.

export type SpeechErrorCode = 'not-allowed' | 'no-speech' | 'network' | 'unsupported' | 'aborted' | 'other';

export interface RecognitionHandlers {
  lang: string;
  onPartial(text: string): void;
  /** `alternatives` are other plausible transcripts (best first, `text` included) when the engine offers them. */
  onFinal(text: string, alternatives: string[]): void;
  onError(code: SpeechErrorCode): void;
  /** Always called once the session is over (after onFinal/onError). */
  onEnd(): void;
}

export interface SpeechRecognizer {
  readonly supported: boolean;
  start(handlers: RecognitionHandlers): Promise<void>;
  stop(): void;
}

export interface SpeakOptions {
  lang: string;
  gender?: 'female' | 'male';
  /** Stable key (e.g. NPC id) so each character keeps the same voice. */
  voiceKey?: string;
  pitch: number;
  rate: number;
  volume: number;
}

export interface TextToSpeech {
  readonly supported: boolean;
  /** Resolves when speech finishes or is interrupted. */
  speak(text: string, opts: SpeakOptions): Promise<void>;
  stop(): void;
  /** Call from a user gesture where the engine only speaks after one has spoken inside a gesture (iOS). */
  unlock?(): void;
}

export interface KeyValueStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface Platform {
  kind: 'web' | 'android' | 'ios';
  storage: KeyValueStorage;
  speech: SpeechRecognizer;
  tts: TextToSpeech;
  haptic(style: 'light' | 'medium' | 'heavy'): void;
  /** Android hardware back. Handler returns true when it consumed the event. Returns an unsubscribe function. */
  onBackButton(handler: () => boolean): () => void;
  onPause(handler: () => void): () => void;
  onResume(handler: () => void): () => void;
}
