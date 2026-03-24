import type { SwitchLightPuzzle } from './generator';

export interface SwitchLightState {
  lightStates: boolean[];
  switchesPressed: number[];
  steps: number;
  moveHistory: number[];
  sequenceIndex: number; // for sequence variant: current position in required order
  isComplete: boolean;
  isFailed: boolean;
  failReason?: string;
}

export function createInitialState(puzzle: SwitchLightPuzzle): SwitchLightState {
  return {
    lightStates: [...puzzle.initialState],
    switchesPressed: [],
    steps: 0,
    moveHistory: [],
    sequenceIndex: 0,
    isComplete: false,
    isFailed: false,
  };
}

/**
 * Get all switches that are effectively toggled when pressing a switch.
 */
function getEffectiveSwitches(switchIdx: number, puzzle: SwitchLightPuzzle): Set<number> {
  const effective = new Set<number>([switchIdx]);
  if (puzzle.variant === 'toggle-chain' && puzzle.chainConnections) {
    const queue = [switchIdx];
    const visited = new Set<number>([switchIdx]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const chained of (puzzle.chainConnections[current] ?? [])) {
        if (!visited.has(chained)) {
          visited.add(chained);
          effective.add(chained);
          queue.push(chained);
        }
      }
    }
  }
  return effective;
}

export function pressSwitch(
  state: SwitchLightState,
  switchIndex: number,
  puzzle: SwitchLightPuzzle
): SwitchLightState | { error: string } {
  if (switchIndex < 0 || switchIndex >= puzzle.switchCount) {
    return { error: `유효하지 않은 스위치 번호: ${switchIndex}` };
  }

  // Sequence variant: check if this switch is the next in required order
  if (puzzle.variant === 'sequence' && puzzle.requiredOrder) {
    if (state.sequenceIndex >= puzzle.requiredOrder.length) {
      return { error: '더 이상 누를 수 있는 스위치가 없습니다.' };
    }
    const expectedSwitch = puzzle.requiredOrder[state.sequenceIndex];
    if (switchIndex !== expectedSwitch) {
      return { error: `순서 위반! 다음으로 눌러야 할 스위치: ${expectedSwitch + 1}번` };
    }
  }

  const newLights = [...state.lightStates];

  // Get all effective switches (including chained ones)
  const effectiveSwitches = getEffectiveSwitches(switchIndex, puzzle);

  // Toggle all lights connected to each effective switch
  for (const effSw of effectiveSwitches) {
    for (let i = 0; i < puzzle.lightCount; i++) {
      if (puzzle.connections[effSw][i]) {
        newLights[i] = !newLights[i];
      }
    }
  }

  const newStep = state.steps + 1;

  // Timer variant: auto-toggle timer lights
  if (puzzle.variant === 'timer' && puzzle.timerLights) {
    for (const t of puzzle.timerLights) {
      if (newStep > 0 && newStep % t.interval === 0) {
        newLights[t.lightIndex] = !newLights[t.lightIndex];
      }
    }
  }

  const isComplete = newLights.every((light, i) => light === puzzle.goalState[i]);

  return {
    lightStates: newLights,
    switchesPressed: [...state.switchesPressed, switchIndex],
    steps: newStep,
    moveHistory: [...state.moveHistory, switchIndex],
    sequenceIndex: state.sequenceIndex + 1,
    isComplete,
    isFailed: false,
  };
}

export function undo(
  state: SwitchLightState,
  puzzle: SwitchLightPuzzle
): SwitchLightState {
  if (state.moveHistory.length === 0) return state;

  // Replay all but last move (simplest correct approach for timer/chain variants)
  let current = createInitialState(puzzle);
  const history = state.moveHistory.slice(0, -1);
  for (const sw of history) {
    const result = pressSwitch(current, sw, puzzle);
    if ('error' in result) break;
    current = result;
  }
  return current;
}
