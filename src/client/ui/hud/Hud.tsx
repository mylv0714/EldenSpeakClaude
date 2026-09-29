import { PLACE_BY_ID } from '@shared/content/city';
import { getScenario } from '@shared/content/scenarios';
import { STORY } from '@shared/content/story';
import { levelFromXp, rankFor } from '@shared/rules';
import { ArrowLeft, ArrowRight, ArrowUp, Flag, Pause, Smartphone } from 'lucide-react';
import type { RefObject } from 'react';
import { useLang, useTr } from '../../i18n';
import { useGame } from '../../state/game';
import { useUi } from '../../state/ui';
import { formatClock, money } from '../common';
import { GuideCard } from './GuideCard';

const GPS_ICON = { left: ArrowLeft, right: ArrowRight, straight: ArrowUp, arrive: Flag } as const;

export function Hud({
  minimapRef,
  touch,
  onPhone,
  onPause,
  onTalk,
  onAskGuide,
  onReplayGuide,
}: {
  minimapRef: RefObject<HTMLCanvasElement | null>;
  touch: boolean;
  onPhone: () => void;
  onPause: () => void;
  onTalk: () => void;
  onAskGuide: (text: string) => void;
  onReplayGuide: (slow: boolean) => void;
}) {
  const t = useTr();
  const lang = useLang();
  const hud = useUi((s) => s.hud);
  const save = useGame((s) => s.save!);
  const lvl = levelFromXp(save.xp);
  const unread = save.messages.filter((m) => !m.read).length;
  const step = STORY[save.storyStep];
  const storyPlace = step ? PLACE_BY_ID.get(getScenario(step.scenarioId).placeId!) : undefined;
  const GpsIcon = hud.gps ? GPS_ICON[hud.gps.icon] : null;
  const h = Math.floor(hud.clock / 60);
  const night = h >= 20 || h < 6;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none">
      {/* Top-left: level + objective */}
      <div className="safe-top safe-x absolute left-0 top-0 flex max-w-[46%] flex-col gap-2">
        <div className="pointer-events-auto flex items-center gap-2 self-start rounded-full bg-black/55 py-1 pl-1 pr-3 backdrop-blur">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-xs font-black text-gray-900">{lvl.level}</span>
          <div>
            <div className="text-[11px] font-semibold leading-none text-white/90">{rankFor(lvl.level)[lang]}</div>
            <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-white/15">
              <div className="h-full bg-yellow-400" style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} />
            </div>
          </div>
          {save.streak.days > 0 && <span className="text-xs text-orange-300">🔥{save.streak.days}</span>}
        </div>
        {!hud.job && storyPlace && (
          <div className="hidden rounded-xl bg-black/55 px-3 py-2 text-xs text-white/90 backdrop-blur sm:block">
            <span className="font-bold text-yellow-300">▶ {t('목표', 'Objective')}</span> {t(`${storyPlace.icon} ${storyPlace.nameKo}(으)로 가세요`, `Go to ${storyPlace.icon} ${storyPlace.name}`)}
          </div>
        )}
      </div>

      {/* Top-center: GPS + job */}
      <div className="safe-top absolute inset-x-0 top-0 flex flex-col items-center gap-2 px-[26%] max-sm:top-[104px] max-sm:px-3">
        {hud.gps && GpsIcon && (
          <div className="flex max-w-full items-center gap-2 rounded-full bg-fuchsia-600/90 py-1.5 pl-2 pr-4 text-sm font-semibold text-white shadow-lg">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
              <GpsIcon size={17} />
            </span>
            <span className="truncate">{hud.gps.text}</span>
            {hud.gps.distance > 0 && <span className="shrink-0 text-white/75">{hud.gps.distance} m</span>}
          </div>
        )}
        {hud.job && (
          <div className="max-w-full rounded-2xl bg-black/65 px-4 py-2 text-center backdrop-blur">
            <div className="text-sm font-bold text-white">{hud.job.title}</div>
            <div className="truncate text-xs text-white/75">{hud.job.detail}</div>
            {hud.job.timeLeft !== null && <div className={`display text-2xl ${hud.job.timeLeft < 0 ? 'text-red-400' : hud.job.timeLeft < 15 ? 'text-amber-300' : 'text-white'}`}>{hud.job.timeLeft < 0 ? `+${-hud.job.timeLeft}s` : `${hud.job.timeLeft}s`}</div>}
          </div>
        )}
        {hud.guide && <GuideCard guide={hud.guide} touch={touch} onAsk={onAskGuide} onReplay={onReplayGuide} />}
      </div>

      {/* Top-right: cash, wanted, clock */}
      <div className="safe-top safe-x absolute right-0 top-0 flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <div className="display outline-text text-3xl leading-none text-emerald-400 sm:text-4xl">{money(save.cash)}</div>
          <button className="pointer-events-auto icon-btn relative h-10 w-10 bg-black/55" aria-label={t('휴대폰', 'Phone')} onClick={onPhone}>
            <Smartphone size={19} />
            {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold">{unread}</span>}
          </button>
          <button className="pointer-events-auto icon-btn h-10 w-10 bg-black/55" aria-label={t('일시정지', 'Pause')} onClick={onPause}>
            <Pause size={18} />
          </button>
        </div>
        <div className={`display outline-text flex gap-0.5 text-2xl ${hud.wanted > 0 ? 'animate-pulse' : ''}`}>
          {[1, 2, 3].map((i) => (
            <span key={i} className={i <= hud.wanted ? 'text-white' : 'text-white/15'}>
              ★
            </span>
          ))}
        </div>
        <div className="rounded-full bg-black/50 px-2.5 py-0.5 text-xs font-semibold text-white/85">
          {night ? '🌙' : '☀️'} {formatClock(hud.clock)} · {hud.district}
        </div>
      </div>

      {/* Minimap + speedometer */}
      <div className={`safe-x absolute ${touch ? 'left-0 top-24' : 'bottom-4 left-0'} flex flex-col items-center gap-1`}>
        <canvas ref={minimapRef} className={`${touch ? 'h-28 w-28' : 'h-44 w-44'} rounded-full shadow-2xl`} />
        {hud.inVehicle && (
          <div className="flex flex-col items-center rounded-xl bg-black/55 px-3 py-1 backdrop-blur">
            <span className="display text-2xl leading-none text-white">
              {hud.speed}
              <span className="ml-1 text-xs text-white/60">km/h</span>
            </span>
            <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-white/15">
              <div className={`h-full ${hud.vehicleHealth > 50 ? 'bg-emerald-400' : hud.vehicleHealth > 25 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${hud.vehicleHealth}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Talk to Miseon (only while walking together) */}
      {hud.companion !== 'none' && !hud.inVehicle && (
        <div className={`absolute ${touch ? 'bottom-44 right-4' : 'bottom-24 right-4'} safe-x`}>
          <button
            className={`pointer-events-auto flex items-center gap-2 rounded-full py-2 pl-2 pr-4 text-sm font-bold text-white shadow-xl transition active:scale-95 ${hud.companion === 'wants' ? 'animate-pulse bg-pink-500' : 'bg-pink-500/70 hover:bg-pink-500'}`}
            onClick={onTalk}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25">💬</span>
            {hud.companion === 'wants' ? t('미선이 할 말이 있대요', 'Miseon wants to talk') : t('미선과 대화', 'Talk to Miseon')}
            {!touch && <kbd className="rounded bg-white/25 px-1.5 font-mono text-xs">T</kbd>}
          </button>
        </div>
      )}

      {hud.overhearing && (
        <div className="absolute inset-x-0 bottom-24 flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-sky-600/90 px-4 py-2 text-sm font-semibold text-white shadow-xl animate-pulse">👂 {t('엿듣는 중… 잘 들어 보세요 (퀴즈가 나와요)', 'Overhearing… listen closely (quiz coming)')}</div>
        </div>
      )}

      {/* Interaction prompt (keyboard) */}
      {hud.prompt && !touch && (
        <div className="absolute inset-x-0 bottom-8 flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-black/75 py-2 pl-2 pr-4 text-sm font-semibold text-white shadow-xl animate-rise">
            <kbd className="rounded-md bg-yellow-400 px-2 py-0.5 font-mono text-xs font-black text-gray-900">{hud.prompt.key}</kbd>
            {hud.prompt.text}
          </div>
        </div>
      )}
    </div>
  );
}
