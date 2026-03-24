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

const DISC_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500',
  'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
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
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-sm">
        <p className="font-medium mb-2">{puzzle.story}</p>
        <ul className="space-y-1 text-[var(--text-secondary)]">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-primary">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Goal display */}
      <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-sm">
        <span className="font-semibold text-success">목표: </span>
        <span className="text-[var(--text-secondary)]">
          {puzzle.goalState.map((peg, i) =>
            peg.length > 0 ? `기둥 ${i + 1}: [${peg.join(',')}]` : null
          ).filter(Boolean).join(' / ')}
        </span>
      </div>

      {/* Pegs */}
      <div className="flex justify-center gap-4 sm:gap-8 py-4">
        {state.pegs.map((peg, pegIdx) => {
          const isSelected = selectedPeg === pegIdx;
          const isGoalPeg = puzzle.goalState[pegIdx].length > 0;

          return (
            <motion.div
              key={pegIdx}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePegClick(pegIdx)}
              className={`flex flex-col items-center cursor-pointer p-2 rounded-xl transition-all ${
                isSelected ? 'ring-2 ring-primary bg-primary/10' : ''
              } ${isGoalPeg ? 'bg-success/5' : ''}`}
            >
              <div className="text-xs font-bold text-[var(--text-secondary)] mb-2">
                기둥 {pegIdx + 1}
              </div>

              {/* Peg visual */}
              <div className="relative flex flex-col-reverse items-center" style={{ minHeight: `${maxDiscs * 28 + 20}px` }}>
                {/* Peg rod */}
                <div className="absolute bottom-0 w-1.5 bg-[var(--border)] rounded-full" style={{ height: `${maxDiscs * 28 + 16}px` }} />

                {/* Base */}
                <div className="w-24 h-2 bg-[var(--border)] rounded-full relative z-10" />

                {/* Discs */}
                <AnimatePresence>
                  {peg.map((disc, discIdx) => {
                    const width = 30 + disc * 12;
                    return (
                      <motion.div
                        key={`${pegIdx}-${disc}`}
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className={`relative z-10 h-6 rounded-lg ${DISC_COLORS[(disc - 1) % DISC_COLORS.length]} shadow-md flex items-center justify-center mb-0.5`}
                        style={{ width: `${width}px` }}
                      >
                        <span className="text-white text-xs font-bold">{disc}</span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={handleUndo}
          disabled={state.moveHistory.length === 0}
          className="px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold disabled:opacity-40 hover:bg-[var(--border)] transition-colors"
        >
          되돌리기
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--border)] transition-colors"
        >
          처음부터
        </button>
      </div>

      <div className="text-center text-sm text-[var(--text-secondary)]">
        이동: <span className="font-bold text-[var(--text)]">{state.steps}</span>
        {' / 최적: '}
        <span className="font-bold text-primary">{puzzle.optimalSteps}</span>
      </div>
    </div>
  );
}
