'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateBalanceScale } from '@/engines/balance-scale/generator';
import {
  createInitialState,
  weigh,
  submitAnswer,
  undo,
  type BalanceScaleState,
} from '@/engines/balance-scale/engine';
import { useAudio } from '@/hooks/useAudio';
import { Scale, Send, RotateCcw, RefreshCw } from 'lucide-react';

interface BalanceScaleBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

export function BalanceScaleBoard({ difficulty, seed, onComplete, onFail }: BalanceScaleBoardProps) {
  const puzzle = useMemo(() => generateBalanceScale(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<BalanceScaleState>(() => createInitialState(puzzle));
  const [leftPan, setLeftPan] = useState<number[]>([]);
  const [rightPan, setRightPan] = useState<number[]>([]);
  const [answerCoin, setAnswerCoin] = useState<number | null>(null);
  const [answerHeavier, setAnswerHeavier] = useState(true);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [mode, setMode] = useState<'weigh' | 'guess'>('weigh');
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { playScale, playError, playClick, playSuccess } = useAudio();

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

  const toggleCoin = useCallback(
    (coinIdx: number, side: 'left' | 'right') => {
      playClick();
      if (side === 'left') {
        setLeftPan((prev) =>
          prev.includes(coinIdx) ? prev.filter((c) => c !== coinIdx) : [...prev, coinIdx]
        );
        setRightPan((prev) => prev.filter((c) => c !== coinIdx));
      } else {
        setRightPan((prev) =>
          prev.includes(coinIdx) ? prev.filter((c) => c !== coinIdx) : [...prev, coinIdx]
        );
        setLeftPan((prev) => prev.filter((c) => c !== coinIdx));
      }
    },
    [playClick],
  );

  const handleWeigh = useCallback(() => {
    const result = weigh(state, leftPan, rightPan, puzzle);
    if ('error' in result) {
      showError(result.error);
      return;
    }
    playScale();
    setState(result);
    setLeftPan([]);
    setRightPan([]);
  }, [state, leftPan, rightPan, puzzle, playScale, showError]);

  const handleSubmit = useCallback(() => {
    if (answerCoin === null) {
      showError('동전을 선택해주세요.');
      return;
    }
    const result = submitAnswer(state, answerCoin, answerHeavier, puzzle);
    if ('error' in result) {
      showError(result.error);
      return;
    }
    setState(result);
  }, [state, answerCoin, answerHeavier, puzzle, showError]);

  const handleUndo = useCallback(() => {
    if (state.moveHistory.length === 0) return;
    playClick();
    setState(undo(state));
  }, [state, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
    setLeftPan([]);
    setRightPan([]);
    setAnswerCoin(null);
    setMode('weigh');
  }, [puzzle, playClick]);

  const lastResult = state.weighings.length > 0 ? state.weighings[state.weighings.length - 1] : null;
  const remainingWeighings = puzzle.maxWeighings - state.steps;

  return (
    <div className="space-y-4">
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

      {/* Weighing status */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-indigo-400" />
          <span className="text-sm text-slate-300">
            남은 측정: <strong className={`text-lg tabular-nums ${remainingWeighings <= 1 ? 'text-red-400' : 'text-slate-100'}`}>{remainingWeighings}</strong> / {puzzle.maxWeighings}
          </span>
        </div>
        <span className="text-sm text-slate-500">
          {puzzle.variant === 'multiple-fake'
            ? `${puzzle.coinCount}개 동전 중 가짜 ${puzzle.fakeCoinIndices?.length ?? 2}개`
            : `${puzzle.coinCount}개 동전 중 가짜 1개`
          }
        </span>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { playClick(); setMode('weigh'); }}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            mode === 'weigh'
              ? 'bg-blue-500/20 border border-blue-400/40 text-blue-400'
              : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
          }`}
        >
          측정하기
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { playClick(); setMode('guess'); }}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            mode === 'guess'
              ? 'bg-indigo-500/20 border border-indigo-400/40 text-indigo-400'
              : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
          }`}
        >
          가짜 동전 지목
        </motion.button>
      </div>

      {mode === 'weigh' ? (
        <>
          {/* Scale visualization */}
          <div className="flex items-end justify-center gap-4 sm:gap-6 py-4">
            {/* Left pan */}
            <div className="text-center flex-1 max-w-[200px]">
              <div className="text-[11px] font-bold text-blue-400/70 mb-2 uppercase tracking-widest">왼쪽</div>
              <motion.div
                animate={{ y: lastResult?.result === 'left-heavy' ? 12 : lastResult?.result === 'right-heavy' ? -12 : 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="bg-blue-500/10 backdrop-blur-md border border-blue-400/20 rounded-2xl p-3 min-h-[70px] flex flex-wrap gap-1.5 justify-center items-center"
              >
                {leftPan.map((c) => (
                  <CoinChip key={c} index={c} onClick={() => toggleCoin(c, 'left')} side="left" />
                ))}
                {leftPan.length === 0 && (
                  <span className="text-xs text-slate-600">아래에서 동전 선택</span>
                )}
              </motion.div>
            </div>

            {/* Scale icon */}
            <motion.div
              animate={{
                rotate: lastResult?.result === 'left-heavy' ? 8 : lastResult?.result === 'right-heavy' ? -8 : 0,
              }}
              transition={{ type: 'spring', stiffness: 150, damping: 12 }}
              className="text-5xl mb-4 drop-shadow-lg shrink-0"
            >
              <Scale className="w-12 h-12 text-indigo-400" />
            </motion.div>

            {/* Right pan */}
            <div className="text-center flex-1 max-w-[200px]">
              <div className="text-[11px] font-bold text-orange-400/70 mb-2 uppercase tracking-widest">오른쪽</div>
              <motion.div
                animate={{ y: lastResult?.result === 'right-heavy' ? 12 : lastResult?.result === 'left-heavy' ? -12 : 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="bg-orange-500/10 backdrop-blur-md border border-orange-400/20 rounded-2xl p-3 min-h-[70px] flex flex-wrap gap-1.5 justify-center items-center"
              >
                {rightPan.map((c) => (
                  <CoinChip key={c} index={c} onClick={() => toggleCoin(c, 'right')} side="right" />
                ))}
                {rightPan.length === 0 && (
                  <span className="text-xs text-slate-600">아래에서 동전 선택</span>
                )}
              </motion.div>
            </div>
          </div>

          {/* Coins grid */}
          <div className="text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-3 tracking-widest">
              동전 선택 (탭: 왼쪽 / 길게 누르기: 오른쪽)
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from({ length: puzzle.coinCount }, (_, i) => {
                const inLeft = leftPan.includes(i);
                const inRight = rightPan.includes(i);
                return (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.08, y: -2 }}
                    onClick={() => {
                      if (inLeft) {
                        toggleCoin(i, 'left'); // remove from left
                      } else if (inRight) {
                        toggleCoin(i, 'right'); // remove from right
                      } else {
                        toggleCoin(i, 'left'); // add to left by default
                      }
                    }}
                    onContextMenu={(e) => { e.preventDefault(); toggleCoin(i, 'right'); }}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-200 ${
                      inLeft
                        ? 'bg-blue-500/20 border-blue-400/60 text-blue-400 shadow-md shadow-blue-500/15'
                        : inRight
                        ? 'bg-orange-500/20 border-orange-400/60 text-orange-400 shadow-md shadow-orange-500/15'
                        : 'bg-gradient-to-b from-amber-600 to-amber-800 border-amber-500/40 text-amber-200 hover:border-blue-400/40 cursor-pointer shadow-lg shadow-black/10'
                    }`}
                    title={`동전 ${i + 1}`}
                  >
                    {i + 1}
                  </motion.button>
                );
              })}
            </div>
            {/* Quick side buttons for mobile */}
            <div className="flex gap-2 justify-center mt-3">
              <button
                onClick={() => {
                  // Move all unassigned from left to right or swap
                  const unassigned = Array.from({ length: puzzle.coinCount }, (_, i) => i)
                    .filter(i => !leftPan.includes(i) && !rightPan.includes(i));
                  if (unassigned.length > 0) {
                    // No-op, just show hint
                  }
                }}
                className="text-xs text-slate-500 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5"
                title="선택된 동전을 오른쪽으로 이동"
                disabled
              >
                좌클릭 = 왼쪽 | 우클릭 = 오른쪽
              </button>
            </div>
          </div>

          {/* Weigh button */}
          <div className="flex justify-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleWeigh}
              disabled={leftPan.length === 0 || rightPan.length === 0 || state.steps >= puzzle.maxWeighings || state.isComplete || state.isFailed}
              className={`px-8 py-3.5 rounded-2xl text-white font-bold disabled:opacity-30 shadow-lg transition-all text-base ${
                leftPan.length > 0 && rightPan.length > 0 && !state.isComplete && !state.isFailed
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 shadow-blue-500/25 animate-pulse-button'
                  : 'bg-white/10 backdrop-blur-sm border border-white/10'
              }`}
            >
              측정하기 ({leftPan.length} vs {rightPan.length})
            </motion.button>
          </div>
        </>
      ) : (
        /* Guess mode */
        <div className="bg-indigo-500/10 border border-indigo-400/20 rounded-2xl p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Send className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-bold text-indigo-400">가짜 동전 지목</span>
          </div>

          {/* Coin selection for answer */}
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from({ length: puzzle.coinCount }, (_, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.08 }}
                onClick={() => { playClick(); setAnswerCoin(i); }}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-200 ${
                  answerCoin === i
                    ? 'bg-indigo-500/30 border-indigo-400/60 text-indigo-300 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-400/40'
                    : 'bg-gradient-to-b from-amber-600 to-amber-800 border-amber-500/40 text-amber-200 hover:border-indigo-400/40 cursor-pointer shadow-lg shadow-black/10'
                }`}
              >
                {i + 1}
              </motion.button>
            ))}
          </div>

          {/* Weight direction */}
          {!puzzle.unknownDirection && puzzle.variant !== 'multiple-fake' ? (
            <div className="text-center text-sm text-slate-400">
              가짜 동전은 {puzzle.fakeIsHeavier ? '더 무겁습니다' : '더 가볍습니다'} (힌트에서 알 수 있음)
            </div>
          ) : (
            <div className="flex gap-3 justify-center">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { playClick(); setAnswerHeavier(true); }}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  answerHeavier
                    ? 'bg-red-500/20 border border-red-400/40 text-red-400'
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                더 무거움
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { playClick(); setAnswerHeavier(false); }}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  !answerHeavier
                    ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-400'
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                더 가벼움
              </motion.button>
            </div>
          )}

          <div className="flex justify-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={answerCoin === null || state.isComplete || state.isFailed}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold disabled:opacity-30 hover:from-indigo-400 hover:to-indigo-500 shadow-lg shadow-indigo-500/25 transition-all text-sm"
            >
              이 동전이 가짜!
            </motion.button>
          </div>
        </div>
      )}

      {/* Weighing history */}
      {state.weighings.length > 0 && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-widest">측정 기록</div>
          <div className="space-y-2">
            {state.weighings.map((w, i) => (
              <div key={i} className="text-sm flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-slate-500 tabular-nums w-5 shrink-0">#{i + 1}</span>
                <span className="font-mono text-xs bg-blue-500/10 rounded-lg px-2.5 py-1 border border-blue-400/20 text-blue-300">
                  [{w.left.map((c) => c + 1).join(', ')}]
                </span>
                <span className={`text-lg font-bold shrink-0 ${
                  w.result === 'balanced' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {w.result === 'balanced' ? '=' : w.result === 'left-heavy' ? '>' : '<'}
                </span>
                <span className="font-mono text-xs bg-orange-500/10 rounded-lg px-2.5 py-1 border border-orange-400/20 text-orange-300">
                  [{w.right.map((c) => c + 1).join(', ')}]
                </span>
                <span className="text-xs text-slate-500 ml-auto shrink-0">
                  {w.result === 'balanced' ? '균형' : w.result === 'left-heavy' ? '왼쪽 무거움' : '오른쪽 무거움'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleUndo} disabled={state.moveHistory.length === 0 || state.isComplete || state.isFailed}
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
          <span className="text-slate-400">측정</span>
          <span className="font-bold text-slate-100 tabular-nums">{state.steps}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">최적</span>
          <span className="font-bold text-blue-400 tabular-nums">{puzzle.optimalSteps}</span>
        </div>
      </div>
    </div>
  );
}

function CoinChip({ index, onClick, side }: { index: number; onClick: () => void; side: 'left' | 'right' }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
        side === 'left'
          ? 'bg-blue-500/20 border border-blue-400/40 text-blue-400'
          : 'bg-orange-500/20 border border-orange-400/40 text-orange-400'
      }`}
    >
      {index + 1}
    </motion.button>
  );
}
