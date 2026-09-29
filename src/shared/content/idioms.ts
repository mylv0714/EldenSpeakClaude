/** Collectible "Word Coins" hidden around the city. Each one teaches an everyday idiom. */
export interface Idiom {
  id: string;
  en: string;
  ko: string;
  example: string;
}

const I = (en: string, ko: string, example: string): Idiom => ({
  id: en.toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, ''),
  en,
  ko,
  example,
});

export const IDIOMS: readonly Idiom[] = [
  I('break the ice', '어색한 분위기를 깨다', 'He told a joke to break the ice.'),
  I('a piece of cake', '식은 죽 먹기', 'The driving test was a piece of cake.'),
  I('hit the road', '길을 나서다, 출발하다', "It's getting late. Let's hit the road."),
  I('under the weather', '몸이 좀 안 좋은', "I'm feeling a bit under the weather today."),
  I('cost an arm and a leg', '엄청나게 비싸다', 'That sports car cost an arm and a leg.'),
  I('once in a blue moon', '아주 가끔', 'I eat fast food once in a blue moon.'),
  I('hit the sack', '잠자리에 들다', "I'm exhausted. I'm going to hit the sack."),
  I('the ball is in your court', '이제 네가 결정할 차례야', "I've made my offer. The ball is in your court."),
  I('call it a day', '오늘은 여기까지 하다', "We've done enough. Let's call it a day."),
  I('get the hang of it', '요령을 터득하다', "Driving here is tricky, but you'll get the hang of it."),
  I('on the same page', '같은 생각인, 이해가 일치하는', "Let's make sure we're on the same page."),
  I('a blessing in disguise', '전화위복', 'Losing that job was a blessing in disguise.'),
  I('better late than never', '늦더라도 안 하는 것보다 낫다', 'You finally made it! Better late than never.'),
  I('bite the bullet', '이를 악물고 하다', "I hate the dentist, but I'll bite the bullet."),
  I('cut corners', '(돈·시간을 아끼려고) 대충 하다', "Don't cut corners on safety."),
  I('go the extra mile', '한층 더 노력하다', 'She always goes the extra mile for her customers.'),
  I('in hot water', '곤경에 처한', "He's in hot water with his boss."),
  I('keep an eye on', '~을 지켜보다', 'Can you keep an eye on my bag for a minute?'),
  I('let the cat out of the bag', '비밀을 무심코 누설하다', 'Who let the cat out of the bag about the party?'),
  I('miss the boat', '기회를 놓치다', "Apply today or you'll miss the boat."),
  I('no pain, no gain', '고통 없이는 얻는 것도 없다', 'Training is hard, but no pain, no gain.'),
  I('on thin ice', '살얼음판 위에 있는, 위태로운', "After being late again, he's on thin ice."),
  I("pull someone's leg", '농담으로 놀리다', "Relax, I'm just pulling your leg!"),
  I('take a rain check', '다음을 기약하다', "I can't come tonight. Can I take a rain check?"),
  I('speak of the devil', '호랑이도 제 말 하면 온다', 'Speak of the devil — here comes Leo!'),
  I('the last straw', '참을 수 있는 한계, 결정타', 'That was the last straw. I quit!'),
  I('up in the air', '아직 결정되지 않은', 'Our travel plans are still up in the air.'),
  I('when pigs fly', '그럴 일은 절대 없다', "He'll clean his room when pigs fly."),
  I('you can say that again', '정말 맞는 말이야', '"It\'s so hot today!" "You can say that again."'),
  I('sleep on it', '하룻밤 곰곰이 생각해 보다', "It's a big decision. Let me sleep on it."),
  I('a dime a dozen', '흔해 빠진', 'Cheap umbrellas are a dime a dozen.'),
  I('spill the beans', '비밀을 털어놓다', 'Come on, spill the beans! What happened?'),
  I('on the fence', '결정을 못 내린', "I'm still on the fence about buying it."),
  I('hang in there', '조금만 버텨', "Hang in there — it'll get better."),
  I('grab a bite', '간단히 뭘 먹다', 'Want to grab a bite after work?'),
  I('running late', '늦어지고 있는', "Sorry, I'm running late!"),
  I('sit tight', '가만히 기다리다', 'Sit tight. Your pizza is on the way.'),
  I('ring a bell', '들어 본 것 같다, 낯익다', 'His name rings a bell.'),
  I('take it easy', '쉬엄쉬엄 해, 진정해', "Take it easy — you've worked hard today."),
  I('catch some rays', '햇볕을 쬐다', "Let's go to the beach and catch some rays."),
];

export const IDIOM_BY_ID: ReadonlyMap<string, Idiom> = new Map(IDIOMS.map((i) => [i.id, i]));
