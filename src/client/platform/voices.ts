// Voice selection shared by the web (speechSynthesis) and native (TTS plugin) implementations.

export interface VoiceLike {
  name: string;
  lang: string;
}

const FEMALE = /female|woman|zira|aria|jenny|samantha|susan|hazel|libby|sonia|natasha|karen|moira|tessa|victoria|allison|ava|serena|fiona|emma|michelle|heera|neerja|catherine|linda|heather|clara|nicole|joanna|salli|kendra|kimberly|ivy|olivia|amy|google us english|google uk english female/i;
const MALE = /\bmale\b|\bman\b|david|mark|guy|ryan|daniel|george|james|alex\b|fred|tom\b|thomas|rishi|ravi|william|christopher|eric|roger|brian|andrew|steffan|prabhat|liam|matthew|joey|justin|russell|google uk english male/i;
const QUALITY = /natural|neural|online|premium|enhanced|google/i;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function genderOf(v: VoiceLike): 'female' | 'male' | undefined {
  if (MALE.test(v.name) && !/female/i.test(v.name)) return 'male';
  if (FEMALE.test(v.name)) return 'female';
  return undefined;
}

/**
 * Picks a voice for the requested accent and gender. Prefers high-quality voices and spreads
 * characters across the matching voices using `key`, so two baristas don't sound identical.
 */
export function pickVoiceIndex<V extends VoiceLike>(
  voices: readonly V[],
  lang: string,
  gender: 'female' | 'male' | undefined,
  key = '',
): number {
  const norm = (l: string) => l.replace('_', '-').toLowerCase();
  const want = norm(lang);
  const english = voices.map((v, i) => ({ v, i })).filter(({ v }) => norm(v.lang).startsWith('en'));
  if (english.length === 0) return -1;

  const tiers = [
    english.filter(({ v }) => norm(v.lang) === want),
    english.filter(({ v }) => norm(v.lang) === 'en-us'),
    english,
  ];
  for (const tier of tiers) {
    if (tier.length === 0) continue;
    const byGender = gender ? tier.filter(({ v }) => genderOf(v) === gender) : tier;
    const pool = byGender.length > 0 ? byGender : tier;
    const best = pool.filter(({ v }) => QUALITY.test(v.name));
    const final = best.length > 0 ? best : pool;
    return final[hash(key) % final.length].i;
  }
  return -1;
}

export const ACCENT_LANG = { us: 'en-US', uk: 'en-GB', au: 'en-AU', in: 'en-IN' } as const;
