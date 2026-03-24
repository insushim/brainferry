import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveRiverCrossing } from './solver';

export type RiverMove = {
  entities: string[];
  direction: 'left-to-right' | 'right-to-left';
};

export interface RiverCrossingPuzzle extends BasePuzzle {
  category: 'river-crossing';
  entities: { id: string; name: string; emoji: string }[];
  constraints: { predator: string; prey: string; description: string }[];
  boatCapacity: number;
  ownerName: string;
  ownerEmoji: string;
  solution: RiverMove[];
}

// ── Mini Theme Pool ──

interface ThemeEntity {
  id: string;
  name: string;
  emoji: string;
}

interface PredationRule {
  predator: string;
  prey: string;
  description: string;
}

interface Theme {
  name: string;
  owner: ThemeEntity;
  entities: ThemeEntity[];
  rules: PredationRule[];
  storyTemplate: (owner: string, entities: string[]) => string;
}

const THEMES: Theme[] = [
  {
    name: '농장',
    owner: { id: 'farmer', name: '농부', emoji: '👨‍🌾' },
    entities: [
      { id: 'wolf', name: '늑대', emoji: '🐺' },
      { id: 'sheep', name: '양', emoji: '🐑' },
      { id: 'cabbage', name: '양배추', emoji: '🥬' },
      { id: 'chicken', name: '닭', emoji: '🐔' },
      { id: 'fox', name: '여우', emoji: '🦊' },
      { id: 'grain', name: '곡식', emoji: '🌾' },
      { id: 'dog', name: '개', emoji: '🐕' },
      { id: 'cat', name: '고양이', emoji: '🐱' },
      { id: 'mouse', name: '쥐', emoji: '🐭' },
      { id: 'cheese', name: '치즈', emoji: '🧀' },
    ],
    rules: [
      { predator: 'wolf', prey: 'sheep', description: '늑대가 양을 잡아먹습니다!' },
      { predator: 'wolf', prey: 'chicken', description: '늑대가 닭을 잡아먹습니다!' },
      { predator: 'sheep', prey: 'cabbage', description: '양이 양배추를 먹습니다!' },
      { predator: 'chicken', prey: 'grain', description: '닭이 곡식을 먹습니다!' },
      { predator: 'fox', prey: 'chicken', description: '여우가 닭을 잡아먹습니다!' },
      { predator: 'fox', prey: 'mouse', description: '여우가 쥐를 잡아먹습니다!' },
      { predator: 'cat', prey: 'mouse', description: '고양이가 쥐를 잡아먹습니다!' },
      { predator: 'cat', prey: 'chicken', description: '고양이가 닭을 잡아먹습니다!' },
      { predator: 'dog', prey: 'cat', description: '개가 고양이를 쫓아갑니다!' },
      { predator: 'mouse', prey: 'cheese', description: '쥐가 치즈를 먹습니다!' },
      { predator: 'mouse', prey: 'grain', description: '쥐가 곡식을 먹습니다!' },
    ],
    storyTemplate: (owner, entities) =>
      `${owner}이(가) ${entities.join(', ')}을(를) 데리고 강을 건너야 합니다. 보트에는 ${owner}과 함께 제한된 수만 탈 수 있습니다. ${owner} 없이 두면 위험한 조합이 있으니 주의하세요!`,
  },
  {
    name: '정글',
    owner: { id: 'explorer', name: '탐험가', emoji: '🧭' },
    entities: [
      { id: 'lion', name: '사자', emoji: '🦁' },
      { id: 'zebra', name: '얼룩말', emoji: '🦓' },
      { id: 'monkey', name: '원숭이', emoji: '🐒' },
      { id: 'banana', name: '바나나', emoji: '🍌' },
      { id: 'snake', name: '뱀', emoji: '🐍' },
      { id: 'frog', name: '개구리', emoji: '🐸' },
      { id: 'parrot', name: '앵무새', emoji: '🦜' },
      { id: 'crocodile', name: '악어', emoji: '🐊' },
      { id: 'fish', name: '물고기', emoji: '🐟' },
      { id: 'berry', name: '열매', emoji: '🫐' },
    ],
    rules: [
      { predator: 'lion', prey: 'zebra', description: '사자가 얼룩말을 잡아먹습니다!' },
      { predator: 'lion', prey: 'monkey', description: '사자가 원숭이를 잡아먹습니다!' },
      { predator: 'monkey', prey: 'banana', description: '원숭이가 바나나를 먹습니다!' },
      { predator: 'snake', prey: 'frog', description: '뱀이 개구리를 잡아먹습니다!' },
      { predator: 'snake', prey: 'monkey', description: '뱀이 원숭이를 공격합니다!' },
      { predator: 'crocodile', prey: 'fish', description: '악어가 물고기를 잡아먹습니다!' },
      { predator: 'crocodile', prey: 'zebra', description: '악어가 얼룩말을 공격합니다!' },
      { predator: 'crocodile', prey: 'frog', description: '악어가 개구리를 잡아먹습니다!' },
      { predator: 'parrot', prey: 'berry', description: '앵무새가 열매를 먹습니다!' },
      { predator: 'monkey', prey: 'berry', description: '원숭이가 열매를 먹습니다!' },
      { predator: 'lion', prey: 'fish', description: '사자가 물고기를 잡아먹습니다!' },
    ],
    storyTemplate: (owner, entities) =>
      `${owner}가 정글에서 ${entities.join(', ')}을(를) 데리고 강을 건너야 합니다. 보트에는 ${owner}과 함께 제한된 수만 탈 수 있습니다. ${owner}가 없으면 약육강식의 법칙이 적용됩니다!`,
  },
  {
    name: '마법의 숲',
    owner: { id: 'wizard', name: '마법사', emoji: '🧙' },
    entities: [
      { id: 'dragon', name: '드래곤', emoji: '🐉' },
      { id: 'knight', name: '기사', emoji: '🤺' },
      { id: 'princess', name: '공주', emoji: '👸' },
      { id: 'goblin', name: '고블린', emoji: '👺' },
      { id: 'fairy', name: '요정', emoji: '🧚' },
      { id: 'unicorn', name: '유니콘', emoji: '🦄' },
      { id: 'flower', name: '마법꽃', emoji: '🌺' },
      { id: 'troll', name: '트롤', emoji: '👹' },
      { id: 'elf', name: '엘프', emoji: '🧝' },
      { id: 'gem', name: '보석', emoji: '💎' },
    ],
    rules: [
      { predator: 'dragon', prey: 'knight', description: '드래곤이 기사를 공격합니다!' },
      { predator: 'dragon', prey: 'princess', description: '드래곤이 공주를 납치합니다!' },
      { predator: 'goblin', prey: 'fairy', description: '고블린이 요정을 잡아갑니다!' },
      { predator: 'goblin', prey: 'gem', description: '고블린이 보석을 훔칩니다!' },
      { predator: 'troll', prey: 'elf', description: '트롤이 엘프를 공격합니다!' },
      { predator: 'troll', prey: 'unicorn', description: '트롤이 유니콘을 공격합니다!' },
      { predator: 'unicorn', prey: 'flower', description: '유니콘이 마법꽃을 먹습니다!' },
      { predator: 'knight', prey: 'goblin', description: '기사가 고블린과 싸웁니다!' },
      { predator: 'dragon', prey: 'fairy', description: '드래곤이 요정을 불태웁니다!' },
      { predator: 'troll', prey: 'fairy', description: '트롤이 요정을 잡아갑니다!' },
      { predator: 'goblin', prey: 'flower', description: '고블린이 마법꽃을 망가뜨립니다!' },
    ],
    storyTemplate: (owner, entities) =>
      `${owner}가 마법의 숲에서 ${entities.join(', ')}과 함께 마법의 강을 건너야 합니다. ${owner}의 마법이 없으면 서로 위험한 관계가 있으니 조심하세요!`,
  },
];

