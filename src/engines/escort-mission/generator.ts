import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveEscort } from './solver';

export type EscortVariant = 'basic' | 'vip-escort' | 'traitor' | 'three-groups';

export type EscortMove = {
  groupA: number;
  groupB: number;
  groupC?: number; // for three-groups
  direction: 'left-to-right' | 'right-to-left';
};

export interface EscortPuzzle extends BasePuzzle {
  category: 'escort-mission';
  variant: EscortVariant;
  groupA: { name: string; emoji: string; count: number };
  groupB: { name: string; emoji: string; count: number };
  groupC?: { name: string; emoji: string; count: number }; // for three-groups
  boatCapacity: number;
  driverRequired: boolean;
  vipIndex?: number; // for vip-escort: which B member needs specific A escort
  vipEscortIndex?: number; // for vip-escort: which A must escort VIP
  traitorInA?: boolean; // for traitor: if true, traitor is in A (counts as B)
  traitorIndex?: number; // for traitor: which member is the traitor
  solution: EscortMove[];
}

interface EscortTheme {
  name: string;
  groupA: { name: string; emoji: string };
  groupB: { name: string; emoji: string };
  groupC?: { name: string; emoji: string };
  storyTemplate: (p: EscortPuzzle) => string;
}

const THEMES: EscortTheme[] = [
  {
    name: '기사와 왕족',
    groupA: { name: '기사', emoji: '⚔️' },
    groupB: { name: '왕족', emoji: '👑' },
    groupC: { name: '상인', emoji: '🏪' },
    storyTemplate: (p) => {
      let base = `${p.groupA.count}명의 ${p.groupA.emoji}${p.groupA.name}와 ${p.groupB.count}명의 ${p.groupB.emoji}${p.groupB.name}이 강을 건너야 합니다. 보트는 최대 ${p.boatCapacity}명입니다.`;
      if (p.variant === 'vip-escort') base += ` ⚠️ VIP 왕족은 반드시 지정된 기사와 함께만 이동할 수 있습니다!`;
      if (p.variant === 'traitor') base += ` ⚠️ 한 명의 배신자가 숨어있습니다! 실제로는 상대 그룹으로 카운트됩니다.`;
      if (p.variant === 'three-groups' && p.groupC) base = `${p.groupA.count}명의 ${p.groupA.emoji}${p.groupA.name}, ${p.groupB.count}명의 ${p.groupB.emoji}${p.groupB.name}, ${p.groupC.count}명의 ${p.groupC.emoji}${p.groupC.name}이 강을 건너야 합니다. 보트 정원 ${p.boatCapacity}명. 삼각 우위: ${p.groupA.name}>${p.groupB.name}>${p.groupC.name}>${p.groupA.name}!`;
      return base;
    },
  },
  {
    name: '경찰과 용의자',
    groupA: { name: '경찰', emoji: '👮' },
    groupB: { name: '용의자', emoji: '🦹' },
    groupC: { name: '증인', emoji: '👁️' },
    storyTemplate: (p) => {
      let base = `${p.groupA.count}명의 ${p.groupA.emoji}${p.groupA.name}과 ${p.groupB.count}명의 ${p.groupB.emoji}${p.groupB.name}이 강을 건너야 합니다. 보트 정원 ${p.boatCapacity}명입니다.`;
      if (p.variant === 'vip-escort') base += ` ⚠️ 핵심 용의자는 반드시 담당 경찰과 함께만 이동합니다!`;
      if (p.variant === 'traitor') base += ` ⚠️ 내부 배신자가 있습니다! 진짜 정체가 다릅니다.`;
      if (p.variant === 'three-groups' && p.groupC) base = `${p.groupA.count}명의 ${p.groupA.emoji}${p.groupA.name}, ${p.groupB.count}명의 ${p.groupB.emoji}${p.groupB.name}, ${p.groupC.count}명의 ${p.groupC.emoji}${p.groupC.name}이 이동합니다. 보트 정원 ${p.boatCapacity}명. 삼각 지배: ${p.groupA.name}>${p.groupB.name}>${p.groupC.name}>${p.groupA.name}!`;
      return base;
    },
  },
  {
    name: '어른과 아이',
    groupA: { name: '어른', emoji: '🧑' },
    groupB: { name: '아이', emoji: '🧒' },
    groupC: { name: '노인', emoji: '🧓' },
    storyTemplate: (p) => {
      let base = `${p.groupA.count}명의 ${p.groupA.emoji}${p.groupA.name}과 ${p.groupB.count}명의 ${p.groupB.emoji}${p.groupB.name}이 강을 건너야 합니다. 보트에는 ${p.boatCapacity}명이 탈 수 있습니다.`;
      if (p.variant === 'vip-escort') base += ` ⚠️ 특별히 돌봐야 할 아이가 있어서 지정된 어른만 동행 가능합니다!`;
      if (p.variant === 'traitor') base += ` ⚠️ 한 명이 실제로는 다른 그룹에 속합니다!`;
      if (p.variant === 'three-groups' && p.groupC) base = `${p.groupA.count}명의 ${p.groupA.emoji}${p.groupA.name}, ${p.groupB.count}명의 ${p.groupB.emoji}${p.groupB.name}, ${p.groupC.count}명의 ${p.groupC.emoji}${p.groupC.name}이 이동합니다. 보트 정원 ${p.boatCapacity}명. 삼각 관계!`;
      return base;
    },
  },
  {
    name: '수호자와 민간인',
    groupA: { name: '수호자', emoji: '🛡️' },
    groupB: { name: '민간인', emoji: '👤' },
    groupC: { name: '학자', emoji: '📚' },
    storyTemplate: (p) => {
      let base = `${p.groupA.count}명의 ${p.groupA.emoji}${p.groupA.name}와 ${p.groupB.count}명의 ${p.groupB.emoji}${p.groupB.name}이 위험 지역을 탈출해야 합니다. 보트 정원 ${p.boatCapacity}명.`;
      if (p.variant === 'vip-escort') base += ` ⚠️ VIP 민간인은 전담 수호자와만 이동해야 합니다!`;
      if (p.variant === 'traitor') base += ` ⚠️ 내부의 적이 숨어있습니다!`;
      if (p.variant === 'three-groups' && p.groupC) base = `${p.groupA.count}명의 ${p.groupA.emoji}${p.groupA.name}, ${p.groupB.count}명의 ${p.groupB.emoji}${p.groupB.name}, ${p.groupC.count}명의 ${p.groupC.emoji}${p.groupC.name}이 탈출합니다. 보트 정원 ${p.boatCapacity}명. 삼중 균형!`;
      return base;
    },
  },
];

