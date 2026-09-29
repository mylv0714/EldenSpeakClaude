import { INCOMING_CALLS } from '@shared/content/calls';
import { PARTNER_STAGE } from '@shared/content/romance';
import { CONTACTS, STORY } from '@shared/content/story';
import { getScenario } from '@shared/content/scenarios';
import type { CarModelId, Scenario } from '@shared/types';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { stopSpeaking } from '../audio/voice';
import type { ConversationLaunch, ConversationSummary } from '../conversation/types';
import { Game, type EngineEvent } from '../game/engine';
import { CAR_MODELS } from '../game/vehicle';
import { tr, useTr } from '../i18n';
import { platform } from '../platform';
import {
  applyConversation,
  collectIdiom,
  type ConversationApplied,
  earn,
  flushSave,
  getSave,
  markTutorial,
  mutate,
  payFine,
  setSave,
  startStoryStep,
  useGame,
} from '../state/game';
import { deleteSave } from '../state/save';
import { closeOverlay, openOverlay, type PhoneApp, setHud, setScreen, showBanner, toast, useUi } from '../state/ui';
import { Briefing } from './conversation/Briefing';
import { ConversationView } from './conversation/ConversationView';
import { Results } from './conversation/Results';
import { Hud } from './hud/Hud';
import { IncomingCall } from './hud/IncomingCall';
import { TouchControls } from './hud/TouchControls';
import { IdiomCard } from './IdiomCard';
import { PauseMenu } from './PauseMenu';
import type { PhoneActions } from './phone/Phone';
import { Phone } from './phone/Phone';
import { NightScene } from './NightScene';
import { OverheardQuiz } from './OverheardQuiz';
import { PlaceMenu } from './PlaceMenu';
import { Shop } from './Shop';

function launchFor(s: Scenario): ConversationLaunch {
  return { scenarioId: s.id, npcId: s.npcId!, origin: { kind: 'place', placeId: s.placeId! } };
}

/** Real-time gap between incoming calls (they only ring while you roam freely). */
const CALL_GAP_MS = 6 * 60_000;

