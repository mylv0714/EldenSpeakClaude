// Listening check after overhearing two pedestrians: one question, three answers, then the transcript.
import { OVERHEARD_BY_ID } from '@shared/content/overheard';
import { Volume2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { speakAmbient, stopSpeaking } from '../audio/voice';
import { useLang, useTr } from '../i18n';
import { finishOverheard } from '../state/game';
import { toast } from '../state/ui';
import { Modal } from './common';

export function OverheardQuiz({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useTr();
  const lang = useLang();
  const convo = OVERHEARD_BY_ID.get(id)!;
  const [picked, setPicked] = useState<number | null>(null);
  const playing = useRef(0);
  const correct = picked === convo.answer;

  const say = (i: number) => {
    const line = convo.lines[i];
    return speakAmbient(line.en, { gender: convo.speakers[line.who], key: `oh${line.who}-${convo.id}`, pitch: line.who ? 0.95 : 1.05 });
  };
  const replayAll = async () => {
    const my = ++playing.current;
    for (let i = 0; i < convo.lines.length; i++) {
      if (my !== playing.current) return;
      await say(i);
    }
  };

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    sfx.play(i === convo.answer ? 'objective' : 'thud');
  };
  const finish = () => {
    playing.current++;
    stopSpeaking();
    finishOverheard(convo.id, correct);
    if (correct) {
      sfx.play('cash');
      toast(t('👂 잘 들었어요! +$25 · +20 XP', '👂 Great listening! +$25 · +20 XP'), 'cash');
    }
    onClose();
  };

  return (
    <Modal>
      <div className="border-b border-white/10 bg-gradient-to-r from-sky-500/20 to-transparent px-5 py-4">
        <div className="text-xs font-bold uppercase tracking-wider text-sky-300">👂 {t('엿들은 대화 · 듣기 퀴즈', 'Overheard · listening check')}</div>
        <h2 className="mt-1 text-lg font-bold text-white">{convo.question.en}</h2>
        {lang === 'ko' && <p className="text-sm text-white/60">{convo.question.ko}</p>}
      </div>
      <div className="scroll-thin space-y-2 overflow-y-auto p-5">
        {convo.options.map((o, i) => {
          const state = picked === null ? 'bg-white/5 hover:bg-white/10' : i === convo.answer ? 'bg-emerald-500/25 ring-2 ring-emerald-400' : i === picked ? 'bg-red-500/20 ring-2 ring-red-400' : 'bg-white/5 opacity-50';
          return (
            <button key={o.en} className={`w-full rounded-xl px-4 py-3 text-left transition ${state}`} onClick={() => choose(i)} disabled={picked !== null}>
              <div className="font-semibold text-white">{o.en}</div>
              {lang === 'ko' && picked !== null && <div className="text-xs text-white/50">{o.ko}</div>}
            </button>
          );
        })}
        {picked === null ? (
          <button className="w-full py-2 text-sm text-sky-300" onClick={() => void replayAll()}>
            🔁 {t('한 번 더 듣기', 'Listen again')}
          </button>
        ) : (
          <div className="mt-3 space-y-1.5 rounded-xl bg-black/30 p-3">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-white/40">{t('대화 내용', 'Transcript')}</div>
            {convo.lines.map((l, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${l.who ? 'bg-violet-500/40 text-violet-100' : 'bg-sky-500/40 text-sky-100'}`}>{l.who ? 'B' : 'A'}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-white">{l.en}</div>
                  {lang === 'ko' && <div className="text-xs text-white/45">{l.ko}</div>}
                </div>
                <button className="text-sky-300" aria-label="listen" onClick={() => void say(i)}>
                  <Volume2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {picked !== null && (
        <div className="border-t border-white/10 bg-black/30 p-4">
          <button className="btn-primary w-full" onClick={finish} autoFocus>
            {correct ? t('정답! 보상 받기', 'Correct! Collect reward') : t('계속', 'Continue')}
          </button>
        </div>
      )}
    </Modal>
  );
}
