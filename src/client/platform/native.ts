// Capacitor (Android/iOS) implementations. Loaded lazily, only inside the native app shell.
// Android WebView has no Web Speech API, so speech goes through native plugins.
// NOTE: verify on a real device after `npm run android:add` — see docs/ANDROID.md.
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech as NativeTts } from '@capacitor-community/text-to-speech';
import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import type { Platform, SpeechRecognizer, TextToSpeech } from './types';
import { pickVoiceIndex } from './voices';

function listen(p: Promise<PluginListenerHandle>): () => void {
  return () => void p.then((h) => h.remove());
}

function createRecognizer(): SpeechRecognizer {
  let session: { finish(): void } | null = null;

  return {
    supported: true,
    async start(h) {
      session?.finish();
      const { available } = await SpeechRecognition.available().catch(() => ({ available: false }));
      if (!available) {
        h.onError('unsupported');
        h.onEnd();
        return;
      }
      const perm = await SpeechRecognition.requestPermissions().catch(() => null);
      if (perm?.speechRecognition !== 'granted') {
        h.onError('not-allowed');
        h.onEnd();
        return;
      }

      let latest = '';
      let matches: string[] = [];
      let finished = false;
      const handles: Promise<PluginListenerHandle>[] = [];
      const finish = () => {
        if (finished) return;
        finished = true;
        handles.forEach((p) => p.then((x) => x.remove()));
        if (latest.trim()) h.onFinal(latest.trim(), matches.length > 0 ? matches : [latest.trim()]);
        else h.onError('no-speech');
        h.onEnd();
        if (session === current) session = null;
      };
      const current = { finish };
      session = current;

      handles.push(
        SpeechRecognition.addListener('partialResults', (data: { matches?: string[] }) => {
          latest = data.matches?.[0] ?? latest;
          if (data.matches?.length) matches = data.matches.map((m) => m.trim()).filter(Boolean);
          h.onPartial(latest);
        }),
      );
      handles.push(
        SpeechRecognition.addListener('listeningState', (data: { status: 'started' | 'stopped' }) => {
          if (data.status === 'stopped') finish();
        }),
      );
      try {
        await SpeechRecognition.start({ language: h.lang, partialResults: true, popup: false, maxResults: 3 });
      } catch {
        h.onError('other');
        finish();
      }
    },
    stop() {
      void SpeechRecognition.stop().catch(() => {});
    },
  };
}

function createTts(): TextToSpeech {
  let voices: { name: string; lang: string }[] = [];
  void NativeTts.getSupportedVoices()
    .then((r) => {
      voices = r.voices;
    })
    .catch(() => {});

  return {
    supported: true,
    async speak(text, opts) {
      await NativeTts.stop().catch(() => {});
      const idx = pickVoiceIndex(voices, opts.lang, opts.gender, opts.voiceKey);
      await NativeTts.speak({
        text,
        lang: idx >= 0 ? voices[idx].lang : opts.lang,
        rate: opts.rate,
        pitch: opts.pitch,
        volume: opts.volume,
        ...(idx >= 0 ? { voice: idx } : {}),
      }).catch(() => {});
    },
    stop() {
      void NativeTts.stop().catch(() => {});
    },
  };
}

export function createNativePlatform(): Platform {
  const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
  return {
    kind: platform,
    storage: {
      async get(key) {
        return (await Preferences.get({ key })).value;
      },
      async set(key, value) {
        await Preferences.set({ key, value });
      },
      async remove(key) {
        await Preferences.remove({ key });
      },
    },
    speech: createRecognizer(),
    tts: createTts(),
    haptic(style) {
      const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
      void Haptics.impact({ style: map[style] }).catch(() => {});
    },
    onBackButton(handler) {
      return listen(
        App.addListener('backButton', () => {
          if (!handler()) void App.minimizeApp();
        }),
      );
    },
    onPause(handler) {
      return listen(App.addListener('pause', handler));
    },
    onResume(handler) {
      return listen(App.addListener('resume', handler));
    },
  };
}
