import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveWaterJug } from './solver';

export type JugVariant = 'basic-2' | 'basic-3' | 'leaky' | 'mixing';

export type JugMove = {
  action: 'fill' | 'empty' | 'pour';
  from?: string;
  to?: string;
  jugId?: string;
  color?: string; // for mixing variant
};

export interface WaterJugPuzzle extends BasePuzzle {
  category: 'water-jug';
  variant: JugVariant;
  jugs: { id: string; capacity: number; color?: string }[];
  target: number;
  targetJug?: string;
  leakyJugId?: string; // for leaky: which jug leaks
  leakAmount?: number; // for leaky: how much leaks per action
  mixTargets?: { jugId: string; color: string; amount: number }[]; // for mixing
  solution: JugMove[];
}

interface JugTheme {
  name: string;
  storyTemplate: (jugs: { id: string; capacity: number }[], target: number, variant: JugVariant, puzzle: WaterJugPuzzle) => string;
}

const THEMES: JugTheme[] = [
  {
    name: '물약 제조',
    storyTemplate: (jugs, target, variant, puzzle) => {
      const jugDesc = jugs.map(j => `${j.capacity}리터 플라스크`).join('와 ');
      let extra = '';
      if (variant === 'leaky') extra = ` ⚠️ 하나의 플라스크에 균열이 있어 매 동작마다 ${puzzle.leakAmount}리터씩 새어나갑니다!`;
      if (variant === 'mixing') extra = ' ⚠️ 빨강/파랑 두 색의 액체가 있습니다. 섞이면 안 됩니다!';
      return `🧪마법사가 물약을 만들려면 정확히 ${target}리터의 마법의 물이 필요합니다. ${jugDesc}만 사용할 수 있습니다.${extra}`;
    },
  },
  {
    name: '우물에서',
    storyTemplate: (jugs, target, variant, puzzle) => {
      const jugDesc = jugs.map(j => `${j.capacity}리터 양동이`).join('와 ');
      let extra = '';
      if (variant === 'leaky') extra = ` ⚠️ 하나의 양동이에 구멍이 있어 매 동작마다 ${puzzle.leakAmount}리터씩 샙니다!`;
      if (variant === 'mixing') extra = ' ⚠️ 깨끗한 물과 약수 두 종류를 분리해야 합니다!';
      return `🪣우물에서 정확히 ${target}리터의 물을 길어와야 합니다. 가진 것은 ${jugDesc}뿐입니다.${extra}`;
    },
  },
  {
    name: '요리사',
    storyTemplate: (jugs, target, variant, puzzle) => {
      const jugDesc = jugs.map(j => `${j.capacity}리터 컵`).join('과 ');
      let extra = '';
      if (variant === 'leaky') extra = ` ⚠️ 한 컵에 금이 가서 매 동작마다 ${puzzle.leakAmount}리터씩 줄어듭니다!`;
      if (variant === 'mixing') extra = ' ⚠️ 간장과 식초를 따로 담아야 합니다!';
      return `👨‍🍳요리사가 레시피에 정확히 ${target}리터의 육수가 필요합니다. ${jugDesc}을 사용해서 정확히 측정하세요!${extra}`;
    },
  },
];

const TWO_JUG_CONFIGS: { caps: [number, number]; targets: number[] }[] = [
  { caps: [3, 5], targets: [1, 2, 4] },
  { caps: [5, 7], targets: [1, 2, 3, 4, 6] },
  { caps: [3, 7], targets: [1, 2, 4, 5, 6] },
  { caps: [4, 7], targets: [1, 2, 3, 5, 6] },
  { caps: [5, 8], targets: [1, 2, 3, 4, 6, 7] },
  { caps: [3, 8], targets: [1, 2, 4, 5, 6, 7] },
  { caps: [4, 9], targets: [1, 2, 3, 5, 6, 7, 8] },
  { caps: [5, 11], targets: [1, 2, 3, 4, 6, 7, 8, 9] },
  { caps: [4, 11], targets: [1, 2, 3, 5, 6, 7] },
  { caps: [3, 10], targets: [1, 2, 4, 5, 7, 8, 9] },
  { caps: [5, 9], targets: [1, 2, 3, 4, 6, 7, 8] },
  { caps: [7, 11], targets: [1, 2, 3, 4, 5, 6, 8, 9, 10] },
  { caps: [2, 5], targets: [1, 3, 4] },
  { caps: [2, 7], targets: [1, 3, 4, 5, 6] },
];

const THREE_JUG_CONFIGS: { caps: [number, number, number]; targets: number[] }[] = [
  { caps: [3, 5, 8], targets: [1, 2, 4, 6, 7] },
  { caps: [4, 7, 10], targets: [1, 2, 3, 5, 6, 8, 9] },
  { caps: [3, 5, 11], targets: [1, 2, 4, 6, 7, 8, 9, 10] },
  { caps: [5, 7, 12], targets: [1, 2, 3, 4, 6, 8, 9, 10, 11] },
  { caps: [3, 7, 11], targets: [1, 2, 4, 5, 6, 8, 9, 10] },
];

