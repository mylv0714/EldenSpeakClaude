import { useCallback, useEffect, useRef, useState } from 'react';
import { stopSpeaking } from '../audio/voice';
import { tr } from '../i18n';
import { platform } from '../platform';
import type { SpeechErrorCode } from '../platform/types';
import { toast } from '../state/ui';

const ERROR_TEXT: Partial<Record<SpeechErrorCode, [string, string]>> = {
  'not-allowed': ['마이크 권한이 필요해요. 브라우저 설정에서 허용해 주세요.', 'Microphone permission is needed. Allow it in your browser settings.'],
  'no-speech': ['잘 안 들렸어요. 다시 말해 볼까요?', "I didn't catch that. Try again?"],
  network: ['음성 인식 서버에 연결할 수 없어요. 입력창을 이용해 주세요.', "Speech service unavailable. Try typing instead."],
  unsupported: ['이 브라우저는 음성 인식을 지원하지 않아요. Chrome을 추천해요.', "This browser doesn't support speech recognition. Try Chrome."],
};

/**
 * Push-to-talk speech recognition (English). `onFinal` gets the recognized sentence (and alternatives).
 * `start({ continuous: true })` keeps listening through pauses until `stop()` (hold-to-talk).
 */
export function useSpeechInput(onFinal: (text: string, alternatives: string[]) => void) {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const handler = useRef(onFinal);
  useEffect(() => {
    handler.current = onFinal;
  }, [onFinal]);

  const start = useCallback(async (opts?: { continuous?: boolean }) => {
    stopSpeaking();
    setPartial('');
    setListening(true);
    await platform().speech.start({
      lang: 'en-US',
      continuous: opts?.continuous,
      onPartial: setPartial,
      onFinal: (text, alternatives) => {
        setPartial('');
        handler.current(text, alternatives);
      },
      onError: (code) => {
        const msg = ERROR_TEXT[code];
        if (msg) toast(tr(msg[0], msg[1]), 'bad');
      },
      onEnd: () => setListening(false),
    });
  }, []);

  const stop = useCallback(() => platform().speech.stop(), []);

  useEffect(() => () => platform().speech.stop(), []);

  return { supported: platform().speech.supported, listening, partial, start, stop };
}
