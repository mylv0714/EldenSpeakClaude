import { Headphones } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { Game } from '../game/engine';
import { useLang, useTr } from '../i18n';
import { setSave } from '../state/game';
import { deleteSave, loadSave, type SaveData } from '../state/save';
import { setScreen, useUi } from '../state/ui';

export function TitleScreen() {
  const t = useTr();
  const lang = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [saved, setSaved] = useState<SaveData | null | undefined>(undefined);
  const [confirmNew, setConfirmNew] = useState(false);

  useEffect(() => {
    const g = new Game({ canvas: canvasRef.current!, attract: true });
    g.start();
    void loadSave().then(setSaved);
    return () => g.destroy();
  }, []);

  const start = (save: SaveData) => {
    sfx.unlock();
    sfx.setVolume(save.settings.sfxVolume);
    sfx.play('whoosh');
    setSave(save);
    setScreen('game');
  };

  const newGame = async () => {
    sfx.unlock();
    sfx.play('click');
    if (saved) await deleteSave();
    setSave(null);
    setScreen('onboarding');
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.1),rgba(0,0,0,0.75))]" />
      <div className="safe-top safe-x absolute right-0 top-0">
        <div className="flex rounded-full bg-black/50 p-1 text-xs font-semibold">
          {(['ko', 'en'] as const).map((l) => (
            <button key={l} className={`rounded-full px-3 py-1 ${lang === l ? 'bg-white text-gray-900' : 'text-white/70'}`} onClick={() => useUi.setState({ bootLang: l })}>
              {l === 'ko' ? '한국어' : 'English'}
            </button>
          ))}
        </div>
      </div>
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 className="display outline-text leading-[0.85] animate-pop">
          <span className="block text-7xl text-white sm:text-9xl">ELDEN</span>
          <span className="block text-7xl text-yellow-400 sm:text-9xl">SPEAK</span>
        </h1>
        <p className="mt-4 max-w-md text-base font-semibold text-white/90 outline-text sm:text-lg">{t('도시를 누비며, 진짜 영어로 살아남아라.', 'Talk your way through the city.')}</p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          {saved && (
            <button className="btn-primary py-4 text-lg" onClick={() => start(saved)}>
              {t(`계속하기 · ${saved.name}`, `Continue · ${saved.name}`)}
            </button>
          )}
          {saved && confirmNew ? (
            <div className="panel p-3 text-sm">
              <p className="text-white/85">{t('기존 진행 상황이 삭제돼요.', 'Your current progress will be deleted.')}</p>
              <div className="mt-2 flex gap-2">
                <button className="btn-ghost flex-1" onClick={() => setConfirmNew(false)}>
                  {t('취소', 'Cancel')}
                </button>
                <button className="btn-danger flex-1" onClick={() => void newGame()}>
                  {t('새로 시작', 'Start over')}
                </button>
              </div>
            </div>
          ) : (
            <button className={saved ? 'btn-ghost py-3.5' : 'btn-primary py-4 text-lg'} disabled={saved === undefined} onClick={() => (saved ? setConfirmNew(true) : void newGame())}>
              {t('새 게임', 'New game')}
            </button>
          )}
        </div>
        <p className="absolute bottom-6 flex items-center gap-2 text-xs text-white/55">
          <Headphones size={14} /> {t('이어폰과 마이크를 추천해요 · Chrome 브라우저 권장', 'Headphones + mic recommended · best in Chrome')}
        </p>
      </div>
    </div>
  );
}
