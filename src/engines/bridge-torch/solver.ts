import { bfsSolve, SolverResult } from '../bfs-solver';
import type { BridgeTorchPuzzle, BridgeMove } from './generator';

interface BridgeSolverState {
  leftSide: string[];  // sorted ids
  rightSide: string[]; // sorted ids
  torchPosition: 'left' | 'right';
  elapsedTime: number;
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

export function solveBridgeTorch(puzzle: BridgeTorchPuzzle): SolverResult<BridgeMove> {
  const speedMap = new Map(puzzle.people.map(p => [p.id, p.speed]));
  const allIds = puzzle.people.map(p => p.id).sort();

  const initialState: BridgeSolverState = {
    leftSide: [...allIds],
    rightSide: [],
    torchPosition: 'left',
    elapsedTime: 0,
  };

  return bfsSolve<BridgeSolverState, BridgeMove>({
    initialState,
    isGoal: (state) => state.leftSide.length === 0,
    isFailed: (state) => state.elapsedTime > puzzle.timeLimit,
    getMoves: (state) => {
      const moves: BridgeMove[] = [];
      if (state.torchPosition === 'left') {
        // 1 or 2 people cross forward
        const combos = getCombinations(state.leftSide, 1, puzzle.bridgeCapacity);
        for (const group of combos) {
          const time = Math.max(...group.map(id => speedMap.get(id)!));
          if (state.elapsedTime + time <= puzzle.timeLimit) {
            moves.push({ people: group, direction: 'forward', time });
          }
        }
      } else {
        // 1 person comes back
        for (const id of state.rightSide) {
          const time = speedMap.get(id)!;
          if (state.elapsedTime + time <= puzzle.timeLimit) {
            moves.push({ people: [id], direction: 'back', time });
          }
        }
      }
      return moves;
    },
    applyMove: (state, move) => {
      const newLeft = [...state.leftSide];
      const newRight = [...state.rightSide];
      if (move.direction === 'forward') {
        for (const id of move.people) {
          newLeft.splice(newLeft.indexOf(id), 1);
          newRight.push(id);
        }
      } else {
        for (const id of move.people) {
          newRight.splice(newRight.indexOf(id), 1);
          newLeft.push(id);
        }
      }
      return {
        leftSide: newLeft.sort(),
        rightSide: newRight.sort(),
        torchPosition: move.direction === 'forward' ? 'right' as const : 'left' as const,
        elapsedTime: state.elapsedTime + move.time,
      };
    },
    serialize: (state) =>
      `${state.leftSide.join(',')};${state.torchPosition};${state.elapsedTime}`,
    maxDepth: 30,
  });
}
