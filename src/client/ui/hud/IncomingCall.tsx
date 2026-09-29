import { getNpc } from '@shared/content/npcs';
import { CONTACTS } from '@shared/content/story';
import type { Scenario } from '@shared/types';
import { Phone, PhoneOff } from 'lucide-react';
import { useEffect } from 'react';
import { sfx } from '../../audio/sfx';
import { useLang, useTr } from '../../i18n';
import { platform } from '../../platform';
import { Avatar } from '../Avatar';

const RING_SECONDS = 20;

/** Ringing phone banner. Unknown callers (scams) show no name — just like real life. */
export function IncomingCall({ scenario, onAccept, onDecline, onMissed }: { scenario: Scenario; onAccept: () => void; onDecline: () => void; onMissed: () => void }) {
  const t = useTr();
  const lang = useLang();
  const npc = getNpc(scenario.npcId!);
  const known = scenario.npcId === 'leo';
  const caller = known ? CONTACTS.leo.name[lang] : CONTACTS.unknown.name[lang];

  useEffect(() => {
    const ring = () => {
      sfx.play('message');
      platform().haptic('medium');
    };
    ring();
    const id = setInterval(ring, 1800);
    const miss = setTimeout(onMissed, RING_SECONDS * 1000);
    return () => {
      clearInterval(id);
      clearTimeout(miss);
    };
  }, [onMissed]);

  return (
    <div className="pointer-events-auto fixed inset-x-0 top-0 z-30 flex justify-center px-3 safe-top animate-rise">
      <div className="flex w-full max-w-md items-center gap-3 rounded-3xl bg-gray-900/95 p-3 shadow-2xl ring-1 ring-emerald-400/40 backdrop-blur">
        <div className="relative">
          <span className="call-ring absolute inset-0 rounded-full bg-emerald-400/40" />
          {known ? (
            <Avatar look={npc.look} size={48} className="relative" />
          ) : (
            <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gray-600 text-2xl">❔</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-emerald-300">📞 {t('전화가 왔어요', 'Incoming call')}</div>
          <div className="truncate font-bold text-white">{caller}</div>
        </div>
        <button className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white active:scale-90" aria-label={t('거절', 'Decline')} onClick={onDecline}>
          <PhoneOff size={20} />
        </button>
        <button className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-emerald-500 text-white active:scale-90" aria-label={t('받기', 'Answer')} onClick={onAccept}>
          <Phone size={20} />
        </button>
      </div>
    </div>
  );
}
