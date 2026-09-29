import type { CarModelId, KeyPhrase, Localized, Objective, Scenario } from '../types';

export const obj = (id: string, en: string, ko: string, check: string, bonus = false): Objective =>
  bonus ? { id, label: { en, ko }, check, bonus } : { id, label: { en, ko }, check };
export const ph = (en: string, ko: string): KeyPhrase => ({ en, ko });

export const STORY_SCENARIOS: readonly Scenario[] = [
  {
    id: 'story_immigration', kind: 'story', placeId: 'airport', npcId: 'grant',
    title: { en: 'Welcome to Elden City', ko: '엘든 시티에 오신 걸 환영합니다' },
    brief: {
      en: "You just landed. Get through immigration by answering the officer clearly. (Your plan: visit your cousin Leo, look for work, and stay at the Grand Elden Hotel for two weeks.)",
      ko: '방금 착륙했어요. 입국 심사관의 질문에 또렷하게 답해 심사를 통과하세요. (당신의 계획: 사촌 레오 방문, 일자리 찾기, 그랜드 엘든 호텔에서 2주 숙박)',
    },
    playerRole: 'a traveler who just arrived at Elden International Airport',
    setting: 'The immigration counter at Elden International Airport. A long line of tired travelers waits behind the learner.',
    npcBrief: 'Ask one question at a time: the purpose of the visit, how long they will stay, and where they will stay. If an answer is vague, ask a follow-up. When the answers are clear, stamp the passport and say "Welcome to Elden City."',
    opening: { en: 'Next! Passport, please. What brings you to Elden City?', ko: '다음 분! 여권 주세요. 엘든 시티에는 무슨 일로 오셨나요?' },
    objectives: [
      obj('o1', 'Explain the purpose of your visit', '방문 목적 설명하기', 'The learner states the purpose of the visit (e.g. visiting family, work, tourism).'),
      obj('o2', 'Say how long you will stay', '체류 기간 말하기', 'The learner says how long they will stay.'),
      obj('o3', 'Say where you will stay', '숙소 말하기', 'The learner says where they will stay (a hotel or with family).'),
      obj('b1', 'Make the stern officer smile', '무뚝뚝한 심사관 웃게 만들기', 'The learner is especially polite or friendly (greeting, thanks, a light joke) and the officer visibly warms up.', true),
    ],
    phrases: [
      ph("I'm here to visit my cousin.", '사촌을 방문하러 왔어요.'),
      ph("I'm planning to stay for two weeks.", '2주 동안 머물 계획이에요.'),
      ph("I'll be staying at the Grand Elden Hotel.", '그랜드 엘든 호텔에 머물 거예요.'),
      ph("I'm also looking for a job here.", '여기서 일자리도 알아보려고요.'),
      ph("Here's my return ticket.", '여기 돌아가는 항공권이에요.'),
    ],
    maxTurns: 8, difficulty: 1, reward: { cash: 200, xp: 150 },
  },
  {
    id: 'story_meet_leo', kind: 'story', placeId: 'cafe', npcId: 'leo',
    title: { en: 'Family Reunion', ko: '가족 상봉' },
    brief: {
      en: 'Your cousin Leo is waiting at Bean There Café. Catch up, tell him about your trip, and ask him to help you find a job.',
      ko: '사촌 레오가 빈 데어 카페에서 기다리고 있어요. 근황을 나누고, 여행 이야기를 하고, 일자리 찾는 걸 도와 달라고 부탁하세요.',
    },
    playerRole: "Leo's cousin who just arrived in Elden City from abroad",
    setting: 'A sunny window table at Bean There Café downtown. Leo already ordered two iced coffees.',
    npcBrief: "You haven't seen your cousin in five years and you're thrilled. Ask about the flight and how they've been. Share a tip about the city. When they ask about work, say Nova Tech is hiring and that they should open a bank account first. At the end, hand over the keys to your old orange car, 'the Comet', so they can get around.",
    opening: { en: 'No way! Look at you! Come here, cuz! How was the flight?', ko: '말도 안 돼! 너 좀 봐! 이리 와, 사촌! 비행은 어땠어?' },
    objectives: [
      obj('o1', 'Tell Leo about your flight', '레오에게 비행 이야기하기', 'The learner describes the flight or trip with at least one detail.'),
      obj('o2', 'Ask Leo how he has been', '레오의 근황 묻기', "The learner asks Leo about his life (how he has been, his job, etc.)."),
      obj('o3', 'Ask for help finding a job', '일자리 찾는 도움 요청하기', 'The learner asks Leo for help or advice about finding a job.'),
      obj('b1', 'Make Leo laugh', '레오 웃기기', 'The learner says something funny or playful and Leo laughs.', true),
    ],
    phrases: [
      ph("It's so good to see you!", '만나서 너무 반가워!'),
      ph('The flight was long, but I slept most of the way.', '비행은 길었는데 거의 내내 잤어.'),
      ph('How have you been?', '어떻게 지냈어?'),
      ph("Do you know anyone who's hiring?", '사람 구하는 곳 아는 데 있어?'),
      ph('I owe you one.', '신세 한번 졌다.'),
    ],
    maxTurns: 10, difficulty: 1, reward: { cash: 150, xp: 150 },
    effects: [
      { type: 'giveCar', model: 'comet' },
      {
        type: 'message',
        from: 'leo',
        en: 'P.S. My friend Miseon hangs out at Moonlight Lounge downtown on jazz nights. Go say hi — in English! 😉',
        ko: '추신: 내 친구 미선이 재즈 나이트마다 다운타운 문라이트 라운지에 있어. 가서 인사해 봐 — 영어로! 😉',
      },
    ],
  },
  {
    id: 'story_hotel', kind: 'story', placeId: 'hotel', npcId: 'priya',
    title: { en: 'The Lost Reservation', ko: '사라진 예약' },
    brief: {
      en: "Leo says he booked you a room at the Grand Elden Hotel… but the hotel can't find it. Solve the problem and get a room.",
      ko: '레오가 그랜드 엘든 호텔을 예약했다는데… 호텔에서 예약을 못 찾는대요. 문제를 해결하고 방을 얻으세요.',
    },
    playerRole: 'a new arrival checking in; the reservation was supposedly made by their cousin Leo Park',
    setting: 'The elegant front desk of the Grand Elden Hotel in the evening.',
    npcBrief: "You cannot find a reservation under the learner's name. Ask them to spell their name, and ask who made the booking and for which dates. Once they mention Leo Park, find it under his name — but it's a small single room with no window. Offer an upgrade to a city-view room for $40 more per night and let the learner decide. Finish by mentioning breakfast (7 to 10 a.m.) and handing over the key card.",
    opening: { en: 'Good evening, and welcome to the Grand Elden Hotel. Are you checking in?', ko: '안녕하세요, 그랜드 엘든 호텔에 오신 것을 환영합니다. 체크인하시나요?' },
    objectives: [
      obj('o1', 'Spell your name', '이름 철자 말하기', 'The learner spells their name letter by letter or clearly gives their full name.'),
      obj('o2', 'Explain who made the booking', '예약한 사람 설명하기', 'The learner explains that their cousin (Leo / Leo Park) made the reservation.'),
      obj('o3', 'Decide about the room', '객실 결정하기', 'The learner clearly accepts or declines the room upgrade.'),
      obj('b1', 'Ask about hotel services', '호텔 서비스 문의하기', 'The learner asks about breakfast, Wi-Fi, checkout time or another hotel service.', true),
    ],
    phrases: [
      ph("I'd like to check in, please.", '체크인하려고요.'),
      ph('The reservation should be under Leo Park.', '예약은 레오 박 이름으로 되어 있을 거예요.'),
      ph('Could you check again, please?', '다시 한번 확인해 주시겠어요?'),
      ph('Is breakfast included?', '조식 포함인가요?'),
      ph("I'll take the upgrade.", '업그레이드할게요.'),
    ],
    maxTurns: 10, difficulty: 2, reward: { cash: 200, xp: 180 },
  },
  {
    id: 'story_bank', kind: 'story', placeId: 'bank', npcId: 'whitmore',
    title: { en: 'Money Talks', ko: '계좌 개설' },
    brief: {
      en: 'You need a bank account for your future paycheck. Open one at Elden National Bank.',
      ko: '앞으로 받을 월급을 위해 은행 계좌가 필요해요. 엘든 국립은행에서 계좌를 개설하세요.',
    },
    playerRole: 'a newcomer to Elden City opening their first bank account',
    setting: "A quiet advisor's desk inside Elden National Bank.",
    npcBrief: 'Ask which type of account they need (checking or savings — explain the difference if asked). Ask for ID and proof of address (a hotel booking is fine for newcomers). Mention the $5 monthly fee, waived with a minimum balance of $500. Ask whether they want a debit card.',
    opening: { en: 'Good afternoon. Please, have a seat. How may I help you today?', ko: '안녕하세요. 앉으시죠. 오늘은 무엇을 도와드릴까요?' },
    objectives: [
      obj('o1', 'Say what kind of account you want', '원하는 계좌 종류 말하기', 'The learner asks to open an account and chooses or asks about checking/savings.'),
      obj('o2', 'Provide ID and address details', '신분증과 주소 정보 제공하기', 'The learner offers identification (passport/ID) and explains their address or hotel stay.'),
      obj('o3', 'Ask about fees', '수수료 문의하기', 'The learner asks about fees, charges or a minimum balance.'),
      obj('b1', 'Request a debit card', '체크카드 신청하기', 'The learner asks for or agrees to get a debit card.', true),
    ],
    phrases: [
      ph("I'd like to open a checking account.", '입출금 계좌를 만들고 싶어요.'),
      ph("What's the difference between checking and savings?", '입출금 계좌랑 저축 계좌는 뭐가 달라요?'),
      ph('Are there any monthly fees?', '매달 나가는 수수료가 있나요?'),
      ph("Here's my passport.", '여기 제 여권이요.'),
      ph("I'm staying at a hotel for now.", '지금은 호텔에 머물고 있어요.'),
    ],
    maxTurns: 10, difficulty: 2, reward: { cash: 250, xp: 200 },
  },
  {
    id: 'story_interview', kind: 'story', placeId: 'office', npcId: 'sarahkim',
    title: { en: 'The Job Interview', ko: '면접' },
    brief: {
      en: 'Nova Tech invited you for an interview. Introduce yourself, talk about your strengths and experience, and ask a good question at the end.',
      ko: '노바 테크에서 면접을 보자고 연락이 왔어요. 자기소개를 하고, 강점과 경험을 이야기하고, 마지막에 좋은 질문을 해 보세요.',
    },
    playerRole: 'a job candidate interviewing for a junior position at Nova Tech (the learner can choose the role, e.g. designer, developer, marketing, customer support)',
    setting: 'A bright glass meeting room on the 30th floor of Nova Tech Tower.',
    npcBrief: 'Run a friendly but real job interview. Ask about their background, why Nova Tech, a strength with an example, and a time they solved a problem. Ask follow-ups when answers are vague. Near the end ask "Do you have any questions for me?". If they did reasonably well, tell them they got the job and start on Monday.',
    opening: { en: "Hi, you must be {player}. I'm Sarah, head of HR. Thanks for coming in! So, tell me a little about yourself.", ko: '안녕하세요, {player} 님이시죠? 인사팀장 사라예요. 와 주셔서 감사해요! 자, 자기소개를 간단히 해 주시겠어요?' },
    objectives: [
      obj('o1', 'Introduce yourself', '자기소개하기', 'The learner introduces themselves with some background (studies, work or skills).'),
      obj('o2', 'Explain why you want this job', '지원 동기 말하기', 'The learner gives a reason for wanting this job or company.'),
      obj('o3', 'Describe a strength with an example', '강점을 예시와 함께 말하기', 'The learner names a strength and supports it with an example or detail.'),
      obj('o4', 'Ask the interviewer a question', '면접관에게 질문하기', 'The learner asks a relevant question about the team, role, culture or next steps.'),
    ],
    phrases: [
      ph('I have three years of experience in customer service.', '고객 서비스 분야에서 3년 일했어요.'),
      ph("I'm a fast learner and I work well in a team.", '저는 배우는 속도가 빠르고 팀워크가 좋아요.'),
      ph('For example, in my last job, I…', '예를 들어, 이전 직장에서 저는…'),
      ph('What does a typical day look like in this role?', '이 직무의 하루는 보통 어떤가요?'),
      ph("I'm really excited about this opportunity.", '이번 기회가 정말 기대돼요.'),
    ],
    maxTurns: 12, difficulty: 3, reward: { cash: 500, xp: 300 },
  },
  {
    id: 'story_police_report', kind: 'story', placeId: 'police', npcId: 'rosa',
    title: { en: 'Stolen!', ko: '도난 신고' },
    brief: {
      en: "Leo's old orange car, the Comet, was stolen from the hotel parking lot last night. Report it to the police with as many details as you can.",
      ko: '레오가 준 주황색 차 "코멧"이 어젯밤 호텔 주차장에서 도난당했어요. 최대한 자세히 경찰에 신고하세요.',
    },
    playerRole: "the victim of a car theft; the car is an old orange compact called 'the Comet' with a dent on the back bumper, last seen in the Grand Elden Hotel parking lot last night",
    setting: 'The busy front desk of ECPD Central Station, phones ringing everywhere.',
    npcBrief: 'Take a stolen-vehicle report. Ask what happened, for a description of the car, where and when it was last seen, and for contact details. Ask them to repeat or slow down if something is unclear. Finish by giving the case number EC-4471 and promising to call with news.',
    opening: { en: 'ECPD, Sergeant Alvarez. What can I do for you?', ko: '엘든 경찰서, 알바레즈 경사입니다. 무엇을 도와드릴까요?' },
    objectives: [
      obj('o1', 'Report that your car was stolen', '차량 도난 알리기', 'The learner clearly reports that their car was stolen.'),
      obj('o2', 'Describe the car', '차량 묘사하기', 'The learner describes the car (color, type or distinctive features).'),
      obj('o3', 'Say where and when it happened', '언제 어디서였는지 말하기', 'The learner says where and when the car was last seen.'),
      obj('b1', 'Ask what happens next', '다음 절차 묻기', 'The learner asks about next steps or how long it might take.', true),
    ],
    phrases: [
      ph("I'd like to report a stolen car.", '차량 도난 신고를 하려고요.'),
      ph("It's an old orange compact with a dent on the back.", '뒤가 찌그러진 오래된 주황색 소형차예요.'),
      ph('I last saw it in the hotel parking lot last night.', '어젯밤 호텔 주차장에서 마지막으로 봤어요.'),
      ph('What happens next?', '이제 어떻게 되나요?'),
      ph('Please call me if you find anything.', '뭔가 찾으시면 연락 주세요.'),
    ],
    maxTurns: 10, difficulty: 2, reward: { cash: 150, xp: 220 },
  },
  {
    id: 'story_witness', kind: 'story', placeId: 'diner', npcId: 'dot',
    title: { en: 'The Witness', ko: '목격자' },
    brief: {
      en: 'A waitress at Harbor Diner saw someone driving an orange car toward the docks. Ask her questions and find out where the car went.',
      ko: '하버 다이너의 웨이트리스가 주황색 차가 부두 쪽으로 가는 걸 봤대요. 질문을 해서 차가 어디로 갔는지 알아내세요.',
    },
    playerRole: "someone looking for their stolen orange car, 'the Comet'",
    setting: 'Harbor Diner at the docks, smelling of coffee and pancakes. Dot is refilling mugs.',
    npcBrief: "You saw the car early this morning. Share information only when asked specific questions, and drift into gossip sometimes. Details: around 6 a.m.; a tall man in a red cap with an anchor tattoo on his arm; he drove the orange car into Rusty's Garage on the east side of town; he ordered black coffee and paid cash. If the learner orders something, be delighted.",
    opening: { en: "Mornin', hon! Coffee? You look like you've had a rough night.", ko: '좋은 아침, 자기! 커피 줄까? 밤새 고생한 얼굴이네.' },
    objectives: [
      obj('o1', 'Ask if she saw the orange car', '주황색 차를 봤는지 묻기', 'The learner asks whether she saw an orange car or anything unusual.'),
      obj('o2', 'Get a description of the driver', '운전자 인상착의 알아내기', 'The learner asks what the driver looked like and gets a description.'),
      obj('o3', 'Find out where the car went', '차가 간 곳 알아내기', "The learner asks and learns where the car went (Rusty's Garage)."),
      obj('b1', 'Order something from the diner', '다이너에서 주문하기', 'The learner orders food or a drink.', true),
    ],
    phrases: [
      ph('Did you happen to see an orange car this morning?', '혹시 오늘 아침에 주황색 차 보셨어요?'),
      ph('What did the driver look like?', '운전자는 어떻게 생겼었나요?'),
      ph('Which way did he go?', '그 사람 어느 쪽으로 갔어요?'),
      ph("That's really helpful, thank you.", '정말 도움이 됐어요. 감사해요.'),
      ph("I'll have a coffee, please.", '커피 한 잔 주세요.'),
    ],
    maxTurns: 10, difficulty: 2, reward: { cash: 150, xp: 220 },
  },
  {
    id: 'story_chopshop', kind: 'story', placeId: 'garage', npcId: 'rusty',
    title: { en: 'Chop Shop', ko: '수상한 정비소' },
    brief: {
      en: "Your car is at Rusty's Garage. Confront Rusty calmly but firmly and get the Comet back — without starting a fight.",
      ko: '차가 러스티 정비소에 있어요. 침착하지만 단호하게 러스티를 설득해 코멧을 되찾으세요. 싸움은 금물!',
    },
    playerRole: "the owner of the stolen orange car 'the Comet' (dent on the back bumper), who has a police case number EC-4471",
    setting: "Rusty's Garage on the industrial east side. The orange Comet is half-hidden under a tarp in the corner.",
    npcBrief: "At first deny everything and act annoyed ('Never seen it'). Truth: a guy called 'Red' brought the car in and claimed it was his. If the learner stays calm and gives clear evidence (the car's description, the dent, the case number) or mentions the police, admit it and agree to return the car. If they are rude or threatening, get defensive. As an apology, say you already fixed and tuned up the engine for free.",
    opening: { en: "We're closed. Unless you're here to pay a bill, I got nothin' for ya.", ko: '문 닫았어. 수리비 내러 온 거 아니면 볼일 없어.' },
    objectives: [
      obj('o1', 'Explain why you are here', '온 이유 설명하기', 'The learner explains they are looking for their stolen car.'),
      obj('o2', 'Present evidence', '증거 제시하기', 'The learner gives specific evidence (car description, the dent, plate or the police case number).'),
      obj('o3', 'Get Rusty to return the car', '러스티가 차를 돌려주게 하기', 'Rusty agrees to give the car back.'),
      obj('b1', 'Stay calm and polite the whole time', '끝까지 침착하고 예의 바르게', 'The learner never insults or threatens; they stay calm but firm.', true),
    ],
    phrases: [
      ph("I'm not here to cause trouble.", '문제 일으키러 온 거 아니에요.'),
      ph('That orange car under the tarp is mine.', '방수포 밑 저 주황색 차, 제 거예요.'),
      ph('I have a police case number.', '경찰 사건 번호도 있어요.'),
      ph("Let's handle this the easy way.", '좋게 해결하죠.'),
      ph("I'd rather not call the police, but I will.", '경찰은 부르고 싶지 않지만, 필요하면 부를 거예요.'),
    ],
    maxTurns: 12, difficulty: 3, reward: { cash: 300, xp: 300 },
    effects: [{ type: 'giveCar', model: 'comet_gt' }],
  },
  {
    id: 'story_pitch', kind: 'story', placeId: 'investor', npcId: 'victoria',
    title: { en: 'The Pitch', ko: '투자 피칭' },
    brief: {
      en: 'Leo wants to start a food truck business with you. Pitch the idea to investor Victoria Chen and convince her to invest.',
      ko: '레오가 당신과 푸드 트럭 사업을 하고 싶어 해요. 투자자 빅토리아 첸에게 아이디어를 발표하고 투자를 이끌어 내세요.',
    },
    playerRole: 'co-founder (with cousin Leo) of a new food truck startup in Elden City; the learner can invent the concept (e.g. Korean-Mexican fusion tacos)',
    setting: 'A sleek conference room at Skyline Capital overlooking the whole city. Victoria has exactly ten minutes.',
    npcBrief: "Be a tough but fair investor. Ask: What's the idea? Who are the customers? How will you make money? What makes you different from Carlos' Taco Truck? How much money do you need and for what? Interrupt vague answers. If the learner gives clear, confident answers with at least some numbers, offer $50,000 for 20% of the company.",
    opening: { en: "You've got ten minutes. Impress me. What's the big idea?", ko: '10분 드릴게요. 저를 놀라게 해 보세요. 핵심 아이디어가 뭐죠?' },
    objectives: [
      obj('o1', 'Explain the business idea', '사업 아이디어 설명하기', 'The learner clearly explains the food truck concept.'),
      obj('o2', 'Describe your target customers', '타깃 고객 설명하기', 'The learner describes who the customers are.'),
      obj('o3', 'Explain what makes you different', '차별점 설명하기', 'The learner explains their advantage over competitors.'),
      obj('o4', 'Ask for a specific amount', '투자 금액 제시하기', 'The learner states how much investment they need and what it is for.'),
      obj('b1', 'Back it up with numbers', '숫자로 뒷받침하기', 'The learner supports the pitch with concrete numbers (prices, costs, customers per day, profit).', true),
    ],
    phrases: [
      ph('Our idea is simple: …', '저희 아이디어는 간단합니다…'),
      ph('Our target customers are office workers downtown.', '저희 타깃은 도심의 직장인입니다.'),
      ph('What makes us different is…', '저희의 차별점은…'),
      ph("We're looking for $50,000 for a truck and equipment.", '트럭과 장비 구입을 위해 5만 달러를 찾고 있습니다.'),
      ph('We expect to break even in six months.', '6개월 안에 손익분기점을 넘길 것으로 봅니다.'),
    ],
    maxTurns: 12, difficulty: 3, reward: { cash: 1000, xp: 400 },
  },
  {
    id: 'story_tv', kind: 'story', placeId: 'studio', npcId: 'jake',
    title: { en: 'Live on Elden Tonight', ko: '엘든 투나잇 생방송' },
    brief: {
      en: "From newcomer to local hero! You're a guest on the city's favorite talk show. Tell your story, handle surprise questions and charm the audience.",
      ko: '신참에서 지역 스타로! 도시 최고의 인기 토크쇼 게스트가 됐어요. 당신의 이야기를 들려주고, 돌발 질문에 답하고, 관객을 사로잡으세요.',
    },
    playerRole: 'a newcomer who became a local celebrity: arrived recently, got a job at Nova Tech, tracked down a stolen car, and is launching a food truck with cousin Leo',
    setting: "The bright studio of the live show 'Elden Tonight', with a cheering studio audience.",
    npcBrief: "Host a fun, fast live interview. Ask about first impressions of Elden City, the stolen-car adventure, the food truck, and one surprise personal question (e.g. 'What do you miss most about home?'). React with jokes. End by thanking the guest and asking the audience to applaud.",
    opening: { en: "Ladies and gentlemen, please welcome Elden City's favorite newcomer, {player}! Welcome to the show!", ko: '신사 숙녀 여러분, 엘든 시티가 사랑하는 신참, {player} 씨를 환영해 주세요! 쇼에 오신 걸 환영합니다!' },
    objectives: [
      obj('o1', 'Share your first impression of the city', '도시의 첫인상 말하기', 'The learner describes their first impressions of Elden City.'),
      obj('o2', 'Tell the story of the stolen car', '도난 사건 이야기하기', 'The learner tells the story of the stolen car with some details.'),
      obj('o3', 'Promote the food truck', '푸드 트럭 홍보하기', 'The learner describes the food truck business and invites people to try it.'),
      obj('b1', 'Make the audience laugh', '관객 웃기기', 'The learner makes a joke or humorous remark that gets a laugh.', true),
    ],
    phrases: [
      ph('When I first arrived, I was completely lost.', '처음 도착했을 땐 완전히 길을 잃었어요.'),
      ph("You won't believe what happened next.", '다음에 무슨 일이 있었는지 믿기 힘드실 거예요.'),
      ph('Long story short, I got my car back.', '간단히 말하면, 차를 되찾았죠.'),
      ph('Come by and try our tacos!', '저희 타코 먹으러 오세요!'),
      ph("It's been an amazing journey.", '정말 놀라운 여정이었어요.'),
    ],
    maxTurns: 12, difficulty: 3, reward: { cash: 1500, xp: 500 },
  },
];

