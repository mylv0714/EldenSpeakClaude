import { Megaphone } from 'lucide-react';
import { type PointerEvent as RPointerEvent, useRef, useState } from 'react';
import { sfx } from '../../audio/sfx';
import type { Input } from '../../game/input';
import { platform } from '../../platform';
import { useTr } from '../../i18n';
import { useUi } from '../../state/ui';

const RADIUS = 56;

/** Mobile controls: floating joystick on the left half, context buttons on the right. */
export function TouchControls({ getInput }: { getInput: () => Input | null }) {
  const t = useTr();
  const hud = useUi((s) => s.hud);
  const [stick, setStick] = useState<{ ox: number; oy: number; rx: number; ry: number; x: number; y: number } | null>(null);
  const pointer = useRef<number | null>(null);

  const move = (e: RPointerEvent, origin: { ox: number; oy: number; rx: number; ry: number }) => {
    let dx = e.clientX - origin.ox;
    let dy = e.clientY - origin.oy;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS;
      dy = (dy / d) * RADIUS;
    }
    setStick({ ...origin, x: dx, y: dy });
    const input = getInput();
    if (input) {
      input.touchMode = true;
      input.joyX = dx / RADIUS;
      input.joyY = dy / RADIUS;
    }
  };

  const release = () => {
    pointer.current = null;
    setStick(null);
    const input = getInput();
    if (input) input.joyX = input.joyY = 0;
  };

  const hold = (key: 'touchHandbrake' | 'touchSprint' | 'touchHorn', on: boolean) => {
    const input = getInput();
    if (!input) return;
    input.touchMode = true;
    input[key] = on;
  };

  return (
    <div className="fixed inset-0 z-10 select-none">
      <div
        className="absolute bottom-0 left-0 h-[62%] w-1/2 touch-none"
        onPointerDown={(e) => {
          if (pointer.current !== null) return;
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          sfx.unlock();
          const rect = e.currentTarget.getBoundingClientRect();
          move(e, { ox: e.clientX, oy: e.clientY, rx: rect.left, ry: rect.top });
        }}
        onPointerMove={(e) => stick && e.pointerId === pointer.current && move(e, stick)}
        onPointerUp={release}
        onPointerCancel={release}
      >
        {stick ? (
          <div className="pointer-events-none absolute h-32 w-32 rounded-full border-2 border-white/25 bg-white/10" style={{ left: stick.ox - stick.rx - 64, top: stick.oy - stick.ry - 64 }}>
            <div className="absolute h-14 w-14 rounded-full bg-white/60 shadow-lg" style={{ left: 64 - 28 + stick.x, top: 64 - 28 + stick.y }} />
          </div>
        ) : (
          <div className="pointer-events-none absolute bottom-10 left-10 flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-white/20 text-xs text-white/40">{t('이동', 'Move')}</div>
        )}
      </div>

      <div className="safe-bottom safe-x absolute bottom-0 right-0 flex items-end gap-3 pb-4">
        <div className="flex flex-col gap-3">
          {hud.inVehicle && (
            <button
              className="h-14 w-14 touch-none rounded-full bg-black/55 text-white shadow-lg active:scale-90 active:bg-white/30"
              aria-label={t('경적', 'Horn')}
              onPointerDown={() => hold('touchHorn', true)}
              onPointerUp={() => hold('touchHorn', false)}
              onPointerLeave={() => hold('touchHorn', false)}
            >
              <Megaphone size={20} className="mx-auto" />
            </button>
          )}
          <button
            className="h-16 w-16 touch-none rounded-full bg-black/55 text-xs font-bold text-white shadow-lg active:scale-90 active:bg-white/30"
            onPointerDown={() => hold(hud.inVehicle ? 'touchHandbrake' : 'touchSprint', true)}
            onPointerUp={() => hold(hud.inVehicle ? 'touchHandbrake' : 'touchSprint', false)}
            onPointerLeave={() => hold(hud.inVehicle ? 'touchHandbrake' : 'touchSprint', false)}
          >
            {hud.inVehicle ? t('드리프트', 'Drift') : t('달리기', 'Run')}
          </button>
        </div>
        <button
          className={`flex h-24 w-24 flex-col items-center justify-center rounded-full text-center shadow-2xl transition active:scale-90 ${hud.prompt ? 'bg-yellow-400 text-gray-900 animate-pop' : 'bg-black/40 text-white/40'}`}
          onPointerDown={() => {
            sfx.unlock();
            platform().haptic('light');
            getInput()?.press('action');
          }}
        >
          <span className="px-2 text-[11px] font-bold leading-tight">{hud.prompt?.text ?? t('행동', 'Action')}</span>
        </button>
      </div>
    </div>
  );
}
