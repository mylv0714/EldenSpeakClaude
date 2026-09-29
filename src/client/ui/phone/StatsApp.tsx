import { IDIOMS } from '@shared/content/idioms';
import { SCENARIO_BY_ID } from '@shared/content/scenarios';
import { WEAK_POINT_BY_ID } from '@shared/content/weakPoints';
import { Phone } from 'lucide-react';
import { levelFromXp, rankFor } from '@shared/rules';
import { OUTFITS } from '../../game/outfits';
import { useLang, useTr } from '../../i18n';
import { topWeakPoints, useGame } from '../../state/game';
import { Avatar } from '../Avatar';
import { Bar, money, Stars } from '../common';
import type { PhoneActions } from './Phone';

export function StatsApp({ actions }: { actions: PhoneActions }) {
  const t = useTr();
  const lang = useLang();
  const save = useGame((s) => s.save!);
  const lvl = levelFromXp(save.xp);
  const s = save.stats;
  const rate = s.conversations ? Math.round((s.successes / s.conversations) * 100) : 0;
  const shirt = OUTFITS.find((o) => o.id === save.outfit)?.shirt ?? '#e4572e';
  const weak = topWeakPoints(save, 4);
  const hours = Math.floor(s.playSeconds / 3600);
  const mins = Math.floor((s.playSeconds % 3600) / 60);

  const tiles: [string, string][] = [
    [t('대화', 'Talks'), String(s.conversations)],
    [t('성공률', 'Success'), `${rate}%`],
    [t('말한 턴', 'Turns'), String(s.turns)],
    [t('연속 학습', 'Streak'), `🔥 ${save.streak.days}`],
    [t('플레이', 'Played'), `${hours}h ${mins}m`],
    [t('워드 코인', 'Coins'), `${save.collected.length}/${IDIOMS.length}`],
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-4 rounded-2xl bg-white/5 p-4">
        <Avatar look={{ ...save.look, shirt }} size={64} />
        <div className="min-w-0 flex-1">
          <div className="display text-2xl text-white">{save.name}</div>
          <div className="text-sm text-yellow-300">
            Lv.{lvl.level} · {rankFor(lvl.level)[lang]}
          </div>
          <Bar value={lvl.into} max={lvl.needed} className="mt-1.5" />
        </div>
        <div className="display text-xl text-emerald-400">{money(save.cash)}</div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white/5 p-3 text-center">
            <div className="text-lg font-bold text-white">{value}</div>
            <div className="text-[11px] text-white/50">{label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-2xl bg-white/5 p-4">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/50">
          <span>{t('영어 실력', 'English skills')}</span>
          <span className="normal-case tracking-normal">
            {t('설정', 'Setting')} <b className="text-sky-300">{save.level}</b>
            {s.levelEstimate && (
              <>
                {' · '}
                {t('최근 추정', 'Recent')} <b className="text-emerald-300">{s.levelEstimate}</b>
              </>
            )}
          </span>
        </div>
        {(
          [
            [t('문법', 'Grammar'), s.grammar, 'bg-sky-400'],
            [t('어휘', 'Vocabulary'), s.vocabulary, 'bg-violet-400'],
            [t('유창성', 'Fluency'), s.fluency, 'bg-emerald-400'],
            [t('발음', 'Pronunciation'), s.pronunciation, 'bg-rose-400'],
          ] as const
        ).map(([label, v, color]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-16 text-xs text-white/60">{label}</span>
            <Bar value={v} color={color} />
            <span className="w-8 text-right text-xs font-bold text-white/80">{v || '–'}</span>
          </div>
        ))}
        {s.levelEstimate && s.levelEstimate !== save.level && (
          <p className="pt-1 text-xs text-white/50">{t(`최근 대화는 ${s.levelEstimate} 수준이에요. 설정에서 레벨을 바꿀 수 있어요.`, `Recent talks look like ${s.levelEstimate}. You can change your level in Settings.`)}</p>
        )}
      </div>

      <div className="space-y-2 rounded-2xl bg-white/5 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">{t('나의 약점', 'My weak points')}</div>
        {weak.length === 0 ? (
          <p className="text-sm text-white/45">{t('대화를 몇 번 하면 AI 선생님이 자주 틀리는 부분을 찾아 줘요.', 'After a few conversations your AI teacher will spot recurring mistakes.')}</p>
        ) : (
          <ul className="space-y-1.5">
            {weak.map((id) => (
              <li key={id} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm">
                <span className="text-white">{WEAK_POINT_BY_ID.get(id)!.label[lang]}</span>
                <span className="text-xs text-amber-300">×{Math.round(save.weakPoints[id].count)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-white/45">
          {save.settings.focusPractice
            ? t('💡 대화 상대들이 이 부분을 자연스럽게 연습시켜 줘요.', '💡 Characters will quietly give you chances to practice these.')
            : t('약점 맞춤 연습이 꺼져 있어요 (설정).', 'Weak-point practice is off (Settings).')}
        </p>
        <button className="btn w-full bg-teal-500 text-white hover:bg-teal-400" onClick={() => actions.startCall('call_coach')}>
          <Phone size={16} /> {t('클라라 코치와 집중 연습 전화', 'Practice call with Coach Clara')}
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">{t('최근 대화', 'Recent conversations')}</h3>
        {save.history.length === 0 && <p className="text-sm text-white/40">{t('아직 기록이 없어요.', 'Nothing yet.')}</p>}
        <ul className="space-y-1.5">
          {save.history.slice(0, 10).map((h) => (
            <li key={h.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-white">{SCENARIO_BY_ID.get(h.scenarioId)?.title[lang] ?? h.scenarioId}</span>
              <Stars value={h.stars} size={12} />
              <span className="w-8 text-right text-xs text-white/60">{h.score}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
