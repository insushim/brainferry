import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveEscort } from './solver';

export type EscortMove = {
  groupA: number;
  groupB: number;
  direction: 'left-to-right' | 'right-to-left';
};

export interface EscortPuzzle extends BasePuzzle {
  category: 'escort-mission';
  groupA: { name: string; emoji: string; count: number };
  groupB: { name: string; emoji: string; count: number };
  boatCapacity: number;
  driverRequired: boolean;
  solution: EscortMove[];
}

interface EscortTheme {
  name: string;
  groupA: { name: string; emoji: string };
  groupB: { name: string; emoji: string };
  storyTemplate: (aCount: number, bCount: number, cap: number) => string;
}

const THEMES: EscortTheme[] = [
  {
    name: '기사와 왕족',
    groupA: { name: '기사', emoji: '⚔️' },
    groupB: { name: '왕족', emoji: '👑' },
    storyTemplate: (a, b, cap) =>
      `${a}명의 ⚔️기사와 ${b}명의 👑왕족이 강을 건너야 합니다. 보트는 최대 ${cap}명까지 탈 수 있습니다. 어느 강변에서든 왕족 수가 기사 수를 초과하면 왕족이 위험합니다! 기사가 보트를 운전해야 합니다.`,
  },
  {
    name: '경찰과 용의자',
    groupA: { name: '경찰', emoji: '👮' },
    groupB: { name: '용의자', emoji: '🦹' },
    storyTemplate: (a, b, cap) =>
      `${a}명의 👮경찰과 ${b}명의 🦹용의자가 강을 건너야 합니다. 보트 정원은 ${cap}명입니다. 어느 쪽이든 용의자가 경찰보다 많으면 도주합니다! 경찰만 보트를 운전할 수 있습니다.`,
  },
  {
    name: '어른과 아이',
    groupA: { name: '어른', emoji: '🧑' },
    groupB: { name: '아이', emoji: '🧒' },
    storyTemplate: (a, b, cap) =>
      `${a}명의 🧑어른과 ${b}명의 🧒아이가 강을 건너야 합니다. 보트에는 ${cap}명이 탈 수 있습니다. 어느 강변에서든 아이가 어른보다 많으면 안전하지 않습니다!`,
  },
  {
    name: '수호자와 민간인',
    groupA: { name: '수호자', emoji: '🛡️' },
    groupB: { name: '민간인', emoji: '👤' },
    storyTemplate: (a, b, cap) =>
      `${a}명의 🛡️수호자와 ${b}명의 👤민간인이 위험 지역을 탈출해야 합니다. 보트 정원 ${cap}명. 수호자 없이 민간인만 남으면 위험합니다!`,
  },
];

function getGroupCounts(difficulty: number): { a: number; b: number } {
  if (difficulty <= 2) return { a: 2, b: 2 };
  if (difficulty <= 4) return { a: 3, b: 3 };
  if (difficulty <= 6) return { a: 3, b: 3 };
  if (difficulty <= 8) return { a: 4, b: 4 };
  return { a: 4, b: 4 };
}

function getBoatCapacity(difficulty: number): number {
  if (difficulty <= 3) return 3;
  if (difficulty <= 6) return 2;
  return 2;
}

export function generateEscort(difficulty: number, seed: number): EscortPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = rng.pick(THEMES);
    const counts = getGroupCounts(difficulty);
    const cap = getBoatCapacity(difficulty);
    const driverRequired = difficulty >= 3;

    const puzzle: EscortPuzzle = {
      seed,
      difficulty,
      category: 'escort-mission',
      optimalSteps: 0,
      story: '',
      rules: [],
      hints: [],
      groupA: { ...theme.groupA, count: counts.a },
      groupB: { ...theme.groupB, count: counts.b },
      boatCapacity: cap,
      driverRequired,
      solution: [],
    };

    const result = solveEscort(puzzle);
    if (!result.solvable) continue;

    puzzle.solution = result.moves;
    puzzle.optimalSteps = result.moves.length;
    puzzle.story = theme.storyTemplate(counts.a, counts.b, cap);

    puzzle.rules = [
      `보트에는 최대 ${cap}명까지 탈 수 있습니다.`,
      `어느 강변에서든 ${theme.groupB.name}이(가) ${theme.groupA.name}보다 많으면 안 됩니다.`,
      `모든 인원을 오른쪽 강변으로 이동시키세요.`,
    ];
    if (driverRequired) {
      puzzle.rules.push(`${theme.groupA.name}만 보트를 운전할 수 있습니다.`);
    }

    puzzle.hints = [
      `최소 ${result.moves.length}번 이동이 필요합니다.`,
    ];
    if (result.moves.length > 0) {
      const first = result.moves[0];
      puzzle.hints.push(
        `첫 이동: ${theme.groupA.name} ${first.groupA}명, ${theme.groupB.name} ${first.groupB}명`
      );
    }
    if (result.moves.length > 3) {
      puzzle.hints.push('되돌아올 때 최소 인원만 보내세요.');
    }

    return puzzle;
  }

  // Fallback: classic 3-3 missionaries and cannibals
  return {
    seed,
    difficulty,
    category: 'escort-mission',
    optimalSteps: 11,
    story: '3명의 ⚔️기사와 3명의 👑왕족이 강을 건너야 합니다. 보트에는 2명이 탈 수 있습니다.',
    rules: [
      '보트에는 최대 2명까지 탈 수 있습니다.',
      '어느 강변에서든 왕족이 기사보다 많으면 안 됩니다.',
      '모든 인원을 오른쪽 강변으로 이동시키세요.',
    ],
    hints: ['최소 11번 이동이 필요합니다.'],
    groupA: { name: '기사', emoji: '⚔️', count: 3 },
    groupB: { name: '왕족', emoji: '👑', count: 3 },
    boatCapacity: 2,
    driverRequired: false,
    solution: [
      { groupA: 1, groupB: 1, direction: 'left-to-right' },
      { groupA: 1, groupB: 0, direction: 'right-to-left' },
      { groupA: 0, groupB: 2, direction: 'left-to-right' },
      { groupA: 0, groupB: 1, direction: 'right-to-left' },
      { groupA: 2, groupB: 0, direction: 'left-to-right' },
      { groupA: 1, groupB: 1, direction: 'right-to-left' },
      { groupA: 2, groupB: 0, direction: 'left-to-right' },
      { groupA: 0, groupB: 1, direction: 'right-to-left' },
      { groupA: 0, groupB: 2, direction: 'left-to-right' },
      { groupA: 0, groupB: 1, direction: 'right-to-left' },
      { groupA: 0, groupB: 2, direction: 'left-to-right' },
    ],
  };
}
