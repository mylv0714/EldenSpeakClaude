import { describe, expect, it } from 'vitest';
import { CALL_SCENARIOS, INCOMING_CALLS, OUTGOING_CALLS } from './calls';
import { NPC_BY_ID, PASSERBY_IDS } from './npcs';
import { OVERHEARD } from './overheard';
import { PLACE_BY_ID } from './city';
import { isNpcAllowed, SCENARIOS, getScenario, scenariosAtPlace } from './scenarios';
import { WEAK_POINT_IDS, WEAK_POINTS } from './weakPoints';

describe('content integrity', () => {
  it('gives every scenario real characters and unique ids', () => {
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
    for (const s of SCENARIOS) {
      const ids = s.npcId ? [s.npcId] : (s.npcPool ?? []);
      expect(ids.length, s.id).toBeGreaterThan(0);
      for (const id of ids) {
        expect(NPC_BY_ID.has(id), `${s.id} → ${id}`).toBe(true);
        expect(isNpcAllowed(s, id)).toBe(true);
      }
    }
  });

  it('registers phone calls and splits them into outgoing and incoming', () => {
    expect(CALL_SCENARIOS.every((s) => s.kind === 'call' && SCENARIOS.includes(s))).toBe(true);
    expect(OUTGOING_CALLS.some((s) => s.incoming)).toBe(false);
    expect(INCOMING_CALLS.map((s) => s.id).sort()).toEqual(['call_leo', 'call_scam']);
    expect(OUTGOING_CALLS.map((s) => s.id)).not.toContain('call_coach');
  });

  it('keeps the promotion test out of the random incoming calls', () => {
    const promo = getScenario('call_promotion');
    expect(promo.incoming).toBe(true);
    expect(promo.npcId).toBe('clara');
  });

  it('gives the members-only club its own demanding missions', () => {
    expect(PLACE_BY_ID.get('summit')?.minLevel).toBe(10);
    const club = scenariosAtPlace('summit');
    expect(club.map((s) => s.id).sort()).toEqual(['summit_network', 'summit_wine']);
    expect(club.every((s) => s.difficulty === 3)).toBe(true);
  });

  it('lets anyone on the street be a passerby for small talk', () => {
    const chat = getScenario('street_chat');
    expect(chat.freeTalk).toBe(true);
    expect(chat.context).toBe('smalltalk');
    expect(chat.npcPool).toEqual([...PASSERBY_IDS]);
  });

  it('has answerable listening quizzes', () => {
    expect(new Set(OVERHEARD.map((c) => c.id)).size).toBe(OVERHEARD.length);
    for (const c of OVERHEARD) {
      expect(c.lines.length).toBeGreaterThanOrEqual(3);
      expect(c.options).toHaveLength(3);
      expect(c.options[c.answer]).toBeDefined();
      expect(new Set(c.lines.map((l) => l.who)).size).toBe(2);
    }
  });

  it('keeps weak-point ids unique', () => {
    expect(new Set(WEAK_POINT_IDS).size).toBe(WEAK_POINTS.length);
  });
});
