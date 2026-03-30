import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveBalanceScale } from './solver';

export type BalanceVariant = 'basic' | 'unknown-weight' | 'multiple-fake' | 'broken-scale';

export type BalanceWeighing = {
  left: number[];
  right: number[];
  result: 'left-heavy' | 'right-heavy' | 'balanced';
};

export interface BalanceScalePuzzle extends BasePuzzle {
  category: 'balance-scale';
  variant: BalanceVariant;
  coinCount: number;
  fakeCoinIndex: number;
  fakeIsHeavier: boolean;
  maxWeighings: number;
  // unknown-weight: you don't know if the fake coin is heavier or lighter
  unknownDirection: boolean;
  // multiple-fake: there are multiple fake coins
  fakeCoinIndices?: number[];
  fakeWeights?: boolean[]; // true=heavier, false=lighter for each fake
  // broken-scale: one weighing slot has a fixed bias
  brokenSide?: 'left' | 'right';
  brokenBias?: number; // the bias adds this many "virtual coins" to the broken side
  solution: BalanceWeighing[];
}

interface BalanceTheme {
  name: string;
  itemName: string;
  storyTemplate: (count: number, maxW: number, variant: BalanceVariant, puzzle: BalanceScalePuzzle) => string;
}

const THEMES: BalanceTheme[] = [
  {
    name: '왕실 금고',
    itemName: '금화',
    storyTemplate: (count, maxW, variant, puzzle) => {
      let base = `⚖️왕실 금고에 ${count}개의 금화가 있는데, 그 중 하나가 가짜입니다! 양팔 저울을 최대 ${maxW}번 사용하여 가짜 금화를 찾아내세요.`;
      if (variant === 'unknown-weight') base += ' ⚠️ 가짜가 무거운지 가벼운지 알 수 없습니다!';
      if (variant === 'multiple-fake') base += ` ⚠️ 가짜 금화가 ${puzzle.fakeCoinIndices?.length ?? 2}개입니다!`;
      if (variant === 'broken-scale') base += ` ⚠️ 저울의 ${puzzle.brokenSide === 'left' ? '왼쪽' : '오른쪽'}에 편향이 있습니다!`;
      return base;
    },
  },
  {
    name: '마법사의 보석',
    itemName: '보석',
    storyTemplate: (count, maxW, variant, puzzle) => {
      let base = `💎마법사가 ${count}개의 보석 중 가짜를 감지했습니다. 마법 저울을 ${maxW}번만 사용할 수 있습니다.`;
      if (variant === 'unknown-weight') base += ' ⚠️ 가짜 보석의 무게 차이 방향을 모릅니다!';
      if (variant === 'multiple-fake') base += ` ⚠️ 가짜 보석이 ${puzzle.fakeCoinIndices?.length ?? 2}개 섞여 있습니다!`;
      if (variant === 'broken-scale') base += ' ⚠️ 저울에 마법 간섭이 있어 한쪽이 무거워집니다!';
      return base;
    },
  },
  {
    name: '동전 감별사',
    itemName: '동전',
    storyTemplate: (count, maxW, variant, puzzle) => {
      let base = `🪙동전 감별사에게 ${count}개의 동전이 주어졌습니다. 저울을 ${maxW}번만 사용해서 위조 동전을 가려내세요!`;
      if (variant === 'unknown-weight') base += ' ⚠️ 위조 동전이 무거운지 가벼운지 확인해야 합니다!';
      if (variant === 'multiple-fake') base += ` ⚠️ 위조 동전이 ${puzzle.fakeCoinIndices?.length ?? 2}개입니다!`;
      if (variant === 'broken-scale') base += ' ⚠️ 저울이 고장나서 한쪽으로 기울어집니다!';
      return base;
    },
  },
];

