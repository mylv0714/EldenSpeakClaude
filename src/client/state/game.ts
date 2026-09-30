// Progress store (zustand). All persistent game state lives in `save`; actions are plain functions
// so both React components and the game engine can call them.
import type { DebriefReply } from '@shared/api';
import type { WeakPointId } from '@shared/content/weakPoints';
import { IDIOM_BY_ID } from '@shared/content/idioms';
import { SCENARIO_BY_ID } from '@shared/content/scenarios';
import { PARTNER_STAGE } from '@shared/content/romance';
import { type ContactId, STORY } from '@shared/content/story';
import { dayKey, levelFromXp, normalizeWords, type RankId, RANKS, type Reward, scheduleReview } from '@shared/rules';
import type { CarModelId, Level, Outcome, ScenarioEffect } from '@shared/types';
import { create } from 'zustand';
import { OUTFITS } from '../game/outfits';
import { type PhoneMessage, type PhraseCard, type SaveData, type Settings, writeSave } from './save';

interface GameStore {
  save: SaveData | null;
}

export const useGame = create<GameStore>(() => ({ save: null }));

export function getSave(): SaveData {
  const save = useGame.getState().save;
  if (!save) throw new Error('No game loaded');
  return save;
}

export function setSave(save: SaveData | null): void {
  useGame.setState({ save });
}

/** Copy-on-write update so React sees a new object. */
export function mutate(fn: (s: SaveData) => void): void {
  const current = useGame.getState().save;
  if (!current) return;
  const next = structuredClone(current);
  fn(next);
  useGame.setState({ save: next });
}

// ── Persistence: debounce writes, flush when the app goes to background. ──
let timer: ReturnType<typeof setTimeout> | undefined;
useGame.subscribe((state, prev) => {
  if (!state.save || state.save === prev.save) return;
  clearTimeout(timer);
  timer = setTimeout(() => void writeSave(state.save!), 800);
});
export function flushSave(): void {
  clearTimeout(timer);
  const save = useGame.getState().save;
  if (save) void writeSave(save);
}

// ── Actions ──────────────────────────────────────────────────────────────

const phraseKey = (en: string) => normalizeWords(en).join(' ');

function addPhraseTo(s: SaveData, en: string, native: string, source: string): boolean {
  const key = phraseKey(en);
  if (!key || s.phrasebook.some((p) => phraseKey(p.en) === key)) return false;
  const now = Date.now();
  s.phrasebook.unshift({ id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, en, native, source, box: 0, due: now, addedAt: now });
  return true;
}

export function addPhrase(en: string, native: string, source: string): boolean {
  let added = false;
  mutate((s) => {
    added = addPhraseTo(s, en, native, source);
  });
  return added;
}

export function hasPhrase(en: string): boolean {
  const key = phraseKey(en);
  return getSave().phrasebook.some((p) => phraseKey(p.en) === key);
}

export function removePhrase(id: string): void {
  mutate((s) => {
    s.phrasebook = s.phrasebook.filter((p) => p.id !== id);
  });
}

export function reviewPhrase(id: string, correct: boolean): void {
  mutate((s) => {
    const card = s.phrasebook.find((p) => p.id === id);
    if (!card) return;
    Object.assign(card, scheduleReview(card.box, correct, Date.now()) satisfies Pick<PhraseCard, 'box' | 'due'>);
  });
}

export function updateSettings(patch: Partial<Settings>): void {
  mutate((s) => {
    s.settings = { ...s.settings, ...patch };
  });
}

export function earn(amount: number): void {
  mutate((s) => {
    s.cash = Math.max(0, s.cash + Math.round(amount));
  });
}

export function markTutorial(key: string): void {
  if (getSave().tutorial[key]) return;
  mutate((s) => {
    s.tutorial[key] = true;
  });
}

export function saveWorld(x: number, y: number, time: number, playedSeconds: number): void {
  mutate((s) => {
    s.world = { x: Math.round(x), y: Math.round(y), time: Math.round(time) };
    s.stats.playSeconds += Math.round(playedSeconds);
  });
}

export function pushMessage(msg: Omit<PhoneMessage, 'id' | 'at' | 'read'>): void {
  mutate((s) => {
    s.messages.unshift({ ...msg, id: `m${Date.now().toString(36)}`, at: Date.now(), read: false });
    s.messages = s.messages.slice(0, 50);
  });
}

export function markMessagesRead(): void {
  if (!getSave().messages.some((m) => !m.read)) return;
  mutate((s) => {
    s.messages.forEach((m) => (m.read = true));
  });
}

export function collectIdiom(id: string): void {
  const idiom = IDIOM_BY_ID.get(id);
  if (!idiom || getSave().collected.includes(id)) return;
  mutate((s) => {
    s.collected.push(id);
    s.cash += 25;
    addPhraseTo(s, idiom.en, idiom.ko, 'idiom');
  });
}

