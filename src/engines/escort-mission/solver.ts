import { bfsSolve, SolverResult } from '../bfs-solver';
import type { EscortPuzzle, EscortMove } from './generator';

interface EscortSolverState {
  leftA: number;
  leftB: number;
  boatPosition: 'left' | 'right';
}

export function solveEscort(puzzle: EscortPuzzle): SolverResult<EscortMove> {
  const totalA = puzzle.groupA.count;
  const totalB = puzzle.groupB.count;

  const initialState: EscortSolverState = {
    leftA: totalA,
    leftB: totalB,
    boatPosition: 'left',
  };

  return bfsSolve<EscortSolverState, EscortMove>({
    initialState,
    isGoal: (state) => state.leftA === 0 && state.leftB === 0,
    isFailed: (state) => {
      const rightA = totalA - state.leftA;
      const rightB = totalB - state.leftB;
      // B must never outnumber A on either bank (if A > 0 on that bank)
      if (state.leftA > 0 && state.leftB > state.leftA) return true;
      if (rightA > 0 && rightB > rightA) return true;
      return false;
    },
    getMoves: (state) => {
      const moves: EscortMove[] = [];
      const cap = puzzle.boatCapacity;

      if (state.boatPosition === 'left') {
        for (let a = 0; a <= Math.min(state.leftA, cap); a++) {
          for (let b = 0; b <= Math.min(state.leftB, cap - a); b++) {
            if (a + b === 0 || a + b > cap) continue;
            if (puzzle.driverRequired && a === 0) continue;
            moves.push({ groupA: a, groupB: b, direction: 'left-to-right' });
          }
        }
      } else {
        const rightA = totalA - state.leftA;
        const rightB = totalB - state.leftB;
        for (let a = 0; a <= Math.min(rightA, cap); a++) {
          for (let b = 0; b <= Math.min(rightB, cap - a); b++) {
            if (a + b === 0 || a + b > cap) continue;
            if (puzzle.driverRequired && a === 0) continue;
            moves.push({ groupA: a, groupB: b, direction: 'right-to-left' });
          }
        }
      }
      return moves;
    },
    applyMove: (state, move) => {
      if (move.direction === 'left-to-right') {
        return {
          leftA: state.leftA - move.groupA,
          leftB: state.leftB - move.groupB,
          boatPosition: 'right' as const,
        };
      } else {
        return {
          leftA: state.leftA + move.groupA,
          leftB: state.leftB + move.groupB,
          boatPosition: 'left' as const,
        };
      }
    },
    serialize: (state) => `${state.leftA},${state.leftB},${state.boatPosition}`,
    maxDepth: 50,
  });
}
