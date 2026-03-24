'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSequenceSort } from '@/engines/sequence-sort/generator';
import {
  createInitialState,
  applyMove,
  undo,
  type SequenceSortState,
} from '@/engines/sequence-sort/engine';
import type { SortMove } from '@/engines/sequence-sort/generator';
import { useAudio } from '@/hooks/useAudio';
import { ArrowDownUp, RotateCcw, Repeat, RefreshCw } from 'lucide-react';

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

type ActiveOp = 'swap' | 'flip' | 'rotate' | null;

export function SequenceSortBoard({ difficulty, seed, onComplete, onFail }: SequenceSortBoardProps) {
  const puzzle = useMemo(() => generateSequenceSort(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<SequenceSortState>(() => createInitialState(puzzle));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeOp, setActiveOp] = useState<ActiveOp>(
    puzzle.allowedOps.length === 1 ? puzzle.allowedOps[0] : null
  );
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { playPlace, playError, playClick, playSuccess } = useAudio();

  const itemMap = useMemo(
    () => new Map(puzzle.items.map((item) => [item.value, item])),
    [puzzle.items],
  );

  const showError = useCallback((msg: string) => {
    setErrorToast(msg);
    playError();
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setErrorToast(null), 3000);
  }, [playError]);

  useEffect(() => {
    if (state.isComplete) {
      playSuccess();
      onComplete(state.steps, puzzle.optimalSteps);
    }
  }, [state.isComplete, state.steps, puzzle.optimalSteps, onComplete, playSuccess]);

  useEffect(() => {
    if (state.isFailed && state.failReason) {
      playError();
      onFail?.(state.failReason);
    }
  }, [state.isFailed, state.failReason, onFail, playError]);

  const doOp = useCallback(
    (move: SortMove) => {
      const result = applyMove(state, move, puzzle);
      if ('error' in result) {
        showError(result.error);
        return;
      }
      playPlace();
      setState(result);
      setSelectedIndex(null);
    },
    [state, puzzle, playPlace, showError],
  );

  const handleItemClick = useCallback(
    (index: number) => {
      if (state.isComplete || state.isFailed) return;
      playClick();

      const op = activeOp;

      if (op === 'swap') {
        if (selectedIndex === null) {
          setSelectedIndex(index);
        } else if (selectedIndex === index) {
          setSelectedIndex(null);
        } else {
          if (Math.abs(selectedIndex - index) === 1) {
            doOp({ op: 'swap', index: Math.min(selectedIndex, index) });
          } else {
            showError('인접한 항목만 교환할 수 있습니다.');
            setSelectedIndex(index);
          }
        }
      } else if (op === 'flip') {
        // Click on position = flip first (index+1) items
        const count = index + 1;
        if (count < 2) {
          showError('최소 2개 이상 선택해야 합니다.');
          return;
        }
        doOp({ op: 'flip', index: 0, count });
      } else if (op === 'rotate') {
        if (selectedIndex === null) {
          setSelectedIndex(index);
        } else if (selectedIndex === index) {
          setSelectedIndex(null);
        } else {
          const start = Math.min(selectedIndex, index);
          const end = Math.max(selectedIndex, index);
          const count = end - start + 1;
          if (count < 2) {
            showError('최소 2개 이상 선택해야 합니다.');
            return;
          }
          doOp({ op: 'rotate', index: start, count });
        }
      } else {
        // No op selected - if only one allowed, auto select
        if (puzzle.allowedOps.length === 1) {
          setActiveOp(puzzle.allowedOps[0]);
          setSelectedIndex(index);
        } else {
          showError('먼저 연산을 선택해주세요.');
        }
      }
    },
    [state.isComplete, state.isFailed, activeOp, selectedIndex, doOp, playClick, showError, puzzle.allowedOps],
  );

  const handleFlipButton = useCallback(
    (count: number) => {
      doOp({ op: 'flip', index: 0, count });
    },
    [doOp],
  );

  const handleRotateButton = useCallback(
    (index: number, count: number) => {
      doOp({ op: 'rotate', index, count });
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

  const selectOp = useCallback((op: ActiveOp) => {
    playClick();
    setActiveOp(op);
    setSelectedIndex(null);
  }, [playClick]);

  return (
    <div className="space-y-5">
      {/* Error toast */}
      <AnimatePresence>
        {errorToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-red-500/90 backdrop-blur-md text-white font-semibold text-sm shadow-2xl shadow-red-500/30 max-w-[90vw] text-center border border-red-400/30"
          >
            {errorToast}
          </motion.div>
        )}
      </AnimatePresence>

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
            const gradIdx = (val - 1) % ITEM_GRADIENTS.length;
            return (
              <span
                key={i}
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ITEM_GRADIENTS[gradIdx]} text-white flex items-center justify-center text-sm font-bold shadow-lg ${ITEM_SHADOWS[gradIdx]} border border-white/10 opacity-60`}
              >
                {val}
              </span>
            );
          })}
        </div>
        {puzzle.variant === 'multi-target' && puzzle.alternateGoals && (
          <div className="mt-2">
            <span className="text-xs text-emerald-400/60">또는: </span>
            {puzzle.alternateGoals.map((goal, gi) => (
              <div key={gi} className="flex gap-1.5 mt-1">
                {goal.map((val, i) => {
                  const gradIdx = (val - 1) % ITEM_GRADIENTS.length;
                  return (
                    <span
                      key={i}
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${ITEM_GRADIENTS[gradIdx]} text-white flex items-center justify-center text-xs font-bold border border-white/10 opacity-40`}
                    >
                      {val}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operation selector */}
      {puzzle.allowedOps.length > 1 && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase mb-3 tracking-widest">연산 선택</div>
          <div className="flex gap-2 flex-wrap">
            {puzzle.allowedOps.includes('swap') && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => selectOp('swap')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  activeOp === 'swap'
                    ? 'bg-blue-500/20 border border-blue-400/40 text-blue-400 ring-1 ring-blue-400/30'
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <ArrowDownUp className="w-4 h-4" />
                교환(swap)
              </motion.button>
            )}
            {puzzle.allowedOps.includes('flip') && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => selectOp('flip')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  activeOp === 'flip'
                    ? 'bg-purple-500/20 border border-purple-400/40 text-purple-400 ring-1 ring-purple-400/30'
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                뒤집기(flip)
              </motion.button>
            )}
            {puzzle.allowedOps.includes('rotate') && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => selectOp('rotate')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  activeOp === 'rotate'
                    ? 'bg-teal-500/20 border border-teal-400/40 text-teal-400 ring-1 ring-teal-400/30'
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <Repeat className="w-4 h-4" />
                회전(rotate)
              </motion.button>
            )}
          </div>
          {activeOp && (
            <div className="mt-2 text-xs text-slate-500">
              {activeOp === 'swap' && '인접한 두 항목을 차례로 클릭하여 교환'}
              {activeOp === 'flip' && '위치를 클릭하면 처음부터 해당 위치까지 뒤집기 (아래 버튼도 사용 가능)'}
              {activeOp === 'rotate' && '시작 위치와 끝 위치를 차례로 클릭하여 회전'}
            </div>
          )}
        </div>
      )}

      {/* Current order */}
      <div className="text-center py-2">
        <div className="text-[11px] font-bold text-slate-500 uppercase mb-4 tracking-widest">현재 순서</div>
        <div className="flex gap-2.5 justify-center">
          <AnimatePresence mode="popLayout">
            {state.order.map((val, idx) => {
              const item = itemMap.get(val);
              const isCorrect = puzzle.goalOrder[idx] === val;
              const isSelected = selectedIndex === idx;
              const isHidden = puzzle.variant === 'blind' && !state.visiblePositions[idx];
              const gradIdx = (val - 1) % ITEM_GRADIENTS.length;

              // For flip mode, highlight items that would be flipped
              const isInFlipRange = activeOp === 'flip' && selectedIndex === null; // all items are clickable
              // For rotate mode with one selected, highlight the potential range
              const isInRotateRange = activeOp === 'rotate' && selectedIndex !== null &&
                idx >= Math.min(selectedIndex, idx) && idx <= Math.max(selectedIndex, idx);

              return (
                <motion.button
                  key={val}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.12, y: -4 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleItemClick(idx)}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center font-bold text-white transition-all duration-200 ${
                    isHidden
                      ? 'bg-slate-700/80 border-2 border-slate-600/60'
                      : `bg-gradient-to-br ${ITEM_GRADIENTS[gradIdx]} shadow-lg ${ITEM_SHADOWS[gradIdx]} border border-white/10`
                  } ${
                    isSelected ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-slate-900 scale-110' : ''
                  }`}
                >
                  <span className="text-base sm:text-lg">
                    {isHidden ? '?' : (item?.label ?? val)}
                  </span>
                  <span className="text-[9px] text-white/50 absolute bottom-0.5">
                    {idx + 1}
                  </span>
                  {isCorrect && !isHidden && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[8px] shadow-md">
                      ✓
                    </span>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Quick operation buttons */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="text-[11px] font-bold text-slate-500 uppercase mb-2 tracking-widest">빠른 연산</div>

        {puzzle.allowedOps.includes('flip') && (
          <div>
            <div className="flex items-center gap-2 text-sm mb-2">
              <RotateCcw className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="font-semibold text-slate-200">뒤집기</span>
              <span className="text-xs text-slate-500">(처음 N개를 뒤집기)</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: state.order.length - 1 }, (_, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleFlipButton(i + 2)}
                  disabled={state.isComplete || state.isFailed}
                  className="px-3 py-2 text-xs rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:border-purple-400/40 hover:bg-purple-500/10 disabled:opacity-30 transition-all font-semibold text-slate-300 shadow-sm min-w-[56px]"
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
              <span className="text-xs text-slate-500">(위치에서 3개 회전)</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: Math.max(0, state.order.length - 2) }, (_, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleRotateButton(i, 3)}
                  disabled={state.isComplete || state.isFailed}
                  className="px-3 py-2 text-xs rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:border-teal-400/40 hover:bg-teal-500/10 disabled:opacity-30 transition-all font-semibold text-slate-300 shadow-sm min-w-[56px]"
                >
                  위치 {i + 1}부터
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {puzzle.allowedOps.includes('swap') && puzzle.allowedOps.length === 1 && (
          <div className="flex items-center gap-2 text-sm">
            <ArrowDownUp className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-slate-400"><strong className="text-slate-200">교환:</strong> 인접한 두 항목을 클릭하여 교환</span>
          </div>
        )}
      </div>

      {/* Move history (last 5) */}
      {state.moveHistory.length > 0 && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
            최근 동작 ({state.moveHistory.length}번째)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {state.moveHistory.slice(-5).map((move, i) => {
              const actualIdx = state.moveHistory.length - 5 + i;
              const idx = actualIdx >= 0 ? actualIdx : i;
              return (
                <span key={idx} className="px-2.5 py-1 text-xs rounded-lg bg-white/5 border border-white/5 text-slate-400">
                  {move.op === 'swap' && `교환 ${move.index + 1}↔${move.index + 2}`}
                  {move.op === 'flip' && `뒤집기 1~${move.count}`}
                  {move.op === 'rotate' && `회전 ${move.index + 1}~${move.index + (move.count ?? 3)}`}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Limited ops warning */}
      {puzzle.variant === 'limited-ops' && puzzle.maxOps !== undefined && (
        <div className={`text-center text-sm font-semibold ${
          (puzzle.maxOps - state.steps) <= 2 ? 'text-red-400' : 'text-slate-400'
        }`}>
          남은 동작: {puzzle.maxOps - state.steps} / {puzzle.maxOps}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleUndo} disabled={state.moveHistory.length === 0 || state.isComplete}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-sm text-slate-400 font-semibold disabled:opacity-30 hover:bg-white/10 transition-all border border-white/5">
          <RotateCcw className="w-4 h-4" />
          되돌리기
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleReset}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-sm text-slate-400 font-semibold hover:bg-white/10 transition-all border border-white/5">
          <RefreshCw className="w-4 h-4" />
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