/** The biggest Elden Motors discount the player holds (only one coupon applies per car). */
export function bestCoupon(coupons: Readonly<Record<string, number>>): { id: string; discount: number } | null {
  let best: { id: string; discount: number } | null = null;
  for (const [id, discount] of Object.entries(coupons)) if (!best || discount > best.discount) best = { id, discount };
  return best;
}

export function buyCar(model: CarModelId, price: number, couponId?: string): void {
  mutate((s) => {
    s.cash -= price;
    if (!s.cars.includes(model)) s.cars.push(model);
    if (couponId) delete s.coupons[couponId];
  });
}

export function buyOutfit(id: string, price: number): void {
  mutate((s) => {
    s.cash -= price;
    if (!s.outfits.includes(id)) s.outfits.push(id);
    s.outfit = id;
  });
}

export type RankGift = { type: 'outfit'; id: string } | { type: 'coupon'; id: string; discount: number } | { type: 'cash'; amount: number } | { type: 'vip' };

/** One-time gifts for reaching each rank. */
export const RANK_GIFTS: Partial<Record<RankId, RankGift[]>> = {
  newcomer: [{ type: 'outfit', id: 'smart' }],
  local: [{ type: 'coupon', id: 'rank10', discount: 0.1 }],
  insider: [{ type: 'outfit', id: 'tuxedo' }, { type: 'vip' }],
  citizen: [{ type: 'outfit', id: 'citizen' }],
  legend: [{ type: 'outfit', id: 'legend' }],
};

/**
 * Hands out the gifts of every rank reached but not yet rewarded (older saves catch up the first time).
 * Returns what was given, per rank, lowest first. An outfit the player already owns becomes its price in cash.
 */
export function claimRankGifts(): { rank: RankId; gifts: RankGift[] }[] {
  const level = levelFromXp(getSave().xp).level;
  const due = RANKS.filter((r) => r.min <= level && RANK_GIFTS[r.id] && !getSave().rankGifts.includes(r.id));
  if (due.length === 0) return [];
  const given: { rank: RankId; gifts: RankGift[] }[] = [];
  mutate((s) => {
    for (const r of due) {
      const gifts = RANK_GIFTS[r.id]!.map((g): RankGift => {
        if (g.type === 'outfit' && s.outfits.includes(g.id)) return { type: 'cash', amount: OUTFITS.find((o) => o.id === g.id)?.price ?? 0 };
        return g;
      });
      for (const g of gifts) {
        if (g.type === 'outfit') s.outfits.push(g.id);
        if (g.type === 'coupon') s.coupons[g.id] = Math.max(s.coupons[g.id] ?? 0, g.discount);
        if (g.type === 'cash') s.cash += g.amount;
      }
      s.rankGifts.push(r.id);
      given.push({ rank: r.id, gifts });
    }
  });
  return given;
}

/** The learner's English level (A1–C1), e.g. after the promotion test. */
export function setEnglishLevel(level: Level): void {
  mutate((s) => {
    s.level = level;
  });
}

export function setFollowing(following: boolean): void {
  mutate((s) => {
    s.romance.following = following;
  });
}

export function wearOutfit(id: string): void {
  mutate((s) => {
    s.outfit = id;
  });
}

/** Starts the current story chapter: delivers its phone message and applies start effects. Returns the scenario id. */
export function startStoryStep(): string | null {
  const step = STORY[getSave().storyStep];
  if (!step) return null;
  mutate((s) => {
    if (step.onStart?.type === 'loseCar') s.cars = s.cars.filter((c) => c !== step.onStart!.model);
    if (step.message) {
      s.messages.unshift({ ...step.message, id: `story${s.storyStep}`, at: Date.now(), read: false });
    }
  });
  return step.scenarioId;
}

export interface ConversationRecord {
  scenarioId: string;
  npcId: string;
  outcome: Outcome;
  stars: number;
  avgScore: number;
  turns: number;
  reward: Reward;
}

export interface ConversationApplied {
  historyId: string;
  levelUp: number | null;
  storyAdvanced: boolean;
  effects: ScenarioEffect[];
}

