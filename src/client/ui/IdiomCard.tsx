import { IDIOM_BY_ID, IDIOMS } from '@shared/content/idioms';
import { Volume2 } from 'lucide-react';
import { useEffect } from 'react';
import { speakPhrase } from '../audio/voice';
import { useTr } from '../i18n';
import { useGame } from '../state/game';
import { Modal } from './common';

export function IdiomCard({ idiomId, onClose }: { idiomId: string; onClose: () => void }) {
  const t = useTr();
  const idiom = IDIOM_BY_ID.get(idiomId)!;
  const count = useGame((s) => s.save!.collected.length);

  useEffect(() => {
    const id = setTimeout(() => void speakPhrase(idiom.en), 350);
    return () => clearTimeout(id);
  }, [idiom.en]);

  return (
    <Modal onBackdrop={onClose}>
      <div className="bg-gradient-to-b from-yellow-400/25 to-transparent p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-yellow-600 bg-yellow-400 text-xl font-black text-yellow-900 shadow-lg shadow-yellow-400/40 animate-float">Aa</div>
        <div className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">
          Word Coin {count}/{IDIOMS.length}
        </div>
        <button className="mt-2 inline-flex items-center gap-2" onClick={() => void speakPhrase(idiom.en)}>
          <span className="display text-4xl uppercase text-white">{idiom.en}</span>
          <Volume2 className="text-sky-300" />
        </button>
        <p className="mt-2 text-lg text-white/85">{idiom.ko}</p>
        <button className="mt-4 w-full rounded-xl bg-white/5 p-3 text-left text-sm text-white/80 hover:bg-white/10" onClick={() => void speakPhrase(idiom.example)}>
          <span className="mb-1 block text-[11px] font-bold uppercase text-white/40">{t('예문', 'Example')}</span>“{idiom.example}”
        </button>
        <p className="mt-3 text-sm font-bold text-emerald-300">+$25 · {t('표현집에 추가됐어요', 'Added to your phrasebook')}</p>
      </div>
      <div className="border-t border-white/10 p-4">
        <button className="btn-primary w-full" onClick={onClose} autoFocus>
          {t('좋아요!', 'Nice!')}
        </button>
      </div>
    </Modal>
  );
}
