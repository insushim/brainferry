import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveSequenceSort } from './solver';

export type SortVariant = 'basic' | 'limited-ops' | 'blind' | 'multi-target';

export type SortMove = {
  op: 'flip' | 'swap' | 'rotate';
  index: number;
  count?: number;
};

export interface SequenceSortPuzzle extends BasePuzzle {
  category: 'sequence-sort';
  variant: SortVariant;
  items: { id: string; label: string; value: number }[];
  allowedOps: ('flip' | 'swap' | 'rotate')[];
  initialOrder: number[];
  goalOrder: number[];
  // limited-ops: maximum number of operations allowed
  maxOps?: number;
  // blind: some positions are hidden (player can't see the values)
  hiddenPositions?: number[];
  // multi-target: multiple acceptable goal orderings
  alternateGoals?: number[][];
  solution: SortMove[];
}

interface SortTheme {
  name: string;
  labelTemplate: (value: number) => string;
  storyTemplate: (count: number, ops: string[], variant: SortVariant, puzzle: SequenceSortPuzzle) => string;
}

const THEMES: SortTheme[] = [
  {
    name: '팬케이크',
    labelTemplate: (v) => `${v}단 팬케이크`,
    storyTemplate: (count, ops, variant, puzzle) => {
      let base = `🥞${count}개의 팬케이크를 크기 순서대로 정렬해야 합니다! 사용 가능한 도구: ${ops.join(', ')}.`;
      if (variant === 'limited-ops') base += ` ⚠️ 최대 ${puzzle.maxOps}번만 조작할 수 있습니다!`;
      if (variant === 'blind') base += ' ⚠️ 일부 팬케이크의 크기가 보이지 않습니다!';
      if (variant === 'multi-target') base += ' 여러 가지 정답이 있을 수 있습니다!';
      return base;
    },
  },
  {
    name: '책장 정리',
    labelTemplate: (v) => `${v}권`,
    storyTemplate: (count, ops, variant, puzzle) => {
      let base = `📚책장에 ${count}권의 책이 뒤섞여 있습니다. ${ops.join(', ')} 연산을 사용하여 번호 순서대로 정리하세요!`;
      if (variant === 'limited-ops') base += ` ⚠️ ${puzzle.maxOps}번 이내로 정리해야 합니다!`;
      if (variant === 'blind') base += ' ⚠️ 일부 책 제목이 가려져 있습니다!';
      if (variant === 'multi-target') base += ' 여러 정렬 기준이 허용됩니다!';
      return base;
    },
  },
  {
    name: '블록 쌓기',
    labelTemplate: (v) => `${v}번 블록`,
    storyTemplate: (count, ops, variant, puzzle) => {
      let base = `🧱${count}개의 번호가 매겨진 블록을 순서대로 정렬하세요. 사용 가능: ${ops.join(', ')}.`;
      if (variant === 'limited-ops') base += ` ⚠️ ${puzzle.maxOps}번의 기회뿐입니다!`;
      if (variant === 'blind') base += ' ⚠️ 일부 블록의 번호가 보이지 않습니다!';
      if (variant === 'multi-target') base += ' 오름차순 또는 내림차순 모두 허용됩니다!';
      return base;
    },
  },
  {
    name: '카드 정렬',
    labelTemplate: (v) => `${v}번 카드`,
    storyTemplate: (count, ops, variant, puzzle) => {
      let base = `🃏${count}장의 카드를 번호 순서대로 정렬하세요. 허용된 동작: ${ops.join(', ')}.`;
      if (variant === 'limited-ops') base += ` ⚠️ ${puzzle.maxOps}번의 동작 제한!`;
      if (variant === 'blind') base += ' ⚠️ 일부 카드가 뒤집혀 보이지 않습니다!';
      if (variant === 'multi-target') base += ' 여러 정렬이 정답으로 인정됩니다!';
      return base;
    },
  },
];

const OP_NAMES: Record<string, string> = {
  flip: '뒤집기(flip)',
  swap: '교환(swap)',
  rotate: '회전(rotate)',
};

