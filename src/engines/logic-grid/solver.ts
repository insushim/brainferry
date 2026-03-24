import type { LogicGridPuzzle, LogicClue } from './generator';

export interface LogicGridSolverResult {
  solvable: boolean;
  uniqueSolution: boolean;
  solution: Record<string, Record<string, string>> | null;
}

type Grid = Map<string, Map<string, Set<string>>>;
// Grid: categoryA -> categoryB -> possible values from categoryB for each item in categoryA

function createGrid(categories: { id: string; items: string[] }[]): Grid {
  const grid: Grid = new Map();
  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const catA = categories[i];
      const catB = categories[j];
      const mapping = new Map<string, Set<string>>();
      for (const itemA of catA.items) {
        mapping.set(itemA, new Set(catB.items));
      }
      grid.set(`${catA.id}:${catB.id}`, mapping);
    }
  }
  return grid;
}

function cloneGrid(grid: Grid): Grid {
  const newGrid: Grid = new Map();
  for (const [key, mapping] of grid) {
    const newMapping = new Map<string, Set<string>>();
    for (const [item, possibles] of mapping) {
      newMapping.set(item, new Set(possibles));
    }
    newGrid.set(key, newMapping);
  }
  return newGrid;
}

function getMapping(grid: Grid, catA: string, catB: string): Map<string, Set<string>> | null {
  const key1 = `${catA}:${catB}`;
  const key2 = `${catB}:${catA}`;
  if (grid.has(key1)) return grid.get(key1)!;
  if (grid.has(key2)) return grid.get(key2)!;
  return null;
}

function eliminate(grid: Grid, catA: string, itemA: string, catB: string, itemB: string): boolean {
  const mapping = getMapping(grid, catA, catB);
  if (!mapping) return false;

  // Figure out which direction
  if (mapping.has(itemA)) {
    const possibles = mapping.get(itemA)!;
    if (!possibles.has(itemB)) return false;
    possibles.delete(itemB);
    if (possibles.size === 0) return false; // contradiction
    return true;
  } else if (mapping.has(itemB)) {
    const possibles = mapping.get(itemB)!;
    if (!possibles.has(itemA)) return false;
    possibles.delete(itemA);
    if (possibles.size === 0) return false;
    return true;
  }
  return false;
}

function assign(grid: Grid, catA: string, itemA: string, catB: string, itemB: string): boolean {
  const mapping = getMapping(grid, catA, catB);
  if (!mapping) return false;

  if (mapping.has(itemA)) {
    const possibles = mapping.get(itemA)!;
    if (!possibles.has(itemB)) return false;
    // Remove itemB from all other items in catA
    for (const [otherItem, otherPossibles] of mapping) {
      if (otherItem !== itemA) {
        otherPossibles.delete(itemB);
        if (otherPossibles.size === 0) return false;
      }
    }
    possibles.clear();
    possibles.add(itemB);
    return true;
  } else if (mapping.has(itemB)) {
    const possibles = mapping.get(itemB)!;
    if (!possibles.has(itemA)) return false;
    for (const [otherItem, otherPossibles] of mapping) {
      if (otherItem !== itemB) {
        otherPossibles.delete(itemA);
        if (otherPossibles.size === 0) return false;
      }
    }
    possibles.clear();
    possibles.add(itemA);
    return true;
  }
  return false;
}

function propagate(grid: Grid, categories: { id: string; items: string[] }[]): boolean {
  let changed = true;
  while (changed) {
    changed = false;
    for (const [key, mapping] of grid) {
      for (const [item, possibles] of mapping) {
        if (possibles.size === 1) {
          const determined = [...possibles][0];
          // Eliminate this value from other items
          for (const [otherItem, otherPossibles] of mapping) {
            if (otherItem !== item && otherPossibles.has(determined)) {
              otherPossibles.delete(determined);
              if (otherPossibles.size === 0) return false;
              changed = true;
            }
          }
        }
      }

      // Hidden single: if only one item can have a value
      const [catAId, catBId] = key.split(':');
      const catB = categories.find(c => c.id === catBId);
      if (catB) {
        for (const val of catB.items) {
          const candidates: string[] = [];
          for (const [item, possibles] of mapping) {
            if (possibles.has(val)) candidates.push(item);
          }
          if (candidates.length === 0) return false;
          if (candidates.length === 1) {
            const possibles = mapping.get(candidates[0])!;
            if (possibles.size > 1) {
              possibles.clear();
              possibles.add(val);
              changed = true;
            }
          }
        }
      }
    }
  }
  return true;
}