/** Phase 1, applied the moment a conversation ends: money, XP, story progress, unlocks. */
export function applyConversation(r: ConversationRecord): ConversationApplied {
  const scenario = SCENARIO_BY_ID.get(r.scenarioId);
  const before = levelFromXp(getSave().xp).level;
  let storyAdvanced = false;
  const effects: ScenarioEffect[] = r.outcome === 'success' ? [...(scenario?.effects ?? [])] : [];
  const historyId = `h${Date.now().toString(36)}`;

  mutate((s) => {
    s.cash += r.reward.cash;
    s.xp += r.reward.xp;
    if (r.outcome !== 'abandoned') {
      s.stats.conversations++;
      s.stats.turns += r.turns;
    }
    if (r.outcome === 'success') s.stats.successes++;

    s.bestStars[r.scenarioId] = Math.max(s.bestStars[r.scenarioId] ?? 0, r.stars);
    s.history.unshift({
      id: historyId,
      scenarioId: r.scenarioId,
      npcId: r.npcId,
      at: Date.now(),
      outcome: r.outcome,
      stars: r.stars,
      score: r.avgScore,
      turns: r.turns,
    });
    s.history = s.history.slice(0, 100);

    if (r.outcome === 'success') {
      if (scenario?.once && !s.completedOnce.includes(scenario.id)) s.completedOnce.push(scenario.id);
      if (scenario?.kind === 'story' && STORY[s.storyStep]?.scenarioId === scenario.id) {
        s.storyStep++;
        storyAdvanced = true;
      }
      for (const e of effects) {
        if (e.type === 'giveCar' && !s.cars.includes(e.model)) s.cars.push(e.model);
        if (e.type === 'coupon') s.coupons[e.id] = e.discount;
        if (e.type === 'unlockJob' && !s.jobs.includes(e.job)) s.jobs.push(e.job);
        if (e.type === 'romance') {
          s.romance.stage = Math.max(s.romance.stage, e.stage);
          if (e.stage >= PARTNER_STAGE) s.romance.following = true;
        }
        if (e.type === 'message') {
          s.messages.unshift({ id: `m${Date.now().toString(36)}`, from: e.from as ContactId, en: e.en, ko: e.ko, at: Date.now(), read: false });
        }
      }
    }

    if (scenario?.kind === 'romance') {
      const delta = r.outcome === 'success' ? (scenario.id === 'romance_chat' ? 3 : 10) : r.outcome === 'failure' ? -5 : 0;
      s.romance.affection = Math.max(0, Math.min(100, s.romance.affection + delta));
    }

    if (r.outcome !== 'abandoned') {
      const today = dayKey(Date.now());
      if (s.streak.lastDay !== today) {
        const yesterday = dayKey(Date.now() - 86_400_000);
        s.streak = { days: s.streak.lastDay === yesterday ? s.streak.days + 1 : 1, lastDay: today };
      }
    }
  });

  const after = levelFromXp(getSave().xp).level;
  return { historyId, levelUp: after > before ? after : null, storyAdvanced, effects };
}

/** Phase 2, when the AI review arrives: skill averages, level estimate and what the NPC remembers. */
export function applyDebrief(historyId: string, npcId: string, d: DebriefReply): void {
  mutate((s) => {
    const ema = (prev: number, next: number) => (prev ? Math.round(prev * 0.7 + next * 0.3) : next);
    s.stats.grammar = ema(s.stats.grammar, d.grammar);
    s.stats.vocabulary = ema(s.stats.vocabulary, d.vocabulary);
    s.stats.fluency = ema(s.stats.fluency, d.fluency);
    s.stats.levelEstimate = d.level;
    if (d.memory) s.npcMemory[npcId] = [...(s.npcMemory[npcId] ?? []), d.memory].slice(-3);
    const h = s.history.find((x) => x.id === historyId);
    if (h) h.level = d.level;
    // Weak points: flagged ones grow, the others slowly fade so fixed problems drop off the list.
    const now = Date.now();
    for (const [id, w] of Object.entries(s.weakPoints)) {
      if (d.weakPoints.includes(id as WeakPointId)) continue;
      w.count = Math.round((w.count - 0.25) * 100) / 100;
      if (w.count <= 0) delete s.weakPoints[id];
    }
    for (const id of d.weakPoints) {
      const w = s.weakPoints[id] ?? { count: 0, lastAt: now };
      s.weakPoints[id] = { count: w.count + 1, lastAt: now };
    }
  });
}

/** The learner's current weak points, strongest first. */
export function topWeakPoints(save: SaveData, max = 2): WeakPointId[] {
  return Object.entries(save.weakPoints)
    .filter(([, w]) => w.count >= 1)
    .sort((a, b) => b[1].count - a[1].count || b[1].lastAt - a[1].lastAt)
    .slice(0, max)
    .map(([id]) => id as WeakPointId);
}

/** Focus sent with every turn (empty when the learner turned focus practice off). */
export function focusIds(): WeakPointId[] {
  const save = getSave();
  return save.settings.focusPractice ? topWeakPoints(save) : [];
}

export function recordPronunciation(score: number): void {
  mutate((s) => {
    const prev = s.stats.pronunciation;
    s.stats.pronunciation = prev ? Math.round(prev * 0.8 + score * 0.2) : Math.round(score);
  });
}

/** Overheard-conversation quiz answered: remember it and pay out for a right answer. */
export function finishOverheard(id: string, correct: boolean): void {
  mutate((s) => {
    if (!s.overheard.includes(id)) s.overheard.push(id);
    if (correct) {
      s.cash += 25;
      s.xp += 20;
    }
  });
}

export function payFine(amount: number): number {
  const paid = Math.min(getSave().cash, amount);
  mutate((s) => {
    s.cash -= paid;
  });
  return paid;
}
