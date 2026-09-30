import { PLACE_BY_ID } from '@shared/content/city';
import { getScenario, scenariosAtPlace } from '@shared/content/scenarios';
import { romanceAt } from '@shared/content/romance';
import { STORY } from '@shared/content/story';
import { isScenarioLocked, levelFromXp, rankFor, unlockLevelFor } from '@shared/rules';
import type { JobKind, Scenario } from '@shared/types';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { sfx } from '../audio/sfx';
import { useLang, useTr } from '../i18n';
import { useGame } from '../state/game';
import { toast } from '../state/ui';
import { CloseButton, Difficulty, Modal, money, Stars } from './common';

export function PlaceMenu({
  placeId,
  onClose,
  onScenario,
  onJob,
  onShop,
}: {
  placeId: string;
  onClose: () => void;
  onScenario: (s: Scenario) => void;
  onJob: (job: JobKind) => void;
  onShop: (shop: 'cars' | 'outfits') => void;
}) {
  const t = useTr();
  const lang = useLang();
  const save = useGame((s) => s.save!);
  const place = PLACE_BY_ID.get(placeId)!;
  const step = STORY[save.storyStep];
  const story = step && getScenario(step.scenarioId).placeId === placeId ? getScenario(step.scenarioId) : null;
  const romance = romanceAt(placeId, save.romance.stage, save.storyStep);
  const sides = scenariosAtPlace(placeId).filter((s) => !(s.once && save.completedOnce.includes(s.id)));
  const jobUnlocked = place.job ? save.jobs.includes(place.job) : false;
  const level = levelFromXp(save.xp).level;
  const membersOnly = place.minLevel !== undefined && level < place.minLevel;

  const pick = (s: Scenario) => {
    sfx.play('pop');
    onScenario(s);
  };

  return (
    <Modal onBackdrop={onClose}>
      <div className="flex items-start gap-3 border-b border-white/10 p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-3xl">{place.icon}</div>
        <div className="flex-1">
          <h2 className="display text-2xl uppercase text-white">{place.name}</h2>
          <p className="text-sm text-white/60">{lang === 'ko' ? `${place.nameKo} · ${place.blurb.ko}` : place.blurb.en}</p>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      <div className="scroll-thin space-y-2 overflow-y-auto p-4">
        {membersOnly ? (
          <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-5 text-center">
            <div className="text-3xl">🔒</div>
            <p className="mt-2 font-bold text-white">{t('회원 전용입니다', 'Members only')}</p>
            <p className="mt-1 text-sm text-white/60">
              {t(`도어맨이 막아섭니다. ${rankFor(place.minLevel!).ko}(Lv${place.minLevel}) 칭호부터 입장할 수 있어요.`, `The doorman stops you. Members from ${rankFor(place.minLevel!).en} rank (Lv${place.minLevel}) only.`)}
            </p>
            <p className="mt-2 text-xs text-white/40">{t(`지금 Lv${level} · ${rankFor(level).ko}`, `You are Lv${level} · ${rankFor(level).en}`)}</p>
          </div>
        ) : (
          <>
        {story && (
          <button className="group w-full rounded-2xl border-2 border-yellow-400/70 bg-yellow-400/10 p-4 text-left transition hover:bg-yellow-400/20" onClick={() => pick(story)}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-yellow-300">
              ★ {t('스토리', 'Story')} · {t(`챕터 ${save.storyStep + 1}`, `Chapter ${save.storyStep + 1}`)}
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div className="display text-xl uppercase text-white">{story.title[lang]}</div>
              <ChevronRight className="text-yellow-300 transition group-hover:translate-x-1" />
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-white/70">{story.brief[lang]}</p>
          </button>
        )}
        {romance.map((s) => (
          <button key={s.id} className="group w-full rounded-2xl border-2 border-pink-400/70 bg-pink-500/10 p-4 text-left transition hover:bg-pink-500/20" onClick={() => pick(s)}>
            <div className="text-xs font-bold uppercase tracking-wider text-pink-300">💕 {t('미선', 'Miseon')}{s.once ? '' : ` · ${t('데이트', 'Date')}`}</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="display text-xl uppercase text-white">{s.title[lang]}</div>
              <ChevronRight className="text-pink-300 transition group-hover:translate-x-1" />
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-white/70">{s.brief[lang]}</p>
          </button>
        ))}
        {sides.map((s) => {
          const locked = isScenarioLocked(s, level, save.bestStars);
          const need = unlockLevelFor(s);
          return (
            <button
              key={s.id}
              className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${locked ? 'cursor-not-allowed bg-white/[0.03] opacity-60' : 'bg-white/5 hover:bg-white/10'}`}
              onClick={() => (locked ? toast(t(`${rankFor(need).ko}(Lv${need})부터 도전할 수 있어요`, `Opens at ${rankFor(need).en} rank (Lv${need})`), 'info') : pick(s))}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{s.title[lang]}</span>
                  <Difficulty level={s.difficulty} />
                </div>
                <p className="line-clamp-1 text-xs text-white/55">{s.brief[lang]}</p>
              </div>
              {locked ? (
                <span className="chip shrink-0 bg-white/10 text-white/70">
                  🔒 Lv{need} {rankFor(need)[lang]}
                </span>
              ) : (
                <div className="flex flex-col items-end gap-0.5">
                  <Stars value={save.bestStars[s.id] ?? 0} size={13} />
                  <span className="text-xs font-bold text-emerald-300">{s.reward.cash > 0 ? money(s.reward.cash) : `${s.reward.xp} XP`}</span>
                </div>
              )}
            </button>
          );
        })}
        {place.job && jobUnlocked && (
          <button className="btn-primary w-full py-3.5 text-base" onClick={() => onJob(place.job!)}>
            {place.job === 'taxi' ? t('🚕 택시 근무 시작', '🚕 Start taxi shift') : t('🍕 배달 근무 시작', '🍕 Start delivery shift')}
          </button>
        )}
        {place.job && !jobUnlocked && <p className="px-1 text-center text-xs text-white/50">{t('면접에 합격하면 이곳에서 일할 수 있어요.', 'Pass the interview to work here.')}</p>}
        {place.shop && (
          <button className="btn-ghost w-full py-3" onClick={() => onShop(place.shop!)}>
            <ShoppingBag size={17} /> {place.shop === 'cars' ? t('차 구경하기', 'Browse cars') : t('옷 구경하기', 'Browse outfits')}
          </button>
        )}
        {!story && romance.length === 0 && sides.length === 0 && !place.job && !place.shop && <p className="py-4 text-center text-sm text-white/50">{t('지금은 할 일이 없어요.', 'Nothing to do here right now.')}</p>}
          </>
        )}
      </div>
    </Modal>
  );
}
