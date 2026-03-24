// BrainFerry 한국어 테마 데이터
// 각 퍼즐 카테고리별 테마 정의

export interface RiverCrossingEntity {
  id: string;
  name: string;
  emoji: string;
}

export interface RiverCrossingTheme {
  name: string;
  owner: { name: string; emoji: string };
  entities: RiverCrossingEntity[];
  predationRules: [string, string, string][];
}

export interface LogicGridCategoryPool {
  ko: string[];
  en: string[];
}

export interface BridgeTorchPerson {
  name: string;
  emoji: string;
  speedLabel: string;
}

export interface BridgeTorchTheme {
  name: string;
  people: BridgeTorchPerson[];
}

export interface WaterJugTheme {
  name: string;
  emoji: string;
  fillAction: string;
  emptyAction: string;
}

export interface SequenceSortItem {
  id: string;
  label: string;
  emoji: string;
}

export interface SequenceSortTheme {
  name: string;
  emoji: string;
  items: SequenceSortItem[];
}

export interface ThemesKO {
  riverCrossing: Record<string, RiverCrossingTheme>;
  logicGrid: Record<string, LogicGridCategoryPool>;
  bridgeTorch: Record<string, BridgeTorchTheme>;
  waterJug: Record<string, WaterJugTheme>;
  sequenceSort: Record<string, SequenceSortTheme>;
}

