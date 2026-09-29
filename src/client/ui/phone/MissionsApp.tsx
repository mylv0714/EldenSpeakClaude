import { PLACE_BY_ID, PLACES } from '@shared/content/city';
import { IDIOMS } from '@shared/content/idioms';
import { getScenario, scenariosAtPlace } from '@shared/content/scenarios';
import { STORY } from '@shared/content/story';
import { Check, Lock, Navigation } from 'lucide-react';
import { useLang, useTr } from '../../i18n';
import { useGame } from '../../state/game';
import { toast } from '../../state/ui';
import { Stars } from '../common';
import type { PhoneActions } from './Phone';

export function MissionsApp({ actions }: { actions: PhoneActions }) {
  const t = useTr();
  const lang = useLang();
  const save = useGame((s) => s.save!);
  const route = (placeId: string) => {
    actions.setWaypoint(placeId);
    toast(t('경로를 설정했어요. 미니맵의 보라색 선을 따라가세요!', 'Route set. Follow the purple line on the minimap!'), 'info');
  };

  return (
    <div className="space-y-5 p-4">
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-yellow-300">{t('스토리', 'Story')}</h3>
        <ol className="space-y-1.5">
          {STORY.map((step, i) => {
            const s = getScenario(step.scenarioId);
            const place = PLACE_BY_ID.get(s.placeId!)!;
            const done = i < save.storyStep;
            const current = i === save.storyStep;
            return (
              <li key={s.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${current ? 'bg-yellow-400/15 ring-1 ring-yellow-400/50' : 'bg-white/5'}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-500 text-white' : current ? 'bg-yellow-400 text-gray-900' : 'bg-white/10 text-white/40'}`}>
                  {done ? <Check size={14} /> : i > save.storyStep ? <Lock size={12} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-semibold ${i > save.storyStep ? 'text-white/35' : 'text-white'}`}>{i > save.storyStep ? '???' : s.title[lang]}</div>
                  {i <= save.storyStep && <div className="truncate text-xs text-white/45">{place.icon} {lang === 'ko' ? place.nameKo : place.name}</div>}
                </div>
                {current && (
                  <button className="icon-btn h-8 w-8 bg-yellow-400 text-gray-900" aria-label="route" onClick={() => route(place.id)}>
                    <Navigation size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ol>
        {save.storyStep >= STORY.length && <p className="mt-2 text-center text-sm text-emerald-300">🎉 {t('스토리를 모두 완료했어요!', 'Story complete!')}</p>}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-sky-300">{t('도시 곳곳의 미션', 'City missions')}</h3>
        <ul className="space-y-1.5">
          {PLACES.filter((p) => scenariosAtPlace(p.id).length > 0).map((p) => {
            const list = scenariosAtPlace(p.id);
            const stars = list.reduce((sum, s) => sum + (save.bestStars[s.id] ?? 0), 0);
            return (
              <li key={p.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                <span className="text-xl">{p.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{lang === 'ko' ? p.nameKo : p.name}</div>
                  <div className="truncate text-xs text-white/45">{list.map((s) => s.title[lang]).join(' · ')}</div>
                </div>
                <Stars value={Math.round(stars / list.length)} size={12} />
                <button className="icon-btn h-8 w-8" aria-label="route" onClick={() => route(p.id)}>
                  <Navigation size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/5 p-3">
          <div className="text-xs text-white/50">🚕 {t('택시 알바', 'Taxi job')}</div>
          <div className="font-semibold text-white">{save.jobs.includes('taxi') ? t('해금됨', 'Unlocked') : t('엘든 택시에서 면접', 'Interview at Elden Cabs')}</div>
        </div>
        <div className="rounded-xl bg-white/5 p-3">
          <div className="text-xs text-white/50">🍕 {t('피자 배달', 'Pizza delivery')}</div>
          <div className="font-semibold text-white">{save.jobs.includes('pizza') ? t('해금됨', 'Unlocked') : t('토니스 피자에서 면접', "Interview at Tony's")}</div>
        </div>
        <div className="col-span-2 rounded-xl bg-yellow-400/10 p-3">
          <div className="text-xs text-yellow-200/70">🪙 {t('워드 코인 (숨겨진 관용구)', 'Word Coins (hidden idioms)')}</div>
          <div className="font-semibold text-yellow-100">
            {save.collected.length} / {IDIOMS.length}
          </div>
        </div>
      </section>
    </div>
  );
}
