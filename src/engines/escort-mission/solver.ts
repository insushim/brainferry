import { bfsSolve, SolverResult } from '../bfs-solver';
import type { EscortPuzzle, EscortMove } from './generator';

interface EscortSolverState {
  leftA: number;
  leftB: number;
  leftC: number; // for three-groups
  boatPosition: 'left' | 'right';
}

function isValidBank(
  a: number, b: number, c: number,
  puzzle: EscortPuzzle
): boolean {
  if (puzzle.variant === 'three-groups') {
    // Triangle dominance: A>B>C>A
    // If B>0 and A>B, violation (A dominates B)
    if (b > 0 && a > b) return false;
    // If C>0 and B>C, violation (B dominates C)
    if (c > 0 && b > c) return false;
    // If A>0 and C>A, violation (C dominates A)
    if (a > 0 && c > a) return false;
    return true;
  }

  // For traitor variant, adjust the effective counts
  let effectiveA = a;
  let effectiveB = b;

  if (puzzle.variant === 'traitor') {
    // The traitor counts as the opposite group
    // This is an approximation — in real terms, we track exact positions
    // but for the solver, we just adjust counts
    // Traitor in A means one A actually counts as B
    // The traitor always moves with group A or B based on their apparent group
    // So the solver state already tracks positions correctly
    // We just need to adjust the violation check
    if (puzzle.traitorInA) {
      // One of the A members is actually B
      // We need to check if traitor is on this bank
      // Since we can't track individual positions in this simplified state,
      // we handle it by adjusting total counts
      effectiveA = a;
      effectiveB = b;
    }
  }

  // Standard rule: B must never outnumber A (when A > 0)
  if (effectiveA > 0 && effectiveB > effectiveA) return false;
  return true;
}

