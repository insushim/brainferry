import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveBridgeTorch } from './solver';

export type BridgeVariant = 'basic' | 'bridge-durability' | 'two-bridges' | 'battery-drain';

export type BridgeMove = {
  people: string[];
  direction: 'forward' | 'back';
  time: number;
  bridgeIndex?: number; // for two-bridges
};

export interface BridgeTorchPuzzle extends BasePuzzle {
  category: 'bridge-torch';
  variant: BridgeVariant;
  people: { id: string; name: string; emoji: string; speed: number }[];
  timeLimit: number;
  bridgeCapacity: number;
  bridgeDurability?: number; // for bridge-durability: max total crossings
  bridge2Capacity?: number; // for two-bridges: second bridge capacity
  bridge2SpeedMod?: number; // for two-bridges: speed multiplier (2 = twice as slow)
  batteryLife?: number; // for battery-drain: initial battery
  batteryDrainRate?: number; // for battery-drain: extra time per crossing
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

function getVariant(difficulty: number, rng: SeededRandom): BridgeVariant {
  if (difficulty <= 2) return 'basic';
  if (difficulty <= 4) return rng.pick(['basic', 'bridge-durability']);
  if (difficulty <= 6) return rng.pick(['bridge-durability', 'two-bridges']);
  if (difficulty <= 8) return rng.pick(['two-bridges', 'battery-drain']);
  return 'battery-drain';  // 9-10은 항상 가장 복잡한 battery-drain
}

function getPeopleCount(difficulty: number): number {
  if (difficulty <= 2) return 4;  // 3명은 너무 쉬움 → 최소 4명
  if (difficulty <= 4) return 4;
  if (difficulty <= 6) return 5;
  if (difficulty <= 8) return 5;
  return 6;
}

export function generateBridgeTorch(difficulty: number, seed: number): BridgeTorchPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = THEMES[(seed % THEMES.length + attempt) % THEMES.length];
    const variant = getVariant(difficulty, rng);
    const count = getPeopleCount(difficulty);
    const bridgeCapacity = 2;

    // Seed-based people rotation instead of random pick
    const startIdx = (seed + attempt) % theme.people.length;
    const selectedPeople = Array.from({ length: count }, (_, i) =>
      theme.people[(startIdx + i) % theme.people.length]
    );
    const speeds = rng.pickN(SPEED_POOL, count);

    // Ensure no duplicate speeds
    if (new Set(speeds).size < speeds.length) continue;

    // Speed profile diversity: classify and prefer different profiles based on seed
    const sorted = [...speeds].sort((a, b) => a - b);
    const range = sorted[sorted.length - 1] - sorted[0];
    const isUniform = range <= 4;
    const isPolarized = !isUniform && (sorted[sorted.length - 1] > sorted[0] * 3);
    const profile = isUniform ? 'uniform' : isPolarized ? 'polarized' : 'graduated';
    const preferredProfiles = ['polarized', 'graduated', 'uniform'];
    const preferred = preferredProfiles[seed % preferredProfiles.length];
    if (profile !== preferred && attempt < maxRetries * 0.6) continue;

    // Ensure minimum 3x speed ratio for meaningful strategy
    if (sorted[sorted.length - 1] < sorted[0] * 3) continue;

    const people = selectedPeople.map((p, i) => ({
      id: `person_${i}`,
      name: p.name,
      emoji: p.emoji,
      speed: speeds[i],
    }));

    // First solve without time limit to find optimal time
    const puzzle: BridgeTorchPuzzle = {
      seed,
      difficulty,
      category: 'bridge-torch',
      variant,
      optimalSteps: 0,
      story: '',
      rules: [],
      hints: [],
      people,
      timeLimit: 999,
      bridgeCapacity,
      solution: [],
    };

    // Variant-specific config
    if (variant === 'bridge-durability') {
      // Total crossings limited. People count * 2 - 1 is normal max for basic.
      // Set it to just barely enough for the optimal solution
      puzzle.bridgeDurability = count * 2 - 1; // will be refined after solving
    }

    if (variant === 'two-bridges') {
      puzzle.bridge2Capacity = 1;
      puzzle.bridge2SpeedMod = 2; // second bridge is slower but always available
    }

    if (variant === 'battery-drain') {
      puzzle.batteryLife = 100;
      puzzle.batteryDrainRate = rng.int(1, 3); // extra time added per crossing
    }

