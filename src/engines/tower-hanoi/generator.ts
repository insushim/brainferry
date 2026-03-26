import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveHanoi } from './solver';

export type HanoiVariant = 'classic' | 'color-restrict' | 'detour' | 'dual-tower';

export type HanoiMove = {
  from: number;
  to: number;
  disc: number;
};

export interface HanoiPuzzle extends BasePuzzle {
  category: 'tower-hanoi';
  variant: HanoiVariant;
  discCount: number;
  pegCount: number;
  initialState: number[][];
  goalState: number[][];
  moveRestrictions?: { from: number; to: number }[];
  discColors?: number[]; // for color-restrict: color index per disc
  pegColorRestrictions?: number[][]; // for color-restrict: pegIdx -> forbidden color indices
  solution: HanoiMove[];
}

interface HanoiTheme {
  name: string;
  storyTemplate: (p: HanoiPuzzle) => string;
}

const THEMES: HanoiTheme[] = [
  {
    name: '마법 탑',
    storyTemplate: (p) => {
      let base = `🗼마법의 탑에 ${p.discCount}개의 원반이 있습니다. ${p.pegCount}개의 기둥을 사용해 모든 원반을 마지막 기둥으로 옮기세요.`;
      if (p.variant === 'color-restrict') base += ' ⚠️ 일부 기둥은 특정 색의 원반을 거부합니다!';
      if (p.variant === 'detour') base += ' ⚠️ 기둥 간 직접 이동이 제한됩니다! 반드시 중간 기둥을 거쳐야 합니다.';
      if (p.variant === 'dual-tower') base += ' ⚠️ 두 세트의 원반을 서로 다른 기둥에 정렬하세요!';
      return base;
    },
  },
  {
    name: '수도승',
    storyTemplate: (p) => {
      let base = `🙏수도승이 ${p.discCount}개의 금 원반을 옮겨야 합니다. ${p.pegCount}개의 다이아몬드 기둥을 사용합니다.`;
      if (p.variant === 'color-restrict') base += ' ⚠️ 성스러운 규칙: 일부 기둥에 금지된 색이 있습니다!';
      if (p.variant === 'detour') base += ' ⚠️ 성스러운 법칙으로 직접 이동이 금지됩니다!';
      if (p.variant === 'dual-tower') base += ' ⚠️ 두 탑을 각각 다른 기둥에 완성하세요!';
      return base;
    },
  },
  {
    name: '요리사',
    storyTemplate: (p) => {
      let base = `👨‍🍳요리사가 ${p.discCount}장의 팬케이크를 정리해야 합니다. ${p.pegCount}개의 접시를 사용하세요.`;
      if (p.variant === 'color-restrict') base += ' ⚠️ 일부 접시는 특정 종류의 팬케이크를 거부합니다!';
      if (p.variant === 'detour') base += ' ⚠️ 일부 접시 간 직접 이동이 불가합니다!';
      if (p.variant === 'dual-tower') base += ' ⚠️ 두 종류의 팬케이크를 각각의 접시에 정리하세요!';
      return base;
    },
  },
];

function getVariant(difficulty: number, rng: SeededRandom): HanoiVariant {
  if (difficulty <= 2) return 'classic';
  if (difficulty <= 4) return rng.pick(['classic', 'color-restrict']);
  if (difficulty <= 6) return rng.pick(['color-restrict', 'detour']);
  if (difficulty <= 8) return rng.pick(['detour', 'dual-tower']);
  return rng.pick(['dual-tower', 'color-restrict', 'detour']);
}

