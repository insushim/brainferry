import type { WaterJugPuzzle, JugMove } from './generator';

export interface WaterJugState {
  levels: Record<string, number>; // jugId -> current level
  steps: number;
  moveHistory: JugMove[];
  isComplete: boolean;
  isFailed: boolean;
}

export function createInitialState(puzzle: WaterJugPuzzle): WaterJugState {
  const levels: Record<string, number> = {};
  for (const jug of puzzle.jugs) {
    levels[jug.id] = 0;
  }
  return {
    levels,
    steps: 0,
    moveHistory: [],
    isComplete: false,
    isFailed: false,
  };
}

export function applyMove(
  state: WaterJugState,
  move: JugMove,
  puzzle: WaterJugPuzzle
): WaterJugState | { error: string } {
  const newLevels = { ...state.levels };
  const capacityMap = new Map(puzzle.jugs.map(j => [j.id, j.capacity]));

  if (move.action === 'fill') {
    const jugId = move.jugId!;
    const cap = capacityMap.get(jugId);
    if (cap === undefined) return { error: `알 수 없는 물통: ${jugId}` };
    if (newLevels[jugId] === cap) return { error: '이미 가득 차 있습니다.' };
    newLevels[jugId] = cap;
  } else if (move.action === 'empty') {
    const jugId = move.jugId!;
    if (!(jugId in newLevels)) return { error: `알 수 없는 물통: ${jugId}` };
    if (newLevels[jugId] === 0) return { error: '이미 비어 있습니다.' };
    newLevels[jugId] = 0;
  } else if (move.action === 'pour') {
    const fromId = move.from!;
    const toId = move.to!;
    if (!(fromId in newLevels) || !(toId in newLevels)) {
      return { error: '알 수 없는 물통입니다.' };
    }
    if (newLevels[fromId] === 0) return { error: '붓는 물통이 비어 있습니다.' };
    const toCap = capacityMap.get(toId)!;
    const space = toCap - newLevels[toId];
    if (space === 0) return { error: '받는 물통이 가득 차 있습니다.' };
    const pourAmount = Math.min(newLevels[fromId], space);
    newLevels[fromId] -= pourAmount;
    newLevels[toId] += pourAmount;
  }

  // Check completion
  let isComplete = false;
  if (puzzle.targetJug) {
    isComplete = newLevels[puzzle.targetJug] === puzzle.target;
  } else {
    isComplete = Object.values(newLevels).some(l => l === puzzle.target);
  }

  return {
    levels: newLevels,
    steps: state.steps + 1,
    moveHistory: [...state.moveHistory, move],
    isComplete,
    isFailed: false,
  };
}

export function undo(state: WaterJugState, puzzle: WaterJugPuzzle): WaterJugState {
  if (state.moveHistory.length === 0) return state;

  // Replay all moves except last
  let current = createInitialState(puzzle);
  const history = state.moveHistory.slice(0, -1);
  for (const move of history) {
    const result = applyMove(current, move, puzzle);
    if ('error' in result) break;
    current = result;
  }
  return current;
}
