import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveBodyguard } from './solver';

export type BodyguardMove = {
  passengers: string[];
  direction: 'left-to-right' | 'right-to-left';
};

export interface BodyguardPuzzle extends BasePuzzle {
  category: 'bodyguard';
  pairs: {
    protector: { id: string; name: string; emoji: string };
    charge: { id: string; name: string; emoji: string };
  }[];
  boatCapacity: number;
  driverIds?: string[];
  solution: BodyguardMove[];
}

interface BodyguardTheme {
  name: string;
  pairs: { protector: { name: string; emoji: string }; charge: { name: string; emoji: string } }[];
  storyTemplate: (pairCount: number, cap: number) => string;
}

const THEMES: BodyguardTheme[] = [
  {
    name: '왕실 호위',
    pairs: [
      { protector: { name: '근위대장', emoji: '🛡️' }, charge: { name: '왕', emoji: '👑' } },
      { protector: { name: '기사', emoji: '⚔️' }, charge: { name: '왕비', emoji: '👸' } },
      { protector: { name: '궁수', emoji: '🏹' }, charge: { name: '왕자', emoji: '🤴' } },
      { protector: { name: '마법사', emoji: '🧙' }, charge: { name: '공주', emoji: '👧' } },
    ],
    storyTemplate: (pairs, cap) =>
      `🏰왕실 일행이 강을 건너야 합니다. ${pairs}쌍의 호위와 왕족이 있고, 보트에는 최대 ${cap}명이 탈 수 있습니다. 왕족은 자신의 호위 없이 다른 호위와 단둘이 있으면 안 됩니다!`,
  },
  {
    name: '스파이 임무',
    pairs: [
      { protector: { name: '에이전트A', emoji: '🕵️' }, charge: { name: '정보원A', emoji: '📋' } },
      { protector: { name: '에이전트B', emoji: '🕵️‍♀️' }, charge: { name: '정보원B', emoji: '📝' } },
      { protector: { name: '에이전트C', emoji: '🥷' }, charge: { name: '정보원C', emoji: '📑' } },
      { protector: { name: '에이전트D', emoji: '🦹' }, charge: { name: '정보원D', emoji: '🗂️' } },
    ],
    storyTemplate: (pairs, cap) =>
      `🕵️비밀 작전! ${pairs}쌍의 에이전트와 정보원이 강을 건너야 합니다. 보트 정원 ${cap}명. 정보원은 자신의 에이전트 없이 다른 에이전트와 있으면 정보가 유출됩니다!`,
  },
  {
    name: '질투하는 부부',
    pairs: [
      { protector: { name: '남편A', emoji: '👨' }, charge: { name: '아내A', emoji: '👩' } },
      { protector: { name: '남편B', emoji: '🧔' }, charge: { name: '아내B', emoji: '👱‍♀️' } },
      { protector: { name: '남편C', emoji: '👴' }, charge: { name: '아내C', emoji: '👵' } },
      { protector: { name: '남편D', emoji: '🧑‍🦱' }, charge: { name: '아내D', emoji: '👩‍🦰' } },
    ],
    storyTemplate: (pairs, cap) =>
      `💑${pairs}쌍의 부부가 강을 건너야 합니다. 보트에는 ${cap}명이 탈 수 있습니다. 어떤 아내도 자신의 남편 없이 다른 남편과 단둘이 있으면 안 됩니다!`,
  },
];

function getPairCount(difficulty: number): number {
  if (difficulty <= 3) return 2;
  if (difficulty <= 6) return 3;
  return 4;
}

export function generateBodyguard(difficulty: number, seed: number): BodyguardPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = rng.pick(THEMES);
    const pairCount = getPairCount(difficulty);
    const boatCapacity = pairCount <= 2 ? 2 : (difficulty >= 8 ? 2 : 3);

    const selectedPairs = theme.pairs.slice(0, pairCount).map((p, i) => ({
      protector: { id: `protector_${i}`, name: p.protector.name, emoji: p.protector.emoji },
      charge: { id: `charge_${i}`, name: p.charge.name, emoji: p.charge.emoji },
    }));

    // Optional driver restriction for harder puzzles
    const driverIds = difficulty >= 7
      ? selectedPairs.map(p => p.protector.id)
      : undefined;

    const puzzle: BodyguardPuzzle = {
      seed,
      difficulty,
      category: 'bodyguard',
      optimalSteps: 0,
      story: '',
      rules: [],
      hints: [],
      pairs: selectedPairs,
      boatCapacity,
      driverIds,
      solution: [],
    };

    const result = solveBodyguard(puzzle);
    if (!result.solvable) continue;

    puzzle.solution = result.moves;
    puzzle.optimalSteps = result.moves.length;
    puzzle.story = theme.storyTemplate(pairCount, boatCapacity);

    puzzle.rules = [
      `보트에는 최대 ${boatCapacity}명까지 탈 수 있습니다.`,
      '피보호자는 자신의 보디가드 없이 다른 보디가드와 함께 있으면 안 됩니다.',
      '모두를 오른쪽 강변으로 이동시키세요.',
    ];
    if (driverIds) {
      puzzle.rules.push('보디가드만 보트를 운전할 수 있습니다.');
    }

    puzzle.hints = [
      `최소 ${result.moves.length}번 이동이 필요합니다.`,
    ];
    if (result.moves.length > 0) {
      const firstPassengers = result.moves[0].passengers;
      const names = firstPassengers.map(id => {
        for (const p of selectedPairs) {
          if (p.protector.id === id) return p.protector.name;
          if (p.charge.id === id) return p.charge.name;
        }
        return id;
      });
      puzzle.hints.push(`첫 이동: ${names.join(', ')}`);
    }
    if (pairCount >= 3) {
      puzzle.hints.push('쌍을 함께 이동시키는 것이 핵심입니다.');
    }

    return puzzle;
  }

  // Fallback: 2 pairs, capacity 2
  return {
    seed,
    difficulty,
    category: 'bodyguard',
    optimalSteps: 5,
    story: '🏰2쌍의 호위와 왕족이 강을 건너야 합니다.',
    rules: [
      '보트에는 최대 2명까지 탈 수 있습니다.',
      '피보호자는 자신의 보디가드 없이 다른 보디가드와 함께 있으면 안 됩니다.',
      '모두를 오른쪽 강변으로 이동시키세요.',
    ],
    hints: ['최소 5번 이동이 필요합니다.'],
    pairs: [
      {
        protector: { id: 'protector_0', name: '근위대장', emoji: '🛡️' },
        charge: { id: 'charge_0', name: '왕', emoji: '👑' },
      },
      {
        protector: { id: 'protector_1', name: '기사', emoji: '⚔️' },
        charge: { id: 'charge_1', name: '왕비', emoji: '👸' },
      },
    ],
    boatCapacity: 2,
    solution: [
      { passengers: ['protector_0', 'protector_1'], direction: 'left-to-right' },
      { passengers: ['protector_0'], direction: 'right-to-left' },
      { passengers: ['charge_0', 'charge_1'], direction: 'left-to-right' },
      { passengers: ['protector_1'], direction: 'right-to-left' },
      { passengers: ['protector_0', 'protector_1'], direction: 'left-to-right' },
    ],
  };
}
