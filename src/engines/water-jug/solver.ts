import { bfsSolve, SolverResult } from '../bfs-solver';
import type { WaterJugPuzzle, JugMove } from './generator';

interface JugSolverState {
  levels: number[]; // current water level for each jug
}

export function solveWaterJug(puzzle: WaterJugPuzzle): SolverResult<JugMove> {
  const jugCount = puzzle.jugs.length;
  const capacities = puzzle.jugs.map(j => j.capacity);

  const initialState: JugSolverState = {
    levels: new Array(jugCount).fill(0),
  };

  return bfsSolve<JugSolverState, JugMove>({
    initialState,
    isGoal: (state) => {
      if (puzzle.targetJug) {
        const jugIdx = puzzle.jugs.findIndex(j => j.id === puzzle.targetJug);
        return jugIdx >= 0 && state.levels[jugIdx] === puzzle.target;
      }
      return state.levels.some(l => l === puzzle.target);
    },
    getMoves: (state) => {
      const moves: JugMove[] = [];

      for (let i = 0; i < jugCount; i++) {
        // Fill jug i
        if (state.levels[i] < capacities[i]) {
          moves.push({ action: 'fill', jugId: puzzle.jugs[i].id });
        }
        // Empty jug i
        if (state.levels[i] > 0) {
          moves.push({ action: 'empty', jugId: puzzle.jugs[i].id });
        }
        // Pour from i to j
        for (let j = 0; j < jugCount; j++) {
          if (i === j) continue;
          if (state.levels[i] > 0 && state.levels[j] < capacities[j]) {
            moves.push({ action: 'pour', from: puzzle.jugs[i].id, to: puzzle.jugs[j].id });
          }
        }
      }
      return moves;
    },
    applyMove: (state, move) => {
      const newLevels = [...state.levels];

      if (move.action === 'fill') {
        const idx = puzzle.jugs.findIndex(j => j.id === move.jugId);
        newLevels[idx] = capacities[idx];
      } else if (move.action === 'empty') {
        const idx = puzzle.jugs.findIndex(j => j.id === move.jugId);
        newLevels[idx] = 0;
      } else if (move.action === 'pour') {
        const fromIdx = puzzle.jugs.findIndex(j => j.id === move.from);
        const toIdx = puzzle.jugs.findIndex(j => j.id === move.to);
        const pourAmount = Math.min(newLevels[fromIdx], capacities[toIdx] - newLevels[toIdx]);
        newLevels[fromIdx] -= pourAmount;
        newLevels[toIdx] += pourAmount;
      }

      return { levels: newLevels };
    },
    serialize: (state) => state.levels.join(','),
    maxDepth: 30,
  });
}
