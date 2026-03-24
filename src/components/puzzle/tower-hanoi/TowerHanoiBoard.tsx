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
  { bg: 'from-red-500 to-red-600', shadow: 'shadow-red-500/30', ring: 'ring-red-400/60' },
  { bg: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-500/30', ring: 'ring-orange-400/60' },
  { bg: 'from-amber-400 to-amber-500', shadow: 'shadow-amber-500/30', ring: 'ring-amber-400/60' },
  { bg: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/30', ring: 'ring-emerald-400/60' },
  { bg: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/30', ring: 'ring-blue-400/60' },
  { bg: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/30', ring: 'ring-indigo-400/60' },
  { bg: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/30', ring: 'ring-purple-400/60' },
  { bg: 'from-pink-500 to-pink-600', shadow: 'shadow-pink-500/30', ring: 'ring-pink-400/60' },
];

export function TowerHanoiBoard({ difficulty, seed, onComplete, onFail }: TowerHanoiBoardProps) {
  const puzzle = useMemo(() => generateHanoi(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<HanoiState>(() => createInitialState(puzzle));
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [errorPeg, setErrorPeg] = useState<number | null>(null);
  const { playPlace, playError, playClick, playSuccess } = useAudio();

  useEffect(() => {
    if (state.isComplete) {
      playSuccess();
      onComplete(state.steps, puzzle.optimalSteps);
    }
  }, [state.isComplete, state.steps, puzzle.optimalSteps, onComplete, playSuccess]);

  const handlePegClick = useCallback((pegIndex: number) => {
    if (state.isComplete) return;

    if (selectedPeg === null) {
      // Select: only if peg has discs
      if (state.pegs[pegIndex].length === 0) return;
      playClick();
      setSelectedPeg(pegIndex);
    } else if (selectedPeg === pegIndex) {
      // Deselect
      playClick();
      setSelectedPeg(null);
    } else {
      // Try to move
      const disc = state.pegs[selectedPeg][state.pegs[selectedPeg].length - 1];
      const result = applyMove(state, { from: selectedPeg, to: pegIndex, disc }, puzzle);
      if ('error' in result) {
        playError();
        onFail?.(result.error);
        setErrorPeg(pegIndex);
        setTimeout(() => setErrorPeg(null), 500);
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
  const pegHeight = maxDiscs * 32 + 24;

  return (
    <div className="space-y-4">
      {/* Story */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-sm">
        <p className="font-medium mb-2 text-slate-100">{puzzle.story}</p>
        <ul className="space-y-1 text-slate-400">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-blue-400">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Goal */}
      <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-3 text-sm backdrop-blur-md">
        <span className="font-semibold text-emerald-400">목표: </span>
        <span className="text-slate-400">
          {puzzle.goalState.map((peg, i) =>
            peg.length > 0 ? `기둥 ${i + 1}: [${peg.join(',')}]` : null
          ).filter(Boolean).join(' / ')}
        </span>
      </div>

      {/* Pegs */}
      <div className="flex justify-center gap-4 sm:gap-8 py-6">
        {state.pegs.map((peg, pegIdx) => {
          const isSelected = selectedPeg === pegIdx;
          const isError = errorPeg === pegIdx;
          const isGoalPeg = puzzle.goalState[pegIdx].length > 0;
          const topDisc = peg.length > 0 ? peg[peg.length - 1] : null;
          const isSourcePeg = selectedPeg !== null && selectedPeg === pegIdx;

          return (
            <motion.div
              key={pegIdx}
              animate={isError ? { x: [0, -6, 6, -4, 4, 0] } : {}}
              transition={isError ? { duration: 0.4 } : {}}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePegClick(pegIdx)}
              className={`flex flex-col items-center cursor-pointer p-3 rounded-2xl transition-all duration-200 select-none ${
                isSelected
                  ? 'ring-2 ring-blue-400/60 bg-blue-500/10 shadow-lg shadow-blue-500/15'
                  : isError
                    ? 'bg-red-500/10 ring-2 ring-red-400/40'
                    : isGoalPeg
                      ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10'
                      : 'hover:bg-white/5 border border-transparent'
              }`}
              style={{ minWidth: `${40 + maxDiscs * 16}px` }}
            >
              <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                기둥 {pegIdx + 1}
              </div>

              {/* Peg visual area */}
              <div className="relative flex flex-col items-center justify-end" style={{ height: `${pegHeight}px` }}>
                {/* Peg rod */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 bottom-2.5 w-2 bg-gradient-to-t from-slate-600 to-slate-500 rounded-t-full"
                  style={{ height: `${pegHeight - 10}px` }}
                />

                {/* Discs stacked from bottom */}
                <div className="relative z-10 flex flex-col-reverse items-center mb-2.5">
                  {/* Render discs from bottom (index 0) to top (index length-1) */}
                  {/* flex-col-reverse + this order means first rendered = at bottom visually */}
                  <AnimatePresence mode="popLayout">
                    {peg.map((disc, stackIdx) => {
                      const width = 32 + disc * 14;
                      const colorIdx = (disc - 1) % DISC_COLORS.length;
                      const color = DISC_COLORS[colorIdx];
                      const isTopDisc = stackIdx === peg.length - 1;
                      const isLifted = isSourcePeg && isTopDisc;

                      return (
                        <motion.div
                          key={`disc-${disc}`}
                          layout
                          initial={{ scale: 0.8, opacity: 0, y: -30 }}
                          animate={{
                            scale: 1,
                            opacity: 1,
                            y: isLifted ? -12 : 0,
                          }}
                          exit={{ scale: 0.8, opacity: 0, y: -30 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                          className={`h-7 rounded-xl bg-gradient-to-r ${color.bg} shadow-lg ${color.shadow} flex items-center justify-center mb-0.5 border border-white/20 ${
                            isLifted ? `ring-2 ${color.ring} shadow-xl` : ''
                          }`}
                          style={{ width: `${width}px` }}
                        >
                          <span className="text-white text-xs font-bold drop-shadow">{disc}</span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Base */}
                <div className="absolute bottom-0 w-full h-2.5 bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 rounded-full shadow-lg" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleUndo} disabled={state.moveHistory.length === 0}
          className="px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-sm text-slate-400 font-semibold disabled:opacity-30 hover:bg-white/10 transition-all border border-white/5">
          되돌리기
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleReset}
          className="px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-sm text-slate-400 font-semibold hover:bg-white/10 transition-all border border-white/5">
          처음부터
        </motion.button>
      </div>

      {/* Steps pill */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-sm">
          <span className="text-slate-400">이동</span>
          <span className="font-bold text-slate-100 tabular-nums">{state.steps}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">최적</span>
          <span className="font-bold text-blue-400 tabular-nums">{puzzle.optimalSteps}</span>
        </div>
      </div>
    </div>
  );
}
