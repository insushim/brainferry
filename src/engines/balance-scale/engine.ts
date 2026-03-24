import type { BalanceScalePuzzle, BalanceWeighing } from './generator';

export interface BalanceScaleState {
  weighings: BalanceWeighing[];
  steps: number;
  moveHistory: BalanceWeighing[];
  eliminatedCoins: Set<number>;
  suspectedCoins: Set<number>;
  answer: { coinIndex: number; isHeavier: boolean } | null;
  isComplete: boolean;
  isFailed: boolean;
  failReason?: string;
}

export function createInitialState(puzzle: BalanceScalePuzzle): BalanceScaleState {
  return {
    weighings: [],
    steps: 0,
    moveHistory: [],
    eliminatedCoins: new Set(),
    suspectedCoins: new Set(Array.from({ length: puzzle.coinCount }, (_, i) => i)),
    answer: null,
    isComplete: false,
    isFailed: false,
  };
}

export function weigh(
  state: BalanceScaleState,
  left: number[],
  right: number[],
  puzzle: BalanceScalePuzzle
): BalanceScaleState | { error: string } {
  if (left.length === 0 || right.length === 0) {
    return { error: '양쪽 저울에 최소 1개 이상의 동전을 올려야 합니다.' };
  }
  if (left.length !== right.length) {
    return { error: '양쪽 저울에 같은 수의 동전을 올려야 합니다.' };
  }

  const overlap = left.filter(c => right.includes(c));
  if (overlap.length > 0) {
    return { error: '같은 동전을 양쪽에 올릴 수 없습니다.' };
  }

  if (state.steps >= puzzle.maxWeighings) {
    return { error: `최대 측정 횟수(${puzzle.maxWeighings}회)를 초과했습니다.` };
  }

  // Determine result
  let result: 'left-heavy' | 'right-heavy' | 'balanced';
  if (left.includes(puzzle.fakeCoinIndex)) {
    result = puzzle.fakeIsHeavier ? 'left-heavy' : 'right-heavy';
  } else if (right.includes(puzzle.fakeCoinIndex)) {
    result = puzzle.fakeIsHeavier ? 'right-heavy' : 'left-heavy';
  } else {
    result = 'balanced';
  }

  const weighing: BalanceWeighing = { left, right, result };

  return {
    weighings: [...state.weighings, weighing],
    steps: state.steps + 1,
    moveHistory: [...state.moveHistory, weighing],
    eliminatedCoins: state.eliminatedCoins,
    suspectedCoins: state.suspectedCoins,
    answer: null,
    isComplete: false,
    isFailed: false,
  };
}

export function submitAnswer(
  state: BalanceScaleState,
  coinIndex: number,
  isHeavier: boolean,
  puzzle: BalanceScalePuzzle
): BalanceScaleState | { error: string } {
  if (coinIndex < 0 || coinIndex >= puzzle.coinCount) {
    return { error: `유효하지 않은 동전 번호: ${coinIndex}` };
  }

  const isCorrect = coinIndex === puzzle.fakeCoinIndex && isHeavier === puzzle.fakeIsHeavier;

  return {
    ...state,
    answer: { coinIndex, isHeavier },
    isComplete: isCorrect,
    isFailed: !isCorrect,
    failReason: !isCorrect
      ? `오답입니다! 가짜 동전은 ${puzzle.fakeCoinIndex + 1}번이고, ${puzzle.fakeIsHeavier ? '더 무겁습니다' : '더 가볍습니다'}.`
      : undefined,
  };
}

export function undo(state: BalanceScaleState): BalanceScaleState {
  if (state.moveHistory.length === 0) return state;

  return {
    weighings: state.weighings.slice(0, -1),
    steps: state.steps - 1,
    moveHistory: state.moveHistory.slice(0, -1),
    eliminatedCoins: state.eliminatedCoins,
    suspectedCoins: state.suspectedCoins,
    answer: null,
    isComplete: false,
    isFailed: false,
  };
}
