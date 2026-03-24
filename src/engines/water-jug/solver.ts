import { bfsSolve, SolverResult } from '../bfs-solver';
import type { WaterJugPuzzle, JugMove } from './generator';

interface JugSolverState {
  levels: number[];
}

export function solveWaterJug(puzzle: WaterJugPuzzle): SolverResult<JugMove> {
  const jugCount = puzzle.jugs.length;
  const capacities = puzzle.jugs.map(j => j.capacity);
  const leakyIdx = puzzle.leakyJugId ? puzzle.jugs.findIndex(j => j.id === puzzle.leakyJugId) : -1;
  const leakAmount = puzzle.leakAmount ?? 0;

  const initialState: JugSolverState = {
    levels: new Array(jugCount).fill(0),
  };

  return bfsSolve<JugSolverState, JugMove>({
    initialState,
    isGoal: (state) => {
      if (puzzle.variant === 'mixing' && puzzle.mixTargets) {
        return puzzle.mixTargets.every(mt => {
          const idx = puzzle.jugs.findIndex(j => j.id === mt.jugId);
          return idx >= 0 && state.levels[idx] === mt.amount;
        });
      }
      if (puzzle.targetJug) {
        const jugIdx = puzzle.jugs.findIndex(j => j.id === puzzle.targetJug);
        return jugIdx >= 0 && state.levels[jugIdx] === puzzle.target;
      }
      return state.levels.some(l => l === puzzle.target);
    },
    getMoves: (state) => {
      const moves: JugMove[] = [];

      for (let i = 0; i < jugCount; i++) {
        if (state.levels[i] < capacities[i]) {
          moves.push({ action: 'fill', jugId: puzzle.jugs[i].id });
        }
        if (state.levels[i] > 0) {
          moves.push({ action: 'empty', jugId: puzzle.jugs[i].id });
        }
        for (let j = 0; j < jugCount; j++) {
          if (i === j) continue;

          // Mixing variant: check color compatibility
          if (puzzle.variant === 'mixing') {
            const fromColor = puzzle.jugs[i].color;
            const toColor = puzzle.jugs[j].color;
            // Can't pour into a jug of different color (unless target is uncolored)
            if (fromColor && toColor && fromColor !== toColor) continue;
          }

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

      // Apply leak after action
      if (puzzle.variant === 'leaky' && leakyIdx >= 0 && leakAmount > 0) {
        newLevels[leakyIdx] = Math.max(0, newLevels[leakyIdx] - leakAmount);
      }

      return { levels: newLevels };
    },
    serialize: (state) => state.levels.join(','),
    maxDepth: 30,
  });
}
