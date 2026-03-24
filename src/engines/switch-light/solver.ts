import type { SwitchLightPuzzle } from './generator';

export interface SwitchLightSolverResult {
  solvable: boolean;
  solution: number[]; // switch indices to press
}

/**
 * Solve switch-light puzzle using GF(2) Gaussian elimination.
 * Each switch toggles certain lights (XOR). We need to find which
 * switches to press to transform initialState into goalState.
 */
export function solveSwitchLight(puzzle: SwitchLightPuzzle): SwitchLightSolverResult {
  const { switchCount, lightCount, connections, initialState, goalState } = puzzle;

  // Target: which lights need to be toggled
  const target: number[] = [];
  for (let i = 0; i < lightCount; i++) {
    target.push(initialState[i] === goalState[i] ? 0 : 1);
  }

  // Build augmented matrix for GF(2):
  // Each row represents a light equation
  // Columns = switches + 1 (augmented with target)
  const matrix: number[][] = [];
  for (let light = 0; light < lightCount; light++) {
    const row: number[] = [];
    for (let sw = 0; sw < switchCount; sw++) {
      row.push(connections[sw][light] ? 1 : 0);
    }
    row.push(target[light]);
    matrix.push(row);
  }

  // Gaussian elimination in GF(2)
  const pivotCol: number[] = [];
  let row = 0;
  for (let col = 0; col < switchCount && row < lightCount; col++) {
    // Find pivot row
    let pivotRow = -1;
    for (let r = row; r < lightCount; r++) {
      if (matrix[r][col] === 1) {
        pivotRow = r;
        break;
      }
    }
    if (pivotRow === -1) continue;

    // Swap rows
    [matrix[row], matrix[pivotRow]] = [matrix[pivotRow], matrix[row]];
    pivotCol.push(col);

    // Eliminate other rows
    for (let r = 0; r < lightCount; r++) {
      if (r !== row && matrix[r][col] === 1) {
        for (let c = 0; c <= switchCount; c++) {
          matrix[r][c] ^= matrix[row][c];
        }
      }
    }
    row++;
  }

  // Check for inconsistency: row with all zeros except augmented column
  for (let r = row; r < lightCount; r++) {
    if (matrix[r][switchCount] === 1) {
      return { solvable: false, solution: [] };
    }
  }

  // Back-substitute to find solution
  const solution: number[] = new Array(switchCount).fill(0);
  for (let i = pivotCol.length - 1; i >= 0; i--) {
    const col = pivotCol[i];
    solution[col] = matrix[i][switchCount];
  }

  // Return indices of switches to press
  const pressIndices: number[] = [];
  for (let i = 0; i < switchCount; i++) {
    if (solution[i] === 1) {
      pressIndices.push(i);
    }
  }

  return { solvable: true, solution: pressIndices };
}
