import { describe, expect, it } from 'vitest';
import { diffWords } from '../ui/conversation/Diff';
import { migrate, newSave, SAVE_VERSION } from './save';

describe('save migration', () => {
  it('rejects garbage', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate({ foo: 1 })).toBeNull();
  });

  it('fills fields added in later versions', () => {
    const old = { name: 'Alex', level: 'B1', look: { skin: '#fff', hair: '#000', hairStyle: 'short' }, cash: 999, settings: { uiLang: 'en' } };
    const save = migrate(old)!;
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.cash).toBe(999);
    expect(save.phrasebook).toEqual([]);
    expect(save.settings.uiLang).toBe('en');
    expect(save.settings.voiceRate).toBe(1);
    expect(save.stats.conversations).toBe(0);
    expect(save.romance).toEqual({ stage: 0, affection: 0, following: false });
    expect(save.weakPoints).toEqual({});
    expect(save.overheard).toEqual([]);
    expect(save.stats.pronunciation).toBe(0);
    expect(save.settings.sceneView).toBe(true);
  });

  it('round-trips a new save', () => {
    const save = newSave({ name: 'Sam', level: 'A2', look: { skin: '#fff', hair: '#000', hairStyle: 'bob' }, outfit: 'street', uiLang: 'ko' });
    expect(migrate(JSON.parse(JSON.stringify(save)))).toEqual(save);
  });
});

describe('correction diff', () => {
  it('marks removed and added words', () => {
    expect(diffWords('I come here for visit', 'I am here to visit')).toEqual([
      { text: 'I', type: 'same' },
      { text: 'come', type: 'del' },
      { text: 'am', type: 'add' },
      { text: 'here', type: 'same' },
      { text: 'for', type: 'del' },
      { text: 'to', type: 'add' },
      { text: 'visit', type: 'same' },
    ]);
  });
});
