import { bfsSolve, SolverResult } from '../bfs-solver';
import type { RiverCrossingPuzzle, RiverMove } from './generator';

interface RiverSolverState {
  leftBank: string[];
  rightBank: string[];
  island?: string[]; // for island variant
  boatPosition: 'left' | 'right' | 'island-left' | 'island-right';
  crossedOnce: string[]; // for one-way variant: entities that crossed to right
}

function getCombinations(arr: string[], min: number, max: number): string[][] {
  const results: string[][] = [];
  const generate = (start: number, current: string[]) => {
    if (current.length >= min) results.push([...current]);
    if (current.length >= max) return;
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      generate(i + 1, current);
      current.pop();
    }
  };
  generate(0, []);
  return results;
}

function checkConstraintViolation(
  entities: string[],
  constraints: { predator: string; prey: string }[],
  ownerName?: string
): boolean {
  for (const c of constraints) {
    if (entities.includes(c.predator) && entities.includes(c.prey)) {
      if (!ownerName || !entities.includes(ownerName)) {
        return true;
      }
    }
  }
  return false;
}

function getWeightOfGroup(
  entityIds: string[],
  puzzle: RiverCrossingPuzzle,
  ownerId: string
): number {
  let total = 0;
  for (const id of entityIds) {
    if (id === ownerId) continue; // owner has no weight
    const entity = puzzle.entities.find(e => e.id === id);
    total += entity?.weight ?? 1;
  }
  return total;
}

function getValidCombos(
  bank: string[],
  ownerId: string,
  puzzle: RiverCrossingPuzzle,
  boatIdx?: number
): string[][] {
  if (!bank.includes(ownerId)) return [];
  const others = bank.filter(e => e !== ownerId);

  if (puzzle.variant === 'weight-limit') {
    const maxWeight = puzzle.boatMaxWeight ?? 3;
    const combos: string[][] = [];
    // Generate all subsets of others, check weight
    const generate = (start: number, current: string[], currentWeight: number) => {
      combos.push([ownerId, ...current]);
      for (let i = start; i < others.length; i++) {
        const entity = puzzle.entities.find(e => e.id === others[i]);
        const w = entity?.weight ?? 1;
        if (currentWeight + w <= maxWeight) {
          current.push(others[i]);
          generate(i + 1, current, currentWeight + w);
          current.pop();
        }
      }
    };
    generate(0, [], 0);
    return combos;
  }

  const cap = (boatIdx === 1) ? (puzzle.boat2Capacity ?? 1) : puzzle.boatCapacity;
  const combos = getCombinations(others, 0, cap);
  return combos.map(combo => [ownerId, ...combo]);
}

export function solveRiverCrossing(puzzle: RiverCrossingPuzzle): SolverResult<RiverMove> {
  const allEntityIds = puzzle.entities.map(e => e.id);
  const ownerId = puzzle.entities.find(e => e.name === puzzle.ownerName)?.id ?? puzzle.ownerName;
  const constraintIds = puzzle.constraints.map(c => ({
    predator: c.predator,
    prey: c.prey,
  }));

  const oneWayIds = new Set(
    puzzle.entities.filter(e => e.oneWay).map(e => e.id)
  );

  if (puzzle.variant === 'island') {
    return solveIslandVariant(puzzle, allEntityIds, ownerId, constraintIds);
  }

  if (puzzle.variant === 'two-boats') {
    return solveTwoBoatsVariant(puzzle, allEntityIds, ownerId, constraintIds);
  }

  // Basic, weight-limit, one-way use similar BFS with adjustments
  const initialState: RiverSolverState = {
    leftBank: [...allEntityIds].sort(),
    rightBank: [],
    boatPosition: 'left',
    crossedOnce: [],
  };

  return bfsSolve<RiverSolverState, RiverMove>({
    initialState,
    isGoal: (state) => state.leftBank.length === 0,
    isFailed: (state) => {
      if (checkConstraintViolation(state.leftBank, constraintIds, ownerId)) return true;
      if (checkConstraintViolation(state.rightBank, constraintIds, ownerId)) return true;
      return false;
    },
    getMoves: (state) => {
      const moves: RiverMove[] = [];
      if (state.boatPosition === 'left') {
        const combos = getValidCombos(state.leftBank, ownerId, puzzle);
        for (const combo of combos) {
          moves.push({ entities: combo, direction: 'left-to-right' });
        }
      } else {
        // For one-way: filter out entities that can't go back
        const availableForReturn = puzzle.variant === 'one-way'
          ? state.rightBank.filter(id => !oneWayIds.has(id) || id === ownerId)
          : state.rightBank;
        const combos = getValidCombos(availableForReturn, ownerId, puzzle);
        for (const combo of combos) {
          moves.push({ entities: combo, direction: 'right-to-left' });
        }
      }
      return moves;
    },
    applyMove: (state, move) => {
      const newLeft = [...state.leftBank];
      const newRight = [...state.rightBank];
      if (move.direction === 'left-to-right') {
        for (const e of move.entities) {
          newLeft.splice(newLeft.indexOf(e), 1);
          newRight.push(e);
        }
      } else {
        for (const e of move.entities) {
          newRight.splice(newRight.indexOf(e), 1);
          newLeft.push(e);
        }
      }
      return {
        leftBank: newLeft.sort(),
        rightBank: newRight.sort(),
        boatPosition: move.direction === 'left-to-right' ? 'right' as const : 'left' as const,
        crossedOnce: move.direction === 'left-to-right'
          ? [...new Set([...state.crossedOnce, ...move.entities.filter(id => oneWayIds.has(id))])]
          : state.crossedOnce,
      };
    },
    serialize: (state) =>
      `${state.leftBank.join(',')};${state.rightBank.join(',')};${state.boatPosition}`,
    maxDepth: 50,
  });
}

