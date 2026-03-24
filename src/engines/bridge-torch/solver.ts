import { bfsSolve, SolverResult } from '../bfs-solver';
import type { BridgeTorchPuzzle, BridgeMove } from './generator';

interface BridgeSolverState {
  leftSide: string[];
  rightSide: string[];
  torchPosition: 'left' | 'right';
  elapsedTime: number;
  crossingsUsed: number; // for bridge-durability
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

function getEffectiveTime(
  baseTime: number,
  crossingIndex: number,
  puzzle: BridgeTorchPuzzle,
  bridgeIndex?: number
): number {
  let time = baseTime;

  // Two-bridges: second bridge has speed modifier
  if (puzzle.variant === 'two-bridges' && bridgeIndex === 1) {
    time = time * (puzzle.bridge2SpeedMod ?? 2);
  }

  // Battery drain: each crossing costs more
  if (puzzle.variant === 'battery-drain') {
    time += crossingIndex * (puzzle.batteryDrainRate ?? 0);
  }

  return time;
}

export function solveBridgeTorch(puzzle: BridgeTorchPuzzle): SolverResult<BridgeMove> {
  const speedMap = new Map(puzzle.people.map(p => [p.id, p.speed]));
  const allIds = puzzle.people.map(p => p.id).sort();

  const initialState: BridgeSolverState = {
    leftSide: [...allIds],
    rightSide: [],
    torchPosition: 'left',
    elapsedTime: 0,
    crossingsUsed: 0,
  };

  return bfsSolve<BridgeSolverState, BridgeMove>({
    initialState,
    isGoal: (state) => state.leftSide.length === 0,
    isFailed: (state) => {
      if (state.elapsedTime > puzzle.timeLimit) return true;
      if (puzzle.variant === 'bridge-durability' && puzzle.bridgeDurability !== undefined) {
        if (state.crossingsUsed > puzzle.bridgeDurability) return true;
      }
      return false;
    },
    getMoves: (state) => {
      const moves: BridgeMove[] = [];

      if (state.torchPosition === 'left') {
        // Forward: 1 or 2 people cross
        const combos = getCombinations(state.leftSide, 1, puzzle.bridgeCapacity);
        for (const group of combos) {
          const baseTime = Math.max(...group.map(id => speedMap.get(id)!));
          const time = getEffectiveTime(baseTime, state.crossingsUsed, puzzle, 0);
          if (state.elapsedTime + time <= puzzle.timeLimit) {
            if (puzzle.variant !== 'bridge-durability' || puzzle.bridgeDurability === undefined ||
                state.crossingsUsed < puzzle.bridgeDurability) {
              moves.push({ people: group, direction: 'forward', time, bridgeIndex: 0 });
            }
          }
        }

        // Two-bridges: also try second bridge
        if (puzzle.variant === 'two-bridges' && puzzle.bridge2Capacity) {
          const combos2 = getCombinations(state.leftSide, 1, puzzle.bridge2Capacity);
          for (const group of combos2) {
            const baseTime = Math.max(...group.map(id => speedMap.get(id)!));
            const time = getEffectiveTime(baseTime, state.crossingsUsed, puzzle, 1);
            if (state.elapsedTime + time <= puzzle.timeLimit) {
              moves.push({ people: group, direction: 'forward', time, bridgeIndex: 1 });
            }
          }
        }
      } else {
        // Back: 1 person comes back
        for (const id of state.rightSide) {
          const baseTime = speedMap.get(id)!;
          const time = getEffectiveTime(baseTime, state.crossingsUsed, puzzle, 0);
          if (state.elapsedTime + time <= puzzle.timeLimit) {
            if (puzzle.variant !== 'bridge-durability' || puzzle.bridgeDurability === undefined ||
                state.crossingsUsed < puzzle.bridgeDurability) {
              moves.push({ people: [id], direction: 'back', time, bridgeIndex: 0 });
            }
          }
        }

        // Two-bridges: return via second bridge
        if (puzzle.variant === 'two-bridges') {
          for (const id of state.rightSide) {
            const baseTime = speedMap.get(id)!;
            const time = getEffectiveTime(baseTime, state.crossingsUsed, puzzle, 1);
            if (state.elapsedTime + time <= puzzle.timeLimit) {
              moves.push({ people: [id], direction: 'back', time, bridgeIndex: 1 });
            }
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
        crossingsUsed: state.crossingsUsed + 1,
      };
    },
    serialize: (state) =>
      `${state.leftSide.join(',')};${state.torchPosition};${state.elapsedTime};${state.crossingsUsed}`,
    maxDepth: 30,
  });
}
