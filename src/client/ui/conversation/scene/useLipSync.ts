import { useEffect, useState } from 'react';
import { speechLevel } from '../../../audio/voice';

/**
 * Mouth openness (0-1) while the character speaks. Neural voices drive it from the real audio level;
 * device voices (no audio access) get a syllable-like flap with short pauses.
 */
export function useLipSync(speaking: boolean): number {
  const [open, setOpen] = useState(0);
  useEffect(() => {
    if (!speaking) return;
    let raf = 0;
    let last = 0;
    let pauseUntil = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 55) return;
      last = t;
      const level = speechLevel();
      if (level !== null) {
        setOpen((o) => o * 0.35 + Math.min(1, level * 1.6) * 0.65);
        return;
      }
      if (t < pauseUntil) {
        setOpen(0);
        return;
      }
      if (Math.random() < 0.06) pauseUntil = t + 120 + Math.random() * 180;
      setOpen(0.25 + Math.abs(Math.sin(t / 70)) * 0.55 + Math.random() * 0.2);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setOpen(0);
    };
  }, [speaking]);
  return speaking ? open : 0;
}

/** Natural blinking: closed for ~120 ms every 2.5-5.5 s. */
export function useBlink(): boolean {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          setClosed(true);
          timer = setTimeout(() => {
            setClosed(false);
            schedule();
          }, 120);
        },
        2500 + Math.random() * 3000,
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return closed;
}
