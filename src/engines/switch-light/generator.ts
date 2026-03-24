import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveSwitchLight } from './solver';

export interface SwitchLightPuzzle extends BasePuzzle {
  category: 'switch-light';
  switchCount: number;
  lightCount: number;
  connections: boolean[][]; // connections[switch][light]
  initialState: boolean[];
  goalState: boolean[];
  solution: number[]; // switch indices to press
}

interface SwitchTheme {
  name: string;
  switchName: string;
  lightName: string;
  storyTemplate: (switchCount: number, lightCount: number) => string;
}

const THEMES: SwitchTheme[] = [
  {
    name: '마법 연구실',
    switchName: '마법 룬',
    lightName: '크리스탈',
    storyTemplate: (sw, lt) =>
      `🧪마법사의 연구실에 ${sw}개의 마법 룬과 ${lt}개의 크리스탈이 있습니다. 각 룬을 활성화하면 연결된 크리스탈의 상태가 바뀝니다. 모든 크리스탈을 빛나게 하세요!`,
  },
  {
    name: '우주선 제어판',
    switchName: '스위치',
    lightName: '표시등',
    storyTemplate: (sw, lt) =>
      `🚀우주선의 제어판에 ${sw}개의 스위치와 ${lt}개의 표시등이 있습니다. 각 스위치는 여러 표시등에 연결되어 있습니다. 모든 표시등을 켜서 우주선을 가동하세요!`,
  },
  {
    name: '퍼즐 상자',
    switchName: '버튼',
    lightName: '램프',
    storyTemplate: (sw, lt) =>
      `🎁신비한 퍼즐 상자에 ${sw}개의 버튼과 ${lt}개의 램프가 있습니다. 버튼을 누르면 연결된 램프가 켜지거나 꺼집니다. 모든 램프를 켜면 상자가 열립니다!`,
  },
];

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
    const theme = rng.pick(THEMES);
    const size = getSize(difficulty);
    const switchCount = size;
    const lightCount = size;

    // Generate random connection matrix
    // Each switch should connect to at least 1 light
    // Connection density increases with difficulty
    const density = 0.3 + difficulty * 0.05;
    const connections: boolean[][] = [];

    for (let sw = 0; sw < switchCount; sw++) {
      const row: boolean[] = [];
      let hasConnection = false;
      for (let lt = 0; lt < lightCount; lt++) {
        const connected = rng.boolean(density);
        row.push(connected);
        if (connected) hasConnection = true;
      }
      // Ensure at least one connection
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

    // Goal: all lights on
    const goalState = new Array(lightCount).fill(true);

    // Generate initial state by starting from goal and applying random switches
    // This guarantees solvability
    const solutionSwitches: Set<number> = new Set();
    const numPresses = rng.int(1, Math.min(switchCount, Math.ceil(difficulty / 2) + 1));
    const pressOrder = rng.pickN(
      Array.from({ length: switchCount }, (_, i) => i),
      numPresses
    );
    for (const sw of pressOrder) {
      if (solutionSwitches.has(sw)) {
        solutionSwitches.delete(sw); // pressing twice cancels out
      } else {
        solutionSwitches.add(sw);
      }
    }

    // If no switches remain (all cancelled), try again
    if (solutionSwitches.size === 0) continue;

    // Calculate initial state by applying solution switches to goal state
    const initialState = [...goalState];
    for (const sw of solutionSwitches) {
      for (let lt = 0; lt < lightCount; lt++) {
        if (connections[sw][lt]) {
          initialState[lt] = !initialState[lt];
        }
      }
    }

    // Verify with solver
    const puzzle: SwitchLightPuzzle = {
      seed,
      difficulty,
      category: 'switch-light',
      optimalSteps: 0,
      story: '',
      rules: [],
      hints: [],
      switchCount,
      lightCount,
      connections,
      initialState,
      goalState,
      solution: [],
    };

    const result = solveSwitchLight(puzzle);
    if (!result.solvable) continue;

    puzzle.solution = result.solution;
    puzzle.optimalSteps = result.solution.length;
    puzzle.story = theme.storyTemplate(switchCount, lightCount);

    puzzle.rules = [
      `${switchCount}개의 ${theme.switchName}과 ${lightCount}개의 ${theme.lightName}이 있습니다.`,
      `${theme.switchName}을 누르면 연결된 ${theme.lightName}의 상태가 반전됩니다(켜짐↔꺼짐).`,
      `모든 ${theme.lightName}을 켜세요.`,
      `같은 ${theme.switchName}을 두 번 누르면 원래대로 돌아갑니다.`,
    ];

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

    puzzle.hints = [
      `최소 ${result.solution.length}번의 조작이 필요합니다.`,
    ];
    if (result.solution.length > 0) {
      puzzle.hints.push(`${theme.switchName} ${result.solution[0] + 1}번을 먼저 눌러보세요.`);
    }
    puzzle.hints.push('각 스위치는 0번 또는 1번만 누르면 됩니다 (두 번은 의미 없음).');

    return puzzle;
  }

  // Fallback: simple 3x3
  return {
    seed,
    difficulty,
    category: 'switch-light',
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
