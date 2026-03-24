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
  'from-red-500 to-red-700',
  'from-orange-500 to-orange-700',
  'from-amber-400 to-amber-600',
  'from-emerald-500 to-emerald-700',
  'from-blue-500 to-blue-700',
  'from-indigo-500 to-indigo-700',
  'from-purple-500 to-purple-700',
  'from-pink-500 to-pink-700',
  'from-teal-500 to-teal-700',
  'from-cyan-500 to-cyan-700',
];

const ITEM_SHADOWS = [
  'shadow-red-500/25',
  'shadow-orange-500/25',
  'shadow-amber-500/25',
  'shadow-emerald-500/25',
  'shadow-blue-500/25',
  'shadow-indigo-500/25',
  'shadow-purple-500/25',
  'shadow-pink-500/25',
  'shadow-teal-500/25',
  'shadow-cyan-500/25',
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
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-sm">
        <p className="font-medium mb-2 text-slate-100">{puzzle.story}</p>
        <ul className="space-y-1 text-slate-400">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-blue-400">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Goal */}
      <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-4 backdrop-blur-md">
        <span className="font-semibold text-emerald-400 text-sm">목표 순서: </span>
        <div className="flex gap-2 mt-2">
          {puzzle.goalOrder.map((val, i) => {
            const item = itemMap.get(val);
            const gradIdx = val % ITEM_GRADIENTS.length;
            return (
              <span
                key={i}
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ITEM_GRADIENTS[gradIdx]} text-white flex items-center justify-center text-sm font-bold shadow-lg ${ITEM_SHADOWS[gradIdx]} border border-white/10`}
              >
                {item?.label ?? val}
              </span>
            );
          })}
        </div>
      </div>

      {/* Current order */}
      <div className="text-center py-4">
        <div className="text-[11px] font-bold text-slate-500 uppercase mb-4 tracking-widest">현재 순서</div>
        <div className="flex gap-2.5 justify-center">
          <AnimatePresence>
            {state.order.map((val, idx) => {
              const item = itemMap.get(val);
              const isCorrect = puzzle.goalOrder[idx] === val;
              const isSelected = selectedIndex === idx;
              const gradIdx = val % ITEM_GRADIENTS.length;

              return (
                <motion.button
                  key={`${idx}-${val}`}
                  layout
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.12, y: -4 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleItemClick(idx)}
                  className={`relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold text-white transition-all duration-200 bg-gradient-to-br ${
                    ITEM_GRADIENTS[gradIdx]
                  } shadow-lg ${ITEM_SHADOWS[gradIdx]} border border-white/10 ${
                    isSelected ? 'ring-2 ring-blue-400/60 ring-offset-2 ring-offset-slate-900 scale-110' : ''
                  }`}
                >
                  <span className="text-base">{item?.label ?? val}</span>
                  {isCorrect && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[8px] shadow-md">
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
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
        <div className="text-[11px] font-bold text-slate-500 uppercase mb-3 tracking-widest">사용 가능한 연산</div>
        <div className="space-y-3">
          {puzzle.allowedOps.includes('swap') && (
            <div className="flex items-center gap-2 text-sm">
              <ArrowDownUp className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-slate-400"><strong className="text-slate-200">교환:</strong> 인접한 두 항목을 클릭하여 교환</span>
            </div>
          )}
          {puzzle.allowedOps.includes('flip') && (
            <div>
              <div className="flex items-center gap-2 text-sm mb-2">
                <RotateCcw className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="font-semibold text-slate-200">뒤집기</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: state.order.length - 1 }, (_, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleFlip(i + 2)}
                    disabled={state.isComplete}
                    className="px-3 py-2 text-xs rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:border-purple-400/40 hover:bg-purple-500/10 disabled:opacity-30 transition-all font-semibold text-slate-300 shadow-sm"
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
                <Repeat className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="font-semibold text-slate-200">회전</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: state.order.length - 2 }, (_, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleRotate(i, 3)}
                    disabled={state.isComplete}
                    className="px-3 py-2 text-xs rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:border-teal-400/40 hover:bg-teal-500/10 disabled:opacity-30 transition-all font-semibold text-slate-300 shadow-sm"
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
          <span className="text-slate-400">연산</span>
          <span className="font-bold text-slate-100 tabular-nums">{state.steps}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">최적</span>
          <span className="font-bold text-blue-400 tabular-nums">{puzzle.optimalSteps}</span>
        </div>
      </div>
    </div>
  );
}