function getVariant(difficulty: number, seed: number, rng: SeededRandom): EscortVariant {
  if (difficulty <= 2) {
    const variants: EscortVariant[] = ['basic', 'basic', 'vip-escort'];
    return variants[seed % variants.length];
  }
  if (difficulty <= 3) return rng.pick(['basic', 'vip-escort']);
  if (difficulty <= 5) return rng.pick(['vip-escort', 'traitor']);
  if (difficulty <= 7) return rng.pick(['traitor', 'three-groups']);
  return rng.pick(['three-groups', 'traitor']); // 최고난이도에서는 복잡한 변형 위주
}

function getGroupCounts(difficulty: number, variant: EscortVariant, seed: number): { a: number; b: number; c?: number } {
  if (variant === 'three-groups') {
    if (difficulty <= 7) return { a: 2, b: 2, c: 2 };
    return { a: 3, b: 3, c: 3 };
  }
  if (difficulty <= 2) {
    const options = [{ a: 2, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 2 }];
    return options[seed % options.length];
  }
  if (difficulty <= 4) return { a: 3, b: 3 };
  if (difficulty <= 6) return { a: 3, b: 4 }; // 비대칭으로 난이도 증가
  if (difficulty <= 8) return { a: 4, b: 4 };
  return { a: 5, b: 5 }; // 최고 난이도
}

function getBoatCapacity(difficulty: number, variant: EscortVariant, seed: number): number {
  if (variant === 'three-groups') {
    return difficulty <= 7 ? 3 : 2; // 높은 난이도에서는 보트 용량 감소
  }
  if (difficulty <= 2) return [2, 3][seed % 2];
  if (difficulty <= 5) return 2;
  return 2; // 일관성 유지
}

