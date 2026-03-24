import { create } from 'zustand';

interface PuzzleStore {
  // Current puzzle
  currentCategory: string | null;
  currentDifficulty: number;
  currentSeed: number;
  isPlaying: boolean;
  isPaused: boolean;

  // Timer
  elapsedTime: number;
  timerInterval: number | null;

  // Hints
  hintsUsed: number;
  showHint: boolean;
  currentHintIndex: number;

  // Actions
  startPuzzle: (category: string, difficulty: number, seed?: number) => void;
  pausePuzzle: () => void;
  resumePuzzle: () => void;
  resetPuzzle: () => void;
  completePuzzle: (steps: number, optimalSteps: number) => void;
  useHint: () => void;
  hideHint: () => void;
  tick: () => void;
  setDifficulty: (d: number) => void;
}

export const usePuzzleStore = create<PuzzleStore>((set, get) => ({
  currentCategory: null,
  currentDifficulty: 1,
  currentSeed: 0,
  isPlaying: false,
  isPaused: false,

  elapsedTime: 0,
  timerInterval: null,

  hintsUsed: 0,
  showHint: false,
  currentHintIndex: 0,

  startPuzzle: (category, difficulty, seed) => {
    const state = get();
    if (state.timerInterval !== null) {
      window.clearInterval(state.timerInterval);
    }
    const newSeed = seed ?? Math.floor(Math.random() * 2147483647);
    const interval = window.setInterval(() => {
      const s = get();
      if (s.isPlaying && !s.isPaused) {
        set({ elapsedTime: s.elapsedTime + 1 });
      }
    }, 1000);
    set({
      currentCategory: category,
      currentDifficulty: difficulty,
      currentSeed: newSeed,
      isPlaying: true,
      isPaused: false,
      elapsedTime: 0,
      timerInterval: interval,
      hintsUsed: 0,
      showHint: false,
      currentHintIndex: 0,
    });
  },

  pausePuzzle: () => {
    set({ isPaused: true });
  },

  resumePuzzle: () => {
    set({ isPaused: false });
  },

  resetPuzzle: () => {
    const state = get();
    if (state.timerInterval !== null) {
      window.clearInterval(state.timerInterval);
    }
    set({
      isPlaying: false,
      isPaused: false,
      elapsedTime: 0,
      timerInterval: null,
      hintsUsed: 0,
      showHint: false,
      currentHintIndex: 0,
    });
  },

  completePuzzle: (_steps, _optimalSteps) => {
    const state = get();
    if (state.timerInterval !== null) {
      window.clearInterval(state.timerInterval);
    }
    set({
      isPlaying: false,
      isPaused: false,
      timerInterval: null,
    });
  },

  useHint: () => {
    set((state) => ({
      hintsUsed: state.hintsUsed + 1,
      showHint: true,
      currentHintIndex: state.hintsUsed,
    }));
  },

  hideHint: () => {
    set({ showHint: false });
  },

  tick: () => {
    set((state) => ({ elapsedTime: state.elapsedTime + 1 }));
  },

  setDifficulty: (d) => {
    set({ currentDifficulty: Math.max(1, Math.min(10, d)) });
  },
}));
