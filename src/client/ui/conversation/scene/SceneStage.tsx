// First-person conversation stage: you stand in front of the character (scene view), or hold the phone
// to your ear (call view). The latest lines are shown like game dialogue, earlier ones fade above them in the
// scene view; the full log (with grading) is one tap away.
import { PLACE_BY_ID } from '@shared/content/city';
import type { Npc, Scenario } from '@shared/types';
import { Captions, Headphones, Languages, MicVocal, PhoneCall, Snail, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, ConversationLaunch } from '../../../conversation/types';
import { useLang, useTr } from '../../../i18n';
import { useGame } from '../../../state/game';
import { Avatar } from '../../Avatar';
import { PlayerMessageStatus, type ShadowRequest } from '../ChatLog';
import { characterTransform, SceneBack, SceneFront, sceneFor } from './Backdrop';
import { Character } from './Character';
import { useBlink, useLipSync } from './useLipSync';

export interface StageProps {
  scenario: Scenario;
  npc: Npc;
  launch: ConversationLaunch;
  messages: ChatMessage[];
  speakingId: number | null;
  pending: boolean;
  failedId: number | null;
  undoableId: number | null;
  hour: number;
  onSpeak: (m: ChatMessage, slow: boolean) => void;
  onRetry: () => void;
  onUndo: () => void;
  onShadow: (r: ShadowRequest) => void;
}

/** Earlier lines, faded over the scene above the dialogue box, so the conversation can be followed without opening the log. */
function HistoryOverlay({ messages, npcName }: { messages: ChatMessage[]; npcName: string }) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);
  if (messages.length === 0) return null;
  return (
    <div
      ref={listRef}
      className="scroll-thin pointer-events-auto flex max-h-[28vh] flex-col gap-1.5 overflow-y-auto pt-6"
      style={{ maskImage: 'linear-gradient(to bottom, transparent, black 28px)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 28px)' }}
    >
      {messages.map((m) =>
        m.role === 'npc' ? (
          <div key={m.id} className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-black/55 px-3 py-1.5 text-[13px] leading-snug text-white/85 backdrop-blur sm:max-w-[65%]">
            <span className="mr-1.5 font-semibold text-yellow-300/90">{npcName.split(' ')[0]}</span>
            {m.text}
          </div>
        ) : (
          <div key={m.id} className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-yellow-300/75 px-3 py-1.5 text-[13px] leading-snug text-gray-950 backdrop-blur sm:max-w-[65%]">
            {m.text}
          </div>
        ),
      )}
    </div>
  );
}

/** Latest NPC line + the player's latest line with its grading, as a dialogue box. */
function DialogueDock({ p, subtitlesByDefault, showHistory = false }: { p: StageProps; subtitlesByDefault: boolean; showHistory?: boolean }) {
  const t = useTr();
  const lang = useLang();
  const settings = useGame((s) => s.save!.settings);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [translate, setTranslate] = useState(false);
  const [openFeedback, setOpenFeedback] = useState<number | null>(null);
  const lastNpc = [...p.messages].reverse().find((m) => m.role === 'npc');
  const last = p.messages[p.messages.length - 1];
  const lastPlayer = [...p.messages].reverse().find((m) => m.role === 'player');
  const hidden = !!lastNpc && (!subtitlesByDefault || settings.subtitles === 'listen') && revealed !== lastNpc.id;
  const waiting = p.pending && last?.role === 'player';
  const earlier = p.messages.filter((m) => m !== lastNpc && m !== lastPlayer);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 px-3 pb-3 sm:px-6">
      {showHistory && <HistoryOverlay messages={earlier} npcName={p.npc.name} />}
      {lastPlayer && (
        <div className="pointer-events-auto ml-auto flex max-w-[88%] flex-col items-end animate-rise sm:max-w-[70%]">
          <div
            className={`rounded-2xl rounded-br-md px-4 py-2 leading-relaxed text-gray-950 shadow-lg transition-all ${p.failedId === lastPlayer.id ? 'bg-red-200' : 'bg-yellow-300'} ${last === lastPlayer ? 'text-[15px]' : 'text-[13px] opacity-80'}`}
          >
            {lastPlayer.text}
          </div>
          <PlayerMessageStatus
            msg={lastPlayer}
            failed={p.failedId === lastPlayer.id}
            undoable={p.undoableId === lastPlayer.id}
            open={openFeedback === lastPlayer.id}
            onToggle={() => setOpenFeedback((o) => (o === lastPlayer.id ? null : lastPlayer.id))}
            onRetry={p.onRetry}
            onUndo={p.onUndo}
            onShadow={p.onShadow}
          />
        </div>
      )}
      {lastNpc && !waiting && (
        <div key={lastNpc.id} className="pointer-events-auto rounded-2xl border border-white/10 bg-black/70 p-3 shadow-2xl backdrop-blur-md animate-rise sm:p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="chip bg-yellow-400 py-0.5 text-gray-950">{p.npc.name}</span>
            <span className="truncate text-xs text-white/50">{lang === 'ko' ? p.npc.roleKo : p.npc.role}</span>
            {p.speakingId === lastNpc.id && <span className="ml-auto flex items-end gap-0.5">{[0, 1, 2].map((i) => <span key={i} className="typing-dot h-3 w-1 rounded bg-sky-300" style={{ animationDelay: `${i * 0.12}s` }} />)}</span>}
          </div>
          <button className="block w-full text-left text-[16px] leading-relaxed text-white sm:text-[17px]" onClick={() => hidden && setRevealed(lastNpc.id)}>
            {hidden ? (
              <span className="inline-flex items-center gap-2 text-white/60">
                <Headphones size={16} /> {t('잘 듣고 대답해 보세요 · 탭하면 자막', 'Listen and answer · tap for subtitles')}
              </span>
            ) : (
              lastNpc.text
            )}
          </button>
          {!hidden && lastNpc.native && (settings.showTranslation || translate) && <p className="mt-1 text-sm text-white/55">{lastNpc.native}</p>}
          <div className="mt-2 flex gap-1">
            <button className="icon-btn h-8 w-8 bg-white/10" aria-label="replay" onClick={() => p.onSpeak(lastNpc, false)}>
              <Volume2 size={15} />
            </button>
            <button className="icon-btn h-8 w-8 bg-white/10" aria-label="slow" onClick={() => p.onSpeak(lastNpc, true)}>
              <Snail size={15} />
            </button>
            <button className="icon-btn h-8 w-8 bg-white/10" aria-label={t('따라 말하기', 'Repeat after')} onClick={() => p.onShadow({ text: lastNpc.text, native: lastNpc.native, npc: true })}>
              <MicVocal size={15} />
            </button>
            {lastNpc.native && (
              <button className={`icon-btn h-8 w-8 ${translate ? 'bg-sky-500/40' : 'bg-white/10'}`} aria-label="translate" onClick={() => setTranslate((v) => !v)}>
                <Languages size={15} />
              </button>
            )}
            {hidden && (
              <button className="chip ml-auto bg-white/10 text-white/70" onClick={() => setRevealed(lastNpc.id)}>
                <Captions size={13} /> {t('자막', 'Subtitles')}
              </button>
            )}
          </div>
        </div>
      )}
      {waiting && (
        <div className="pointer-events-auto flex w-fit items-center gap-2 rounded-2xl bg-black/60 px-4 py-3 backdrop-blur">
          <span className="text-xs font-semibold text-white/70">{p.npc.name.split(' ')[0]}</span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="typing-dot h-2 w-2 rounded-full bg-white/80" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      )}
    </div>
  );
}

