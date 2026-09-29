import { HAIR, SKIN } from '@shared/content/npcs';
import { similarity } from '@shared/rules';
import { LEVELS, type HairStyle, type Level } from '@shared/types';
import { ChevronLeft, Mic, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { sfx } from '../audio/sfx';
import { speakPhrase } from '../audio/voice';
import { useSpeechInput } from '../conversation/useSpeechInput';
import { OUTFITS } from '../game/outfits';
import { useLang, useTr } from '../i18n';
import { setSave } from '../state/game';
import { newSave } from '../state/save';
import { setScreen } from '../state/ui';
import { Avatar } from './Avatar';
import { LEVEL_INFO } from './phone/SettingsApp';

const NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Chris', 'Jamie', 'Riley', 'Morgan'];
const HAIRS = [HAIR.black, HAIR.dark, HAIR.brown, HAIR.auburn, HAIR.blonde, HAIR.pink];
const STYLES: HairStyle[] = ['short', 'side', 'long', 'bob', 'ponytail', 'curly', 'buzz', 'bun'];
const SAMPLE: Record<Level, string> = {
  A1: 'Hi! Coffee? Hot or iced?',
  A2: 'Hi there! What would you like to drink today?',
  B1: "Hey! What can I get started for you? We've got a new caramel latte.",
  B2: "Morning! What'll it be? Heads up, the oat milk ran out an hour ago.",
  C1: "Hey there! Grab whatever takes your fancy — though fair warning, the line's about to go nuts.",
};

export function Onboarding() {
  const t = useTr();
  const lang = useLang();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [level, setLevel] = useState<Level>('A2');
  const [skin, setSkin] = useState<string>(SKIN[1]);
  const [hair, setHair] = useState<string>(HAIR.black);
  const [style, setStyle] = useState<HairStyle>('short');
  const [heard, setHeard] = useState<string | null>(null);
  const speech = useSpeechInput((text) => {
    setHeard(text);
    sfx.play(similarity(text, 'Hello Elden City') > 0.5 ? 'objective' : 'pop');
  });

  const look = { skin, hair, hairStyle: style, shirt: OUTFITS[0].shirt };
  const finish = () => {
    sfx.play('success');
    setSave(newSave({ name: name.trim() || 'Alex', level, look: { skin, hair, hairStyle: style }, outfit: 'street', uiLang: lang }));
    setScreen('game');
  };
  const next = () => {
    sfx.play('click');
    setStep((s) => s + 1);
  };

  const steps = [
    // 0: name
    <div key="name" className="space-y-4">
      <h2 className="display text-3xl uppercase text-white">{t('당신의 영어 이름은?', "What's your name?")}</h2>
      <p className="text-sm text-white/60">{t('도시 사람들이 이 이름으로 부를 거예요.', 'People in the city will call you by this name.')}</p>
      <input
        autoFocus
        value={name}
        maxLength={20}
        onChange={(e) => setName(e.target.value.replace(/[^A-Za-z .'-]/g, ''))}
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && next()}
        placeholder="Alex"
        className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-lg text-white outline-none focus:border-yellow-400"
      />
      <div className="flex flex-wrap gap-2">
        {NAMES.map((n) => (
          <button key={n} className="chip bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20" onClick={() => setName(n)}>
            {n}
          </button>
        ))}
      </div>
      <button className="btn-primary w-full py-3" disabled={!name.trim()} onClick={next}>
        {t('다음', 'Next')}
      </button>
    </div>,
    // 1: level
    <div key="level" className="space-y-3">
      <h2 className="display text-3xl uppercase text-white">{t('영어 실력은 어느 정도예요?', 'How good is your English?')}</h2>
      <p className="text-sm text-white/60">{t('캐릭터들이 이 수준에 맞춰 말해요. 언제든 바꿀 수 있어요.', 'Characters will talk at this level. You can change it anytime.')}</p>
      <div className="space-y-1.5">
        {LEVELS.map((l) => (
          <button key={l} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${level === l ? 'bg-yellow-400 text-gray-900' : 'bg-white/5 text-white hover:bg-white/10'}`} onClick={() => setLevel(l)}>
            <span className="w-8 font-black">{l}</span>
            <span className="text-sm">{t(...LEVEL_INFO[l])}</span>
          </button>
        ))}
      </div>
      <button className="flex w-full items-center gap-2 rounded-xl bg-sky-500/10 p-3 text-left text-sm text-sky-100" onClick={() => void speakPhrase(SAMPLE[level])}>
        <Volume2 size={16} className="shrink-0" /> “{SAMPLE[level]}”
      </button>
      <button className="btn-primary w-full py-3" onClick={next}>
        {t('다음', 'Next')}
      </button>
    </div>,
    // 2: look
    <div key="look" className="space-y-4">
      <h2 className="display text-3xl uppercase text-white">{t('외모를 골라요', 'Choose your look')}</h2>
      <div className="flex justify-center">
        <Avatar look={look} emotion="happy" size={120} className="shadow-xl ring-4 ring-white/10" />
      </div>
      <div className="flex justify-center gap-2">
        {SKIN.map((c) => (
          <button key={c} aria-label={c} className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-gray-950 ${skin === c ? 'ring-2 ring-yellow-400' : ''}`} style={{ background: c }} onClick={() => setSkin(c)} />
        ))}
      </div>
      <div className="flex justify-center gap-2">
        {HAIRS.map((c) => (
          <button key={c} aria-label={c} className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-gray-950 ${hair === c ? 'ring-2 ring-yellow-400' : ''}`} style={{ background: c }} onClick={() => setHair(c)} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {STYLES.map((s) => (
          <button key={s} className={`flex justify-center rounded-xl py-1.5 ${style === s ? 'bg-yellow-400/20 ring-2 ring-yellow-400' : 'bg-white/5'}`} onClick={() => setStyle(s)}>
            <Avatar look={{ ...look, hairStyle: s }} size={44} />
          </button>
        ))}
      </div>
      <button className="btn-primary w-full py-3" onClick={next}>
        {t('다음', 'Next')}
      </button>
    </div>,
    // 3: mic test
    <div key="mic" className="space-y-4 text-center">
      <h2 className="display text-3xl uppercase text-white">{t('마이크 테스트', 'Mic check')}</h2>
      <p className="text-sm text-white/65">{t('이 게임의 핵심은 말하기예요. 버튼을 누르고 이렇게 말해 보세요:', 'This game is all about speaking. Tap the button and say:')}</p>
      <p className="display text-3xl text-yellow-300">“Hello, Elden City!”</p>
      {speech.supported ? (
        <button className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-white shadow-xl ${speech.listening ? 'mic-live bg-red-500' : 'bg-sky-500'}`} onClick={() => (speech.listening ? speech.stop() : void speech.start())}>
          <Mic size={36} />
        </button>
      ) : (
        <p className="rounded-xl bg-amber-500/15 p-3 text-sm text-amber-100">{t('이 브라우저는 음성 인식을 지원하지 않아요. 타이핑으로도 플레이할 수 있어요. (Chrome 권장)', "This browser can't recognize speech. You can still play by typing. (Chrome recommended)")}</p>
      )}
      {(speech.partial || heard) && (
        <p className="text-lg text-white">
          {t('들린 말', 'I heard')}: <b>“{speech.partial || heard}”</b>
          {heard && similarity(heard, 'Hello Elden City') > 0.5 && <span className="ml-2 text-emerald-300">✓</span>}
        </p>
      )}
      <button className="btn-primary w-full py-3" onClick={next}>
        {heard ? t('완벽해요! 다음', 'Great! Next') : t('건너뛰기', 'Skip')}
      </button>
    </div>,
    // 4: intro
    <div key="intro" className="space-y-4">
      <div className="text-center text-5xl">✈️</div>
      <h2 className="display text-center text-3xl uppercase text-white">Welcome to Elden City</h2>
      <p className="leading-relaxed text-white/85">
        {t(
          `${name || 'Alex'}, 당신은 방금 $300와 큰 꿈을 안고 엘든 시티에 도착했어요. 사촌 레오가 이곳에 살고 있죠. 일자리를 구하고, 집을 찾고, 이 도시에서 성공하려면… 영어로 부딪혀야 해요.`,
          `${name || 'Alex'}, you just landed in Elden City with $300 and big dreams. Your cousin Leo lives here. To get a job, find a home and make it big… you'll have to talk your way through.`,
        )}
      </p>
      <ul className="space-y-1.5 text-sm text-white/75">
        <li>🎯 {t('노란 마커 = 스토리 미션', 'Yellow markers = story missions')}</li>
        <li>💬 {t('파란 마커 = 장소별 대화 미션', 'Blue markers = place conversations')}</li>
        <li>🚗 {t('초록 배지 차 = 누구나 탈 수 있는 City Share', 'Green-badge cars = City Share, free to drive')}</li>
        <li>🪙 {t('숨겨진 워드 코인을 모아 관용구를 배우세요', 'Find hidden Word Coins to learn idioms')}</li>
      </ul>
      <button className="btn-primary w-full py-4 text-lg" onClick={finish}>
        {t('시작하기', "Let's go")}
      </button>
    </div>,
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-[radial-gradient(ellipse_at_top,#1e293b,#0b0f1a)] p-4">
      <div className="w-full max-w-md py-6">
        <div className="mb-5 flex items-center gap-3">
          {step > 0 && (
            <button className="icon-btn h-9 w-9" aria-label={t('뒤로', 'Back')} onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="flex flex-1 gap-1.5">
            {steps.map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-yellow-400' : 'bg-white/15'}`} />
            ))}
          </div>
        </div>
        <div className="panel p-6 animate-rise" key={step}>
          {steps[step]}
        </div>
      </div>
    </div>
  );
}
