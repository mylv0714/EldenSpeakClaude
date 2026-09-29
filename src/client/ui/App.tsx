import { useEffect } from 'react';
import { sfx } from '../audio/sfx';
import { unlockVoice } from '../audio/voice';
import { useUi } from '../state/ui';
import { GameScreen } from './GameScreen';
import { Onboarding } from './Onboarding';
import { TitleScreen } from './TitleScreen';
import { Toasts } from './Toasts';

export function App() {
  const screen = useUi((s) => s.screen);

  // Browsers only allow audio after a user gesture, and a touch pointerdown doesn't count as one (pointerup/touchend do).
  // Keep listening: in-app WebViews (KakaoTalk) only resume a suspended context from inside a gesture, e.g. after backgrounding.
  useEffect(() => {
    const unlock = () => {
      sfx.unlock();
      unlockVoice();
    };
    const events = ['pointerup', 'touchend', 'click', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, unlock, true));
    return () => events.forEach((e) => window.removeEventListener(e, unlock, true));
  }, []);

  return (
    <>
      {screen === 'boot' && <div className="fixed inset-0 bg-black" />}
      {screen === 'title' && <TitleScreen />}
      {screen === 'onboarding' && <Onboarding />}
      {screen === 'game' && <GameScreen />}
      <Toasts />
    </>
  );
}
