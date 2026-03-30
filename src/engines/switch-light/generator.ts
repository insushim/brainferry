import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveSwitchLight } from './solver';

export type SwitchVariant = 'basic' | 'toggle-chain' | 'timer' | 'sequence';

export interface SwitchLightPuzzle extends BasePuzzle {
  category: 'switch-light';
  variant: SwitchVariant;
  switchCount: number;
  lightCount: number;
  connections: boolean[][]; // connections[switch][light]
  initialState: boolean[];
  goalState: boolean[];
  // toggle-chain: pressing a switch also presses its neighbors
  chainConnections?: number[][]; // chainConnections[switch] = list of other switches triggered
  // timer: some lights auto-toggle after N steps
  timerLights?: { lightIndex: number; interval: number }[];
  // sequence: switches must be pressed in a specific order or they fail
  requiredOrder?: number[]; // if set, switches must be pressed in this order
  solution: number[]; // switch indices to press
}

interface SwitchTheme {
  name: string;
  switchName: string;
  lightName: string;
  storyTemplate: (sw: number, lt: number, variant: SwitchVariant, puzzle: SwitchLightPuzzle) => string;
}

const THEMES: SwitchTheme[] = [
  {
    name: '마법 연구실',
    switchName: '마법 룬',
    lightName: '크리스탈',
    storyTemplate: (sw, lt, variant, puzzle) => {
      let base = `🧪마법사의 연구실에 ${sw}개의 마법 룬과 ${lt}개의 크리스탈이 있습니다. 각 룬을 활성화하면 연결된 크리스탈의 상태가 바뀝니다. 모든 크리스탈을 빛나게 하세요!`;
      if (variant === 'toggle-chain') base += ' ⚠️ 일부 룬은 연쇄적으로 다른 룬도 함께 작동합니다!';
      if (variant === 'timer') base += ' ⚠️ 일부 크리스탈은 시간이 지나면 자동으로 상태가 변합니다!';
      if (variant === 'sequence') base += ' ⚠️ 룬은 정해진 순서대로만 활성화할 수 있습니다!';
      return base;
    },
  },
  {
    name: '우주선 제어판',
    switchName: '스위치',
    lightName: '표시등',
    storyTemplate: (sw, lt, variant, puzzle) => {
      let base = `🚀우주선의 제어판에 ${sw}개의 스위치와 ${lt}개의 표시등이 있습니다. 각 스위치는 여러 표시등에 연결되어 있습니다. 모든 표시등을 켜서 우주선을 가동하세요!`;
      if (variant === 'toggle-chain') base += ' ⚠️ 일부 스위치는 연쇄 반응을 일으킵니다!';
      if (variant === 'timer') base += ' ⚠️ 일부 표시등에 타이머가 설정되어 주기적으로 전환됩니다!';
      if (variant === 'sequence') base += ' ⚠️ 보안 프로토콜: 정해진 순서대로만 스위치를 조작할 수 있습니다!';
      return base;
    },
  },
  {
    name: '퍼즐 상자',
    switchName: '버튼',
    lightName: '램프',
    storyTemplate: (sw, lt, variant, puzzle) => {
      let base = `🎁신비한 퍼즐 상자에 ${sw}개의 버튼과 ${lt}개의 램프가 있습니다. 버튼을 누르면 연결된 램프가 켜지거나 꺼집니다. 모든 램프를 켜면 상자가 열립니다!`;
      if (variant === 'toggle-chain') base += ' ⚠️ 일부 버튼은 다른 버튼도 함께 누릅니다!';
      if (variant === 'timer') base += ' ⚠️ 일부 램프는 시간이 지나면 자동으로 꺼집니다!';
      if (variant === 'sequence') base += ' ⚠️ 버튼을 정해진 순서대로만 누를 수 있습니다!';
      return base;
    },
  },
];

function getVariant(difficulty: number, rng: SeededRandom): SwitchVariant {
  if (difficulty <= 3) return 'basic';
  if (difficulty <= 5) return rng.pick(['basic', 'toggle-chain']);
  if (difficulty <= 7) return rng.pick(['toggle-chain', 'timer']);
  return rng.pick(['timer', 'sequence']);
}

function getSize(difficulty: number): number {
  if (difficulty <= 2) return 3;
  if (difficulty <= 4) return 4;
  if (difficulty <= 6) return 5;
  return 6;
}

