import { PLACE_BY_ID } from '@shared/content/city';
import { Clapperboard, Heart, ListChecks, MessagesSquare, PhoneOff, Volume2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { speakNpc, speakPhrase } from '../../audio/voice';
import type { ConversationLaunch, ConversationSummary } from '../../conversation/types';
import { useConversation } from '../../conversation/useConversation';
import { useLang, useTr } from '../../i18n';
import { updateSettings, useGame } from '../../state/game';
import { toast, useUi } from '../../state/ui';
import { Avatar } from '../Avatar';
import { ChatLog, type ShadowRequest } from './ChatLog';
import { Composer, type ComposerHandle } from './Composer';
import { RouteMap } from './RouteMap';
import { CallStage, SceneStage } from './scene/SceneStage';
import { ShadowSheet } from './ShadowSheet';

export function ConversationView({ launch, onEnd }: { launch: ConversationLaunch; onEnd: (s: ConversationSummary) => void }) {
  const t = useTr();
  const lang = useLang();
  const sceneView = useGame((s) => s.save!.settings.sceneView);
  const hour = useUi((s) => Math.floor(s.hud.clock / 60) % 24);
  const conv = useConversation(launch);
  const { scenario, npc, state, hint } = conv;
  const [showInfo, setShowInfo] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [mouth, setMouth] = useState(false);
  const [shadow, setShadow] = useState<ShadowRequest | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const composer = useRef<ComposerHandle>(null);
  const ended = state.status !== 'ongoing';
  const place = scenario.placeId ? PLACE_BY_ID.get(scenario.placeId) : undefined;
  const isCall = scenario.kind === 'call';
  const stage = isCall ? (sceneView ? 'call' : 'chat') : sceneView ? 'scene' : 'chat';

  // Scroll to the newest message.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.messages.length, state.pending, hint, showLog, stage]);

  // Mouth flap for the small avatars while the NPC talks.
  useEffect(() => {
    if (state.speakingId === null) return;
    const id = setInterval(() => setMouth((m) => !m), 170);
    return () => {
      clearInterval(id);
      setMouth(false);
    };
  }, [state.speakingId]);

  // Finish: let the last line play, then hand over to the results screen.
  useEffect(() => {
    if (!ended) return;
    if (state.status === 'abandoned') {
      onEnd(conv.summarize());
      return;
    }
    if (state.speakingId !== null) return;
    sfx.play(state.status === 'success' ? 'success' : 'fail');
    const id = setTimeout(() => onEnd(conv.summarize()), 2200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended, state.status, state.speakingId]);

  const send = conv.send;
  const onSend = useCallback((text: string, mode: 'voice' | 'text') => void send(text, mode), [send]);

  /** "Say it again": take back the last message, then re-record (voice) or edit (text). */
  const undo = () => {
    const u = conv.undo();
    if (!u) return;
    if (u.mode === 'voice') {
      toast(t('다시 말해 보세요 🎤', 'Go ahead, say it again 🎤'), 'info');
      composer.current?.listen();
    } else composer.current?.setText(u.text);
  };

  const lastNpc = [...state.messages].reverse().find((m) => m.role === 'npc');
  const emotion = lastNpc?.emotion ?? 'neutral';
  const moodColor = state.mood > 60 ? 'bg-emerald-400' : state.mood > 30 ? 'bg-amber-400' : 'bg-red-500';
  const required = scenario.objectives.filter((o) => !o.bonus);
  const doneCount = required.filter((o) => state.completed.includes(o.id)).length;
  const leave = () => (scenario.freeTalk ? conv.finish() : setConfirmLeave(true));

  const objectives = (
    <ul className="space-y-1.5">
      {scenario.objectives.map((o) => {
        const done = state.completed.includes(o.id);
        const fresh = state.justCompleted.includes(o.id);
        return (
          <li
            key={o.id}
            className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-sm transition ${done ? 'bg-emerald-500/15 text-emerald-100' : o.bonus ? 'bg-yellow-400/5 text-yellow-100/80' : 'bg-white/5 text-white/80'} ${fresh ? 'animate-pop ring-2 ring-emerald-400' : ''}`}
          >
            <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${done ? 'bg-emerald-400 text-gray-900' : 'border border-white/30'}`}>{done ? '✓' : o.bonus ? '★' : ''}</span>
            <span className={done ? 'line-through decoration-emerald-300/50' : ''}>{o.label[lang]}</span>
          </li>
        );
      })}
    </ul>
  );

  const log = (
    <ChatLog
      listRef={listRef}
      messages={state.messages}
      npc={npc}
      speakingId={state.speakingId}
      pending={state.pending}
      failedId={state.failedId}
      undoableId={state.undoableId}
      emotion={emotion}
      onSpeak={(m, slow) => void conv.speak(m, slow)}
      onRetry={conv.retry}
      onUndo={undo}
      onShadow={setShadow}
    />
  );

  const stageProps = {
    scenario,
    npc,
    launch,
    messages: state.messages,
    speakingId: state.speakingId,
    pending: state.pending,
    failedId: state.failedId,
    undoableId: state.undoableId,
    hour,
    onSpeak: (m: (typeof state.messages)[number], slow: boolean) => void conv.speak(m, slow),
    onRetry: conv.retry,
    onUndo: undo,
    onShadow: setShadow,
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gradient-to-b from-gray-950/95 via-gray-950/90 to-gray-950/95 backdrop-blur-sm animate-fade">
      {/* Header */}
      <header className="safe-x flex items-center gap-3 border-b border-white/10 py-2 safe-top">
        <button className={`icon-btn ${isCall ? 'bg-red-500 hover:bg-red-400' : ''}`} aria-label={isCall ? t('전화 끊기', 'Hang up') : t('대화 나가기', 'Leave conversation')} onClick={leave} disabled={ended}>
          {isCall ? <PhoneOff size={18} /> : <X size={18} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-yellow-300/90">
            {isCall ? t('📞 전화 통화', '📞 Phone call') : place ? `${place.icon} ${lang === 'ko' ? place.nameKo : place.name}` : scenario.kind === 'romance' ? t('💕 미선과 함께', '💕 With Miseon') : t('거리 이벤트', 'Street event')}
          </div>
          <div className="display truncate text-lg uppercase leading-tight text-white">{scenario.title[lang]}</div>
        </div>
        <div className="flex items-center gap-2" title={t('상대의 기분', 'Mood')}>
          <Heart size={16} className={state.mood > 30 ? 'text-rose-300' : 'text-red-500 animate-pulse'} fill="currentColor" />
          <div className="h-2 w-12 overflow-hidden rounded-full bg-white/10 sm:w-24">
            <div className={`h-full rounded-full transition-all duration-700 ${moodColor}`} style={{ width: `${state.mood}%` }} />
          </div>
        </div>
        <button
          className="icon-btn h-9 w-9"
          aria-label={sceneView ? t('채팅 화면으로', 'Chat layout') : t('1인칭 화면으로', 'First-person view')}
          title={sceneView ? t('채팅 화면으로', 'Chat layout') : t('1인칭 화면으로', 'First-person view')}
          onClick={() => updateSettings({ sceneView: !sceneView })}
        >
          {sceneView ? <MessagesSquare size={17} /> : <Clapperboard size={17} />}
        </button>
        {scenario.freeTalk ? (
          <button className="chip bg-pink-500/80 py-1.5 text-white hover:bg-pink-500" onClick={conv.finish} disabled={ended || state.pending}>
            {isCall ? t('통화 마치기', 'End call') : t('대화 마치기', 'End chat')}
          </button>
        ) : (
          <div className="chip bg-white/10 text-white/80">
            {Math.min(state.turns + 1, scenario.maxTurns)}/{scenario.maxTurns}
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Side panel (desktop): objectives always visible, in every layout */}
        <aside className="scroll-thin hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-white/10 p-4 md:flex">
          {stage === 'chat' && (
            <div className="flex flex-col items-center text-center">
              <Avatar look={npc.look} emotion={emotion} talking={mouth} size={128} className="shadow-xl ring-4 ring-white/10" />
              <div className="mt-2 font-bold text-white">{npc.name}</div>
              <div className="text-sm text-white/50">{lang === 'ko' ? npc.roleKo : npc.role}</div>
            </div>
          )}
          {scenario.freeTalk ? (
            <p className="rounded-lg bg-pink-500/10 px-3 py-2 text-sm text-pink-100">{t('💬 자유 대화 — 목표 없이 하고 싶은 말을 마음껏 해 보세요.', '💬 Free chat — no goals, just talk.')}</p>
          ) : (
            <div>
              <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">{t('목표', 'Objectives')}</h3>
              {objectives}
            </div>
          )}
          {launch.routePreview && <RouteMap points={launch.routePreview} height={160} />}
          <div>
            <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">{t('유용한 표현', 'Useful phrases')}</h3>
            <ul className="space-y-0.5">
              {scenario.phrases.map((p) => (
                <li key={p.en}>
                  <button className="w-full rounded-md px-2 py-1 text-left text-xs text-white/75 hover:bg-white/5" onClick={() => void speakPhrase(p.en)}>
                    {p.en}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col">
          {/* Info strip: goals and (in the scene) the full log */}
          <div className={`flex items-center gap-3 border-b border-white/10 px-3 py-2 ${stage === 'chat' ? 'md:hidden' : ''}`}>
            {stage === 'chat' && <Avatar look={npc.look} emotion={emotion} talking={mouth} size={44} />}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-white">{npc.name}</div>
              <div className="text-xs text-white/50">{scenario.freeTalk ? t('자유 대화', 'Free chat') : `${t('목표', 'Goals')} ${doneCount}/${required.length}`}</div>
            </div>
            {stage !== 'chat' && (
              <button className={`btn-ghost px-3 py-1.5 text-xs ${showLog ? 'bg-white/20' : ''}`} onClick={() => setShowLog((v) => !v)}>
                <MessagesSquare size={15} /> {t('대화 기록', 'Log')}
              </button>
            )}
            {!scenario.freeTalk && (
              <button className={`btn-ghost px-3 py-1.5 text-xs md:hidden ${showInfo ? 'bg-white/20' : ''}`} onClick={() => setShowInfo((v) => !v)}>
                <ListChecks size={15} /> {t('목표', 'Goals')}
              </button>
            )}
          </div>
          {showInfo && (
            <div className="scroll-thin absolute inset-x-0 top-[53px] z-10 max-h-[55%] space-y-3 overflow-y-auto border-b border-white/10 bg-gray-950/95 p-3 animate-rise md:hidden">
              {objectives}
              {launch.routePreview && <RouteMap points={launch.routePreview} height={140} />}
              <div className="flex flex-wrap gap-1.5">
                {scenario.phrases.map((p) => (
                  <button key={p.en} className="chip bg-white/10 text-white/80" onClick={() => void speakPhrase(p.en)}>
                    <Volume2 size={12} /> {p.en}
                  </button>
                ))}
              </div>
            </div>
          )}

          {stage === 'chat' ? log : stage === 'call' ? <CallStage {...stageProps} /> : <SceneStage {...stageProps} />}
          {/* Phones: no room for the side panel, so the goals float over the top-left of the scene. */}
          {stage !== 'chat' && !scenario.freeTalk && !showInfo && !showLog && (
            <ul className="pointer-events-none absolute left-2 top-[60px] z-[5] max-w-[60%] space-y-1 md:hidden">
              {scenario.objectives.map((o) => {
                const done = state.completed.includes(o.id);
                return (
                  <li
                    key={o.id}
                    className={`flex items-start gap-1.5 rounded-lg px-2 py-1 text-[11px] leading-snug backdrop-blur ${done ? 'bg-emerald-600/70 text-white' : o.bonus ? 'bg-black/55 text-yellow-100' : 'bg-black/55 text-white/90'} ${state.justCompleted.includes(o.id) ? 'animate-pop' : ''}`}
                  >
                    <span className="shrink-0">{done ? '✓' : o.bonus ? '★' : '○'}</span>
                    <span className={done ? 'line-through decoration-white/50' : ''}>{o.label[lang]}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {stage !== 'chat' && showLog && <div className="absolute inset-x-0 bottom-0 top-[53px] z-10 flex flex-col bg-gray-950/95 animate-rise">{log}</div>}

          {/* Hint sheet */}
          {hint && (
            <div className="mx-3 my-2 rounded-2xl border border-yellow-400/30 bg-gray-950/90 p-3 animate-rise sm:mx-6">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="text-sm text-yellow-100">💡 {hint.tip}</p>
                <button className="text-white/50 hover:text-white" aria-label="close hint" onClick={() => conv.setHint(null)}>
                  <X size={16} />
                </button>
              </div>
              <ul className="space-y-1.5">
                {hint.suggestions.map((s) => (
                  <li key={s.en} className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2">
                    <button className="text-sky-300" aria-label="listen" onClick={() => void speakPhrase(s.en)}>
                      <Volume2 size={15} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white">{s.en}</div>
                      <div className="text-xs text-white/50">{s.native}</div>
                    </div>
                    <button className="btn-ghost shrink-0 px-2.5 py-1 text-xs" onClick={() => composer.current?.setText(s.en)}>
                      {t('입력', 'Use')}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-yellow-100/60">{t('힌트를 쓰면 보상이 조금 줄어요. 직접 말해 보는 게 가장 좋아요!', 'Hints reduce your reward a little. Saying it yourself is best!')}</p>
            </div>
          )}

          {state.error && (
            <div className="mx-3 my-2 flex items-center justify-between gap-2 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-100 sm:mx-6">
              <span>{state.error}</span>
              {state.failedId !== null && (
                <button className="btn-ghost px-3 py-1 text-xs" onClick={conv.retry}>
                  {t('다시 시도', 'Retry')}
                </button>
              )}
            </div>
          )}

          <Composer ref={composer} ended={ended} pending={state.pending} hintLoading={conv.hintLoading} onHint={() => void conv.requestHint()} onTranslate={conv.translate} onSend={onSend} />
        </main>
      </div>

      {/* End banner */}
      {ended && state.status !== 'abandoned' && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center">
          <div className={`display outline-text animate-banner text-5xl uppercase sm:text-7xl ${state.status === 'success' ? 'text-yellow-400' : 'text-red-500'}`}>
            {state.status === 'success' ? (scenario.freeTalk ? t('즐거운 대화 💕', 'Lovely chat 💕') : t('미션 성공', 'Mission passed')) : t('미션 실패', 'Mission failed')}
          </div>
          {state.status === 'failure' && (
            <div className="mt-2 rounded-full bg-black/60 px-4 py-1.5 text-sm text-white/80 animate-fade">
              {state.mood <= 0 ? t(`${npc.name.split(' ')[0]} 님이 인내심을 잃었어요`, `${npc.name.split(' ')[0]} ran out of patience`) : t('턴을 모두 사용했어요', 'Out of turns')}
            </div>
          )}
        </div>
      )}

      {confirmLeave && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4 animate-fade">
          <div className="panel max-w-sm p-5 text-center animate-pop">
            <p className="font-semibold text-white">{isCall ? t('전화를 끊을까요?', 'Hang up?') : t('대화를 그만둘까요?', 'Leave this conversation?')}</p>
            <p className="mt-1 text-sm text-white/60">{t('보상을 받을 수 없어요.', "You won't get a reward.")}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button className="btn-ghost" onClick={() => setConfirmLeave(false)}>
                {t('계속하기', 'Keep talking')}
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  setConfirmLeave(false);
                  conv.abandon();
                }}
              >
                {isCall ? t('끊기', 'Hang up') : t('나가기', 'Leave')}
              </button>
            </div>
          </div>
        </div>
      )}

      {shadow && <ShadowSheet text={shadow.text} native={shadow.native} speak={shadow.npc ? (slow) => speakNpc(shadow.text, npc, slow) : undefined} onClose={() => setShadow(null)} />}
    </div>
  );
}