function getDiscCount(difficulty: number, variant: HanoiVariant): number {
  if (variant === 'dual-tower') {
    if (difficulty <= 8) return 4; // 2 sets of 2
    return 6; // 2 sets of 3
  }
  if (variant === 'detour' || variant === 'color-restrict') {
    // These variants are harder, so fewer discs
    if (difficulty <= 4) return 3;
    if (difficulty <= 6) return 4;
    return 5;
  }
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
    const variant = getVariant(difficulty, rng);
    const discCount = getDiscCount(difficulty, variant);
    const pegCount = variant === 'dual-tower' ? 4 : 3;

    const discs = Array.from({ length: discCount }, (_, i) => discCount - i);

    let initialState: number[][];
    let goalState: number[][];
    let moveRestrictions: { from: number; to: number }[] | undefined;
    let discColors: number[] | undefined;
    let pegColorRestrictions: number[][] | undefined;

    if (variant === 'classic') {
      initialState = [discs, [], []];
      goalState = [[], [], [...discs]];

      // Optional scattered initial state for higher difficulty
      if (difficulty >= 8 && rng.boolean(0.4)) {
        initialState = [[], [], []];
        for (const disc of rng.shuffle(discs)) {
          let placed = false;
          for (let p = 0; p < pegCount; p++) {
            const peg = initialState[p];
            if (peg.length === 0 || peg[peg.length - 1] > disc) {
              peg.push(disc);
              placed = true;
              break;
            }
          }
          if (!placed) initialState[0].push(disc);
        }
        for (const peg of initialState) peg.sort((a, b) => b - a);
      }
    } else if (variant === 'color-restrict') {
      initialState = [discs, [], []];
      goalState = [[], [], [...discs]];

      // Assign colors to discs (2 colors)
      discColors = discs.map((_, i) => i % 2); // alternating 0 and 1

      // One peg rejects one color
      const restrictedPeg = rng.int(0, pegCount - 1);
      const restrictedColor = rng.int(0, 1);
      pegColorRestrictions = Array.from({ length: pegCount }, () => [] as number[]);
      pegColorRestrictions[restrictedPeg] = [restrictedColor];

      // Make sure goal peg is not restricted for any disc that needs to go there
      const goalPeg = 2;
      const goalDiscs = discs;
      const goalColors = goalDiscs.map((d) => discColors![d - 1]);
      if (pegColorRestrictions[goalPeg].some(c => goalColors.includes(c))) {
        // Move restriction to non-goal peg
        pegColorRestrictions[goalPeg] = [];
        const otherPeg = 1; // move restriction away from goal peg (2) to peg 1
        pegColorRestrictions[otherPeg] = [restrictedColor];
      }
    } else if (variant === 'detour') {
      initialState = [discs, [], []];
      goalState = [[], [], [...discs]];
      // Can't move directly from peg 0 to peg 2 (and vice versa)
      moveRestrictions = [
        { from: 0, to: 2 },
        { from: 2, to: 0 },
      ];
    } else {
      // dual-tower: two sets of discs, build on two different pegs
      const halfCount = Math.floor(discCount / 2);
      const setA = Array.from({ length: halfCount }, (_, i) => halfCount - i); // 1-based small sizes
      const setB = Array.from({ length: halfCount }, (_, i) => discCount - i - halfCount + halfCount); // offset sizes

      // All start on peg 0
      const allDiscs = [...setA.map(d => d), ...setB.map(d => d + halfCount)].sort((a, b) => b - a);
      initialState = [allDiscs, [], [], []];

      // Goal: setA on peg 2, setB on peg 3
      const goalA = setA.sort((a, b) => b - a);
      const goalB = setB.map(d => d + halfCount).sort((a, b) => b - a);
      goalState = [[], [], goalA, goalB];

      discColors = allDiscs.map(d => d <= halfCount ? 0 : 1);
    }

    const puzzle: HanoiPuzzle = {
      seed,
      difficulty,
      category: 'tower-hanoi',
      variant,
      optimalSteps: 0,
      story: '',
      rules: [],
      hints: [],
      discCount,
      pegCount,
      initialState,
      goalState,
      moveRestrictions,
      discColors,
      pegColorRestrictions,
      solution: [],
    };

    const result = solveHanoi(puzzle);
    if (!result.solvable) continue;

    // Skip if solution is too long for BFS comfort
    if (result.moves.length > 100) continue;

    puzzle.solution = result.moves;
    puzzle.optimalSteps = result.moves.length;
    puzzle.story = theme.storyTemplate(puzzle);

    puzzle.rules = [
      '한 번에 하나의 원반만 이동할 수 있습니다.',
      '큰 원반을 작은 원반 위에 놓을 수 없습니다.',
    ];

    if (variant === 'classic' || variant === 'color-restrict' || variant === 'detour') {
      puzzle.rules.push('모든 원반을 마지막 기둥으로 옮기세요.');
    }

    if (variant === 'color-restrict' && pegColorRestrictions) {
      const colorNames = ['🔴빨강', '🔵파랑'];
      for (let p = 0; p < pegCount; p++) {
        if (pegColorRestrictions[p].length > 0) {
          const forbidden = pegColorRestrictions[p].map(c => colorNames[c]).join(', ');
          puzzle.rules.push(`⚠️ 기둥 ${p + 1}: ${forbidden} 원반 금지`);
        }
      }
      puzzle.rules.push(`원반 색상: ${discs.map((d, i) => `${d}번=${discColors![i] === 0 ? '🔴' : '🔵'}`).join(', ')}`);
    }

    if (variant === 'detour' && moveRestrictions) {
      for (const r of moveRestrictions) {
        puzzle.rules.push(`⚠️ 기둥 ${r.from + 1}→기둥 ${r.to + 1} 직접 이동 금지 (기둥 ${(3 - r.from - r.to) + 1} 경유 필수)`);
      }
    }

    if (variant === 'dual-tower') {
      const halfCount = Math.floor(discCount / 2);
      puzzle.rules.push(`🔴 세트A (원반 1~${halfCount}): 기둥 3에 정렬`);
      puzzle.rules.push(`🔵 세트B (원반 ${halfCount + 1}~${discCount}): 기둥 4에 정렬`);
    }

    puzzle.hints = [
      `최소 ${result.moves.length}번 이동이 필요합니다.`,
    ];
    if (result.moves.length > 0) {
      puzzle.hints.push(`첫 이동: 원반 ${result.moves[0].disc}을 기둥 ${result.moves[0].from + 1}에서 기둥 ${result.moves[0].to + 1}(으)로`);
    }
    if (variant === 'detour') {
      puzzle.hints.push('모든 이동은 중간 기둥을 경유해야 합니다. 이동 횟수가 3배가 됩니다.');
    }
    if (variant === 'color-restrict') {
      puzzle.hints.push('색상 제한이 있는 기둥을 피해서 경로를 계획하세요.');
    }
    if (variant === 'dual-tower') {
      puzzle.hints.push('두 세트를 동시에 관리하세요. 한 세트를 먼저 완성하면 효율적입니다.');
    }
    if (discCount >= 5) {
      puzzle.hints.push('작은 원반들의 패턴을 먼저 파악하세요.');
    }

    return puzzle;
  }

  // Fallback: standard 3-disc
  const discs = [3, 2, 1];
  return {
    seed,
    difficulty,
    category: 'tower-hanoi',
    variant: 'classic',
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
