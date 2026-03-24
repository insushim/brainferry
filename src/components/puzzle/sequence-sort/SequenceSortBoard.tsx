'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSequenceSort } from '@/engines/sequence-sort/generator';
import {
  createInitialState,
  applyMove,
  undo,
  type SequenceSortState,
} from '@/engines/sequence-sort/engine';
import { useAudio } from '@/hooks/useAudio';
import { ArrowDownUp, RotateCcw, Repeat } from 'lucide-react';

interface SequenceSortBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

const ITEM_GRADIENTS = [
  'from-red-400 to-red-600',
  'from-orange-400 to-orange-600',
  'from-yellow-400 to-yellow-600',
  'from-green-400 to-green-600',
  'from-blue-400 to-blue-600',
  'from-indigo-400 to-indigo-600',
  'from-purple-400 to-purple-600',
  'from-pink-400 to-pink-600',
  'from-teal-400 to-teal-600',
  'from-cyan-400 to-cyan-600',
];

export function SequenceSortBoard({ difficulty, seed, onComplete, onFail }: SequenceSortBoardProps) {
  const puzzle = useMemo(() => generateSequenceSort(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<SequenceSortState>(() => createInitialState(puzzle));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { playPlace, playError, playClick, playSuccess } = useAudio();

  const itemMap = useMemo(
    () => new Map(puzzle.items.map((item) => [item.value, item])),
    [puzzle.items],
  );

  useEffect(() => {
    if (state.isComplete) {
      playSuccess();
      onComplete(state.steps, puzzle.optimalSteps);
    }
  }, [state.isComplete, state.steps, puzzle.optimalSteps, onComplete, playSuccess]);

  const doOp = useCallback(
    (op: 'flip' | 'swap' | 'rotate', index: number, count?: number) => {
      const result = applyMove(state, { op, index, count }, puzzle);
      if ('error' in result) {
        playError();
        onFail?.(result.error);
        return;
      }
      playPlace();
      setState(result);
      setSelectedIndex(null);
    },
    [state, puzzle, playPlace, playError, onFail],
  );

  const handleItemClick = useCallback(
    (index: number) => {
      if (state.isComplete) return;
      playClick();

      if (puzzle.allowedOps.includes('swap')) {
        if (selectedIndex === null) {
          setSelectedIndex(index);
        } else if (selectedIndex === index) {
          setSelectedIndex(null);
        } else {
          if (Math.abs(selectedIndex - index) === 1) {
            doOp('swap', Math.min(selectedIndex, index));
          } else {
            setSelectedIndex(index);
          }
        }
      }
    },
    [state.isComplete, puzzle.allowedOps, selectedIndex, doOp, playClick],
  );

  const handleFlip = useCallback(
    (count: number) => {
      doOp('flip', 0, count);
    },
    [doOp],
  );

  const handleRotate = useCallback(
    (index: number, count: number) => {
      doOp('rotate', index, count);
    },
    [doOp],
  );

  const handleUndo = useCallback(() => {
    if (state.moveHistory.length === 0) return;
    playClick();
    setState(undo(state, puzzle));
    setSelectedIndex(null);
  }, [state, puzzle, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
    setSelectedIndex(null);
  }, [puzzle, playClick]);

  return (
    <div className="space-y-5">
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
      <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-2xl p-4 backdrop-blur-sm">
        <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">목표 순서: </span>
        <div className="flex gap-2 mt-2">
          {puzzle.goalOrder.map((val, i) => {
            const item = itemMap.get(val);
            return (
              <span
                key={i}
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ITEM_GRADIENTS[val % ITEM_GRADIENTS.length]} text-white flex items-center justify-center text-sm font-bold shadow-md`}
              >
                {item?.label ?? val}
              </span>
            );
          })}
        </div>
      </div>

      {/* Current order */}
      <div className="text-center py-4">
        <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-4 tracking-wider">현재 순서</div>
        <div className="flex gap-2.5 justify-center">
          <AnimatePresence>
            {state.order.map((val, idx) => {
              const item = itemMap.get(val);
              const isCorrect = puzzle.goalOrder[idx] === val;
              const isSelected = selectedIndex === idx;

              return (
                <motion.button
                  key={`${idx}-${val}`}
                  layout
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.12, y: -4 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleItemClick(idx)}
                  className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold text-white transition-all duration-200 bg-gradient-to-br ${
                    ITEM_GRADIENTS[val % ITEM_GRADIENTS.length]
                  } shadow-lg ${
                    isSelected ? 'ring-3 ring-blue-400 ring-offset-2 ring-offset-[var(--bg)] scale-110' : ''
                  } ${
                    isCorrect ? 'shadow-emerald-500/30' : 'shadow-black/10'
                  }`}
                >
                  <span className="text-base">{item?.label ?? val}</span>
                  {isCorrect && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px]">
                      ✓
                    </span>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Operations */}
      <div className="glass-card rounded-2xl p-4">
        <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3 tracking-wider">사용 가능한 연산</div>
        <div className="space-y-3">
          {puzzle.allowedOps.includes('swap') && (
            <div className="flex items-center gap-2 text-sm">
              <ArrowDownUp className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-[var(--text-secondary)]"><strong>교환:</strong> 인접한 두 항목을 클릭하여 교환</span>
            </div>
          )}
          {puzzle.allowedOps.includes('flip') && (
            <div>
              <div className="flex items-center gap-2 text-sm mb-2">
                <RotateCcw className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="font-semibold">뒤집기</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: state.order.length - 1 }, (_, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleFlip(i + 2)}
                    disabled={state.isComplete}
                    className="px-3 py-2 text-xs rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/30 dark:border-white/10 hover:border-purple-400 disabled:opacity-40 transition-all font-semibold shadow-sm"
                  >
                    처음 {i + 2}개
                  </motion.button>
                ))}
              </div>
            </div>
          )}
          {puzzle.allowedOps.includes('rotate') && (
            <div>
              <div className="flex items-center gap-2 text-sm mb-2">
                <Repeat className="w-4 h-4 text-teal-500 shrink-0" />
                <span className="font-semibold">회전</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: state.order.length - 2 }, (_, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleRotate(i, 3)}
                    disabled={state.isComplete}
                    className="px-3 py-2 text-xs rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/30 dark:border-white/10 hover:border-teal-400 disabled:opacity-40 transition-all font-semibold shadow-sm"
                  >
                    위치 {i + 1}부터 3개
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
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
        연산: <span className="font-bold text-[var(--text)]">{state.steps}</span>
        {' / 최적: '}
        <span className="font-bold text-primary">{puzzle.optimalSteps}</span>
      </div>
    </div>
  );
}
