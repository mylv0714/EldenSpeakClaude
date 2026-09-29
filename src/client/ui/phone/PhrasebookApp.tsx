import { similarity } from '@shared/rules';
import { Mic, Search, Trash2, Volume2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { speakPhrase } from '../../audio/voice';
import { useSpeechInput } from '../../conversation/useSpeechInput';
import { useTr } from '../../i18n';
import type { PhraseCard } from '../../state/save';
import { removePhrase, reviewPhrase, useGame } from '../../state/game';
import { Diff } from '../conversation/Diff';

const PASS = 0.75;

function Review({ cards, onDone }: { cards: PhraseCard[]; onDone: () => void }) {
  const t = useTr();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<{ score: number; said: string } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const card = cards[index];

  const check = (said: string) => {
    if (!card || result) return;
    const score = similarity(said, card.en);
    const ok = score >= PASS;
    setResult({ score, said });
    if (ok) setCorrectCount((c) => c + 1);
    reviewPhrase(card.id, ok);
    sfx.play(ok ? 'objective' : 'thud');
    void speakPhrase(card.en);
  };
  const speech = useSpeechInput(check);

  if (!card) {
    return (
      <div className="p-6 text-center">
        <div className="display text-3xl text-yellow-400">{t('복습 완료!', 'Review done!')}</div>
        <p className="mt-2 text-white/70">
          {correctCount} / {cards.length} {t('정답', 'correct')}
        </p>
        <button className="btn-primary mt-5 w-full" onClick={onDone}>
          {t('돌아가기', 'Back')}
        </button>
      </div>
    );
  }

  const listenMode = !card.native;
  return (
    <div className="space-y-4 p-5">
      <div className="text-xs text-white/50">
        {index + 1} / {cards.length}
      </div>
      <div className="rounded-2xl bg-white/5 p-5 text-center">
        <div className="text-xs font-bold uppercase tracking-wider text-sky-300">{listenMode ? t('듣고 따라 말하기', 'Listen & repeat') : t('영어로 말해 보세요', 'Say it in English')}</div>
        {listenMode ? (
          <button className="mt-3 inline-flex items-center gap-2 text-lg text-white" onClick={() => void speakPhrase(card.en)}>
            <Volume2 className="text-sky-300" /> {t('다시 듣기', 'Play again')}
          </button>
        ) : (
          <div className="mt-2 text-xl font-bold text-white">{card.native}</div>
        )}
      </div>
      {result ? (
        <div className="space-y-3">
          <div className={`rounded-xl p-3 text-sm ${result.score >= PASS ? 'bg-emerald-500/15 text-emerald-100' : 'bg-red-500/15 text-red-100'}`}>
            {result.score >= PASS ? t('정답! 👏', 'Correct! 👏') : t('아쉬워요. 이렇게 말해요:', 'Almost. Here is the phrase:')}
            <div className="mt-1 text-base text-white">
              <Diff from={result.said} to={card.en} />
            </div>
          </div>
          <button
            className="btn-primary w-full"
            onClick={() => {
              setResult(null);
              setAnswer('');
              setIndex((i) => i + 1);
            }}
          >
            {t('다음', 'Next')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {speech.supported && (
            <button className={`btn w-full py-4 text-base text-white ${speech.listening ? 'mic-live bg-red-500' : 'bg-sky-500'}`} onClick={() => (speech.listening ? speech.stop() : void speech.start())}>
              <Mic size={20} /> {speech.listening ? speech.partial || t('듣고 있어요…', 'Listening…') : t('눌러서 말하기', 'Tap to speak')}
            </button>
          )}
          <div className="flex gap-2">
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && answer.trim() && check(answer)}
              placeholder={t('또는 입력하기', 'Or type it')}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-white outline-none"
            />
            <button className="btn-ghost" disabled={!answer.trim()} onClick={() => check(answer)}>
              {t('확인', 'Check')}
            </button>
          </div>
          <button className="w-full py-1 text-xs text-white/40" onClick={() => check('')}>
            {t('모르겠어요 (정답 보기)', "I don't know (show answer)")}
          </button>
        </div>
      )}
    </div>
  );
}

export function PhrasebookApp() {
  const t = useTr();
  const phrases = useGame((s) => s.save!.phrasebook);
  const [query, setQuery] = useState('');
  const [reviewing, setReviewing] = useState<PhraseCard[] | null>(null);
  const due = useMemo(() => phrases.filter((p) => p.due <= Date.now()), [phrases]);
  const list = phrases.filter((p) => !query || `${p.en} ${p.native}`.toLowerCase().includes(query.toLowerCase()));

  if (reviewing) return <Review cards={reviewing} onDone={() => setReviewing(null)} />;

  return (
    <div className="space-y-3 p-4">
      <button className="btn-primary w-full py-3.5" disabled={due.length === 0} onClick={() => setReviewing(due.slice(0, 10))}>
        {due.length > 0 ? t(`🧠 복습하기 (${due.length})`, `🧠 Review (${due.length})`) : t('✅ 오늘 복습 완료', '✅ All caught up')}
      </button>
      <label className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
        <Search size={15} className="text-white/40" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('검색', 'Search')} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" />
      </label>
      {list.length === 0 && <p className="py-6 text-center text-sm text-white/50">{t('대화 결과 화면에서 ★ 표시한 표현이 여기에 모여요.', 'Expressions you star after conversations appear here.')}</p>}
      <ul className="space-y-1.5">
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
            <button className="text-sky-300" aria-label="listen" onClick={() => void speakPhrase(p.en)}>
              <Volume2 size={16} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">{p.en}</div>
              {p.native && <div className="text-xs text-white/50">{p.native}</div>}
            </div>
            <span className="flex gap-0.5" title={`box ${p.box}`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= p.box ? 'bg-emerald-400' : 'bg-white/15'}`} />
              ))}
            </span>
            <button className="text-white/30 hover:text-red-400" aria-label="delete" onClick={() => removePhrase(p.id)}>
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
