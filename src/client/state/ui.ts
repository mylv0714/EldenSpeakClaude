import type { NativeLang } from '@shared/types';
import { create } from 'zustand';
import type { ConversationLaunch, ConversationSummary } from '../conversation/types';

export type Screen = 'boot' | 'title' | 'onboarding' | 'game';
export type PhoneApp = 'home' | 'map' | 'missions' | 'messages' | 'calls' | 'phrasebook' | 'stats' | 'garage' | 'settings' | 'miseon';

export type Overlay =
  | { kind: 'none' }
  | { kind: 'place'; placeId: string }
  | { kind: 'briefing'; launch: ConversationLaunch }
  | { kind: 'conversation'; launch: ConversationLaunch }
  | { kind: 'results'; summary: ConversationSummary }
  | { kind: 'phone'; app: PhoneApp }
  | { kind: 'pause' }
  | { kind: 'shop'; shop: 'cars' | 'outfits' }
  | { kind: 'idiom'; idiomId: string }
  | { kind: 'ending' }
  | { kind: 'night' }
  /** Listening question after overhearing a street conversation. */
  | { kind: 'overheard'; id: string };

export interface Hud {
  speed: number;
  inVehicle: boolean;
  vehicleName: string;
  vehicleHealth: number;
  clock: number;
  wanted: number;
  prompt: { key: string; text: string } | null;
  gps: { text: string; icon: 'left' | 'right' | 'straight' | 'arrive'; distance: number } | null;
  job: { title: string; detail: string; timeLeft: number | null } | null;
  district: string;
  /** Miseon walking with the player; 'wants' when she has something to say. */
  companion: 'none' | 'here' | 'wants';
  /** Taxi passenger giving directions by voice (no GPS): their latest line. */
  guide: { npcId: string; text: string; id: number } | null;
  /** 👂 Overheard conversation playing nearby. */
  overhearing: boolean;
}

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'bad' | 'cash';
}

export interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  tone: 'pass' | 'fail' | 'info';
}

interface UiStore {
  screen: Screen;
  overlay: Overlay;
  bootLang: NativeLang;
  hud: Hud;
  toasts: Toast[];
  banner: Banner | null;
}

const detectLang = (): NativeLang => (navigator.language?.toLowerCase().startsWith('ko') ? 'ko' : 'en');

export const useUi = create<UiStore>(() => ({
  screen: 'boot',
  overlay: { kind: 'none' },
  bootLang: detectLang(),
  hud: {
    speed: 0,
    inVehicle: false,
    vehicleName: '',
    vehicleHealth: 100,
    clock: 540,
    wanted: 0,
    prompt: null,
    gps: null,
    job: null,
    district: '',
    companion: 'none',
    guide: null,
    overhearing: false,
  },
  toasts: [],
  banner: null,
}));

export const setScreen = (screen: Screen) => useUi.setState({ screen });
export const openOverlay = (overlay: Overlay) => useUi.setState({ overlay });
export const closeOverlay = () => useUi.setState({ overlay: { kind: 'none' } });
export const setHud = (patch: Partial<Hud>) => useUi.setState((s) => ({ hud: { ...s.hud, ...patch } }));

let nextId = 1;
export function toast(text: string, tone: Toast['tone'] = 'info'): void {
  const id = nextId++;
  useUi.setState((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }));
  setTimeout(() => useUi.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
}

export function showBanner(title: string, tone: Banner['tone'], subtitle?: string): void {
  const id = nextId++;
  useUi.setState({ banner: { id, title, subtitle, tone } });
  setTimeout(() => useUi.setState((s) => (s.banner?.id === id ? { banner: null } : s)), 3400);
}
