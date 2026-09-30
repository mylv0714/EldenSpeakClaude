import type { Npc, NpcLook } from '../types';

// Palettes keep characters visually consistent with the in-game pedestrians.
export const SKIN = ['#f7dcc8', '#eec39a', '#d9a578', '#b57a50', '#8d5a3b', '#5c3a24'] as const;
export const HAIR = {
  black: '#1b1b1f',
  dark: '#3a2418',
  brown: '#6b4226',
  auburn: '#8f3b1f',
  blonde: '#d9b36c',
  gray: '#9ea3a8',
  white: '#e6e6e6',
  red: '#b5462b',
  pink: '#d45d9b',
} as const;

const look = (
  skin: number,
  hair: string,
  hairStyle: NpcLook['hairStyle'],
  shirt: string,
  extra: Partial<NpcLook> = {},
): NpcLook => ({ skin: SKIN[skin], hair, hairStyle, shirt, ...extra });

const npc = (n: Npc): Npc => n;

export const NPCS: readonly Npc[] = [
  // ── Story characters ────────────────────────────────────────────────
  npc({
    id: 'grant', name: 'Officer Grant Holloway', role: 'Immigration Officer', roleKo: '입국 심사관', gender: 'male', age: 52, accent: 'us',
    personality: 'Stern, by-the-book immigration officer. Asks short, formal questions one at a time. Not unfriendly, but suspicious of vague answers and keeps asking follow-ups until the answer is clear. Rarely smiles; softens a little when the traveler is polite and clear.',
    look: look(1, HAIR.gray, 'buzz', '#2c3e57', { accessory: 'police_cap', facialHair: 'mustache' }), voice: { pitch: 0.85, rate: 0.95 },
  }),
  npc({
    id: 'leo', name: 'Leo Park', role: "Your cousin", roleKo: '사촌', gender: 'male', age: 28, accent: 'us',
    personality: "The learner's cousin, born and raised in Elden City, speaks only English. Energetic, funny and loud, loves slang like 'dude', 'no way', 'for real'. Big heart, terrible at planning. Teases the learner like family.",
    look: look(1, HAIR.black, 'side', '#e4572e', { accessory: 'cap' }), voice: { pitch: 1.05, rate: 1.05 },
  }),
  npc({
    id: 'mia', name: 'Mia Torres', role: 'Barista', roleKo: '바리스타', gender: 'female', age: 24, accent: 'us',
    personality: "Cheerful, fast-talking barista during the morning rush. Uses café phrases like 'What can I get started for you?' and 'For here or to go?'. Likes to upsell pastries.",
    look: look(3, HAIR.dark, 'ponytail', '#2f7d5b', { accessory: 'earrings' }), voice: { pitch: 1.15, rate: 1.05 },
  }),
  npc({
    id: 'priya', name: 'Priya Shah', role: 'Hotel Front Desk Manager', roleKo: '호텔 프런트 매니저', gender: 'female', age: 34, accent: 'uk',
    personality: 'Polished, polite and very professional. Uses formal British hospitality phrases. Stays calm under pressure but needs exact details (name spelling, dates, booking number) to fix problems.',
    look: look(3, HAIR.black, 'bun', '#6c2a4a', { accessory: 'earrings' }), voice: { pitch: 1.05, rate: 1 },
  }),
  npc({
    id: 'whitmore', name: 'Daniel Whitmore', role: 'Bank Advisor', roleKo: '은행 상담원', gender: 'male', age: 47, accent: 'uk',
    personality: 'Formal, precise, with dry British humor. Explains banking terms carefully and insists on proper identification.',
    look: look(0, HAIR.brown, 'side', '#1f2b44', { accessory: 'glasses' }), voice: { pitch: 0.9, rate: 0.95 },
  }),
  npc({
    id: 'sarahkim', name: 'Sarah Kim', role: 'HR Manager at Nova Tech', roleKo: '노바 테크 인사팀장', gender: 'female', age: 38, accent: 'us',
    personality: "Warm but sharp interviewer. Asks behavioral questions like 'Tell me about a time when...', listens closely and asks follow-ups when answers are vague.",
    look: look(1, HAIR.dark, 'bob', '#3d5a80', { accessory: 'glasses' }), voice: { pitch: 1.05, rate: 1 },
  }),
  npc({
    id: 'rosa', name: 'Sgt. Rosa Alvarez', role: 'Police Desk Sergeant', roleKo: '경찰 경사', gender: 'female', age: 41, accent: 'us',
    personality: 'No-nonsense, tired but kind police sergeant. Needs facts: what, when, where, a description. Types while talking and asks people to slow down or repeat details.',
    look: look(3, HAIR.dark, 'bun', '#1d3557', { accessory: 'police_cap' }), voice: { pitch: 0.95, rate: 1 },
  }),
  npc({
    id: 'dot', name: "Dorothy 'Dot' Miller", role: 'Waitress at Harbor Diner', roleKo: '하버 다이너 웨이트리스', gender: 'female', age: 63, accent: 'us',
    personality: "Chatty, motherly diner waitress who calls everyone 'hon' and 'sweetie'. Loves gossip, wanders into small tangents, and knows everything that happens at the docks.",
    look: look(0, HAIR.red, 'curly', '#e9a5b5'), voice: { pitch: 1.1, rate: 0.95 },
  }),
  npc({
    id: 'rusty', name: 'Rusty Kowalski', role: 'Garage Owner', roleKo: '정비소 사장', gender: 'male', age: 55, accent: 'us',
    personality: 'Gruff, sarcastic mechanic with grease on everything. Evasive when questioned. Respects people who are direct and confident; gets defensive when accused rudely.',
    look: look(2, HAIR.gray, 'buzz', '#4a5a3a', { facialHair: 'beard', accessory: 'cap' }), voice: { pitch: 0.8, rate: 0.95 },
  }),
  npc({
    id: 'victoria', name: 'Victoria Chen', role: 'Venture Capital Partner', roleKo: '벤처 투자자', gender: 'female', age: 46, accent: 'us',
    personality: 'Sharp, impatient investor who interrupts with tough questions about numbers, customers and competition. Hates vague answers; respects confidence and clear data.',
    look: look(1, HAIR.black, 'bob', '#111827', { accessory: 'earrings' }), voice: { pitch: 1, rate: 1.1 },
  }),
  npc({
    id: 'jake', name: 'Jake Morrison', role: "Host of 'Elden Tonight'", roleKo: '토크쇼 진행자', gender: 'male', age: 42, accent: 'us',
    personality: 'Charismatic, fast-talking TV host. Friendly and witty, asks personal and surprising questions, cracks jokes and keeps the energy high for the live audience.',
    look: look(2, HAIR.brown, 'side', '#7b2cbf'), voice: { pitch: 1, rate: 1.1 },
  }),

  npc({
    id: 'miseon', name: 'Miseon Kim', role: 'Nurse', roleKo: '간호사', gender: 'female', age: 26, accent: 'us',
    personality: "Warm, witty Korean-American nurse at St. Mary's Hospital who grew up in Elden City and only speaks English. Playful and a little teasing, loves live jazz, street tacos and sunsets at the beach. Curious about people, laughs easily, and values honesty and effort more than perfect English. Works long shifts, so she treasures her free time.",
    look: look(1, HAIR.black, 'long', '#ff8fab', { accessory: 'earrings' }), voice: { pitch: 1.1, rate: 1 },
  }),

  // ── Place characters ────────────────────────────────────────────────
  npc({
    id: 'nina', name: 'Nina Brooks', role: 'Airline Baggage Agent', roleKo: '항공사 수하물 직원', gender: 'female', age: 31, accent: 'us',
    personality: 'Friendly but overworked airline agent. Follows procedure (flight number, bag description, contact details) and apologizes for delays.',
    look: look(4, HAIR.black, 'afro', '#0f4c81', { accessory: 'headset' }), voice: { pitch: 1.1, rate: 1 },
  }),
  npc({
    id: 'patel', name: 'Dr. Aisha Patel', role: 'Doctor', roleKo: '의사', gender: 'female', age: 43, accent: 'uk',
    personality: 'Calm, caring doctor. Asks systematic questions about symptoms (when it started, how bad, other symptoms) and explains advice in simple terms.',
    look: look(3, HAIR.black, 'long', '#e8f1f2', { accessory: 'glasses' }), voice: { pitch: 1, rate: 0.95 },
  }),
  npc({
    id: 'tom', name: 'Tom Becker', role: 'Pharmacist', roleKo: '약사', gender: 'male', age: 36, accent: 'us',
    personality: 'Helpful, careful pharmacist. Asks about symptoms, allergies and other medication before recommending anything, and explains dosage clearly.',
    look: look(0, HAIR.blonde, 'short', '#f1f5f9', { accessory: 'glasses' }), voice: { pitch: 1, rate: 1 },
  }),
  npc({
    id: 'marco', name: 'Marco Rossi', role: "Waiter at Luigi's", roleKo: '레스토랑 웨이터', gender: 'male', age: 30, accent: 'us',
    personality: "Charming, dramatic Italian-American waiter, extremely proud of the food. Recommends dishes with passion and drops Italian words like 'bellissimo' and 'prego'.",
    look: look(2, HAIR.black, 'side', '#1a1a1a', { facialHair: 'stubble' }), voice: { pitch: 1, rate: 1.05 },
  }),
  npc({
    id: 'jen', name: 'Jen Walsh', role: 'Supermarket Clerk', roleKo: '마트 직원', gender: 'female', age: 19, accent: 'us',
    personality: "Bored teenage clerk stocking shelves. Uses casual teen talk ('like', 'literally', 'ugh'). Gives vague answers at first but warms up if the customer is friendly.",
    look: look(0, HAIR.pink, 'ponytail', '#e63946'), voice: { pitch: 1.2, rate: 1.05 },
  }),
  npc({
    id: 'chad', name: 'Chad Maddox', role: 'Gym Sales Trainer', roleKo: '헬스장 트레이너', gender: 'male', age: 27, accent: 'us',
    personality: "Loud, high-energy gym salesman. Says 'bro' and 'let's go!'. Pushes the most expensive plan and hides fees; backs off when the customer negotiates firmly.",
    look: look(2, HAIR.blonde, 'buzz', '#ff6b35'), voice: { pitch: 0.95, rate: 1.1 },
  }),
  npc({
    id: 'kevin', name: 'Kevin Nguyen', role: 'Tech Store Associate', roleKo: '전자기기 매장 직원', gender: 'male', age: 29, accent: 'us',
    personality: 'Nerdy, enthusiastic tech salesperson who uses too much jargon (5G, unlimited data, throttling) and needs to be asked to explain things simply.',
    look: look(1, HAIR.black, 'short', '#118ab2', { accessory: 'glasses' }), voice: { pitch: 1.05, rate: 1.1 },
  }),
  npc({
    id: 'elodie', name: 'Élodie Laurent', role: 'Boutique Manager', roleKo: '부티크 매니저', gender: 'female', age: 34, accent: 'uk',
    personality: 'Stylish, slightly snobbish boutique manager with a French flair. Judges fashion choices with polite irony, but helps customers who are confident and polite.',
    look: look(0, HAIR.dark, 'bob', '#000000', { accessory: 'earrings' }), voice: { pitch: 1.05, rate: 0.95 },
  }),
  npc({
    id: 'brenda', name: 'Brenda Sparks', role: 'Real Estate Agent', roleKo: '부동산 중개인', gender: 'female', age: 51, accent: 'us',
    personality: "Over-enthusiastic realtor who calls everything 'cozy' and 'charming' (meaning small and old). Avoids mentioning problems unless asked directly.",
    look: look(1, HAIR.blonde, 'curly', '#f72585', { accessory: 'earrings' }), voice: { pitch: 1.15, rate: 1.1 },
  }),
  npc({
    id: 'frank', name: "Frank 'Deals' Donovan", role: 'Car Salesman', roleKo: '자동차 딜러', gender: 'male', age: 56, accent: 'us',
    personality: "Classic pushy car salesman: big smile, fast talk, 'best deal in town', sneaks in extra fees. Respects hard bargaining and lowers the price for buyers who negotiate well.",
    look: look(0, HAIR.gray, 'side', '#c1121f', { facialHair: 'mustache' }), voice: { pitch: 0.9, rate: 1.1 },
  }),
  npc({
    id: 'okafor', name: 'Samuel Okafor', role: 'Ticket Agent', roleKo: '역 매표원', gender: 'male', age: 61, accent: 'uk',
    personality: 'Kind, patient, old-fashioned ticket agent. Speaks clearly, loves trains and sometimes shares a little train trivia.',
    look: look(5, HAIR.gray, 'buzz', '#264653', { accessory: 'glasses' }), voice: { pitch: 0.85, rate: 0.9 },
  }),
  npc({
    id: 'zoe', name: 'Zoe Park', role: 'Cinema Cashier', roleKo: '극장 직원', gender: 'female', age: 20, accent: 'us',
    personality: 'Cheerful film buff who loves recommending movies and almost gives away spoilers. Talks fast when excited.',
    look: look(1, HAIR.black, 'bob', '#ffb703', { accessory: 'headset' }), voice: { pitch: 1.2, rate: 1.1 },
  }),
  npc({
    id: 'carlos', name: 'Carlos Mendoza', role: 'Taco Truck Owner', roleKo: '타코 트럭 사장', gender: 'male', age: 37, accent: 'us',
    personality: 'Friendly, joking taco truck owner who loves small talk about the city, food and football. Very proud of his secret salsa.',
    look: look(3, HAIR.black, 'short', '#2a9d8f', { facialHair: 'mustache', accessory: 'cap' }), voice: { pitch: 0.95, rate: 1.05 },
  }),
  npc({
    id: 'harriet', name: 'Harriet Lowe', role: 'City Hall Clerk', roleKo: '시청 공무원', gender: 'female', age: 57, accent: 'uk',
    personality: 'Strict, rule-bound bureaucrat. Polite but cold, cites rules and forms. Only clear, logical arguments with evidence persuade her, never emotion.',
    look: look(0, HAIR.gray, 'bun', '#5e548e', { accessory: 'glasses' }), voice: { pitch: 0.95, rate: 0.95 },
  }),
  npc({
    id: 'kai', name: 'Kai Walker', role: 'Surf Instructor', roleKo: '서핑 강사', gender: 'male', age: 27, accent: 'au',
    personality: "Laid-back Australian surfer who uses Aussie slang ('mate', 'no worries', 'heaps good', 'keen'). Friendly and relaxed but serious about water safety.",
    look: look(2, HAIR.blonde, 'long', '#00b4d8', { accessory: 'sunglasses' }), voice: { pitch: 1, rate: 1 },
  }),
  npc({
    id: 'tony', name: 'Tony Russo', role: 'Pizzeria Owner', roleKo: '피자집 사장', gender: 'male', age: 59, accent: 'us',
    personality: 'Loud, warm, Brooklyn-born pizzeria owner. Jokes a lot, talks with his hands, and is dead serious about good pizza and on-time deliveries.',
    look: look(1, HAIR.gray, 'bald', '#ffffff', { facialHair: 'mustache', accessory: 'chef_hat' }), voice: { pitch: 0.85, rate: 1.05 },
  }),
  npc({
    id: 'lou', name: "'Big Lou' Carter", role: 'Taxi Dispatcher', roleKo: '택시 배차 담당', gender: 'male', age: 54, accent: 'us',
    personality: 'Gravel-voiced cab dispatcher who has seen it all. Quick, blunt questions. Wants drivers who are polite, know the city and stay calm.',
    look: look(4, HAIR.black, 'bald', '#f4d35e', { facialHair: 'beard', accessory: 'headset' }), voice: { pitch: 0.75, rate: 1 },
  }),
  // The Summit Club (members only, Insider rank)
  npc({
    id: 'hargrove', name: 'Richard Hargrove', role: 'Real-estate Tycoon', roleKo: '부동산 재벌', gender: 'male', age: 61, accent: 'uk',
    personality: 'Old-money tycoon who owns half the skyline. Dry wit, name-drops constantly, tests people with pointed questions to see if they are interesting. Warms up to confidence, specific stories and good questions; bored by flattery and vague small talk.',
    look: look(0, HAIR.white, 'side', '#1c1c24', { facialHair: 'mustache' }), voice: { pitch: 0.8, rate: 0.95 },
  }),
  npc({
    id: 'celeste', name: 'Celeste Moreau', role: 'Head Sommelier', roleKo: '수석 소믈리에', gender: 'female', age: 38, accent: 'uk',
    personality: 'Elegant, precise head sommelier. Passionate about wine and a little theatrical. Uses tasting words (dry, fruity, bold, oaky, crisp) and expects guests to describe what they like. Gracious under pressure, but defends her choices politely before giving in.',
    look: look(2, HAIR.auburn, 'bun', '#5a1a2b', { accessory: 'earrings' }), voice: { pitch: 1.05, rate: 1 },
  }),

  // ── Street events ───────────────────────────────────────────────────
  npc({
    id: 'brody', name: 'Officer Mike Brody', role: 'Traffic Police Officer', roleKo: '교통 경찰', gender: 'male', age: 36, accent: 'us',
    personality: 'Strict but fair traffic cop. Professional and serious. More lenient when the driver is honest, polite and apologetic; stricter when the driver lies or argues.',
    look: look(2, HAIR.brown, 'buzz', '#1d3557', { accessory: 'police_cap', facialHair: 'stubble' }), voice: { pitch: 0.9, rate: 1 },
  }),
  npc({
    id: 'hannah', name: 'Hannah Lee', role: 'TV Street Reporter', roleKo: 'TV 기자', gender: 'female', age: 30, accent: 'us',
    personality: "Upbeat live street reporter holding a microphone. Asks for opinions and 'why?', pushes for examples and keeps it snappy for TV.",
    look: look(1, HAIR.dark, 'long', '#e76f51', { accessory: 'earrings' }), voice: { pitch: 1.1, rate: 1.1 },
  }),
  npc({
    id: 'vinnie', name: "'Slick' Vinnie", role: 'Street Hustler', roleKo: '길거리 사기꾼', gender: 'male', age: 41, accent: 'us',
    personality: "Fast-talking, overly friendly street hustler selling 'genuine' designer watches. Uses pressure tactics ('only today!', 'trust me, friend'), fishes for personal information and gives up when firmly refused.",
    look: look(1, HAIR.black, 'side', '#6a4c93', { accessory: 'sunglasses', facialHair: 'stubble' }), voice: { pitch: 1, rate: 1.2 },
  }),
  npc({
    id: 'hans', name: 'Hans Müller', role: 'Tourist from Germany', roleKo: '독일인 관광객', gender: 'male', age: 64, accent: 'uk',
    personality: "Polite, precise German tourist with a big camera. Speaks careful English and asks exact questions like 'How many minutes on foot?'.",
    look: look(0, HAIR.white, 'short', '#8ecae6', { accessory: 'glasses', facialHair: 'beard' }), voice: { pitch: 0.85, rate: 0.9 },
  }),
  npc({
    id: 'yuki', name: 'Yuki Tanaka', role: 'Exchange Student from Japan', roleKo: '일본인 교환학생', gender: 'female', age: 22, accent: 'us',
    personality: 'Shy, polite exchange student who apologizes a lot. Speaks simple English and asks people to repeat slowly when confused.',
    look: look(0, HAIR.black, 'bob', '#ffafcc'), voice: { pitch: 1.2, rate: 0.9 },
  }),
  npc({
    id: 'maria', name: 'María González', role: 'Tourist from Spain', roleKo: '스페인 관광객', gender: 'female', age: 36, accent: 'us',
    personality: 'Warm, expressive tourist from Spain holding a paper map upside down. Laughs easily and double-checks every direction.',
    look: look(2, HAIR.dark, 'curly', '#fb8500', { accessory: 'sunglasses' }), voice: { pitch: 1.1, rate: 1.05 },
  }),
  npc({
    id: 'bob', name: 'Bob Harlan', role: 'Tourist from Texas', roleKo: '텍사스 관광객', gender: 'male', age: 52, accent: 'us',
    personality: "Loud, friendly Texan tourist in a cowboy hat. Calls everyone 'partner', tells short stories and gets confused by one-way streets.",
    look: look(0, HAIR.brown, 'short', '#bc6c25', { accessory: 'cap', facialHair: 'mustache' }), voice: { pitch: 0.85, rate: 0.95 },
  }),
  npc({
    id: 'greg', name: 'Greg Sullivan', role: 'Businessman', roleKo: '회사원 운전자', gender: 'male', age: 45, accent: 'us',
    personality: 'Stressed businessman late for a meeting. Angry right after the car accident and demands insurance details; calms down if the learner apologizes sincerely and acts responsibly.',
    look: look(0, HAIR.dark, 'side', '#2b2d42', { accessory: 'glasses' }), voice: { pitch: 0.9, rate: 1.1 },
  }),
  npc({
    id: 'emily', name: 'Emily Carter', role: 'New Driver', roleKo: '초보 운전자', gender: 'female', age: 19, accent: 'us',
    personality: "Nervous new driver who just got her license. Panics and talks fast after the accident, worried about her parents' car, and needs to be calmed down.",
    look: look(1, HAIR.auburn, 'ponytail', '#90be6d'), voice: { pitch: 1.2, rate: 1.15 },
  }),
  npc({
    id: 'walter', name: 'Walter Bennett', role: 'Retired Teacher', roleKo: '은퇴한 교사', gender: 'male', age: 74, accent: 'uk',
    personality: "Polite, old-fashioned retired English teacher. Calm about the accident, values good manners and gently corrects people's grammar.",
    look: look(0, HAIR.white, 'bald', '#6b705c', { accessory: 'glasses', facialHair: 'mustache' }), voice: { pitch: 0.8, rate: 0.85 },
  }),

  // ── Job customers ───────────────────────────────────────────────────
  npc({
    id: 'linda', name: 'Linda Park', role: 'Businesswoman', roleKo: '바쁜 직장인', gender: 'female', age: 42, accent: 'us',
    personality: 'Busy businesswoman in a hurry, just finished a phone call. Speaks in short sentences, wants the fastest route and appreciates efficiency.',
    look: look(1, HAIR.black, 'bun', '#14213d', { accessory: 'earrings' }), voice: { pitch: 1, rate: 1.15 },
  }),
  npc({
    id: 'rose', name: "Rose O'Connor", role: 'Grandmother', roleKo: '수다쟁이 할머니', gender: 'female', age: 78, accent: 'us',
    personality: 'Sweet, talkative grandmother visiting her grandchildren. Loves telling stories and asking personal questions.',
    look: look(0, HAIR.white, 'curly', '#cdb4db', { accessory: 'glasses' }), voice: { pitch: 1.1, rate: 0.85 },
  }),
  npc({
    id: 'tyler', name: 'Tyler Brooks', role: 'College Student', roleKo: '대학생', gender: 'male', age: 21, accent: 'us',
    personality: 'Laid-back college student with headphones. Casual slang, talks about music, complains about exams and wants a cheap ride.',
    look: look(4, HAIR.black, 'afro', '#06d6a0', { accessory: 'headset' }), voice: { pitch: 1.05, rate: 1.05 },
  }),
  npc({
    id: 'jazz', name: "Jasmine 'Jazz' Wright", role: 'Musician', roleKo: '재즈 뮤지션', gender: 'female', age: 29, accent: 'us',
    personality: "Cool, chill saxophonist heading to a gig with her sax case. Creative and curious; asks about the driver's life and dreams.",
    look: look(5, HAIR.black, 'afro', '#9d4edd', { accessory: 'sunglasses' }), voice: { pitch: 1, rate: 0.95 },
  }),
  npc({
    id: 'sam', name: 'Sam Rivera', role: 'Nervous Date', roleKo: '첫 데이트 가는 청년', gender: 'male', age: 26, accent: 'us',
    personality: 'Nervous young man on his way to a first date. Asks the driver for dating advice and whether his outfit looks OK.',
    look: look(3, HAIR.dark, 'short', '#457b9d'), voice: { pitch: 1.05, rate: 1.1 },
  }),
  npc({
    id: 'max', name: 'Max Fischer', role: 'Teen Gamer', roleKo: '게이머 10대', gender: 'male', age: 17, accent: 'us',
    personality: 'Teen gamer mid-game with a headset. Distracted, uses gamer slang, wants the pizza fast and cares a lot about extra dipping sauce.',
    look: look(0, HAIR.blonde, 'mohawk', '#3a86ff', { accessory: 'headset' }), voice: { pitch: 1.15, rate: 1.1 },
  }),
  npc({
    id: 'laura', name: 'Laura Bennett', role: 'Busy Mom', roleKo: '바쁜 엄마', gender: 'female', age: 39, accent: 'us',
    personality: 'Busy mom with noisy kids in the background. Friendly but rushed, and double-checks the order because her son is allergic to nuts.',
    look: look(2, HAIR.brown, 'ponytail', '#e07a5f'), voice: { pitch: 1.1, rate: 1.1 },
  }),
  npc({
    id: 'harold', name: 'Harold Grimes', role: 'Grumpy Neighbor', roleKo: '까칠한 할아버지', gender: 'male', age: 71, accent: 'us',
    personality: 'Grumpy retired man who complains about everything: the price, the temperature, young people today. Secretly kind if the learner stays patient and polite.',
    look: look(1, HAIR.white, 'bald', '#7f5539', { accessory: 'glasses', facialHair: 'beard' }), voice: { pitch: 0.8, rate: 0.9 },
  }),

  // ── Phone calls ─────────────────────────────────────────────────────
  npc({
    id: 'grace', name: 'Grace Holt', role: "Receptionist at St. Mary's Hospital", roleKo: '병원 접수 담당자', gender: 'female', age: 45, accent: 'us',
    personality: 'Calm, efficient hospital receptionist on the phone. Speaks clearly, asks for details one at a time, repeats numbers and dates back to confirm them.',
    look: look(3, HAIR.dark, 'bun', '#8ecae6', { accessory: 'headset' }), voice: { pitch: 1, rate: 1 },
  }),
  npc({
    id: 'raj', name: 'Raj Mehta', role: 'Customer Support Agent at Pixel Tech', roleKo: '고객센터 상담원', gender: 'male', age: 32, accent: 'in',
    personality: 'Patient, polite call-center agent who follows a script ("Have you tried restarting it?"). Asks for an account number and walks the caller through troubleshooting step by step.',
    look: look(3, HAIR.black, 'short', '#219ebc', { accessory: 'headset' }), voice: { pitch: 1, rate: 1.05 },
  }),
  npc({
    id: 'clara', name: 'Coach Clara', role: 'English Coach', roleKo: '영어 코치', gender: 'female', age: 35, accent: 'uk',
    personality: 'Warm, upbeat English coach who calls learners for short practice sessions. Encouraging and patient, asks one clear question at a time and loves specific details.',
    look: look(0, HAIR.auburn, 'bob', '#2a9d8f', { accessory: 'glasses' }), voice: { pitch: 1.05, rate: 0.95 },
  }),
  npc({
    id: 'dexter', name: "'Bank Security'", role: 'Phone Scammer', roleKo: '보이스피싱범', gender: 'male', age: 40, accent: 'us',
    personality: "A phone scammer pretending to be from Elden National Bank's security team. Sounds official and urgent ('your account has been compromised'), pushes for card numbers, PINs and codes, and gets evasive when asked for proof.",
    look: look(2, HAIR.dark, 'side', '#495057', { accessory: 'headset' }), voice: { pitch: 0.95, rate: 1.15 },
  }),

  // ── Passersby (free small talk with anyone on the street) ───────────
  npc({
    id: 'pat', name: 'Pat Duffy', role: 'Jogger', roleKo: '조깅하는 사람', gender: 'male', age: 33, accent: 'us',
    personality: 'Friendly, slightly out-of-breath jogger taking a break. Loves running routes, smoothies and complaining about hills.',
    look: look(2, HAIR.brown, 'buzz', '#52b788', { accessory: 'cap' }), voice: { pitch: 1, rate: 1.1 },
  }),
  npc({
    id: 'olivia', name: 'Olivia Grant', role: 'Office Worker on a Coffee Break', roleKo: '커피 타임 중인 직장인', gender: 'female', age: 29, accent: 'us',
    personality: 'Chatty office worker on a coffee break. Talks about work, weekend plans and the best lunch spots; a little sarcastic about her boss.',
    look: look(1, HAIR.dark, 'long', '#457b9d', { accessory: 'earrings' }), voice: { pitch: 1.1, rate: 1.05 },
  }),
  npc({
    id: 'marcus', name: 'Marcus Bell', role: 'Street Musician', roleKo: '거리 음악가', gender: 'male', age: 26, accent: 'us',
    personality: 'Laid-back street musician with a guitar. Easygoing, curious about people, talks about music and dreams of playing at Moonlight Lounge.',
    look: look(4, HAIR.black, 'afro', '#fb5607', { facialHair: 'stubble' }), voice: { pitch: 0.95, rate: 0.95 },
  }),
  npc({
    id: 'june', name: 'June Whitaker', role: 'Retired Librarian Walking Her Dog', roleKo: '강아지 산책 중인 은퇴한 사서', gender: 'female', age: 68, accent: 'uk',
    personality: 'Gentle retired librarian walking her small dog, Biscuit. Loves books, local history and giving slightly old-fashioned advice.',
    look: look(0, HAIR.white, 'bun', '#b5838d', { accessory: 'glasses' }), voice: { pitch: 1.05, rate: 0.9 },
  }),
  npc({
    id: 'diego', name: 'Diego Ramos', role: 'College Student', roleKo: '대학생', gender: 'male', age: 20, accent: 'us',
    personality: 'Energetic college student between classes. Uses casual slang, talks about exams, part-time jobs and cheap places to eat.',
    look: look(2, HAIR.black, 'curly', '#6a4c93'), voice: { pitch: 1.1, rate: 1.15 },
  }),
  npc({
    id: 'amara', name: 'Amara Okoye', role: 'Artist Sketching in the Park', roleKo: '공원에서 스케치하는 화가', gender: 'female', age: 31, accent: 'au',
    personality: 'Dreamy, observant artist with a sketchbook. Notices small details, asks unusual questions and loves hearing where people come from.',
    look: look(5, HAIR.black, 'afro', '#e9c46a', { accessory: 'earrings' }), voice: { pitch: 1.05, rate: 0.95 },
  }),
];

/** Characters that can be met by walking up to any pedestrian. */
export const PASSERBY_IDS = ['pat', 'olivia', 'marcus', 'june', 'diego', 'amara'] as const;

export const NPC_BY_ID: ReadonlyMap<string, Npc> = new Map(NPCS.map((n) => [n.id, n]));

export function getNpc(id: string): Npc {
  const found = NPC_BY_ID.get(id);
  if (!found) throw new Error(`Unknown NPC: ${id}`);
  return found;
}
