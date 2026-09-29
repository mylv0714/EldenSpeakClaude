// Fixed catalogue of common learner weak points. The debrief AI tags conversations with these ids,
// the client remembers them, and later turns send them back as "focus" — only ids ever reach a prompt.
import type { Localized } from '../types';

export interface WeakPoint {
  id: string;
  label: Localized;
  /** English description for the judge / debrief prompts. */
  describe: string;
  /** English instruction for the character: how to create natural chances to practice it. */
  practice: string;
}

export const WEAK_POINTS = [
  { id: 'articles', label: { en: 'Articles (a / an / the)', ko: '관사 (a / an / the)' }, describe: 'missing or wrong articles (a, an, the)', practice: 'ask about specific things, places and objects so the learner has to use a, an and the' },
  { id: 'past_tense', label: { en: 'Past tense', ko: '과거 시제' }, describe: 'wrong or missing past tense verb forms', practice: 'ask what the learner did earlier, yesterday or on a past trip' },
  { id: 'present_perfect', label: { en: 'Present perfect (have + p.p.)', ko: '현재완료 (have + p.p.)' }, describe: 'confusing the present perfect with the simple past', practice: 'ask "Have you ever…?" and "How long have you…?" style questions' },
  { id: 'future', label: { en: 'Future forms (will / going to)', ko: '미래 표현 (will / going to)' }, describe: 'wrong future forms', practice: 'ask about the learner’s plans for later, tomorrow or the weekend' },
  { id: 'third_person_s', label: { en: 'He/She + verb-s', ko: '3인칭 단수 동사 -s' }, describe: 'missing -s on verbs after he, she or it', practice: 'ask the learner to describe what someone else (a friend, a family member) usually does' },
  { id: 'plurals', label: { en: 'Plurals & countable nouns', ko: '복수형·셀 수 있는 명사' }, describe: 'wrong plural forms or much/many, few/little', practice: 'ask about quantities: how many, how much, how often' },
  { id: 'prepositions', label: { en: 'Prepositions (in / on / at)', ko: '전치사 (in / on / at)' }, describe: 'wrong prepositions of time and place', practice: 'ask where things are and when things happen' },
  { id: 'questions', label: { en: 'Asking questions', ko: '질문 만들기 (어순)' }, describe: 'wrong word order or missing auxiliaries in questions', practice: 'leave natural gaps so the learner has to ask you questions' },
  { id: 'pronouns', label: { en: 'Pronouns (he / she / they)', ko: '대명사 (he / she / they)' }, describe: 'mixing up he, she, it, they or his/her', practice: 'talk about other people so the learner has to refer to them with pronouns' },
  { id: 'polite_requests', label: { en: 'Polite requests', ko: '공손한 부탁 표현' }, describe: 'requests that sound too direct or rude (e.g. "Give me…")', practice: 'create moments where the learner needs to ask you for something politely' },
  { id: 'full_sentences', label: { en: 'Full sentences', ko: '완전한 문장으로 말하기' }, describe: 'answering with single words instead of sentences', practice: 'ask open questions that need a full sentence answer, and gently ask for more detail' },
  { id: 'comparatives', label: { en: 'Comparisons', ko: '비교 표현 (-er / more / than)' }, describe: 'wrong comparative or superlative forms', practice: 'ask the learner to compare two options' },
  { id: 'phrasal_verbs', label: { en: 'Phrasal verbs', ko: '구동사 (pick up, find out…)' }, describe: 'avoiding or misusing common phrasal verbs', practice: 'use common phrasal verbs yourself and ask questions that invite them' },
  { id: 'vocabulary', label: { en: 'Word choice', ko: '어휘 선택' }, describe: 'unnatural or wrong word choice', practice: 'ask the learner to describe things in more detail' },
] as const satisfies readonly WeakPoint[];

export type WeakPointId = (typeof WEAK_POINTS)[number]['id'];
export const WEAK_POINT_IDS = WEAK_POINTS.map((w) => w.id) as [WeakPointId, ...WeakPointId[]];

export const WEAK_POINT_BY_ID: ReadonlyMap<string, WeakPoint> = new Map(WEAK_POINTS.map((w) => [w.id, w]));
