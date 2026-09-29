// Pure game rules: scoring, rewards, levels and spaced repetition.
// Shared so the same numbers can be unit-tested and reused by any future backend.
import type { Localized, Outcome, Scenario } from './types';

export const MOOD_START = 70;
export const MOOD_TIP_THRESHOLD = 85;

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function averageScore(scores: readonly number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function requiredObjectivesDone(scenario: Scenario, completed: ReadonlySet<string>): boolean {
  return scenario.objectives.every((o) => o.bonus || completed.has(o.id));
}

export function bonusDoneCount(scenario: Scenario, completed: ReadonlySet<string>): number {
  return scenario.objectives.filter((o) => o.bonus && completed.has(o.id)).length;
}

export function computeStars(outcome: Outcome, avgScore: number, bonusDone: number): 0 | 1 | 2 | 3 {
  if (outcome !== 'success') return 0;
  if (avgScore >= 85 && bonusDone > 0) return 3;
  if (avgScore >= 70) return 2;
  return 1;
}

export interface RewardInput {
  outcome: Outcome;
  avgScore: number;
  bonusDone: number;
  hintsUsed: number;
  mood: number;
}

export function computeReward(scenario: Scenario, r: RewardInput): { cash: number; xp: number } {
  const { cash: baseCash, xp: baseXp } = scenario.reward;
  if (r.outcome === 'abandoned') return { cash: 0, xp: 0 };
  if (r.outcome === 'failure') return { cash: 0, xp: Math.round(baseXp * 0.3) };
  const quality = r.avgScore / 100;
  const hintFactor = Math.max(0.5, 1 - 0.1 * r.hintsUsed);
  const tip = r.mood >= MOOD_TIP_THRESHOLD ? Math.round(baseCash * 0.15) : 0;
  const cash = Math.round(baseCash * (0.6 + 0.4 * quality) * hintFactor) + r.bonusDone * Math.round(baseCash * 0.25) + tip;
  const xp = Math.round(baseXp * (0.7 + 0.3 * quality)) + r.bonusDone * 20;
  return { cash, xp };
}

/** XP needed to go from `level` to `level + 1`. */
export const xpForNextLevel = (level: number): number => 100 + (level - 1) * 60;

export function levelFromXp(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let rest = Math.max(0, xp);
  while (rest >= xpForNextLevel(level)) {
    rest -= xpForNextLevel(level);
    level++;
  }
  return { level, into: rest, needed: xpForNextLevel(level) };
}

const RANKS: readonly { min: number; title: Localized }[] = [
  { min: 1, title: { en: 'Tourist', ko: '관광객' } },
  { min: 3, title: { en: 'Newcomer', ko: '새내기' } },
  { min: 6, title: { en: 'Local', ko: '현지인' } },
  { min: 10, title: { en: 'Insider', ko: '도시통' } },
  { min: 15, title: { en: 'Citizen', ko: '시민' } },
  { min: 22, title: { en: 'Legend', ko: '전설' } },
];

export function rankFor(level: number): Localized {
  let rank = RANKS[0].title;
  for (const r of RANKS) if (level >= r.min) rank = r.title;
  return rank;
}

export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Word-level similarity in [0, 1] (1 - normalized edit distance). Used to grade spoken phrase reviews. */
export function similarity(a: string, b: string): number {
  const x = normalizeWords(a);
  const y = normalizeWords(b);
  if (x.length === 0 && y.length === 0) return 1;
  const prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (x[i - 1] === y[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return 1 - prev[y.length] / Math.max(x.length, y.length);
}

function charDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Speech recognizers spell numbers and some words differently; these count as the same word. */
const SAME_WORD: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', okay: 'ok' };
const canon = (w: string) => SAME_WORD[w] ?? w;
const wordsMatch = (a: string, b: string) => canon(a) === canon(b) || (a.length >= 5 && b.length >= 5 && charDistance(a, b) <= 1);

export interface PronunciationResult {
  /** Every word of the target sentence and whether the recognizer heard it. */
  words: { text: string; ok: boolean }[];
  /** 0-100. */
  score: number;
}

/**
 * Shadowing score: aligns what the recognizer heard with the target sentence (LCS on words).
 * Missed target words count fully, extra words a little, so stumbling but finishing still scores well.
 */
export function scorePronunciation(target: string, heard: string): PronunciationResult {
  const shown = target.split(/\s+/).filter((w) => normalizeWords(w).length > 0);
  const t = shown.map((w) => normalizeWords(w).join(''));
  const h = normalizeWords(heard);
  const dp = Array.from({ length: t.length + 1 }, () => new Array<number>(h.length + 1).fill(0));
  for (let i = t.length - 1; i >= 0; i--) {
    for (let j = h.length - 1; j >= 0; j--) {
      dp[i][j] = wordsMatch(t[i], h[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ok = new Array<boolean>(t.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < t.length && j < h.length) {
    if (wordsMatch(t[i], h[j])) {
      ok[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const matched = ok.filter(Boolean).length;
  const extra = Math.max(0, h.length - matched);
  const score = t.length === 0 ? 0 : Math.round(clamp((matched - extra * 0.25) / t.length, 0, 1) * 100);
  return { words: shown.map((text, k) => ({ text, ok: ok[k] })), score };
}

/** Leitner boxes: a correct answer moves the card up a box, a miss sends it back to box 1. */
export const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30] as const;
const DAY_MS = 86_400_000;

export function scheduleReview(box: number, correct: boolean, now: number): { box: number; due: number } {
  const next = correct ? Math.min(box + 1, REVIEW_INTERVAL_DAYS.length - 1) : 1;
  return { box: next, due: now + REVIEW_INTERVAL_DAYS[next] * DAY_MS };
}

/** Local calendar day key, used for streaks and daily stats. */
export function dayKey(time: number): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
