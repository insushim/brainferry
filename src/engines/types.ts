export type CategoryId =
  | 'river-crossing'
  | 'escort-mission'
  | 'bridge-torch'
  | 'water-jug'
  | 'tower-hanoi'
  | 'bodyguard'
  | 'logic-grid'
  | 'switch-light'
  | 'balance-scale'
  | 'sequence-sort';

export interface CategoryInfo {
  id: CategoryId;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'river-crossing', name: '강건너기', emoji: '🚣', description: '엔티티를 안전하게 강 건너편으로 옮기세요', color: '#3B82F6' },
  { id: 'escort-mission', name: '호위 임무', emoji: '⚔️', description: '두 그룹의 균형을 유지하며 이동하세요', color: '#EF4444' },
  { id: 'bridge-torch', name: '다리와 횃불', emoji: '🔥', description: '제한 시간 안에 모두 다리를 건너세요', color: '#F59E0B' },
  { id: 'water-jug', name: '물통 퍼즐', emoji: '🫗', description: '물통을 사용해 정확한 양을 측정하세요', color: '#06B6D4' },
  { id: 'tower-hanoi', name: '하노이 탑', emoji: '🗼', description: '규칙에 맞게 원반을 옮기세요', color: '#8B5CF6' },
  { id: 'bodyguard', name: '보디가드', emoji: '🛡️', description: '보호 관계를 유지하며 이동하세요', color: '#10B981' },
  { id: 'logic-grid', name: '논리 격자', emoji: '🧩', description: '단서를 분석해 정답을 찾으세요', color: '#EC4899' },
  { id: 'switch-light', name: '스위치 & 전등', emoji: '💡', description: '스위치를 조작해 모든 전등을 켜세요', color: '#F97316' },
  { id: 'balance-scale', name: '무게 저울', emoji: '⚖️', description: '최소 측정으로 가짜 동전을 찾으세요', color: '#6366F1' },
  { id: 'sequence-sort', name: '순서 정렬', emoji: '🔢', description: '제한된 연산으로 순서를 맞추세요', color: '#14B8A6' },
];

export interface BasePuzzle {
  seed: number;
  difficulty: number;
  category: CategoryId;
  optimalSteps: number;
  story: string;
  rules: string[];
  hints: string[];
}

export interface PuzzleState {
  isComplete: boolean;
  isFailed: boolean;
  steps: number;
  moveHistory: unknown[];
}

export interface GameProgress {
  puzzlesPlayed: number;
  puzzlesSolved: number;
  bestTimes: Record<string, number>;
  streakDays: number;
  lastPlayedDate: string;
  categoryStats: Record<CategoryId, { played: number; solved: number; bestSteps: number }>;
}
