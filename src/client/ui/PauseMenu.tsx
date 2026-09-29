import { Keyboard, LogOut, Play, Settings } from 'lucide-react';
import { useTr } from '../i18n';
import { Modal } from './common';

const KEYS: [string, string, string][] = [
  ['W A S D / ← ↑ ↓ →', '이동 · 운전', 'Move · drive'],
  ['E / F', '상호작용 · 차 타기/내리기', 'Interact · enter/exit car'],
  ['Space', '핸드브레이크 (드리프트)', 'Handbrake (drift)'],
  ['Shift', '달리기', 'Sprint'],
  ['H', '경적', 'Horn'],
  ['P / Tab', '휴대폰', 'Phone'],
  ['M', '지도', 'Map'],
  ['Esc', '일시정지', 'Pause'],
];

export function PauseMenu({ onResume, onSettings, onQuit }: { onResume: () => void; onSettings: () => void; onQuit: () => void }) {
  const t = useTr();
  return (
    <Modal onBackdrop={onResume}>
      <div className="p-6 text-center">
        <h2 className="display text-4xl uppercase text-white">{t('일시정지', 'Paused')}</h2>
      </div>
      <div className="space-y-2 px-5">
        <button className="btn-primary w-full py-3" onClick={onResume} autoFocus>
          <Play size={17} /> {t('계속하기', 'Resume')}
        </button>
        <button className="btn-ghost w-full py-3" onClick={onSettings}>
          <Settings size={17} /> {t('설정', 'Settings')}
        </button>
        <button className="btn-ghost w-full py-3" onClick={onQuit}>
          <LogOut size={17} /> {t('저장하고 타이틀로', 'Save & quit to title')}
        </button>
      </div>
      <div className="m-5 rounded-xl bg-white/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50">
          <Keyboard size={14} /> {t('조작법', 'Controls')}
        </div>
        <ul className="grid gap-1 text-sm">
          {KEYS.map(([k, ko, en]) => (
            <li key={k} className="flex justify-between gap-3">
              <kbd className="rounded bg-white/10 px-1.5 font-mono text-xs text-white/80">{k}</kbd>
              <span className="text-white/60">{t(ko, en)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-white/40">{t('터치 기기: 왼쪽 조이스틱으로 이동, 오른쪽 버튼으로 행동', 'Touch: joystick on the left, buttons on the right')}</p>
      </div>
    </Modal>
  );
}
