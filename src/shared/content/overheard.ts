// Conversations the learner can overhear on the street (👂). Two passersby talk; afterwards a quick
// listening question checks what the learner understood. Client-only content: nothing here reaches the AI.
import type { Localized } from '../types';

export interface OverheardLine {
  /** Which of the two speakers says it. */
  who: 0 | 1;
  en: string;
  ko: string;
}

export interface Overheard {
  id: string;
  speakers: ['female' | 'male', 'female' | 'male'];
  lines: OverheardLine[];
  question: Localized;
  /** Three choices; `answer` is the index of the right one. */
  options: [Localized, Localized, Localized];
  answer: 0 | 1 | 2;
}

const L = (who: 0 | 1, en: string, ko: string): OverheardLine => ({ who, en, ko });
const o = (en: string, ko: string): Localized => ({ en, ko });

export const OVERHEARD: readonly Overheard[] = [
  {
    id: 'tacos_tuesday',
    speakers: ['female', 'male'],
    lines: [
      L(0, "Are you coming to lunch? I'm starving.", '점심 먹으러 갈래? 배고파 죽겠어.'),
      L(1, "Sure. Let's go to Carlos' taco truck.", '좋아. 카를로스 타코 트럭 가자.'),
      L(0, "Today? It's Tuesday — the line will be crazy.", '오늘? 화요일이잖아 — 줄 엄청 길 거야.'),
      L(1, 'Yeah, but on Tuesdays the second taco is free.', '응, 근데 화요일엔 두 번째 타코가 공짜야.'),
      L(0, "Okay, you've convinced me.", '알았어, 설득당했다.'),
    ],
    question: o('What is special about Tuesdays at the taco truck?', '타코 트럭은 화요일에 뭐가 특별한가요?'),
    options: [o('The second taco is free', '두 번째 타코가 공짜'), o('It is closed', '문을 닫음'), o('There is live music', '라이브 음악이 있음')],
    answer: 0,
  },
  {
    id: 'bus_strike',
    speakers: ['male', 'female'],
    lines: [
      L(0, 'Did you hear? The buses are on strike tomorrow.', '들었어? 내일 버스 파업이래.'),
      L(1, 'Seriously? How am I supposed to get to work?', '진짜? 그럼 나 출근 어떻게 해?'),
      L(0, "The trains are still running. I'm taking the train from Central Station.", '기차는 다닌대. 난 중앙역에서 기차 타려고.'),
      L(1, "Ugh, that means I have to leave twenty minutes early.", '으, 그럼 20분 일찍 나가야겠네.'),
    ],
    question: o('How will the man get to work tomorrow?', '남자는 내일 어떻게 출근하나요?'),
    options: [o('By bus', '버스로'), o('By train', '기차로'), o('By bike', '자전거로')],
    answer: 1,
  },
  {
    id: 'lost_dog',
    speakers: ['female', 'female'],
    lines: [
      L(0, "Excuse me, have you seen a small brown dog? She's wearing a red collar.", '실례지만, 작은 갈색 강아지 못 보셨어요? 빨간 목줄을 하고 있어요.'),
      L(1, 'Hmm, I think I saw one near the fountain in Central Park.', '음, 센트럴 파크 분수 근처에서 본 것 같아요.'),
      L(0, 'Oh, thank goodness! How long ago?', '아, 다행이다! 얼마나 전에요?'),
      L(1, 'Maybe ten minutes ago. She was chasing the pigeons.', '한 10분 전쯤이요. 비둘기를 쫓고 있었어요.'),
    ],
    question: o('Where was the dog seen?', '강아지는 어디에서 목격됐나요?'),
    options: [o('At the beach', '해변에서'), o('Near the train station', '기차역 근처에서'), o('Near the fountain in the park', '공원 분수 근처에서')],
    answer: 2,
  },
  {
    id: 'new_job',
    speakers: ['male', 'male'],
    lines: [
      L(0, 'So how was your first week at Nova Tech?', '노바 테크 첫 주는 어땠어?'),
      L(1, "Honestly? Great people, but the meetings never end. I had eleven meetings on Wednesday.", '솔직히? 사람들은 좋은데 회의가 끝이 없어. 수요일에만 회의가 11개였어.'),
      L(0, 'Eleven? When did you actually work?', '11개? 일은 언제 했어?'),
      L(1, 'Exactly my question.', '내 말이.'),
    ],
    question: o("What does the man complain about at his new job?", '남자는 새 직장의 무엇에 불만인가요?'),
    options: [o('His salary', '월급'), o('Too many meetings', '너무 많은 회의'), o('His coworkers', '동료들')],
    answer: 1,
  },
  {
    id: 'rain_later',
    speakers: ['female', 'male'],
    lines: [
      L(0, 'Should I bring an umbrella? It looks sunny.', '우산 챙겨야 할까? 날씨 맑아 보이는데.'),
      L(1, 'The forecast says it will pour around five o’clock.', '일기예보에서 5시쯤 비가 쏟아진대.'),
      L(0, "Great, that's exactly when I leave the office.", '잘됐네, 딱 내가 퇴근하는 시간이야.'),
      L(1, 'Take mine. I have a spare one.', '내 거 가져가. 여분 있어.'),
    ],
    question: o('When is it going to rain?', '언제 비가 올 예정인가요?'),
    options: [o('In the morning', '아침에'), o('Around five o’clock', '5시쯤'), o('Tomorrow', '내일')],
    answer: 1,
  },
  {
    id: 'concert_tickets',
    speakers: ['male', 'female'],
    lines: [
      L(0, "I got two tickets for the jazz night at Moonlight Lounge. Want to come?", '문라이트 라운지 재즈 나이트 티켓 두 장 생겼어. 같이 갈래?'),
      L(1, "I'd love to! When is it?", '좋지! 언제야?'),
      L(0, 'Friday at nine. The band starts a bit late.', '금요일 9시. 밴드가 좀 늦게 시작해.'),
      L(1, "Perfect. I'll buy you a drink to say thanks.", '완벽해. 고마우니까 내가 한잔 살게.'),
    ],
    question: o('When does the jazz night start?', '재즈 나이트는 언제 시작하나요?'),
    options: [o('Friday at nine', '금요일 9시'), o('Saturday at seven', '토요일 7시'), o('Friday at six', '금요일 6시')],
    answer: 0,
  },
  {
    id: 'apartment_noise',
    speakers: ['female', 'male'],
    lines: [
      L(0, 'You look tired. Did you sleep at all?', '피곤해 보이네. 잠은 좀 잤어?'),
      L(1, 'Not really. My new neighbor plays the drums until two in the morning.', '별로. 새 이웃이 새벽 2시까지 드럼을 쳐.'),
      L(0, "The drums? You should talk to your landlord.", '드럼? 집주인한테 얘기해 봐.'),
      L(1, "I did. He said he'll put a note on the door.", '했지. 문에 쪽지 붙여 준대.'),
    ],
    question: o("Why couldn't the man sleep?", '남자는 왜 잠을 못 잤나요?'),
    options: [o('His dog was barking', '개가 짖어서'), o('There was construction', '공사 때문에'), o('His neighbor plays the drums', '이웃이 드럼을 쳐서')],
    answer: 2,
  },
  {
    id: 'birthday_gift',
    speakers: ['female', 'female'],
    lines: [
      L(0, "It's Jenny's birthday on Saturday. What should we get her?", '토요일이 제니 생일이야. 뭐 사 줄까?'),
      L(1, "She's been talking about learning to surf for months.", '몇 달째 서핑 배우고 싶다고 하잖아.'),
      L(0, 'Oh! We could buy her a lesson at the Sunset Shack.', '오! 선셋 섁 서핑 강습권 사 주면 되겠다.'),
      L(1, "That's perfect. Let's split it.", '완벽해. 반반 내자.'),
    ],
    question: o('What gift are they going to buy?', '그들은 어떤 선물을 사기로 했나요?'),
    options: [o('A surfboard', '서핑보드'), o('A surf lesson', '서핑 강습'), o('A book', '책')],
    answer: 1,
  },
  {
    id: 'car_trouble',
    speakers: ['male', 'female'],
    lines: [
      L(0, "My car made a weird noise again this morning. Kind of a grinding sound.", '오늘 아침에 차에서 또 이상한 소리가 났어. 뭔가 갈리는 소리.'),
      L(1, "That sounds like the brakes. Don't wait on that.", '브레이크 같은데. 미루지 마.'),
      L(0, "I know. I'm taking it to Rusty's Garage after work.", '알아. 퇴근하고 러스티 정비소에 맡기려고.'),
      L(1, 'Good idea. He fixed mine for half the price of the dealer.', '잘 생각했어. 거기서 딜러 반값에 고쳤어.'),
    ],
    question: o('What does the woman think is wrong with the car?', '여자는 차의 어디가 문제라고 생각하나요?'),
    options: [o('The brakes', '브레이크'), o('The engine', '엔진'), o('A flat tire', '펑크 난 타이어')],
    answer: 0,
  },
  {
    id: 'museum_free',
    speakers: ['male', 'female'],
    lines: [
      L(0, "What are you doing this weekend? I'm so bored.", '이번 주말에 뭐 해? 너무 심심해.'),
      L(1, 'The city museum is free on the first Sunday of the month.', '시립 박물관이 매달 첫째 주 일요일에 무료야.'),
      L(0, "Is this Sunday the first one?", '이번 일요일이 첫째 주야?'),
      L(1, 'Yep! Want to go together? We can grab brunch first.', '응! 같이 갈래? 먼저 브런치 먹고.'),
    ],
    question: o('When is the museum free?', '박물관은 언제 무료인가요?'),
    options: [o('Every Saturday', '매주 토요일'), o('On the first Sunday of the month', '매달 첫째 주 일요일'), o('Every evening', '매일 저녁')],
    answer: 1,
  },
];

export const OVERHEARD_BY_ID: ReadonlyMap<string, Overheard> = new Map(OVERHEARD.map((c) => [c.id, c]));
