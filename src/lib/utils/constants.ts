export const APP_NAME = 'BrainFerry';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = '무한한 두뇌 퍼즐, 매번 새로운 도전';

export const GITHUB_REPO = 'insushim/brainferry';
export const GITHUB_RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export const MAX_FREE_DAILY_PUZZLES = 5;
export const MAX_FREE_DAILY_HINTS = 3;

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: '매우 쉬움',
  2: '쉬움',
  3: '쉬움',
  4: '보통',
  5: '보통',
  6: '보통',
  7: '어려움',
  8: '어려움',
  9: '매우 어려움',
  10: '극한',
};

export const STAR_THRESHOLDS = {
  three: 1.0,
  two: 1.5,
  one: 2.0,
} as const;
