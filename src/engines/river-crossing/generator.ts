import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveRiverCrossing } from './solver';

export type RiverVariant = 'basic' | 'weight-limit' | 'one-way' | 'two-boats' | 'island';

export type RiverMove = {
  entities: string[];
  direction: 'left-to-right' | 'right-to-left';
  boatIndex?: number; // for two-boats variant
  toIsland?: boolean; // for island variant
  fromIsland?: boolean; // for island variant
};

export interface RiverCrossingPuzzle extends BasePuzzle {
  category: 'river-crossing';
  variant: RiverVariant;
  entities: { id: string; name: string; emoji: string; weight?: number; oneWay?: boolean }[];
  constraints: { predator: string; prey: string; description: string }[];
  boatCapacity: number;
  boatMaxWeight?: number; // for weight-limit
  boat2Capacity?: number; // for two-boats (second boat)
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
  storyTemplate: (owner: string, entities: string[], variantDesc: string) => string;
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
    storyTemplate: (owner, entities, variantDesc) =>
      `${owner}이(가) ${entities.join(', ')}을(를) 데리고 강을 건너야 합니다. ${variantDesc}`,
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
    storyTemplate: (owner, entities, variantDesc) =>
      `${owner}가 정글에서 ${entities.join(', ')}을(를) 데리고 강을 건너야 합니다. ${variantDesc}`,
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
    storyTemplate: (owner, entities, variantDesc) =>
      `${owner}가 마법의 숲에서 ${entities.join(', ')}과 함께 마법의 강을 건너야 합니다. ${variantDesc}`,
  },
];

const ENTITY_WEIGHTS: Record<string, number> = {
  wolf: 3, sheep: 2, cabbage: 1, chicken: 1, fox: 2, grain: 1, dog: 3, cat: 2, mouse: 1, cheese: 1,
  lion: 3, zebra: 3, monkey: 2, banana: 1, snake: 2, frog: 1, parrot: 1, crocodile: 3, fish: 1, berry: 1,
  dragon: 3, knight: 3, princess: 2, goblin: 2, fairy: 1, unicorn: 3, flower: 1, troll: 3, elf: 2, gem: 1,
};

function getVariant(difficulty: number, rng: SeededRandom): RiverVariant {
  if (difficulty <= 2) return 'basic';
  if (difficulty <= 4) return rng.pick(['basic', 'weight-limit']);
  if (difficulty <= 6) return rng.pick(['weight-limit', 'one-way']);
  if (difficulty <= 8) return rng.pick(['one-way', 'two-boats']);
  return rng.pick(['two-boats', 'island']);
}

function getEntityCount(difficulty: number): number {
  if (difficulty <= 3) return 3;
  if (difficulty <= 6) return 4;
  if (difficulty <= 8) return 5;
  return 6;
}

function getVariantDescription(variant: RiverVariant, puzzle: Partial<RiverCrossingPuzzle>, ownerName: string): string {
  switch (variant) {
    case 'basic':
      return `보트에는 ${ownerName}과 함께 최대 ${puzzle.boatCapacity}명까지 탈 수 있습니다. ${ownerName} 없이 두면 위험한 조합이 있으니 주의하세요!`;
    case 'weight-limit':
      return `보트에는 무게 제한(${puzzle.boatMaxWeight})이 있습니다! 각 탑승자에게는 무게가 있고, 총 무게가 제한을 넘으면 안 됩니다. ${ownerName}은 무게를 차지하지 않습니다.`;
    case 'one-way':
      return `일부 엔티티는 "일방통행"입니다 — 한번 건너면 다시 돌아올 수 없습니다! 신중하게 계획하세요.`;
    case 'two-boats':
      return `보트가 두 척 있습니다! 1번 보트(정원 ${puzzle.boatCapacity})는 왼쪽에, 2번 보트(정원 ${puzzle.boat2Capacity})는 오른쪽에 있습니다. 어느 보트든 사용할 수 있습니다.`;
    case 'island':
      return `강 한가운데 섬이 있습니다! 왼쪽→섬, 섬→오른쪽으로 두 번 건너야 합니다. 섬을 중간 거점으로 활용하세요.`;
  }
}

