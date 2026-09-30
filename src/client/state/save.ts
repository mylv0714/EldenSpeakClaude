// Persistent save format. Versioned so app updates (web or Play Store) can migrate old saves.
import type { ContactId } from '@shared/content/story';
import type { CarModelId, HairStyle, JobKind, Level, NativeLang, Outcome } from '@shared/types';
import { platform } from '../platform';

export const SAVE_KEY = 'eldenspeak.save';
export const SAVE_VERSION = 1;

export interface Look {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
}

export interface PhraseCard {
  id: string;
  en: string;
  native: string;
  /** Scenario id, or "idiom" / "correction". */
  source: string;
  box: number;
  due: number;
  addedAt: number;
}

export interface HistoryEntry {
  id: string;
  scenarioId: string;
  npcId: string;
  at: number;
  outcome: Outcome;
  stars: number;
  score: number;
  turns: number;
  level?: Level;
}

export interface PhoneMessage {
  id: string;
  from: ContactId;
  en: string;
  ko: string;
  at: number;
  read: boolean;
}

export interface Settings {
  uiLang: NativeLang;
  /** NPC speech rate multiplier. */
  voiceRate: number;
  /** 'always' shows NPC lines as text; 'listen' hides them until tapped (listening practice). */
  subtitles: 'always' | 'listen';
  showTranslation: boolean;
  autoSendVoice: boolean;
  /** 'hold': record only while the mic button is held (pauses never cut you off); 'tap': tap to start, stops on silence. */
  micMode: 'hold' | 'tap';
  /** First-person scene for conversations; false = classic chat layout. */
  sceneView: boolean;
  /** Use the server's neural voices when available. */
  neuralVoice: boolean;
  /** Hear what pedestrians say out loud. */
  ambientVoices: boolean;
  /** Characters create chances to practice your recurring weak points. */
  focusPractice: boolean;
  gpsVoice: boolean;
  sfxVolume: number;
  voiceVolume: number;
  graphics: 'high' | 'low';
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  createdAt: number;
  name: string;
  level: Level;
  look: Look;
  outfit: string;
  outfits: string[];
  cash: number;
  xp: number;
  stats: {
    conversations: number;
    successes: number;
    turns: number;
    playSeconds: number;
    grammar: number;
    vocabulary: number;
    fluency: number;
    /** Shadowing (repeat-after-me) average, 0 until the first try. */
    pronunciation: number;
    levelEstimate?: Level;
  };
  streak: { days: number; lastDay: string };
  storyStep: number;
  bestStars: Record<string, number>;
  completedOnce: string[];
  jobs: JobKind[];
  cars: CarModelId[];
  coupons: Record<string, number>;
  collected: string[];
  messages: PhoneMessage[];
  phrasebook: PhraseCard[];
  history: HistoryEntry[];
  npcMemory: Record<string, string[]>;
  /** Weak-point id → how often the AI teacher noticed it (decays as conversations go well). */
  weakPoints: Record<string, { count: number; lastAt: number }>;
  /** Overheard street conversations already heard. */
  overheard: string[];
  /** Miseon storyline: stage 0-3 (3 = partners), affection 0-100, and whether she walks with you. */
  romance: { stage: number; affection: number; following: boolean };
  world: { x: number; y: number; time: number } | null;
  tutorial: Record<string, boolean>;
  settings: Settings;
}

export function defaultSettings(uiLang: NativeLang): Settings {
  return {
    uiLang,
    voiceRate: 1,
    subtitles: 'always',
    showTranslation: false,
    autoSendVoice: true,
    micMode: 'hold',
    sceneView: true,
    neuralVoice: true,
    ambientVoices: true,
    focusPractice: true,
    gpsVoice: true,
    sfxVolume: 0.7,
    voiceVolume: 1,
    graphics: 'high',
  };
}

export function newSave(p: { name: string; level: Level; look: Look; outfit: string; uiLang: NativeLang }): SaveData {
  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    name: p.name,
    level: p.level,
    look: p.look,
    outfit: p.outfit,
    outfits: [p.outfit],
    cash: 300,
    xp: 0,
    stats: { conversations: 0, successes: 0, turns: 0, playSeconds: 0, grammar: 0, vocabulary: 0, fluency: 0, pronunciation: 0 },
    streak: { days: 0, lastDay: '' },
    storyStep: 0,
    bestStars: {},
    completedOnce: [],
    jobs: [],
    cars: [],
    coupons: {},
    collected: [],
    messages: [],
    phrasebook: [],
    history: [],
    npcMemory: {},
    weakPoints: {},
    overheard: [],
    romance: { stage: 0, affection: 0, following: false },
    world: null,
    tutorial: {},
    settings: defaultSettings(p.uiLang),
  };
}

/** Accepts any stored JSON and returns a valid save (missing fields filled from defaults), or null. */
export function migrate(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<SaveData>;
  if (typeof r.name !== 'string' || !r.level || !r.look) return null;
  const base = newSave({ name: r.name, level: r.level, look: r.look, outfit: r.outfit ?? 'street', uiLang: r.settings?.uiLang ?? 'ko' });
  return {
    ...base,
    ...r,
    version: SAVE_VERSION,
    stats: { ...base.stats, ...r.stats },
    streak: { ...base.streak, ...r.streak },
    romance: { ...base.romance, ...r.romance },
    settings: { ...base.settings, ...r.settings },
  };
}

export async function loadSave(): Promise<SaveData | null> {
  const text = await platform().storage.get(SAVE_KEY);
  if (!text) return null;
  try {
    return migrate(JSON.parse(text));
  } catch {
    return null;
  }
}

export async function writeSave(save: SaveData): Promise<void> {
  await platform().storage.set(SAVE_KEY, JSON.stringify(save));
}

export async function deleteSave(): Promise<void> {
  await platform().storage.remove(SAVE_KEY);
}
