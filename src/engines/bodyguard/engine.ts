import type { BodyguardPuzzle, BodyguardMove } from './generator';

export interface BodyguardState {
  leftSide: string[];
  rightSide: string[];
  boatPosition: 'left' | 'right';
  steps: number;
  moveHistory: BodyguardMove[];
  isComplete: boolean;
  isFailed: boolean;
  failReason?: string;
}

export function createInitialState(puzzle: BodyguardPuzzle): BodyguardState {
  const allIds: string[] = [];
  for (const pair of puzzle.pairs) {
    allIds.push(pair.protector.id, pair.charge.id);
  }
  return {
    leftSide: allIds,
    rightSide: [],
    boatPosition: 'left',
    steps: 0,
    moveHistory: [],
    isComplete: false,
    isFailed: false,
  };
}

/**
 * Build the effective protection map considering double-agent variant.
 */
function getProtectionMap(puzzle: BodyguardPuzzle): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of puzzle.pairs) {
    map.set(pair.charge.id, pair.protector.id);
  }

  if (puzzle.variant === 'double-agent' && puzzle.doubleAgentId !== undefined && puzzle.doubleAgentTargetPair !== undefined) {
    const agentId = puzzle.doubleAgentId;
    const targetCharge = puzzle.pairs[puzzle.doubleAgentTargetPair].charge.id;

    let originalCharge: string | undefined;
    for (const pair of puzzle.pairs) {
      if (pair.protector.id === agentId) {
        originalCharge = pair.charge.id;
        break;
      }
    }

    if (originalCharge) {
      map.set(targetCharge, agentId);
      map.delete(originalCharge);
    }
  }

  return map;
}

function checkBankValid(
  bankIds: string[],
  puzzle: BodyguardPuzzle
): { valid: boolean; reason?: string } {
  const bankSet = new Set(bankIds);
  if (bankSet.size === 0) return { valid: true };

  const protectionMap = getProtectionMap(puzzle);
  const allProtectorIds = puzzle.pairs.map(p => p.protector.id);

  for (const pair of puzzle.pairs) {
    const chargeId = pair.charge.id;
    if (!bankSet.has(chargeId)) continue;

    const myProtector = protectionMap.get(chargeId);
    if (myProtector && bankSet.has(myProtector)) continue; // safe

    // Charge without protector — check for dangerous protectors
    for (const protId of allProtectorIds) {
      if (protId === myProtector) continue;
      if (!bankSet.has(protId)) continue;

      // Hierarchy variant: only dangerous if the other protector has higher rank
      if (puzzle.variant === 'hierarchy' && puzzle.protectorRanks) {
        const otherPairIdx = puzzle.pairs.findIndex(p => p.protector.id === protId);
        const chargePairIdx = puzzle.pairs.findIndex(p => p.charge.id === chargeId);
        if (otherPairIdx >= 0 && chargePairIdx >= 0) {
          const otherRank = puzzle.protectorRanks[otherPairIdx];
          const myRank = puzzle.protectorRanks[chargePairIdx];
          if (otherRank <= myRank) continue; // not dangerous
        }
      }

      const otherPair = puzzle.pairs.find(p => p.protector.id === protId);
      const protectorName = myProtector
        ? puzzle.pairs.find(p => p.protector.id === myProtector)?.protector.name ?? myProtector
        : '(없음)';
      return {
        valid: false,
        reason: `${pair.charge.name}이(가) 자신의 보디가드(${protectorName}) 없이 다른 보디가드(${otherPair?.protector.name})와 함께 있습니다!`,
      };
    }
  }

  // Exclusive pairs check
  if (puzzle.variant === 'exclusive' && puzzle.exclusivePairs) {
    for (const ep of puzzle.exclusivePairs) {
      if (bankSet.has(ep.idA) && bankSet.has(ep.idB)) {
        const nameA = puzzle.pairs.find(p => p.protector.id === ep.idA)?.protector.name ?? ep.idA;
        const nameB = puzzle.pairs.find(p => p.protector.id === ep.idB)?.protector.name ?? ep.idB;
        return {
          valid: false,
          reason: `${nameA}와(과) ${nameB}는 같은 강변에 있으면 안 됩니다!`,
        };
      }
    }
  }

  return { valid: true };
}

export function applyMove(
  state: BodyguardState,
  move: BodyguardMove,
  puzzle: BodyguardPuzzle
): BodyguardState | { error: string } {
  if (move.passengers.length === 0) {
    return { error: '보트에 아무도 없습니다.' };
  }
  if (move.passengers.length > puzzle.boatCapacity) {
    return { error: `보트는 최대 ${puzzle.boatCapacity}명까지 탈 수 있습니다.` };
  }

  // Check driver requirement
  if (puzzle.driverIds) {
    if (!move.passengers.some(id => puzzle.driverIds!.includes(id))) {
      return { error: '보트를 운전할 수 있는 사람이 탑승해야 합니다.' };
    }
  }

  const source = move.direction === 'left-to-right' ? state.leftSide : state.rightSide;
  for (const id of move.passengers) {
    if (!source.includes(id)) {
      return { error: `${id}이(가) 현재 강변에 없습니다.` };
    }
  }

  const newLeft = [...state.leftSide];
  const newRight = [...state.rightSide];

  if (move.direction === 'left-to-right') {
    for (const id of move.passengers) {
      newLeft.splice(newLeft.indexOf(id), 1);
      newRight.push(id);
    }
  } else {
    for (const id of move.passengers) {
      newRight.splice(newRight.indexOf(id), 1);
      newLeft.push(id);
    }
  }

  const leftCheck = newLeft.length > 0 ? checkBankValid(newLeft, puzzle) : { valid: true };
  const rightCheck = newRight.length > 0 ? checkBankValid(newRight, puzzle) : { valid: true };

  const isFailed = !leftCheck.valid || !rightCheck.valid;
  const failReason = !leftCheck.valid ? leftCheck.reason : !rightCheck.valid ? rightCheck.reason : undefined;
  const isComplete = newLeft.length === 0 && !isFailed;

  return {
    leftSide: newLeft,
    rightSide: newRight,
    boatPosition: move.direction === 'left-to-right' ? 'right' : 'left',
    steps: state.steps + 1,
    moveHistory: [...state.moveHistory, move],
    isComplete,
    isFailed,
    failReason,
  };
}

export function undo(state: BodyguardState): BodyguardState {
  if (state.moveHistory.length === 0) return state;

  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  const newLeft = [...state.leftSide];
  const newRight = [...state.rightSide];

  if (lastMove.direction === 'left-to-right') {
    for (const id of lastMove.passengers) {
      newRight.splice(newRight.indexOf(id), 1);
      newLeft.push(id);
    }
  } else {
    for (const id of lastMove.passengers) {
      newLeft.splice(newLeft.indexOf(id), 1);
      newRight.push(id);
    }
  }

  return {
    leftSide: newLeft,
    rightSide: newRight,
    boatPosition: lastMove.direction === 'left-to-right' ? 'left' : 'right',
    steps: state.steps - 1,
    moveHistory: state.moveHistory.slice(0, -1),
    isComplete: false,
    isFailed: false,
  };
}
