import { bfsSolve, SolverResult } from '../bfs-solver';
import type { BodyguardPuzzle, BodyguardMove } from './generator';

interface BodyguardSolverState {
  leftSide: Set<string>; // all entity ids on left
  boatPosition: 'left' | 'right';
}

interface SerializableState {
  left: string[];
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

function isStateValid(
  bankIds: Set<string>,
  pairs: BodyguardPuzzle['pairs']
): boolean {
  // A charge cannot be with another protector without their own protector
  for (const pair of pairs) {
    const chargeId = pair.charge.id;
    const protectorId = pair.protector.id;

    if (!bankIds.has(chargeId)) continue; // charge not on this bank
    if (bankIds.has(protectorId)) continue; // protector is present, safe

    // Charge is alone (without own protector).
    // If any OTHER protector is present, it's a violation.
    for (const otherPair of pairs) {
      if (otherPair === pair) continue;
      if (bankIds.has(otherPair.protector.id)) {
        return false;
      }
    }
  }
  return true;
}

export function solveBodyguard(puzzle: BodyguardPuzzle): SolverResult<BodyguardMove> {
  const allIds: string[] = [];
  for (const pair of puzzle.pairs) {
    allIds.push(pair.protector.id, pair.charge.id);
  }

  const driverSet = puzzle.driverIds ? new Set(puzzle.driverIds) : null;

  const initialLeft = new Set(allIds);

  return bfsSolve<SerializableState, BodyguardMove>({
    initialState: {
      left: [...initialLeft].sort(),
      boatPosition: 'left',
    },
    isGoal: (state) => state.left.length === 0,
    isFailed: (state) => {
      const leftSet = new Set(state.left);
      const rightSet = new Set(allIds.filter(id => !leftSet.has(id)));
      if (leftSet.size > 0 && !isStateValid(leftSet, puzzle.pairs)) return true;
      if (rightSet.size > 0 && !isStateValid(rightSet, puzzle.pairs)) return true;
      return false;
    },
    getMoves: (state) => {
      const moves: BodyguardMove[] = [];
      const leftSet = new Set(state.left);
      const rightIds = allIds.filter(id => !leftSet.has(id));

      if (state.boatPosition === 'left') {
        const bankArr = [...leftSet].sort();
        const combos = getCombinations(bankArr, 1, puzzle.boatCapacity);
        for (const combo of combos) {
          if (driverSet && !combo.some(id => driverSet.has(id))) continue;
          moves.push({ passengers: combo, direction: 'left-to-right' });
        }
      } else {
        const combos = getCombinations(rightIds.sort(), 1, puzzle.boatCapacity);
        for (const combo of combos) {
          if (driverSet && !combo.some(id => driverSet.has(id))) continue;
          moves.push({ passengers: combo, direction: 'right-to-left' });
        }
      }
      return moves;
    },
    applyMove: (state, move) => {
      const leftSet = new Set(state.left);
      if (move.direction === 'left-to-right') {
        for (const id of move.passengers) leftSet.delete(id);
      } else {
        for (const id of move.passengers) leftSet.add(id);
      }
      return {
        left: [...leftSet].sort(),
        boatPosition: move.direction === 'left-to-right' ? 'right' as const : 'left' as const,
      };
    },
    serialize: (state) => `${state.left.join(',')};${state.boatPosition}`,
    maxDepth: 50,
  });
}
