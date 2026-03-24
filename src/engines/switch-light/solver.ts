import type { SwitchLightPuzzle } from './generator';

export interface SwitchLightSolverResult {
  solvable: boolean;
  solution: number[]; // switch indices to press
}

/**
 * Get all switches that are effectively toggled when pressing a switch.
 * For toggle-chain variant, follows the chain recursively.
 */
function getEffectiveSwitches(switchIdx: number, puzzle: SwitchLightPuzzle): Set<number> {
  const effective = new Set<number>([switchIdx]);
  if (puzzle.variant === 'toggle-chain' && puzzle.chainConnections) {
    const queue = [switchIdx];
    const visited = new Set<number>([switchIdx]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const chained of (puzzle.chainConnections[current] ?? [])) {
        if (!visited.has(chained)) {
          visited.add(chained);
          effective.add(chained);
          queue.push(chained);
        }
      }
    }
  }
  return effective;
}

/**
 * Build the effective connection matrix considering toggle-chain.
 * effectiveConnections[sw][lt] = true if pressing sw toggles light lt.
 */
function buildEffectiveConnections(puzzle: SwitchLightPuzzle): boolean[][] {
  const { switchCount, lightCount, connections } = puzzle;
  const effective: boolean[][] = Array.from({ length: switchCount }, () =>
    new Array(lightCount).fill(false)
  );

  for (let sw = 0; sw < switchCount; sw++) {
    const triggerSet = getEffectiveSwitches(sw, puzzle);
    for (const trigSw of triggerSet) {
      for (let lt = 0; lt < lightCount; lt++) {
        if (connections[trigSw][lt]) {
          // XOR: if already toggled by another switch in chain, cancel out
          effective[sw][lt] = !effective[sw][lt];
        }
      }
    }
  }

  return effective;
}

/**
 * Solve switch-light puzzle using GF(2) Gaussian elimination.
 * Handles toggle-chain by computing effective connections.
 * For sequence variant, filters solutions to match required order.
 * For timer variant, accounts for auto-toggles based on step count.
 */
export function solveSwitchLight(puzzle: SwitchLightPuzzle): SwitchLightSolverResult {
  const { switchCount, lightCount, initialState, goalState } = puzzle;

  // Use effective connections (accounts for toggle-chain)
  const effectiveConns = buildEffectiveConnections(puzzle);

  // For sequence variant, we need BFS since order matters
  if (puzzle.variant === 'sequence' && puzzle.requiredOrder) {
    return solveSequenceVariant(puzzle, effectiveConns);
  }

  // For timer variant, use BFS since light states change with step count
  if (puzzle.variant === 'timer' && puzzle.timerLights && puzzle.timerLights.length > 0) {
    return solveTimerVariant(puzzle, effectiveConns);
  }

  // Target: which lights need to be toggled
  const target: number[] = [];
  for (let i = 0; i < lightCount; i++) {
    target.push(initialState[i] === goalState[i] ? 0 : 1);
  }

  // Build augmented matrix for GF(2)
  const matrix: number[][] = [];
  for (let light = 0; light < lightCount; light++) {
    const row: number[] = [];
    for (let sw = 0; sw < switchCount; sw++) {
      row.push(effectiveConns[sw][light] ? 1 : 0);
    }
    row.push(target[light]);
    matrix.push(row);
  }

  // Gaussian elimination in GF(2)
  const pivotCol: number[] = [];
  let row = 0;
  for (let col = 0; col < switchCount && row < lightCount; col++) {
    let pivotRow = -1;
    for (let r = row; r < lightCount; r++) {
      if (matrix[r][col] === 1) {
        pivotRow = r;
        break;
      }
    }
    if (pivotRow === -1) continue;

    [matrix[row], matrix[pivotRow]] = [matrix[pivotRow], matrix[row]];
    pivotCol.push(col);

    for (let r = 0; r < lightCount; r++) {
      if (r !== row && matrix[r][col] === 1) {
        for (let c = 0; c <= switchCount; c++) {
          matrix[r][c] ^= matrix[row][c];
        }
      }
    }
    row++;
  }

  for (let r = row; r < lightCount; r++) {
    if (matrix[r][switchCount] === 1) {
      return { solvable: false, solution: [] };
    }
  }

  const solution: number[] = new Array(switchCount).fill(0);
  for (let i = pivotCol.length - 1; i >= 0; i--) {
    const col = pivotCol[i];
    solution[col] = matrix[i][switchCount];
  }

  const pressIndices: number[] = [];
  for (let i = 0; i < switchCount; i++) {
    if (solution[i] === 1) {
      pressIndices.push(i);
    }
  }

  return { solvable: true, solution: pressIndices };
}

