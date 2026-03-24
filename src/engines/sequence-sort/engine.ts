import type { SequenceSortPuzzle, SortMove } from './generator';

export interface SequenceSortState {
  order: number[];
  steps: number;
  moveHistory: SortMove[];
  visiblePositions: boolean[]; // for blind variant: which positions are visible
  isComplete: boolean;
  isFailed: boolean;
  failReason?: string;
}

export function createInitialState(puzzle: SequenceSortPuzzle): SequenceSortState {
  const visible = new Array(puzzle.items.length).fill(true);
  if (puzzle.variant === 'blind' && puzzle.hiddenPositions) {
    for (const pos of puzzle.hiddenPositions) {
      visible[pos] = false;
    }
  }

  return {
    order: [...puzzle.initialOrder],
    steps: 0,
    moveHistory: [],
    visiblePositions: visible,
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

  // Limited-ops check
  if (puzzle.variant === 'limited-ops' && puzzle.maxOps !== undefined) {
    if (state.steps >= puzzle.maxOps) {
      return { error: `최대 동작 횟수(${puzzle.maxOps}번)를 초과했습니다!` };
    }
  }

  const newOrder = [...state.order];
  const newVisible = [...state.visiblePositions];

  if (move.op === 'swap') {
    if (move.index >= n - 1) {
      return { error: '마지막 위치에서는 swap할 수 없습니다.' };
    }
    [newOrder[move.index], newOrder[move.index + 1]] = [newOrder[move.index + 1], newOrder[move.index]];
    // Swap visibility too
    [newVisible[move.index], newVisible[move.index + 1]] = [newVisible[move.index + 1], newVisible[move.index]];
    // Reveal touched positions in blind variant
    if (puzzle.variant === 'blind') {
      newVisible[move.index] = true;
      newVisible[move.index + 1] = true;
    }
  } else if (move.op === 'flip') {
    const count = move.count ?? 2;
    if (count < 2 || count > n) {
      return { error: '뒤집기 범위가 유효하지 않습니다.' };
    }
    const sub = newOrder.slice(0, count).reverse();
    const visSub = newVisible.slice(0, count).reverse();
    for (let i = 0; i < count; i++) {
      newOrder[i] = sub[i];
      newVisible[i] = visSub[i];
    }
    // Reveal endpoints in blind variant
    if (puzzle.variant === 'blind') {
      newVisible[0] = true;
      newVisible[count - 1] = true;
    }
  } else if (move.op === 'rotate') {
    const count = move.count ?? 3;
    const end = Math.min(move.index + count, n);
    const last = newOrder[end - 1];
    const lastVis = newVisible[end - 1];
    for (let j = end - 1; j > move.index; j--) {
      newOrder[j] = newOrder[j - 1];
      newVisible[j] = newVisible[j - 1];
    }
    newOrder[move.index] = last;
    newVisible[move.index] = lastVis;
    // Reveal touched positions in blind variant
    if (puzzle.variant === 'blind') {
      newVisible[move.index] = true;
    }
  }

  // Check completion against primary goal
  let isComplete = newOrder.join(',') === puzzle.goalOrder.join(',');

  // Multi-target: check alternate goals too
  if (!isComplete && puzzle.variant === 'multi-target' && puzzle.alternateGoals) {
    for (const altGoal of puzzle.alternateGoals) {
      if (newOrder.join(',') === altGoal.join(',')) {
        isComplete = true;
        break;
      }
    }
  }

  // Limited-ops: fail if out of moves and not complete
  let isFailed = false;
  let failReason: string | undefined;
  if (puzzle.variant === 'limited-ops' && puzzle.maxOps !== undefined) {
    if (state.steps + 1 >= puzzle.maxOps && !isComplete) {
      isFailed = true;
      failReason = `${puzzle.maxOps}번의 동작을 모두 사용했지만 정렬되지 않았습니다.`;
    }
  }

  return {
    order: newOrder,
    steps: state.steps + 1,
    moveHistory: [...state.moveHistory, move],
    visiblePositions: newVisible,
    isComplete,
    isFailed,
    failReason,
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
