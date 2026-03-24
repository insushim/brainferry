import type { RiverCrossingPuzzle, RiverMove } from './generator';

export interface RiverState {
  leftBank: string[];
  rightBank: string[];
  boatPosition: 'left' | 'right';
  boatContents: string[];
  steps: number;
  moveHistory: RiverMove[];
  isComplete: boolean;
  isFailed: boolean;
  failReason?: string;
}

export function createInitialState(puzzle: RiverCrossingPuzzle): RiverState {
  return {
    leftBank: puzzle.entities.map(e => e.id),
    rightBank: [],
    boatPosition: 'left',
    boatContents: [],
    steps: 0,
    moveHistory: [],
    isComplete: false,
    isFailed: false,
  };
}

export function checkViolation(
  entities: string[],
  constraints: { predator: string; prey: string; description: string }[],
  ownerPresent: boolean
): { violated: boolean; description?: string } {
  for (const c of constraints) {
    if (entities.includes(c.predator) && entities.includes(c.prey) && !ownerPresent) {
      return { violated: true, description: c.description };
    }
  }
  return { violated: false };
}

export function boardEntity(
  state: RiverState,
  entityId: string
): RiverState | { error: string } {
  const bank = state.boatPosition === 'left' ? state.leftBank : state.rightBank;
  if (!bank.includes(entityId)) {
    return { error: '해당 엔티티가 현재 강변에 없습니다.' };
  }
  if (state.boatContents.includes(entityId)) {
    return { error: '이미 보트에 탑승해 있습니다.' };
  }
  // boatCapacity check is done externally since we don't store capacity here
  // but we can check boatContents length vs a reasonable max
  const newBank = bank.filter(e => e !== entityId);
  const newState = { ...state, boatContents: [...state.boatContents, entityId] };
  if (state.boatPosition === 'left') {
    newState.leftBank = newBank;
  } else {
    newState.rightBank = newBank;
  }
  return newState;
}

export function unboardEntity(
  state: RiverState,
  entityId: string
): RiverState | { error: string } {
  if (!state.boatContents.includes(entityId)) {
    return { error: '해당 엔티티가 보트에 없습니다.' };
  }
  const newContents = state.boatContents.filter(e => e !== entityId);
  const newState = { ...state, boatContents: newContents };
  if (state.boatPosition === 'left') {
    newState.leftBank = [...state.leftBank, entityId];
  } else {
    newState.rightBank = [...state.rightBank, entityId];
  }
  return newState;
}

export function sail(
  state: RiverState,
  puzzle: RiverCrossingPuzzle
): RiverState | { error: string } {
  if (state.boatContents.length === 0) {
    return { error: '보트에 아무도 없습니다.' };
  }
  const ownerId = puzzle.entities.find(e => e.name === puzzle.ownerName)?.id ?? puzzle.ownerName;
  if (!state.boatContents.includes(ownerId)) {
    return { error: `${puzzle.ownerName}이(가) 보트에 있어야 이동할 수 있습니다.` };
  }
  if (state.boatContents.length > puzzle.boatCapacity + 1) {
    return { error: `보트는 ${puzzle.ownerName} 외에 ${puzzle.boatCapacity}명만 태울 수 있습니다.` };
  }

  const direction = state.boatPosition === 'left' ? 'left-to-right' as const : 'right-to-left' as const;
  const newBoatPos = state.boatPosition === 'left' ? 'right' as const : 'left' as const;

  // Unload passengers to destination bank
  const newLeft = [...state.leftBank];
  const newRight = [...state.rightBank];
  for (const e of state.boatContents) {
    if (newBoatPos === 'right') {
      newRight.push(e);
    } else {
      newLeft.push(e);
    }
  }

  const move: RiverMove = { entities: [...state.boatContents], direction };

  // Check violations on both banks after move
  const leftOwnerPresent = newLeft.includes(ownerId);
  const rightOwnerPresent = newRight.includes(ownerId);
  const leftViolation = checkViolation(newLeft, puzzle.constraints, leftOwnerPresent);
  const rightViolation = checkViolation(newRight, puzzle.constraints, rightOwnerPresent);

  const isComplete = newLeft.length === 0;

  if (leftViolation.violated || rightViolation.violated) {
    const reason = leftViolation.violated ? leftViolation.description : rightViolation.description;
    return {
      leftBank: newLeft,
      rightBank: newRight,
      boatPosition: newBoatPos,
      boatContents: [],
      steps: state.steps + 1,
      moveHistory: [...state.moveHistory, move],
      isComplete: false,
      isFailed: true,
      failReason: reason,
    };
  }

  return {
    leftBank: newLeft,
    rightBank: newRight,
    boatPosition: newBoatPos,
    boatContents: [],
    steps: state.steps + 1,
    moveHistory: [...state.moveHistory, move],
    isComplete,
    isFailed: false,
  };
}

export function undo(state: RiverState): RiverState {
  if (state.moveHistory.length === 0) return state;

  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  const newLeft = [...state.leftBank];
  const newRight = [...state.rightBank];

  // Reverse the last move
  if (lastMove.direction === 'left-to-right') {
    for (const e of lastMove.entities) {
      const idx = newRight.indexOf(e);
      if (idx >= 0) newRight.splice(idx, 1);
      newLeft.push(e);
    }
  } else {
    for (const e of lastMove.entities) {
      const idx = newLeft.indexOf(e);
      if (idx >= 0) newLeft.splice(idx, 1);
      newRight.push(e);
    }
  }

  return {
    leftBank: newLeft,
    rightBank: newRight,
    boatPosition: lastMove.direction === 'left-to-right' ? 'left' : 'right',
    boatContents: [],
    steps: state.steps - 1,
    moveHistory: state.moveHistory.slice(0, -1),
    isComplete: false,
    isFailed: false,
  };
}