function getVariant(difficulty: number, rng: SeededRandom): JugVariant {
  if (difficulty <= 2) return 'basic-2';
  if (difficulty <= 4) return rng.pick(['basic-2', 'basic-3']);
  if (difficulty <= 6) return rng.pick(['basic-3', 'leaky']);
  if (difficulty <= 8) return rng.pick(['leaky', 'mixing']);
  return 'mixing';  // 9-10은 항상 가장 복잡한 mixing
}

export function generateWaterJug(difficulty: number, seed: number): WaterJugPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = THEMES[(seed % THEMES.length + attempt) % THEMES.length];
    const variant = getVariant(difficulty, rng);

    let jugs: WaterJugPuzzle['jugs'];
    let target: number;

    if (variant === 'basic-2' || variant === 'leaky') {
      const config = TWO_JUG_CONFIGS[(seed % TWO_JUG_CONFIGS.length + attempt) % TWO_JUG_CONFIGS.length];
      jugs = config.caps.map((cap, i) => ({ id: `jug_${i}`, capacity: cap }));
      target = config.targets[(seed % config.targets.length + attempt) % config.targets.length];
    } else if (variant === 'basic-3') {
      const config = THREE_JUG_CONFIGS[(seed % THREE_JUG_CONFIGS.length + attempt) % THREE_JUG_CONFIGS.length];
      jugs = config.caps.map((cap, i) => ({ id: `jug_${i}`, capacity: cap }));
      target = config.targets[(seed % config.targets.length + attempt) % config.targets.length];
    } else {
      // mixing: two jugs for two colors
      const config = TWO_JUG_CONFIGS[(seed % TWO_JUG_CONFIGS.length + attempt) % TWO_JUG_CONFIGS.length];
      jugs = [
        { id: 'jug_0', capacity: config.caps[0], color: 'red' },
        { id: 'jug_1', capacity: config.caps[1], color: 'blue' },
        { id: 'jug_2', capacity: config.caps[0] + config.caps[1], color: undefined }, // mixing container
      ];
      target = config.targets[(seed % config.targets.length + attempt) % config.targets.length];
    }

    const targetJug = difficulty >= 5 ? rng.pick(jugs).id : undefined;

    const puzzle: WaterJugPuzzle = {
      seed,
      difficulty,
      category: 'water-jug',
      variant,
      optimalSteps: 0,
      story: '',
      rules: [],
      hints: [],
      jugs,
      target,
      targetJug,
      solution: [],
    };

    if (variant === 'leaky') {
      puzzle.leakyJugId = rng.pick(jugs).id;
      puzzle.leakAmount = 1;
    }

    if (variant === 'mixing') {
      puzzle.mixTargets = [
        { jugId: 'jug_0', color: 'red', amount: Math.min(target, jugs[0].capacity) },
        { jugId: 'jug_1', color: 'blue', amount: Math.min(target, jugs[1].capacity) },
      ];
    }

    const result = solveWaterJug(puzzle);
    if (!result.solvable) continue;
    if (result.moves.length < 3) continue;

    const steps = result.moves.length;
    if (difficulty <= 3 && steps > 8) continue;
    if (difficulty >= 7 && steps < 4) continue;

    puzzle.solution = result.moves;
    puzzle.optimalSteps = steps;
    puzzle.story = theme.storyTemplate(jugs, target, variant, puzzle);

    puzzle.rules = [
      ...jugs.map(j => {
        const label = j.id === 'jug_0' ? 'A' : j.id === 'jug_1' ? 'B' : 'C';
        const colorInfo = j.color ? ` (${j.color === 'red' ? '빨강' : j.color === 'blue' ? '파랑' : '혼합'})` : '';
        return `${label}통: ${j.capacity}리터 용량${colorInfo}`;
      }),
      `목표: 정확히 ${target}리터를 측정하세요.`,
      '채우기: 수도꼭지에서 물통을 가득 채웁니다.',
      '비우기: 물통의 물을 모두 버립니다.',
      '옮기기: 한 물통에서 다른 물통으로 물을 옮깁니다.',
    ];

    if (targetJug) {
      const jugLabel = targetJug === 'jug_0' ? 'A' : targetJug === 'jug_1' ? 'B' : 'C';
      puzzle.rules.push(`${jugLabel}통에 정확히 ${target}리터가 있어야 합니다.`);
    }

    if (variant === 'leaky') {
      const leakyLabel = puzzle.leakyJugId === 'jug_0' ? 'A' : puzzle.leakyJugId === 'jug_1' ? 'B' : 'C';
      puzzle.rules.push(`⚠️ ${leakyLabel}통 누수: 매 동작 후 ${puzzle.leakAmount}리터 감소 (0 미만 안 됨)`);
    }

    if (variant === 'mixing') {
      puzzle.rules.push('⚠️ 서로 다른 색의 액체를 같은 통에 섞으면 안 됩니다!');
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
    if (variant === 'leaky') {
      puzzle.hints.push('누수를 고려해서 빠르게 진행하세요.');
    }
    if (variant === 'mixing') {
      puzzle.hints.push('각 색의 전용 물통을 정하세요.');
    }
    if (jugs.length === 2) {
      puzzle.hints.push(`두 물통의 용량 차이(${Math.abs(jugs[0].capacity - jugs[1].capacity)})를 활용하세요.`);
    }

    return puzzle;
  }

  // Fallback
  return {
    seed,
    difficulty,
    category: 'water-jug',
    variant: 'basic-2',
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
