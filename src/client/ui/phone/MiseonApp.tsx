import { getNpc } from '@shared/content/npcs';
import { nextRomancePlace, PARTNER_STAGE } from '@shared/content/romance';
import { PLACE_BY_ID } from '@shared/content/city';
import { useLang, useTr } from '../../i18n';
import { setFollowing, useGame } from '../../state/game';
import { toast } from '../../state/ui';
import { Avatar } from '../Avatar';
import { Bar } from '../common';
import type { PhoneActions } from './Phone';

const STAGE: [string, string][] = [
  ['아직 모르는 사이', 'Strangers'],
  ['연락하는 사이', 'Texting'],
  ['데이트 중', 'Dating'],
  ['연인 💕', 'Partners 💕'],
];

export function MiseonApp({ actions }: { actions: PhoneActions }) {
  const t = useTr();
  const lang = useLang();
  const save = useGame((s) => s.save!);
  const { stage, affection, following } = save.romance;
  const miseon = getNpc('miseon');
  const next = nextRomancePlace(stage, save.storyStep);
  const nextPlace = next ? PLACE_BY_ID.get(next) : undefined;
  const memories = save.npcMemory.miseon ?? [];

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col items-center rounded-3xl bg-gradient-to-b from-pink-500/25 to-transparent p-5 text-center">
        <Avatar look={miseon.look} emotion={affection > 60 ? 'happy' : 'neutral'} size={96} />
        <div className="mt-2 text-lg font-bold text-white">{miseon.name}</div>
        <div className="chip mt-1 bg-pink-500/25 text-pink-100">{t(...STAGE[Math.min(stage, 3)])}</div>
        <div className="mt-3 w-full">
          <div className="mb-1 flex justify-between text-xs text-white/60">
            <span>{t('호감도', 'Affection')}</span>
            <span>{affection}/100</span>
          </div>
          <Bar value={affection} color="bg-pink-400" />
        </div>
      </div>

      {stage >= PARTNER_STAGE ? (
        <div className="space-y-2">
          <button
            className={following ? 'btn-ghost w-full py-3' : 'btn-primary w-full py-3'}
            onClick={() => {
              setFollowing(!following);
              actions.setCompanion(!following);
              toast(following ? t('미선이 집에 갔어요. 보고 싶으면 다시 불러요!', 'Miseon went home. Call her anytime!') : t('미선이 곁으로 왔어요 💕', 'Miseon is by your side 💕'), 'info');
            }}
          >
            {following ? t('🏠 집에 데려다주기', '🏠 Walk her home') : t('💕 같이 다니기', '💕 Hang out together')}
          </button>
          {following && (
            <button className="btn w-full bg-pink-500 py-3 text-white hover:bg-pink-400" onClick={() => actions.talkToCompanion()}>
              💬 {t('지금 대화하기', 'Talk now')}
            </button>
          )}
          <p className="text-center text-xs text-white/50">{t('데이트 장소: 🍸 문라이트 라운지 · 🏨 그랜드 엘든 호텔', 'Date spots: 🍸 Moonlight Lounge · 🏨 Grand Elden Hotel')}</p>
        </div>
      ) : nextPlace ? (
        <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/80">
          {t('다음 만남', 'Next meeting')}: <b className="text-pink-200">💕 {lang === 'ko' ? nextPlace.nameKo : nextPlace.name}</b>
          <button className="btn-ghost mt-3 w-full" onClick={() => actions.setWaypoint(nextPlace.id)}>
            {t('경로 안내', 'Set route')}
          </button>
        </div>
      ) : (
        <p className="rounded-2xl bg-white/5 p-4 text-sm text-white/60">{t('먼저 사촌 레오를 만나 보세요.', 'Meet your cousin Leo first.')}</p>
      )}

      {memories.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">{t('미선이 기억하는 것', 'What Miseon remembers')}</h3>
          <ul className="space-y-1.5">
            {memories.map((m) => (
              <li key={m} className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/75">
                “{m}”
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