export function generateRiverCrossing(difficulty: number, seed: number): RiverCrossingPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = rng.pick(THEMES);
    const variant = getVariant(difficulty, rng);
    const entityCount = getEntityCount(difficulty);

    const selectedEntities = rng.pickN(theme.entities, entityCount);
    const selectedIds = new Set(selectedEntities.map(e => e.id));

    const applicableRules = theme.rules.filter(
      r => selectedIds.has(r.predator) && selectedIds.has(r.prey)
    );

    if (applicableRules.length === 0) continue;

    // Variant-specific configuration
    let boatCapacity = difficulty <= 7 ? 1 : 2;
    let boatMaxWeight: number | undefined;
    let boat2Capacity: number | undefined;
    const entities: RiverCrossingPuzzle['entities'] = [];

    // Build entities with variant-specific data
    entities.push({ id: theme.owner.id, name: theme.owner.name, emoji: theme.owner.emoji });

    for (const e of selectedEntities) {
      const entry: RiverCrossingPuzzle['entities'][0] = { id: e.id, name: e.name, emoji: e.emoji };

      if (variant === 'weight-limit') {
        entry.weight = ENTITY_WEIGHTS[e.id] ?? rng.int(1, 3);
      }
      if (variant === 'one-way' && rng.boolean(0.4)) {
        entry.oneWay = true;
      }
      entities.push(entry);
    }

    if (variant === 'weight-limit') {
      boatCapacity = 3; // high capacity but limited by weight
      const totalWeight = entities.filter(e => e.weight).reduce((s, e) => s + (e.weight ?? 0), 0);
      boatMaxWeight = Math.max(3, Math.floor(totalWeight * 0.5));
    }

    if (variant === 'two-boats') {
      boatCapacity = 1;
      boat2Capacity = rng.pick([1, 2]);
    }

    if (variant === 'island') {
      boatCapacity = difficulty <= 8 ? 2 : 1;
    }

    // Ensure one-way variant has at least one one-way entity
    if (variant === 'one-way') {
      const hasOneWay = entities.some(e => e.oneWay);
      if (!hasOneWay) {
        const nonOwner = entities.filter(e => e.id !== theme.owner.id);
        if (nonOwner.length > 0) {
          nonOwner[rng.int(0, nonOwner.length - 1)].oneWay = true;
        }
      }
    }

    const puzzle: RiverCrossingPuzzle = {
      seed,
      difficulty,
      category: 'river-crossing',
      variant,
      optimalSteps: 0,
      story: '',
      rules: [],
      hints: [],
      entities,
      constraints: applicableRules,
      boatCapacity,
      boatMaxWeight,
      boat2Capacity,
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
    const variantDesc = getVariantDescription(variant, puzzle, theme.owner.name);
    puzzle.story = theme.storyTemplate(
      `${theme.owner.emoji}${theme.owner.name}`,
      entityNames,
      variantDesc
    );

    // Generate rules
    puzzle.rules = [
      `${theme.owner.name}만 보트를 운전할 수 있습니다.`,
    ];

    if (variant === 'basic' || variant === 'one-way') {
      puzzle.rules.push(`보트에는 ${theme.owner.name} 외에 최대 ${boatCapacity}명까지 탈 수 있습니다.`);
    } else if (variant === 'weight-limit') {
      puzzle.rules.push(`보트 무게 제한: ${boatMaxWeight} (${theme.owner.name}은 무게 무시)`);
      for (const e of entities) {
        if (e.weight !== undefined && e.id !== theme.owner.id) {
          puzzle.rules.push(`${e.emoji}${e.name}: 무게 ${e.weight}`);
        }
      }
    } else if (variant === 'two-boats') {
      puzzle.rules.push(`1번 보트: 정원 ${boatCapacity}명 / 2번 보트: 정원 ${boat2Capacity}명`);
      puzzle.rules.push('두 보트 모두 사용 가능합니다.');
    } else if (variant === 'island') {
      puzzle.rules.push(`보트에는 ${theme.owner.name} 외에 최대 ${boatCapacity}명까지 탈 수 있습니다.`);
      puzzle.rules.push('강 중간에 섬이 있습니다. 왼쪽→섬→오른쪽 순서로 이동합니다.');
    }

    if (variant === 'one-way') {
      const oneWayEntities = entities.filter(e => e.oneWay);
      for (const e of oneWayEntities) {
        puzzle.rules.push(`⚠️ ${e.emoji}${e.name}은 일방통행! 건넌 후 돌아올 수 없습니다.`);
      }
    }

    puzzle.rules.push(
      ...applicableRules.map(r => {
        const predatorEntity = selectedEntities.find(e => e.id === r.predator);
        const preyEntity = selectedEntities.find(e => e.id === r.prey);
        return `${predatorEntity?.emoji ?? ''}${predatorEntity?.name ?? r.predator}과(와) ${preyEntity?.emoji ?? ''}${preyEntity?.name ?? r.prey}을(를) ${theme.owner.name} 없이 두면 안 됩니다.`;
      }),
    );

    // Generate hints
    puzzle.hints = [
      `최소 ${result.moves.length}번 이동이 필요합니다.`,
    ];

    if (variant !== 'basic') {
      const variantHints: Record<RiverVariant, string> = {
        basic: '',
        'weight-limit': '무게를 계산해서 보트에 태울 조합을 결정하세요.',
        'one-way': '일방통행 엔티티는 마지막에 건너는 것이 유리합니다.',
        'two-boats': '두 보트의 정원 차이를 활용하세요.',
        island: '섬을 임시 보관소로 활용하세요.',
      };
      puzzle.hints.push(variantHints[variant]);
    }

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
    variant: 'basic',
    optimalSteps: 7,
    story: '👨‍🌾농부가 🐺늑대, 🐑양, 🥬양배추를 데리고 강을 건너야 합니다. 보트에는 농부과 함께 최대 1명까지 탈 수 있습니다. 농부 없이 두면 위험한 조합이 있으니 주의하세요!',
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
