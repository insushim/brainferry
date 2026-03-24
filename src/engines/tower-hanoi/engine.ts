import type { HanoiPuzzle, HanoiMove } from './generator';

export interface HanoiState {
  pegs: number[][];
  steps: number;
  moveHistory: HanoiMove[];
  isComplete: boolean;
  isFailed: boolean;
  failReason?: string;
}

export function createInitialState(puzzle: HanoiPuzzle): HanoiState {
  return {
    pegs: puzzle.initialState.map(p => [...p]),
    steps: 0,
    moveHistory: [],
    isComplete: false,
    isFailed: false,
  };
}

export function applyMove(
  state: HanoiState,
  move: HanoiMove,
  puzzle: HanoiPuzzle
): HanoiState | { error: string } {
  const fromPeg = state.pegs[move.from];
  if (!fromPeg || fromPeg.length === 0) {
    return { error: '해당 기둥에 원반이 없습니다.' };
  }

  const disc = fromPeg[fromPeg.length - 1];
  if (disc !== move.disc) {
    return { error: '맨 위 원반만 이동할 수 있습니다.' };
  }

  // Check move restrictions
  if (puzzle.moveRestrictions) {
    for (const r of puzzle.moveRestrictions) {
      if (r.from === move.from && r.to === move.to) {
        return { error: `기둥 ${move.from + 1}에서 기둥 ${move.to + 1}(으)로 직접 이동할 수 없습니다.` };
      }
    }
  }

  const toPeg = state.pegs[move.to];
  if (toPeg.length > 0 && toPeg[toPeg.length - 1] < disc) {
    return { error: '큰 원반을 작은 원반 위에 놓을 수 없습니다.' };
  }

  const newPegs = state.pegs.map(p => [...p]);
  newPegs[move.from].pop();
  newPegs[move.to].push(disc);

  // Check completion
  const goalKey = puzzle.goalState.map(p => p.join(',')).join(';');
  const currentKey = newPegs.map(p => p.join(',')).join(';');
  const isComplete = currentKey === goalKey;

  return {
    pegs: newPegs,
    steps: state.steps + 1,
    moveHistory: [...state.moveHistory, move],
    isComplete,
    isFailed: false,
  };
}

export function undo(state: HanoiState): HanoiState {
  if (state.moveHistory.length === 0) return state;

  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  const newPegs = state.pegs.map(p => [...p]);
  const disc = newPegs[lastMove.to].pop()!;
  newPegs[lastMove.from].push(disc);

  return {
    pegs: newPegs,
    steps: state.steps - 1,
    moveHistory: state.moveHistory.slice(0, -1),
    isComplete: false,
    isFailed: false,
  };
}
