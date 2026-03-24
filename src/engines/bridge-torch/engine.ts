import type { BridgeTorchPuzzle, BridgeMove } from './generator';

export interface BridgeTorchState {
  leftSide: string[];
  rightSide: string[];
  torchPosition: 'left' | 'right';
  elapsedTime: number;
  timeLimit: number;
  steps: number;
  moveHistory: BridgeMove[];
  isComplete: boolean;
  isFailed: boolean;
  failReason?: string;
}

export function createInitialState(puzzle: BridgeTorchPuzzle): BridgeTorchState {
  return {
    leftSide: puzzle.people.map(p => p.id),
    rightSide: [],
    torchPosition: 'left',
    elapsedTime: 0,
    timeLimit: puzzle.timeLimit,
    steps: 0,
    moveHistory: [],
    isComplete: false,
    isFailed: false,
  };
}

export function applyMove(
  state: BridgeTorchState,
  move: BridgeMove,
  puzzle: BridgeTorchPuzzle
): BridgeTorchState | { error: string } {
  if (move.people.length === 0) {
    return { error: '아무도 선택하지 않았습니다.' };
  }

  if (move.direction === 'forward' && state.torchPosition !== 'left') {
    return { error: '횃불이 왼쪽에 있어야 건널 수 있습니다.' };
  }
  if (move.direction === 'back' && state.torchPosition !== 'right') {
    return { error: '횃불이 오른쪽에 있어야 돌아올 수 있습니다.' };
  }

  if (move.direction === 'forward' && move.people.length > puzzle.bridgeCapacity) {
    return { error: `다리에는 최대 ${puzzle.bridgeCapacity}명까지 건널 수 있습니다.` };
  }
  if (move.direction === 'back' && move.people.length > 1) {
    return { error: '돌아올 때는 1명만 가능합니다.' };
  }

  const source = move.direction === 'forward' ? state.leftSide : state.rightSide;
  for (const id of move.people) {
    if (!source.includes(id)) {
      return { error: `${id}이(가) 현재 위치에 없습니다.` };
    }
  }

  const speedMap = new Map(puzzle.people.map(p => [p.id, p.speed]));
  const time = Math.max(...move.people.map(id => speedMap.get(id)!));
  const newElapsed = state.elapsedTime + time;

  const newLeft = [...state.leftSide];
  const newRight = [...state.rightSide];

  if (move.direction === 'forward') {
    for (const id of move.people) {
      newLeft.splice(newLeft.indexOf(id), 1);
      newRight.push(id);
    }
  } else {
    for (const id of move.people) {
      newRight.splice(newRight.indexOf(id), 1);
      newLeft.push(id);
    }
  }

  const isComplete = newLeft.length === 0 && newElapsed <= puzzle.timeLimit;
  const isFailed = newElapsed > puzzle.timeLimit;

  return {
    leftSide: newLeft,
    rightSide: newRight,
    torchPosition: move.direction === 'forward' ? 'right' : 'left',
    elapsedTime: newElapsed,
    timeLimit: puzzle.timeLimit,
    steps: state.steps + 1,
    moveHistory: [...state.moveHistory, { ...move, time }],
    isComplete,
    isFailed,
    failReason: isFailed ? `시간 초과! (${newElapsed}분 > ${puzzle.timeLimit}분)` : undefined,
  };
}

export function undo(state: BridgeTorchState): BridgeTorchState {
  if (state.moveHistory.length === 0) return state;

  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  const newLeft = [...state.leftSide];
  const newRight = [...state.rightSide];

  if (lastMove.direction === 'forward') {
    for (const id of lastMove.people) {
      newRight.splice(newRight.indexOf(id), 1);
      newLeft.push(id);
    }
  } else {
    for (const id of lastMove.people) {
      newLeft.splice(newLeft.indexOf(id), 1);
      newRight.push(id);
    }
  }

  return {
    leftSide: newLeft,
    rightSide: newRight,
    torchPosition: lastMove.direction === 'forward' ? 'left' : 'right',
    elapsedTime: state.elapsedTime - lastMove.time,
    timeLimit: state.timeLimit,
    steps: state.steps - 1,
    moveHistory: state.moveHistory.slice(0, -1),
    isComplete: false,
    isFailed: false,
  };
}