function getEntityCount(difficulty: number): number {
  if (difficulty <= 3) return 3;
  if (difficulty <= 6) return 4;
  if (difficulty <= 8) return 5;
  return 6;
}

export function generateRiverCrossing(difficulty: number, seed: number): RiverCrossingPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = rng.pick(THEMES);
    const entityCount = getEntityCount(difficulty);
    const boatCapacity = difficulty <= 7 ? 1 : 2;

    const selectedEntities = rng.pickN(theme.entities, entityCount);
    const selectedIds = new Set(selectedEntities.map(e => e.id));

    // Filter applicable predation rules
    const applicableRules = theme.rules.filter(
      r => selectedIds.has(r.predator) && selectedIds.has(r.prey)
    );

    // Need at least 1 constraint for a meaningful puzzle
    if (applicableRules.length === 0) continue;

    const puzzle: RiverCrossingPuzzle = {
      seed,
      difficulty,
      category: 'river-crossing',
      optimalSteps: 0,
      story: '',
      rules: [],
      hints: [],
      entities: [theme.owner, ...selectedEntities],
      constraints: applicableRules,
      boatCapacity,
      ownerName: theme.owner.name,
      ownerEmoji: theme.owner.emoji,
      solution: [],
    };

    const result = solveRiverCrossing(puzzle);
    if (!result.solvable) continue;

    puzzle.solution = result.moves;
    puzzle.optimalSteps = result.moves.length;

    // Generate story
    const entityNames = selectedEntities.map(e => `${e.emoji}${e.name}`);
    puzzle.story = theme.storyTemplate(
      `${theme.owner.emoji}${theme.owner.name}`,
      entityNames
    );

    // Generate rules
    puzzle.rules = [
      `${theme.owner.name}만 보트를 운전할 수 있습니다.`,
      `보트에는 ${theme.owner.name} 외에 최대 ${boatCapacity}명까지 탈 수 있습니다.`,
      ...applicableRules.map(r => {
        const predatorEntity = selectedEntities.find(e => e.id === r.predator);
        const preyEntity = selectedEntities.find(e => e.id === r.prey);
        return `${predatorEntity?.emoji ?? ''}${predatorEntity?.name ?? r.predator}과(와) ${preyEntity?.emoji ?? ''}${preyEntity?.name ?? r.prey}을(를) ${theme.owner.name} 없이 두면 안 됩니다.`;
      }),
    ];

    // Generate hints from solution
    puzzle.hints = [
      `최소 ${result.moves.length}번 이동이 필요합니다.`,
    ];
    if (result.moves.length > 0) {
      const firstMoveEntities = result.moves[0].entities
        .filter(e => e !== theme.owner.id)
        .map(id => selectedEntities.find(e => e.id === id)?.name ?? id);
      if (firstMoveEntities.length > 0) {
        puzzle.hints.push(`첫 번째로 ${firstMoveEntities.join(', ')}을(를) 데려가 보세요.`);
      }
    }
    if (result.moves.length > 2) {
      puzzle.hints.push(`핵심은 어떤 것을 되돌려 가져오는지입니다.`);
    }

    return puzzle;
  }

  // Fallback: guaranteed solvable classic puzzle
  const fallbackPuzzle: RiverCrossingPuzzle = {
    seed,
    difficulty,
    category: 'river-crossing',
    optimalSteps: 7,
    story: '👨‍🌾농부가 🐺늑대, 🐑양, 🥬양배추를 데리고 강을 건너야 합니다.',
    rules: [
      '농부만 보트를 운전할 수 있습니다.',
      '보트에는 농부 외에 최대 1명까지 탈 수 있습니다.',
      '늑대와 양을 농부 없이 두면 안 됩니다.',
      '양과 양배추를 농부 없이 두면 안 됩니다.',
    ],
    hints: ['최소 7번 이동이 필요합니다.', '양을 먼저 건너편으로 데려가세요.'],
    entities: [
      { id: 'farmer', name: '농부', emoji: '👨‍🌾' },
      { id: 'wolf', name: '늑대', emoji: '🐺' },
      { id: 'sheep', name: '양', emoji: '🐑' },
      { id: 'cabbage', name: '양배추', emoji: '🥬' },
    ],
    constraints: [
      { predator: 'wolf', prey: 'sheep', description: '늑대가 양을 잡아먹습니다!' },
      { predator: 'sheep', prey: 'cabbage', description: '양이 양배추를 먹습니다!' },
    ],
    boatCapacity: 1,
    ownerName: '농부',
    ownerEmoji: '👨‍🌾',
    solution: [
      { entities: ['farmer', 'sheep'], direction: 'left-to-right' },
      { entities: ['farmer'], direction: 'right-to-left' },
      { entities: ['farmer', 'wolf'], direction: 'left-to-right' },
      { entities: ['farmer', 'sheep'], direction: 'right-to-left' },
      { entities: ['farmer', 'cabbage'], direction: 'left-to-right' },
      { entities: ['farmer'], direction: 'right-to-left' },
      { entities: ['farmer', 'sheep'], direction: 'left-to-right' },
    ],
  };
  return fallbackPuzzle;
}
