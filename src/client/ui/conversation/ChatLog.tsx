// Scrolling transcript of the conversation (classic chat layout, also the "history" drawer of the scene view).
import type { TurnFeedback } from '@shared/api';
import type { Npc } from '@shared/types';
import { Headphones, Languages, Loader2, Mic, MicVocal, RotateCcw, Snail, Star, Undo2, Volume2 } from 'lucide-react';
import { type RefObject, useState } from 'react';
import { speakPhrase } from '../../audio/voice';
import type { ChatMessage } from '../../conversation/types';
import { useTr } from '../../i18n';
import { addPhrase, useGame } from '../../state/game';
import { toast } from '../../state/ui';
import { Avatar } from '../Avatar';
import { Diff } from './Diff';

export type ShadowRequest = { text: string; native?: string; npc?: boolean };

function scoreTone(score: number) {
  if (score >= 85) return { cls: 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/40', ko: '훌륭해요', en: 'Great' };
  if (score >= 65) return { cls: 'bg-amber-500/20 text-amber-100 ring-amber-400/40', ko: '더 좋은 표현', en: 'Could be better' };
  return { cls: 'bg-red-500/20 text-red-100 ring-red-400/40', ko: '고쳐 볼까요?', en: "Let's fix this" };
}

export function Feedback({ msg, open, onToggle, onShadow }: { msg: ChatMessage; open: boolean; onToggle: () => void; onShadow: (r: ShadowRequest) => void }) {
  const t = useTr();
  const f = msg.feedback as TurnFeedback;
  const tone = scoreTone(f.score);
  const save = (en: string) => {
    const ok = addPhrase(en, '', 'correction');
    toast(ok ? t('표현집에 저장했어요 ⭐', 'Saved to your phrasebook ⭐') : t('이미 저장된 표현이에요', 'Already saved'), ok ? 'good' : 'info');
  };
  return (
    <div className="mt-1 flex flex-col items-end">
      <button onClick={onToggle} className={`chip ring-1 ${tone.cls}`}>
        {f.score >= 85 ? '✓' : '✎'} {t(tone.ko, tone.en)} · {f.score}
      </button>
      {open && (
        <div className="mt-2 w-full max-w-md space-y-2 rounded-xl bg-black/60 p-3 text-left text-sm animate-rise">
          {f.corrected && (
            <div>
              <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-white/40">{t('교정', 'Correction')}</div>
              <Diff from={msg.text} to={f.corrected} />
              <button className="ml-1 inline-flex align-middle text-sky-300" aria-label="listen" onClick={() => void speakPhrase(f.corrected!)}>
                <Volume2 size={14} />
              </button>
              <button className="ml-1 inline-flex align-middle text-sky-300" aria-label="repeat" onClick={() => onShadow({ text: f.corrected! })}>
                <MicVocal size={14} />
              </button>
            </div>
          )}
          {f.natural && (
            <div>
              <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-white/40">{t('원어민이라면', 'A native speaker might say')}</div>
              <span className="text-sky-100">{f.natural}</span>
              <button className="ml-1 inline-flex align-middle text-sky-300" aria-label="listen" onClick={() => void speakPhrase(f.natural!)}>
                <Volume2 size={14} />
              </button>
              <button className="ml-1 inline-flex align-middle text-sky-300" aria-label="repeat" onClick={() => onShadow({ text: f.natural! })}>
                <MicVocal size={14} />
              </button>
              <button className="ml-1 inline-flex align-middle text-yellow-300" aria-label="save" onClick={() => save(f.natural!)}>
                <Star size={14} />
              </button>
            </div>
          )}
          {f.explanation && <p className="text-white/75">💡 {f.explanation}</p>}
          {!f.corrected && !f.natural && <p className="text-emerald-200">{t('완벽해요! 그대로 쓰면 돼요.', 'Perfect — keep saying it like that!')}</p>}
        </div>
      )}
    </div>
  );
}

/** Status line under a player message: grading chip, retry, "say it again". */
export function PlayerMessageStatus({
  msg,
  failed,
  undoable,
  open,
  onToggle,
  onRetry,
  onUndo,
  onShadow,
}: {
  msg: ChatMessage;
  failed: boolean;
  undoable: boolean;
  open: boolean;
  onToggle: () => void;
  onRetry: () => void;
  onUndo: () => void;
  onShadow: (r: ShadowRequest) => void;
}) {
  const t = useTr();
  return (
    <div className="flex flex-col items-end">
      {msg.feedback ? (
        <Feedback msg={msg} open={open} onToggle={onToggle} onShadow={onShadow} />
      ) : failed ? (
        <button className="mt-1 chip bg-red-500/20 text-red-200 ring-1 ring-red-400/40" onClick={onRetry}>
          <RotateCcw size={12} /> {t('다시 보내기', 'Retry')}
        </button>
      ) : msg.ungraded ? (
        <span className="mt-1 chip bg-white/5 text-white/40">{t('채점을 건너뛰었어요', 'Not graded')}</span>
      ) : (
        <span className="mt-1 chip bg-white/5 text-white/50">
          <Loader2 size={12} className="animate-spin" /> {t('채점 중', 'Checking')}
        </span>
      )}
      {undoable && (
        <button className="mt-1 chip bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/40 hover:bg-sky-500/25" onClick={onUndo} title={t('잘못 인식됐거나 다시 말하고 싶을 때', 'Misheard, or want another go?')}>
          <Undo2 size={12} /> {msg.inputMode === 'voice' ? t('다시 말하기', 'Say it again') : t('다시 쓰기', 'Rewrite')}
        </button>
      )}
    </div>
  );
}

export function ChatLog({
  listRef,
  messages,
  npc,
  speakingId,
  pending,
  failedId,
  undoableId,
  emotion,
  onSpeak,
  onRetry,
  onUndo,
  onShadow,
}: {
  listRef: RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
  npc: Npc;
  speakingId: number | null;
  pending: boolean;
  failedId: number | null;
  undoableId: number | null;
  emotion: ChatMessage['emotion'];
  onSpeak: (m: ChatMessage, slow: boolean) => void;
  onRetry: () => void;
  onUndo: () => void;
  onShadow: (r: ShadowRequest) => void;
}) {
  const t = useTr();
  const settings = useGame((s) => s.save!.settings);
  const [open, setOpen] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const [translated, setTranslated] = useState<Set<number>>(() => new Set());
  const waitingForLine = pending && messages[messages.length - 1]?.role === 'player';

  return (
    <div ref={listRef} className="scroll-thin flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-6">
      {messages.map((m) => {
        if (m.role === 'npc') {
          const hidden = settings.subtitles === 'listen' && !revealed.has(m.id);
          const showNative = !!m.native && (settings.showTranslation || translated.has(m.id));
          return (
            <div key={m.id} className="flex max-w-[92%] items-end gap-2 animate-rise sm:max-w-[80%]">
              <Avatar look={npc.look} emotion={m.emotion ?? 'neutral'} size={34} className="shrink-0" />
              <div>
                <button
                  className={`rounded-2xl rounded-bl-md bg-white/10 px-4 py-2.5 text-left text-[15px] leading-relaxed text-white ${speakingId === m.id ? 'ring-2 ring-sky-400/60' : ''}`}
                  onClick={() => hidden && setRevealed((s) => new Set(s).add(m.id))}
                >
                  {hidden ? (
                    <span className="inline-flex items-center gap-2 text-white/60">
                      <Headphones size={16} /> {t('듣고 이해해 보세요 · 탭하면 자막', 'Listen first · tap for subtitles')}
                    </span>
                  ) : (
                    m.text
                  )}
                  {showNative && !hidden && <span className="mt-1 block text-sm text-white/55">{m.native}</span>}
                </button>
                <div className="mt-1 flex gap-1 pl-1">
                  <button className="icon-btn h-7 w-7 bg-white/5" aria-label="replay" onClick={() => onSpeak(m, false)}>
                    <Volume2 size={14} />
                  </button>
                  <button className="icon-btn h-7 w-7 bg-white/5" aria-label="slow" onClick={() => onSpeak(m, true)}>
                    <Snail size={14} />
                  </button>
                  <button className="icon-btn h-7 w-7 bg-white/5" aria-label={t('따라 말하기', 'Repeat after')} onClick={() => onShadow({ text: m.text, native: m.native, npc: true })}>
                    <MicVocal size={14} />
                  </button>
                  {m.native && (
                    <button
                      className={`icon-btn h-7 w-7 ${translated.has(m.id) ? 'bg-sky-500/30' : 'bg-white/5'}`}
                      aria-label="translate"
                      onClick={() =>
                        setTranslated((s) => {
                          const n = new Set(s);
                          if (n.has(m.id)) n.delete(m.id);
                          else n.add(m.id);
                          return n;
                        })
                      }
                    >
                      <Languages size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }
        const failed = failedId === m.id;
        return (
          <div key={m.id} className="ml-auto flex max-w-[92%] flex-col items-end animate-rise sm:max-w-[80%]">
            <div className={`rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed text-gray-950 ${failed ? 'bg-red-200' : 'bg-yellow-300'}`}>
              {m.inputMode === 'voice' && <Mic size={13} className="mr-1 inline align-[-2px] opacity-60" />}
              {m.text}
            </div>
            <PlayerMessageStatus
              msg={m}
              failed={failed}
              undoable={undoableId === m.id}
              open={open === m.id}
              onToggle={() => setOpen((o) => (o === m.id ? null : m.id))}
              onRetry={onRetry}
              onUndo={onUndo}
              onShadow={onShadow}
            />
          </div>
        );
      })}
      {waitingForLine && (
        <div className="flex items-center gap-2">
          <Avatar look={npc.look} emotion={emotion ?? 'neutral'} size={34} />
          <div className="flex gap-1 rounded-2xl bg-white/10 px-4 py-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="typing-dot h-2 w-2 rounded-full bg-white/70" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
