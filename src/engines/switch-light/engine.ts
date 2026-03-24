import type { SwitchLightPuzzle } from './generator';

export interface SwitchLightState {
  lightStates: boolean[];
  switchesPressed: number[];
  steps: number;
  moveHistory: number[]; // switch indices pressed
  isComplete: boolean;
  isFailed: boolean;
}

export function createInitialState(puzzle: SwitchLightPuzzle): SwitchLightState {
  return {
    lightStates: [...puzzle.initialState],
    switchesPressed: [],
    steps: 0,
    moveHistory: [],
    isComplete: false,
    isFailed: false,
  };
}

export function pressSwitch(
  state: SwitchLightState,
  switchIndex: number,
  puzzle: SwitchLightPuzzle
): SwitchLightState | { error: string } {
  if (switchIndex < 0 || switchIndex >= puzzle.switchCount) {
    return { error: `유효하지 않은 스위치 번호: ${switchIndex}` };
  }

  const newLights = [...state.lightStates];
  // Toggle all lights connected to this switch
  for (let i = 0; i < puzzle.lightCount; i++) {
    if (puzzle.connections[switchIndex][i]) {
      newLights[i] = !newLights[i];
    }
  }

  const isComplete = newLights.every((light, i) => light === puzzle.goalState[i]);

  return {
    lightStates: newLights,
    switchesPressed: [...state.switchesPressed, switchIndex],
    steps: state.steps + 1,
    moveHistory: [...state.moveHistory, switchIndex],
    isComplete,
    isFailed: false,
  };
}

export function undo(
  state: SwitchLightState,
  puzzle: SwitchLightPuzzle
): SwitchLightState {
  if (state.moveHistory.length === 0) return state;

  const lastSwitch = state.moveHistory[state.moveHistory.length - 1];
  const newLights = [...state.lightStates];

  // Toggle back (XOR is its own inverse)
  for (let i = 0; i < puzzle.lightCount; i++) {
    if (puzzle.connections[lastSwitch][i]) {
      newLights[i] = !newLights[i];
    }
  }

  return {
    lightStates: newLights,
    switchesPressed: state.switchesPressed.slice(0, -1),
    steps: state.steps - 1,
    moveHistory: state.moveHistory.slice(0, -1),
    isComplete: false,
    isFailed: false,
  };
}
