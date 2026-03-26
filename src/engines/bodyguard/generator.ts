import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveBodyguard } from './solver';

export type BodyguardVariant = 'basic' | 'exclusive' | 'double-agent' | 'hierarchy';

export type BodyguardMove = {
  passengers: string[];
  direction: 'left-to-right' | 'right-to-left';
};

export interface BodyguardPuzzle extends BasePuzzle {
  category: 'bodyguard';
  variant: BodyguardVariant;
  pairs: {
    protector: { id: string; name: string; emoji: string };
    charge: { id: string; name: string; emoji: string };
  }[];
  boatCapacity: number;
  driverIds?: string[];
  // exclusive variant: certain pairs cannot be on the same bank
  exclusivePairs?: { idA: string; idB: string }[];
  // double-agent variant: one protector secretly works for another pair
  doubleAgentId?: string;       // the protector who is a double agent
  doubleAgentTargetPair?: number; // index of the pair they actually protect
  // hierarchy variant: protectors have rank; lower-rank charge unsafe with higher-rank protector
  protectorRanks?: number[];    // rank per pair index (higher = more powerful)
  solution: BodyguardMove[];
}

interface BodyguardTheme {
  name: string;
  pairs: { protector: { name: string; emoji: string }; charge: { name: string; emoji: string } }[];
  storyTemplate: (pairCount: number, cap: number, variant: BodyguardVariant, puzzle: BodyguardPuzzle) => string;
}

const THEMES: BodyguardTheme[] = [
  {
    name: '왕실 호위',
    pairs: [
      { protector: { name: '근위대장', emoji: '🛡️' }, charge: { name: '왕', emoji: '👑' } },
      { protector: { name: '기사', emoji: '⚔️' }, charge: { name: '왕비', emoji: '👸' } },
      { protector: { name: '궁수', emoji: '🏹' }, charge: { name: '왕자', emoji: '🤴' } },
      { protector: { name: '마법사', emoji: '🧙' }, charge: { name: '공주', emoji: '👧' } },
    ],
    storyTemplate: (pairs, cap, variant, puzzle) => {
      let base = `🏰왕실 일행이 강을 건너야 합니다. ${pairs}쌍의 호위와 왕족이 있고, 보트에는 최대 ${cap}명이 탈 수 있습니다. 왕족은 자신의 호위 없이 다른 호위와 단둘이 있으면 안 됩니다!`;
      if (variant === 'exclusive') base += ' ⚠️ 일부 호위끼리는 같은 강변에 있으면 안 됩니다!';
      if (variant === 'double-agent') base += ' ⚠️ 한 호위가 이중스파이입니다! 실제로는 다른 왕족을 보호합니다!';
      if (variant === 'hierarchy') base += ' ⚠️ 호위에는 계급이 있습니다! 낮은 계급의 왕족은 높은 계급의 호위와 있으면 위험합니다!';
      return base;
    },
  },
  {
    name: '스파이 임무',
    pairs: [
      { protector: { name: '에이전트A', emoji: '🕵️' }, charge: { name: '정보원A', emoji: '📋' } },
      { protector: { name: '에이전트B', emoji: '🕵️‍♀️' }, charge: { name: '정보원B', emoji: '📝' } },
      { protector: { name: '에이전트C', emoji: '🥷' }, charge: { name: '정보원C', emoji: '📑' } },
      { protector: { name: '에이전트D', emoji: '🦹' }, charge: { name: '정보원D', emoji: '🗂️' } },
    ],
    storyTemplate: (pairs, cap, variant, puzzle) => {
      let base = `🕵️비밀 작전! ${pairs}쌍의 에이전트와 정보원이 강을 건너야 합니다. 보트 정원 ${cap}명. 정보원은 자신의 에이전트 없이 다른 에이전트와 있으면 정보가 유출됩니다!`;
      if (variant === 'exclusive') base += ' ⚠️ 적대 관계인 에이전트끼리는 같은 곳에 있으면 안 됩니다!';
      if (variant === 'double-agent') base += ' ⚠️ 이중 스파이가 있습니다! 진짜 담당 정보원이 다릅니다!';
      if (variant === 'hierarchy') base += ' ⚠️ 보안 등급이 다릅니다! 낮은 등급의 정보원은 높은 등급의 에이전트와 위험합니다!';
      return base;
    },
  },
  {
    name: '질투하는 부부',
    pairs: [
      { protector: { name: '남편A', emoji: '👨' }, charge: { name: '아내A', emoji: '👩' } },
      { protector: { name: '남편B', emoji: '🧔' }, charge: { name: '아내B', emoji: '👱‍♀️' } },
      { protector: { name: '남편C', emoji: '👴' }, charge: { name: '아내C', emoji: '👵' } },
      { protector: { name: '남편D', emoji: '🧑‍🦱' }, charge: { name: '아내D', emoji: '👩‍🦰' } },
    ],
    storyTemplate: (pairs, cap, variant, puzzle) => {
      let base = `💑${pairs}쌍의 부부가 강을 건너야 합니다. 보트에는 ${cap}명이 탈 수 있습니다. 어떤 아내도 자신의 남편 없이 다른 남편과 단둘이 있으면 안 됩니다!`;
      if (variant === 'exclusive') base += ' ⚠️ 앙숙인 부부끼리는 같은 강변에 있으면 안 됩니다!';
      if (variant === 'double-agent') base += ' ⚠️ 한 남편이 실은 다른 아내의 보호자입니다!';
      if (variant === 'hierarchy') base += ' ⚠️ 사회적 지위가 다릅니다! 지위 낮은 아내는 지위 높은 남편과 위험합니다!';
      return base;
    },
  },
];