function useLatestNpc(messages: ChatMessage[]) {
  const lastNpc = [...messages].reverse().find((m) => m.role === 'npc');
  return { lastNpc, emotion: lastNpc?.emotion ?? 'neutral' };
}

/** You, standing in front of the character. */
export function SceneStage(p: StageProps) {
  const { lastNpc, emotion } = useLatestNpc(p.messages);
  const speaking = p.speakingId !== null;
  const mouth = useLipSync(speaking);
  const blink = useBlink();
  const place = p.scenario.placeId ? PLACE_BY_ID.get(p.scenario.placeId) : undefined;
  const spec = useMemo(() => sceneFor({ placeId: p.scenario.placeId, placeName: place?.name, kind: p.scenario.kind, context: p.scenario.context }), [p.scenario, place]);
  const thinking = p.pending && p.messages[p.messages.length - 1]?.role === 'player';

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="fp-camera absolute inset-0 h-full w-full" aria-hidden="true">
        <SceneBack spec={spec} hour={p.hour} />
        <g transform={characterTransform(spec.style)}>
          <Character look={p.npc.look} emotion={emotion} mouth={mouth} blink={blink} reactKey={lastNpc?.id ?? 0} />
          {thinking && (
            <g className="animate-pulse">
              <circle cx="146" cy="16" r="6" fill="#fff" opacity="0.85" />
              <ellipse cx="160" cy="-4" rx="20" ry="13" fill="#fff" opacity="0.9" />
              <text x="160" y="1" textAnchor="middle" fontSize="16" fontWeight="700" fill="#374151">
                …
              </text>
            </g>
          )}
        </g>
        <SceneFront spec={spec} />
      </svg>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 42%, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
      <DialogueDock p={p} subtitlesByDefault showHistory />
    </div>
  );
}

/** Audio-only phone call: no face to read, subtitles off by default. */
export function CallStage(p: StageProps) {
  const t = useTr();
  const lang = useLang();
  const speaking = p.speakingId !== null;
  const { emotion } = useLatestNpc(p.messages);
  const [seconds, setSeconds] = useState(0);
  const spec = useMemo(() => sceneFor({ kind: 'street' }), []);
  const place = p.scenario.placeId ? PLACE_BY_ID.get(p.scenario.placeId) : undefined;

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full scale-110 opacity-60 blur-md" aria-hidden="true">
        <SceneBack spec={spec} hour={p.hour} />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/70 via-gray-950/70 to-black/90" />
      <div className="relative flex flex-col items-center pt-8 sm:pt-12">
        <div className="relative">
          {speaking && (
            <>
              <span className="call-ring absolute inset-0 rounded-full bg-emerald-400/40" />
              <span className="call-ring absolute inset-0 rounded-full bg-emerald-400/30" style={{ animationDelay: '0.5s' }} />
            </>
          )}
          <Avatar look={p.npc.look} emotion={emotion} size={132} talking={speaking} className="relative shadow-2xl ring-4 ring-white/15" />
        </div>
        <div className="mt-3 text-xl font-bold text-white">{p.npc.name}</div>
        <div className="text-sm text-white/60">{place ? `${place.icon} ${lang === 'ko' ? place.nameKo : place.name}` : lang === 'ko' ? p.npc.roleKo : p.npc.role}</div>
        <div className="mt-2 flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-200">
          <PhoneCall size={14} /> {t('통화 중', 'On call')} {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
        </div>
        <p className="mt-3 max-w-xs text-center text-xs text-white/40">{t('📞 전화는 표정이 보이지 않아요. 잘 안 들리면 "Sorry, could you repeat that?" 이라고 말해 보세요.', "📞 No face to read on the phone. If you miss something, say “Sorry, could you repeat that?”")}</p>
      </div>
      <DialogueDock p={p} subtitlesByDefault={false} />
    </div>
  );
}