export function GameScreen() {
  const t = useTr();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game | null>(null);
  const overlay = useUi((s) => s.overlay);
  const storyStep = useGame((s) => s.save?.storyStep ?? 0);
  const [applied, setApplied] = useState<ConversationApplied | null>(null);
  const [incoming, setIncoming] = useState<Scenario | null>(null);
  const lastCallAt = useRef(Date.now());
  const touch = useMemo(() => window.matchMedia('(pointer: coarse)').matches, []);

  const deliverStoryMessage = useCallback(() => {
    const before = getSave();
    const step = STORY[before.storyStep];
    if (!step) return;
    startStoryStep();
    if (step.onStart?.type === 'loseCar') game.current?.removeOwnedCar(step.onStart.model);
    if (step.message) {
      sfx.play('message');
      toast(tr(`📱 새 메시지 · ${CONTACTS[step.message.from].name.ko}`, `📱 New message · ${CONTACTS[step.message.from].name.en}`), 'info');
    }
  }, []);

  const onEvent = useCallback((e: EngineEvent) => {
    switch (e.type) {
      case 'hud':
        setHud(e.hud);
        break;
      case 'place':
        openOverlay({ kind: 'place', placeId: e.placeId });
        break;
      case 'talk':
        sfx.play('pop');
        // Casual chats (Miseon, a passerby) start right away; everything else gets a briefing first.
        openOverlay({ kind: e.launch.origin.kind === 'companion' || e.launch.origin.kind === 'passerby' ? 'conversation' : 'briefing', launch: e.launch });
        break;
      case 'toast':
        toast(e.text, e.tone);
        break;
      case 'coin':
        collectIdiom(e.idiomId);
        openOverlay({ kind: 'idiom', idiomId: e.idiomId });
        break;
      case 'earn':
        earn(e.amount);
        sfx.play('cash');
        toast(`+$${e.amount} · ${e.reason}`, 'cash');
        break;
      case 'fine': {
        const paid = payFine(e.amount);
        sfx.play('fail');
        toast(`-$${paid} · ${e.reason}`, 'bad');
        break;
      }
      case 'wanted':
        setHud({ wanted: e.level });
        if (e.level > 0) toast(tr(`수배 레벨 ${'★'.repeat(e.level)}`, `Wanted ${'★'.repeat(e.level)}`), 'bad');
        break;
      case 'overheard':
        setTimeout(() => {
          if (useUi.getState().overlay.kind === 'none') openOverlay({ kind: 'overheard', id: e.id });
        }, 900);
        break;
    }
  }, []);

  // ── Incoming phone calls ──
  const ring = useCallback((scenario?: Scenario) => {
    const scam = getSave().storyStep >= 4 && Math.random() < 0.4;
    setIncoming(scenario ?? INCOMING_CALLS.find((c) => c.id === (scam ? 'call_scam' : 'call_leo'))!);
    lastCallAt.current = Date.now();
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      const g = game.current;
      if (!g || incoming || useUi.getState().overlay.kind !== 'none' || g.hasJob || getSave().storyStep < 2) return;
      if (Date.now() - lastCallAt.current > CALL_GAP_MS && Math.random() < 0.4) ring();
    }, 20_000);
    return () => clearInterval(id);
  }, [incoming, ring]);
  useEffect(() => {
    if (import.meta.env.DEV) Object.assign(window, { __ring: (id?: string) => ring(id ? getScenario(id) : undefined) });
  }, [ring]);
  const answerCall = () => {
    const s = incoming!;
    setIncoming(null);
    sfx.unlock();
    openOverlay({ kind: 'conversation', launch: { scenarioId: s.id, npcId: s.npcId!, origin: { kind: 'call' } } });
  };
  const missedCall = useCallback(() => {
    setIncoming(null);
    toast(tr('📵 부재중 전화', '📵 Missed call'), 'info');
  }, []);

  // Engine lifecycle.
  useEffect(() => {
    const g = new Game({ canvas: canvasRef.current!, minimap: minimapRef.current, onEvent });
    game.current = g;
    g.start();
    if (import.meta.env.DEV) Object.assign(window, { __game: g, __save: { get: getSave, mutate } });
    const save = getSave();
    const lastCar = save.cars[save.cars.length - 1];
    if (lastCar) g.spawnOwnedCar(lastCar);
    // A chapter message may have been lost if the app closed right after a story mission.
    const step = STORY[save.storyStep];
    if (step?.message && !save.messages.some((m) => m.id === `story${save.storyStep}`)) setTimeout(deliverStoryMessage, 1500);
    if (!save.tutorial.welcome) {
      markTutorial('welcome');
      setTimeout(() => {
        showBanner('Elden City', 'info', tr('노란 마커 ✈️ 로 가서 입국 심사를 받으세요', 'Walk to the yellow ✈️ marker for immigration'));
      }, 800);
    }
    return () => {
      g.destroy();
      game.current = null;
    };
  }, [onEvent, deliverStoryMessage]);

  // Pause the world under any overlay.
  useEffect(() => {
    game.current?.setPaused(overlay.kind !== 'none');
    if (overlay.kind === 'none') stopSpeaking();
  }, [overlay.kind]);

  // App lifecycle: pause when backgrounded; Android back closes things.
  useEffect(() => {
    const offPause = platform().onPause(() => {
      flushSave();
      sfx.suspend();
      if (useUi.getState().overlay.kind === 'none') openOverlay({ kind: 'pause' });
    });
    const offResume = platform().onResume(() => sfx.resume());
    const offBack = platform().onBackButton(() => {
      const o = useUi.getState().overlay;
      if (o.kind === 'none') openOverlay({ kind: 'pause' });
      else if (o.kind === 'phone' && o.app !== 'home') openOverlay({ kind: 'phone', app: 'home' });
      else if (o.kind === 'phone' || o.kind === 'pause' || o.kind === 'place' || o.kind === 'shop' || o.kind === 'idiom') closeOverlay();
      return true;
    });
    return () => {
      offPause();
      offResume();
      offBack();
    };
  }, []);

  // Keyboard shortcuts (only while playing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      const o = useUi.getState().overlay;
      if (e.code === 'Escape') {
        if (o.kind === 'none') openOverlay({ kind: 'pause' });
        else if (o.kind === 'phone' || o.kind === 'pause' || o.kind === 'place' || o.kind === 'shop') closeOverlay();
        return;
      }
      if (o.kind !== 'none' && o.kind !== 'phone') return;
      if (e.code === 'KeyP' || e.code === 'Tab') {
        e.preventDefault();
        if (o.kind === 'phone') closeOverlay();
        else openOverlay({ kind: 'phone', app: 'home' });
      } else if (e.code === 'KeyM') openOverlay({ kind: 'phone', app: 'map' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const quitToTitle = useCallback(async (reset = false) => {
    game.current?.setPaused(true);
    if (reset) {
      await deleteSave();
      setSave(null);
    } else flushSave();
    closeOverlay();
    setScreen('title');
  }, []);

  const phoneActions: PhoneActions = useMemo(
    () => ({
      setWaypoint: (placeId) => game.current?.setWaypointToPlace(placeId),
      waypointPlaceId: () => game.current?.waypointPlaceId ?? null,
      playerPos: () => game.current?.position ?? { x: 0, y: 0 },
      deliverCar: (model: CarModelId) => game.current?.spawnOwnedCar(model),
      hasJob: () => game.current?.hasJob ?? false,
      endJob: () => game.current?.endJob(),
      quitToTitle: (reset) => void quitToTitle(reset),
      setCompanion: (on) => game.current?.setCompanion(on),
      talkToCompanion: () => {
        closeOverlay();
        setTimeout(() => game.current?.talkToCompanion(), 50);
      },
      startCall: (scenarioId) => {
        const s = getScenario(scenarioId);
        openOverlay({ kind: 'briefing', launch: { scenarioId: s.id, npcId: s.npcId!, origin: { kind: 'call' } } });
      },
    }),
    [quitToTitle],
  );

  // ── Conversation flow ──
  const endConversation = (summary: ConversationSummary) => {
    const result = applyConversation({
      scenarioId: summary.launch.scenarioId,
      npcId: summary.launch.npcId,
      outcome: summary.outcome,
      stars: summary.stars,
      avgScore: summary.avgScore,
      turns: summary.messages.filter((m) => m.role === 'player').length,
      reward: summary.reward,
    });
    setApplied(result);
    openOverlay({ kind: 'results', summary });
  };

  const afterResults = (summary: ConversationSummary) => {
    closeOverlay();
    game.current?.conversationEnded(summary.launch, summary.outcome, summary.mood);
    for (const e of applied?.effects ?? []) {
      if (e.type === 'giveCar') {
        game.current?.spawnOwnedCar(e.model);
        toast(tr(`🚗 ${CAR_MODELS[e.model].name}을(를) 받았어요! 근처 도로에 있어요.`, `🚗 You got the ${CAR_MODELS[e.model].name}! It's on the nearest road.`), 'good');
      } else if (e.type === 'unlockJob') {
        toast(e.job === 'taxi' ? tr('🚕 택시 알바가 열렸어요!', '🚕 Taxi job unlocked!') : tr('🍕 피자 배달 알바가 열렸어요!', '🍕 Pizza delivery unlocked!'), 'good');
      } else if (e.type === 'coupon') {
        toast(tr('🎟️ 엘든 모터스 20% 할인 쿠폰 획득!', '🎟️ 20% Elden Motors coupon earned!'), 'good');
      } else if (e.type === 'message') {
        setTimeout(() => {
          sfx.play('message');
          const c = CONTACTS[e.from as keyof typeof CONTACTS];
          toast(tr(`📱 새 메시지 · ${c?.name.ko ?? e.from}`, `📱 New message · ${c?.name.en ?? e.from}`), 'info');
        }, 1500);
      } else if (e.type === 'romance' && e.stage >= PARTNER_STAGE) {
        game.current?.setCompanion(true);
        showBanner(tr('💕 연인이 되었어요', '💕 You are a couple'), 'pass', tr('이제 미선이 함께 다녀요 · T 키로 언제든 대화', 'Miseon now walks with you · press T to chat anytime'));
      }
    }
    if (summary.launch.scenarioId === 'romance_night' && summary.outcome === 'success') {
      setTimeout(() => {
        game.current?.setClock(8 * 60);
        openOverlay({ kind: 'night' });
      }, 300);
    }
    if (applied?.storyAdvanced) {
      if (getSave().storyStep >= STORY.length) setTimeout(() => openOverlay({ kind: 'ending' }), 600);
      else setTimeout(deliverStoryMessage, 1800);
    }
    setApplied(null);
  };

  const cancelBriefing = (launch: ConversationLaunch) => {
    closeOverlay();
    if (launch.origin.kind !== 'place') game.current?.conversationEnded(launch, 'abandoned', 50);
  };

  let layer: ReactNode = null;
  switch (overlay.kind) {
    case 'place':
      layer = (
        <PlaceMenu
          placeId={overlay.placeId}
          onClose={closeOverlay}
          onScenario={(s) => openOverlay({ kind: 'briefing', launch: launchFor(s) })}
          onJob={(job) => {
            closeOverlay();
            game.current?.startJob(job);
          }}
          onShop={(shop) => openOverlay({ kind: 'shop', shop })}
        />
      );
      break;
    case 'briefing': {
      const launch = overlay.launch;
      const police = launch.origin.kind === 'police';
      layer = (
        <Briefing
          launch={launch}
          onStart={() => openOverlay({ kind: 'conversation', launch })}
          onBack={police ? undefined : () => cancelBriefing(launch)}
          onPayFine={
            police
              ? () => {
                  closeOverlay();
                  game.current?.conversationEnded(launch, 'failure', 0);
                }
              : undefined
          }
        />
      );
      break;
    }
    case 'conversation':
      layer = <ConversationView key={overlay.launch.scenarioId + overlay.launch.npcId} launch={overlay.launch} onEnd={endConversation} />;
      break;
    case 'results': {
      const summary = overlay.summary;
      const done = getScenario(summary.launch.scenarioId);
      // One-time scenes (story chapters, sign-ups, romance steps) can't be replayed once passed.
      const replayable = summary.launch.origin.kind === 'place' || (summary.launch.origin.kind === 'call' && !done.incoming);
      const retryable = replayable && !(summary.outcome === 'success' && (done.once || done.kind === 'story'));
      layer = (
        <Results
          summary={summary}
          historyId={applied?.historyId ?? ''}
          levelUp={applied?.levelUp ?? null}
          onContinue={() => afterResults(summary)}
          onRetry={
            retryable
              ? () => {
                  afterResults(summary);
                  setTimeout(() => openOverlay({ kind: 'briefing', launch: summary.launch }), 50);
                }
              : undefined
          }
        />
      );
      break;
    }
    case 'phone':
      layer = <Phone app={overlay.app} onApp={(app: PhoneApp) => openOverlay({ kind: 'phone', app })} onClose={closeOverlay} actions={phoneActions} />;
      break;
    case 'pause':
      layer = <PauseMenu onResume={closeOverlay} onSettings={() => openOverlay({ kind: 'phone', app: 'settings' })} onQuit={() => void quitToTitle()} />;
      break;
    case 'shop':
      layer = <Shop shop={overlay.shop} onClose={closeOverlay} onCarDelivered={(m) => game.current?.spawnOwnedCar(m)} />;
      break;
    case 'idiom':
      layer = <IdiomCard idiomId={overlay.idiomId} onClose={closeOverlay} />;
      break;
    case 'night':
      layer = <NightScene onDone={closeOverlay} />;
      break;
    case 'overheard':
      layer = <OverheardQuiz id={overlay.id} onClose={closeOverlay} />;
      break;
    case 'ending':
      layer = (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/85 p-6 text-center animate-fade">
          <div className="display outline-text text-6xl uppercase text-yellow-400 sm:text-8xl">The End</div>
          <p className="max-w-md text-lg text-white/85">{t('축하해요! 신참에서 엘든 시티의 스타가 되었어요. 도시는 계속 당신을 기다려요 — 자유롭게 돌아다니며 대화를 이어가세요!', "Congratulations! You went from newcomer to Elden City star. The city is still waiting — keep exploring and talking!")}</p>
          <button className="btn-primary px-8 py-3 text-base" onClick={closeOverlay}>
            {t('계속 플레이', 'Keep playing')}
          </button>
        </div>
      );
      break;
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {overlay.kind === 'none' && touch && <TouchControls getInput={() => game.current?.input ?? null} />}
      <Hud
        minimapRef={minimapRef}
        touch={touch}
        onPhone={() => {
          sfx.unlock();
          openOverlay({ kind: 'phone', app: 'home' });
        }}
        onPause={() => openOverlay({ kind: 'pause' })}
        onTalk={() => game.current?.talkToCompanion()}
        onAskGuide={(text) => game.current?.askGuide(text)}
        onReplayGuide={(slow) => game.current?.replayGuide(slow)}
      />
      {incoming && overlay.kind === 'none' && (
        <IncomingCall
          scenario={incoming}
          onAccept={answerCall}
          onDecline={() => {
            setIncoming(null);
            toast(tr('📵 전화를 거절했어요', '📵 Call declined'), 'info');
          }}
          onMissed={missedCall}
        />
      )}
      {storyStep === 0 && overlay.kind === 'none' && !touch && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-xs text-white/80">
          {t('WASD 이동 · E 상호작용 · Space 드리프트 · P 휴대폰', 'WASD move · E interact · Space drift · P phone')}
        </div>
      )}
      {layer}
    </div>
  );
}
