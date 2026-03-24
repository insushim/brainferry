import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveSequenceSort } from './solver';

export type SortMove = {
  op: 'flip' | 'swap' | 'rotate';
  index: number;
  count?: number;
};

export interface SequenceSortPuzzle extends BasePuzzle {
  category: 'sequence-sort';
  items: { id: string; label: string; value: number }[];
  allowedOps: ('flip' | 'swap' | 'rotate')[];
  initialOrder: number[];
  goalOrder: number[];
  solution: SortMove[];
}

interface SortTheme {
  name: string;
  labelTemplate: (value: number) => string;
  storyTemplate: (count: number, ops: string[]) => string;
}

const THEMES: SortTheme[] = [
  {
    name: '팬케이크',
    labelTemplate: (v) => `${v}단 팬케이크`,
    storyTemplate: (count, ops) =>
      `🥞${count}개의 팬케이크를 크기 순서대로 정렬해야 합니다! 사용 가능한 도구: ${ops.join(', ')}. 가장 작은 것이 위로 오도록 정렬하세요.`,
  },
  {
    name: '책장 정리',
    labelTemplate: (v) => `${v}권`,
    storyTemplate: (count, ops) =>
      `📚책장에 ${count}권의 책이 뒤섞여 있습니다. ${ops.join(', ')} 연산을 사용하여 번호 순서대로 정리하세요!`,
  },
  {
    name: '블록 쌓기',
    labelTemplate: (v) => `${v}번 블록`,
    storyTemplate: (count, ops) =>
      `🧱${count}개의 번호가 매겨진 블록을 순서대로 정렬하세요. 사용 가능: ${ops.join(', ')}. 1번이 맨 앞에 오도록!`,
  },
  {
    name: '카드 정렬',
    labelTemplate: (v) => `${v}번 카드`,
    storyTemplate: (count, ops) =>
      `🃏${count}장의 카드를 번호 순서대로 정렬하세요. 허용된 동작: ${ops.join(', ')}.`,
  },
];

const OP_NAMES: Record<string, string> = {
  flip: '뒤집기(flip)',
  swap: '교환(swap)',
  rotate: '회전(rotate)',
};

function getItemCount(difficulty: number): number {
  if (difficulty <= 2) return 4;
  if (difficulty <= 4) return 5;
  if (difficulty <= 6) return 5;
  if (difficulty <= 8) return 6;
  return 7;
}

function getAllowedOps(difficulty: number, rng: SeededRandom): ('flip' | 'swap' | 'rotate')[] {
  if (difficulty <= 2) return ['swap'];
  if (difficulty <= 4) return rng.pick([['swap', 'flip'] as const, ['swap', 'rotate'] as const]).slice() as ('flip' | 'swap' | 'rotate')[];
  if (difficulty <= 6) return ['flip', 'swap'];
  return rng.pick([
    ['flip'] as const,
    ['flip', 'rotate'] as const,
    ['swap', 'rotate'] as const,
  ]).slice() as ('flip' | 'swap' | 'rotate')[];
}

export function generateSequenceSort(difficulty: number, seed: number): SequenceSortPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = rng.pick(THEMES);
    const count = getItemCount(difficulty);
    const ops = getAllowedOps(difficulty, rng);

    const goalOrder = Array.from({ length: count }, (_, i) => i + 1);
    const initialOrder = rng.shuffle(goalOrder);

    // Skip if already sorted
    if (initialOrder.join(',') === goalOrder.join(',')) continue;

    const items = goalOrder.map(v => ({
      id: `item_${v}`,
      label: theme.labelTemplate(v),
      value: v,
    }));

    const puzzle: SequenceSortPuzzle = {
      seed,
      difficulty,
      category: 'sequence-sort',
      optimalSteps: 0,
      story: '',
      rules: [],
      hints: [],
      items,
      allowedOps: ops,
      initialOrder,
      goalOrder,
      solution: [],
    };

    const result = solveSequenceSort(puzzle);
    if (!result.solvable) continue;

    // Filter out too easy/hard
    if (difficulty <= 3 && result.moves.length > 8) continue;
    if (difficulty >= 7 && result.moves.length < 3) continue;

    puzzle.solution = result.moves;
    puzzle.optimalSteps = result.moves.length;

    const opNames = ops.map(o => OP_NAMES[o]);
    puzzle.story = theme.storyTemplate(count, opNames);

    puzzle.rules = [
      `현재 순서: [${initialOrder.join(', ')}]`,
      `목표 순서: [${goalOrder.join(', ')}]`,
    ];
    if (ops.includes('swap')) {
      puzzle.rules.push('교환(swap): 인접한 두 항목의 위치를 바꿉니다.');
    }
    if (ops.includes('flip')) {
      puzzle.rules.push('뒤집기(flip): 처음부터 N개 항목의 순서를 뒤집습니다.');
    }
    if (ops.includes('rotate')) {
      puzzle.rules.push('회전(rotate): 지정 위치부터 연속 항목을 오른쪽으로 회전합니다.');
    }

    puzzle.hints = [
      `최소 ${result.moves.length}번의 동작이 필요합니다.`,
    ];
    if (result.moves.length > 0) {
      const first = result.moves[0];
      if (first.op === 'swap') {
        puzzle.hints.push(`첫 동작: ${first.index + 1}번째와 ${first.index + 2}번째를 교환`);
      } else if (first.op === 'flip') {
        puzzle.hints.push(`첫 동작: 처음 ${first.count}개를 뒤집기`);
      } else {
        puzzle.hints.push(`첫 동작: ${first.index + 1}번 위치에서 회전`);
      }
    }
    if (ops.includes('flip') && count >= 5) {
      puzzle.hints.push('가장 큰 값을 먼저 제자리에 놓는 전략을 시도하세요.');
    }

    return puzzle;
  }

  // Fallback: simple 4-element swap puzzle
  return {
    seed,
    difficulty,
    category: 'sequence-sort',
    optimalSteps: 3,
    story: '🥞4개의 팬케이크를 순서대로 정렬하세요! 사용 가능: 교환(swap).',
    rules: [
      '현재 순서: [3, 1, 4, 2]',
      '목표 순서: [1, 2, 3, 4]',
      '교환(swap): 인접한 두 항목의 위치를 바꿉니다.',
    ],
    hints: ['최소 3번 동작이 필요합니다.'],
    items: [
      { id: 'item_1', label: '1단 팬케이크', value: 1 },
      { id: 'item_2', label: '2단 팬케이크', value: 2 },
      { id: 'item_3', label: '3단 팬케이크', value: 3 },
      { id: 'item_4', label: '4단 팬케이크', value: 4 },
    ],
    allowedOps: ['swap'],
    initialOrder: [3, 1, 4, 2],
    goalOrder: [1, 2, 3, 4],
    solution: [
      { op: 'swap', index: 0 },
      { op: 'swap', index: 2 },
      { op: 'swap', index: 1 },
    ],
  };
}
