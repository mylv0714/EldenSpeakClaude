import { useEffect, useState } from 'react';
import { sfx } from '../audio/sfx';
import { useTr } from '../i18n';

/** Fade-to-black after the hotel date, then the next morning. Deliberately tasteful: no depiction. */
export function NightScene({ onDone }: { onDone: () => void }) {
  const t = useTr();
  const [morning, setMorning] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setMorning(true);
      sfx.play('success');
    }, 4200);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-black p-6 text-center animate-fade">
      {!morning ? (
        <>
          <div className="text-6xl animate-float">🌙</div>
          <p className="display text-3xl text-pink-200 animate-fade sm:text-4xl">{t('도시의 불빛 아래, 둘만의 밤이 깊어 갑니다…', 'Under the city lights, the night belongs to the two of you…')}</p>
          <p className="text-white/50 animate-fade">💕</p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 animate-rise">
          <div className="text-6xl">☀️</div>
          <p className="display text-4xl uppercase text-yellow-300">{t('다음 날 아침 · 08:00', 'The next morning · 08:00')}</p>
          <p className="max-w-md text-white/80">
            {t('미선: "Good morning, sleepyhead. Breakfast at Harbor Diner? 🥞"', 'Miseon: "Good morning, sleepyhead. Breakfast at Harbor Diner? 🥞"')}
          </p>
          <button className="btn-primary px-8 py-3 text-base" onClick={onDone} autoFocus>
            {t('하루 시작하기', 'Start the day')}
          </button>
        </div>
      )}
    </div>
  );
}
