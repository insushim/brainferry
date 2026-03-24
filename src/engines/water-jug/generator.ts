import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveWaterJug } from './solver';

export type JugMove = {
  action: 'fill' | 'empty' | 'pour';
  from?: string;
  to?: string;
  jugId?: string;
};

export interface WaterJugPuzzle extends BasePuzzle {
  category: 'water-jug';
  jugs: { id: string; capacity: number }[];
  target: number;
  targetJug?: string;
  solution: JugMove[];
}

interface JugTheme {
  name: string;
  storyTemplate: (jugs: { id: string; capacity: number }[], target: number) => string;
}

const THEMES: JugTheme[] = [
  {
    name: '물약 제조',
    storyTemplate: (jugs, target) => {
      const jugDesc = jugs.map(j => `${j.capacity}리터 플라스크`).join('와 ');
      return `🧪마법사가 물약을 만들려면 정확히 ${target}리터의 마법의 물이 필요합니다. ${jugDesc}만 사용할 수 있습니다. 수도꼭지에서 물을 채우거나 비울 수 있습니다.`;
    },
  },
  {
    name: '우물에서',
    storyTemplate: (jugs, target) => {
      const jugDesc = jugs.map(j => `${j.capacity}리터 양동이`).join('와 ');
      return `🪣우물에서 정확히 ${target}리터의 물을 길어와야 합니다. 가진 것은 ${jugDesc}뿐입니다. 양동이를 채우고 비우고 옮겨 담을 수 있습니다.`;
    },
  },
  {
    name: '요리사',
    storyTemplate: (jugs, target) => {
      const jugDesc = jugs.map(j => `${j.capacity}리터 컵`).join('과 ');
      return `👨‍🍳요리사가 레시피에 정확히 ${target}리터의 육수가 필요합니다. ${jugDesc}을 사용해서 정확히 측정하세요!`;
    },
  },
];

// GCD for coprimality check
function gcd(a: number, b: number): number {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

// 2-jug configurations guaranteed to work well
const TWO_JUG_CONFIGS: { caps: [number, number]; targets: number[] }[] = [
  { caps: [3, 5], targets: [1, 2, 4] },
  { caps: [5, 7], targets: [1, 2, 3, 4, 6] },
  { caps: [3, 7], targets: [1, 2, 4, 5, 6] },
  { caps: [4, 7], targets: [1, 2, 3, 5, 6] },
  { caps: [5, 8], targets: [1, 2, 3, 4, 6, 7] },
  { caps: [3, 8], targets: [1, 2, 4, 5, 6, 7] },
  { caps: [4, 9], targets: [1, 2, 3, 5, 6, 7, 8] },
  { caps: [5, 11], targets: [1, 2, 3, 4, 6, 7, 8, 9] },
];

// 3-jug configurations for harder puzzles
const THREE_JUG_CONFIGS: { caps: [number, number, number]; targets: number[] }[] = [
  { caps: [3, 5, 8], targets: [1, 2, 4, 6, 7] },
  { caps: [4, 7, 10], targets: [1, 2, 3, 5, 6, 8, 9] },
  { caps: [3, 5, 11], targets: [1, 2, 4, 6, 7, 8, 9, 10] },
  { caps: [5, 7, 12], targets: [1, 2, 3, 4, 6, 8, 9, 10, 11] },
  { caps: [3, 7, 11], targets: [1, 2, 4, 5, 6, 8, 9, 10] },
];

export function generateWaterJug(difficulty: number, seed: number): WaterJugPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = rng.pick(THEMES);

    const useThreeJugs = difficulty >= 7;
    let jugs: { id: string; capacity: number }[];
    let target: number;

    if (useThreeJugs) {
      const config = rng.pick(THREE_JUG_CONFIGS);
      jugs = config.caps.map((cap, i) => ({ id: `jug_${i}`, capacity: cap }));
      target = rng.pick(config.targets);
    } else {
      const config = rng.pick(TWO_JUG_CONFIGS);
      jugs = config.caps.map((cap, i) => ({ id: `jug_${i}`, capacity: cap }));
      target = rng.pick(config.targets);
    }

    // Optionally target a specific jug for harder difficulties
    const targetJug = difficulty >= 5 ? rng.pick(jugs).id : undefined;

    const puzzle: WaterJugPuzzle = {
      seed,
      difficulty,
      category: 'water-jug',
      optimalSteps: 0,
      story: '',
      rules: [],
      hints: [],
      jugs,
      target,
      targetJug,
      solution: [],
    };

    const result = solveWaterJug(puzzle);
    if (!result.solvable) continue;

    // Filter out puzzles that are too easy or too hard for difficulty
    const steps = result.moves.length;
    if (difficulty <= 3 && steps > 8) continue;
    if (difficulty >= 7 && steps < 4) continue;

    puzzle.solution = result.moves;
    puzzle.optimalSteps = steps;
    puzzle.story = theme.storyTemplate(jugs, target);

    puzzle.rules = [
      ...jugs.map(j => `${j.id === 'jug_0' ? 'A' : j.id === 'jug_1' ? 'B' : 'C'}통: ${j.capacity}리터 용량`),
      `목표: 정확히 ${target}리터를 측정하세요.`,
      '채우기: 수도꼭지에서 물통을 가득 채웁니다.',
      '비우기: 물통의 물을 모두 버립니다.',
      '옮기기: 한 물통에서 다른 물통으로 물을 옮깁니다.',
    ];
    if (targetJug) {
      const jugLabel = targetJug === 'jug_0' ? 'A' : targetJug === 'jug_1' ? 'B' : 'C';
      puzzle.rules.push(`${jugLabel}통에 정확히 ${target}리터가 있어야 합니다.`);
    }

    puzzle.hints = [
      `최소 ${steps}번의 동작이 필요합니다.`,
    ];
    if (result.moves.length > 0) {
      const firstMove = result.moves[0];
      if (firstMove.action === 'fill') {
        const jugLabel = firstMove.jugId === 'jug_0' ? 'A' : firstMove.jugId === 'jug_1' ? 'B' : 'C';
        puzzle.hints.push(`먼저 ${jugLabel}통을 채워보세요.`);
      }
    }
    if (jugs.length === 2) {
      puzzle.hints.push(`두 물통의 용량 차이(${Math.abs(jugs[0].capacity - jugs[1].capacity)})를 활용하세요.`);
    }

    return puzzle;
  }

  // Fallback: classic 3L-5L problem, target 4L
  return {
    seed,
    difficulty,
    category: 'water-jug',
    optimalSteps: 6,
    story: '🧪정확히 4리터의 물이 필요합니다. 3리터 플라스크와 5리터 플라스크만 사용할 수 있습니다.',
    rules: [
      'A통: 3리터 용량',
      'B통: 5리터 용량',
      '목표: 정확히 4리터를 측정하세요.',
      '채우기, 비우기, 옮기기 동작을 사용하세요.',
    ],
    hints: ['최소 6번의 동작이 필요합니다.', '먼저 B통(5리터)을 채워보세요.'],
    jugs: [
      { id: 'jug_0', capacity: 3 },
      { id: 'jug_1', capacity: 5 },
    ],
    target: 4,
    solution: [
      { action: 'fill', jugId: 'jug_1' },
      { action: 'pour', from: 'jug_1', to: 'jug_0' },
      { action: 'empty', jugId: 'jug_0' },
      { action: 'pour', from: 'jug_1', to: 'jug_0' },
      { action: 'fill', jugId: 'jug_1' },
      { action: 'pour', from: 'jug_1', to: 'jug_0' },
    ],
  };
}