function getVariant(difficulty: number, seed: number, rng: SeededRandom): BalanceVariant {
  if (difficulty <= 3) {
    const variants: BalanceVariant[] = ['basic', 'basic', 'unknown-weight'];
    return variants[seed % variants.length];
  }
  if (difficulty <= 4) return rng.pick(['basic', 'unknown-weight']);
  if (difficulty <= 6) return rng.pick(['unknown-weight', 'multiple-fake']); // multiple-fake from 5+
  if (difficulty <= 8) return rng.pick(['multiple-fake', 'broken-scale']);
  return rng.pick(['multiple-fake', 'broken-scale']);
}

function getCoinCount(difficulty: number, variant: BalanceVariant, seed: number): number {
  if (variant === 'multiple-fake') {
    // Fewer coins for multi-fake (harder to solve)
    if (difficulty <= 6) return 8;
    if (difficulty <= 8) return 9;
    return 10;
  }
  if (difficulty <= 3) {
    const options = [8, 9, 10]; // 6 is too easy → min 8
    return options[seed % options.length];
  }
  if (difficulty <= 6) {
    const options = [10, 11, 12];
    return options[seed % options.length];
  }
  if (difficulty <= 8) {
    const options = [12, 13, 15];
    return options[seed % options.length];
  }
  return 15;
}

function maxWeighingsForCoins(n: number, variant: BalanceVariant): number {
  if (variant === 'multiple-fake') {
    // More weighings needed for multiple fakes
    return Math.ceil(Math.log(2 * n) / Math.log(3)) + 1;
  }
  if (variant === 'broken-scale') {
    return Math.ceil(Math.log(2 * n) / Math.log(3)) + 1;
  }
  return Math.ceil(Math.log(2 * n) / Math.log(3));
}

