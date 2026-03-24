import type { EscortPuzzle, EscortMove } from './generator';

export interface EscortState {
  leftA: number;
  leftB: number;
  leftC: number; // for three-groups
  rightA: number;
  rightB: number;
  rightC: number;
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
    leftC: puzzle.groupC?.count ?? 0,
    rightA: 0,
    rightB: 0,
    rightC: 0,
    boatPosition: 'left',
    steps: 0,
    moveHistory: [],
    isComplete: false,
    isFailed: false,
  };
}

function getEffectiveCounts(
  a: number, b: number,
  puzzle: EscortPuzzle,
  isLeft: boolean,
  totalA: number, totalB: number
): { effA: number; effB: number } {
  if (puzzle.variant !== 'traitor') return { effA: a, effB: b };

  // Rough approximation: traitor position based on which side has their group
  if (puzzle.traitorInA) {
    // One A member counts as B — subtract 1 from A, add 1 to B if traitor is on this side
    // Heuristic: traitor is on the side where their apparent group has members
    if (a > 0) return { effA: a - 1, effB: b + 1 };
    return { effA: a, effB: b };
  } else {
    if (b > 0) return { effA: a + 1, effB: b - 1 };
    return { effA: a, effB: b };
  }
}

export function applyMove(
  state: EscortState,
  move: EscortMove,
  puzzle: EscortPuzzle
): EscortState | { error: string } {
  const dir = move.direction;
  const total = move.groupA + move.groupB + (move.groupC ?? 0);

  if (total === 0) return { error: '보트에 아무도 없습니다.' };
  if (total > puzzle.boatCapacity) return { error: `보트 정원(${puzzle.boatCapacity}명)을 초과합니다.` };
  if (puzzle.driverRequired && move.groupA === 0) {
    return { error: `${puzzle.groupA.name}만 보트를 운전할 수 있습니다.` };
  }

  let newLeftA = state.leftA;
  let newLeftB = state.leftB;
  let newLeftC = state.leftC;
  let newRightA = state.rightA;
  let newRightB = state.rightB;
  let newRightC = state.rightC;

  if (dir === 'left-to-right') {
    if (move.groupA > state.leftA || move.groupB > state.leftB || (move.groupC ?? 0) > state.leftC) {
      return { error: '왼쪽 강변에 충분한 인원이 없습니다.' };
    }
    newLeftA -= move.groupA;
    newLeftB -= move.groupB;
    newLeftC -= move.groupC ?? 0;
    newRightA += move.groupA;
    newRightB += move.groupB;
    newRightC += move.groupC ?? 0;
  } else {
    if (move.groupA > state.rightA || move.groupB > state.rightB || (move.groupC ?? 0) > state.rightC) {
      return { error: '오른쪽 강변에 충분한 인원이 없습니다.' };
    }
    newRightA -= move.groupA;
    newRightB -= move.groupB;
    newRightC -= move.groupC ?? 0;
    newLeftA += move.groupA;
    newLeftB += move.groupB;
    newLeftC += move.groupC ?? 0;
  }

  let failReason: string | undefined;
  let isFailed = false;

  if (puzzle.variant === 'three-groups') {
    // Triangle: A>B>C>A — each dominates the next
    // Violation if dominant group has more than subordinate (when subordinate > 0)
    const checkTriangle = (a: number, b: number, c: number, side: string): string | null => {
      if (b > 0 && a > b) return `${side}에서 ${puzzle.groupA.name}(${a})이 ${puzzle.groupB.name}(${b})보다 많습니다!`;
      if (c > 0 && b > c) return `${side}에서 ${puzzle.groupB.name}(${b})이 ${puzzle.groupC?.name}(${c})보다 많습니다!`;
      if (a > 0 && c > a) return `${side}에서 ${puzzle.groupC?.name}(${c})이 ${puzzle.groupA.name}(${a})보다 많습니다!`;
      return null;
    };
    const leftFail = checkTriangle(newLeftA, newLeftB, newLeftC, '왼쪽');
    const rightFail = checkTriangle(newRightA, newRightB, newRightC, '오른쪽');
    if (leftFail) { isFailed = true; failReason = leftFail; }
    if (rightFail) { isFailed = true; failReason = rightFail; }
  } else {
    const leftEff = getEffectiveCounts(newLeftA, newLeftB, puzzle, true, puzzle.groupA.count, puzzle.groupB.count);
    const rightEff = getEffectiveCounts(newRightA, newRightB, puzzle, false, puzzle.groupA.count, puzzle.groupB.count);

    if (leftEff.effA > 0 && leftEff.effB > leftEff.effA) {
      isFailed = true;
      failReason = `왼쪽 강변에서 ${puzzle.groupB.name}(${leftEff.effB}명)이 ${puzzle.groupA.name}(${leftEff.effA}명)보다 많습니다!`;
    }
    if (rightEff.effA > 0 && rightEff.effB > rightEff.effA) {
      isFailed = true;
      failReason = `오른쪽 강변에서 ${puzzle.groupB.name}(${rightEff.effB}명)이 ${puzzle.groupA.name}(${rightEff.effA}명)보다 많습니다!`;
    }
  }

  const isComplete = newLeftA === 0 && newLeftB === 0 && newLeftC === 0;

  return {
    leftA: newLeftA,
    leftB: newLeftB,
    leftC: newLeftC,
    rightA: newRightA,
    rightB: newRightB,
    rightC: newRightC,
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
  let newLeftC = state.leftC;
  let newRightA = state.rightA;
  let newRightB = state.rightB;
  let newRightC = state.rightC;

  if (lastMove.direction === 'left-to-right') {
    newLeftA += lastMove.groupA;
    newLeftB += lastMove.groupB;
    newLeftC += lastMove.groupC ?? 0;
    newRightA -= lastMove.groupA;
    newRightB -= lastMove.groupB;
    newRightC -= lastMove.groupC ?? 0;
  } else {
    newRightA += lastMove.groupA;
    newRightB += lastMove.groupB;
    newRightC += lastMove.groupC ?? 0;
    newLeftA -= lastMove.groupA;
    newLeftB -= lastMove.groupB;
    newLeftC -= lastMove.groupC ?? 0;
  }

  return {
    leftA: newLeftA,
    leftB: newLeftB,
    leftC: newLeftC,
    rightA: newRightA,
    rightB: newRightB,
    rightC: newRightC,
    boatPosition: lastMove.direction === 'left-to-right' ? 'left' : 'right',
    steps: state.steps - 1,
    moveHistory: state.moveHistory.slice(0, -1),
    isComplete: false,
    isFailed: false,
  };
}