    const result = solveBridgeTorch(puzzle);
    if (!result.solvable) continue;

    const optimalTime = result.moves.reduce((sum, m) => sum + m.time, 0);
    // Tighter time limits force optimization thinking
    const overhead = difficulty <= 3 ? 1.3 : difficulty <= 6 ? 1.2 : 1.1;
    puzzle.timeLimit = Math.ceil(optimalTime * overhead);

    if (variant === 'bridge-durability') {
      // Set durability to exactly the number of crossings in the solution
      puzzle.bridgeDurability = result.moves.length;
    }

    if (variant === 'battery-drain') {
      // Recalculate with battery drain accounted for
      let totalTime = 0;
      for (let i = 0; i < result.moves.length; i++) {
        totalTime += result.moves[i].time + i * (puzzle.batteryDrainRate ?? 0);
      }
      puzzle.timeLimit = Math.ceil(totalTime * overhead);
    }

    puzzle.solution = result.moves;
    puzzle.optimalSteps = result.moves.length;

    // Generate story
    const peopleDesc = people.map(p => `${p.emoji}${p.name}(${p.speed}분)`).join(', ');
    let variantStory = '';
    if (variant === 'bridge-durability') {
      variantStory = ` 다리는 총 ${puzzle.bridgeDurability}번만 건널 수 있습니다!`;
    } else if (variant === 'two-bridges') {
      variantStory = ` 다리가 2개! 1번 다리(${bridgeCapacity}명), 2번 다리(${puzzle.bridge2Capacity}명, 속도 ${puzzle.bridge2SpeedMod}배 느림).`;
    } else if (variant === 'battery-drain') {
      variantStory = ` 횃불 배터리가 소모됩니다! 매 횡단마다 +${puzzle.batteryDrainRate}분씩 추가 시간이 걸립니다.`;
    }
    puzzle.story = `${theme.storyPrefix} 횃불은 하나뿐이고 다리는 한 번에 ${bridgeCapacity}명만 건널 수 있습니다. ${peopleDesc}이 ${puzzle.timeLimit}분 안에 모두 건너야 합니다.${variantStory}`;

    puzzle.rules = [
      `다리는 한 번에 최대 ${bridgeCapacity}명이 건널 수 있습니다.`,
      '횃불을 가지고 건너야 하며, 돌아올 때도 1명이 횃불을 가져와야 합니다.',
      '건너는 속도는 함께 건너는 사람 중 가장 느린 사람의 속도입니다.',
      `${puzzle.timeLimit}분 안에 모두 건너야 합니다.`,
    ];

    if (variant === 'bridge-durability') {
      puzzle.rules.push(`⚠️ 다리를 총 ${puzzle.bridgeDurability}번만 건널 수 있습니다!`);
    }
    if (variant === 'two-bridges') {
      puzzle.rules.push(`⚠️ 2번 다리: ${puzzle.bridge2Capacity}명, 속도 ${puzzle.bridge2SpeedMod}배 느림`);
    }
    if (variant === 'battery-drain') {
      puzzle.rules.push(`⚠️ 배터리 소모: 매 횡단마다 +${puzzle.batteryDrainRate}분 추가`);
    }

    const sortedPeople = [...people].sort((a, b) => a.speed - b.speed);
    puzzle.hints = [
      `제한 시간은 ${puzzle.timeLimit}분입니다.`,
      '빠른 사람이 횃불을 돌려보내는 역할을 합니다.',
      '느린 두 사람은 함께 건너는 것이 유리합니다.',
    ];
    if (variant === 'bridge-durability') {
      puzzle.hints.push(`다리 사용 횟수를 최소화하세요. 한 번에 2명씩 보내세요.`);
    }
    if (variant === 'two-bridges') {
      puzzle.hints.push('느린 사람은 2번 다리(속도 패널티)를 사용하는 것도 전략입니다.');
    }
    if (variant === 'battery-drain') {
      puzzle.hints.push('초반에 느린 사람을 보내면 배터리 소모가 적습니다.');
    }
    if (people.length >= 4) {
      puzzle.hints.push('느린 사람끼리 함께 건너면 시간을 절약할 수 있습니다.');
    }

    return puzzle;
  }

  // Fallback
  return {
    seed,
    difficulty,
    category: 'bridge-torch',
    variant: 'basic',
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
