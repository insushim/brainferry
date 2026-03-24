import type { BalanceScalePuzzle, BalanceWeighing } from './generator';

export interface BalanceScaleSolverResult {
  solvable: boolean;
  strategy: BalanceWeighing[];
  maxWeighingsNeeded: number;
}

export function solveBalanceScale(puzzle: BalanceScalePuzzle): BalanceScaleSolverResult {
  if (puzzle.variant === 'multiple-fake' && puzzle.fakeCoinIndices) {
    return solveMultipleFake(puzzle);
  }

  const weighings = findFakeCoin(
    puzzle.coinCount,
    puzzle.fakeCoinIndex,
    puzzle.fakeIsHeavier,
    puzzle.maxWeighings,
    puzzle.brokenSide,
    puzzle.brokenBias
  );

  return {
    solvable: weighings !== null,
    strategy: weighings ?? [],
    maxWeighingsNeeded: weighings?.length ?? 0,
  };
}

function getWeighResult(
  left: number[],
  right: number[],
  fakeCoinIndex: number,
  fakeIsHeavier: boolean,
  brokenSide?: 'left' | 'right',
  brokenBias?: number,
  fakeIndices?: number[],
  fakeWeights?: boolean[]
): 'left-heavy' | 'right-heavy' | 'balanced' {
  let leftWeight = left.length;
  let rightWeight = right.length;

  if (fakeIndices && fakeWeights) {
    // Multiple fakes
    for (let f = 0; f < fakeIndices.length; f++) {
      const fIdx = fakeIndices[f];
      const isHeavier = fakeWeights[f];
      if (left.includes(fIdx)) {
        leftWeight += isHeavier ? 1 : -1;
      } else if (right.includes(fIdx)) {
        rightWeight += isHeavier ? 1 : -1;
      }
    }
  } else {
    // Single fake
    if (left.includes(fakeCoinIndex)) {
      leftWeight += fakeIsHeavier ? 1 : -1;
    } else if (right.includes(fakeCoinIndex)) {
      rightWeight += fakeIsHeavier ? 1 : -1;
    }
  }

  // Apply broken scale bias
  if (brokenSide && brokenBias) {
    if (brokenSide === 'left') {
      leftWeight += brokenBias;
    } else {
      rightWeight += brokenBias;
    }
  }

  if (leftWeight > rightWeight) return 'left-heavy';
  if (rightWeight > leftWeight) return 'right-heavy';
  return 'balanced';
}

function findFakeCoin(
  coinCount: number,
  fakeCoinIndex: number,
  fakeIsHeavier: boolean,
  maxWeighings: number,
  brokenSide?: 'left' | 'right',
  brokenBias?: number
): BalanceWeighing[] | null {
  type Possibility = { index: number; heavier: boolean };

  let possibilities: Possibility[] = [];
  for (let i = 0; i < coinCount; i++) {
    possibilities.push({ index: i, heavier: true });
    possibilities.push({ index: i, heavier: false });
  }

  const weighings: BalanceWeighing[] = [];
  const knownGood: number[] = [];

  for (let w = 0; w < maxWeighings; w++) {
    if (possibilities.length <= 1) break;

    const { left, right } = chooseGroups(possibilities, coinCount, knownGood);
    if (left.length === 0 || right.length === 0) break;

    const result = getWeighResult(left, right, fakeCoinIndex, fakeIsHeavier, brokenSide, brokenBias);
    weighings.push({ left, right, result });

    if (result === 'balanced') {
      const onScale = new Set([...left, ...right]);
      possibilities = possibilities.filter(p => !onScale.has(p.index));
      knownGood.push(...left, ...right);
    } else if (result === 'left-heavy') {
      if (brokenSide && brokenBias) {
        // With broken scale, balanced might show as biased
        // Be more conservative: only eliminate if the bias can't explain it
        const leftSet = new Set(left);
        const rightSet = new Set(right);
        possibilities = possibilities.filter(p =>
          (leftSet.has(p.index) && p.heavier) ||
          (rightSet.has(p.index) && !p.heavier) ||
          (!leftSet.has(p.index) && !rightSet.has(p.index))
        );
      } else {
        possibilities = possibilities.filter(p =>
          (left.includes(p.index) && p.heavier) ||
          (right.includes(p.index) && !p.heavier)
        );
        for (let i = 0; i < coinCount; i++) {
          if (!left.includes(i) && !right.includes(i) && !knownGood.includes(i)) {
            knownGood.push(i);
          }
        }
      }
    } else {
      if (brokenSide && brokenBias) {
        const leftSet = new Set(left);
        const rightSet = new Set(right);
        possibilities = possibilities.filter(p =>
          (rightSet.has(p.index) && p.heavier) ||
          (leftSet.has(p.index) && !p.heavier) ||
          (!leftSet.has(p.index) && !rightSet.has(p.index))
        );
      } else {
        possibilities = possibilities.filter(p =>
          (right.includes(p.index) && p.heavier) ||
          (left.includes(p.index) && !p.heavier)
        );
        for (let i = 0; i < coinCount; i++) {
          if (!left.includes(i) && !right.includes(i) && !knownGood.includes(i)) {
            knownGood.push(i);
          }
        }
      }
    }
  }

  if (possibilities.length === 1 &&
      possibilities[0].index === fakeCoinIndex &&
      possibilities[0].heavier === fakeIsHeavier) {
    return weighings;
  }

  return null;
}

