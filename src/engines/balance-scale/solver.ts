import type { BalanceScalePuzzle, BalanceWeighing } from './generator';

export interface BalanceScaleSolverResult {
  solvable: boolean;
  strategy: BalanceWeighing[];
  maxWeighingsNeeded: number;
}

/**
 * Generate optimal weighing strategy for finding the fake coin.
 * Uses ternary search / information-theoretic approach.
 *
 * For n coins with 1 fake (heavier or lighter), we need ceil(log3(2n)) weighings.
 * The strategy divides coins into 3 groups and narrows down possibilities.
 */
export function solveBalanceScale(puzzle: BalanceScalePuzzle): BalanceScaleSolverResult {
  const { coinCount, fakeCoinIndex, fakeIsHeavier, maxWeighings } = puzzle;

  // Generate the specific weighing sequence for this puzzle's fake coin
  const weighings = findFakeCoin(coinCount, fakeCoinIndex, fakeIsHeavier, maxWeighings);

  return {
    solvable: weighings !== null,
    strategy: weighings ?? [],
    maxWeighingsNeeded: weighings?.length ?? 0,
  };
}

function findFakeCoin(
  coinCount: number,
  fakeCoinIndex: number,
  fakeIsHeavier: boolean,
  maxWeighings: number
): BalanceWeighing[] | null {
  // Track which coins could be the fake one
  type Possibility = { index: number; heavier: boolean };

  let possibilities: Possibility[] = [];
  for (let i = 0; i < coinCount; i++) {
    possibilities.push({ index: i, heavier: true });
    possibilities.push({ index: i, heavier: false });
  }

  const weighings: BalanceWeighing[] = [];
  const knownGood: number[] = []; // coins proven to be real

  for (let w = 0; w < maxWeighings; w++) {
    if (possibilities.length <= 1) break;

    // Choose groups to weigh
    const { left, right } = chooseGroups(possibilities, coinCount, knownGood);
    if (left.length === 0 || right.length === 0) break;

    // Determine the actual result based on the fake coin
    let result: 'left-heavy' | 'right-heavy' | 'balanced';
    if (left.includes(fakeCoinIndex)) {
      result = fakeIsHeavier ? 'left-heavy' : 'right-heavy';
    } else if (right.includes(fakeCoinIndex)) {
      result = fakeIsHeavier ? 'right-heavy' : 'left-heavy';
    } else {
      result = 'balanced';
    }

    weighings.push({ left, right, result });

    // Filter possibilities based on result
    if (result === 'balanced') {
      // Fake coin is not on the scale
      const onScale = new Set([...left, ...right]);
      possibilities = possibilities.filter(p => !onScale.has(p.index));
      knownGood.push(...left, ...right);
    } else if (result === 'left-heavy') {
      // Fake coin is heavier and on left, or lighter and on right
      possibilities = possibilities.filter(p =>
        (left.includes(p.index) && p.heavier) ||
        (right.includes(p.index) && !p.heavier)
      );
      // Coins not on scale are known good
      for (let i = 0; i < coinCount; i++) {
        if (!left.includes(i) && !right.includes(i) && !knownGood.includes(i)) {
          knownGood.push(i);
        }
      }
    } else {
      // right-heavy
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

  if (possibilities.length === 1 &&
      possibilities[0].index === fakeCoinIndex &&
      possibilities[0].heavier === fakeIsHeavier) {
    return weighings;
  }

  return null;
}

function chooseGroups(
  possibilities: { index: number; heavier: boolean }[],
  coinCount: number,
  knownGood: number[]
): { left: number[]; right: number[] } {
  // Get unique coin indices from possibilities
  const suspectIndices = [...new Set(possibilities.map(p => p.index))];

  // Try to divide into roughly 3 equal groups for maximum information
  const groupSize = Math.ceil(suspectIndices.length / 3);

  const left: number[] = [];
  const right: number[] = [];

  // Put first third on left, second third on right
  for (let i = 0; i < Math.min(groupSize, suspectIndices.length); i++) {
    left.push(suspectIndices[i]);
  }
  for (let i = groupSize; i < Math.min(groupSize * 2, suspectIndices.length); i++) {
    right.push(suspectIndices[i]);
  }

  // Balance the scales: left and right must have same number of coins
  while (left.length > right.length) {
    // Add a known good coin to the right
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
