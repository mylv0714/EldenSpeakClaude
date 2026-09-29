import type { DebriefReply } from '@shared/api';
import { getScenario } from '@shared/content/scenarios';
import { WEAK_POINT_BY_ID } from '@shared/content/weakPoints';
import { levelFromXp } from '@shared/rules';
import { Loader2, MicVocal, RotateCcw, Star, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { sfx } from '../../audio/sfx';
import { speakPhrase } from '../../audio/voice';
import { errorText } from '../../conversation/useConversation';
import type { ConversationSummary } from '../../conversation/types';
import { useLang, useTr } from '../../i18n';
import { addPhrase, applyDebrief, getSave, useGame } from '../../state/game';
import { Bar, money, Stars } from '../common';
import { Diff } from './Diff';
import { ShadowSheet } from './ShadowSheet';

type Tab = 'feedback' | 'corrections' | 'expressions';

export function Results({
  summary,
  historyId,
  levelUp,
  onContinue,
  onRetry,
}: {
  summary: ConversationSummary;
  historyId: string;
  levelUp: number | null;
  onContinue: () => void;
  onRetry?: () => void;
}) {
  const t = useTr();
  const lang = useLang();
  const xp = useGame((s) => s.save!.xp);
  const scenario = getScenario(summary.launch.scenarioId);
  const [debrief, setDebrief] = useState<DebriefReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('feedback');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [shadow, setShadow] = useState<{ text: string; native?: string } | null>(null);
  const spoke = summary.messages.some((m) => m.role === 'player');
  const passed = summary.outcome === 'success';
  const lvl = levelFromXp(xp);

  useEffect(() => {
    if (!spoke) return;
    let cancelled = false;
    const save = getSave();
    api
      .debrief({
        scenarioId: summary.launch.scenarioId,
        npcId: summary.launch.npcId,
        level: save.level,
        nativeLang: save.settings.uiLang,
        playerName: save.name,
        context: summary.launch.context,
        history: summary.transcript.slice(-60),
        outcome: summary.outcome,
        completed: summary.completed,
      })
      .then((d) => {
        if (cancelled) return;
        setDebrief(d);
        setPicked(new Set(d.expressions.slice(0, 3).map((e) => e.en)));
        applyDebrief(historyId, summary.launch.npcId, d);
      })
      .catch((err) => !cancelled && setError(errorText(err)));
    return () => {
      cancelled = true;
    };
  }, [historyId, spoke, summary]);

  useEffect(() => {
    if (levelUp) setTimeout(() => sfx.play('levelup'), 600);
    if (summary.reward.cash > 0) setTimeout(() => sfx.play('cash'), 350);
  }, [levelUp, summary.reward.cash]);

  const finish = () => {
    if (debrief) for (const e of debrief.expressions) if (picked.has(e.en)) addPhrase(e.en, e.native, scenario.id);
    sfx.play('click');
    onContinue();
  };

  const corrections = summary.messages.filter((m) => m.role === 'player' && m.feedback);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm animate-fade safe-x">
      <div className="panel flex max-h-full w-full max-w-2xl flex-col overflow-hidden animate-pop">
        <div className={`relative px-6 pb-4 pt-6 text-center ${passed ? 'bg-gradient-to-b from-yellow-400/25 to-transparent' : 'bg-gradient-to-b from-red-500/25 to-transparent'}`}>
          <div className={`display outline-text text-4xl uppercase sm:text-5xl ${passed ? 'text-yellow-400' : 'text-red-500'}`}>
            {passed ? (scenario.freeTalk ? t('즐거운 대화였어요 💕', 'Lovely chat 💕') : t('미션 성공', 'Mission passed')) : summary.outcome === 'abandoned' ? t('미션 중단', 'Mission abandoned') : t('미션 실패', 'Mission failed')}
          </div>
          <div className="mt-1 text-sm text-white/70">{scenario.title[lang]}</div>
          <div className="mt-3 flex items-center justify-center gap-4">
            <Stars value={summary.stars} size={30} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-lg font-bold">
            {summary.reward.cash > 0 && <span className="display text-3xl text-emerald-400 outline-text">+{money(summary.reward.cash)}</span>}
            {summary.reward.xp > 0 && <span className="chip bg-yellow-400/20 text-base text-yellow-200">+{summary.reward.xp} XP</span>}
            {spoke && <span className="chip bg-white/10 text-base text-white/80">{t('평균 점수', 'Avg score')} {summary.avgScore}</span>}
          </div>
          {levelUp && <div className="display mt-2 text-2xl uppercase text-sky-300 animate-pop">⬆ {t(`레벨 업! Lv.${levelUp}`, `Level up! Lv.${levelUp}`)}</div>}
          <div className="mx-auto mt-3 max-w-xs">
            <div className="mb-1 flex justify-between text-[11px] text-white/50">
              <span>Lv.{lvl.level}</span>
              <span>
                {lvl.into}/{lvl.needed} XP
              </span>
            </div>
            <Bar value={lvl.into} max={lvl.needed} />
          </div>
        </div>

        {spoke && (
          <>
            <div className="flex gap-1 border-y border-white/10 px-4 py-2">
              {(
                [
                  ['feedback', t('피드백', 'Feedback')],
                  ['corrections', t(`교정 ${corrections.length}`, `Corrections ${corrections.length}`)],
                  ['expressions', t('표현', 'Expressions')],
                ] as [Tab, string][]
              ).map(([id, label]) => (
                <button key={id} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === id ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'}`} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="scroll-thin min-h-[180px] flex-1 overflow-y-auto p-5">
              {tab === 'corrections' ? (
                <ul className="space-y-3">
                  {corrections.map((m) => (
                    <li key={m.id} className="rounded-xl bg-white/5 p-3 text-sm">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-white/50">“{m.text}”</span>
                        <span className={`chip ${m.feedback!.score >= 85 ? 'bg-emerald-500/20 text-emerald-200' : m.feedback!.score >= 65 ? 'bg-amber-500/20 text-amber-100' : 'bg-red-500/20 text-red-100'}`}>{m.feedback!.score}</span>
                      </div>
                      {m.feedback!.corrected ? <Diff from={m.text} to={m.feedback!.corrected} /> : <span className="text-emerald-200">✓ {t('정확해요', 'Correct')}</span>}
                      {m.feedback!.natural && (
                        <div className="mt-1 text-sky-200">
                          → {m.feedback!.natural}
                          <button className="ml-1 inline-flex align-middle text-sky-300" aria-label="listen" onClick={() => void speakPhrase(m.feedback!.natural!)}>
                            <Volume2 size={14} />
                          </button>
                          <button className="ml-1 inline-flex align-middle text-sky-300" aria-label="repeat" onClick={() => setShadow({ text: m.feedback!.natural! })}>
                            <MicVocal size={14} />
                          </button>
                        </div>
                      )}
                      {m.feedback!.explanation && <div className="mt-1 text-white/60">💡 {m.feedback!.explanation}</div>}
                    </li>
                  ))}
                </ul>
              ) : !debrief ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-white/60">
                  {error ? (
                    <p className="text-sm text-red-200">{error}</p>
                  ) : (
                    <>
                      <Loader2 className="animate-spin" />
                      <p className="text-sm">{t('AI 선생님이 피드백을 쓰고 있어요…', 'Your AI teacher is writing feedback…')}</p>
                    </>
                  )}
                </div>
              ) : tab === 'feedback' ? (
                <div className="space-y-4 text-sm">
                  <p className="leading-relaxed text-white/90">{debrief.summary}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-emerald-500/10 p-3">
                      <div className="mb-1 text-xs font-bold uppercase text-emerald-300">{t('잘한 점', 'Strengths')}</div>
                      <ul className="space-y-1 text-white/85">
                        {debrief.strengths.map((s) => (
                          <li key={s}>✓ {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl bg-amber-500/10 p-3">
                      <div className="mb-1 text-xs font-bold uppercase text-amber-300">{t('더 좋아질 점', 'To improve')}</div>
                      <ul className="space-y-1 text-white/85">
                        {debrief.improvements.map((s) => (
                          <li key={s}>→ {s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(
                      [
                        [t('문법', 'Grammar'), debrief.grammar, 'bg-sky-400'],
                        [t('어휘', 'Vocabulary'), debrief.vocabulary, 'bg-violet-400'],
                        [t('유창성', 'Fluency'), debrief.fluency, 'bg-emerald-400'],
                      ] as const
                    ).map(([label, v, color]) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="w-16 text-xs text-white/60">{label}</span>
                        <Bar value={v} color={color} />
                        <span className="w-8 text-right text-xs font-bold text-white/80">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-white/50">
                    {t('이번 대화에서 보여준 수준', 'Level shown in this conversation')}: <span className="chip bg-sky-500/20 text-sky-200">{debrief.level}</span>
                  </div>
                  {debrief.weakPoints.length > 0 && (
                    <div className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-100">
                      🎯 {t('반복된 실수', 'Recurring mistakes')}: <b>{debrief.weakPoints.map((id) => WEAK_POINT_BY_ID.get(id)?.label[lang]).join(', ')}</b>
                      <div className="mt-0.5 text-rose-100/60">{t('다음 대화에서 자연스럽게 연습할 기회를 만들어 줄게요.', 'Upcoming conversations will give you chances to practice this.')}</div>
                    </div>
                  )}
                </div>
              ) : (
                <ul className="space-y-2">
                  {debrief.expressions.map((e) => {
                    const on = picked.has(e.en);
                    return (
                      <li key={e.en} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                        <button className="text-sky-300" aria-label="listen" onClick={() => void speakPhrase(e.en)}>
                          <Volume2 size={17} />
                        </button>
                        <button className="text-sky-300" aria-label="repeat" onClick={() => setShadow({ text: e.en, native: e.native })}>
                          <MicVocal size={17} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-white">{e.en}</div>
                          <div className="text-xs text-white/50">{e.native}</div>
                        </div>
                        <button
                          aria-label="save"
                          className={on ? 'text-yellow-300' : 'text-white/25'}
                          onClick={() =>
                            setPicked((s) => {
                              const n = new Set(s);
                              if (n.has(e.en)) n.delete(e.en);
                              else n.add(e.en);
                              return n;
                            })
                          }
                        >
                          <Star size={20} fill={on ? 'currentColor' : 'none'} />
                        </button>
                      </li>
                    );
                  })}
                  <li className="pt-1 text-center text-xs text-white/40">{t('★ 표시한 표현은 표현집에 저장되고 복습에 나와요', 'Starred expressions go to your phrasebook for review')}</li>
                </ul>
              )}
            </div>
          </>
        )}

        <div className="flex gap-2 border-t border-white/10 bg-black/30 p-4">
          {onRetry && (
            <button className="btn-ghost" onClick={onRetry}>
              <RotateCcw size={16} /> {t('다시 하기', 'Retry')}
            </button>
          )}
          <button className="btn-primary flex-1" onClick={finish} autoFocus>
            {t('계속', 'Continue')}
          </button>
        </div>
      </div>
      {shadow && <ShadowSheet text={shadow.text} native={shadow.native} onClose={() => setShadow(null)} />}
    </div>
  );
}
