import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { THEMES_KO, RiverCrossingTheme } from '../../data/themes-ko';
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

// ── Theme Adapter ──

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
}

// Owner ID mapping for themes-ko.ts themes
const OWNER_IDS: Record<string, string> = {
  '농부': 'farmer', '마법사': 'wizard', '선장': 'captain',
  '어부': 'fisherman', '선생님': 'teacher', '셰프': 'chef',
  '탐험가': 'explorer', '해적선장': 'pirate_captain',
};

// Convert themes-ko.ts format to internal Theme format
const THEMES: Theme[] = Object.values(THEMES_KO.riverCrossing).map((t: RiverCrossingTheme) => ({
  name: t.name,
  owner: {
    id: OWNER_IDS[t.owner.name] ?? t.owner.name.toLowerCase().replace(/\s/g, '_'),
    name: t.owner.name,
    emoji: t.owner.emoji,
  },
  entities: t.entities,
  rules: t.predationRules.map(([predator, prey, description]) => ({
    predator,
    prey,
    description,
  })),
}));

const ENTITY_WEIGHTS: Record<string, number> = {
  // farm
  wolf: 3, sheep: 2, cabbage: 1, chicken: 1, fox: 2, grain: 1, dog: 3, cat: 2, mouse: 1, cheese: 1, rabbit: 1, carrot: 1,
  // fantasy
  dragon: 3, princess: 2, treasure: 1, goblin: 2, unicorn: 3, elf: 2, orc: 3, fairy: 1, potion: 1, spellbook: 1, crystal: 1, mushroom: 1,
  // space
  alien: 3, robot: 2, energycell: 1, mineral: 1, spacedog: 2, plant: 1, crystal_s: 1, probe: 2, fuel: 1, satellite: 2,
  // ocean
  shark: 3, fish: 1, bait: 1, octopus: 3, crab: 1, seagull: 2, clam: 1, seaweed: 1, pearl: 1, turtle: 2,
  // school
  puppy: 2, kitty: 2, hamster: 1, parrot: 1, fishbowl: 1, snack: 1, homework: 1, paint: 1, ball: 1, flower: 1,
  // kitchen
  rat: 2, cake: 1, ant: 1, sugar: 1, honey: 1, bread: 1, butter: 1, fruit: 1, icecream: 1, fire: 2,
  // dinosaur
  trex: 3, bronto: 3, raptor: 2, egg: 1, fern: 1, berry: 1, pterodactyl: 2, fossil: 1, insect: 1, baby_dino: 1,
  // pirate
  monkey_p: 2, parrot_p: 1, goldchest: 2, map: 1, cannon: 3, rum: 1, banana: 1, rival: 3, sword: 2, coconut: 1,
  // legacy (정글/마법의 숲 inline themes)
  knight: 3, lion: 3, zebra: 3, monkey: 2, banana_l: 1, snake: 2, frog: 1, crocodile: 3, gem: 1, troll: 3,
};

// ── Constraint topology classification ──
// Ensures structurally different puzzles, not just name swaps

type TopologyType = 'single' | 'chain' | 'fork' | 'convergent' | 'disjoint' | 'web';

function classifyTopology(rules: PredationRule[]): TopologyType {
  if (rules.length <= 1) return 'single';

  const outDeg = new Map<string, number>();
  const inDeg = new Map<string, number>();
  for (const r of rules) {
    outDeg.set(r.predator, (outDeg.get(r.predator) ?? 0) + 1);
    inDeg.set(r.prey, (inDeg.get(r.prey) ?? 0) + 1);
  }

  const allNodes = new Set([...rules.map(r => r.predator), ...rules.map(r => r.prey)]);
  const maxOut = Math.max(...outDeg.values());
  const maxIn = Math.max(...inDeg.values());

  if (rules.length === 2) {
    // 4 distinct nodes = two independent pairs
    if (allNodes.size === 4) return 'disjoint';
    if (maxOut >= 2) return 'fork';
    if (maxIn >= 2) return 'convergent';
    return 'chain';
  }

  // 3+ rules
  if (maxOut >= 2 && maxIn >= 2) return 'web';
  if (maxOut >= 2) return 'fork';
  if (maxIn >= 2) return 'convergent';
  return 'chain';
}

