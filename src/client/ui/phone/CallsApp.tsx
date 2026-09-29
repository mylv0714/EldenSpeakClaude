import { PLACE_BY_ID } from '@shared/content/city';
import { OUTGOING_CALLS } from '@shared/content/calls';
import { getNpc } from '@shared/content/npcs';
import { WEAK_POINT_BY_ID } from '@shared/content/weakPoints';
import { Phone } from 'lucide-react';
import { sfx } from '../../audio/sfx';
import { useLang, useTr } from '../../i18n';
import { topWeakPoints, useGame } from '../../state/game';
import { Avatar } from '../Avatar';
import { Difficulty, Stars } from '../common';
import type { PhoneActions } from './Phone';

export function CallsApp({ actions }: { actions: PhoneActions }) {
  const t = useTr();
  const lang = useLang();
  const save = useGame((s) => s.save!);
  const weak = topWeakPoints(save);
  const coach = getNpc('clara');
  const call = (scenarioId: string) => {
    sfx.play('click');
    actions.startCall(scenarioId);
  };

  return (
    <div className="space-y-4 p-4">
      <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs leading-relaxed text-emerald-100">
        {t('📞 전화는 얼굴이 안 보여서 듣기가 훨씬 어려워요. 자막은 기본으로 꺼져 있어요 — 잘 안 들리면 되물어 보세요!', '📞 Calls are harder: no face to read, and subtitles start hidden. Ask them to repeat when you miss something!')}
      </p>

      <button className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-teal-500/25 to-sky-500/15 p-3 text-left ring-1 ring-teal-400/40 active:scale-[0.98]" onClick={() => call('call_coach')}>
        <Avatar look={coach.look} size={48} />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-white">{t('클라라 코치 · 약점 코칭', 'Coach Clara · weak-point coaching')}</div>
          <div className="truncate text-xs text-teal-100/80">
            {weak.length > 0 ? weak.map((id) => WEAK_POINT_BY_ID.get(id)!.label[lang]).join(' · ') : t('아직 약점 기록이 없어요 — 완전한 문장 연습', 'No weak points yet — full-sentence practice')}
          </div>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Phone size={18} />
        </span>
      </button>

      <ul className="space-y-2">
        {OUTGOING_CALLS.map((s) => {
          const place = s.placeId ? PLACE_BY_ID.get(s.placeId) : undefined;
          const npc = getNpc(s.npcId!);
          return (
            <li key={s.id}>
              <button className="flex w-full items-center gap-3 rounded-2xl bg-white/5 p-3 text-left hover:bg-white/10 active:scale-[0.98]" onClick={() => call(s.id)}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl">{place?.icon ?? '📞'}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-white">{s.title[lang]}</div>
                  <div className="truncate text-xs text-white/50">
                    {place ? (lang === 'ko' ? place.nameKo : place.name) : ''} · {npc.name}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Difficulty level={s.difficulty} />
                    <Stars value={save.bestStars[s.id] ?? 0} size={11} />
                  </div>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Phone size={18} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
