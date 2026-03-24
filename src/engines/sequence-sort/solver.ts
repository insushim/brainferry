import { bfsSolve, SolverResult } from '../bfs-solver';
import type { SequenceSortPuzzle, SortMove } from './generator';

interface SortSolverState {
  order: number[];
}

export function solveSequenceSort(puzzle: SequenceSortPuzzle): SolverResult<SortMove> {
  const goalKey = puzzle.goalOrder.join(',');

  // For multi-target variant, check alternate goals too
  const alternateGoalKeys = (puzzle.alternateGoals ?? []).map(g => g.join(','));
  const allGoalKeys = new Set([goalKey, ...alternateGoalKeys]);

  return bfsSolve<SortSolverState, SortMove>({
    initialState: { order: [...puzzle.initialOrder] },
    isGoal: (state) => allGoalKeys.has(state.order.join(',')),
    getMoves: (state) => {
      const moves: SortMove[] = [];
      const n = state.order.length;

      for (const op of puzzle.allowedOps) {
        if (op === 'swap') {
          for (let i = 0; i < n - 1; i++) {
            moves.push({ op: 'swap', index: i });
          }
        } else if (op === 'flip') {
          for (let count = 2; count <= n; count++) {
            moves.push({ op: 'flip', index: 0, count });
          }
        } else if (op === 'rotate') {
          for (let i = 0; i < n - 1; i++) {
            moves.push({ op: 'rotate', index: i, count: Math.min(3, n - i) });
          }
        }
      }
      return moves;
    },
    applyMove: (state, move) => {
      const newOrder = [...state.order];

      if (move.op === 'swap') {
        const i = move.index;
        [newOrder[i], newOrder[i + 1]] = [newOrder[i + 1], newOrder[i]];
      } else if (move.op === 'flip') {
        const count = move.count ?? 2;
        const sub = newOrder.slice(0, count).reverse();
        for (let i = 0; i < count; i++) {
          newOrder[i] = sub[i];
        }
      } else if (move.op === 'rotate') {
        const i = move.index;
        const count = move.count ?? 3;
        const end = Math.min(i + count, newOrder.length);
        const last = newOrder[end - 1];
        for (let j = end - 1; j > i; j--) {
          newOrder[j] = newOrder[j - 1];
        }
        newOrder[i] = last;
      }

      return { order: newOrder };
    },
    serialize: (state) => state.order.join(','),
    maxDepth: 20,
  });
}
