'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateWaterJug } from '@/engines/water-jug/generator';
import {
  createInitialState,
  applyMove,
  undo,
  type WaterJugState,
} from '@/engines/water-jug/engine';
import { useAudio } from '@/hooks/useAudio';
import { Droplets, Trash2 } from 'lucide-react';

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
  const { playPour, playError, playClick, playSuccess } = useAudio();

  const capacityMap = useMemo(
    () => new Map(puzzle.jugs.map((j) => [j.id, j.capacity])),
    [puzzle.jugs],
  );

  useEffect(() => {
    if (state.isComplete) {
      playSuccess();
      onComplete(state.steps, puzzle.optimalSteps);
    }
  }, [state.isComplete, state.steps, puzzle.optimalSteps, onComplete, playSuccess]);

  const doMove = useCallback(
    (move: Parameters<typeof applyMove>[1]) => {
      const result = applyMove(state, move, puzzle);
      if ('error' in result) {
        playError();
        onFail?.(result.error);
        return;
      }
      playPour();
      setState(result);
    },
    [state, puzzle, playPour, playError, onFail],
  );

  const handleFill = useCallback((jugId: string) => {
    doMove({ action: 'fill', jugId });
  }, [doMove]);

  const handleEmpty = useCallback((jugId: string) => {
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
      <div className="glass-card rounded-2xl p-4 text-sm">
        <p className="font-medium mb-3">{puzzle.story}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500/15 to-cyan-500/15 border border-blue-400/30">
          <Droplets className="w-4 h-4 text-blue-500" />
          <span className="font-bold text-blue-600 dark:text-blue-400">
            목표: 정확히 <span className="text-xl tabular-nums">{puzzle.target}</span>리터
          </span>
        </div>
        <ul className="mt-3 space-y-1 text-[var(--text-secondary)]">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-primary">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {selectedJug && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-500/10 border border-blue-400/30 rounded-2xl p-3 text-center text-sm backdrop-blur-sm"
        >
          <span className="text-blue-500 dark:text-blue-400 font-semibold">
            {capacityMap.get(selectedJug)}L 물통 선택됨 — 다른 물통을 클릭하면 부어집니다
          </span>
        </motion.div>
      )}

      {/* Jugs */}
      <div className="flex flex-wrap gap-6 justify-center py-6">
        {puzzle.jugs.map((jug) => {
          const level = state.levels[jug.id] ?? 0;
          const capacity = jug.capacity;
          const fillPercent = capacity > 0 ? (level / capacity) * 100 : 0;
          const isSelected = selectedJug === jug.id;
          const isTarget = level === puzzle.target;

          return (
            <motion.div
              key={jug.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleJugClick(jug.id)}
              className={`flex flex-col items-center cursor-pointer transition-all ${
                isSelected ? 'ring-3 ring-blue-400 rounded-2xl shadow-lg shadow-blue-500/20' : ''
              }`}
            >
              {/* Jug visual */}
              <div
                className={`relative w-24 rounded-b-2xl rounded-t-xl border-3 overflow-hidden transition-all ${
                  isTarget
                    ? 'border-emerald-400 shadow-lg shadow-emerald-400/30'
                    : isSelected
                      ? 'border-blue-400'
                      : 'border-[var(--border)]'
                }`}
                style={{ height: `${Math.max(90, capacity * 22)}px` }}
              >
                {/* Water fill */}
                <motion.div
                  className={`absolute bottom-0 left-0 right-0 ${
                    isTarget ? 'bg-gradient-to-t from-emerald-500/50 to-emerald-400/30' : 'bg-gradient-to-t from-blue-500/50 to-blue-400/30'
                  }`}
                  animate={{ height: `${fillPercent}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                />
                {/* Wave effect at top of water */}
                {level > 0 && (
                  <motion.div
                    className="absolute left-0 right-0 h-2 bg-gradient-to-b from-white/20 to-transparent"
                    animate={{ bottom: `${fillPercent - 2}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold tabular-nums drop-shadow">{level}</span>
                </div>
              </div>

              <span className="text-sm font-bold mt-2 tabular-nums">{capacity}L</span>

              {/* Action buttons */}
              <div className="flex gap-1.5 mt-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); handleFill(jug.id); }}
                  disabled={level === capacity || state.isComplete}
                  className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 disabled:opacity-30 hover:bg-blue-500/25 transition-colors"
                  title="채우기"
                >
                  <Droplets className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); handleEmpty(jug.id); }}
                  disabled={level === 0 || state.isComplete}
                  className="p-2 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 disabled:opacity-30 hover:bg-red-500/25 transition-colors"
                  title="비우기"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
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
