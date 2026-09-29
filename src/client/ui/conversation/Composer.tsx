// Message composer: text input, push-to-talk mic, hint button and "say it in English" (type in Korean,
// get the English line to say). A misheard message is fixed after sending, with "say it again" on the message itself.
import { Languages, Lightbulb, Loader2, Mic, Send, Volume2, X } from 'lucide-react';
import { type KeyboardEvent, type Ref, useImperativeHandle, useRef, useState } from 'react';
import { speakPhrase } from '../../audio/voice';
import { useSpeechInput } from '../../conversation/useSpeechInput';
import { useLang, useTr } from '../../i18n';
import { useGame } from '../../state/game';
import { toast } from '../../state/ui';

export interface ComposerHandle {
  /** Start listening right away (e.g. after taking back a misheard message). */
  listen(): void;
  /** Put text into the input for editing. */
  setText(text: string): void;
}

export function Composer({
  ref,
  ended,
  pending,
  hintLoading,
  onHint,
  onTranslate,
  onSend,
}: {
  ref?: Ref<ComposerHandle>;
  ended: boolean;
  pending: boolean;
  hintLoading: boolean;
  onHint: () => void;
  onTranslate: (text: string) => Promise<string | null>;
  onSend: (text: string, mode: 'voice' | 'text') => void;
}) {
  const t = useTr();
  const lang = useLang();
  const settings = useGame((s) => s.save!.settings);
  const [input, setInput] = useState('');
  const [translating, setTranslating] = useState(false);
  /** The English line to say, kept on screen while the mic is listening. */
  const [translated, setTranslated] = useState<{ source: string; en: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const speech = useSpeechInput((text) => {
    if (settings.autoSendVoice) {
      onSend(text, 'voice');
      setTranslated(null);
    } else {
      setInput(text);
      inputRef.current?.focus();
    }
  });

  useImperativeHandle(ref, () => ({
    listen: () => {
      if (speech.supported) void speech.start();
      else inputRef.current?.focus();
    },
    setText: (text) => {
      setInput(text);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
  }));

  const submit = () => {
    if (!input.trim()) return;
    onSend(input, 'text');
    setInput('');
    setTranslated(null);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const translate = async () => {
    const source = input.trim();
    if (!source) {
      toast(t('하고 싶은 말을 한글로 입력한 뒤 눌러 주세요', 'Type what you want to say first'), 'info');
      inputRef.current?.focus();
      return;
    }
    setTranslating(true);
    const en = await onTranslate(source);
    setTranslating(false);
    if (!en) return;
    setTranslated({ source, en });
    setInput(en);
    void speakPhrase(en);
  };

  return (
    <div className="border-t border-white/10 bg-black/50 backdrop-blur">
      {translated && (
        <div className="safe-x flex items-start gap-2 pt-2.5 animate-rise">
          <button className="mt-0.5 shrink-0 text-sky-300" aria-label="listen" onClick={() => void speakPhrase(translated.en)}>
            <Volume2 size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold leading-snug text-white">{translated.en}</div>
            <div className="text-xs text-white/50">
              {translated.source} · {speech.supported ? t('🎤 를 눌러 소리 내어 말해 보세요', 'Tap 🎤 and say it out loud') : t('보내기를 눌러 전달하세요', 'Tap send')}
            </div>
          </div>
          <button className="shrink-0 text-white/50 hover:text-white" aria-label="close" onClick={() => setTranslated(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="safe-x flex items-center gap-2 py-2.5 safe-bottom">
        <button className="icon-btn h-11 w-11 shrink-0 text-yellow-300" aria-label={t('힌트', 'Hint')} onClick={onHint} disabled={ended || hintLoading}>
          {hintLoading ? <Loader2 size={18} className="animate-spin" /> : <Lightbulb size={19} />}
        </button>
        <input
          ref={inputRef}
          value={speech.listening ? speech.partial : input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          disabled={ended || speech.listening}
          maxLength={300}
          placeholder={speech.listening ? t('듣고 있어요… 영어로 말하세요', 'Listening… speak English') : t('영어로 입력하거나 🎤 를 누르세요', 'Type in English or tap 🎤')}
          className={`min-w-0 flex-1 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-yellow-400/60 ${speech.listening ? 'italic text-sky-100' : ''}`}
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {lang === 'ko' && (
          <button
            className="icon-btn h-11 w-11 shrink-0 text-sky-200"
            aria-label="한글을 영어로"
            title="한글로 쓰면 영어 문장으로 바꿔 줘요"
            onClick={() => void translate()}
            disabled={ended || translating || speech.listening}
          >
            {translating ? <Loader2 size={18} className="animate-spin" /> : <Languages size={19} />}
          </button>
        )}
        {speech.supported && (
          <button
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition active:scale-90 ${speech.listening ? 'mic-live bg-red-500' : 'bg-sky-500 hover:bg-sky-400'}`}
            aria-label={speech.listening ? t('녹음 멈추기', 'Stop') : t('말하기', 'Speak')}
            disabled={ended || pending}
            onClick={() => (speech.listening ? speech.stop() : void speech.start())}
          >
            <Mic size={22} />
          </button>
        )}
        <button className="icon-btn h-11 w-11 shrink-0 bg-yellow-400 text-gray-950 hover:bg-yellow-300" aria-label={t('보내기', 'Send')} onClick={submit} disabled={ended || pending || !input.trim()}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
