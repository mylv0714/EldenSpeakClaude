import { PLACE_BY_ID } from '@shared/content/city';
import { getNpc } from '@shared/content/npcs';
import { getScenario } from '@shared/content/scenarios';
import { contextVars, fillTemplate } from '@shared/content/template';
import { levelFromXp, RANK_LEVEL } from '@shared/rules';
import { ChevronLeft, Clock, Mic, Volume2 } from 'lucide-react';
import { sfx } from '../../audio/sfx';
import { speakPhrase } from '../../audio/voice';
import type { ConversationLaunch } from '../../conversation/types';
import { useLang, useTr } from '../../i18n';
import { useGame } from '../../state/game';
import { Avatar } from '../Avatar';
import { Difficulty, money, Modal } from '../common';
import { RouteMap } from './RouteMap';

const ACCENT: Record<string, [string, string]> = { us: ['미국식 억양', 'US accent'], uk: ['영국식 억양', 'UK accent'], au: ['호주식 억양', 'Aussie accent'], in: ['인도식 억양', 'Indian accent'] };

export function Briefing({
  launch,
  onStart,
  onBack,
  onPayFine,
}: {
  launch: ConversationLaunch;
  onStart: () => void;
  onBack?: () => void;
  onPayFine?: () => void;
}) {
  const t = useTr();
  const lang = useLang();
  const save = useGame((s) => s.save!);
  const scenario = getScenario(launch.scenarioId);
  const npc = getNpc(launch.npcId);
  const vars = contextVars(launch.context, lang, save.name);
  const place = scenario.placeId ? PLACE_BY_ID.get(scenario.placeId) : undefined;
  const best = save.bestStars[scenario.id] ?? 0;
  const ctx = launch.context;

  return (
    <Modal wide>
      <div className="relative border-b border-white/10 bg-gradient-to-r from-yellow-400/15 via-transparent to-transparent px-5 py-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-yellow-300">
          {scenario.kind === 'story'
            ? t('스토리 미션', 'Story mission')
            : scenario.kind === 'romance'
              ? `💕 ${t('미선', 'Miseon')}`
              : scenario.kind === 'call'
                ? `📞 ${t('전화 미션', 'Phone call')}${place ? ` · ${lang === 'ko' ? place.nameKo : place.name}` : ''}`
                : place
                  ? `${place.icon} ${lang === 'ko' ? place.nameKo : place.name}`
                  : t('거리 이벤트', 'Street event')}
          <Difficulty level={scenario.difficulty} />
          {best > 0 && <span className="text-yellow-400">{'★'.repeat(best)}</span>}
        </div>
        <h2 className="display mt-1 text-3xl text-white uppercase">{scenario.title[lang]}</h2>
      </div>

      <div className="scroll-thin grid flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <Avatar look={npc.look} size={68} />
            <div>
              <div className="font-bold text-white">
                {npc.name} <span className="chip ml-1 bg-white/10 px-2 py-0.5 align-middle text-[10px] font-medium text-white/70">{t(...ACCENT[npc.accent])}</span>
              </div>
              <div className="text-sm text-white/60">{lang === 'ko' ? npc.roleKo : npc.role}</div>
            </div>
          </div>
          <p className="text-[15px] leading-relaxed text-white/90">{fillTemplate(scenario.brief[lang], vars)}</p>
          {lang === 'ko' && <p className="text-sm leading-relaxed text-white/45">{fillTemplate(scenario.brief.en, contextVars(ctx, 'en', save.name))}</p>}

          {launch.routePreview && (
            <div>
              <RouteMap points={launch.routePreview} />
              <p className="mt-1.5 text-xs text-fuchsia-300">{t('보라색 경로를 보고 길을 설명해 주세요. 📍가 목적지예요.', 'Explain the purple route. 📍 marks the destination.')}</p>
            </div>
          )}
          {ctx?.order && (
            <div className="rounded-xl bg-orange-500/10 p-3 text-sm">
              🍕 {t('주문', 'Order')}: <b>{ctx.order.join(', ')}</b>
              {(ctx.minutesLate ?? 0) > 0 && <div className="mt-1 text-red-300">⏰ {t(`${ctx.minutesLate}분 늦었어요! 손님이 화났을 수도…`, `${ctx.minutesLate} min late! The customer may be upset…`)}</div>}
            </div>
          )}
          {ctx?.fare !== undefined && (
            <div className="rounded-xl bg-yellow-500/10 p-3 text-sm">
              🚕 {t('예상 요금', 'Estimated fare')}: <b>${ctx.fare}</b>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">{t('목표', 'Objectives')}</h3>
            <ul className="space-y-1.5">
              {scenario.objectives.map((o) => (
                <li key={o.id} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${o.bonus ? 'bg-yellow-400/10 text-yellow-100' : 'bg-white/5 text-white/90'}`}>
                  <span className="mt-0.5">{o.bonus ? '★' : '○'}</span>
                  <span>
                    {o.label[lang]}
                    {o.bonus && <span className="ml-1 text-xs text-yellow-300/80">({t('보너스', 'bonus')})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">{t('유용한 표현', 'Useful phrases')}</h3>
            <ul className="space-y-1">
              {scenario.phrases.map((p) => (
                <li key={p.en}>
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5"
                    onClick={() => void speakPhrase(p.en)}
                  >
                    <Volume2 size={15} className="shrink-0 text-sky-300" />
                    <span>
                      <span className="text-white">{p.en}</span>
                      {lang === 'ko' && <span className="block text-xs text-white/45">{p.ko}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-black/30 px-5 py-3">
        <div className="flex flex-1 flex-wrap items-center gap-3 text-xs text-white/60">
          <span className="chip bg-sky-500/15 text-sky-200">{save.level}</span>
          <span className="inline-flex items-center gap-1">
            <Clock size={13} /> {t(`최대 ${scenario.maxTurns}턴`, `${scenario.maxTurns} turns`)}
          </span>
          {scenario.reward.cash > 0 && <span className="font-bold text-emerald-300">{money(scenario.reward.cash)}+</span>}
          <span className="font-bold text-yellow-300">{scenario.reward.xp} XP</span>
          {levelFromXp(save.xp).level >= RANK_LEVEL.newcomer && (
            <span className="text-sky-200" title={t('힌트와 한→영 번역 없이 성공하면', 'Succeed without hints or translations')}>
              🧠 {t('노힌트 XP +30%', 'No-help XP +30%')}
            </span>
          )}
          <span className="hidden items-center gap-1 sm:inline-flex">
            <Mic size={13} /> {t('마이크로 말하거나 입력하세요', 'Speak or type')}
          </span>
        </div>
        {onPayFine && (
          <button className="btn-ghost" onClick={onPayFine}>
            {t('벌금 내기', 'Pay the fine')}
          </button>
        )}
        {onBack && (
          <button
            className="btn-ghost"
            onClick={() => {
              sfx.play('click');
              onBack();
            }}
          >
            <ChevronLeft size={16} /> {t('나중에', 'Later')}
          </button>
        )}
        {scenario.kind === 'call' && <span className="w-full text-xs text-emerald-200/80 sm:w-auto">{t('🎧 자막 없이 시작해요 — 필요하면 탭해서 볼 수 있어요', '🎧 Subtitles start hidden — tap to show them')}</span>}
        <button
          className="btn-primary px-6"
          autoFocus
          onClick={() => {
            sfx.unlock();
            sfx.play('pop');
            onStart();
          }}
        >
          {scenario.kind === 'call' ? t('📞 전화 걸기', '📞 Call') : t('대화 시작', 'Start talking')}
        </button>
      </div>
    </Modal>
  );
}