function solveTwoBoatsVariant(
  puzzle: RiverCrossingPuzzle,
  allEntityIds: string[],
  ownerId: string,
  constraintIds: { predator: string; prey: string }[]
): SolverResult<RiverMove> {
  interface TwoBoatState {
    leftBank: string[];
    rightBank: string[];
    boat1Pos: 'left' | 'right';
    boat2Pos: 'left' | 'right';
  }

  const initialState: TwoBoatState = {
    leftBank: [...allEntityIds].sort(),
    rightBank: [],
    boat1Pos: 'left',
    boat2Pos: 'right',
  };

  return bfsSolve<TwoBoatState, RiverMove>({
    initialState,
    isGoal: (state) => state.leftBank.length === 0,
    isFailed: (state) => {
      if (checkConstraintViolation(state.leftBank, constraintIds, ownerId)) return true;
      if (checkConstraintViolation(state.rightBank, constraintIds, ownerId)) return true;
      return false;
    },
    getMoves: (state) => {
      const moves: RiverMove[] = [];
      const ownerOnLeft = state.leftBank.includes(ownerId);
      const ownerOnRight = state.rightBank.includes(ownerId);

      // Boat 1
      if (ownerOnLeft && state.boat1Pos === 'left') {
        const combos = getValidCombos(state.leftBank, ownerId, puzzle, 0);
        for (const combo of combos) {
          moves.push({ entities: combo, direction: 'left-to-right', boatIndex: 0 });
        }
      }
      if (ownerOnRight && state.boat1Pos === 'right') {
        const combos = getValidCombos(state.rightBank, ownerId, puzzle, 0);
        for (const combo of combos) {
          moves.push({ entities: combo, direction: 'right-to-left', boatIndex: 0 });
        }
      }

      // Boat 2
      if (ownerOnLeft && state.boat2Pos === 'left') {
        const combos = getValidCombos(state.leftBank, ownerId, puzzle, 1);
        for (const combo of combos) {
          moves.push({ entities: combo, direction: 'left-to-right', boatIndex: 1 });
        }
      }
      if (ownerOnRight && state.boat2Pos === 'right') {
        const combos = getValidCombos(state.rightBank, ownerId, puzzle, 1);
        for (const combo of combos) {
          moves.push({ entities: combo, direction: 'right-to-left', boatIndex: 1 });
        }
      }

      return moves;
    },
    applyMove: (state, move) => {
      const newLeft = [...state.leftBank];
      const newRight = [...state.rightBank];
      if (move.direction === 'left-to-right') {
        for (const e of move.entities) {
          newLeft.splice(newLeft.indexOf(e), 1);
          newRight.push(e);
        }
      } else {
        for (const e of move.entities) {
          newRight.splice(newRight.indexOf(e), 1);
          newLeft.push(e);
        }
      }
      const boatIdx = move.boatIndex ?? 0;
      const newBoat1 = boatIdx === 0
        ? (move.direction === 'left-to-right' ? 'right' as const : 'left' as const)
        : state.boat1Pos;
      const newBoat2 = boatIdx === 1
        ? (move.direction === 'left-to-right' ? 'right' as const : 'left' as const)
        : state.boat2Pos;
      return {
        leftBank: newLeft.sort(),
        rightBank: newRight.sort(),
        boat1Pos: newBoat1,
        boat2Pos: newBoat2,
      };
    },
    serialize: (state) =>
      `${state.leftBank.join(',')};${state.rightBank.join(',')};${state.boat1Pos};${state.boat2Pos}`,
    maxDepth: 50,
  });
}

