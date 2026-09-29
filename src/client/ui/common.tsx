import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { sfx } from '../audio/sfx';

export function Modal({ children, onBackdrop, wide = false, className = '' }: { children: ReactNode; onBackdrop?: () => void; wide?: boolean; className?: string }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-3 backdrop-blur-[2px] animate-fade safe-x" onPointerDown={(e) => e.target === e.currentTarget && onBackdrop?.()}>
      <div className={`panel flex max-h-full w-full flex-col overflow-hidden animate-pop ${wide ? 'max-w-3xl' : 'max-w-lg'} ${className}`}>{children}</div>
    </div>
  );
}

export function CloseButton({ onClick, label = 'Close' }: { onClick: () => void; label?: string }) {
  return (
    <button
      className="icon-btn h-9 w-9"
      aria-label={label}
      onClick={() => {
        sfx.play('click');
        onClick();
      }}
    >
      <X size={18} />
    </button>
  );
}

export function Stars({ value, max = 3, size = 18 }: { value: number; max?: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} / ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ fontSize: size, lineHeight: 1 }} className={i < value ? 'text-yellow-400 drop-shadow' : 'text-white/20'}>
          ★
        </span>
      ))}
    </span>
  );
}

export function Bar({ value, max = 100, color = 'bg-yellow-400', className = '' }: { value: number; max?: number; color?: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-white/10 ${className}`}>
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Difficulty({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`difficulty ${level}`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${i <= level ? (level === 3 ? 'bg-red-400' : level === 2 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-white/15'}`} />
      ))}
    </span>
  );
}

export const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
