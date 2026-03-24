import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveBalanceScale } from './solver';

export type BalanceWeighing = {
  left: number[];
  right: number[];
  result: 'left-heavy' | 'right-heavy' | 'balanced';
};

export interface BalanceScalePuzzle extends BasePuzzle {
  category: 'balance-scale';
  coinCount: number;
  fakeCoinIndex: number;
  fakeIsHeavier: boolean;
  maxWeighings: number;
  solution: BalanceWeighing[];
}

interface BalanceTheme {
  name: string;
  itemName: string;
  storyTemplate: (count: number, maxWeighings: number) => string;
}

const THEMES: BalanceTheme[] = [
  {
    name: '왕실 금고',
    itemName: '금화',
    storyTemplate: (count, maxW) =>
      `⚖️왕실 금고에 ${count}개의 금화가 있는데, 그 중 하나가 가짜입니다! 가짜 금화는 진짜보다 무겁거나 가벼울 수 있습니다. 양팔 저울을 최대 ${maxW}번 사용하여 가짜 금화를 찾고, 진짜보다 무거운지 가벼운지 알아내세요.`,
  },
  {
    name: '마법사의 보석',
    itemName: '보석',
    storyTemplate: (count, maxW) =>
      `💎마법사가 ${count}개의 보석 중 하나가 마법이 깃든 가짜임을 감지했습니다. 마법 저울을 ${maxW}번만 사용할 수 있습니다. 가짜 보석을 찾아내세요!`,
  },
  {
    name: '동전 감별사',
    itemName: '동전',
    storyTemplate: (count, maxW) =>
      `🪙동전 감별사에게 ${count}개의 동전이 주어졌습니다. 하나는 위조품입니다. 저울을 ${maxW}번만 사용해서 위조 동전을 가려내세요!`,
  },
];

function getCoinCount(difficulty: number): number {
  if (difficulty <= 2) return 8;
  if (difficulty <= 4) return 9;
  if (difficulty <= 6) return 10;
  if (difficulty <= 8) return 11;
  return 12;
}

function maxWeighingsForCoins(n: number): number {
  // ceil(log3(2n)) - need to distinguish 2n possibilities (n coins * heavier/lighter)
  return Math.ceil(Math.log(2 * n) / Math.log(3));
}

export function generateBalanceScale(difficulty: number, seed: number): BalanceScalePuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = rng.pick(THEMES);
    const coinCount = getCoinCount(difficulty);
    const maxWeighings = maxWeighingsForCoins(coinCount);
    const fakeCoinIndex = rng.int(0, coinCount - 1);
    const fakeIsHeavier = rng.boolean();

    const puzzle: BalanceScalePuzzle = {
      seed,
      difficulty,
      category: 'balance-scale',
      optimalSteps: maxWeighings,
      story: '',
      rules: [],
      hints: [],
      coinCount,
      fakeCoinIndex,
      fakeIsHeavier,
      maxWeighings,
      solution: [],
    };

    const result = solveBalanceScale(puzzle);
    if (!result.solvable) continue;

    puzzle.solution = result.strategy;
    puzzle.optimalSteps = result.maxWeighingsNeeded;
    puzzle.story = theme.storyTemplate(coinCount, maxWeighings);

    puzzle.rules = [
      `${coinCount}개의 ${theme.itemName} 중 하나가 가짜입니다.`,
      `가짜 ${theme.itemName}은 진짜보다 무겁거나 가벼울 수 있습니다.`,
      `양팔 저울을 최대 ${maxWeighings}번 사용할 수 있습니다.`,
      '양쪽에 같은 수의 동전을 올려야 합니다.',
      '결과: 왼쪽 무거움 / 오른쪽 무거움 / 균형',
      '가짜 동전의 번호와 무거운지 가벼운지 모두 맞춰야 합니다.',
    ];

    puzzle.hints = [
      `${maxWeighings}번의 측정으로 충분합니다.`,
      `${theme.itemName}을 3등분하여 측정하면 효율적입니다.`,
      '균형이면 저울 위의 동전은 모두 진짜입니다.',
    ];
    if (coinCount <= 9) {
      puzzle.hints.push(`첫 측정에서 ${Math.floor(coinCount / 3)}개씩 올려보세요.`);
    }

    return puzzle;
  }

  // Fallback: 8 coins, 3 weighings
  return {
    seed,
    difficulty,
    category: 'balance-scale',
    optimalSteps: 3,
    story: '⚖️8개의 금화 중 하나가 가짜입니다. 저울을 3번 사용하여 찾아내세요!',
    rules: [
      '8개의 금화 중 하나가 가짜입니다.',
      '가짜는 무겁거나 가벼울 수 있습니다.',
      '최대 3번 저울을 사용할 수 있습니다.',
    ],
    hints: ['3번이면 충분합니다.', '3개씩 올려보세요.'],
    coinCount: 8,
    fakeCoinIndex: 0,
    fakeIsHeavier: true,
    maxWeighings: 3,
    solution: [
      { left: [0, 1, 2], right: [3, 4, 5], result: 'left-heavy' },
      { left: [0], right: [1], result: 'balanced' },
      { left: [0], right: [6], result: 'left-heavy' },
    ],
  };
}
