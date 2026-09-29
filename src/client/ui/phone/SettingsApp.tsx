import { LEVELS, type Level } from '@shared/types';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { sfx } from '../../audio/sfx';
import { speakPhrase } from '../../audio/voice';
import { useTr } from '../../i18n';
import { mutate, updateSettings, useGame } from '../../state/game';
import type { Settings } from '../../state/save';
import type { PhoneActions } from './Phone';

export const LEVEL_INFO: Record<Level, [string, string]> = {
  A1: ['왕초보 · 짧고 쉬운 문장', 'Beginner · short, simple sentences'],
  A2: ['초급 · 일상 대화 기초', 'Elementary · everyday basics'],
  B1: ['중급 · 자연스러운 일상 대화', 'Intermediate · natural everyday talk'],
  B2: ['중상급 · 원어민 속도와 관용구', 'Upper-intermediate · native pace, idioms'],
  C1: ['고급 · 빠르고 복잡한 대화', 'Advanced · fast and complex'],
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-white/85">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} className={`relative h-7 w-12 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-white/20'}`} onClick={() => onChange(!on)}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-white/10 p-0.5">
      {options.map(([v, label]) => (
        <button key={v} className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${value === v ? 'bg-white text-gray-900' : 'text-white/70'}`} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function SettingsApp({ actions }: { actions: PhoneActions }) {
  const t = useTr();
  const save = useGame((s) => s.save!);
  const st = save.settings;
  const [confirm, setConfirm] = useState(false);
  const set = (patch: Partial<Settings>) => updateSettings(patch);

  return (
    <div className="divide-y divide-white/10 px-4 pb-6">
      <div className="py-3">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">{t('영어 레벨', 'English level')}</div>
        <div className="grid grid-cols-5 gap-1">
          {LEVELS.map((l) => (
            <button
              key={l}
              className={`rounded-lg py-2 text-sm font-bold ${save.level === l ? 'bg-yellow-400 text-gray-900' : 'bg-white/10 text-white/80'}`}
              onClick={() =>
                mutate((s) => {
                  s.level = l;
                })
              }
            >
              {l}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-white/50">{t(...LEVEL_INFO[save.level])}</p>
      </div>
      <Row label={t('언어', 'Language')}>
        <Segmented value={st.uiLang} options={[['ko', '한국어'], ['en', 'English']]} onChange={(v) => set({ uiLang: v })} />
      </Row>
      <Row label={t('자막', 'Subtitles')}>
        <Segmented value={st.subtitles} options={[['always', t('항상', 'Always')], ['listen', t('듣기 연습', 'Listen first')]]} onChange={(v) => set({ subtitles: v })} />
      </Row>
      <Row label={t('번역 자동 표시', 'Auto translation')}>
        <Toggle on={st.showTranslation} onChange={(v) => set({ showTranslation: v })} />
      </Row>
      <Row label={t('1인칭 대화 화면', 'First-person conversations')}>
        <Toggle on={st.sceneView} onChange={(v) => set({ sceneView: v })} />
      </Row>
      <Row label={t('말하면 바로 전송', 'Send voice instantly')}>
        <Toggle on={st.autoSendVoice} onChange={(v) => set({ autoSendVoice: v })} />
      </Row>
      <Row label={t('약점 맞춤 연습', 'Practice my weak points')}>
        <Toggle on={st.focusPractice} onChange={(v) => set({ focusPractice: v })} />
      </Row>
      <Row label={t('AI 음성 (서버 지원 시)', 'Neural voices (if available)')}>
        <Toggle on={st.neuralVoice} onChange={(v) => set({ neuralVoice: v })} />
      </Row>
      <Row label={t('거리의 목소리 듣기', 'Hear people on the street')}>
        <Toggle on={st.ambientVoices} onChange={(v) => set({ ambientVoices: v })} />
      </Row>
      <Row label={t('내비게이션 음성', 'GPS voice')}>
        <Toggle on={st.gpsVoice} onChange={(v) => set({ gpsVoice: v })} />
      </Row>
      <Row label={`${t('말하기 속도', 'Voice speed')} ${st.voiceRate.toFixed(2)}×`}>
        <input
          type="range"
          min={0.7}
          max={1.2}
          step={0.05}
          value={st.voiceRate}
          onChange={(e) => set({ voiceRate: Number(e.target.value) })}
          onPointerUp={() => void speakPhrase('This is how fast people will talk.')}
          className="w-32 accent-yellow-400"
        />
      </Row>
      <Row label={t('효과음', 'Sound effects')}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={st.sfxVolume}
          onChange={(e) => {
            set({ sfxVolume: Number(e.target.value) });
            sfx.setVolume(Number(e.target.value));
          }}
          className="w-32 accent-yellow-400"
        />
      </Row>
      <Row label={t('음성 볼륨', 'Voice volume')}>
        <input type="range" min={0} max={1} step={0.05} value={st.voiceVolume} onChange={(e) => set({ voiceVolume: Number(e.target.value) })} className="w-32 accent-yellow-400" />
      </Row>
      <Row label={t('그래픽', 'Graphics')}>
        <Segmented value={st.graphics} options={[['high', t('고화질', 'High')], ['low', t('저사양', 'Low')]]} onChange={(v) => set({ graphics: v })} />
      </Row>
      <div className="space-y-2 py-4">
        <button className="btn-ghost w-full" onClick={() => actions.quitToTitle()}>
          {t('저장하고 타이틀로', 'Save & quit to title')}
        </button>
        {confirm ? (
          <div className="rounded-xl bg-red-500/10 p-3 text-center">
            <p className="text-sm text-red-100">{t('모든 진행 상황이 삭제돼요. 정말요?', 'All progress will be deleted. Are you sure?')}</p>
            <div className="mt-2 flex justify-center gap-2">
              <button className="btn-ghost" onClick={() => setConfirm(false)}>
                {t('취소', 'Cancel')}
              </button>
              <button className="btn-danger" onClick={() => actions.quitToTitle(true)}>
                {t('초기화', 'Reset')}
              </button>
            </div>
          </div>
        ) : (
          <button className="w-full py-2 text-xs text-red-300/70" onClick={() => setConfirm(true)}>
            {t('진행 상황 초기화', 'Reset progress')}
          </button>
        )}
      </div>
      <p className="pt-4 text-[11px] leading-relaxed text-white/35">
        EldenSpeak v1.0 ·{' '}
        {t(
          '음성 인식은 브라우저/기기의 음성 서비스를 사용해요. 대화 텍스트는 AI 응답과 피드백을 위해 서버로 전송되며, 진행 상황은 이 기기에 저장돼요.',
          'Speech recognition uses your browser/device speech service. Conversation text is sent to our server for AI replies and feedback; progress is stored on this device.',
        )}
      </p>
    </div>
  );
}
