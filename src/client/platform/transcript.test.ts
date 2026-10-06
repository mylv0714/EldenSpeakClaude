import { describe, expect, it } from 'vitest';
import { mergeTranscripts } from './transcript';

describe('mergeTranscripts', () => {
  it('appends disjoint chunks (desktop Chrome)', () => {
    expect(mergeTranscripts(['hello nice', ' to meet you'])).toBe('hello nice to meet you');
  });

  it('collapses cumulative chunks (Android Chrome)', () => {
    expect(mergeTranscripts(['hello nice', 'hello nice', 'hello nice', 'Hello nice to meet you'])).toBe('Hello nice to meet you');
  });

  it('drops a chunk already covered by the text so far', () => {
    expect(mergeTranscripts(['hello nice to meet you', 'hello nice'])).toBe('hello nice to meet you');
  });

  it('ignores punctuation and case when comparing', () => {
    expect(mergeTranscripts(['Hello,', 'hello, nice to meet you.'])).toBe('hello, nice to meet you.');
  });

  it('only treats whole-word prefixes as repeats', () => {
    expect(mergeTranscripts(['no', 'nothing else'])).toBe('no nothing else');
  });

  it('skips empty chunks', () => {
    expect(mergeTranscripts(['', '  ', 'yes'])).toBe('yes');
  });
});