// Topology priority per seed slot — forces structural variety across puzzles
const TOPOLOGY_PRIORITY: TopologyType[][] = [
  ['fork', 'convergent', 'web', 'disjoint', 'chain', 'single'],
  ['chain', 'web', 'fork', 'single', 'convergent', 'disjoint'],
  ['convergent', 'disjoint', 'chain', 'fork', 'web', 'single'],
  ['single', 'fork', 'convergent', 'chain', 'disjoint', 'web'],
  ['disjoint', 'chain', 'web', 'convergent', 'fork', 'single'],
  ['web', 'single', 'disjoint', 'fork', 'chain', 'convergent'],
];

function getVariant(difficulty: number, rng: SeededRandom): RiverVariant {
  if (difficulty <= 1) return rng.pick(['basic', 'basic', 'weight-limit', 'weight-limit']);
  if (difficulty <= 3) return rng.pick(['basic', 'weight-limit', 'weight-limit']);
  if (difficulty <= 5) return rng.pick(['weight-limit', 'one-way']);
  if (difficulty <= 7) return rng.pick(['one-way', 'two-boats']);
  return rng.pick(['two-boats', 'island']);
}

function getEntityCount(difficulty: number, rng: SeededRandom): number {
  if (difficulty <= 1) return rng.pick([2, 3, 3, 4]);
  if (difficulty <= 3) return rng.pick([3, 3, 4]);
  if (difficulty <= 6) return rng.pick([3, 4, 4, 5]);
  if (difficulty <= 8) return rng.pick([4, 5, 5]);
  return rng.pick([5, 6]);
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

  // Deterministic theme cycling — different seeds → different themes
  const themeOrder = seed % THEMES.length;
  // Topology preference — different seeds → different constraint structures
  const topologyPref = TOPOLOGY_PRIORITY[seed % TOPOLOGY_PRIORITY.length];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    // Cycle themes: first try preferred theme, then shift on retries
    const theme = THEMES[(themeOrder + attempt) % THEMES.length];
    const variant = getVariant(difficulty, rng);
    const entityCount = getEntityCount(difficulty, rng);

    const selectedEntities = rng.pickN(theme.entities, entityCount);
    const selectedIds = new Set(selectedEntities.map(e => e.id));

    const applicableRules = theme.rules.filter(
      r => selectedIds.has(r.predator) && selectedIds.has(r.prey)
    );

    if (applicableRules.length === 0) continue;

    // Topology-based structural diversity:
    // In early attempts, only accept if topology matches preference.
    // After enough retries, accept any topology to guarantee termination.
    const topology = classifyTopology(applicableRules);
    const topologyRank = topologyPref.indexOf(topology);
    // First 60% of retries: only accept top-2 preferred topologies
    // Next 20%: accept top-4
    // Last 20%: accept anything
    if (attempt < maxRetries * 0.6 && topologyRank > 1) continue;
    if (attempt < maxRetries * 0.8 && topologyRank > 3) continue;

    // Variant-specific configuration — capacity varies by entity count
    let boatCapacity: number;
    if (variant === 'basic' || variant === 'one-way') {
      if (entityCount <= 2) {
        boatCapacity = 1;
      } else if (entityCount === 3 && difficulty <= 3) {
        boatCapacity = rng.pick([1, 2]);
      } else if (entityCount >= 4 && difficulty <= 5) {
        boatCapacity = rng.pick([1, 2]);
      } else {
        boatCapacity = difficulty <= 7 ? 1 : 2;
      }
    } else {
      boatCapacity = difficulty <= 7 ? 1 : 2;
    }
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
    const ownerLabel = `${theme.owner.emoji}${theme.owner.name}`;
    puzzle.story = `${ownerLabel}가 ${entityNames.join(', ')}을(를) 데리고 강을 건너야 합니다. ${variantDesc}`;

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
