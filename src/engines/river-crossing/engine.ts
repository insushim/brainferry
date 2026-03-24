import type { RiverCrossingPuzzle, RiverMove } from './generator';

export interface RiverState {
  leftBank: string[];
  rightBank: string[];
  island: string[]; // for island variant
  boatPosition: 'left' | 'right' | 'island-left' | 'island-right';
  boatContents: string[];
  boat1Pos?: 'left' | 'right'; // for two-boats
  boat2Pos?: 'left' | 'right'; // for two-boats
  activeBoat?: number; // 0 or 1 for two-boats
  steps: number;
  moveHistory: RiverMove[];
  isComplete: boolean;
  isFailed: boolean;
  failReason?: string;
}

export function createInitialState(puzzle: RiverCrossingPuzzle): RiverState {
  const state: RiverState = {
    leftBank: puzzle.entities.map(e => e.id),
    rightBank: [],
    island: [],
    boatPosition: 'left',
    boatContents: [],
    steps: 0,
    moveHistory: [],
    isComplete: false,
    isFailed: false,
  };

  if (puzzle.variant === 'two-boats') {
    state.boat1Pos = 'left';
    state.boat2Pos = 'right';
    state.activeBoat = 0;
  }

  return state;
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
  let bank: string[];
  if (state.boatPosition === 'left') {
    bank = state.leftBank;
  } else if (state.boatPosition === 'right') {
    bank = state.rightBank;
  } else if (state.boatPosition === 'island-left' || state.boatPosition === 'island-right') {
    bank = state.island;
  } else {
    bank = state.leftBank;
  }

  if (!bank.includes(entityId)) {
    return { error: '해당 엔티티가 현재 위치에 없습니다.' };
  }
  if (state.boatContents.includes(entityId)) {
    return { error: '이미 보트에 탑승해 있습니다.' };
  }

  const newBank = bank.filter(e => e !== entityId);
  const newState = { ...state, boatContents: [...state.boatContents, entityId] };

  if (state.boatPosition === 'left') {
    newState.leftBank = newBank;
  } else if (state.boatPosition === 'right') {
    newState.rightBank = newBank;
  } else {
    newState.island = newBank;
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
  } else if (state.boatPosition === 'right') {
    newState.rightBank = [...state.rightBank, entityId];
  } else {
    newState.island = [...state.island, entityId];
  }

  return newState;
}

function getBoatCapacityForMove(puzzle: RiverCrossingPuzzle, boatIndex?: number): number {
  if (puzzle.variant === 'two-boats' && boatIndex === 1) {
    return puzzle.boat2Capacity ?? 1;
  }
  return puzzle.boatCapacity;
}