export function generateBalanceScale(difficulty: number, seed: number): BalanceScalePuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = THEMES[(seed % THEMES.length + attempt) % THEMES.length];
    const variant = getVariant(difficulty, seed, rng);
    const coinCount = getCoinCount(difficulty, variant, seed);
    const maxWeighings = maxWeighingsForCoins(coinCount, variant);
    const fakeCoinIndex = rng.int(0, coinCount - 1);
    const fakeIsHeavier = (seed % 2) === 0;

    const puzzle: BalanceScalePuzzle = {
      seed,
      difficulty,
      category: 'balance-scale',
      variant,
      optimalSteps: maxWeighings,
      story: '',
      rules: [],
      hints: [],
      coinCount,
      fakeCoinIndex,
      fakeIsHeavier,
      maxWeighings,
      unknownDirection: variant === 'unknown-weight',
      solution: [],
    };

    // Multiple-fake variant setup
    if (variant === 'multiple-fake') {
      const fakeCount = difficulty >= 8 ? 3 : 2;
      const allIndices = Array.from({ length: coinCount }, (_, i) => i);
      const fakeIndices = rng.pickN(allIndices, fakeCount);
      const fakeWeights = fakeIndices.map(() => rng.boolean());
      puzzle.fakeCoinIndices = fakeIndices;
      puzzle.fakeWeights = fakeWeights;
      // Set primary fake for backward compatibility
      puzzle.fakeCoinIndex = fakeIndices[0];
      puzzle.fakeIsHeavier = fakeWeights[0];
    }

    // Broken-scale variant setup
    if (variant === 'broken-scale') {
      puzzle.brokenSide = rng.pick(['left', 'right']);
      puzzle.brokenBias = 1; // bias equivalent to 1 coin
    }

    const result = solveBalanceScale(puzzle);
    if (!result.solvable) continue;
    // Reject puzzles solvable in fewer than 3 weighings - too trivial
    if (result.maxWeighingsNeeded < 3) continue;

    puzzle.solution = result.strategy;
    puzzle.optimalSteps = result.maxWeighingsNeeded;
    puzzle.story = theme.storyTemplate(coinCount, maxWeighings, variant, puzzle);

    puzzle.rules = [
      `${coinCount}개의 ${theme.itemName} 중 ${variant === 'multiple-fake' ? `${puzzle.fakeCoinIndices?.length ?? 2}개가` : '하나가'} 가짜입니다.`,
      `양팔 저울을 최대 ${maxWeighings}번 사용할 수 있습니다.`,
      '양쪽에 같은 수의 동전을 올려야 합니다.',
      '결과: 왼쪽 무거움 / 오른쪽 무거움 / 균형',
    ];

    if (variant === 'basic') {
      puzzle.rules.push(`가짜 ${theme.itemName}은 진짜보다 ${fakeIsHeavier ? '무겁습니다' : '가볍습니다'}.`);
      puzzle.rules.push('가짜 동전의 번호를 맞춰야 합니다.');
    }

    if (variant === 'unknown-weight') {
      puzzle.rules.push(`가짜 ${theme.itemName}은 진짜보다 무겁거나 가벼울 수 있습니다.`);
      puzzle.rules.push('가짜 동전의 번호와 무거운지 가벼운지 모두 맞춰야 합니다.');
    }

    if (variant === 'multiple-fake' && puzzle.fakeCoinIndices) {
      puzzle.rules.push(`${puzzle.fakeCoinIndices.length}개의 가짜가 있으며, 각각 무겁거나 가벼울 수 있습니다.`);
      puzzle.rules.push('모든 가짜 동전을 찾고 각각의 무게 차이를 맞춰야 합니다.');
    }

    if (variant === 'broken-scale') {
      puzzle.rules.push(`⚠️ 저울의 ${puzzle.brokenSide === 'left' ? '왼쪽' : '오른쪽'}이 항상 동전 ${puzzle.brokenBias}개만큼 무겁게 측정됩니다.`);
      puzzle.rules.push('편향을 고려하여 결과를 해석해야 합니다.');
    }

    puzzle.hints = [
      `${maxWeighings}번의 측정으로 충분합니다.`,
      '각 측정으로 가능성을 1/3로 줄일 수 있습니다.',
      `N개 동전은 최소 ceil(log₃(2N)) 번의 측정이 필요합니다.`,
      `${theme.itemName}을 3등분하여 측정하면 효율적입니다.`,
      '균형이면 저울 위의 동전은 모두 진짜입니다.',
    ];
    if (coinCount <= 9) {
      puzzle.hints.push(`첫 측정에서 ${Math.floor(coinCount / 3)}개씩 올려보세요.`);
    }
    if (variant === 'unknown-weight') {
      puzzle.hints.push('첫 측정 결과로 무거운지 가벼운지의 범위를 좁히세요.');
    }
    if (variant === 'multiple-fake') {
      puzzle.hints.push('여러 가짜를 한 번에 찾는 것은 어렵습니다. 그룹을 나눠 비교하세요.');
    }
    if (variant === 'broken-scale') {
      puzzle.hints.push('편향을 상쇄하려면 양쪽에 같은 동전을 배치해 보세요.');
    }

    return puzzle;
  }

  // Fallback
  return {
    seed,
    difficulty,
    category: 'balance-scale',
    variant: 'basic',
    optimalSteps: 3,
    story: '⚖️8개의 금화 중 하나가 가짜입니다. 저울을 3번 사용하여 찾아내세요!',
    rules: [
      '8개의 금화 중 하나가 가짜입니다.',
      '가짜는 진짜보다 무겁습니다.',
      '최대 3번 저울을 사용할 수 있습니다.',
    ],
    hints: ['3번이면 충분합니다.', '3개씩 올려보세요.'],
    coinCount: 8,
    fakeCoinIndex: 0,
    fakeIsHeavier: true,
    maxWeighings: 3,
    unknownDirection: false,
    solution: [
      { left: [0, 1, 2], right: [3, 4, 5], result: 'left-heavy' },
      { left: [0], right: [1], result: 'balanced' },
      { left: [0], right: [6], result: 'left-heavy' },
    ],
  };
}
