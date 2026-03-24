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

  const usedCoins = useMemo(() => new Set([...leftPan, ...rightPan]), [leftPan, rightPan]);

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
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-sm">
        <p className="font-medium mb-2">{puzzle.story}</p>
        <ul className="space-y-1 text-[var(--text-secondary)]">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-primary">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Weighing status */}
      <div className="bg-[var(--bg-secondary)] rounded-xl p-3 text-sm flex items-center justify-between">
        <span>측정: <strong>{state.steps}</strong> / {puzzle.maxWeighings}</span>
        <span className="text-[var(--text-secondary)]">{puzzle.coinCount}개 동전 중 가짜 1개</span>
      </div>

      {/* Scale visualization */}
      <div className="flex items-end justify-center gap-4 py-4">
        {/* Left pan */}
        <div className="text-center">
          <div className="text-xs font-bold text-[var(--text-secondary)] mb-2">왼쪽</div>
          <motion.div
            animate={{ y: lastResult?.result === 'left-heavy' ? 10 : lastResult?.result === 'right-heavy' ? -10 : 0 }}
            className="bg-[var(--card)] border-2 border-[var(--border)] rounded-xl p-3 min-w-[100px] min-h-[60px] flex flex-wrap gap-1 justify-center items-center"
          >
            {leftPan.map((c) => (
              <CoinChip key={c} index={c} onClick={() => toggleCoin(c, 'left')} selected />
            ))}
            {leftPan.length === 0 && <span className="text-xs text-[var(--text-secondary)]">드래그</span>}
          </motion.div>
        </div>

        {/* Scale */}
        <div className="text-4xl mb-2">⚖️</div>

        {/* Right pan */}
        <div className="text-center">
          <div className="text-xs font-bold text-[var(--text-secondary)] mb-2">오른쪽</div>
          <motion.div
            animate={{ y: lastResult?.result === 'right-heavy' ? 10 : lastResult?.result === 'left-heavy' ? -10 : 0 }}
            className="bg-[var(--card)] border-2 border-[var(--border)] rounded-xl p-3 min-w-[100px] min-h-[60px] flex flex-wrap gap-1 justify-center items-center"
          >
            {rightPan.map((c) => (
              <CoinChip key={c} index={c} onClick={() => toggleCoin(c, 'right')} selected />
            ))}
            {rightPan.length === 0 && <span className="text-xs text-[var(--text-secondary)]">드래그</span>}
          </motion.div>
        </div>
      </div>

      {/* Coins */}
      <div className="text-center">
        <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
          동전 (클릭 → 왼쪽 / 오른쪽 클릭 → 오른쪽)
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {Array.from({ length: puzzle.coinCount }, (_, i) => {
            const inLeft = leftPan.includes(i);
            const inRight = rightPan.includes(i);
            const isUsed = inLeft || inRight;
            return (
              <div key={i} className="flex gap-0.5">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleCoin(i, 'left')}
                  onContextMenu={(e) => { e.preventDefault(); toggleCoin(i, 'right'); }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    inLeft ? 'bg-blue-500/20 border-blue-500 text-blue-600' :
                    inRight ? 'bg-orange-500/20 border-orange-500 text-orange-600' :
                    'bg-[var(--card)] border-[var(--border)] hover:border-primary cursor-pointer'
                  }`}
                  title={`동전 ${i + 1} — 좌클릭: 왼쪽, 우클릭: 오른쪽`}
                >
                  {i + 1}
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weighing history */}
      {state.weighings.length > 0 && (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
          <div className="text-xs font-bold text-[var(--text-secondary)] mb-2">측정 기록</div>
          {state.weighings.map((w, i) => (
            <div key={i} className="text-sm flex items-center gap-2 mb-1">
              <span className="font-mono">[{w.left.map((c) => c + 1).join(',')}]</span>
              <span className={`font-bold ${
                w.result === 'balanced' ? 'text-success' : 'text-warning'
              }`}>
                {w.result === 'balanced' ? '=' : w.result === 'left-heavy' ? '>' : '<'}
              </span>
              <span className="font-mono">[{w.right.map((c) => c + 1).join(',')}]</span>
            </div>
          ))}
        </div>
      )}

      {/* Submit answer */}
      <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
        <div className="text-sm font-bold text-accent mb-2">답 제출</div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={answerCoin ?? ''}
            onChange={(e) => setAnswerCoin(e.target.value ? Number(e.target.value) : null)}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">동전 선택</option>
            {Array.from({ length: puzzle.coinCount }, (_, i) => (
              <option key={i} value={i}>동전 {i + 1}</option>
            ))}
          </select>
          <select
            value={answerHeavier ? 'heavy' : 'light'}
            onChange={(e) => setAnswerHeavier(e.target.value === 'heavy')}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="heavy">더 무거움</option>
            <option value="light">더 가벼움</option>
          </select>
          <button
            onClick={handleSubmit}
            disabled={answerCoin === null || state.isComplete}
            className="px-4 py-2 rounded-xl bg-accent text-white font-bold disabled:opacity-40 hover:bg-accent/80 transition-colors text-sm"
          >
            제출
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={handleWeigh}
          disabled={leftPan.length === 0 || rightPan.length === 0 || state.steps >= puzzle.maxWeighings || state.isComplete}
          className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold disabled:opacity-40 hover:bg-primary-dark transition-colors"
        >
          측정하기 ⚖️
        </button>
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
        측정: <span className="font-bold text-[var(--text)]">{state.steps}</span>
        {' / 최적: '}
        <span className="font-bold text-primary">{puzzle.optimalSteps}</span>
      </div>
    </div>
  );
}

function CoinChip({ index, onClick, selected }: { index: number; onClick: () => void; selected?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
        selected ? 'bg-primary/20 border border-primary text-primary' : 'bg-[var(--bg-secondary)] border border-[var(--border)]'
      }`}
    >
      {index + 1}
    </button>
  );
}
