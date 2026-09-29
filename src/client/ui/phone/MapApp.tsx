import { PLACES } from '@shared/content/city';
import { getScenario, scenariosAtPlace } from '@shared/content/scenarios';
import { STORY } from '@shared/content/story';
import { Minus, Navigation, Plus, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { getCity, getMapImage } from '../../game/engine';
import { MAP_SIZE, toMap } from '../../game/render/minimap';
import { useLang, useTr } from '../../i18n';
import { useGame } from '../../state/game';
import type { PhoneActions } from './Phone';

let mapUrl: string | null = null;

export function MapApp({ actions }: { actions: PhoneActions }) {
  const t = useTr();
  const lang = useLang();
  const save = useGame((s) => s.save!);
  const url = useMemo(() => (mapUrl ??= getMapImage().toDataURL('image/png')), []);
  const player = toMap(actions.playerPos().x, actions.playerPos().y);
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ s: 0.55, x: 0, y: 0, init: false });
  const [selected, setSelected] = useState<string | null>(null);
  const [waypoint, setWaypointState] = useState(actions.waypointPlaceId());
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; s: number } | null>(null);
  const storyPlace = (() => {
    const step = STORY[save.storyStep];
    return step ? getScenario(step.scenarioId).placeId : undefined;
  })();

  // Center on the player the first time the box has a size.
  const ensureInit = (el: HTMLDivElement | null) => {
    box.current = el;
    if (el && !view.init) {
      const s = 0.55;
      setView({ s, x: el.clientWidth / 2 - player.x * s, y: el.clientHeight / 2 - player.y * s, init: true });
    }
  };

  const zoom = (factor: number, cx?: number, cy?: number) => {
    const el = box.current;
    if (!el) return;
    setView((v) => {
      const s = Math.min(2, Math.max(0.25, v.s * factor));
      const px = cx ?? el.clientWidth / 2;
      const py = cy ?? el.clientHeight / 2;
      return { ...v, s, x: px - ((px - v.x) * s) / v.s, y: py - ((py - v.y) * s) / v.s };
    });
  };

  const site = selected ? getCity().places.get(selected) : undefined;
  const place = PLACES.find((p) => p.id === selected);

  return (
    <div className="relative h-full min-h-[420px] select-none">
      <div
        ref={ensureInit}
        className="absolute inset-0 touch-none overflow-hidden bg-[#4a90c2]"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s };
          }
        }}
        onPointerMove={(e) => {
          const prev = pointers.current.get(e.pointerId);
          if (!prev) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2 && pinch.current) {
            const [a, b] = [...pointers.current.values()];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            zoom((pinch.current.s * (d / pinch.current.d)) / view.s);
          } else setView((v) => ({ ...v, x: v.x + e.clientX - prev.x, y: v.y + e.clientY - prev.y }));
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) pinch.current = null;
        }}
        onWheel={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top);
        }}
      >
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`, width: MAP_SIZE.w, height: MAP_SIZE.h }}>
          <img src={url} alt="" draggable={false} width={MAP_SIZE.w} height={MAP_SIZE.h} className="pointer-events-none max-w-none" />
          {PLACES.map((p) => {
            const s = getCity().places.get(p.id);
            if (!s) return null;
            const m = toMap(s.door.x, s.door.y);
            const story = p.id === storyPlace;
            return (
              <button
                key={p.id}
                className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white shadow-lg ${story ? 'h-11 w-11 bg-yellow-400 text-xl' : p.id === waypoint ? 'h-9 w-9 bg-fuchsia-500 text-base' : 'h-9 w-9 bg-sky-500 text-base'}`}
                style={{ left: m.x, top: m.y, transform: `translate(-50%, -50%) scale(${1 / Math.max(0.6, view.s)})` }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setSelected(p.id)}
                aria-label={p.name}
              >
                {p.icon}
              </button>
            );
          })}
          <div className="absolute h-4 w-4 rounded-full border-2 border-white bg-red-500 shadow" style={{ left: player.x, top: player.y, transform: `translate(-50%, -50%) scale(${1 / Math.max(0.6, view.s)})` }} />
        </div>
      </div>
      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <button className="icon-btn bg-black/60" aria-label="zoom in" onClick={() => zoom(1.3)}>
          <Plus size={18} />
        </button>
        <button className="icon-btn bg-black/60" aria-label="zoom out" onClick={() => zoom(1 / 1.3)}>
          <Minus size={18} />
        </button>
      </div>
      {site && place && (
        <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-gray-950/95 p-4 shadow-2xl animate-rise">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{place.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white">{lang === 'ko' ? place.nameKo : place.name}</div>
              <div className="text-xs text-white/55">{place.blurb[lang]}</div>
              <div className="mt-1 text-xs text-sky-300">
                {place.id === storyPlace && <span className="mr-2 text-yellow-300">★ {t('스토리 진행 중', 'Story mission here')}</span>}
                {t(`미션 ${scenariosAtPlace(place.id).length}개`, `${scenariosAtPlace(place.id).length} missions`)}
              </div>
            </div>
            <button className="text-white/50" aria-label="close" onClick={() => setSelected(null)}>
              <X size={18} />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            {waypoint === place.id ? (
              <button
                className="btn-ghost flex-1"
                onClick={() => {
                  actions.setWaypoint(null);
                  setWaypointState(null);
                }}
              >
                {t('경로 안내 취소', 'Clear route')}
              </button>
            ) : (
              <button
                className="btn-primary flex-1"
                onClick={() => {
                  actions.setWaypoint(place.id);
                  setWaypointState(place.id);
                }}
              >
                <Navigation size={16} /> {t('경로 안내', 'Set route')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