export function sail(
  state: RiverState,
  puzzle: RiverCrossingPuzzle,
  options?: { toIsland?: boolean; fromIsland?: boolean; boatIndex?: number }
): RiverState | { error: string } {
  if (state.boatContents.length === 0) {
    return { error: '보트에 아무도 없습니다.' };
  }

  const ownerId = puzzle.entities.find(e => e.name === puzzle.ownerName)?.id ?? puzzle.ownerName;
  if (!state.boatContents.includes(ownerId)) {
    return { error: `${puzzle.ownerName}이(가) 보트에 있어야 이동할 수 있습니다.` };
  }

  // Capacity check
  if (puzzle.variant === 'weight-limit') {
    let totalWeight = 0;
    for (const id of state.boatContents) {
      if (id === ownerId) continue;
      const entity = puzzle.entities.find(e => e.id === id);
      totalWeight += entity?.weight ?? 1;
    }
    if (totalWeight > (puzzle.boatMaxWeight ?? 3)) {
      return { error: `보트 무게 제한(${puzzle.boatMaxWeight})을 초과합니다! 현재 무게: ${totalWeight}` };
    }
  } else {
    const cap = getBoatCapacityForMove(puzzle, options?.boatIndex);
    if (state.boatContents.length > cap + 1) {
      return { error: `보트는 ${puzzle.ownerName} 외에 ${cap}명만 태울 수 있습니다.` };
    }
  }

  // One-way check
  if (puzzle.variant === 'one-way') {
    const direction = state.boatPosition === 'left' ? 'left-to-right' : 'right-to-left';
    if (direction === 'right-to-left') {
      for (const id of state.boatContents) {
        if (id === ownerId) continue;
        const entity = puzzle.entities.find(e => e.id === id);
        if (entity?.oneWay) {
          return { error: `${entity.emoji}${entity.name}은(는) 일방통행입니다! 돌아갈 수 없습니다.` };
        }
      }
    }
  }

  // Determine direction and destination
  let direction: 'left-to-right' | 'right-to-left';
  const newLeft = [...state.leftBank];
  const newRight = [...state.rightBank];
  const newIsland = [...state.island];
  let newBoatPos: RiverState['boatPosition'];

  if (puzzle.variant === 'island') {
    if (state.boatPosition === 'left' && options?.toIsland) {
      // left -> island
      for (const e of state.boatContents) newIsland.push(e);
      direction = 'left-to-right';
      newBoatPos = 'island-left';
    } else if ((state.boatPosition === 'island-left' || state.boatPosition === 'island-right') && options?.fromIsland) {
      if (options.toIsland === false || state.boatPosition === 'island-left') {
        // island -> right
        for (const e of state.boatContents) newRight.push(e);
        direction = 'left-to-right';
        newBoatPos = 'right';
      } else {
        // island -> left
        for (const e of state.boatContents) newLeft.push(e);
        direction = 'right-to-left';
        newBoatPos = 'left';
      }
    } else if (state.boatPosition === 'right' && options?.toIsland) {
      // right -> island
      for (const e of state.boatContents) newIsland.push(e);
      direction = 'right-to-left';
      newBoatPos = 'island-right';
    } else {
      direction = state.boatPosition === 'left' ? 'left-to-right' : 'right-to-left';
      newBoatPos = state.boatPosition === 'left' ? 'right' : 'left';
      for (const e of state.boatContents) {
        if (newBoatPos === 'right') newRight.push(e);
        else newLeft.push(e);
      }
    }
  } else {
    direction = state.boatPosition === 'left' ? 'left-to-right' : 'right-to-left';
    newBoatPos = state.boatPosition === 'left' ? 'right' : 'left';
    for (const e of state.boatContents) {
      if (newBoatPos === 'right') newRight.push(e);
      else newLeft.push(e);
    }
  }

  const move: RiverMove = {
    entities: [...state.boatContents],
    direction,
    boatIndex: options?.boatIndex,
    toIsland: options?.toIsland,
    fromIsland: options?.fromIsland,
  };

  // Check violations on all locations
  const leftOwnerPresent = newLeft.includes(ownerId);
  const rightOwnerPresent = newRight.includes(ownerId);
  const islandOwnerPresent = newIsland.includes(ownerId);

  const leftViolation = newLeft.length > 0 ? checkViolation(newLeft, puzzle.constraints, leftOwnerPresent) : { violated: false };
  const rightViolation = newRight.length > 0 ? checkViolation(newRight, puzzle.constraints, rightOwnerPresent) : { violated: false };
  const islandViolation = newIsland.length > 0 ? checkViolation(newIsland, puzzle.constraints, islandOwnerPresent) : { violated: false };

  const isComplete = newLeft.length === 0 && newIsland.length === 0;

  if (leftViolation.violated || rightViolation.violated || islandViolation.violated) {
    const reason = leftViolation.violated ? leftViolation.description
      : rightViolation.violated ? rightViolation.description
        : islandViolation.description;
    return {
      leftBank: newLeft,
      rightBank: newRight,
      island: newIsland,
      boatPosition: newBoatPos,
      boatContents: [],
      boat1Pos: state.boat1Pos,
      boat2Pos: state.boat2Pos,
      activeBoat: state.activeBoat,
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
    island: newIsland,
    boatPosition: newBoatPos,
    boatContents: [],
    boat1Pos: puzzle.variant === 'two-boats'
      ? (options?.boatIndex === 0 ? (newBoatPos as 'left' | 'right') : state.boat1Pos)
      : undefined,
    boat2Pos: puzzle.variant === 'two-boats'
      ? (options?.boatIndex === 1 ? (newBoatPos as 'left' | 'right') : state.boat2Pos)
      : undefined,
    activeBoat: state.activeBoat,
    steps: state.steps + 1,
    moveHistory: [...state.moveHistory, move],
    isComplete: isComplete && !leftViolation.violated && !rightViolation.violated && !islandViolation.violated,
    isFailed: false,
  };
}

export function undo(state: RiverState): RiverState {
  if (state.moveHistory.length === 0) return state;

  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  const newLeft = [...state.leftBank];
  const newRight = [...state.rightBank];
  const newIsland = [...state.island];

  if (lastMove.toIsland) {
    // Was going to island - reverse
    if (lastMove.direction === 'left-to-right') {
      for (const e of lastMove.entities) {
        const idx = newIsland.indexOf(e);
        if (idx >= 0) newIsland.splice(idx, 1);
        newLeft.push(e);
      }
    } else {
      for (const e of lastMove.entities) {
        const idx = newIsland.indexOf(e);
        if (idx >= 0) newIsland.splice(idx, 1);
        newRight.push(e);
      }
    }
  } else if (lastMove.fromIsland) {
    if (lastMove.direction === 'left-to-right') {
      for (const e of lastMove.entities) {
        const idx = newRight.indexOf(e);
        if (idx >= 0) newRight.splice(idx, 1);
        newIsland.push(e);
      }
    } else {
      for (const e of lastMove.entities) {
        const idx = newLeft.indexOf(e);
        if (idx >= 0) newLeft.splice(idx, 1);
        newIsland.push(e);
      }
    }
  } else if (lastMove.direction === 'left-to-right') {
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

  // Determine previous boat position
  let prevBoatPos: RiverState['boatPosition'];
  if (state.moveHistory.length <= 1) {
    prevBoatPos = 'left';
  } else {
    // Infer from the reversed move
    if (lastMove.toIsland && lastMove.direction === 'left-to-right') prevBoatPos = 'left';
    else if (lastMove.toIsland && lastMove.direction === 'right-to-left') prevBoatPos = 'right';
    else if (lastMove.fromIsland && lastMove.direction === 'left-to-right') prevBoatPos = 'island-left';
    else if (lastMove.fromIsland && lastMove.direction === 'right-to-left') prevBoatPos = 'island-right';
    else if (lastMove.direction === 'left-to-right') prevBoatPos = 'left';
    else prevBoatPos = 'right';
  }

  return {
    leftBank: newLeft,
    rightBank: newRight,
    island: newIsland,
    boatPosition: prevBoatPos,
    boatContents: [],
    boat1Pos: state.boat1Pos,
    boat2Pos: state.boat2Pos,
    activeBoat: state.activeBoat,
    steps: state.steps - 1,
    moveHistory: state.moveHistory.slice(0, -1),
    isComplete: false,
    isFailed: false,
  };
}
