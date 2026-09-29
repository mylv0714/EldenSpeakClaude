import { describe, expect, it } from 'vitest';
import { DISTRICT_NAMES } from './content/city';
import { nextRomancePlace, PARTNER_STAGE, romanceAt } from './content/romance';
import { SCENARIO_BY_ID } from './content/scenarios';
import { DISTRICT_LABEL } from '../client/game/city/layout';

describe('Miseon storyline', () => {
  it('stays hidden until the player has met Leo', () => {
    expect(romanceAt('bar', 0, 1)).toEqual([]);
    expect(nextRomancePlace(0, 1)).toBeNull();
  });

  it('walks through meet → dinner → confession, then offers repeatable dates', () => {
    expect(romanceAt('bar', 0, 2).map((s) => s.id)).toEqual(['romance_meet']);
    expect(nextRomancePlace(1, 2)).toBe('restaurant');
    expect(nextRomancePlace(2, 2)).toBe('beachbar');
    expect(nextRomancePlace(PARTNER_STAGE, 5)).toBeNull();
    expect(romanceAt('bar', PARTNER_STAGE, 5).map((s) => s.id)).toEqual(['romance_bar_date']);
    expect(romanceAt('hotel', PARTNER_STAGE, 5).map((s) => s.id)).toEqual(['romance_night']);
    expect(romanceAt('hotel', 1, 5)).toEqual([]);
  });

  it('registers every romance scene with Miseon', () => {
    for (const id of ['romance_meet', 'romance_dinner', 'romance_confession', 'romance_bar_date', 'romance_night', 'romance_chat']) {
      expect(SCENARIO_BY_ID.get(id)?.npcId).toBe('miseon');
    }
  });

  it('uses the same district names on the map and in date context', () => {
    expect(Object.values(DISTRICT_LABEL).map((l) => l.en).sort()).toEqual([...DISTRICT_NAMES].sort());
  });
});

describe('girlfriend chats', () => {
  it('are free conversations without goals', () => {
    const chat = SCENARIO_BY_ID.get('romance_chat')!;
    expect(chat.freeTalk).toBe(true);
    expect(chat.objectives).toEqual([]);
  });
});