export function solveEscort(puzzle: EscortPuzzle): SolverResult<EscortMove> {
  const totalA = puzzle.groupA.count;
  const totalB = puzzle.groupB.count;
  const totalC = puzzle.groupC?.count ?? 0;

  // For traitor variant, we need per-member tracking
  if (puzzle.variant === 'traitor') {
    return solveTraitorVariant(puzzle);
  }

  // For VIP variant, we need per-member tracking
  if (puzzle.variant === 'vip-escort') {
    return solveVipVariant(puzzle);
  }

  const initialState: EscortSolverState = {
    leftA: totalA,
    leftB: totalB,
    leftC: totalC,
    boatPosition: 'left',
  };

  return bfsSolve<EscortSolverState, EscortMove>({
    initialState,
    isGoal: (state) => state.leftA === 0 && state.leftB === 0 && state.leftC === 0,
    isFailed: (state) => {
      const rightA = totalA - state.leftA;
      const rightB = totalB - state.leftB;
      const rightC = totalC - state.leftC;
      if (!isValidBank(state.leftA, state.leftB, state.leftC, puzzle)) return true;
      if (!isValidBank(rightA, rightB, rightC, puzzle)) return true;
      return false;
    },
    getMoves: (state) => {
      const moves: EscortMove[] = [];
      const cap = puzzle.boatCapacity;

      if (state.boatPosition === 'left') {
        const maxA = Math.min(state.leftA, cap);
        const maxB = Math.min(state.leftB, cap);
        const maxC = Math.min(state.leftC, cap);

        if (puzzle.variant === 'three-groups') {
          for (let a = 0; a <= maxA; a++) {
            for (let b = 0; b <= Math.min(maxB, cap - a); b++) {
              for (let c = 0; c <= Math.min(maxC, cap - a - b); c++) {
                if (a + b + c === 0 || a + b + c > cap) continue;
                if (puzzle.driverRequired && a === 0) continue;
                moves.push({ groupA: a, groupB: b, groupC: c, direction: 'left-to-right' });
              }
            }
          }
        } else {
          for (let a = 0; a <= maxA; a++) {
            for (let b = 0; b <= Math.min(maxB, cap - a); b++) {
              if (a + b === 0 || a + b > cap) continue;
              if (puzzle.driverRequired && a === 0) continue;
              moves.push({ groupA: a, groupB: b, direction: 'left-to-right' });
            }
          }
        }
      } else {
        const rightA = totalA - state.leftA;
        const rightB = totalB - state.leftB;
        const rightC = totalC - state.leftC;

        if (puzzle.variant === 'three-groups') {
          for (let a = 0; a <= Math.min(rightA, cap); a++) {
            for (let b = 0; b <= Math.min(rightB, cap - a); b++) {
              for (let c = 0; c <= Math.min(rightC, cap - a - b); c++) {
                if (a + b + c === 0 || a + b + c > cap) continue;
                if (puzzle.driverRequired && a === 0) continue;
                moves.push({ groupA: a, groupB: b, groupC: c, direction: 'right-to-left' });
              }
            }
          }
        } else {
          for (let a = 0; a <= Math.min(rightA, cap); a++) {
            for (let b = 0; b <= Math.min(rightB, cap - a); b++) {
              if (a + b === 0 || a + b > cap) continue;
              if (puzzle.driverRequired && a === 0) continue;
              moves.push({ groupA: a, groupB: b, direction: 'right-to-left' });
            }
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
          leftC: state.leftC - (move.groupC ?? 0),
          boatPosition: 'right' as const,
        };
      } else {
        return {
          leftA: state.leftA + move.groupA,
          leftB: state.leftB + move.groupB,
          leftC: state.leftC + (move.groupC ?? 0),
          boatPosition: 'left' as const,
        };
      }
    },
    serialize: (state) => `${state.leftA},${state.leftB},${state.leftC},${state.boatPosition}`,
    maxDepth: 50,
  });
}

function solveTraitorVariant(puzzle: EscortPuzzle): SolverResult<EscortMove> {
  // For traitor: one member counts as the opposite group
  // We adjust effective counts in validation
  const totalA = puzzle.groupA.count;
  const totalB = puzzle.groupB.count;
  const traitorInA = puzzle.traitorInA ?? false;

  interface TraitorState {
    leftA: number;
    leftB: number;
    leftTraitor: boolean; // is the traitor on the left?
    boatPosition: 'left' | 'right';
  }

  const initialState: TraitorState = {
    leftA: totalA,
    leftB: totalB,
    leftTraitor: true,
    boatPosition: 'left',
  };

  function effectiveCounts(a: number, b: number, traitorPresent: boolean): { effA: number; effB: number } {
    if (!traitorPresent) return { effA: a, effB: b };
    if (traitorInA) {
      // One A member is actually B
      return { effA: a - 1, effB: b + 1 };
    } else {
      // One B member is actually A
      return { effA: a + 1, effB: b - 1 };
    }
  }

  return bfsSolve<TraitorState, EscortMove>({
    initialState,
    isGoal: (state) => state.leftA === 0 && state.leftB === 0,
    isFailed: (state) => {
      const rightA = totalA - state.leftA;
      const rightB = totalB - state.leftB;
      const rightTraitor = !state.leftTraitor;

      const leftEff = effectiveCounts(state.leftA, state.leftB, state.leftTraitor);
      const rightEff = effectiveCounts(rightA, rightB, rightTraitor);

      if (leftEff.effA > 0 && leftEff.effB > leftEff.effA) return true;
      if (rightEff.effA > 0 && rightEff.effB > rightEff.effA) return true;
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
      const newLeftA = move.direction === 'left-to-right' ? state.leftA - move.groupA : state.leftA + move.groupA;
      const newLeftB = move.direction === 'left-to-right' ? state.leftB - move.groupB : state.leftB + move.groupB;

      // Traitor moves with their apparent group
      // If traitor is in A and some A moves, traitor might be among them
      // For simplicity, we assume the traitor moves when their count decreases to 0 on one side
      let newLeftTraitor = state.leftTraitor;
      if (traitorInA) {
        if (move.direction === 'left-to-right' && move.groupA > 0 && state.leftTraitor) {
          // Traitor might move. For BFS to work, we generate both possibilities
          // But that doubles states. Simpler: traitor moves with last A member
          if (newLeftA === 0) newLeftTraitor = false;
        }
        if (move.direction === 'right-to-left' && move.groupA > 0 && !state.leftTraitor) {
          if (totalA - newLeftA === 0) newLeftTraitor = true;
        }
      } else {
        if (move.direction === 'left-to-right' && move.groupB > 0 && state.leftTraitor) {
          if (newLeftB === 0) newLeftTraitor = false;
        }
        if (move.direction === 'right-to-left' && move.groupB > 0 && !state.leftTraitor) {
          if (totalB - newLeftB === 0) newLeftTraitor = true;
        }
      }

      return {
        leftA: newLeftA,
        leftB: newLeftB,
        leftTraitor: newLeftTraitor,
        boatPosition: move.direction === 'left-to-right' ? 'right' as const : 'left' as const,
      };
    },
    serialize: (state) => `${state.leftA},${state.leftB},${state.leftTraitor},${state.boatPosition}`,
    maxDepth: 50,
  });
}

function solveVipVariant(puzzle: EscortPuzzle): SolverResult<EscortMove> {
  // VIP in group B can only travel with specific A escort
  // We need to track whether VIP and their escort are on the same side
  const totalA = puzzle.groupA.count;
  const totalB = puzzle.groupB.count;

  interface VipState {
    leftA: number;
    leftB: number;
    vipOnLeft: boolean;
    escortOnLeft: boolean;
    boatPosition: 'left' | 'right';
  }

  const initialState: VipState = {
    leftA: totalA,
    leftB: totalB,
    vipOnLeft: true,
    escortOnLeft: true,
    boatPosition: 'left',
  };

  return bfsSolve<VipState, EscortMove>({
    initialState,
    isGoal: (state) => state.leftA === 0 && state.leftB === 0,
    isFailed: (state) => {
      const rightA = totalA - state.leftA;
      const rightB = totalB - state.leftB;
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

            // VIP constraint: if VIP moves (b > 0 and VIP on left), escort must move too
            if (b > 0 && state.vipOnLeft) {
              // VIP might be among the B members moving
              // For simplicity: if VIP on this side and B moves, require escort to also move
              // Only enforce when B count would move VIP
              if (state.leftB <= b) {
                // VIP is definitely moving (all B from this side)
                if (!state.escortOnLeft || a === 0) continue; // escort not here or not moving
              }
            }

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

            if (b > 0 && !state.vipOnLeft) {
              if (rightB <= b) {
                if (state.escortOnLeft || a === 0) continue;
              }
            }

            moves.push({ groupA: a, groupB: b, direction: 'right-to-left' });
          }
        }
      }
      return moves;
    },
    applyMove: (state, move) => {
      const newLeftA = move.direction === 'left-to-right' ? state.leftA - move.groupA : state.leftA + move.groupA;
      const newLeftB = move.direction === 'left-to-right' ? state.leftB - move.groupB : state.leftB + move.groupB;

      let newVipOnLeft = state.vipOnLeft;
      let newEscortOnLeft = state.escortOnLeft;

      if (move.direction === 'left-to-right') {
        if (state.vipOnLeft && move.groupB > 0 && state.leftB <= move.groupB) {
          newVipOnLeft = false;
        }
        if (state.escortOnLeft && move.groupA > 0 && state.leftA <= move.groupA) {
          newEscortOnLeft = false;
        }
      } else {
        if (!state.vipOnLeft && move.groupB > 0) {
          const rightB = totalB - state.leftB;
          if (rightB <= move.groupB) newVipOnLeft = true;
        }
        if (!state.escortOnLeft && move.groupA > 0) {
          const rightA = totalA - state.leftA;
          if (rightA <= move.groupA) newEscortOnLeft = true;
        }
      }

      return {
        leftA: newLeftA,
        leftB: newLeftB,
        vipOnLeft: newVipOnLeft,
        escortOnLeft: newEscortOnLeft,
        boatPosition: move.direction === 'left-to-right' ? 'right' as const : 'left' as const,
      };
    },
    serialize: (state) =>
      `${state.leftA},${state.leftB},${state.vipOnLeft},${state.escortOnLeft},${state.boatPosition}`,
    maxDepth: 50,
  });
}