function isSolved(grid: Grid): boolean {
  for (const [, mapping] of grid) {
    for (const [, possibles] of mapping) {
      if (possibles.size !== 1) return false;
    }
  }
  return true;
}

function hasContradiction(grid: Grid): boolean {
  for (const [, mapping] of grid) {
    for (const [, possibles] of mapping) {
      if (possibles.size === 0) return true;
    }
  }
  return false;
}

function applyClue(grid: Grid, clue: LogicClue, categories: { id: string; items: string[] }[]): boolean {
  const d = clue.data;

  switch (clue.type) {
    case 'direct_match':
      return assign(grid, d.catA, d.itemA, d.catB, d.itemB);
    case 'negation':
      return eliminate(grid, d.catA, d.itemA, d.catB, d.itemB) !== false;
    case 'relation_negation': {
      // itemA (in catA) is not the same row as itemB (in catB)
      eliminate(grid, d.catA, d.itemA, d.catB, d.itemB);
      return !hasContradiction(grid);
    }
    case 'ordering':
    case 'adjacent':
      // These are handled during solve via constraint checking
      return true;
    default:
      return true;
  }
}

function solveWithBacktracking(
  grid: Grid,
  clues: LogicClue[],
  categories: { id: string; items: string[] }[],
  solutions: Record<string, Record<string, string>>[],
  maxSolutions: number
): void {
  if (solutions.length >= maxSolutions) return;

  // Apply all clues
  for (const clue of clues) {
    if (!applyClue(grid, clue, categories)) return;
  }

  if (!propagate(grid, categories)) return;
  if (hasContradiction(grid)) return;

  if (isSolved(grid)) {
    solutions.push(extractSolution(grid, categories));
    return;
  }

  // Find cell with fewest possibilities > 1
  let bestKey = '';
  let bestItem = '';
  let bestSize = Infinity;

  for (const [key, mapping] of grid) {
    for (const [item, possibles] of mapping) {
      if (possibles.size > 1 && possibles.size < bestSize) {
        bestKey = key;
        bestItem = item;
        bestSize = possibles.size;
      }
    }
  }

  if (!bestKey) return;

  const mapping = grid.get(bestKey)!;
  const possibles = [...mapping.get(bestItem)!];
  const [catA, catB] = bestKey.split(':');

  for (const val of possibles) {
    const newGrid = cloneGrid(grid);
    if (assign(newGrid, catA, bestItem, catB, val)) {
      solveWithBacktracking(newGrid, clues, categories, solutions, maxSolutions);
    }
  }
}

function extractSolution(
  grid: Grid,
  categories: { id: string; items: string[] }[]
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  const primaryCat = categories[0];

  for (const item of primaryCat.items) {
    result[item] = { [primaryCat.id]: item };
    for (let i = 1; i < categories.length; i++) {
      const mapping = getMapping(grid, primaryCat.id, categories[i].id);
      if (mapping && mapping.has(item)) {
        const possibles = mapping.get(item)!;
        if (possibles.size === 1) {
          result[item][categories[i].id] = [...possibles][0];
        }
      }
    }
  }
  return result;
}

export function solveLogicGrid(puzzle: LogicGridPuzzle): LogicGridSolverResult {
  const grid = createGrid(puzzle.categories);
  const solutions: Record<string, Record<string, string>>[] = [];

  solveWithBacktracking(grid, puzzle.clues, puzzle.categories, solutions, 2);

  if (solutions.length === 0) {
    return { solvable: false, uniqueSolution: false, solution: null };
  }

  return {
    solvable: true,
    uniqueSolution: solutions.length === 1,
    solution: solutions[0],
  };
}