export type ContactId = 'leo' | 'novatech' | 'rosa' | 'unknown' | 'etv' | 'miseon';

export const CONTACTS: Record<ContactId, { name: Localized; color: string }> = {
  leo: { name: { en: 'Leo (Cousin)', ko: '레오 (사촌)' }, color: '#e4572e' },
  novatech: { name: { en: 'Nova Tech HR', ko: '노바 테크 인사팀' }, color: '#3d5a80' },
  rosa: { name: { en: 'Sgt. Alvarez', ko: '알바레즈 경사' }, color: '#1d3557' },
  unknown: { name: { en: 'Unknown Number', ko: '발신자 불명' }, color: '#6b7280' },
  etv: { name: { en: 'ETV Studios', ko: 'ETV 방송국' }, color: '#7b2cbf' },
  miseon: { name: { en: 'Miseon 💕', ko: '미선 💕' }, color: '#ff8fab' },
};

export interface StoryStep {
  scenarioId: string;
  /** Text message that introduces the chapter. English is the in-game text; Korean is the optional translation. */
  message?: { from: ContactId; en: string; ko: string };
  onStart?: { type: 'loseCar'; model: CarModelId };
}

export const STORY: readonly StoryStep[] = [
  { scenarioId: 'story_immigration' },
  {
    scenarioId: 'story_meet_leo',
    message: {
      from: 'leo',
      en: "Hey cuz!! Welcome to Elden City!! 🎉 Grab one of the green City Share cars and meet me at Bean There Café downtown. Coffee's on me ☕",
      ko: '사촌!! 엘든 시티에 온 걸 환영해!! 🎉 초록색 시티 셰어 차 하나 타고 다운타운 빈 데어 카페로 와. 커피는 내가 쏠게 ☕',
    },
  },
  {
    scenarioId: 'story_hotel',
    message: {
      from: 'leo',
      en: "Your room is at the Grand Elden Hotel. I booked it for you. I think. Probably. 😅 Take the Comet, she's parked right outside!",
      ko: '방은 그랜드 엘든 호텔에 잡아 뒀어. 아마도. 그랬을 거야. 😅 코멧 타고 가, 바로 밖에 세워 뒀어!',
    },
  },
  {
    scenarioId: 'story_bank',
    message: {
      from: 'leo',
      en: "Next step: a bank account, so you can actually get paid. Elden National Bank is downtown. Wear something nice lol",
      ko: '다음 단계: 월급 받으려면 은행 계좌가 있어야지. 엘든 국립은행이 다운타운에 있어. 옷 좀 잘 입고 가 ㅋㅋ',
    },
  },
  {
    scenarioId: 'story_interview',
    message: {
      from: 'novatech',
      en: 'Dear candidate, thank you for your application. We would like to invite you to an interview at Nova Tech Tower. Please visit us at your earliest convenience. — Sarah Kim, HR',
      ko: '지원해 주셔서 감사합니다. 노바 테크 타워에서 면접을 진행하고자 합니다. 편하신 때에 방문해 주세요. — 인사팀 사라 김',
    },
  },
  {
    scenarioId: 'story_police_report',
    onStart: { type: 'loseCar', model: 'comet' },
    message: {
      from: 'leo',
      en: "DUDE. Congrats on the job!!! But… where's the Comet?? I just walked past the hotel lot and it's GONE. Go to the police station, NOW! 🚨",
      ko: '야!! 취업 축하해!!! 근데… 코멧 어디 있어?? 방금 호텔 주차장 지나왔는데 차가 없어. 당장 경찰서 가 봐! 🚨',
    },
  },
  {
    scenarioId: 'story_witness',
    message: {
      from: 'rosa',
      en: 'Sgt. Alvarez here, case EC-4471. A waitress at Harbor Diner reported an orange car heading toward the docks early this morning. You might want to talk to her.',
      ko: '알바레즈 경사입니다. 사건 EC-4471 관련입니다. 하버 다이너의 웨이트리스가 오늘 새벽 주황색 차가 부두 쪽으로 가는 걸 봤다고 합니다. 직접 이야기해 보세요.',
    },
  },
  {
    scenarioId: 'story_chopshop',
    message: {
      from: 'unknown',
      en: "heard you're looking for an orange car. try Rusty's Garage on the east side. you didn't hear it from me.",
      ko: '주황색 차 찾는다며. 동쪽 러스티 정비소에 가 봐. 내가 말했다고 하진 마.',
    },
  },
  {
    scenarioId: 'story_pitch',
    message: {
      from: 'leo',
      en: "Crazy idea: let's start a FOOD TRUCK together! 🌮🚚 I got us a meeting at Skyline Capital. You do the talking — you're the smooth one now 😎",
      ko: '미친 아이디어 하나: 우리 같이 푸드 트럭 하자! 🌮🚚 스카이라인 캐피털이랑 미팅 잡았어. 발표는 네가 해 — 이제 말은 네가 더 잘하잖아 😎',
    },
  },
  {
    scenarioId: 'story_tv',
    message: {
      from: 'etv',
      en: "Hello! Your story is all over the city. We'd love to have you as a guest on tonight's live show, 'Elden Tonight'. Please come to ETV Studios!",
      ko: '안녕하세요! 당신의 이야기가 도시 전체에 화제예요. 오늘 밤 생방송 "엘든 투나잇"에 게스트로 모시고 싶습니다. ETV 방송국으로 와 주세요!',
    },
  },
];
