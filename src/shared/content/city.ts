import type { JobKind, Localized } from '../types';

/** Vertical roads, west → east. Index matches the client city layout. */
export const AVENUES = [
  'Harbor Avenue',
  '1st Avenue',
  '2nd Avenue',
  '3rd Avenue',
  'Central Avenue',
  '5th Avenue',
  '6th Avenue',
  'Park Avenue',
  'Hill Avenue',
  'Airport Road',
] as const;

/** Horizontal roads, north → south. */
export const STREETS = [
  'North Boulevard',
  'Oak Street',
  'Pine Street',
  'King Street',
  'Main Street',
  'Market Street',
  'Queen Street',
  'Elm Street',
  'Sunset Boulevard',
  'Ocean Drive',
] as const;

export const STREET_NAMES: readonly string[] = [...AVENUES, ...STREETS];

export interface Place {
  id: string;
  name: string;
  nameKo: string;
  icon: string;
  blurb: Localized;
  job?: JobKind;
  shop?: 'cars' | 'outfits';
}

const P = (
  id: string,
  name: string,
  nameKo: string,
  icon: string,
  blurb: Localized,
  extra: Partial<Place> = {},
): Place => ({ id, name, nameKo, icon, blurb, ...extra });

export const PLACES: readonly Place[] = [
  P('airport', 'Elden International Airport', '엘든 국제공항', '✈️', { en: 'Where every story in Elden City begins.', ko: '엘든 시티의 모든 이야기가 시작되는 곳.' }),
  P('cafe', 'Bean There Café', '빈 데어 카페', '☕', { en: 'The busiest coffee counter downtown.', ko: '다운타운에서 가장 붐비는 커피 가게.' }),
  P('hotel', 'Grand Elden Hotel', '그랜드 엘든 호텔', '🏨', { en: 'Five stars, one very organized front desk.', ko: '5성급 호텔, 깐깐한 프런트 데스크.' }),
  P('bank', 'Elden National Bank', '엘든 국립은행', '🏦', { en: 'Accounts, cards and a lot of paperwork.', ko: '계좌, 카드, 그리고 많은 서류.' }),
  P('office', 'Nova Tech Tower', '노바 테크 타워', '🏢', { en: 'The hottest tech company in the city.', ko: '도시에서 가장 핫한 테크 기업.' }),
  P('police', 'ECPD Central Station', '엘든 경찰서', '🚓', { en: 'Report crimes, lost items and bad days.', ko: '범죄, 분실물, 그리고 나쁜 하루를 신고하는 곳.' }),
  P('diner', 'Harbor Diner', '하버 다이너', '🍳', { en: 'Pancakes, gossip and a view of the docks.', ko: '팬케이크와 수다, 그리고 부두 전망.' }),
  P('garage', "Rusty's Garage", '러스티 정비소', '🔧', { en: 'Repairs. No questions asked. Mostly.', ko: '수리 전문. 캐묻지 않음. 대체로.' }),
  P('investor', 'Skyline Capital', '스카이라인 캐피털', '💼', { en: 'Where startups go to get rich — or roasted.', ko: '스타트업이 투자받거나… 탈탈 털리는 곳.' }),
  P('studio', 'ETV Studios', 'ETV 방송국', '📺', { en: 'Home of the evening show "Elden Tonight".', ko: '저녁 토크쇼 "엘든 투나잇"의 방송국.' }),
  P('hospital', "St. Mary's Hospital", '세인트 메리 병원', '🏥', { en: 'Doctors, nurses and the emergency room.', ko: '의사, 간호사, 그리고 응급실.' }),
  P('pharmacy', 'CityCare Pharmacy', '시티케어 약국', '💊', { en: 'Medicine and advice, no prescription needed for chat.', ko: '약과 복약 상담.' }),
  P('restaurant', "Luigi's Trattoria", '루이지 트라토리아', '🍝', { en: 'Homemade pasta and a very proud waiter.', ko: '수제 파스타와 자부심 넘치는 웨이터.' }),
  P('market', 'FreshMart', '프레시마트', '🛒', { en: 'A supermarket where nothing is where you expect.', ko: '물건이 늘 예상 밖의 자리에 있는 슈퍼마켓.' }),
  P('gym', 'Iron Temple Gym', '아이언 템플 짐', '🏋️', { en: 'Pump iron, sign contracts.', ko: '운동도 하고, 계약서도 쓰고.' }),
  P('techstore', 'Pixel Tech Store', '픽셀 테크 스토어', '📱', { en: 'Phones, plans and complicated warranties.', ko: '휴대폰, 요금제, 그리고 복잡한 보증.' }),
  P('boutique', 'Maison Mode', '메종 모드', '👗', { en: 'Fashion with attitude.', ko: '도도한 패션 부티크.' }, { shop: 'outfits' }),
  P('realty', 'Skyline Realty', '스카이라인 부동산', '🏠', { en: 'Find your dream apartment. Or at least an apartment.', ko: '꿈의 집을 찾아드려요. 아니면 적어도 집을요.' }),
  P('dealer', 'Elden Motors', '엘든 모터스', '🚗', { en: 'New cars, used cars and hard bargains.', ko: '새 차, 중고차, 그리고 치열한 흥정.' }, { shop: 'cars' }),
  P('station', 'Central Station', '중앙역', '🚆', { en: 'Trains to everywhere, tickets from a real person.', ko: '어디든 가는 기차, 직원에게 직접 사는 표.' }),
  P('cinema', 'Starlight Cinema', '스타라이트 극장', '🎬', { en: 'Blockbusters and popcorn.', ko: '블록버스터와 팝콘.' }),
  P('foodtruck', "Carlos' Taco Truck", '카를로스 타코 트럭', '🌮', { en: 'The best tacos in Central Park.', ko: '센트럴 파크 최고의 타코.' }),
  P('cityhall', 'City Hall', '시청', '🏛️', { en: 'Permits, appeals and endless forms.', ko: '허가, 이의 신청, 끝없는 서류.' }),
  P('beachbar', 'Sunset Shack', '선셋 섁', '🏄', { en: 'Smoothies, surfboards and sunsets.', ko: '스무디, 서핑보드, 그리고 노을.' }),
  P('bar', 'Moonlight Lounge', '문라이트 라운지', '🍸', { en: 'Live jazz, dim lights and good conversation.', ko: '라이브 재즈, 은은한 조명, 그리고 좋은 대화.' }),
  P('pizzeria', "Tony's Pizza", '토니스 피자', '🍕', { en: 'Hot pizza, fast delivery. Drivers wanted!', ko: '뜨거운 피자, 빠른 배달. 배달원 구함!' }, { job: 'pizza' }),
  P('cabs', 'Elden Cabs', '엘든 택시', '🚕', { en: 'Drive a cab, meet the whole city.', ko: '택시를 몰며 도시 사람들을 만나 보세요.' }, { job: 'taxi' }),
];

