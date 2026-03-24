import type { LogicGridPuzzle } from './generator';

export type CellMark = 'true' | 'false' | 'unknown';

export interface LogicGridState {
  // grid[catA:catB][itemA][itemB] = mark
  grid: Record<string, Record<string, Record<string, CellMark>>>;
  steps: number;
  moveHistory: LogicGridMove[];
  isComplete: boolean;
  isFailed: boolean;
}

export interface LogicGridMove {
  catA: string;
  itemA: string;
  catB: string;
  itemB: string;
  mark: CellMark;
  previousMark: CellMark;
}

export function createInitialState(puzzle: LogicGridPuzzle): LogicGridState {
  const grid: Record<string, Record<string, Record<string, CellMark>>> = {};

  for (let i = 0; i < puzzle.categories.length; i++) {
    for (let j = i + 1; j < puzzle.categories.length; j++) {
      const catA = puzzle.categories[i];
      const catB = puzzle.categories[j];
      const key = `${catA.id}:${catB.id}`;
      grid[key] = {};
      for (const itemA of catA.items) {
        grid[key][itemA] = {};
        for (const itemB of catB.items) {
          grid[key][itemA][itemB] = 'unknown';
        }
      }
    }
  }

  return {
    grid,
    steps: 0,
    moveHistory: [],
    isComplete: false,
    isFailed: false,
  };
}

function getGridKey(state: LogicGridState, catA: string, catB: string): string | null {
  const key1 = `${catA}:${catB}`;
  const key2 = `${catB}:${catA}`;
  if (state.grid[key1]) return key1;
  if (state.grid[key2]) return key2;
  return null;
}

export function setMark(
  state: LogicGridState,
  catA: string,
  itemA: string,
  catB: string,
  itemB: string,
  mark: CellMark,
  puzzle: LogicGridPuzzle
): LogicGridState {
  const key = getGridKey(state, catA, catB);
  if (!key) return state;

  const [keyCatA, keyCatB] = key.split(':');
  let rowItem: string;
  let colItem: string;

  if (keyCatA === catA) {
    rowItem = itemA;
    colItem = itemB;
  } else {
    rowItem = itemB;
    colItem = itemA;
  }

  const previousMark = state.grid[key]?.[rowItem]?.[colItem] ?? 'unknown';
  if (previousMark === mark) return state;

  const newGrid = JSON.parse(JSON.stringify(state.grid));
  newGrid[key][rowItem][colItem] = mark;

  // Auto-eliminate: if mark is 'true', mark others in same row/col as 'false'
  if (mark === 'true') {
    const catAItems = Object.keys(newGrid[key]);
    const catBItems = Object.keys(newGrid[key][rowItem]);

    for (const otherRow of catAItems) {
      if (otherRow !== rowItem) {
        newGrid[key][otherRow][colItem] = 'false';
      }
    }
    for (const otherCol of catBItems) {
      if (otherCol !== colItem) {
        newGrid[key][rowItem][otherCol] = 'false';
      }
    }
  }

  // Check if a row has only one 'unknown' left and all others are 'false'
  autoComplete(newGrid, key);

  const move: LogicGridMove = {
    catA: keyCatA,
    itemA: rowItem,
    catB: keyCatB,
    itemB: colItem,
    mark,
    previousMark,
  };

  const isComplete = checkComplete(newGrid, puzzle);

  return {
    grid: newGrid,
    steps: state.steps + 1,
    moveHistory: [...state.moveHistory, move],
    isComplete,
    isFailed: false,
  };
}

function autoComplete(
  grid: Record<string, Record<string, Record<string, CellMark>>>,
  key: string
): void {
  const subGrid = grid[key];
  if (!subGrid) return;

  const rows = Object.keys(subGrid);
  if (rows.length === 0) return;
  const cols = Object.keys(subGrid[rows[0]]);

  // Check rows
  for (const row of rows) {
    const unknowns = cols.filter(c => subGrid[row][c] === 'unknown');
    if (unknowns.length === 1) {
      subGrid[row][unknowns[0]] = 'true';
      // Eliminate column
      for (const otherRow of rows) {
        if (otherRow !== row) {
          subGrid[otherRow][unknowns[0]] = 'false';
        }
      }
    }
  }

  // Check columns
  for (const col of cols) {
    const unknowns = rows.filter(r => subGrid[r][col] === 'unknown');
    if (unknowns.length === 1) {
      subGrid[unknowns[0]][col] = 'true';
      // Eliminate row
      for (const otherCol of cols) {
        if (otherCol !== col) {
          subGrid[unknowns[0]][otherCol] = 'false';
        }
      }
    }
  }
}

function checkComplete(
  grid: Record<string, Record<string, Record<string, CellMark>>>,
  puzzle: LogicGridPuzzle
): boolean {
  for (const key of Object.keys(grid)) {
    const subGrid = grid[key];
    for (const row of Object.keys(subGrid)) {
      const trueCount = Object.values(subGrid[row]).filter(v => v === 'true').length;
      if (trueCount !== 1) return false;
    }
  }

  // Verify against solution
  const primaryCat = puzzle.categories[0];
  for (const item of primaryCat.items) {
    const expected = puzzle.solution[item];
    if (!expected) return false;

    for (let i = 1; i < puzzle.categories.length; i++) {
      const cat = puzzle.categories[i];
      const key1 = `${primaryCat.id}:${cat.id}`;
      const key2 = `${cat.id}:${primaryCat.id}`;
      const key = grid[key1] ? key1 : key2;
      const subGrid = grid[key];
      if (!subGrid) return false;

      if (grid[key1]) {
        // rows = primaryCat items, cols = cat items
        const trueCol = Object.entries(subGrid[item]).find(([, v]) => v === 'true');
        if (!trueCol || trueCol[0] !== expected[cat.id]) return false;
      } else {
        // rows = cat items, cols = primaryCat items
        for (const [catItem, marks] of Object.entries(subGrid)) {
          if (marks[item] === 'true' && catItem !== expected[cat.id]) return false;
        }
      }
    }
  }

  return true;
}

export function undo(state: LogicGridState): LogicGridState {
  if (state.moveHistory.length === 0) return state;

  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  const newGrid = JSON.parse(JSON.stringify(state.grid));
  const key = `${lastMove.catA}:${lastMove.catB}`;

  if (newGrid[key]) {
    newGrid[key][lastMove.itemA][lastMove.itemB] = lastMove.previousMark;
  }

  return {
    grid: newGrid,
    steps: state.steps - 1,
    moveHistory: state.moveHistory.slice(0, -1),
    isComplete: false,
    isFailed: false,
  };
}