export function generateSwitchLight(difficulty: number, seed: number): SwitchLightPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const theme = THEMES[(seed % THEMES.length + attempt) % THEMES.length];
    const variant = getVariant(difficulty, rng);
    const size = getSize(difficulty);
    const switchCount = size;
    const lightCount = size;

    // Generate random connection matrix with seed-varied density
    const densityOptions = [0.25, 0.35, 0.45, 0.55];
    const baseDensity = densityOptions[seed % densityOptions.length];
    const density = baseDensity + difficulty * 0.03;
    const connections: boolean[][] = [];

    for (let sw = 0; sw < switchCount; sw++) {
      const row: boolean[] = [];
      let hasConnection = false;
      for (let lt = 0; lt < lightCount; lt++) {
        const connected = rng.boolean(density);
        row.push(connected);
        if (connected) hasConnection = true;
      }
      if (!hasConnection) {
        row[rng.int(0, lightCount - 1)] = true;
      }
      connections.push(row);
    }

    // Ensure each light is connected to at least one switch
    for (let lt = 0; lt < lightCount; lt++) {
      let hasSwitch = false;
      for (let sw = 0; sw < switchCount; sw++) {
        if (connections[sw][lt]) {
          hasSwitch = true;
          break;
        }
      }
      if (!hasSwitch) {
        connections[rng.int(0, switchCount - 1)][lt] = true;
      }
    }

    const goalState = new Array(lightCount).fill(true);

    // Variant-specific setup
    let chainConnections: number[][] | undefined;
    let timerLights: { lightIndex: number; interval: number }[] | undefined;
    let requiredOrder: number[] | undefined;

    if (variant === 'toggle-chain') {
      // Each switch may trigger 1-2 neighbor switches
      chainConnections = Array.from({ length: switchCount }, () => [] as number[]);
      const chainCount = Math.min(2, Math.floor(switchCount / 2));
      for (let c = 0; c < chainCount; c++) {
        const src = rng.int(0, switchCount - 1);
        let dst = rng.int(0, switchCount - 2);
        if (dst >= src) dst++;
        if (!chainConnections[src].includes(dst)) {
          chainConnections[src].push(dst);
        }
      }
    }

    if (variant === 'timer') {
      // 1-2 lights have timers
      const timerCount = Math.min(2, Math.floor(lightCount / 2));
      timerLights = [];
      const timerIndices = rng.pickN(
        Array.from({ length: lightCount }, (_, i) => i),
        timerCount
      );
      for (const idx of timerIndices) {
        timerLights.push({ lightIndex: idx, interval: rng.int(2, 4) });
      }
    }

    if (variant === 'sequence') {
      // Switches must be pressed in a specific order
      const indices = Array.from({ length: switchCount }, (_, i) => i);
      requiredOrder = rng.shuffle(indices);
    }

    // Generate initial state by starting from goal and applying random switches
    const solutionSwitches: Set<number> = new Set();

    if (variant === 'sequence' && requiredOrder) {
      // For sequence variant, pick a contiguous prefix of the required order
      const numPresses = rng.int(1, Math.min(switchCount, Math.ceil(difficulty / 2) + 1));
      for (let i = 0; i < numPresses; i++) {
        const sw = requiredOrder[i];
        if (solutionSwitches.has(sw)) {
          solutionSwitches.delete(sw);
        } else {
          solutionSwitches.add(sw);
        }
      }
    } else {
      const numPresses = rng.int(1, Math.min(switchCount, Math.ceil(difficulty / 2) + 1));
      const pressOrder = rng.pickN(
        Array.from({ length: switchCount }, (_, i) => i),
        numPresses
      );
      for (const sw of pressOrder) {
        if (solutionSwitches.has(sw)) {
          solutionSwitches.delete(sw);
        } else {
          solutionSwitches.add(sw);
        }
      }
    }

    if (solutionSwitches.size === 0) continue;
    if (solutionSwitches.size < 2) continue;

    // Calculate initial state
    const initialState = [...goalState];

    // For toggle-chain, pressing a switch also triggers chained switches
    const getEffectiveSwitches = (sw: number): Set<number> => {
      const effective = new Set<number>([sw]);
      if (variant === 'toggle-chain' && chainConnections) {
        const queue = [sw];
        const visited = new Set<number>([sw]);
        while (queue.length > 0) {
          const current = queue.shift()!;
          for (const chained of (chainConnections[current] ?? [])) {
            if (!visited.has(chained)) {
              visited.add(chained);
              effective.add(chained);
              queue.push(chained);
            }
          }
        }
      }
      return effective;
    };

    for (const sw of solutionSwitches) {
      const effectiveSwitches = getEffectiveSwitches(sw);
      for (const effSw of effectiveSwitches) {
        for (let lt = 0; lt < lightCount; lt++) {
          if (connections[effSw][lt]) {
            initialState[lt] = !initialState[lt];
          }
        }
      }
    }

    const puzzle: SwitchLightPuzzle = {
      seed,
      difficulty,
      category: 'switch-light',
      variant,
      optimalSteps: 0,
      story: '',
      rules: [],
      hints: [],
      switchCount,
      lightCount,
      connections,
      initialState,
      goalState,
      chainConnections: variant === 'toggle-chain' ? chainConnections : undefined,
      timerLights: variant === 'timer' ? timerLights : undefined,
      requiredOrder: variant === 'sequence' ? requiredOrder : undefined,
      solution: [],
    };

    const result = solveSwitchLight(puzzle);
    if (!result.solvable) continue;

    puzzle.solution = result.solution;
    puzzle.optimalSteps = result.solution.length;
    puzzle.story = theme.storyTemplate(switchCount, lightCount, variant, puzzle);

    puzzle.rules = [
      `${switchCount}개의 ${theme.switchName}과 ${lightCount}개의 ${theme.lightName}이 있습니다.`,
      `${theme.switchName}을 누르면 연결된 ${theme.lightName}의 상태가 반전됩니다(켜짐↔꺼짐).`,
      `모든 ${theme.lightName}을 켜세요.`,
      `같은 ${theme.switchName}을 두 번 누르면 원래대로 돌아갑니다.`,
    ];

    // Variant-specific rule descriptions
    if (variant === 'toggle-chain') {
      puzzle.rules.push('⚠️ 체인 반응: 일부 스위치는 다른 스위치도 자동으로 작동시킵니다.');
    }
    if (variant === 'timer') {
      puzzle.rules.push('⚠️ 타이머 시스템: 일부 전등은 시간이 지나면 자동으로 상태가 변합니다.');
    }
    if (variant === 'sequence') {
      puzzle.rules.push('⚠️ 순서 제한: 스위치를 정해진 순서대로만 조작할 수 있습니다.');
    }

    // Generate connection descriptions
    const connectionDesc: string[] = [];
    for (let sw = 0; sw < switchCount; sw++) {
      const connectedLights: number[] = [];
      for (let lt = 0; lt < lightCount; lt++) {
        if (connections[sw][lt]) connectedLights.push(lt + 1);
      }
      connectionDesc.push(`${theme.switchName} ${sw + 1} → ${theme.lightName} ${connectedLights.join(', ')}`);
    }
    puzzle.rules.push(...connectionDesc);

    if (variant === 'toggle-chain' && chainConnections) {
      for (let sw = 0; sw < switchCount; sw++) {
        if (chainConnections[sw].length > 0) {
          const chained = chainConnections[sw].map(c => c + 1).join(', ');
          puzzle.rules.push(`⚠️ ${theme.switchName} ${sw + 1} → 연쇄: ${theme.switchName} ${chained}도 작동`);
        }
      }
    }

    if (variant === 'timer' && timerLights) {
      for (const t of timerLights) {
        puzzle.rules.push(`⚠️ ${theme.lightName} ${t.lightIndex + 1}: ${t.interval}번째 동작마다 자동 전환`);
      }
    }

    if (variant === 'sequence' && requiredOrder) {
      puzzle.rules.push(`⚠️ 순서 제한: ${requiredOrder.map(i => i + 1).join(' → ')} 순서대로만 조작 가능`);
    }

    puzzle.hints = [
      `최소 ${result.solution.length}번의 조작이 필요합니다.`,
    ];

    // Basic hint for all variants
    if (result.solution.length > 0 && variant !== 'sequence') {
      puzzle.hints.push(`${theme.switchName} ${result.solution[0] + 1}번을 먼저 눌러보세요.`);
    }

    // Variant-specific hints
    if (variant === 'basic') {
      puzzle.hints.push('각 스위치는 0번 또는 1번만 누르면 됩니다 (두 번은 의미 없음).');
      puzzle.hints.push('연결도를 파악하여 어떤 스위치가 어떤 전등에 영향을 주는지 확인하세요.');
    } else if (variant === 'toggle-chain') {
      puzzle.hints.push('연쇄 반응을 고려하여 영향 범위를 파악하세요.');
      puzzle.hints.push('한 스위치를 누르면 연결된 다른 스위치들도 자동으로 눌러집니다.');
    } else if (variant === 'timer') {
      puzzle.hints.push('타이머를 고려해 동작 순서를 계획하세요.');
      puzzle.hints.push('타이머 전등들이 언제 자동으로 바뀌는지 예측하세요.');
    } else if (variant === 'sequence') {
      if (requiredOrder && requiredOrder.length > 0) {
        puzzle.hints.push(`첫 번째로 ${theme.switchName} ${requiredOrder[0] + 1}번을 누르세요.`);
      }
      puzzle.hints.push('순서를 지키면서 필요한 스위치만 선택하세요.');
      puzzle.hints.push('잘못된 순서로 누르면 오류가 발생합니다.');
    }

    return puzzle;
  }

  // Fallback
  return {
    seed,
    difficulty,
    category: 'switch-light',
    variant: 'basic',
    optimalSteps: 2,
    story: '🧪3개의 스위치와 3개의 전등이 있습니다. 모든 전등을 켜세요!',
    rules: [
      '3개의 스위치와 3개의 전등이 있습니다.',
      '스위치를 누르면 연결된 전등이 반전됩니다.',
      '모든 전등을 켜세요.',
      '스위치 1 → 전등 1, 2',
      '스위치 2 → 전등 2, 3',
      '스위치 3 → 전등 1, 3',
    ],
    hints: ['최소 2번 누르면 됩니다.'],
    switchCount: 3,
    lightCount: 3,
    connections: [
      [true, true, false],
      [false, true, true],
      [true, false, true],
    ],
    initialState: [false, false, false],
    goalState: [true, true, true],
    solution: [0, 1],
  };
}
