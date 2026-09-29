// Miseon storyline: meet → first date → confession (she becomes your partner and walks with you),
// then repeatable dates. All scenes are romantic but PG-13; the server prompt enforces this too.
import type { Scenario } from '../types';
import { obj, ph } from './story';

/** Progression order; `stage` in the save is how many of these are done. */
export const ROMANCE_STEPS = ['romance_meet', 'romance_dinner', 'romance_confession'] as const;
export const PARTNER_STAGE = ROMANCE_STEPS.length;
/** Romance unlocks once the player has met cousin Leo (story step 2). */
export const ROMANCE_MIN_STORY_STEP = 2;
const DATES = ['romance_bar_date', 'romance_night'];

export const ROMANCE_SCENARIOS: readonly Scenario[] = [
  {
    id: 'romance_meet', kind: 'romance', placeId: 'bar', npcId: 'miseon', once: true,
    title: { en: 'Jazz Night', ko: '재즈가 흐르는 밤' },
    brief: {
      en: 'A woman at the bar is humming along to the jazz band. Start a conversation, find something in common, and ask for her number.',
      ko: '바에서 한 여성이 재즈 밴드 음악을 흥얼거리고 있어요. 말을 걸고, 공통점을 찾고, 연락처를 물어보세요.',
    },
    playerRole: 'a newcomer to Elden City enjoying a drink at a jazz bar',
    setting: 'Moonlight Lounge downtown on a Friday night. A jazz trio is playing; Miseon sits alone at the bar with a mocktail.',
    npcBrief: "You don't know the learner yet. Be friendly but not too easy: react to how they start the conversation. Mention that you're a nurse at St. Mary's Hospital (tonight is your night off) and that you love this band and Carlos' tacos. If the learner is respectful, curious and a bit funny, warm up. If they politely ask for your number after a real conversation, give it with a playful line. If they are pushy or rude, politely end the chat.",
    opening: { en: 'Oh — sorry, was I humming too loud? This band gets me every time.', ko: '아 — 미안해요, 제가 너무 크게 흥얼거렸나요? 이 밴드만 들으면 항상 이래요.' },
    objectives: [
      obj('o1', 'Introduce yourself', '자기소개하기', 'The learner introduces themselves (at least their name).'),
      obj('o2', 'Find something in common', '공통점 찾기', 'Through their questions or comments, the learner discovers something they share with Miseon (music, food, the city, work…).'),
      obj('o3', 'Ask for her number', '연락처 물어보기', 'The learner politely asks for her phone number or to meet again.'),
      obj('b1', 'Make her laugh', '미선 웃게 만들기', 'The learner says something genuinely funny and Miseon laughs.', true),
    ],
    phrases: [
      ph('Is this seat taken?', '여기 자리 있나요?'),
      ph('I love this band too.', '저도 이 밴드 좋아해요.'),
      ph('So, what do you do?', '무슨 일 하세요?'),
      ph('Could I get your number?', '번호 알려 줄 수 있어요?'),
      ph('It was really nice talking to you.', '얘기 나눠서 정말 좋았어요.'),
    ],
    maxTurns: 10, difficulty: 2, reward: { cash: 0, xp: 150 },
    effects: [
      { type: 'romance', stage: 1 },
      {
        type: 'message', from: 'miseon',
        en: "Hey, it's Miseon from Moonlight 😊 You still owe me dinner. Luigi's? 🍝",
        ko: '안녕, 문라이트에서 만난 미선이에요 😊 저녁 사기로 했죠? 루이지 어때요? 🍝',
      },
    ],
  },
  {
    id: 'romance_dinner', kind: 'romance', placeId: 'restaurant', npcId: 'miseon', once: true,
    title: { en: 'First Date', ko: '첫 데이트' },
    brief: {
      en: "Your first date with Miseon at Luigi's. Compliment her, ask about her life, share your own story and plan a second date.",
      ko: '루이지에서 미선과의 첫 데이트. 칭찬하고, 그녀의 삶에 대해 묻고, 내 이야기도 들려주고, 두 번째 데이트 약속을 잡으세요.',
    },
    playerRole: "Miseon's date; they met at Moonlight Lounge",
    setting: "A candle-lit table for two at Luigi's Trattoria. Marco the waiter keeps winking at you.",
    npcBrief: 'You are a little nervous but excited. Talk about your work as a nurse (the long shifts, the patients who make it worth it), your family and why you love Elden City. Ask the learner about their home country and why they came. React warmly to sincere compliments and roll your eyes playfully at cheesy lines. If the learner suggests a second date, agree happily and suggest Sunset Shack at the beach.',
    opening: { en: 'Hi! You clean up nicely. I have to admit, I was a little nervous about tonight.', ko: '안녕! 오늘 멋있네요. 솔직히 오늘 조금 긴장했어요.' },
    objectives: [
      obj('o1', 'Give her a compliment', '칭찬하기', 'The learner gives Miseon a sincere compliment.'),
      obj('o2', 'Ask about her life', '그녀의 삶에 대해 묻기', 'The learner asks about her work, family or dreams.'),
      obj('o3', 'Share something about yourself', '내 이야기 하기', 'The learner shares something personal (home, family, why they came, hobbies).'),
      obj('o4', 'Plan a second date', '두 번째 데이트 약속', 'The learner suggests meeting again and they agree on a plan.'),
      obj('b1', 'Make her laugh', '미선 웃게 만들기', 'The learner says something genuinely funny and Miseon laughs.', true),
    ],
    phrases: [
      ph('You look amazing tonight.', '오늘 정말 예뻐요.'),
      ph('What made you become a nurse?', '어떻게 간호사가 됐어요?'),
      ph('Back home, I used to…', '고향에서는 …하곤 했어요.'),
      ph("I'd love to see you again.", '또 보고 싶어요.'),
      ph('How about this weekend?', '이번 주말 어때요?'),
    ],
    maxTurns: 12, difficulty: 2, reward: { cash: 0, xp: 200 },
    effects: [
      { type: 'romance', stage: 2 },
      {
        type: 'message', from: 'miseon',
        en: 'Tonight was really fun 🥰 Meet me at Sunset Shack at sunset? I want to show you my favorite view 🌅',
        ko: '오늘 정말 즐거웠어요 🥰 해 질 무렵 선셋 섁에서 만날래요? 제일 좋아하는 풍경 보여 줄게요 🌅',
      },
    ],
  },
  {
    id: 'romance_confession', kind: 'romance', placeId: 'beachbar', npcId: 'miseon', once: true,
    title: { en: 'Sunset Confession', ko: '노을 아래 고백' },
    brief: {
      en: 'The sun is setting over the ocean. Tell Miseon how you feel and ask her to be your girlfriend.',
      ko: '바다 위로 해가 지고 있어요. 미선에게 마음을 전하고 사귀자고 말해 보세요.',
    },
    playerRole: 'someone who has been dating Miseon and has fallen for her',
    setting: 'Sunset Shack on the beach at sunset, the sky turning orange and pink. Waves, soft music, two smoothies.',
    npcBrief: "You like the learner a lot and hope they feel the same, but you won't say it first. Talk about the view and your dates so far. If the learner sincerely expresses their feelings and asks you to be their girlfriend, say yes happily and emotionally.",
    opening: { en: 'Isn’t this view unreal? I come here whenever I need to think.', ko: '이 풍경 말도 안 되지 않아요? 생각이 필요할 때마다 여기 와요.' },
    objectives: [
      obj('o1', 'Talk about the moment', '지금 이 순간 이야기하기', 'The learner reacts to the view or the moment.'),
      obj('o2', 'Tell her how you feel', '마음 전하기', 'The learner sincerely expresses their feelings for her.'),
      obj('o3', 'Ask her to be your girlfriend', '사귀자고 말하기', 'The learner clearly asks her to be their girlfriend or to date officially.'),
      obj('b1', 'Say why she is special', '그녀가 특별한 이유 말하기', 'The learner gives specific reasons why they like her.', true),
    ],
    phrases: [
      ph("I've been wanting to tell you something.", '너한테 하고 싶은 말이 있었어.'),
      ph('I really like you.', '나 너 정말 좋아해.'),
      ph('You make this city feel like home.', '너 덕분에 이 도시가 집처럼 느껴져.'),
      ph('Will you be my girlfriend?', '내 여자친구가 되어 줄래?'),
    ],
    maxTurns: 10, difficulty: 2, reward: { cash: 0, xp: 300 },
    effects: [{ type: 'romance', stage: 3 }],
  },
  {
    id: 'romance_bar_date', kind: 'romance', placeId: 'bar', npcId: 'miseon',
    title: { en: 'Date Night at Moonlight', ko: '문라이트 데이트' },
    brief: {
      en: 'Date night with your girlfriend Miseon. Order drinks for two, make a toast and talk about your dreams.',
      ko: '여자친구 미선과의 데이트. 두 사람 음료를 주문하고, 건배하고, 꿈에 대해 이야기하세요.',
    },
    playerRole: "Miseon's partner",
    setting: 'Your favorite booth at Moonlight Lounge, the jazz trio playing slow songs.',
    npcBrief: "You are the learner's girlfriend and happy to be here. Be affectionate and playful. Talk about your week and your dream of becoming a head nurse or working with kids in the children's ward, and ask about their dreams. React to the toast.",
    opening: { en: "Our booth is free! This place feels like ours now. So, what are we drinking tonight?", ko: '우리 자리 비었어! 이제 여기 완전 우리 아지트 같아. 그래서, 오늘은 뭐 마실까?' },
    objectives: [
      obj('o1', 'Order drinks for both of you', '두 사람 음료 주문하기', 'The learner suggests or orders drinks for the two of them.'),
      obj('o2', 'Make a toast', '건배 제의하기', 'The learner proposes a toast (e.g. "To us!").'),
      obj('o3', 'Talk about your dreams', '꿈 이야기하기', 'The learner shares a dream or asks about hers.'),
      obj('b1', 'Say something sweet', '달콤한 말 하기', 'The learner says something sincerely sweet or romantic to her.', true),
    ],
    phrases: [
      ph('Two of your house specials, please.', '하우스 스페셜 두 잔 주세요.'),
      ph('Cheers! To us.', '건배! 우리를 위해.'),
      ph("What's your dream for the next five years?", '앞으로 5년 동안 꿈이 뭐야?'),
      ph("I'm really lucky to have you.", '너를 만나서 정말 행운이야.'),
    ],
    maxTurns: 10, difficulty: 2, reward: { cash: 0, xp: 120 },
  },
  {
    id: 'romance_night', kind: 'romance', placeId: 'hotel', npcId: 'miseon',
    title: { en: 'A Night to Remember', ko: '둘만의 밤' },
    brief: {
      en: 'A special night with Miseon in a city-view suite at the Grand Elden Hotel. Make it romantic: share memories, talk about your future and tell her you love her.',
      ko: '그랜드 엘든 호텔 시티뷰 스위트에서 미선과 보내는 특별한 밤. 추억을 나누고, 미래를 이야기하고, 사랑한다고 말해 주세요.',
    },
    playerRole: "Miseon's partner, spending a romantic night together in a hotel suite",
    setting: 'A city-view suite at the Grand Elden Hotel at night: city lights, rose petals, soft music and two glasses of sparkling cider.',
    npcBrief: "It's a romantic night with your partner. Be affectionate, a little shy and playful. Talk about favorite memories together, your future and what you love about each other. A hug or a kiss may be mentioned lightly, but nothing more. When the learner says they love you, say it back and wrap up sweetly (e.g. suggest watching the city lights until you both fall asleep).",
    opening: { en: 'Wow… look at the city from up here. Did you plan all of this? The roses too?', ko: '와… 여기서 보는 도시 좀 봐. 이거 다 네가 준비한 거야? 장미까지?' },
    objectives: [
      obj('o1', 'Tell her about the surprise', '깜짝 준비 이야기하기', 'The learner explains the surprise or why they planned this night.'),
      obj('o2', 'Share a favorite memory', '좋았던 추억 나누기', 'The learner talks about a favorite memory together.'),
      obj('o3', 'Say "I love you"', '사랑한다고 말하기', 'The learner tells her they love her.'),
      obj('b1', 'Talk about your future together', '함께할 미래 이야기하기', 'The learner talks about plans or hopes for their future together.', true),
    ],
    phrases: [
      ph('I wanted tonight to be special.', '오늘 밤을 특별하게 만들고 싶었어.'),
      ph('Do you remember the night we met?', '우리 처음 만난 밤 기억나?'),
      ph("I can't imagine this city without you.", '너 없는 이 도시는 상상도 못 하겠어.'),
      ph('I love you.', '사랑해.'),
    ],
    maxTurns: 10, difficulty: 2, reward: { cash: 0, xp: 150 },
  },
  {
    id: 'romance_chat', kind: 'romance', npcId: 'miseon', context: 'date',
    title: { en: 'Walk with Miseon', ko: '미선과 산책' },
    brief: {
      en: "You're out and about with your girlfriend Miseon. No goals — talk about anything you like and end the chat whenever you want.",
      ko: '여자친구 미선과 함께 거리를 걷고 있어요. 목표는 없어요 — 하고 싶은 이야기를 자유롭게 나누고, 원할 때 대화를 끝내세요.',
    },
    playerRole: "Miseon's partner, walking around Elden City together",
    setting: 'Walking side by side through Elden City.',
    npcBrief: "You are the learner's girlfriend, chatting while walking together. Mention something about where you are or the time of day, ask about their day, share a small story and flirt a little. Keep the conversation going as long as the learner wants: follow their topic, ask follow-up questions and share your own stories. Never end the conversation yourself.",
    opening: { en: 'Hey, you. Can I steal you for a second? I feel like talking.', ko: '있잖아, 잠깐 나랑 얘기할래? 수다 떨고 싶어.' },
    openingPool: [
      { en: 'Hey, you. Can I steal you for a second? I feel like talking.', ko: '있잖아, 잠깐 나랑 얘기할래? 수다 떨고 싶어.' },
      { en: "Okay, random question: what's the best thing that happened to you today?", ko: '갑자기 궁금한데, 오늘 제일 좋았던 일이 뭐야?' },
      { en: 'Look at this place! Have you been around here before?', ko: '여기 좀 봐! 이 근처 와 본 적 있어?' },
      { en: "I'm getting hungry… but first, tell me something I don't know about you.", ko: '배고파지네… 근데 그 전에, 내가 모르는 네 얘기 하나 해 줘.' },
      { en: "You're quiet today. Everything okay?", ko: '오늘 조용하네. 무슨 일 있어?' },
    ],
    objectives: [],
    freeTalk: true,
    phrases: [
      ph("How's your day going?", '오늘 하루 어때?'),
      ph('This place reminds me of home.', '여기 오니까 고향 생각나.'),
      ph('Want to grab something to eat?', '뭐 좀 먹으러 갈래?'),
      ph('I like spending time with you.', '너랑 있는 시간이 좋아.'),
    ],
    maxTurns: 20, difficulty: 1, reward: { cash: 0, xp: 40 },
  },
];

const BY_ID = new Map(ROMANCE_SCENARIOS.map((s) => [s.id, s]));

/** Romance scenes offered at a place for the given progress. */
export function romanceAt(placeId: string, stage: number, storyStep: number): Scenario[] {
  if (storyStep < ROMANCE_MIN_STORY_STEP) return [];
  const ids = stage < PARTNER_STAGE ? [ROMANCE_STEPS[stage]] : DATES;
  return ids.map((id) => BY_ID.get(id)!).filter((s) => s.placeId === placeId);
}

/** Where the next relationship step happens (for the map marker), if any. */
export function nextRomancePlace(stage: number, storyStep: number): string | null {
  if (storyStep < ROMANCE_MIN_STORY_STEP || stage >= PARTNER_STAGE) return null;
  return BY_ID.get(ROMANCE_STEPS[stage])!.placeId ?? null;
}