function getVariant(difficulty: number, rng: SeededRandom): BodyguardVariant {
  if (difficulty <= 2) return 'basic';
  if (difficulty <= 4) return rng.pick(['basic', 'exclusive']);
  if (difficulty <= 6) return rng.pick(['exclusive', 'hierarchy']);
  if (difficulty <= 8) return rng.pick(['hierarchy', 'exclusive']);
  return rng.pick(['hierarchy', 'exclusive', 'basic']);
}

function getPairCount(difficulty: number): number {
  if (difficulty <= 3) return 2;
  if (difficulty <= 6) return 3;
  return 4;
}

export function generateBodyguard(difficulty: number, seed: number): BodyguardPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = rng.pick(THEMES);
    const variant = getVariant(difficulty, rng);
    const pairCount = getPairCount(difficulty);
    const boatCapacity = pairCount <= 2 ? 2 : (difficulty >= 8 ? 2 : 3);

    const selectedPairs = theme.pairs.slice(0, pairCount).map((p, i) => ({
      protector: { id: `protector_${i}`, name: p.protector.name, emoji: p.protector.emoji },
      charge: { id: `charge_${i}`, name: p.charge.name, emoji: p.charge.emoji },
    }));

    // Optional driver restriction for harder puzzles
    const driverIds = difficulty >= 7
      ? selectedPairs.map(p => p.protector.id)
      : undefined;

    const puzzle: BodyguardPuzzle = {
      seed,
      difficulty,
      category: 'bodyguard',
      variant,
      optimalSteps: 0,
      story: '',
      rules: [],
      hints: [],
      pairs: selectedPairs,
      boatCapacity,
      driverIds,
      solution: [],
    };

    // Variant-specific setup
    if (variant === 'exclusive' && pairCount >= 3) { // 3쌍일 때만 적용
      // Pick two protectors who can't be on the same bank (not randomly overlapping)
      const idxA = 0;
      const idxB = 1;
      puzzle.exclusivePairs = [{
        idA: selectedPairs[idxA].protector.id,
        idB: selectedPairs[idxB].protector.id,
      }];
    }

    if (variant === 'double-agent' && pairCount >= 3) { // 3쌍일 때만 적용
      // One protector actually protects a different pair's charge
      const agentIdx = 0;
      const targetIdx = 1;
      puzzle.doubleAgentId = selectedPairs[agentIdx].protector.id;
      puzzle.doubleAgentTargetPair = targetIdx;
    }

    if (variant === 'hierarchy') {
      // Assign ranks (higher number = more powerful)
      const ranks = Array.from({ length: pairCount }, (_, i) => i + 1);
      puzzle.protectorRanks = rng.shuffle(ranks);
    }

    const result = solveBodyguard(puzzle);
    if (!result.solvable) continue;

    puzzle.solution = result.moves;
    puzzle.optimalSteps = result.moves.length;
    puzzle.story = theme.storyTemplate(pairCount, boatCapacity, variant, puzzle);

    puzzle.rules = [
      `보트에는 최대 ${boatCapacity}명까지 탈 수 있습니다.`,
      '피보호자는 자신의 보디가드 없이 다른 보디가드와 함께 있으면 안 됩니다.',
      '모두를 오른쪽 강변으로 이동시키세요.',
    ];
    if (driverIds) {
      puzzle.rules.push('보디가드만 보트를 운전할 수 있습니다.');
    }

    if (variant === 'exclusive' && puzzle.exclusivePairs) {
      for (const ep of puzzle.exclusivePairs) {
        const nameA = selectedPairs.find(p => p.protector.id === ep.idA)?.protector.name ?? ep.idA;
        const nameB = selectedPairs.find(p => p.protector.id === ep.idB)?.protector.name ?? ep.idB;
        puzzle.rules.push(`⚠️ ${nameA}와(과) ${nameB}는 같은 강변에 있으면 안 됩니다!`);
      }
    }

    if (variant === 'double-agent' && puzzle.doubleAgentId !== undefined && puzzle.doubleAgentTargetPair !== undefined) {
      const agentPair = selectedPairs.find(p => p.protector.id === puzzle.doubleAgentId);
      const targetPair = selectedPairs[puzzle.doubleAgentTargetPair];
      if (agentPair && targetPair) {
        puzzle.rules.push(`⚠️ ${agentPair.protector.name}은(는) 실제로 ${targetPair.charge.name}의 보호자입니다!`);
        puzzle.rules.push(`⚠️ ${agentPair.charge.name}에게는 보호자가 없습니다 (다른 보디가드와 함께 있으면 위험).`);
      }
    }

    if (variant === 'hierarchy' && puzzle.protectorRanks) {
      puzzle.rules.push('⚠️ 계급 규칙: 피보호자는 자신의 보디가드보다 높은 계급의 다른 보디가드와 있으면 위험합니다!');
      for (let i = 0; i < pairCount; i++) {
        puzzle.rules.push(`${selectedPairs[i].protector.name} 계급: ${puzzle.protectorRanks[i]}`);
      }
    }

    puzzle.hints = [
      `최소 ${result.moves.length}번 이동이 필요합니다.`,
    ];
    if (result.moves.length > 0) {
      const firstPassengers = result.moves[0].passengers;
      const names = firstPassengers.map(id => {
        for (const p of selectedPairs) {
          if (p.protector.id === id) return p.protector.name;
          if (p.charge.id === id) return p.charge.name;
        }
        return id;
      });
      puzzle.hints.push(`첫 이동: ${names.join(', ')}`);
    }
    if (pairCount >= 3) {
      puzzle.hints.push('쌍을 함께 이동시키는 것이 핵심입니다.');
    }
    if (variant === 'exclusive') {
      puzzle.hints.push('앙숙 관계인 보디가드를 분리하면서 이동 계획을 세우세요.');
    }
    if (variant === 'double-agent') {
      puzzle.hints.push('이중 스파이의 실제 담당을 기억하세요. 원래 담당은 보호받지 못합니다.');
    }
    if (variant === 'hierarchy') {
      puzzle.hints.push('높은 계급의 보디가드를 피보호자와 분리하세요.');
    }

    return puzzle;
  }

  // Fallback: 2 pairs, capacity 2
  return {
    seed,
    difficulty,
    category: 'bodyguard',
    variant: 'basic',
    optimalSteps: 5,
    story: '🏰2쌍의 호위와 왕족이 강을 건너야 합니다.',
    rules: [
      '보트에는 최대 2명까지 탈 수 있습니다.',
      '피보호자는 자신의 보디가드 없이 다른 보디가드와 함께 있으면 안 됩니다.',
      '모두를 오른쪽 강변으로 이동시키세요.',
    ],
    hints: ['최소 5번 이동이 필요합니다.'],
    pairs: [
      {
        protector: { id: 'protector_0', name: '근위대장', emoji: '🛡️' },
        charge: { id: 'charge_0', name: '왕', emoji: '👑' },
      },
      {
        protector: { id: 'protector_1', name: '기사', emoji: '⚔️' },
        charge: { id: 'charge_1', name: '왕비', emoji: '👸' },
      },
    ],
    boatCapacity: 2,
    solution: [
      { passengers: ['protector_0', 'protector_1'], direction: 'left-to-right' },
      { passengers: ['protector_0'], direction: 'right-to-left' },
      { passengers: ['charge_0', 'charge_1'], direction: 'left-to-right' },
      { passengers: ['protector_1'], direction: 'right-to-left' },
      { passengers: ['protector_0', 'protector_1'], direction: 'left-to-right' },
    ],
  };
}
