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

interface SequenceSortBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

const ITEM_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500',
  'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
  'bg-teal-500', 'bg-cyan-500',
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
          // Swap adjacent only
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
    <div className="space-y-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-sm">
        <p className="font-medium mb-2">{puzzle.story}</p>
        <ul className="space-y-1 text-[var(--text-secondary)]">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-primary">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Goal */}
      <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-sm">
        <span className="font-semibold text-success">목표 순서: </span>
        <div className="flex gap-1 mt-1">
          {puzzle.goalOrder.map((val, i) => {
            const item = itemMap.get(val);
            return (
              <span key={i} className={`w-9 h-9 rounded-lg ${ITEM_COLORS[val % ITEM_COLORS.length]} text-white flex items-center justify-center text-sm font-bold`}>
                {item?.label ?? val}
              </span>
            );
          })}
        </div>
      </div>

      {/* Current order */}
      <div className="text-center py-4">
        <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3">현재 순서</div>
        <div className="flex gap-2 justify-center">
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
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleItemClick(idx)}
                  className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-white transition-all ${
                    ITEM_COLORS[val % ITEM_COLORS.length]
                  } ${isSelected ? 'ring-3 ring-primary ring-offset-2' : ''} ${
                    isCorrect ? 'shadow-lg shadow-success/30' : ''
                  }`}
                >
                  <span className="text-sm">{item?.label ?? val}</span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Operations */}
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
        <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">사용 가능한 연산</div>
        <div className="flex flex-wrap gap-2">
          {puzzle.allowedOps.includes('swap') && (
            <div className="text-xs text-[var(--text-secondary)]">
              <strong>교환(Swap):</strong> 인접한 두 항목 클릭
            </div>
          )}
          {puzzle.allowedOps.includes('flip') && (
            <div className="flex gap-1 flex-wrap items-center">
              <span className="text-xs font-medium">뒤집기:</span>
              {Array.from({ length: state.order.length - 1 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handleFlip(i + 2)}
                  disabled={state.isComplete}
                  className="px-2 py-1 text-xs rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-primary disabled:opacity-40 transition-colors"
                >
                  처음 {i + 2}개
                </button>
              ))}
            </div>
          )}
          {puzzle.allowedOps.includes('rotate') && (
            <div className="flex gap-1 flex-wrap items-center">
              <span className="text-xs font-medium">회전:</span>
              {Array.from({ length: state.order.length - 2 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handleRotate(i, 3)}
                  disabled={state.isComplete}
                  className="px-2 py-1 text-xs rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-primary disabled:opacity-40 transition-colors"
                >
                  위치 {i + 1}부터 3개
                </button>
              ))}
            </div>
          )}
        </div>
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
        연산: <span className="font-bold text-[var(--text)]">{state.steps}</span>
        {' / 최적: '}
        <span className="font-bold text-primary">{puzzle.optimalSteps}</span>
      </div>
    </div>
  );
}
