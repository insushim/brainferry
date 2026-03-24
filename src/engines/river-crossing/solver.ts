import { bfsSolve, SolverResult } from '../bfs-solver';
import type { RiverCrossingPuzzle, RiverMove } from './generator';

interface RiverSolverState {
  leftBank: string[];
  rightBank: string[];
  boatPosition: 'left' | 'right';
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

export function solveRiverCrossing(puzzle: RiverCrossingPuzzle): SolverResult<RiverMove> {
  const allEntityIds = puzzle.entities.map(e => e.id);
  const ownerName = puzzle.entities.find(e => e.name === puzzle.ownerName)?.id ?? puzzle.ownerName;
  const constraintIds = puzzle.constraints.map(c => ({
    predator: c.predator,
    prey: c.prey,
  }));

  const initialState: RiverSolverState = {
    leftBank: [...allEntityIds].sort(),
    rightBank: [],
    boatPosition: 'left',
  };

  return bfsSolve<RiverSolverState, RiverMove>({
    initialState,
    isGoal: (state) => state.leftBank.length === 0,
    isFailed: (state) => {
      if (checkConstraintViolation(state.leftBank, constraintIds, ownerName)) return true;
      if (checkConstraintViolation(state.rightBank, constraintIds, ownerName)) return true;
      return false;
    },
    getMoves: (state) => {
      const moves: RiverMove[] = [];
      if (state.boatPosition === 'left') {
        const bank = state.leftBank;
        // Owner must be on boat (owner drives)
        if (!bank.includes(ownerName)) return moves;
        const others = bank.filter(e => e !== ownerName);
        const combos = getCombinations(others, 0, puzzle.boatCapacity);
        for (const combo of combos) {
          moves.push({ entities: [ownerName, ...combo], direction: 'left-to-right' });
        }
      } else {
        const bank = state.rightBank;
        if (!bank.includes(ownerName)) return moves;
        const others = bank.filter(e => e !== ownerName);
        const combos = getCombinations(others, 0, puzzle.boatCapacity);
        for (const combo of combos) {
          moves.push({ entities: [ownerName, ...combo], direction: 'right-to-left' });
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
      };
    },
    serialize: (state) =>
      `${state.leftBank.join(',')};${state.rightBank.join(',')};${state.boatPosition}`,
    maxDepth: 50,
  });
}