function solveIslandVariant(
  puzzle: RiverCrossingPuzzle,
  allEntityIds: string[],
  ownerId: string,
  constraintIds: { predator: string; prey: string }[]
): SolverResult<RiverMove> {
  interface IslandState {
    leftBank: string[];
    island: string[];
    rightBank: string[];
    boatPosition: 'left' | 'island-left' | 'island-right' | 'right';
  }

  const initialState: IslandState = {
    leftBank: [...allEntityIds].sort(),
    island: [],
    rightBank: [],
    boatPosition: 'left',
  };

  return bfsSolve<IslandState, RiverMove>({
    initialState,
    isGoal: (state) => state.leftBank.length === 0 && state.island.length === 0,
    isFailed: (state) => {
      if (checkConstraintViolation(state.leftBank, constraintIds, ownerId)) return true;
      if (checkConstraintViolation(state.island, constraintIds, ownerId)) return true;
      if (checkConstraintViolation(state.rightBank, constraintIds, ownerId)) return true;
      return false;
    },
    getMoves: (state) => {
      const moves: RiverMove[] = [];

      if (state.boatPosition === 'left' && state.leftBank.includes(ownerId)) {
        // left -> island
        const combos = getValidCombos(state.leftBank, ownerId, puzzle);
        for (const combo of combos) {
          moves.push({ entities: combo, direction: 'left-to-right', toIsland: true });
        }
      } else if (state.boatPosition === 'island-left') {
        // island -> left (return trip on left river)
        if (state.island.includes(ownerId)) {
          const combos = getValidCombos(state.island, ownerId, puzzle);
          for (const combo of combos) {
            moves.push({ entities: combo, direction: 'right-to-left', fromIsland: true });
          }
        }
        // island -> right (continue to right bank)
        if (state.island.includes(ownerId)) {
          const combos = getValidCombos(state.island, ownerId, puzzle);
          for (const combo of combos) {
            moves.push({ entities: combo, direction: 'left-to-right', fromIsland: true });
          }
        }
      } else if (state.boatPosition === 'island-right') {
        // island -> left (back to island from right side)
        if (state.island.includes(ownerId)) {
          const combos = getValidCombos(state.island, ownerId, puzzle);
          for (const combo of combos) {
            moves.push({ entities: combo, direction: 'right-to-left', fromIsland: true });
          }
        }
        // island -> right
        if (state.island.includes(ownerId)) {
          const combos = getValidCombos(state.island, ownerId, puzzle);
          for (const combo of combos) {
            moves.push({ entities: combo, direction: 'left-to-right', fromIsland: true });
          }
        }
      } else if (state.boatPosition === 'right' && state.rightBank.includes(ownerId)) {
        // right -> island
        const combos = getValidCombos(state.rightBank, ownerId, puzzle);
        for (const combo of combos) {
          moves.push({ entities: combo, direction: 'right-to-left', toIsland: true });
        }
      }

      return moves;
    },
    applyMove: (state, move) => {
      const newLeft = [...state.leftBank];
      const newIsland = [...state.island];
      const newRight = [...state.rightBank];
      let newBoatPos: IslandState['boatPosition'];

      if (state.boatPosition === 'left' && move.toIsland) {
        // left -> island
        for (const e of move.entities) { newLeft.splice(newLeft.indexOf(e), 1); newIsland.push(e); }
        newBoatPos = 'island-left';
      } else if (state.boatPosition === 'island-left' && move.direction === 'right-to-left' && move.fromIsland) {
        // island -> left
        for (const e of move.entities) { newIsland.splice(newIsland.indexOf(e), 1); newLeft.push(e); }
        newBoatPos = 'left';
      } else if (state.boatPosition === 'island-left' && move.direction === 'left-to-right' && move.fromIsland) {
        // island -> right
        for (const e of move.entities) { newIsland.splice(newIsland.indexOf(e), 1); newRight.push(e); }
        newBoatPos = 'right';
      } else if (state.boatPosition === 'island-right' && move.direction === 'right-to-left' && move.fromIsland) {
        // island -> left
        for (const e of move.entities) { newIsland.splice(newIsland.indexOf(e), 1); newLeft.push(e); }
        newBoatPos = 'left';
      } else if (state.boatPosition === 'island-right' && move.direction === 'left-to-right' && move.fromIsland) {
        // island -> right
        for (const e of move.entities) { newIsland.splice(newIsland.indexOf(e), 1); newRight.push(e); }
        newBoatPos = 'right';
      } else if (state.boatPosition === 'right' && move.toIsland) {
        // right -> island
        for (const e of move.entities) { newRight.splice(newRight.indexOf(e), 1); newIsland.push(e); }
        newBoatPos = 'island-right';
      } else {
        // fallback
        newBoatPos = state.boatPosition;
      }

      return {
        leftBank: newLeft.sort(),
        island: newIsland.sort(),
        rightBank: newRight.sort(),
        boatPosition: newBoatPos,
      };
    },
    serialize: (state) =>
      `${state.leftBank.join(',')};${state.island.join(',')};${state.rightBank.join(',')};${state.boatPosition}`,
    maxDepth: 60,
  });
}
