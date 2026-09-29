// UI text lives next to where it's used as (ko, en) pairs; content text uses Localized objects.
import type { Localized, NativeLang } from '@shared/types';
import { useCallback } from 'react';
import { useGame } from './state/game';
import { useUi } from './state/ui';

export function useLang(): NativeLang {
  const saved = useGame((s) => s.save?.settings.uiLang);
  const boot = useUi((s) => s.bootLang);
  return saved ?? boot;
}

export function currentLang(): NativeLang {
  return useGame.getState().save?.settings.uiLang ?? useUi.getState().bootLang;
}

export type Tr = (ko: string, en: string) => string;

export function useTr(): Tr {
  const lang = useLang();
  return useCallback((ko: string, en: string) => (lang === 'ko' ? ko : en), [lang]);
}

export const tr: Tr = (ko, en) => (currentLang() === 'ko' ? ko : en);

export const loc = (text: Localized, lang: NativeLang): string => text[lang];
