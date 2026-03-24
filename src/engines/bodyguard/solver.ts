import { bfsSolve, SolverResult } from '../bfs-solver';
import type { BodyguardPuzzle, BodyguardMove } from './generator';

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

/**
 * Build the effective protection map considering double-agent variant.
 * Returns a map: chargeId -> actual protectorId
 */
function getProtectionMap(puzzle: BodyguardPuzzle): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of puzzle.pairs) {
    map.set(pair.charge.id, pair.protector.id);
  }

  // Double-agent: reassign the agent's protection
  if (puzzle.variant === 'double-agent' && puzzle.doubleAgentId !== undefined && puzzle.doubleAgentTargetPair !== undefined) {
    const agentId = puzzle.doubleAgentId;
    const targetCharge = puzzle.pairs[puzzle.doubleAgentTargetPair].charge.id;

    // Find which charge originally belonged to the double agent
    let originalCharge: string | undefined;
    for (const pair of puzzle.pairs) {
      if (pair.protector.id === agentId) {
        originalCharge = pair.charge.id;
        break;
      }
    }

    if (originalCharge) {
      // The agent now protects the target charge instead
      map.set(targetCharge, agentId);
      // The original charge has NO protector
      map.delete(originalCharge);
    }
  }

  return map;
}

function isStateValid(
  bankIds: Set<string>,
  puzzle: BodyguardPuzzle,
  protectionMap: Map<string, string>
): boolean {
  if (bankIds.size === 0) return true;

  // Basic protection rule (with double-agent adjustment)
  const allChargeIds = puzzle.pairs.map(p => p.charge.id);
  const allProtectorIds = puzzle.pairs.map(p => p.protector.id);

  for (const chargeId of allChargeIds) {
    if (!bankIds.has(chargeId)) continue;

    const myProtector = protectionMap.get(chargeId);

    if (myProtector && bankIds.has(myProtector)) continue; // protector present, safe

    // Charge without protector (or has no protector at all in double-agent case)
    // If any OTHER protector is present, it's a violation
    for (const protId of allProtectorIds) {
      if (protId === myProtector) continue;
      if (bankIds.has(protId)) {
        // Hierarchy variant: only dangerous if the other protector has higher rank
        if (puzzle.variant === 'hierarchy' && puzzle.protectorRanks) {
          const otherPairIdx = puzzle.pairs.findIndex(p => p.protector.id === protId);
          const chargePairIdx = puzzle.pairs.findIndex(p => p.charge.id === chargeId);
          if (otherPairIdx >= 0 && chargePairIdx >= 0) {
            const otherRank = puzzle.protectorRanks[otherPairIdx];
            const myRank = puzzle.protectorRanks[chargePairIdx];
            // Only dangerous if other protector outranks this charge's protector
            if (otherRank <= myRank) continue; // not dangerous
          }
        }
        return false;
      }
    }
  }

  // Exclusive pairs check
  if (puzzle.variant === 'exclusive' && puzzle.exclusivePairs) {
    for (const ep of puzzle.exclusivePairs) {
      if (bankIds.has(ep.idA) && bankIds.has(ep.idB)) {
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
  const protectionMap = getProtectionMap(puzzle);
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
      if (leftSet.size > 0 && !isStateValid(leftSet, puzzle, protectionMap)) return true;
      if (rightSet.size > 0 && !isStateValid(rightSet, puzzle, protectionMap)) return true;
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
