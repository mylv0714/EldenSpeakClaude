import { CONTACTS } from '@shared/content/story';
import { Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { speakPhrase } from '../../audio/voice';
import { useLang, useTr } from '../../i18n';
import { markMessagesRead, useGame } from '../../state/game';

export function MessagesApp() {
  const t = useTr();
  const lang = useLang();
  const messages = useGame((s) => s.save!.messages);
  const [shown, setShown] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const id = setTimeout(markMessagesRead, 600);
    return () => clearTimeout(id);
  }, []);

  if (messages.length === 0) return <p className="p-8 text-center text-sm text-white/50">{t('아직 메시지가 없어요.', 'No messages yet.')}</p>;

  return (
    <ul className="space-y-3 p-4">
      {messages.map((m) => {
        const c = CONTACTS[m.from];
        return (
          <li key={m.id} className="rounded-2xl bg-white/5 p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: c.color }}>
                {c.name.en[0]}
              </span>
              <span className="flex-1 text-sm font-semibold text-white">{c.name[lang]}</span>
              {!m.read && <span className="h-2 w-2 rounded-full bg-sky-400" />}
              <span className="text-[11px] text-white/40">{new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p className="rounded-2xl rounded-tl-md bg-green-600/25 px-3 py-2 text-[15px] leading-relaxed text-white">{m.en}</p>
            <div className="mt-1.5 flex gap-2 text-xs">
              <button className="inline-flex items-center gap-1 text-sky-300" onClick={() => void speakPhrase(m.en)}>
                <Volume2 size={13} /> {t('듣기', 'Listen')}
              </button>
              {lang === 'ko' && (
                <button className="text-white/50" onClick={() => setShown((s) => new Set(s).add(m.id))}>
                  {t('번역 보기', 'Translate')}
                </button>
              )}
            </div>
            {shown.has(m.id) && <p className="mt-1 text-sm text-white/60">{m.ko}</p>}
          </li>
        );
      })}
    </ul>
  );
}
