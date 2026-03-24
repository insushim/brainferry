import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveBridgeTorch } from './solver';

export type BridgeMove = {
  people: string[];
  direction: 'forward' | 'back';
  time: number;
};

export interface BridgeTorchPuzzle extends BasePuzzle {
  category: 'bridge-torch';
  people: { id: string; name: string; emoji: string; speed: number }[];
  timeLimit: number;
  bridgeCapacity: number;
  solution: BridgeMove[];
}

interface BridgeTheme {
  name: string;
  people: { name: string; emoji: string }[];
  storyPrefix: string;
}

const SPEED_POOL = [1, 2, 3, 5, 8, 10, 15, 20];

const THEMES: BridgeTheme[] = [
  {
    name: '학생들',
    people: [
      { name: '민수', emoji: '🧑‍🎓' },
      { name: '지영', emoji: '👩‍🎓' },
      { name: '현우', emoji: '🧑' },
      { name: '수진', emoji: '👧' },
      { name: '태호', emoji: '👦' },
      { name: '미래', emoji: '👩' },
      { name: '준서', emoji: '🧒' },
      { name: '하은', emoji: '👱‍♀️' },
    ],
    storyPrefix: '캠프에서 돌아오는 학생들이 어두운 밤에 다리를 건너야 합니다.',
  },
  {
    name: '모험가들',
    people: [
      { name: '전사', emoji: '⚔️' },
      { name: '마법사', emoji: '🧙' },
      { name: '도적', emoji: '🗡️' },
      { name: '성직자', emoji: '⛪' },
      { name: '궁수', emoji: '🏹' },
      { name: '기사', emoji: '🤺' },
      { name: '음유시인', emoji: '🎵' },
      { name: '연금술사', emoji: '⚗️' },
    ],
    storyPrefix: '던전을 탈출하는 모험가들이 무너지는 다리를 건너야 합니다.',
  },
  {
    name: '동물들',
    people: [
      { name: '토끼', emoji: '🐇' },
      { name: '거북이', emoji: '🐢' },
      { name: '고양이', emoji: '🐱' },
      { name: '코끼리', emoji: '🐘' },
      { name: '치타', emoji: '🐆' },
      { name: '달팽이', emoji: '🐌' },
      { name: '강아지', emoji: '🐕' },
      { name: '판다', emoji: '🐼' },
    ],
    storyPrefix: '폭풍이 오기 전에 동물들이 다리를 건너 안전한 곳으로 가야 합니다.',
  },
];

function getPeopleCount(difficulty: number): number {
  if (difficulty <= 2) return 3;
  if (difficulty <= 4) return 4;
  if (difficulty <= 6) return 4;
  if (difficulty <= 8) return 5;
  return 6;
}

export function generateBridgeTorch(difficulty: number, seed: number): BridgeTorchPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = rng.pick(THEMES);
    const count = getPeopleCount(difficulty);
    const bridgeCapacity = 2;

    const selectedPeople = rng.pickN(theme.people, count);
    const speeds = rng.pickN(SPEED_POOL, count);

    const people = selectedPeople.map((p, i) => ({
      id: `person_${i}`,
      name: p.name,
      emoji: p.emoji,
      speed: speeds[i],
    }));

    // First solve without time limit to find optimal time
    const unlimitedPuzzle: BridgeTorchPuzzle = {
      seed,
      difficulty,
      category: 'bridge-torch',
      optimalSteps: 0,
      story: '',
      rules: [],
      hints: [],
      people,
      timeLimit: 999,
      bridgeCapacity,
      solution: [],
    };

    const result = solveBridgeTorch(unlimitedPuzzle);
    if (!result.solvable) continue;

    const optimalTime = result.moves.reduce((sum, m) => sum + m.time, 0);
    const timeLimit = optimalTime;

    const puzzle: BridgeTorchPuzzle = {
      seed,
      difficulty,
      category: 'bridge-torch',
      optimalSteps: result.moves.length,
      story: '',
      rules: [],
      hints: [],
      people,
      timeLimit,
      bridgeCapacity,
      solution: result.moves,
    };

    // Generate story
    const peopleDesc = people.map(p => `${p.emoji}${p.name}(${p.speed}분)`).join(', ');
    puzzle.story = `${theme.storyPrefix} 횃불은 하나뿐이고 다리는 한 번에 ${bridgeCapacity}명만 건널 수 있습니다. ${peopleDesc}이 ${timeLimit}분 안에 모두 건너야 합니다.`;

    puzzle.rules = [
      `다리는 한 번에 최대 ${bridgeCapacity}명이 건널 수 있습니다.`,
      '횃불을 가지고 건너야 하며, 돌아올 때도 1명이 횃불을 가져와야 합니다.',
      '건너는 속도는 함께 건너는 사람 중 가장 느린 사람의 속도입니다.',
      `${timeLimit}분 안에 모두 건너야 합니다.`,
    ];

    const sortedPeople = [...people].sort((a, b) => a.speed - b.speed);
    puzzle.hints = [
      `최적 시간은 ${timeLimit}분입니다.`,
      `가장 빠른 사람(${sortedPeople[0].name}: ${sortedPeople[0].speed}분)이 횃불을 되가져오는 역할을 자주 합니다.`,
    ];
    if (people.length >= 4) {
      puzzle.hints.push('느린 사람끼리 함께 건너면 시간을 절약할 수 있습니다.');
    }

    return puzzle;
  }

  // Fallback: classic 4-person bridge problem
  return {
    seed,
    difficulty,
    category: 'bridge-torch',
    optimalSteps: 5,
    story: '4명이 17분 안에 다리를 건너야 합니다. 🧑‍🎓민수(1분), 👩‍🎓지영(2분), 🧑현우(5분), 👧수진(10분).',
    rules: [
      '다리는 한 번에 최대 2명이 건널 수 있습니다.',
      '횃불을 가지고 건너야 합니다.',
      '건너는 속도는 느린 사람 기준입니다.',
      '17분 안에 모두 건너야 합니다.',
    ],
    hints: ['최적 시간은 17분입니다.', '가장 빠른 사람이 횃불을 되가져옵니다.'],
    people: [
      { id: 'person_0', name: '민수', emoji: '🧑‍🎓', speed: 1 },
      { id: 'person_1', name: '지영', emoji: '👩‍🎓', speed: 2 },
      { id: 'person_2', name: '현우', emoji: '🧑', speed: 5 },
      { id: 'person_3', name: '수진', emoji: '👧', speed: 10 },
    ],
    timeLimit: 17,
    bridgeCapacity: 2,
    solution: [
      { people: ['person_0', 'person_1'], direction: 'forward', time: 2 },
      { people: ['person_0'], direction: 'back', time: 1 },
      { people: ['person_2', 'person_3'], direction: 'forward', time: 10 },
      { people: ['person_1'], direction: 'back', time: 2 },
      { people: ['person_0', 'person_1'], direction: 'forward', time: 2 },
    ],
  };
}
