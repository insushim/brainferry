import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveHanoi } from './solver';

export type HanoiMove = {
  from: number;
  to: number;
  disc: number;
};

export interface HanoiPuzzle extends BasePuzzle {
  category: 'tower-hanoi';
  discCount: number;
  pegCount: number;
  initialState: number[][]; // peg -> disc sizes (bottom to top, small=1)
  goalState: number[][];
  moveRestrictions?: { from: number; to: number }[];
  solution: HanoiMove[];
}

interface HanoiTheme {
  name: string;
  storyTemplate: (discCount: number, pegCount: number, hasRestrictions: boolean) => string;
}

const THEMES: HanoiTheme[] = [
  {
    name: '마법 탑',
    storyTemplate: (discs, pegs, hasRestrictions) =>
      `🗼마법의 탑에 ${discs}개의 원반이 있습니다. ${pegs}개의 기둥을 사용해 모든 원반을 마지막 기둥으로 옮기세요.${hasRestrictions ? ' 주의: 일부 기둥 간 직접 이동이 금지되어 있습니다!' : ''}`,
  },
  {
    name: '수도승',
    storyTemplate: (discs, pegs, hasRestrictions) =>
      `🙏수도승이 ${discs}개의 금 원반을 옮겨야 합니다. ${pegs}개의 다이아몬드 기둥을 사용합니다.${hasRestrictions ? ' 성스러운 규칙에 의해 일부 이동이 제한됩니다!' : ''}`,
  },
  {
    name: '요리사',
    storyTemplate: (discs, pegs, hasRestrictions) =>
      `👨‍🍳요리사가 ${discs}장의 팬케이크를 정리해야 합니다. ${pegs}개의 접시를 사용하세요.${hasRestrictions ? ' 일부 접시 간 직접 이동이 불가합니다!' : ''}`,
  },
];

function getDiscCount(difficulty: number): number {
  if (difficulty <= 2) return 3;
  if (difficulty <= 4) return 4;
  if (difficulty <= 6) return 5;
  if (difficulty <= 8) return 6;
  return 7;
}

export function generateHanoi(difficulty: number, seed: number): HanoiPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = rng.pick(THEMES);
    const discCount = getDiscCount(difficulty);
    const pegCount = 3;

    // Standard initial: all discs on peg 0, largest at bottom
    const discs = Array.from({ length: discCount }, (_, i) => discCount - i); // [N, N-1, ..., 1]

    let initialState: number[][] = [discs, [], []];
    let goalState: number[][] = [[], [], [...discs]];
    let moveRestrictions: { from: number; to: number }[] | undefined;

    // For harder difficulties, add variations
    if (difficulty >= 6 && rng.boolean(0.5)) {
      // Restriction: can't move directly from peg 0 to peg 2 (or vice versa)
      moveRestrictions = [
        { from: 0, to: 2 },
        { from: 2, to: 0 },
      ];
    }

    if (difficulty >= 8 && rng.boolean(0.4)) {
      // Scattered initial state: distribute discs across pegs
      initialState = [[], [], []];
      const shuffled = rng.shuffle(discs);
      for (const disc of shuffled) {
        const peg = rng.int(0, pegCount - 1);
        // Must maintain order within each peg (larger discs below)
        // Find valid insertion
        let placed = false;
        for (let p = 0; p < pegCount; p++) {
          const targetPeg = (peg + p) % pegCount;
          const top = initialState[targetPeg];
          if (top.length === 0 || top[top.length - 1] > disc) {
            top.push(disc);
            placed = true;
            break;
          }
        }
        if (!placed) {
          initialState[0].push(disc);
        }
      }
      // Sort each peg to ensure valid state (largest at bottom)
      for (const peg of initialState) {
        peg.sort((a, b) => b - a);
      }
    }

    const puzzle: HanoiPuzzle = {
      seed,
      difficulty,
      category: 'tower-hanoi',
      optimalSteps: 0,
      story: '',
      rules: [],
      hints: [],
      discCount,
      pegCount,
      initialState,
      goalState,
      moveRestrictions,
      solution: [],
    };

    const result = solveHanoi(puzzle);
    if (!result.solvable) continue;

    puzzle.solution = result.moves;
    puzzle.optimalSteps = result.moves.length;
    puzzle.story = theme.storyTemplate(discCount, pegCount, !!moveRestrictions);

    puzzle.rules = [
      '한 번에 하나의 원반만 이동할 수 있습니다.',
      '큰 원반을 작은 원반 위에 놓을 수 없습니다.',
      '모든 원반을 마지막 기둥으로 옮기세요.',
    ];
    if (moveRestrictions) {
      for (const r of moveRestrictions) {
        puzzle.rules.push(`기둥 ${r.from + 1}에서 기둥 ${r.to + 1}(으)로 직접 이동할 수 없습니다.`);
      }
    }

    puzzle.hints = [
      `최소 ${result.moves.length}번 이동이 필요합니다.`,
    ];
    if (!moveRestrictions && !puzzle.initialState.some((p, i) => i > 0 && p.length > 0)) {
      puzzle.hints.push(`표준 하노이 탑: 최적 해는 ${Math.pow(2, discCount) - 1}번입니다.`);
    }
    if (result.moves.length > 0) {
      puzzle.hints.push(`첫 이동: 원반 ${result.moves[0].disc}을 기둥 ${result.moves[0].from + 1}에서 기둥 ${result.moves[0].to + 1}(으)로`);
    }
    if (discCount >= 5) {
      puzzle.hints.push('작은 원반들의 패턴을 먼저 파악하세요.');
    }

    return puzzle;
  }

  // Fallback: standard 3-disc Hanoi
  const discs = [3, 2, 1];
  return {
    seed,
    difficulty,
    category: 'tower-hanoi',
    optimalSteps: 7,
    story: '🗼3개의 원반을 마지막 기둥으로 옮기세요.',
    rules: [
      '한 번에 하나의 원반만 이동할 수 있습니다.',
      '큰 원반을 작은 원반 위에 놓을 수 없습니다.',
      '모든 원반을 마지막 기둥으로 옮기세요.',
    ],
    hints: ['최소 7번 이동이 필요합니다.', '가장 작은 원반을 먼저 옮기세요.'],
    discCount: 3,
    pegCount: 3,
    initialState: [discs, [], []],
    goalState: [[], [], [...discs]],
    solution: [
      { from: 0, to: 2, disc: 1 },
      { from: 0, to: 1, disc: 2 },
      { from: 2, to: 1, disc: 1 },
      { from: 0, to: 2, disc: 3 },
      { from: 1, to: 0, disc: 1 },
      { from: 1, to: 2, disc: 2 },
      { from: 0, to: 2, disc: 1 },
    ],
  };
}
