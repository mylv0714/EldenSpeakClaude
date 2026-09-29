import { describe, expect, it } from 'vitest';
import { getScenario } from './content/scenarios';
import {
  averageScore,
  bonusDoneCount,
  computeReward,
  computeStars,
  levelFromXp,
  requiredObjectivesDone,
  scheduleReview,
  scorePronunciation,
  similarity,
} from './rules';

describe('scorePronunciation', () => {
  it('gives full marks for a perfect repeat, ignoring case and punctuation', () => {
    const r = scorePronunciation("Could I get a large latte, please?", 'could i get a large latte please');
    expect(r.score).toBe(100);
    expect(r.words.every((w) => w.ok)).toBe(true);
    expect(r.words[5].text).toBe('latte,');
  });
  it('marks the words the recognizer did not hear', () => {
    const r = scorePronunciation('I would like three tickets', 'I would like tree tickets');
    expect(r.words.map((w) => w.ok)).toEqual([true, true, true, false, true]);
    expect(r.score).toBeLessThan(80);
  });
  it('accepts digits for number words and tiny spelling differences in long words', () => {
    expect(scorePronunciation('Table for two', 'table for 2').score).toBe(100);
    expect(scorePronunciation('The restaurant is closed', 'the restaurent is closed').score).toBe(100);
  });
  it('penalizes extra words only a little and never goes below zero', () => {
    expect(scorePronunciation('Thank you', 'um thank you so much').score).toBeGreaterThanOrEqual(50);
    expect(scorePronunciation('Hello there', '').score).toBe(0);
  });
});

describe('stars', () => {
  it('gives nothing for failed or abandoned conversations', () => {
    expect(computeStars('failure', 95, 1)).toBe(0);
    expect(computeStars('abandoned', 95, 1)).toBe(0);
  });
  it('needs a high average and a bonus goal for three stars', () => {
    expect(computeStars('success', 90, 1)).toBe(3);
    expect(computeStars('success', 90, 0)).toBe(2);
    expect(computeStars('success', 72, 1)).toBe(2);
    expect(computeStars('success', 50, 1)).toBe(1);
  });
});

describe('rewards', () => {
  const scenario = getScenario('cafe_order');
  const base = { avgScore: 80, bonusDone: 0, hintsUsed: 0, mood: 70 };

  it('pays nothing when abandoned and only some XP on failure', () => {
    expect(computeReward(scenario, { ...base, outcome: 'abandoned' })).toEqual({ cash: 0, xp: 0 });
    expect(computeReward(scenario, { ...base, outcome: 'failure' })).toEqual({ cash: 0, xp: Math.round(scenario.reward.xp * 0.3) });
  });
  it('rewards quality, bonus goals and a happy NPC; hints cost a little', () => {
    const plain = computeReward(scenario, { ...base, outcome: 'success' });
    expect(computeReward(scenario, { ...base, outcome: 'success', avgScore: 100 }).cash).toBeGreaterThan(plain.cash);
    expect(computeReward(scenario, { ...base, outcome: 'success', bonusDone: 1 }).cash).toBeGreaterThan(plain.cash);
    expect(computeReward(scenario, { ...base, outcome: 'success', mood: 95 }).cash).toBeGreaterThan(plain.cash);
    expect(computeReward(scenario, { ...base, outcome: 'success', hintsUsed: 2 }).cash).toBeLessThan(plain.cash);
    expect(computeReward(scenario, { ...base, outcome: 'success', hintsUsed: 50 }).cash).toBeGreaterThan(0);
  });
});

describe('objectives', () => {
  const scenario = getScenario('story_immigration');
  it('ignores bonus goals when checking completion', () => {
    expect(requiredObjectivesDone(scenario, new Set(['o1', 'o2']))).toBe(false);
    expect(requiredObjectivesDone(scenario, new Set(['o1', 'o2', 'o3']))).toBe(true);
    expect(bonusDoneCount(scenario, new Set(['o1', 'b1']))).toBe(1);
  });
});

describe('levels', () => {
  it('starts at level 1 and grows with a rising curve', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, needed: 100 });
    expect(levelFromXp(100)).toEqual({ level: 2, into: 0, needed: 160 });
    expect(levelFromXp(259)).toEqual({ level: 2, into: 159, needed: 160 });
    expect(levelFromXp(260).level).toBe(3);
  });
});

describe('phrase similarity', () => {
  it('ignores case and punctuation', () => {
    expect(similarity("I'd like a coffee, please!", 'id like a coffee please')).toBe(1);
  });
  it('scores near misses between 0 and 1', () => {
    const s = similarity('I would like coffee please', "I'd like a coffee, please");
    expect(s).toBeGreaterThan(0.3);
    expect(s).toBeLessThan(1);
    expect(similarity('', 'hello there')).toBe(0);
  });
  it('averages scores', () => {
    expect(averageScore([])).toBe(0);
    expect(averageScore([70, 81])).toBe(76);
  });
});

describe('spaced repetition', () => {
  const now = Date.UTC(2026, 0, 1);
  it('moves up a box on success and resets on a miss', () => {
    expect(scheduleReview(0, true, now)).toEqual({ box: 1, due: now + 86_400_000 });
    expect(scheduleReview(3, true, now).box).toBe(4);
    expect(scheduleReview(5, true, now).box).toBe(5);
    expect(scheduleReview(4, false, now)).toEqual({ box: 1, due: now + 86_400_000 });
  });
});