function getVariant(difficulty: number, rng: SeededRandom): SortVariant {
  if (difficulty <= 3) return 'basic';
  if (difficulty <= 5) return rng.pick(['basic', 'limited-ops']);
  if (difficulty <= 7) return rng.pick(['limited-ops', 'blind']);
  return rng.pick(['blind', 'multi-target']);
}

function getItemCount(difficulty: number): number {
  if (difficulty <= 2) return 4;
  if (difficulty <= 4) return 5;
  if (difficulty <= 6) return 6;
  if (difficulty <= 8) return 7;
  return 8;
}

function getAllowedOps(difficulty: number, rng: SeededRandom): ('flip' | 'swap' | 'rotate')[] {
  if (difficulty <= 2) return ['swap'];
  if (difficulty <= 4) return rng.pick([['swap', 'flip'] as const, ['swap', 'rotate'] as const]).slice() as ('flip' | 'swap' | 'rotate')[];
  if (difficulty <= 6) return ['flip', 'swap'];
  if (difficulty <= 8) return rng.pick([
    ['flip', 'rotate'] as const,
    ['swap', 'rotate'] as const,
    ['flip', 'swap'] as const,
  ]).slice() as ('flip' | 'swap' | 'rotate')[];
  // Max difficulty: all operations available but variants will add constraints
  return ['flip', 'swap', 'rotate'];
}

export function generateSequenceSort(difficulty: number, seed: number): SequenceSortPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = rng.pick(THEMES);
    const variant = getVariant(difficulty, rng);
    const count = getItemCount(difficulty);
    const ops = getAllowedOps(difficulty, rng);

    const goalOrder = Array.from({ length: count }, (_, i) => i + 1);
    const initialOrder = rng.shuffle(goalOrder);

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
      variant,
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

    // Variant-specific setup
    if (variant === 'limited-ops') {
      // Will be set after solving to be optimal + 1
    }

    if (variant === 'blind') {
      // Hide 1-2 positions
      const hideCount = Math.min(2, Math.floor(count / 3));
      puzzle.hiddenPositions = rng.pickN(
        Array.from({ length: count }, (_, i) => i),
        hideCount
      );
    }

    if (variant === 'multi-target') {
      // Add reversed order as an alternate goal
      const reversed = [...goalOrder].reverse();
      puzzle.alternateGoals = [reversed];
    }

    const result = solveSequenceSort(puzzle);
    if (!result.solvable) continue;

    if (difficulty <= 3 && result.moves.length > 8) continue;
    if (difficulty >= 7 && result.moves.length < 3) continue;

    puzzle.solution = result.moves;
    puzzle.optimalSteps = result.moves.length;

    if (variant === 'limited-ops') {
      // Give player optimal + 2 moves
      puzzle.maxOps = result.moves.length + 2;
    }

    const opNames = ops.map(o => OP_NAMES[o]);
    puzzle.story = theme.storyTemplate(count, opNames, variant, puzzle);

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

    if (variant === 'limited-ops' && puzzle.maxOps) {
      puzzle.rules.push(`⚠️ 최대 ${puzzle.maxOps}번의 동작만 허용됩니다!`);
    }
    if (variant === 'blind' && puzzle.hiddenPositions) {
      const hiddenLabels = puzzle.hiddenPositions.map(p => `${p + 1}번`).join(', ');
      puzzle.rules.push(`⚠️ ${hiddenLabels} 위치의 값이 숨겨져 있습니다! (동작을 수행하면 공개될 수 있습니다)`);
    }
    if (variant === 'multi-target') {
      puzzle.rules.push('⚠️ 오름차순 또는 내림차순 어느 쪽이든 완성하면 정답입니다!');
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
    if (variant === 'limited-ops') {
      puzzle.hints.push('동작 수가 제한되어 있으므로 최적에 가까운 전략이 필요합니다.');
    }
    if (variant === 'blind') {
      puzzle.hints.push('숨겨진 위치를 추론하면서 정렬하세요.');
    }
    if (variant === 'multi-target') {
      puzzle.hints.push('더 적은 동작으로 달성 가능한 목표를 선택하세요.');
    }

    return puzzle;
  }

  // Fallback
  return {
    seed,
    difficulty,
    category: 'sequence-sort',
    variant: 'basic',
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
