// Shadowing: listen to a sentence, say it back, and see which words the recognizer caught.
// Scoring is local (word alignment against what was heard), so it is free and works offline.
import { type PronunciationResult, scorePronunciation } from '@shared/rules';
import { Mic, RotateCcw, Snail, Star, Volume2, X } from 'lucide-react';
import { useState } from 'react';
import { sfx } from '../../audio/sfx';
import { speakPhrase } from '../../audio/voice';
import { useSpeechInput } from '../../conversation/useSpeechInput';
import { useTr } from '../../i18n';
import { addPhrase, recordPronunciation } from '../../state/game';
import { toast } from '../../state/ui';
import { Stars } from '../common';

function starsFor(score: number): number {
  return score >= 90 ? 3 : score >= 75 ? 2 : score >= 50 ? 1 : 0;
}

export function ShadowSheet({ text, native, speak, onClose }: { text: string; native?: string; speak?: (slow: boolean) => Promise<void>; onClose: () => void }) {
  const t = useTr();
  const [result, setResult] = useState<(PronunciationResult & { heard: string }) | null>(null);
  const [best, setBest] = useState(0);
  const play = (slow: boolean) => void (speak ? speak(slow) : speakPhrase(text, slow));

  const speech = useSpeechInput((heard, alternatives) => {
    // Pick the recognizer alternative closest to the target: the learner said *something*, give them the benefit.
    const scored = [heard, ...alternatives].map((h) => ({ ...scorePronunciation(text, h), heard: h }));
    const top = scored.reduce((a, b) => (b.score > a.score ? b : a));
    setResult(top);
    setBest((b) => Math.max(b, top.score));
    recordPronunciation(top.score);
    sfx.play(top.score >= 75 ? 'objective' : top.score >= 50 ? 'pop' : 'thud');
  });

  const stars = result ? starsFor(result.score) : 0;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 animate-fade sm:items-center" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel w-full max-w-lg p-5 animate-rise">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-300">🎙 {t('따라 말하기 · 발음 연습', 'Repeat after me · pronunciation')}</div>
          <button className="icon-btn h-8 w-8" aria-label={t('닫기', 'Close')} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <p className="text-xl font-semibold leading-relaxed text-white">
          {result
            ? result.words.map((w, i) => (
                <span key={i} className={w.ok ? 'text-emerald-300' : 'rounded bg-red-500/25 px-0.5 text-red-200 underline decoration-red-400 decoration-wavy'}>
                  {w.text}{' '}
                </span>
              ))
            : text}
        </p>
        {native && <p className="mt-1 text-sm text-white/50">{native}</p>}

        <div className="mt-3 flex gap-2">
          <button className="btn-ghost flex-1" onClick={() => play(false)}>
            <Volume2 size={16} /> {t('듣기', 'Listen')}
          </button>
          <button className="btn-ghost flex-1" onClick={() => play(true)}>
            <Snail size={16} /> {t('천천히', 'Slow')}
          </button>
          <button
            className="btn-ghost"
            aria-label={t('표현집에 저장', 'Save')}
            onClick={() => {
              const ok = addPhrase(text, native ?? '', 'shadowing');
              toast(ok ? t('표현집에 저장했어요 ⭐', 'Saved to your phrasebook ⭐') : t('이미 저장된 표현이에요', 'Already saved'), ok ? 'good' : 'info');
            }}
          >
            <Star size={16} />
          </button>
        </div>

        {result && (
          <div className="mt-4 rounded-2xl bg-white/5 p-4 text-center animate-pop">
            <div className="flex items-center justify-center gap-3">
              <span className={`display text-5xl ${result.score >= 75 ? 'text-emerald-300' : result.score >= 50 ? 'text-amber-300' : 'text-red-300'}`}>{result.score}</span>
              <Stars value={stars} size={24} />
            </div>
            <p className="mt-1 text-sm text-white/70">
              {stars === 3
                ? t('완벽해요! 원어민도 알아들어요 👏', 'Perfect! A native speaker would understand you 👏')
                : stars === 2
                  ? t('좋아요! 빨간 단어만 한 번 더 연습해 봐요.', 'Nice! Practice the red words once more.')
                  : t('빨간 단어가 잘 안 들렸어요. 천천히 듣고 다시 해 봐요.', "The red words didn't come through. Listen slowly and try again.")}
            </p>
            <p className="mt-2 text-xs text-white/40">
              {t('인식된 문장', 'Heard')}: “{result.heard}”{best > result.score ? ` · ${t('최고', 'best')} ${best}` : ''}
            </p>
          </div>
        )}

        {speech.supported ? (
          <button
            className={`btn mt-4 w-full py-4 text-base text-white ${speech.listening ? 'mic-live bg-red-500' : 'bg-sky-500 hover:bg-sky-400'}`}
            onClick={() => (speech.listening ? speech.stop() : void speech.start())}
          >
            {speech.listening ? (
              <>
                <Mic size={20} /> {speech.partial || t('듣고 있어요… 따라 말하세요', 'Listening… say it')}
              </>
            ) : result ? (
              <>
                <RotateCcw size={18} /> {t('다시 말하기', 'Try again')}
              </>
            ) : (
              <>
                <Mic size={20} /> {t('눌러서 따라 말하기', 'Tap and repeat')}
              </>
            )}
          </button>
        ) : (
          <p className="mt-4 text-center text-sm text-white/50">{t('이 브라우저는 음성 인식을 지원하지 않아요. Chrome을 추천해요.', "This browser doesn't support speech recognition. Try Chrome.")}</p>
        )}
      </div>
    </div>
  );
}