export function generateEscort(difficulty: number, seed: number): EscortPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = THEMES[(seed % THEMES.length + attempt) % THEMES.length];
    const variant = getVariant(difficulty, seed, rng);
    const counts = getGroupCounts(difficulty, variant, seed);
    const cap = getBoatCapacity(difficulty, variant, seed);
    const driverRequired = difficulty >= 2; // 더 일찍 제약 추가

    const puzzle: EscortPuzzle = {
      seed,
      difficulty,
      category: 'escort-mission',
      variant,
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

    // Variant-specific setup
    if (variant === 'vip-escort') {
      puzzle.vipIndex = rng.int(0, counts.b - 1);
      puzzle.vipEscortIndex = rng.int(0, counts.a - 1);
    }

    if (variant === 'traitor') {
      puzzle.traitorInA = rng.boolean();
      puzzle.traitorIndex = puzzle.traitorInA ? rng.int(0, counts.a - 1) : rng.int(0, counts.b - 1);
    }

    if (variant === 'three-groups' && theme.groupC) {
      puzzle.groupC = { ...theme.groupC, count: counts.c ?? 2 };
    }

    const result = solveEscort(puzzle);
    if (!result.solvable) continue;

    puzzle.solution = result.moves;
    puzzle.optimalSteps = result.moves.length;
    puzzle.story = theme.storyTemplate(puzzle);

    // Rules
    puzzle.rules = [
      `보트에는 최대 ${cap}명까지 탈 수 있습니다.`,
    ];

    if (variant === 'basic' || variant === 'vip-escort' || variant === 'traitor') {
      puzzle.rules.push(`어느 강변에서든 ${theme.groupB.name}이(가) ${theme.groupA.name}보다 많으면 안 됩니다.`);
    }

    if (variant === 'three-groups') {
      puzzle.rules.push(`삼각 우위: ${theme.groupA.name}>${theme.groupB.name}>${theme.groupC?.name}>${theme.groupA.name}`);
      puzzle.rules.push('어느 강변에서든 우위 그룹이 열세 그룹보다 많으면 안 됩니다(열세 그룹이 0명이 아닌 경우).');
    }

    puzzle.rules.push('모든 인원을 오른쪽 강변으로 이동시키세요.');

    if (driverRequired) {
      puzzle.rules.push(`${theme.groupA.name}만 보트를 운전할 수 있습니다.`);
    }

    if (variant === 'vip-escort') {
      puzzle.rules.push(`⚠️ VIP(${theme.groupB.name} ${(puzzle.vipIndex ?? 0) + 1}번)은 반드시 ${theme.groupA.name} ${(puzzle.vipEscortIndex ?? 0) + 1}번과 함께 이동해야 합니다.`);
    }

    if (variant === 'traitor') {
      const group = puzzle.traitorInA ? theme.groupA.name : theme.groupB.name;
      const realGroup = puzzle.traitorInA ? theme.groupB.name : theme.groupA.name;
      puzzle.rules.push(`⚠️ ${group} ${(puzzle.traitorIndex ?? 0) + 1}번은 배신자! 실제로는 ${realGroup}으로 카운트됩니다.`);
    }

    // Hints
    puzzle.hints = [
      `최소 ${result.moves.length}번 이동이 필요합니다.`,
    ];
    if (result.moves.length > 0) {
      const first = result.moves[0];
      puzzle.hints.push(
        `첫 이동: ${theme.groupA.name} ${first.groupA}명, ${theme.groupB.name} ${first.groupB}명${first.groupC !== undefined ? `, ${theme.groupC?.name} ${first.groupC}명` : ''}`
      );
    }
    if (variant === 'vip-escort') {
      puzzle.hints.push('VIP는 지정된 호위와 함께 이동해야 합니다. 이 제약을 먼저 고려하세요.');
    }
    if (variant === 'traitor') {
      puzzle.hints.push('배신자의 실제 소속을 고려해서 인원수를 계산하세요.');
    }
    if (variant === 'three-groups') {
      puzzle.hints.push('삼각 관계를 모두 만족하도록 균형을 잡아야 합니다.');
    }
    if (result.moves.length > 3) {
      puzzle.hints.push('되돌아올 때 최소 인원만 보내세요.');
    }

    return puzzle;
  }

  // Fallback
  const fallbackDriverRequired = difficulty >= 2;
  return {
    seed,
    difficulty,
    category: 'escort-mission',
    variant: 'basic',
    optimalSteps: 11,
    story: '3명의 ⚔️기사와 3명의 👑왕족이 강을 건너야 합니다. 보트에는 2명이 탈 수 있습니다.',
    rules: [
      '보트에는 최대 2명까지 탈 수 있습니다.',
      '어느 강변에서든 왕족이 기사보다 많으면 안 됩니다.',
      '모든 인원을 오른쪽 강변으로 이동시키세요.',
      ...(fallbackDriverRequired ? ['기사만 보트를 운전할 수 있습니다.'] : [])
    ],
    hints: ['최소 11번 이동이 필요합니다.'],
    groupA: { name: '기사', emoji: '⚔️', count: 3 },
    groupB: { name: '왕족', emoji: '👑', count: 3 },
    boatCapacity: 2,
    driverRequired: fallbackDriverRequired,
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