/**
 * Solve sequence variant using BFS — switches must be pressed in requiredOrder.
 */
function solveSequenceVariant(
  puzzle: SwitchLightPuzzle,
  effectiveConns: boolean[][]
): SwitchLightSolverResult {
  const { lightCount, goalState, requiredOrder } = puzzle;
  if (!requiredOrder) return { solvable: false, solution: [] };

  // State: current light states + position in the required order
  // At each step, we either press the next required switch or skip it
  const goalKey = goalState.map(b => b ? '1' : '0').join('');

  interface SeqState {
    lights: boolean[];
    orderIdx: number;
    pressed: number[];
  }

  const initial: SeqState = {
    lights: [...puzzle.initialState],
    orderIdx: 0,
    pressed: [],
  };

  // BFS
  const queue: SeqState[] = [initial];
  const visited = new Set<string>();
  visited.add(`${initial.lights.map(b => b ? '1' : '0').join('')}:${0}`);

  while (queue.length > 0) {
    const state = queue.shift()!;
    const lightKey = state.lights.map(b => b ? '1' : '0').join('');

    if (lightKey === goalKey) {
      return { solvable: true, solution: state.pressed };
    }

    if (state.orderIdx >= requiredOrder.length) continue;

    // Option 1: Press the next switch in order
    const sw = requiredOrder[state.orderIdx];
    const newLights = [...state.lights];
    for (let lt = 0; lt < lightCount; lt++) {
      if (effectiveConns[sw][lt]) {
        newLights[lt] = !newLights[lt];
      }
    }
    const key1 = `${newLights.map(b => b ? '1' : '0').join('')}:${state.orderIdx + 1}`;
    if (!visited.has(key1)) {
      visited.add(key1);
      queue.push({
        lights: newLights,
        orderIdx: state.orderIdx + 1,
        pressed: [...state.pressed, sw],
      });
    }

    // Option 2: Skip this switch
    const key2 = `${lightKey}:${state.orderIdx + 1}`;
    if (!visited.has(key2)) {
      visited.add(key2);
      queue.push({
        lights: [...state.lights],
        orderIdx: state.orderIdx + 1,
        pressed: [...state.pressed],
      });
    }
  }

  return { solvable: false, solution: [] };
}

/**
 * Solve timer variant using BFS — some lights auto-toggle after N steps.
 */
function solveTimerVariant(
  puzzle: SwitchLightPuzzle,
  effectiveConns: boolean[][]
): SwitchLightSolverResult {
  const { switchCount, lightCount, goalState, timerLights } = puzzle;
  if (!timerLights) return { solvable: false, solution: [] };

  const goalKey = goalState.map(b => b ? '1' : '0').join('');

  interface TimerState {
    lights: boolean[];
    step: number;
    pressed: number[];
  }

  const initial: TimerState = {
    lights: [...puzzle.initialState],
    step: 0,
    pressed: [],
  };

  const queue: TimerState[] = [initial];
  const visited = new Set<string>();
  visited.add(`${initial.lights.map(b => b ? '1' : '0').join('')}:${0}`);
  const maxSteps = switchCount + 2; // don't search forever

  while (queue.length > 0) {
    const state = queue.shift()!;
    if (state.step > maxSteps) continue;

    const lightKey = state.lights.map(b => b ? '1' : '0').join('');
    if (lightKey === goalKey) {
      return { solvable: true, solution: state.pressed };
    }

    // Try pressing each switch
    for (let sw = 0; sw < switchCount; sw++) {
      const newLights = [...state.lights];
      for (let lt = 0; lt < lightCount; lt++) {
        if (effectiveConns[sw][lt]) {
          newLights[lt] = !newLights[lt];
        }
      }

      // Apply timer toggles
      const newStep = state.step + 1;
      for (const t of timerLights) {
        if (newStep > 0 && newStep % t.interval === 0) {
          newLights[t.lightIndex] = !newLights[t.lightIndex];
        }
      }

      const key = `${newLights.map(b => b ? '1' : '0').join('')}:${newStep}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({
          lights: newLights,
          step: newStep,
          pressed: [...state.pressed, sw],
        });
      }
    }
  }

  return { solvable: false, solution: [] };
}
