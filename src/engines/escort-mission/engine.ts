import type { EscortPuzzle, EscortMove } from './generator';

export interface EscortState {
  leftA: number;
  leftB: number;
  rightA: number;
  rightB: number;
  boatPosition: 'left' | 'right';
  steps: number;
  moveHistory: EscortMove[];
  isComplete: boolean;
  isFailed: boolean;
  failReason?: string;
}

export function createInitialState(puzzle: EscortPuzzle): EscortState {
  return {
    leftA: puzzle.groupA.count,
    leftB: puzzle.groupB.count,
    rightA: 0,
    rightB: 0,
    boatPosition: 'left',
    steps: 0,
    moveHistory: [],
    isComplete: false,
    isFailed: false,
  };
}

export function applyMove(
  state: EscortState,
  move: EscortMove,
  puzzle: EscortPuzzle
): EscortState | { error: string } {
  const dir = move.direction;
  const total = move.groupA + move.groupB;

  if (total === 0) return { error: '보트에 아무도 없습니다.' };
  if (total > puzzle.boatCapacity) return { error: `보트 정원(${puzzle.boatCapacity}명)을 초과합니다.` };
  if (puzzle.driverRequired && move.groupA === 0) {
    return { error: `${puzzle.groupA.name}만 보트를 운전할 수 있습니다.` };
  }

  let newLeftA = state.leftA;
  let newLeftB = state.leftB;
  let newRightA = state.rightA;
  let newRightB = state.rightB;

  if (dir === 'left-to-right') {
    if (move.groupA > state.leftA || move.groupB > state.leftB) {
      return { error: '왼쪽 강변에 충분한 인원이 없습니다.' };
    }
    newLeftA -= move.groupA;
    newLeftB -= move.groupB;
    newRightA += move.groupA;
    newRightB += move.groupB;
  } else {
    if (move.groupA > state.rightA || move.groupB > state.rightB) {
      return { error: '오른쪽 강변에 충분한 인원이 없습니다.' };
    }
    newRightA -= move.groupA;
    newRightB -= move.groupB;
    newLeftA += move.groupA;
    newLeftB += move.groupB;
  }

  // Check constraint: B must never outnumber A on any bank (when A > 0)
  let failReason: string | undefined;
  let isFailed = false;

  if (newLeftA > 0 && newLeftB > newLeftA) {
    isFailed = true;
    failReason = `왼쪽 강변에서 ${puzzle.groupB.name}(${newLeftB}명)이 ${puzzle.groupA.name}(${newLeftA}명)보다 많습니다!`;
  }
  if (newRightA > 0 && newRightB > newRightA) {
    isFailed = true;
    failReason = `오른쪽 강변에서 ${puzzle.groupB.name}(${newRightB}명)이 ${puzzle.groupA.name}(${newRightA}명)보다 많습니다!`;
  }

  const isComplete = newLeftA === 0 && newLeftB === 0;

  return {
    leftA: newLeftA,
    leftB: newLeftB,
    rightA: newRightA,
    rightB: newRightB,
    boatPosition: dir === 'left-to-right' ? 'right' : 'left',
    steps: state.steps + 1,
    moveHistory: [...state.moveHistory, move],
    isComplete: isComplete && !isFailed,
    isFailed,
    failReason,
  };
}

export function undo(state: EscortState, puzzle: EscortPuzzle): EscortState {
  if (state.moveHistory.length === 0) return state;

  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  let newLeftA = state.leftA;
  let newLeftB = state.leftB;
  let newRightA = state.rightA;
  let newRightB = state.rightB;

  if (lastMove.direction === 'left-to-right') {
    newLeftA += lastMove.groupA;
    newLeftB += lastMove.groupB;
    newRightA -= lastMove.groupA;
    newRightB -= lastMove.groupB;
  } else {
    newRightA += lastMove.groupA;
    newRightB += lastMove.groupB;
    newLeftA -= lastMove.groupA;
    newLeftB -= lastMove.groupB;
  }

  return {
    leftA: newLeftA,
    leftB: newLeftB,
    rightA: newRightA,
    rightB: newRightB,
    boatPosition: lastMove.direction === 'left-to-right' ? 'left' : 'right',
    steps: state.steps - 1,
    moveHistory: state.moveHistory.slice(0, -1),
    isComplete: false,
    isFailed: false,
  };
}
