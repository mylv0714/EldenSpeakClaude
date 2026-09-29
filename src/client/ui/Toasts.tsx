import { useUi } from '../state/ui';

const TONE = {
  info: 'bg-gray-900/90 text-white',
  good: 'bg-emerald-600/90 text-white',
  bad: 'bg-red-600/90 text-white',
  cash: 'bg-emerald-500/95 text-gray-950 font-bold',
} as const;

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const banner = useUi((s) => s.banner);
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`max-w-md rounded-full px-4 py-2 text-center text-sm shadow-lg backdrop-blur animate-rise ${TONE[t.tone]}`}>
            {t.text}
          </div>
        ))}
      </div>
      {banner && (
        <div key={banner.id} className="pointer-events-none fixed inset-x-0 top-[30%] z-50 flex flex-col items-center px-4 text-center">
          <div className={`display outline-text animate-banner text-5xl uppercase sm:text-7xl ${banner.tone === 'pass' ? 'text-yellow-400' : banner.tone === 'fail' ? 'text-red-500' : 'text-sky-300'}`}>{banner.title}</div>
          {banner.subtitle && <div className="mt-2 rounded-full bg-black/60 px-4 py-1 text-white/90 animate-fade">{banner.subtitle}</div>}
        </div>
      )}
    </>
  );
}
