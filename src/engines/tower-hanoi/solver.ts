import { bfsSolve, SolverResult } from '../bfs-solver';
import type { HanoiPuzzle, HanoiMove } from './generator';

interface HanoiSolverState {
  pegs: number[][]; // peg[i] = array of disc sizes (bottom to top)
}

export function solveHanoi(puzzle: HanoiPuzzle): SolverResult<HanoiMove> {
  const forbiddenMoves = new Set(
    (puzzle.moveRestrictions ?? []).map(r => `${r.from}-${r.to}`)
  );

  const discColors = puzzle.discColors;
  const pegColorRestrictions = puzzle.pegColorRestrictions;

  const initialState: HanoiSolverState = {
    pegs: puzzle.initialState.map(p => [...p]),
  };

  const goalKey = puzzle.goalState.map(p => p.join(',')).join(';');

  return bfsSolve<HanoiSolverState, HanoiMove>({
    initialState,
    isGoal: (state) => {
      const key = state.pegs.map(p => p.join(',')).join(';');
      return key === goalKey;
    },
    getMoves: (state) => {
      const moves: HanoiMove[] = [];
      for (let from = 0; from < state.pegs.length; from++) {
        if (state.pegs[from].length === 0) continue;
        const disc = state.pegs[from][state.pegs[from].length - 1];
        for (let to = 0; to < state.pegs.length; to++) {
          if (from === to) continue;
          if (forbiddenMoves.has(`${from}-${to}`)) continue;
          const toPeg = state.pegs[to];
          if (toPeg.length > 0 && toPeg[toPeg.length - 1] < disc) continue;

          // Color restriction check: can this disc be placed on this peg?
          if (discColors && pegColorRestrictions) {
            const discColor = discColors[disc - 1]; // disc sizes are 1-based
            if (pegColorRestrictions[to] && pegColorRestrictions[to].includes(discColor)) {
              continue; // This peg forbids this disc's color
            }
          }

          moves.push({ from, to, disc });
        }
      }
      return moves;
    },
    applyMove: (state, move) => {
      const newPegs = state.pegs.map(p => [...p]);
      newPegs[move.from].pop();
      newPegs[move.to].push(move.disc);
      return { pegs: newPegs };
    },
    serialize: (state) => state.pegs.map(p => p.join(',')).join(';'),
    maxDepth: 200,
  });
}
