'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateBalanceScale } from '@/engines/balance-scale/generator';
import {
  createInitialState,
  weigh,
  submitAnswer,
  undo,
  type BalanceScaleState,
} from '@/engines/balance-scale/engine';
import { useAudio } from '@/hooks/useAudio';
import { Scale, Send } from 'lucide-react';

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
  const { playScale, playError, playClick, playSuccess } = useAudio();

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
      playError();
      onFail?.(result.error);
      return;
    }
    playScale();
    setState(result);
    setLeftPan([]);
    setRightPan([]);
  }, [state, leftPan, rightPan, puzzle, playScale, playError, onFail]);

  const handleSubmit = useCallback(() => {
    if (answerCoin === null) return;
    const result = submitAnswer(state, answerCoin, answerHeavier, puzzle);
    if ('error' in result) {
      playError();
      onFail?.(result.error);
      return;
    }
    setState(result);
  }, [state, answerCoin, answerHeavier, puzzle, playError, onFail]);

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
  }, [puzzle, playClick]);

  const lastResult = state.weighings.length > 0 ? state.weighings[state.weighings.length - 1] : null;

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

      {/* Weighing status */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-indigo-400" />
          <span className="text-sm text-slate-300">
            측정: <strong className="text-lg tabular-nums text-slate-100">{state.steps}</strong> / {puzzle.maxWeighings}
          </span>
        </div>
        <span className="text-sm text-slate-500">{puzzle.coinCount}개 동전 중 가짜 1개</span>
      </div>

      {/* Scale visualization */}
      <div className="flex items-end justify-center gap-6 py-6">
        {/* Left pan */}
        <div className="text-center flex-1 max-w-[180px]">
          <div className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">왼쪽</div>
          <motion.div
            animate={{ y: lastResult?.result === 'left-heavy' ? 12 : lastResult?.result === 'right-heavy' ? -12 : 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-h-[70px] flex flex-wrap gap-1.5 justify-center items-center"
          >
            {leftPan.map((c) => (
              <CoinChip key={c} index={c} onClick={() => toggleCoin(c, 'left')} selected />
            ))}
            {leftPan.length === 0 && (
              <span className="text-xs text-slate-600">좌클릭으로 추가</span>
            )}
          </motion.div>
        </div>

        {/* Scale icon */}
        <motion.div
          animate={{
            rotate: lastResult?.result === 'left-heavy' ? 8 : lastResult?.result === 'right-heavy' ? -8 : 0,
          }}
          transition={{ type: 'spring', stiffness: 150, damping: 12 }}
          className="text-5xl mb-4 drop-shadow-lg"
        >
          ⚖️
        </motion.div>

        {/* Right pan */}
        <div className="text-center flex-1 max-w-[180px]">
          <div className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">오른쪽</div>
          <motion.div
            animate={{ y: lastResult?.result === 'right-heavy' ? 12 : lastResult?.result === 'left-heavy' ? -12 : 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-h-[70px] flex flex-wrap gap-1.5 justify-center items-center"
          >
            {rightPan.map((c) => (
              <CoinChip key={c} index={c} onClick={() => toggleCoin(c, 'right')} selected />
            ))}
            {rightPan.length === 0 && (
              <span className="text-xs text-slate-600">우클릭으로 추가</span>
            )}
          </motion.div>
        </div>
      </div>

      {/* Coins */}
      <div className="text-center">
        <div className="text-[11px] font-bold text-slate-500 uppercase mb-3 tracking-widest">
          동전 (좌클릭: 왼쪽 / 우클릭: 오른쪽)
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
                onClick={() => toggleCoin(i, 'left')}
                onContextMenu={(e) => { e.preventDefault(); toggleCoin(i, 'right'); }}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-200 ${
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
      </div>

      {/* Weighing history */}
      {state.weighings.length > 0 && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-widest">측정 기록</div>
          <div className="space-y-2">
            {state.weighings.map((w, i) => (
              <div key={i} className="text-sm flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                <span className="font-mono text-xs bg-slate-800 rounded-lg px-2 py-1 border border-white/5 text-slate-300">
                  [{w.left.map((c) => c + 1).join(',')}]
                </span>
                <span className={`text-lg font-bold ${
                  w.result === 'balanced' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {w.result === 'balanced' ? '=' : w.result === 'left-heavy' ? '>' : '<'}
                </span>
                <span className="font-mono text-xs bg-slate-800 rounded-lg px-2 py-1 border border-white/5 text-slate-300">
                  [{w.right.map((c) => c + 1).join(',')}]
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit answer */}
      <div className="bg-indigo-500/10 border border-indigo-400/20 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3">
          <Send className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-indigo-400">답 제출</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={answerCoin ?? ''}
            onChange={(e) => setAnswerCoin(e.target.value ? Number(e.target.value) : null)}
            className="bg-slate-800/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-indigo-400 transition-colors text-slate-200"
          >
            <option value="">동전 선택</option>
            {Array.from({ length: puzzle.coinCount }, (_, i) => (
              <option key={i} value={i}>동전 {i + 1}</option>
            ))}
          </select>
          <select
            value={answerHeavier ? 'heavy' : 'light'}
            onChange={(e) => setAnswerHeavier(e.target.value === 'heavy')}
            className="bg-slate-800/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-indigo-400 transition-colors text-slate-200"
          >
            <option value="heavy">더 무거움</option>
            <option value="light">더 가벼움</option>
          </select>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={answerCoin === null || state.isComplete}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold disabled:opacity-30 hover:from-indigo-400 hover:to-indigo-500 shadow-lg shadow-indigo-500/25 transition-all text-sm"
          >
            제출
          </motion.button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleWeigh}
          disabled={leftPan.length === 0 || rightPan.length === 0 || state.steps >= puzzle.maxWeighings || state.isComplete}
          className={`px-8 py-3 rounded-2xl text-white font-bold disabled:opacity-30 shadow-lg transition-all ${
            leftPan.length > 0 && rightPan.length > 0 && !state.isComplete
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 shadow-blue-500/25 animate-pulse-button'
              : 'bg-white/10 backdrop-blur-sm border border-white/10'
          }`}
        >
          측정하기 ⚖️
        </motion.button>
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

function CoinChip({ index, onClick, selected }: { index: number; onClick: () => void; selected?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
        selected
          ? 'bg-blue-500/20 border border-blue-400/40 text-blue-400'
          : 'bg-white/5 border border-white/10 text-slate-400'
      }`}
    >
      {index + 1}
    </motion.button>
  );
}
