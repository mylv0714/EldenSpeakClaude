// Voice-guided taxi ride: the passenger's latest direction, plus a mic to ask them something
// ("Left or right?", "Sorry, again?", "How far is it?") while you keep driving.
import { getNpc } from '@shared/content/npcs';
import { Headphones, Mic, RotateCcw, Snail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSpeechInput } from '../../conversation/useSpeechInput';
import { useTr } from '../../i18n';
import { useGame } from '../../state/game';
import type { Hud } from '../../state/ui';
import { Avatar } from '../Avatar';

export function GuideCard({ guide, touch, onAsk, onReplay }: { guide: NonNullable<Hud['guide']>; touch: boolean; onAsk: (text: string) => void; onReplay: (slow: boolean) => void }) {
  const t = useTr();
  const listenMode = useGame((s) => s.save!.settings.subtitles === 'listen');
  const [revealed, setRevealed] = useState(0);
  const npc = getNpc(guide.npcId);
  const speech = useSpeechInput((text) => onAsk(text));
  const hidden = listenMode && revealed !== guide.id;

  // Q asks the passenger without taking your hands off the keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyQ' || e.repeat || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (speech.listening) speech.stop();
      else void speech.start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [speech]);

  return (
    <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-yellow-400/40 bg-black/75 p-2.5 shadow-2xl backdrop-blur animate-rise">
      <div className="flex items-start gap-2.5">
        <Avatar look={npc.look} size={40} talking={false} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-yellow-300">🗣️ {npc.name.split(' ')[0]} · {t('길 안내', 'directions')}</div>
          <button key={guide.id} className="block text-left text-[15px] font-semibold leading-snug text-white animate-fade" onClick={() => setRevealed(guide.id)}>
            {speech.listening ? (
              <span className="italic text-sky-200">{speech.partial || t('듣고 있어요… 손님에게 물어보세요', 'Listening… ask your passenger')}</span>
            ) : hidden ? (
              <span className="inline-flex items-center gap-1.5 text-white/60">
                <Headphones size={15} /> {t('잘 듣고 운전하세요 · 탭하면 자막', 'Listen and drive · tap for text')}
              </span>
            ) : (
              `“${guide.text}”`
            )}
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <button className="icon-btn h-8 w-8 bg-white/10" aria-label={t('다시 듣기', 'Replay')} onClick={() => onReplay(false)}>
          <RotateCcw size={14} />
        </button>
        <button className="icon-btn h-8 w-8 bg-white/10" aria-label={t('천천히', 'Slow')} onClick={() => onReplay(true)}>
          <Snail size={14} />
        </button>
        {speech.supported && (
          <button className={`btn ml-auto px-3 py-1.5 text-xs text-white ${speech.listening ? 'mic-live bg-red-500' : 'bg-sky-500 hover:bg-sky-400'}`} onClick={() => (speech.listening ? speech.stop() : void speech.start())}>
            <Mic size={14} /> {t('손님에게 묻기', 'Ask passenger')}
            {!touch && <kbd className="rounded bg-white/25 px-1 font-mono text-[10px]">Q</kbd>}
          </button>
        )}
      </div>
      {!speech.listening && <p className="mt-1.5 text-[11px] text-white/40">{t('예: "Left or right?" · "Sorry, again?" · "How far is it?"', 'Try: “Left or right?” · “Sorry, again?” · “How far is it?”')}</p>}
    </div>
  );
}
