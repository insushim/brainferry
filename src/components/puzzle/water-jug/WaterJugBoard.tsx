'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateWaterJug } from '@/engines/water-jug/generator';
import {
  createInitialState,
  applyMove,
  undo,
  type WaterJugState,
} from '@/engines/water-jug/engine';
import { useAudio } from '@/hooks/useAudio';
import { Droplets, Trash2, ArrowRight } from 'lucide-react';

interface WaterJugBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

export function WaterJugBoard({ difficulty, seed, onComplete, onFail }: WaterJugBoardProps) {
  const puzzle = useMemo(() => generateWaterJug(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<WaterJugState>(() => createInitialState(puzzle));
  const [selectedJug, setSelectedJug] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { playPour, playError, playClick, playSuccess } = useAudio();

  const capacityMap = useMemo(
    () => new Map(puzzle.jugs.map((j) => [j.id, j.capacity])),
    [puzzle.jugs],
  );

  const jugLabel = useCallback((id: string) => {
    const idx = puzzle.jugs.findIndex((j) => j.id === id);
    return String.fromCharCode(65 + idx); // A, B, C...
  }, [puzzle.jugs]);

  useEffect(() => {
    if (state.isComplete) {
      playSuccess();
      onComplete(state.steps, puzzle.optimalSteps);
    }
  }, [state.isComplete, state.steps, puzzle.optimalSteps, onComplete, playSuccess]);

  // Auto-clear error message
  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 2000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const doMove = useCallback(
    (move: Parameters<typeof applyMove>[1]) => {
      const result = applyMove(state, move, puzzle);
      if ('error' in result) {
        playError();
        setErrorMsg(result.error);
        onFail?.(result.error);
        return;
      }
      playPour();
      setState(result);
    },
    [state, puzzle, playPour, playError, onFail],
  );

  const handleFill = useCallback((jugId: string) => {
    setSelectedJug(null);
    doMove({ action: 'fill', jugId });
  }, [doMove]);

  const handleEmpty = useCallback((jugId: string) => {
    setSelectedJug(null);
    doMove({ action: 'empty', jugId });
  }, [doMove]);

  const handleJugClick = useCallback((jugId: string) => {
    playClick();
    if (selectedJug === null) {
      setSelectedJug(jugId);
    } else if (selectedJug === jugId) {
      setSelectedJug(null);
    } else {
      doMove({ action: 'pour', from: selectedJug, to: jugId });
      setSelectedJug(null);
    }
  }, [selectedJug, doMove, playClick]);

  const handleUndo = useCallback(() => {
    if (state.moveHistory.length === 0) return;
    playClick();
    setState(undo(state, puzzle));
    setSelectedJug(null);
  }, [state, puzzle, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
    setSelectedJug(null);
  }, [puzzle, playClick]);

  return (
    <div className="space-y-4">
      {/* Story & Target */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-sm">
        <p className="font-medium mb-3 text-slate-100">{puzzle.story}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-400/20">
          <Droplets className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-blue-400">
            목표: 정확히 <span className="text-xl tabular-nums">{puzzle.target}</span>리터
            {puzzle.targetJug && (
              <span className="ml-1 text-sm">({jugLabel(puzzle.targetJug)}통에)</span>
            )}
          </span>
        </div>
      </div>

      {/* Pour indicator */}
      <AnimatePresence>
        {selectedJug && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-blue-500/10 border border-blue-400/20 rounded-2xl p-3 text-center text-sm backdrop-blur-md"
          >
            <span className="text-blue-400 font-semibold flex items-center justify-center gap-2">
              <span className="px-2 py-0.5 bg-blue-500/20 rounded-lg text-blue-300 font-bold">
                {jugLabel(selectedJug)} ({state.levels[selectedJug]}L)
              </span>
              <ArrowRight className="w-4 h-4" />
              다른 물통을 클릭하면 부어집니다
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-500/10 border border-red-400/20 rounded-2xl p-3 text-center text-sm backdrop-blur-md text-red-400 font-medium"
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jugs */}
      <div className="flex flex-wrap gap-6 justify-center py-6">
        {puzzle.jugs.map((jug) => {
          const level = state.levels[jug.id] ?? 0;
          const capacity = jug.capacity;
          const fillPercent = capacity > 0 ? (level / capacity) * 100 : 0;
          const isSelected = selectedJug === jug.id;
          const isTarget = puzzle.targetJug
            ? jug.id === puzzle.targetJug && level === puzzle.target
            : level === puzzle.target;
          const isLeaky = puzzle.leakyJugId === jug.id;
          const jugHeight = Math.max(100, capacity * 24);

          // Determine water color
          let waterGradient = 'from-blue-500/70 to-blue-400/40';
          let waterGlow = 'shadow-blue-500/20';
          if (jug.color === 'red') {
            waterGradient = 'from-red-500/70 to-red-400/40';
            waterGlow = 'shadow-red-500/20';
          } else if (jug.color === 'blue') {
            waterGradient = 'from-indigo-500/70 to-indigo-400/40';
            waterGlow = 'shadow-indigo-500/20';
          }
          if (isTarget) {
            waterGradient = 'from-emerald-500/70 to-emerald-400/40';
            waterGlow = 'shadow-emerald-500/20';
          }

          return (
            <motion.div
              key={jug.id}
              layout
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleJugClick(jug.id)}
              className="flex flex-col items-center cursor-pointer"
            >
              {/* Jug label */}
              <div className={`text-xs font-bold mb-1.5 px-2 py-0.5 rounded-lg ${
                isSelected ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500'
              }`}>
                {jugLabel(jug.id)}통
                {isLeaky && <span className="ml-1 text-amber-400">💧</span>}
              </div>

              {/* Jug container */}
              <div
                className={`relative rounded-b-3xl rounded-t-xl overflow-hidden transition-all duration-300 border-2 ${
                  isTarget
                    ? 'border-emerald-400/60 shadow-lg shadow-emerald-500/20'
                    : isSelected
                      ? 'border-blue-400/60 shadow-lg shadow-blue-500/20'
                      : 'border-white/10 hover:border-white/20'
                } bg-slate-900/60 backdrop-blur-md`}
                style={{ width: '80px', height: `${jugHeight}px` }}
              >
                {/* Capacity scale marks */}
                {Array.from({ length: capacity + 1 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 w-2 border-t border-white/10"
                    style={{ bottom: `${(i / capacity) * 100}%` }}
                  />
                ))}

                {/* Water fill */}
                <motion.div
                  className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${waterGradient}`}
                  animate={{ height: `${fillPercent}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  {/* Shine */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-transparent" />
                </motion.div>

                {/* Wave effect at top of water */}
                {level > 0 && (
                  <motion.div
                    className="absolute left-0 right-0 h-2 bg-gradient-to-b from-white/20 to-transparent"
                    animate={{ bottom: `${fillPercent - 1}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  />
                )}

                {/* Level number on jug */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <span className="text-2xl font-black tabular-nums drop-shadow-lg text-white/90">
                    {level}
                  </span>
                </div>

                {/* Selected overlay */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 border-2 border-blue-400/40 rounded-b-3xl rounded-t-xl"
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </div>

              {/* Capacity label */}
              <span className="text-sm font-bold mt-2 tabular-nums text-slate-400">
                {capacity}L
              </span>

              {/* Action buttons */}
              <div className="flex gap-2 mt-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); handleFill(jug.id); }}
                  disabled={level === capacity || state.isComplete}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-500/15 text-blue-400 text-xs font-bold disabled:opacity-20 hover:bg-blue-500/25 transition-colors border border-blue-500/10 min-h-[40px]"
                  title="채우기"
                >
                  <Droplets className="w-3.5 h-3.5" />
                  채우기
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); handleEmpty(jug.id); }}
                  disabled={level === 0 || state.isComplete}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500/15 text-red-400 text-xs font-bold disabled:opacity-20 hover:bg-red-500/25 transition-colors border border-red-500/10 min-h-[40px]"
                  title="비우기"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  비우기
                </motion.button>
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
