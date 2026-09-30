// Phone calls: audio-only conversations. No face, no gestures — the hardest (and most realistic) listening practice.
// Outgoing calls are made from the phone's Call app; incoming ones ring while the learner walks around.
import type { Scenario } from '../types';
import { obj, ph } from './story';

export const CALL_SCENARIOS: readonly Scenario[] = [
  {
    id: 'call_restaurant', kind: 'call', placeId: 'restaurant', npcId: 'marco',
    title: { en: 'Book a Table', ko: '레스토랑 예약 전화' },
    brief: {
      en: "Call Luigi's Trattoria and book a table for this Saturday evening. Give the number of people, a time and your name (spell it!).",
      ko: '루이지 트라토리아에 전화해서 이번 토요일 저녁 테이블을 예약하세요. 인원, 시간, 이름(철자까지!)을 알려 주세요.',
    },
    playerRole: 'a customer calling to make a dinner reservation',
    setting: "A phone call to Luigi's Trattoria. You answer the restaurant phone during a busy dinner service; there is kitchen noise behind you. You cannot see the caller.",
    npcBrief: "Answer the phone ('Luigi's Trattoria, Marco speaking'). Ask for the day, time, number of people and a name, one at a time. Saturday at 7 is full: offer 6:30 or 8:15 instead. Ask them to spell the name and repeat the booking back at the end. If they mention a special occasion, offer a free dessert.",
    opening: { en: "Luigi's Trattoria, Marco speaking. How can I help you?", ko: '루이지 트라토리아, 마르코입니다. 무엇을 도와드릴까요?' },
    objectives: [
      obj('o1', 'Say you want to make a reservation', '예약하고 싶다고 말하기', 'The learner says they want to book or reserve a table.'),
      obj('o2', 'Give the number of people and a time', '인원과 시간 말하기', 'The learner gives both the number of people and a time (accepting an alternative time counts).'),
      obj('o3', 'Give and spell your name', '이름 알려 주고 철자 말하기', 'The learner gives their name and spells it (letter by letter) when asked.'),
      obj('b1', 'Mention a special occasion', '특별한 날이라고 말하기', 'The learner mentions a birthday, anniversary or other special occasion, or makes a special request (window seat, etc.).', true),
    ],
    phrases: [
      ph("Hi, I'd like to make a reservation, please.", '안녕하세요, 예약하고 싶은데요.'),
      ph('A table for four on Saturday evening.', '토요일 저녁에 4명 자리요.'),
      ph('Is 8:15 available?', '8시 15분 가능한가요?'),
      ph("It's under Kim. K-I-M.", '김으로 해 주세요. K-I-M.'),
      ph("It's my friend's birthday.", '친구 생일이에요.'),
    ],
    maxTurns: 10, difficulty: 2, reward: { cash: 60, xp: 100 },
  },
  {
    id: 'call_pizza', kind: 'call', placeId: 'pizzeria', npcId: 'tony',
    title: { en: 'Order a Pizza by Phone', ko: '전화로 피자 주문하기' },
    brief: {
      en: "You're hungry. Call Tony's Pizza, order a pizza (size and toppings), give your address and choose how to pay.",
      ko: '배가 고파요. 토니스 피자에 전화해서 피자를 주문하고(크기, 토핑), 주소를 알려 주고, 결제 방법을 정하세요.',
    },
    playerRole: 'a hungry customer ordering a pizza for delivery',
    setting: "A phone call to Tony's Pizza on a busy Friday night. You cannot see the caller.",
    npcBrief: "Answer ('Tony's Pizza, what can I get ya?'). Ask: delivery or pickup, size (small, medium, large), toppings, anything else (garlic knots, drinks), the delivery address and a phone number, and cash or card. Suggest today's special (two large pizzas for $25). Read the order back and give a delivery time of 35 minutes.",
    opening: { en: "Tony's Pizza! What can I get ya?", ko: '토니스 피자! 뭘 드릴까요?' },
    objectives: [
      obj('o1', 'Order a pizza with a size and toppings', '크기와 토핑을 정해 주문하기', 'The learner orders a pizza and gives a size and at least one topping or pizza type.'),
      obj('o2', 'Give your delivery address', '배달 주소 알려 주기', 'The learner gives a delivery address.'),
      obj('o3', 'Choose how to pay', '결제 방법 정하기', 'The learner says whether they will pay by cash or card.'),
      obj('b1', 'Ask how long it will take', '배달 시간 물어보기', 'The learner asks how long the delivery will take.', true),
    ],
    phrases: [
      ph("I'd like to order a pizza for delivery.", '배달로 피자 주문하고 싶어요.'),
      ph('Can I get a large pepperoni?', '라지 페퍼로니 하나 주세요.'),
      ph('My address is 42 Pine Street.', '주소는 파인 스트리트 42번지예요.'),
      ph("I'll pay by card.", '카드로 계산할게요.'),
      ph('How long will it take?', '얼마나 걸려요?'),
    ],
    maxTurns: 10, difficulty: 1, reward: { cash: 50, xp: 90 },
  },
  {
    id: 'call_doctor', kind: 'call', placeId: 'hospital', npcId: 'grace',
    title: { en: "Doctor's Appointment", ko: '진료 예약 전화' },
    brief: {
      en: "You've had a sore throat for three days. Call St. Mary's Hospital, describe your symptoms briefly and book an appointment that fits your schedule.",
      ko: '3일째 목이 아파요. 세인트 메리 병원에 전화해서 증상을 간단히 말하고, 일정에 맞는 진료 예약을 잡으세요.',
    },
    playerRole: 'a patient calling to book a doctor’s appointment for a sore throat',
    setting: "A phone call to the reception desk at St. Mary's Hospital. You cannot see the caller.",
    npcBrief: "Answer politely. Ask what the problem is and how long they've had it, whether they are a new patient, their date of birth and a phone number. Offer two slots: tomorrow at 9:40 a.m. or Thursday at 3:15 p.m. Confirm the booking by repeating it and remind them to arrive ten minutes early with ID.",
    opening: { en: "St. Mary's Hospital, this is Grace speaking. How may I help you?", ko: '세인트 메리 병원, 그레이스입니다. 무엇을 도와드릴까요?' },
    objectives: [
      obj('o1', 'Say you want an appointment', '진료 예약하고 싶다고 말하기', 'The learner asks to make or book an appointment.'),
      obj('o2', 'Describe your symptoms', '증상 설명하기', 'The learner describes their symptoms and says how long they have had them.'),
      obj('o3', 'Choose an appointment time', '예약 시간 정하기', 'The learner chooses one of the offered times or suggests another time.'),
      obj('b1', 'Confirm the details', '예약 내용 확인하기', 'The learner repeats or double-checks the appointment day and time.', true),
    ],
    phrases: [
      ph("I'd like to make an appointment, please.", '진료 예약을 하고 싶어요.'),
      ph("I've had a sore throat for three days.", '3일째 목이 아파요.'),
      ph("I'm a new patient.", '처음 방문하는 환자예요.'),
      ph('Thursday afternoon works for me.', '목요일 오후가 좋아요.'),
      ph('Could you repeat that, please?', '다시 한번 말씀해 주시겠어요?'),
    ],
    maxTurns: 10, difficulty: 2, reward: { cash: 60, xp: 110 },
  },
  {
    id: 'call_support', kind: 'call', placeId: 'techstore', npcId: 'raj',
    title: { en: 'Internet Help Line', ko: '인터넷 고객센터' },
    brief: {
      en: "Your home internet stopped working this morning. Call Pixel Tech support, explain the problem, follow the agent's steps and ask for a technician if it still doesn't work.",
      ko: '오늘 아침부터 집 인터넷이 안 돼요. 픽셀 테크 고객센터에 전화해서 문제를 설명하고, 상담원의 안내를 따라 하고, 그래도 안 되면 기사 방문을 요청하세요.',
    },
    playerRole: 'a customer whose home internet stopped working',
    setting: 'A customer-support phone line with hold music before you answer. You cannot see the caller.',
    npcBrief: "Follow a support script: greet, ask for the account number or the phone number on the account, ask what the problem is and when it started, then guide them step by step: check the lights on the router, unplug it for 30 seconds, plug it back in. It still doesn't work. Only when they ask, book a technician visit (tomorrow between 1 and 5 p.m.). Stay polite even if they get frustrated.",
    opening: { en: 'Thank you for calling Pixel Tech support, my name is Raj. How can I help you today?', ko: '픽셀 테크 고객센터에 전화해 주셔서 감사합니다. 저는 라지입니다. 무엇을 도와드릴까요?' },
    objectives: [
      obj('o1', 'Explain the problem', '문제 설명하기', 'The learner explains that the internet is not working and when it started.'),
      obj('o2', 'Follow the troubleshooting steps', '안내에 따라 조치하기', "The learner responds to the agent's instructions (e.g. says they restarted the router or describes the lights)."),
      obj('o3', 'Ask for a technician visit', '기사 방문 요청하기', 'The learner asks for someone to come and fix it, or asks what the next step is.'),
      obj('b1', 'Stay polite and clear', '끝까지 정중하게', 'The learner stays polite and thanks the agent at the end.', true),
    ],
    phrases: [
      ph("My internet isn't working.", '인터넷이 안 돼요.'),
      ph('It stopped working this morning.', '오늘 아침부터 안 돼요.'),
      ph("I've already restarted the router.", '공유기는 이미 재시작했어요.'),
      ph('The light is blinking red.', '불이 빨간색으로 깜빡여요.'),
      ph('Could you send a technician?', '기사님을 보내 주실 수 있나요?'),
    ],
    maxTurns: 10, difficulty: 3, reward: { cash: 80, xp: 130 },
  },
  {
    id: 'call_coach', kind: 'call', npcId: 'clara',
    title: { en: 'Coaching Call', ko: '약점 집중 코칭 전화' },
    brief: {
      en: 'Coach Clara calls for a short practice session built around your weak points. Answer in full sentences and try to use the grammar she is targeting.',
      ko: '클라라 코치가 당신의 약점에 맞춘 짧은 연습 전화를 걸어요. 완전한 문장으로 대답하고, 코치가 노리는 문법을 써 보세요.',
    },
    playerRole: 'an English learner on a practice call with their coach',
    setting: 'A friendly video-less practice call with the learner’s English coach.',
    npcBrief: "Say hi and explain today's mini practice in one sentence (without grammar jargon). Then run a natural, fun conversation that makes the learner use their focus areas again and again (see 'Learner focus'). If there is no focus, practice full sentences and questions. Ask one question at a time and react to the answers. Do not correct them yourself — just keep them talking.",
    opening: { en: "Hi, it's Coach Clara! Have you got five minutes for a quick practice chat?", ko: '안녕하세요, 클라라 코치예요! 5분만 짧게 연습해 볼까요?' },
    objectives: [
      obj('o1', 'Answer three questions in full sentences', '세 질문에 완전한 문장으로 답하기', 'Over the conversation, the learner has answered at least three questions with full sentences.'),
      obj('o2', 'Use your focus grammar correctly', '약점 문법을 정확하게 쓰기', "The learner correctly uses the grammar from the learner focus at least twice (if there is no focus: asks the coach a question)."),
      obj('b1', 'Ask the coach a question back', '코치에게 되묻기', 'The learner asks the coach a natural follow-up question.', true),
    ],
    phrases: [
      ph('Sure, I have a few minutes.', '네, 몇 분 괜찮아요.'),
      ph('Let me think…', '음, 생각해 볼게요…'),
      ph('What about you?', '코치님은요?'),
      ph('Could you say that again?', '다시 말씀해 주시겠어요?'),
    ],
    maxTurns: 10, difficulty: 2, reward: { cash: 40, xp: 140 },
  },
  {
    // Rings once whenever the player reaches a new rank; the debrief's level estimate may suggest a harder level.
    id: 'call_promotion', kind: 'call', npcId: 'clara', incoming: true,
    title: { en: 'Promotion Test', ko: '승급 시험' },
    brief: {
      en: 'You reached a new rank! Coach Clara calls for a quick level check. Answer her questions as fully as you can — if you do well, she may suggest moving up a level.',
      ko: '새 칭호를 달성했어요! 클라라 코치가 짧은 실력 점검 전화를 걸어요. 최대한 길고 완전하게 대답해 보세요. 잘하면 레벨을 올려 보자고 제안할 거예요.',
    },
    playerRole: 'an English learner who just reached a new rank in Elden City',
    setting: "A short congratulation-and-check-in call from the learner's English coach.",
    npcBrief: "Congratulate the learner warmly on their new standing in the city. Then run a quick level check: ask four questions that get gradually harder — 1) describe your week in Elden City, 2) compare two places in the city, 3) a hypothetical ('What would you do if you won a free trip anywhere?'), 4) an opinion with reasons ('Is it better to live downtown or by the beach? Why?'). One question at a time, react briefly and naturally, never correct them. After the fourth answer, thank them and say you will send your assessment right after the call.",
    opening: { en: "Hello, it's Coach Clara! I just heard the news — congratulations! Have you got a minute for a quick check-in?", ko: '안녕하세요, 클라라 코치예요! 방금 소식 들었어요. 축하해요! 잠깐 실력 점검 좀 해 볼까요?' },
    objectives: [
      obj('o1', 'Answer all four questions', '네 질문에 모두 답하기', 'Over the conversation, the learner has answered four different questions from the coach.'),
      obj('o2', 'Give an opinion with a reason', '이유를 들어 의견 말하기', 'The learner gives an opinion and supports it with at least one reason (because, since, that is why, etc.).'),
      obj('b1', "Answer the 'what would you do' question with would", '"무엇을 하겠어요?" 질문에 would로 답하기', "The learner answers the hypothetical question using 'would' or ''d' correctly.", true),
    ],
    phrases: [
      ph('This week I…', '이번 주에 저는…'),
      ph('Compared to the beach, downtown is…', '해변에 비해 다운타운은…'),
      ph("If I won a free trip, I'd go to…", '무료 여행에 당첨되면 저는 …에 갈 거예요.'),
      ph("I think it's better to… because…", '저는 …하는 게 더 낫다고 생각해요. 왜냐하면…'),
    ],
    maxTurns: 10, difficulty: 2, reward: { cash: 100, xp: 150 },
  },
  {
    id: 'call_leo', kind: 'call', npcId: 'leo', incoming: true, freeTalk: true,
    title: { en: 'Leo Calling', ko: '레오의 전화' },
    brief: { en: 'Your cousin Leo is calling just to chat. Catch up!', ko: '사촌 레오가 그냥 수다 떨려고 전화했어요. 근황을 나눠요!' },
    playerRole: "Leo's cousin, who recently moved to Elden City",
    setting: 'Leo calls the learner on the phone while he is on a break at work.',
    npcBrief: 'Just checking in: ask how the new life in Elden City is going, what they did today, and share some funny news of your own. Keep it light and family-style.',
    opening: { en: "Yo, cuz! Just calling to see how you're doing. What's up?", ko: '야, 사촌! 그냥 어떻게 지내나 해서 전화했어. 뭐 해?' },
    openingPool: [
      { en: "Yo, cuz! Just calling to see how you're doing. What's up?", ko: '야, 사촌! 그냥 어떻게 지내나 해서 전화했어. 뭐 해?' },
      { en: "Hey hey! Guess who's bored at work? Tell me something fun.", ko: '헤이! 누가 회사에서 심심하게? 재밌는 얘기 좀 해 봐.' },
      { en: "Cuz! Quick question — have you tried the tacos at Carlos' yet?", ko: '사촌! 빨리 하나만 — 카를로스 타코 먹어 봤어?' },
    ],
    objectives: [],
    phrases: [
      ph('Not much, just exploring the city.', '별일 없어, 그냥 도시 구경 중이야.'),
      ph('Guess what happened today!', '오늘 무슨 일 있었는지 알아?'),
      ph('How about you?', '너는?'),
      ph('Talk to you later!', '나중에 얘기하자!'),
    ],
    maxTurns: 8, difficulty: 1, reward: { cash: 15, xp: 50 },
  },
  {
    id: 'call_scam', kind: 'call', npcId: 'dexter', incoming: true,
    title: { en: 'Suspicious Call', ko: '수상한 전화' },
    brief: {
      en: "Someone claiming to be from your bank says your card was hacked and asks for your details. Don't give anything away — ask questions and end the call safely.",
      ko: '은행이라고 주장하는 사람이 카드가 해킹됐다며 개인 정보를 요구해요. 아무것도 알려 주지 말고, 질문으로 확인한 뒤 안전하게 통화를 끝내세요.',
    },
    playerRole: 'a bank customer receiving an unexpected call',
    setting: 'An unexpected phone call from an unknown number. You cannot see the caller.',
    npcBrief: "Claim to be from Elden National Bank security: 'suspicious transactions' were detected. Create urgency. Ask for the full card number, then the PIN, then a verification code sent by text. When asked for proof or your employee ID, get vague. If the learner says they will call the bank themselves or refuses twice, give up and hang up rudely.",
    opening: { en: "Hello, this is Elden National Bank security. We've detected suspicious activity on your card. I need to verify your details right away.", ko: '안녕하세요, 엘든 국립은행 보안팀입니다. 고객님 카드에서 수상한 거래가 감지됐습니다. 지금 바로 정보를 확인해야 합니다.' },
    objectives: [
      obj('o1', 'Refuse to share your card details', '카드 정보 알려 주지 않기', 'The learner refuses to give card numbers, PINs or codes.'),
      obj('o2', 'Ask the caller to prove who they are', '신원 확인 요구하기', "The learner asks for the caller's name, employee ID, or other proof."),
      obj('o3', 'Say you will contact the bank yourself', '직접 은행에 연락하겠다고 말하기', 'The learner says they will call the bank directly or visit a branch.'),
      obj('b1', 'Stay calm and polite', '침착하고 정중하게', 'The learner stays calm and polite while being firm.', true),
    ],
    phrases: [
      ph("I'm not comfortable sharing that over the phone.", '전화로 그건 알려 드리기 곤란해요.'),
      ph('Can I have your name and employee ID?', '성함과 직원 번호를 알려 주시겠어요?'),
      ph("I'll call the bank directly.", '제가 은행에 직접 전화할게요.'),
      ph('Goodbye.', '끊을게요.'),
    ],
    maxTurns: 8, difficulty: 2, reward: { cash: 50, xp: 100 },
  },
];

export const OUTGOING_CALLS: readonly Scenario[] = CALL_SCENARIOS.filter((s) => !s.incoming && s.id !== 'call_coach');
/** Calls that may ring at random while roaming (the promotion test only rings on a new rank). */
export const INCOMING_CALLS: readonly Scenario[] = CALL_SCENARIOS.filter((s) => s.incoming && s.id !== 'call_promotion');
