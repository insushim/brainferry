import { create } from 'zustand';
import { MAX_FREE_DAILY_PUZZLES, MAX_FREE_DAILY_HINTS } from '@/lib/utils/constants';

interface CategoryStat {
  played: number;
  solved: number;
  bestSteps: number;
  bestTime: number;
}

interface ProgressStore {
  puzzlesPlayed: number;
  puzzlesSolved: number;
  streakDays: number;
  lastPlayedDate: string;
  categoryStats: Record<string, CategoryStat>;
  dailyPuzzlesPlayed: number;
  dailyHintsUsed: number;
  dailyDate: string;

  recordPlay: (category: string) => void;
  recordSolve: (category: string, steps: number, time: number) => void;
  recordHintUse: () => void;
  canPlayDaily: () => boolean;
  canUseHint: () => boolean;
  resetDailyIfNeeded: () => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const STORAGE_KEY = 'bf-progress';

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadProgress(): Partial<ProgressStore> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

export const useProgressStore = create<ProgressStore>((set, get) => {
  const saved = loadProgress();

  return {
    puzzlesPlayed: saved.puzzlesPlayed ?? 0,
    puzzlesSolved: saved.puzzlesSolved ?? 0,
    streakDays: saved.streakDays ?? 0,
    lastPlayedDate: saved.lastPlayedDate ?? '',
    categoryStats: saved.categoryStats ?? {},
    dailyPuzzlesPlayed: saved.dailyPuzzlesPlayed ?? 0,
    dailyHintsUsed: saved.dailyHintsUsed ?? 0,
    dailyDate: saved.dailyDate ?? getToday(),

    recordPlay: (category) => {
      get().resetDailyIfNeeded();
      set((state) => {
        const today = getToday();
        const existing = state.categoryStats[category] ?? {
          played: 0,
          solved: 0,
          bestSteps: Infinity,
          bestTime: Infinity,
        };
        const isNewDay = state.lastPlayedDate !== today;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        const newStreak = isNewDay
          ? state.lastPlayedDate === yesterdayStr
            ? state.streakDays + 1
            : 1
          : state.streakDays;

        const newState = {
          puzzlesPlayed: state.puzzlesPlayed + 1,
          dailyPuzzlesPlayed: state.dailyPuzzlesPlayed + 1,
          lastPlayedDate: today,
          streakDays: newStreak,
          categoryStats: {
            ...state.categoryStats,
            [category]: { ...existing, played: existing.played + 1 },
          },
        };
        return newState;
      });
      get().saveToStorage();
    },

    recordSolve: (category, steps, time) => {
      set((state) => {
        const existing = state.categoryStats[category] ?? {
          played: 0,
          solved: 0,
          bestSteps: Infinity,
          bestTime: Infinity,
        };
        return {
          puzzlesSolved: state.puzzlesSolved + 1,
          categoryStats: {
            ...state.categoryStats,
            [category]: {
              ...existing,
              solved: existing.solved + 1,
              bestSteps: Math.min(existing.bestSteps, steps),
              bestTime: Math.min(existing.bestTime, time),
            },
          },
        };
      });
      get().saveToStorage();
    },

    recordHintUse: () => {
      get().resetDailyIfNeeded();
      set((state) => ({
        dailyHintsUsed: state.dailyHintsUsed + 1,
      }));
      get().saveToStorage();
    },

    canPlayDaily: () => {
      get().resetDailyIfNeeded();
      return get().dailyPuzzlesPlayed < MAX_FREE_DAILY_PUZZLES;
    },

    canUseHint: () => {
      get().resetDailyIfNeeded();
      return get().dailyHintsUsed < MAX_FREE_DAILY_HINTS;
    },

    resetDailyIfNeeded: () => {
      const today = getToday();
      if (get().dailyDate !== today) {
        set({
          dailyPuzzlesPlayed: 0,
          dailyHintsUsed: 0,
          dailyDate: today,
        });
      }
    },

    loadFromStorage: () => {
      const saved = loadProgress();
      set({
        puzzlesPlayed: saved.puzzlesPlayed ?? 0,
        puzzlesSolved: saved.puzzlesSolved ?? 0,
        streakDays: saved.streakDays ?? 0,
        lastPlayedDate: saved.lastPlayedDate ?? '',
        categoryStats: saved.categoryStats ?? {},
        dailyPuzzlesPlayed: saved.dailyPuzzlesPlayed ?? 0,
        dailyHintsUsed: saved.dailyHintsUsed ?? 0,
        dailyDate: saved.dailyDate ?? getToday(),
      });
    },

    saveToStorage: () => {
      if (typeof window === 'undefined') return;
      const state = get();
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            puzzlesPlayed: state.puzzlesPlayed,
            puzzlesSolved: state.puzzlesSolved,
            streakDays: state.streakDays,
            lastPlayedDate: state.lastPlayedDate,
            categoryStats: state.categoryStats,
            dailyPuzzlesPlayed: state.dailyPuzzlesPlayed,
            dailyHintsUsed: state.dailyHintsUsed,
            dailyDate: state.dailyDate,
          })
        );
      } catch {
        // Storage full or unavailable
      }
    },
  };
});