export const THEMES_KO: ThemesKO = {
  riverCrossing: {
    farm: {
      name: '농장',
      owner: { name: '농부', emoji: '👨‍🌾' },
      entities: [
        { id: 'wolf', name: '늑대', emoji: '🐺' },
        { id: 'sheep', name: '양', emoji: '🐑' },
        { id: 'cabbage', name: '양배추', emoji: '🥬' },
        { id: 'chicken', name: '닭', emoji: '🐔' },
        { id: 'fox', name: '여우', emoji: '🦊' },
        { id: 'grain', name: '곡식', emoji: '🌾' },
        { id: 'mouse', name: '쥐', emoji: '🐭' },
        { id: 'cat', name: '고양이', emoji: '🐱' },
        { id: 'cheese', name: '치즈', emoji: '🧀' },
        { id: 'dog', name: '개', emoji: '🐕' },
        { id: 'rabbit', name: '토끼', emoji: '🐰' },
        { id: 'carrot', name: '당근', emoji: '🥕' },
      ],
      predationRules: [
        ['wolf', 'sheep', '늑대가 양을 잡아먹습니다'],
        ['wolf', 'chicken', '늑대가 닭을 잡아먹습니다'],
        ['wolf', 'rabbit', '늑대가 토끼를 잡아먹습니다'],
        ['fox', 'chicken', '여우가 닭을 잡아먹습니다'],
        ['fox', 'rabbit', '여우가 토끼를 잡아먹습니다'],
        ['fox', 'mouse', '여우가 쥐를 잡아먹습니다'],
        ['cat', 'mouse', '고양이가 쥐를 잡아먹습니다'],
        ['cat', 'chicken', '고양이가 닭을 공격합니다'],
        ['dog', 'cat', '개가 고양이를 쫓아갑니다'],
        ['sheep', 'cabbage', '양이 양배추를 먹어버립니다'],
        ['sheep', 'carrot', '양이 당근을 먹어버립니다'],
        ['rabbit', 'cabbage', '토끼가 양배추를 먹어버립니다'],
        ['rabbit', 'carrot', '토끼가 당근을 먹어버립니다'],
        ['chicken', 'grain', '닭이 곡식을 쪼아먹습니다'],
        ['mouse', 'cheese', '쥐가 치즈를 먹어버립니다'],
        ['mouse', 'grain', '쥐가 곡식을 먹어버립니다'],
      ],
    },
    fantasy: {
      name: '판타지',
      owner: { name: '마법사', emoji: '🧙' },
      entities: [
        { id: 'dragon', name: '드래곤', emoji: '🐉' },
        { id: 'princess', name: '공주', emoji: '👸' },
        { id: 'treasure', name: '보물', emoji: '💎' },
        { id: 'goblin', name: '고블린', emoji: '👺' },
        { id: 'unicorn', name: '유니콘', emoji: '🦄' },
        { id: 'elf', name: '엘프', emoji: '🧝' },
        { id: 'orc', name: '오크', emoji: '👹' },
        { id: 'fairy', name: '요정', emoji: '🧚' },
        { id: 'potion', name: '물약', emoji: '🧪' },
        { id: 'spellbook', name: '마법서', emoji: '📖' },
        { id: 'crystal', name: '수정구', emoji: '🔮' },
        { id: 'mushroom', name: '버섯', emoji: '🍄' },
      ],
      predationRules: [
        ['dragon', 'princess', '드래곤이 공주를 납치합니다'],
        ['dragon', 'unicorn', '드래곤이 유니콘을 공격합니다'],
        ['dragon', 'elf', '드래곤이 엘프를 공격합니다'],
        ['goblin', 'treasure', '고블린이 보물을 훔칩니다'],
        ['goblin', 'fairy', '고블린이 요정을 가둡니다'],
        ['goblin', 'potion', '고블린이 물약을 깨뜨립니다'],
        ['orc', 'elf', '오크가 엘프를 공격합니다'],
        ['orc', 'fairy', '오크가 요정을 공격합니다'],
        ['orc', 'crystal', '오크가 수정구를 부숩니다'],
        ['unicorn', 'mushroom', '유니콘이 버섯을 먹어버립니다'],
        ['fairy', 'spellbook', '요정이 마법서의 주문을 풀어버립니다'],
        ['princess', 'potion', '공주가 호기심에 물약을 마셔버립니다'],
      ],
    },
    space: {
      name: '우주',
      owner: { name: '선장', emoji: '👨‍🚀' },
      entities: [
        { id: 'alien', name: '외계인', emoji: '👽' },
        { id: 'robot', name: '로봇', emoji: '🤖' },
        { id: 'energycell', name: '에너지셀', emoji: '🔋' },
        { id: 'mineral', name: '광물', emoji: '💠' },
        { id: 'spacedog', name: '우주견', emoji: '🐕‍🦺' },
        { id: 'plant', name: '식물', emoji: '🌱' },
        { id: 'crystal_s', name: '크리스탈', emoji: '💎' },
        { id: 'probe', name: '탐사선', emoji: '🛸' },
        { id: 'fuel', name: '연료', emoji: '⛽' },
        { id: 'satellite', name: '위성', emoji: '🛰️' },
      ],
      predationRules: [
        ['alien', 'robot', '외계인이 로봇을 해킹합니다'],
        ['alien', 'spacedog', '외계인이 우주견을 납치합니다'],
        ['alien', 'probe', '외계인이 탐사선을 납치합니다'],
        ['robot', 'energycell', '로봇이 에너지셀을 과다소모합니다'],
        ['robot', 'mineral', '로봇이 광물을 가공해버립니다'],
        ['spacedog', 'plant', '우주견이 식물을 먹어버립니다'],
        ['probe', 'crystal_s', '탐사선이 크리스탈을 수집해버립니다'],
        ['satellite', 'fuel', '위성이 연료를 소진합니다'],
      ],
    },
    ocean: {
      name: '바다',
      owner: { name: '어부', emoji: '🎣' },
      entities: [
        { id: 'shark', name: '상어', emoji: '🦈' },
        { id: 'fish', name: '물고기', emoji: '🐟' },
        { id: 'bait', name: '미끼', emoji: '🪱' },
        { id: 'octopus', name: '문어', emoji: '🐙' },
        { id: 'crab', name: '게', emoji: '🦀' },
        { id: 'seagull', name: '갈매기', emoji: '🕊️' },
        { id: 'clam', name: '조개', emoji: '🐚' },
        { id: 'seaweed', name: '해초', emoji: '🌿' },
        { id: 'pearl', name: '진주', emoji: '🪩' },
        { id: 'turtle', name: '거북이', emoji: '🐢' },
      ],
      predationRules: [
        ['shark', 'fish', '상어가 물고기를 잡아먹습니다'],
        ['shark', 'turtle', '상어가 거북이를 공격합니다'],
        ['shark', 'octopus', '상어가 문어를 잡아먹습니다'],
        ['octopus', 'crab', '문어가 게를 잡아먹습니다'],
        ['octopus', 'clam', '문어가 조개를 깨먹습니다'],
        ['seagull', 'fish', '갈매기가 물고기를 낚아챕니다'],
        ['seagull', 'crab', '갈매기가 게를 잡아먹습니다'],
        ['seagull', 'bait', '갈매기가 미끼를 먹어버립니다'],
        ['crab', 'bait', '게가 미끼를 집어먹습니다'],
        ['fish', 'bait', '물고기가 미끼를 먹어버립니다'],
        ['fish', 'seaweed', '물고기가 해초를 먹어버립니다'],
        ['turtle', 'seaweed', '거북이가 해초를 먹어버립니다'],
      ],
    },
    school: {
      name: '학교',
      owner: { name: '선생님', emoji: '👩‍🏫' },
      entities: [
        { id: 'puppy', name: '강아지', emoji: '🐶' },
        { id: 'kitty', name: '고양이', emoji: '🐱' },
        { id: 'hamster', name: '햄스터', emoji: '🐹' },
        { id: 'parrot', name: '앵무새', emoji: '🦜' },
        { id: 'fishbowl', name: '어항', emoji: '🐠' },
        { id: 'snack', name: '간식', emoji: '🍪' },
        { id: 'homework', name: '숙제', emoji: '📝' },
        { id: 'paint', name: '물감', emoji: '🎨' },
        { id: 'ball', name: '공', emoji: '⚽' },
        { id: 'flower', name: '꽃', emoji: '🌺' },
      ],
      predationRules: [
        ['puppy', 'kitty', '강아지가 고양이를 쫓아갑니다'],
        ['puppy', 'hamster', '강아지가 햄스터를 쫓아갑니다'],
        ['puppy', 'snack', '강아지가 간식을 먹어버립니다'],
        ['puppy', 'homework', '강아지가 숙제를 물어뜯습니다'],
        ['puppy', 'ball', '강아지가 공을 물고 달아납니다'],
        ['kitty', 'hamster', '고양이가 햄스터를 잡으려 합니다'],
        ['kitty', 'fishbowl', '고양이가 어항을 노립니다'],
        ['kitty', 'parrot', '고양이가 앵무새를 공격합니다'],
        ['kitty', 'paint', '고양이가 물감을 엎어버립니다'],
        ['hamster', 'snack', '햄스터가 간식을 먹어버립니다'],
        ['parrot', 'flower', '앵무새가 꽃을 쪼아 망가뜨립니다'],
        ['hamster', 'flower', '햄스터가 꽃을 파헤칩니다'],
      ],
    },
    kitchen: {
      name: '주방',
      owner: { name: '셰프', emoji: '👨‍🍳' },
      entities: [
        { id: 'rat', name: '쥐', emoji: '🐀' },
        { id: 'cake', name: '케이크', emoji: '🎂' },
        { id: 'ant', name: '개미', emoji: '🐜' },
        { id: 'sugar', name: '설탕', emoji: '🍬' },
        { id: 'honey', name: '꿀', emoji: '🍯' },
        { id: 'bread', name: '빵', emoji: '🍞' },
        { id: 'butter', name: '버터', emoji: '🧈' },
        { id: 'fruit', name: '과일', emoji: '🍎' },
        { id: 'icecream', name: '아이스크림', emoji: '🍦' },
        { id: 'fire', name: '불', emoji: '🔥' },
      ],
      predationRules: [
        ['rat', 'cake', '쥐가 케이크를 갉아먹습니다'],
        ['rat', 'bread', '쥐가 빵을 갉아먹습니다'],
        ['rat', 'butter', '쥐가 버터를 먹어버립니다'],
        ['rat', 'fruit', '쥐가 과일을 먹어버립니다'],
        ['ant', 'sugar', '개미가 설탕에 달라붙습니다'],
        ['ant', 'honey', '개미가 꿀에 달라붙습니다'],
        ['ant', 'cake', '개미가 케이크에 달라붙습니다'],
        ['ant', 'fruit', '개미가 과일에 달라붙습니다'],
        ['fire', 'icecream', '불이 아이스크림을 녹여버립니다'],
        ['fire', 'butter', '불이 버터를 녹여버립니다'],
        ['fire', 'bread', '불이 빵을 태워버립니다'],
      ],
    },
    dinosaur: {
      name: '공룡',
      owner: { name: '탐험가', emoji: '🧑‍🔬' },
      entities: [
        { id: 'trex', name: '티라노', emoji: '🦖' },
        { id: 'bronto', name: '브론토', emoji: '🦕' },
        { id: 'raptor', name: '랩터', emoji: '🦎' },
        { id: 'egg', name: '알', emoji: '🥚' },
        { id: 'fern', name: '양치식물', emoji: '🌿' },
        { id: 'berry', name: '열매', emoji: '🫐' },
        { id: 'pterodactyl', name: '프테라노돈', emoji: '🦅' },
        { id: 'fossil', name: '화석', emoji: '🦴' },
        { id: 'insect', name: '곤충', emoji: '🦗' },
        { id: 'baby_dino', name: '아기공룡', emoji: '🐣' },
      ],
      predationRules: [
        ['trex', 'bronto', '티라노가 브론토를 공격합니다'],
        ['trex', 'raptor', '티라노가 랩터를 잡아먹습니다'],
        ['trex', 'baby_dino', '티라노가 아기공룡을 위협합니다'],
        ['trex', 'egg', '티라노가 알을 밟아 깨뜨립니다'],
        ['raptor', 'egg', '랩터가 알을 훔쳐갑니다'],
        ['raptor', 'baby_dino', '랩터가 아기공룡을 잡아먹습니다'],
        ['raptor', 'insect', '랩터가 곤충을 잡아먹습니다'],
        ['pterodactyl', 'insect', '프테라노돈이 곤충을 낚아챕니다'],
        ['pterodactyl', 'baby_dino', '프테라노돈이 아기공룡을 낚아갑니다'],
        ['bronto', 'fern', '브론토가 양치식물을 먹어버립니다'],
        ['bronto', 'berry', '브론토가 열매를 먹어버립니다'],
        ['insect', 'fern', '곤충이 양치식물을 갉아먹습니다'],
      ],
    },
    pirate: {
      name: '해적',
      owner: { name: '해적선장', emoji: '🏴‍☠️' },
      entities: [
        { id: 'monkey_p', name: '원숭이', emoji: '🐒' },
        { id: 'parrot_p', name: '앵무새', emoji: '🦜' },
        { id: 'goldchest', name: '보물상자', emoji: '📦' },
        { id: 'map', name: '지도', emoji: '🗺️' },
        { id: 'cannon', name: '대포', emoji: '💣' },
        { id: 'rum', name: '럼주', emoji: '🍶' },
        { id: 'banana', name: '바나나', emoji: '🍌' },
        { id: 'rival', name: '라이벌', emoji: '🦹' },
        { id: 'sword', name: '칼', emoji: '⚔️' },
        { id: 'coconut', name: '코코넛', emoji: '🥥' },
      ],
      predationRules: [
        ['monkey_p', 'banana', '원숭이가 바나나를 먹어버립니다'],
        ['monkey_p', 'map', '원숭이가 지도를 찢어버립니다'],
        ['monkey_p', 'coconut', '원숭이가 코코넛을 던져 깨뜨립니다'],
        ['rival', 'goldchest', '라이벌이 보물상자를 훔칩니다'],
        ['rival', 'map', '라이벌이 지도를 빼앗습니다'],
        ['rival', 'sword', '라이벌이 칼을 가져갑니다'],
        ['parrot_p', 'map', '앵무새가 지도를 쪼아 망가뜨립니다'],
        ['cannon', 'rum', '대포가 럼주를 폭발 위험에 빠뜨립니다'],
        ['cannon', 'coconut', '대포가 코코넛을 산산조각 냅니다'],
      ],
    },
  },

  logicGrid: {
    people: {
      ko: ['민수', '지은', '현우', '서연', '도윤', '하은', '준서', '수아', '태민', '유진', '성호', '미래'],
      en: ['Alex', 'Emma', 'Noah', 'Olivia', 'Liam', 'Sophia', 'Mason', 'Isabella', 'Lucas', 'Mia', 'Ethan', 'Ava'],
    },
    jobs: {
      ko: ['선생님', '의사', '요리사', '화가', '음악가', '과학자', '작가', '운동선수', '프로그래머', '사진작가', '수의사', '소방관'],
      en: ['teacher', 'doctor', 'chef', 'painter', 'musician', 'scientist', 'writer', 'athlete', 'programmer', 'photographer', 'vet', 'firefighter'],
    },
    colors: {
      ko: ['빨강', '파랑', '초록', '노랑', '보라', '주황', '분홍', '하늘', '갈색', '흰색', '검정', '회색'],
      en: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan', 'brown', 'white', 'black', 'gray'],
    },
    foods: {
      ko: ['피자', '스시', '파스타', '김밥', '타코', '카레', '햄버거', '라멘', '불고기', '샐러드', '떡볶이', '팬케이크'],
      en: ['pizza', 'sushi', 'pasta', 'kimbap', 'taco', 'curry', 'burger', 'ramen', 'bulgogi', 'salad', 'tteokbokki', 'pancake'],
    },
    pets: {
      ko: ['고양이', '강아지', '토끼', '햄스터', '앵무새', '거북이', '금붕어', '고슴도치', '기니피그', '이구아나', '페럿', '카나리아'],
      en: ['cat', 'dog', 'rabbit', 'hamster', 'parrot', 'turtle', 'goldfish', 'hedgehog', 'guinea pig', 'iguana', 'ferret', 'canary'],
    },
    cities: {
      ko: ['서울', '도쿄', '파리', '뉴욕', '런던', '시드니', '로마', '베이징', '바르셀로나', '밴쿠버', '방콕', '이스탄불'],
      en: ['Seoul', 'Tokyo', 'Paris', 'New York', 'London', 'Sydney', 'Rome', 'Beijing', 'Barcelona', 'Vancouver', 'Bangkok', 'Istanbul'],
    },
    sports: {
      ko: ['축구', '농구', '야구', '테니스', '수영', '배드민턴', '탁구', '골프', '달리기', '스키', '배구', '사이클'],
      en: ['soccer', 'basketball', 'baseball', 'tennis', 'swimming', 'badminton', 'table tennis', 'golf', 'running', 'skiing', 'volleyball', 'cycling'],
    },
    instruments: {
      ko: ['피아노', '기타', '바이올린', '드럼', '플룻', '첼로', '트럼펫', '색소폰', '하프', '우쿨렐레', '아코디언', '하모니카'],
      en: ['piano', 'guitar', 'violin', 'drums', 'flute', 'cello', 'trumpet', 'saxophone', 'harp', 'ukulele', 'accordion', 'harmonica'],
    },
    seasons_months: {
      ko: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
      en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    },
    numbers: {
      ko: ['1번', '2번', '3번', '4번', '5번', '6번', '7번', '8번', '9번', '10번', '11번', '12번'],
      en: ['#1', '#2', '#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10', '#11', '#12'],
    },
  },

  bridgeTorch: {
    students: {
      name: '학생들',
      people: [
        { name: '민수', emoji: '🧑', speedLabel: '매우 빠름' },
        { name: '지은', emoji: '👧', speedLabel: '빠름' },
        { name: '현우', emoji: '👦', speedLabel: '보통' },
        { name: '서연', emoji: '👩', speedLabel: '느림' },
        { name: '도윤', emoji: '🧒', speedLabel: '매우 느림' },
        { name: '하은', emoji: '👱‍♀️', speedLabel: '극히 느림' },
      ],
    },
    adventurers: {
      name: '모험가들',
      people: [
        { name: '전사', emoji: '⚔️', speedLabel: '매우 빠름' },
        { name: '궁수', emoji: '🏹', speedLabel: '빠름' },
        { name: '마법사', emoji: '🧙', speedLabel: '보통' },
        { name: '성직자', emoji: '⛪', speedLabel: '느림' },
        { name: '도적', emoji: '🗡️', speedLabel: '매우 느림' },
        { name: '학자', emoji: '📚', speedLabel: '극히 느림' },
      ],
    },
    animals: {
      name: '동물들',
      people: [
        { name: '치타', emoji: '🐆', speedLabel: '매우 빠름' },
        { name: '토끼', emoji: '🐇', speedLabel: '빠름' },
        { name: '강아지', emoji: '🐕', speedLabel: '보통' },
        { name: '고양이', emoji: '🐈', speedLabel: '느림' },
        { name: '거북이', emoji: '🐢', speedLabel: '매우 느림' },
        { name: '달팽이', emoji: '🐌', speedLabel: '극히 느림' },
      ],
    },
  },

  waterJug: {
    well: {
      name: '우물',
      emoji: '🪣',
      fillAction: '물을 채웁니다',
      emptyAction: '물을 버립니다',
    },
    potion: {
      name: '물약',
      emoji: '🧪',
      fillAction: '물약을 채웁니다',
      emptyAction: '물약을 버립니다',
    },
    juice: {
      name: '주스',
      emoji: '🧃',
      fillAction: '주스를 채웁니다',
      emptyAction: '주스를 버립니다',
    },
    oil: {
      name: '기름',
      emoji: '🛢️',
      fillAction: '기름을 채웁니다',
      emptyAction: '기름을 버립니다',
    },
    paint: {
      name: '페인트',
      emoji: '🎨',
      fillAction: '페인트를 채웁니다',
      emptyAction: '페인트를 버립니다',
    },
  },

  sequenceSort: {
    pancakes: {
      name: '팬케이크 정렬',
      emoji: '🥞',
      items: [
        { id: 'tiny', label: '아주 작은 팬케이크', emoji: '🥞' },
        { id: 'small', label: '작은 팬케이크', emoji: '🥞' },
        { id: 'medium_s', label: '약간 작은 팬케이크', emoji: '🥞' },
        { id: 'medium', label: '중간 팬케이크', emoji: '🥞' },
        { id: 'medium_l', label: '약간 큰 팬케이크', emoji: '🥞' },
        { id: 'large', label: '큰 팬케이크', emoji: '🥞' },
        { id: 'xlarge', label: '아주 큰 팬케이크', emoji: '🥞' },
        { id: 'huge', label: '거대한 팬케이크', emoji: '🥞' },
      ],
    },
    books: {
      name: '책꽂이 정리',
      emoji: '📚',
      items: [
        { id: 'book_a', label: '수학책', emoji: '📕' },
        { id: 'book_b', label: '과학책', emoji: '📗' },
        { id: 'book_c', label: '영어책', emoji: '📘' },
        { id: 'book_d', label: '국어책', emoji: '📙' },
        { id: 'book_e', label: '역사책', emoji: '📓' },
        { id: 'book_f', label: '미술책', emoji: '📔' },
      ],
    },
    blocks: {
      name: '블록 쌓기',
      emoji: '🧱',
      items: [
        { id: 'red_block', label: '빨간 블록', emoji: '🟥' },
        { id: 'orange_block', label: '주황 블록', emoji: '🟧' },
        { id: 'yellow_block', label: '노란 블록', emoji: '🟨' },
        { id: 'green_block', label: '초록 블록', emoji: '🟩' },
        { id: 'blue_block', label: '파란 블록', emoji: '🟦' },
        { id: 'purple_block', label: '보라 블록', emoji: '🟪' },
      ],
    },
    trains: {
      name: '기차 연결',
      emoji: '🚂',
      items: [
        { id: 'engine', label: '기관차', emoji: '🚂' },
        { id: 'coal', label: '석탄차', emoji: '🏭' },
        { id: 'passenger', label: '객차', emoji: '🚃' },
        { id: 'dining', label: '식당차', emoji: '🍽️' },
        { id: 'cargo', label: '화물차', emoji: '📦' },
        { id: 'sleeper', label: '침대차', emoji: '🛏️' },
        { id: 'caboose', label: '꼬리차', emoji: '🚋' },
      ],
    },
  },
};
