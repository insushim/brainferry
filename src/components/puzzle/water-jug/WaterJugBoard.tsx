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
  }, [state, puzzle, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
    setSelectedJug(null);
  }, [puzzle, playClick]);

  return (
    <div className="space-y-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-sm">
        <p className="font-medium mb-2">{puzzle.story}</p>
        <p className="text-primary font-bold">
          목표: 정확히 <span className="text-xl">{puzzle.target}</span>리터를 측정하세요
        </p>
        <ul className="mt-2 space-y-1 text-[var(--text-secondary)]">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-primary">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {selectedJug && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center text-sm">
          <span className="text-primary font-semibold">
            {capacityMap.get(selectedJug)}L 물통 선택됨 — 다른 물통을 클릭하면 부어집니다
          </span>
        </div>
      )}

      {/* Jugs */}
      <div className="flex flex-wrap gap-6 justify-center py-4">
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
              className={`flex flex-col items-center cursor-pointer ${
                isSelected ? 'ring-3 ring-primary rounded-2xl' : ''
              }`}
            >
              {/* Jug visual */}
              <div
                className={`relative w-20 rounded-b-2xl rounded-t-lg border-3 overflow-hidden ${
                  isTarget ? 'border-success' : 'border-[var(--border)]'
                }`}
                style={{ height: `${Math.max(80, capacity * 20)}px` }}
              >
                <motion.div
                  className={`absolute bottom-0 left-0 right-0 ${
                    isTarget ? 'bg-success/40' : 'bg-blue-500/30'
                  }`}
                  animate={{ height: `${fillPercent}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{level}</span>
                </div>
              </div>

              <span className="text-sm font-semibold mt-2">{capacity}L</span>

              {/* Action buttons */}
              <div className="flex gap-1 mt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleFill(jug.id); }}
                  disabled={level === capacity || state.isComplete}
                  className="px-2 py-1 text-xs rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium disabled:opacity-30 hover:bg-blue-500/30 transition-colors"
                >
                  채우기
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEmpty(jug.id); }}
                  disabled={level === 0 || state.isComplete}
                  className="px-2 py-1 text-xs rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 font-medium disabled:opacity-30 hover:bg-red-500/30 transition-colors"
                >
                  비우기
                </button>
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
