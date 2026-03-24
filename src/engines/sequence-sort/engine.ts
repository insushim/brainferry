import type { SequenceSortPuzzle, SortMove } from './generator';

export interface SequenceSortState {
  order: number[];
  steps: number;
  moveHistory: SortMove[];
  isComplete: boolean;
  isFailed: boolean;
}

export function createInitialState(puzzle: SequenceSortPuzzle): SequenceSortState {
  return {
    order: [...puzzle.initialOrder],
    steps: 0,
    moveHistory: [],
    isComplete: false,
    isFailed: false,
  };
}

export function applyMove(
  state: SequenceSortState,
  move: SortMove,
  puzzle: SequenceSortPuzzle
): SequenceSortState | { error: string } {
  if (!puzzle.allowedOps.includes(move.op)) {
    return { error: `허용되지 않은 연산: ${move.op}` };
  }

  const n = state.order.length;
  if (move.index < 0 || move.index >= n) {
    return { error: `유효하지 않은 인덱스: ${move.index}` };
  }

  const newOrder = [...state.order];

  if (move.op === 'swap') {
    if (move.index >= n - 1) {
      return { error: '마지막 위치에서는 swap할 수 없습니다.' };
    }
    [newOrder[move.index], newOrder[move.index + 1]] = [newOrder[move.index + 1], newOrder[move.index]];
  } else if (move.op === 'flip') {
    const count = move.count ?? 2;
    if (count < 2 || count > n) {
      return { error: '뒤집기 범위가 유효하지 않습니다.' };
    }
    const sub = newOrder.slice(0, count).reverse();
    for (let i = 0; i < count; i++) {
      newOrder[i] = sub[i];
    }
  } else if (move.op === 'rotate') {
    const count = move.count ?? 3;
    const end = Math.min(move.index + count, n);
    const last = newOrder[end - 1];
    for (let j = end - 1; j > move.index; j--) {
      newOrder[j] = newOrder[j - 1];
    }
    newOrder[move.index] = last;
  }

  const isComplete = newOrder.join(',') === puzzle.goalOrder.join(',');

  return {
    order: newOrder,
    steps: state.steps + 1,
    moveHistory: [...state.moveHistory, move],
    isComplete,
    isFailed: false,
  };
}

export function undo(state: SequenceSortState, puzzle: SequenceSortPuzzle): SequenceSortState {
  if (state.moveHistory.length === 0) return state;

  // Replay all but last move
  let current = createInitialState(puzzle);
  const history = state.moveHistory.slice(0, -1);
  for (const move of history) {
    const result = applyMove(current, move, puzzle);
    if ('error' in result) break;
    current = result;
  }
  return current;
}
