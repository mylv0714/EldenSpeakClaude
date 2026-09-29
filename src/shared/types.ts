// Domain types shared by the client (game + UI) and the server (AI prompts).
// Keep this file free of DOM and Node APIs so it runs everywhere, including the Android WebView.
import type { DISTRICT_NAMES } from './content/city';

export type DistrictName = (typeof DISTRICT_NAMES)[number];

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export type Level = (typeof LEVELS)[number];

export const NATIVE_LANGS = ['ko', 'en'] as const;
export type NativeLang = (typeof NATIVE_LANGS)[number];

export type Localized = { en: string; ko: string };

export const EMOTIONS = [
  'neutral',
  'happy',
  'excited',
  'amused',
  'confused',
  'surprised',
  'worried',
  'annoyed',
  'angry',
  'sad',
] as const;
export type Emotion = (typeof EMOTIONS)[number];

export type Accent = 'us' | 'uk' | 'au' | 'in';
export type HairStyle =
  | 'short'
  | 'buzz'
  | 'side'
  | 'long'
  | 'bob'
  | 'bun'
  | 'ponytail'
  | 'curly'
  | 'afro'
  | 'bald'
  | 'mohawk';
export type Accessory =
  | 'glasses'
  | 'sunglasses'
  | 'cap'
  | 'police_cap'
  | 'chef_hat'
  | 'headset'
  | 'beanie'
  | 'earrings';

export interface NpcLook {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  shirt: string;
  accessory?: Accessory;
  facialHair?: 'beard' | 'mustache' | 'stubble';
}

export interface Npc {
  id: string;
  name: string;
  /** Job/role in English, used in prompts and shown in UI. */
  role: string;
  roleKo: string;
  gender: 'female' | 'male';
  age: number;
  accent: Accent;
  /** English description of personality and speech quirks for the AI actor. */
  personality: string;
  look: NpcLook;
  /** TTS tuning, around 1.0. */
  voice?: { pitch?: number; rate?: number };
}

export type ScenarioKind = 'story' | 'place' | 'street' | 'job' | 'romance' | 'call';

/** Scenarios whose details are generated at runtime by the game (route, destination, offense...). */
export type ContextKind = 'directions' | 'taxi' | 'pizza' | 'police' | 'accident' | 'interview' | 'date' | 'smalltalk';

export interface Objective {
  id: string;
  label: Localized;
  /** English success criterion the AI uses to judge completion. */
  check: string;
  bonus?: boolean;
}

export interface KeyPhrase {
  en: string;
  ko: string;
}

export type CarModelId = 'compact' | 'sedan' | 'suv' | 'sports' | 'van' | 'taxi' | 'police' | 'pickup' | 'bus' | 'comet' | 'comet_gt';

export type ScenarioEffect =
  | { type: 'giveCar'; model: CarModelId }
  | { type: 'coupon'; id: string; discount: number }
  | { type: 'unlockJob'; job: JobKind }
  /** Relationship with Miseon reaches this stage (1 met, 2 dated, 3 partners). */
  | { type: 'romance'; stage: number }
  /** A text message arrives on the phone. `from` is a contact id. */
  | { type: 'message'; from: string; en: string; ko: string };

export type JobKind = 'taxi' | 'pizza';

export interface Scenario {
  id: string;
  kind: ScenarioKind;
  placeId?: string;
  /** Fixed character, or a pool the client picks from at random (street events, jobs). */
  npcId?: string;
  npcPool?: string[];
  context?: ContextKind;
  title: Localized;
  brief: Localized;
  /** Prompt-only fields (English). */
  playerRole: string;
  setting: string;
  npcBrief: string;
  /** First NPC line. Supports {player} {place} {order} tokens filled from context. */
  opening: Localized;
  /** Optional alternative openings; one is picked at random (repeatable chats). */
  openingPool?: Localized[];
  objectives: Objective[];
  phrases: KeyPhrase[];
  maxTurns: number;
  /** 1 = gentle, 2 = normal, 3 = demanding. Shown as a difficulty hint. */
  difficulty: 1 | 2 | 3;
  reward: { cash: number; xp: number };
  effects?: ScenarioEffect[];
  /** Only offered once (e.g. job sign-up). */
  once?: boolean;
  /** Open-ended chat: no goals; the learner ends it whenever they like (still graded turn by turn). */
  freeTalk?: boolean;
  /** Phone calls ('call' kind): true when the character calls the learner instead of the other way round. */
  incoming?: boolean;
}

export type Offense = 'speeding' | 'hit_pedestrian' | 'hit_police' | 'hit_and_run' | 'reckless';

export type Heading = 'north' | 'south' | 'east' | 'west';

export interface RouteStep {
  action: 'start' | 'left' | 'right' | 'straight' | 'arrive';
  street: string;
  heading?: Heading;
  blocks?: number;
  side?: 'left' | 'right';
}

/** Runtime facts for context scenarios. Every field is validated server-side before reaching a prompt. */
export interface ScenarioContext {
  destinationId?: string;
  route?: RouteStep[];
  minutesLate?: number;
  order?: string[];
  offense?: Offense;
  stars?: number;
  impact?: 'rear' | 'front' | 'side';
  topicId?: number;
  /** Estimated taxi fare in dollars. */
  fare?: number;
  /** Date walks and street small talk: where the scene is (one of DISTRICT_NAMES) and the in-game hour. */
  district?: DistrictName;
  hour?: number;
}

export type Outcome = 'success' | 'failure' | 'abandoned';
