import type { CarModelId } from '@shared/types';
import { levelFromXp, rankFor } from '@shared/rules';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { sfx } from '../../audio/sfx';
import type { Vec } from '../../game/math';
import { useLang, useTr } from '../../i18n';
import { useGame } from '../../state/game';
import { type PhoneApp, useUi } from '../../state/ui';
import { formatClock, money } from '../common';
import { CallsApp } from './CallsApp';
import { GarageApp } from './GarageApp';
import { MapApp } from './MapApp';
import { MessagesApp } from './MessagesApp';
import { MiseonApp } from './MiseonApp';
import { MissionsApp } from './MissionsApp';
import { PhrasebookApp } from './PhrasebookApp';
import { SettingsApp } from './SettingsApp';
import { StatsApp } from './StatsApp';

export interface PhoneActions {
  setWaypoint(placeId: string | null): void;
  waypointPlaceId(): string | null;
  playerPos(): Vec;
  deliverCar(model: CarModelId): void;
  hasJob(): boolean;
  endJob(): void;
  /** Saves and returns to the title screen; with reset=true the save is deleted first. */
  quitToTitle(reset?: boolean): void;
  setCompanion(on: boolean): void;
  talkToCompanion(): void;
  /** Places a phone call (Calls app, coach). */
  startCall(scenarioId: string): void;
}

const APPS: { id: Exclude<PhoneApp, 'home'>; icon: string; ko: string; en: string; color: string }[] = [
  { id: 'map', icon: '🗺️', ko: '지도', en: 'Map', color: 'from-emerald-500 to-teal-600' },
  { id: 'missions', icon: '🎯', ko: '미션', en: 'Missions', color: 'from-amber-400 to-orange-500' },
  { id: 'messages', icon: '💬', ko: '메시지', en: 'Messages', color: 'from-green-400 to-green-600' },
  { id: 'calls', icon: '📞', ko: '전화', en: 'Calls', color: 'from-emerald-400 to-teal-600' },
  { id: 'phrasebook', icon: '📒', ko: '표현집', en: 'Phrases', color: 'from-sky-400 to-indigo-500' },
  { id: 'stats', icon: '📊', ko: '통계', en: 'Stats', color: 'from-fuchsia-500 to-purple-600' },
  { id: 'garage', icon: '🚗', ko: '차고', en: 'Garage', color: 'from-rose-500 to-red-600' },
  { id: 'miseon', icon: '💕', ko: '미선', en: 'Miseon', color: 'from-pink-400 to-rose-500' },
  { id: 'settings', icon: '⚙️', ko: '설정', en: 'Settings', color: 'from-gray-500 to-gray-700' },
];

export function Phone({ app, onApp, onClose, actions }: { app: PhoneApp; onApp: (a: PhoneApp) => void; onClose: () => void; actions: PhoneActions }) {
  const t = useTr();
  const lang = useLang();
  const save = useGame((s) => s.save!);
  const clock = useUi((s) => s.hud.clock);
  const unread = save.messages.filter((m) => !m.read).length;
  const due = save.phrasebook.filter((p) => p.due <= Date.now()).length;
  const lvl = levelFromXp(save.xp);
  const meta = APPS.find((a) => a.id === app);

  let content: ReactNode;
  switch (app) {
    case 'map':
      content = <MapApp actions={actions} />;
      break;
    case 'missions':
      content = <MissionsApp actions={actions} />;
      break;
    case 'messages':
      content = <MessagesApp />;
      break;
    case 'calls':
      content = <CallsApp actions={actions} />;
      break;
    case 'phrasebook':
      content = <PhrasebookApp />;
      break;
    case 'stats':
      content = <StatsApp actions={actions} />;
      break;
    case 'garage':
      content = <GarageApp actions={actions} />;
      break;
    case 'settings':
      content = <SettingsApp actions={actions} />;
      break;
    case 'miseon':
      content = <MiseonApp actions={actions} />;
      break;
    default:
      content = (
        <div className="space-y-5 p-5">
          <div className="rounded-3xl bg-gradient-to-br from-white/15 to-white/5 p-4">
            <div className="text-xs text-white/60">{rankFor(lvl.level)[lang]}</div>
            <div className="flex items-end justify-between">
              <div className="display text-3xl text-white">{save.name}</div>
              <div className="display text-2xl text-emerald-400">{money(save.cash)}</div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
              Lv.{lvl.level}
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-yellow-400" style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} />
              </div>
              🔥 {save.streak.days}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-x-2 gap-y-5">
            {APPS.filter((a) => a.id !== 'miseon' || save.romance.stage > 0).map((a) => {
              const badge = a.id === 'messages' ? unread : a.id === 'phrasebook' ? due : 0;
              return (
                <button
                  key={a.id}
                  className="flex flex-col items-center gap-1.5 active:scale-90"
                  onClick={() => {
                    sfx.play('click');
                    onApp(a.id);
                  }}
                >
                  <span className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-lg ${a.color}`}>
                    {a.icon}
                    {badge > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{badge}</span>}
                  </span>
                  <span className="text-[11px] text-white/80">{t(a.ko, a.en)}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 animate-fade sm:p-4" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0d1220] animate-rise sm:h-[min(780px,94vh)] sm:w-[400px] sm:rounded-[2.6rem] sm:border-[7px] sm:border-gray-800 sm:shadow-2xl">
        <div className="safe-top flex items-center justify-between px-6 pb-1 text-xs font-semibold text-white/80">
          <span>{formatClock(clock)}</span>
          <span>📶 🔋</span>
        </div>
        {app !== 'home' && (
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <button className="icon-btn h-9 w-9" aria-label={t('뒤로', 'Back')} onClick={() => onApp('home')}>
              <ChevronLeft size={20} />
            </button>
            <div className="font-bold text-white">{meta ? t(meta.ko, meta.en) : ''}</div>
          </div>
        )}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{content}</div>
        <button className="safe-bottom flex justify-center pt-2" aria-label={t('닫기', 'Close')} onClick={() => (app === 'home' ? onClose() : onApp('home'))}>
          <span className="h-1.5 w-32 rounded-full bg-white/40" />
        </button>
      </div>
    </div>
  );
}
