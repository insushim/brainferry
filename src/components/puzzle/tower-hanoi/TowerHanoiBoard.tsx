'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateHanoi } from '@/engines/tower-hanoi/generator';
import {
  createInitialState,
  applyMove,
  undo,
  type HanoiState,
} from '@/engines/tower-hanoi/engine';
import { useAudio } from '@/hooks/useAudio';

interface TowerHanoiBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

const DISC_GRADIENTS = [
  'from-red-400 to-red-600',
  'from-orange-400 to-orange-600',
  'from-yellow-400 to-yellow-600',
  'from-green-400 to-green-600',
  'from-blue-400 to-blue-600',
  'from-indigo-400 to-indigo-600',
  'from-purple-400 to-purple-600',
  'from-pink-400 to-pink-600',
];

export function TowerHanoiBoard({ difficulty, seed, onComplete, onFail }: TowerHanoiBoardProps) {
  const puzzle = useMemo(() => generateHanoi(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<HanoiState>(() => createInitialState(puzzle));
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const { playPlace, playError, playClick, playSuccess } = useAudio();

  useEffect(() => {
    if (state.isComplete) {
      playSuccess();
      onComplete(state.steps, puzzle.optimalSteps);
    }
  }, [state.isComplete, state.steps, puzzle.optimalSteps, onComplete, playSuccess]);

  const handlePegClick = useCallback((pegIndex: number) => {
    if (state.isComplete) return;
    playClick();

    if (selectedPeg === null) {
      if (state.pegs[pegIndex].length === 0) return;
      setSelectedPeg(pegIndex);
    } else if (selectedPeg === pegIndex) {
      setSelectedPeg(null);
    } else {
      const disc = state.pegs[selectedPeg][state.pegs[selectedPeg].length - 1];
      const result = applyMove(state, { from: selectedPeg, to: pegIndex, disc }, puzzle);
      if ('error' in result) {
        playError();
        onFail?.(result.error);
        setSelectedPeg(null);
        return;
      }
      playPlace();
      setState(result);
      setSelectedPeg(null);
    }
  }, [state, selectedPeg, puzzle, playClick, playPlace, playError, onFail]);

  const handleUndo = useCallback(() => {
    if (state.moveHistory.length === 0) return;
    playClick();
    setState(undo(state));
    setSelectedPeg(null);
  }, [state, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
    setSelectedPeg(null);
  }, [puzzle, playClick]);

  const maxDiscs = puzzle.discCount;

  return (
    <div className="space-y-4">
      {/* Story */}
      <div className="glass-card rounded-2xl p-4 text-sm">
        <p className="font-medium mb-2">{puzzle.story}</p>
        <ul className="space-y-1 text-[var(--text-secondary)]">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-primary">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Goal */}
      <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-2xl p-3 text-sm backdrop-blur-sm">
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">목표: </span>
        <span className="text-[var(--text-secondary)]">
          {puzzle.goalState.map((peg, i) =>
            peg.length > 0 ? `기둥 ${i + 1}: [${peg.join(',')}]` : null
          ).filter(Boolean).join(' / ')}
        </span>
      </div>

      {/* Pegs */}
      <div className="flex justify-center gap-4 sm:gap-8 py-6">
        {state.pegs.map((peg, pegIdx) => {
          const isSelected = selectedPeg === pegIdx;
          const isGoalPeg = puzzle.goalState[pegIdx].length > 0;

          return (
            <motion.div
              key={pegIdx}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handlePegClick(pegIdx)}
              className={`flex flex-col items-center cursor-pointer p-3 rounded-2xl transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-blue-400 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                  : isGoalPeg
                    ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                    : 'hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <div className="text-xs font-bold text-[var(--text-secondary)] mb-2">
                기둥 {pegIdx + 1}
              </div>

              <div className="relative flex flex-col-reverse items-center" style={{ minHeight: `${maxDiscs * 30 + 24}px` }}>
                {/* Peg rod */}
                <div
                  className="absolute bottom-0 w-2 bg-gradient-to-b from-stone-400 to-stone-500 dark:from-stone-500 dark:to-stone-600 rounded-full"
                  style={{ height: `${maxDiscs * 30 + 16}px` }}
                />

                {/* Base */}
                <div className="w-28 h-2.5 bg-gradient-to-r from-stone-400 via-stone-500 to-stone-400 dark:from-stone-500 dark:via-stone-600 dark:to-stone-500 rounded-full relative z-10 shadow-md" />

                {/* Discs */}
                <AnimatePresence>
                  {peg.map((disc) => {
                    const width = 32 + disc * 14;
                    return (
                      <motion.div
                        key={`${pegIdx}-${disc}`}
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className={`relative z-10 h-7 rounded-xl bg-gradient-to-r ${DISC_GRADIENTS[(disc - 1) % DISC_GRADIENTS.length]} shadow-lg flex items-center justify-center mb-0.5`}
                        style={{ width: `${width}px` }}
                      >
                        <span className="text-white text-xs font-bold drop-shadow">{disc}</span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleUndo} disabled={state.moveHistory.length === 0}
          className="px-5 py-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold disabled:opacity-40 hover:bg-[var(--border)] transition-colors">
          되돌리기
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleReset}
          className="px-5 py-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--border)] transition-colors">
          처음부터
        </motion.button>
      </div>

      <div className="text-center text-sm text-[var(--text-secondary)]">
        이동: <span className="font-bold text-[var(--text)]">{state.steps}</span>
        {' / 최적: '}
        <span className="font-bold text-primary">{puzzle.optimalSteps}</span>
      </div>
    </div>
  );
}
