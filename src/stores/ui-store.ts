import { create } from 'zustand';

interface UIStore {
  theme: 'dark' | 'light';
  locale: 'ko' | 'en';
  soundEnabled: boolean;
  volume: number;
  showTutorial: boolean;

  toggleTheme: () => void;
  setLocale: (l: 'ko' | 'en') => void;
  toggleSound: () => void;
  setVolume: (v: number) => void;
  setShowTutorial: (s: boolean) => void;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

export const useUIStore = create<UIStore>((set) => ({
  theme: loadFromStorage<'dark' | 'light'>('bf-theme', 'dark'),
  locale: loadFromStorage<'ko' | 'en'>('bf-locale', 'ko'),
  soundEnabled: loadFromStorage<boolean>('bf-sound', true),
  volume: loadFromStorage<number>('bf-volume', 0.5),
  showTutorial: false,

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      saveToStorage('bf-theme', next);
      return { theme: next };
    }),

  setLocale: (l) => {
    saveToStorage('bf-locale', l);
    set({ locale: l });
  },

  toggleSound: () =>
    set((state) => {
      const next = !state.soundEnabled;
      saveToStorage('bf-sound', next);
      return { soundEnabled: next };
    }),

  setVolume: (v) => {
    const clamped = Math.max(0, Math.min(1, v));
    saveToStorage('bf-volume', clamped);
    set({ volume: clamped });
  },

  setShowTutorial: (s) => set({ showTutorial: s }),
}));