/** English district names (match the client map labels); the only values accepted as date context. */
export const DISTRICT_NAMES = ['Downtown', 'Midtown', 'Elden Heights', 'East Industrial', 'The Docks', 'Central Park', 'Sunset Beach', 'Elden International'] as const;

export const PLACE_BY_ID: ReadonlyMap<string, Place> = new Map(PLACES.map((p) => [p.id, p]));

export function placeName(id: string | undefined): string {
  return (id && PLACE_BY_ID.get(id)?.name) || 'downtown';
}

/** Pizza menu used by delivery jobs. Order items sent to the server must come from this list. */
export const PIZZA_MENU = [
  'a large pepperoni pizza',
  'a medium margherita pizza',
  'a large Hawaiian pizza',
  'a veggie supreme pizza',
  'a BBQ chicken pizza',
  'garlic knots',
  'a Caesar salad',
  'two cans of cola',
  'chicken wings',
] as const;

/** Street-interview topics for the TV reporter event. */
export const INTERVIEW_TOPICS: readonly Localized[] = [
  { en: 'the new bike lanes downtown', ko: '다운타운에 새로 생긴 자전거 도로' },
  { en: 'whether Elden City should build a new sports stadium', ko: '엘든 시티에 새 경기장을 지어야 하는지' },
  { en: 'the best food in Elden City', ko: '엘든 시티 최고의 음식' },
  { en: 'a four-day work week', ko: '주 4일 근무제' },
  { en: 'banning cars from Main Street on weekends', ko: '주말마다 메인 스트리트 차량 통행 금지' },
  { en: 'whether people spend too much time on their phones', ko: '사람들이 휴대폰을 너무 많이 쓰는지' },
  { en: 'the city’s plan to plant ten thousand trees', ko: '나무 1만 그루를 심겠다는 시의 계획' },
  { en: 'what makes a city a great place to live', ko: '살기 좋은 도시의 조건' },
];