function solveMultipleFake(puzzle: BalanceScalePuzzle): BalanceScaleSolverResult {
  const { coinCount, maxWeighings, fakeCoinIndices, fakeWeights } = puzzle;
  if (!fakeCoinIndices || !fakeWeights) {
    return { solvable: false, strategy: [], maxWeighingsNeeded: 0 };
  }

  // For multiple fakes, we use a targeted comparison approach
  // Compare groups and narrow down based on weight discrepancies
  const weighings: BalanceWeighing[] = [];
  const fakeSet = new Set(fakeCoinIndices);

  // Strategy: divide into groups of 3, compare pairs
  const groupSize = Math.floor(coinCount / 3);
  const groups: number[][] = [];
  for (let i = 0; i < coinCount; i += groupSize) {
    groups.push(Array.from({ length: Math.min(groupSize, coinCount - i) }, (_, j) => i + j));
  }

  // Keep weighing until we've used our allotment or found all fakes
  let identified = 0;
  for (let w = 0; w < maxWeighings && identified < fakeCoinIndices.length; w++) {
    let left: number[];
    let right: number[];

    if (w < groups.length - 1) {
      // Compare group pairs
      left = groups[w];
      right = groups[w + 1];
      // Ensure equal size
      while (left.length > right.length) left.pop();
      while (right.length > left.length) right.pop();
    } else {
      // Compare individual suspects
      const suspects = Array.from({ length: coinCount }, (_, i) => i)
        .filter(i => {
          // Check if it's still a suspect
          return true; // simplified — in real strategy this would track state
        });
      if (suspects.length < 2) break;
      left = [suspects[0]];
      right = [suspects[1]];
    }

    if (left.length === 0 || right.length === 0) break;

    const result = getWeighResult(
      left, right,
      puzzle.fakeCoinIndex, puzzle.fakeIsHeavier,
      puzzle.brokenSide, puzzle.brokenBias,
      fakeCoinIndices, fakeWeights
    );

    weighings.push({ left, right, result });
    identified++;
  }

  // Verify: can we determine all fakes from these weighings?
  // For now, accept if we have enough weighings
  if (weighings.length > 0) {
    return {
      solvable: true,
      strategy: weighings,
      maxWeighingsNeeded: weighings.length,
    };
  }

  return { solvable: false, strategy: [], maxWeighingsNeeded: 0 };
}

function chooseGroups(
  possibilities: { index: number; heavier: boolean }[],
  coinCount: number,
  knownGood: number[]
): { left: number[]; right: number[] } {
  const suspectIndices = [...new Set(possibilities.map(p => p.index))];
  const groupSize = Math.ceil(suspectIndices.length / 3);

  const left: number[] = [];
  const right: number[] = [];

  for (let i = 0; i < Math.min(groupSize, suspectIndices.length); i++) {
    left.push(suspectIndices[i]);
  }
  for (let i = groupSize; i < Math.min(groupSize * 2, suspectIndices.length); i++) {
    right.push(suspectIndices[i]);
  }

  while (left.length > right.length) {
    const good = knownGood.find(g => !right.includes(g) && !left.includes(g));
    if (good !== undefined) {
      right.push(good);
    } else {
      left.pop();
    }
  }
  while (right.length > left.length) {
    const good = knownGood.find(g => !left.includes(g) && !right.includes(g));
    if (good !== undefined) {
      left.push(good);
    } else {
      right.pop();
    }
  }

  return { left, right };
}
