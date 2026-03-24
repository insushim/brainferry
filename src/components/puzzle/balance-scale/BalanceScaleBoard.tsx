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

interface BalanceScaleBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

/* ── SVG sub-components ─────────────────────────────────────── */

function GoldCoin({ index, selected, side, onClick }: {
  index: number; selected: boolean; side?: 'left' | 'right' | 'answer'; onClick: () => void;
}) {
  const highlight = selected
    ? side === 'left' ? '#3b82f6'
    : side === 'right' ? '#f97316'
    : side === 'answer' ? '#818cf8'
    : '#d97706'
    : undefined;

  return (
    <motion.g
      onClick={onClick}
      whileHover={{ scale: 1.12, y: -3 }}
      whileTap={{ scale: 0.9 }}
      style={{ cursor: 'pointer' }}
    >
      {/* Coin glow when selected */}
      {selected && (
        <motion.circle
          cx="0" cy="0" r="28"
          fill={highlight}
          opacity="0.15"
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Coin edge (thickness illusion) */}
      <ellipse cx="0" cy="3" rx="20" ry="20" fill="#92400e" />

      {/* Coin face */}
      <circle cx="0" cy="0" r="20"
        fill="url(#goldCoinFill)"
        stroke={selected ? highlight : '#b45309'}
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {/* Inner ring */}
      <circle cx="0" cy="0" r="15" fill="none" stroke="#b45309" strokeWidth="0.8" opacity="0.5" />

      {/* Embossed number */}
      <text x="0" y="5" textAnchor="middle" fontSize="13" fontWeight="bold"
        fill="#78350f" opacity="0.9"
      >
        {index + 1}
      </text>

      {/* Shine highlight */}
      <ellipse cx="-6" cy="-7" rx="5" ry="7" fill="white" opacity="0.18"
        transform="rotate(-25, -6, -7)" />
    </motion.g>
  );
}

function AlchemyScale({ tiltAngle, leftCoins, rightCoins }: {
  tiltAngle: number; leftCoins: number[]; rightCoins: number[];
}) {
  const beamY = 135;
  const pillarBottom = 320;

  return (
    <g>
      {/* Ornate base */}
      <path d="M340,320 Q370,330 400,335 Q430,330 460,320 L470,340 Q435,350 400,355 Q365,350 330,340 Z"
        fill="url(#scaleBeam)" stroke="#92400e" strokeWidth="1" />
      <ellipse cx="400" cy="345" rx="50" ry="8" fill="#92400e" opacity="0.4" />

      {/* Center pillar with ornament */}
      <rect x="394" y={beamY + 15} width="12" height={pillarBottom - beamY - 15}
        fill="url(#scaleBeam)" rx="2" />
      {/* Pillar decorative bands */}
      <rect x="391" y={beamY + 50} width="18" height="6" rx="3" fill="#d97706" />
      <rect x="391" y={beamY + 100} width="18" height="6" rx="3" fill="#d97706" />

      {/* Top ornament */}
      <circle cx="400" cy={beamY + 8} r="10" fill="#d97706" stroke="#92400e" strokeWidth="1.5" />
      <circle cx="400" cy={beamY + 8} r="5" fill="#fbbf24" opacity="0.4" />

      {/* Beam */}
      <motion.g
        animate={{ rotate: tiltAngle }}
        transition={{ type: 'spring', stiffness: 120, damping: 14 }}
        style={{ originX: '400px', originY: `${beamY + 8}px` }}
      >
        <rect x="180" y={beamY} width="440" height="8" rx="4"
          fill="url(#scaleBeam)" stroke="#92400e" strokeWidth="0.5" />

        {/* Chain links - left */}
        {[0, 1, 2, 3].map(i => (
          <g key={`lchain-${i}`}>
            <ellipse cx="210" cy={beamY + 15 + i * 18} rx="4" ry="7"
              fill="none" stroke="#d97706" strokeWidth="1.5" />
          </g>
        ))}

        {/* Chain links - right */}
        {[0, 1, 2, 3].map(i => (
          <g key={`rchain-${i}`}>
            <ellipse cx="590" cy={beamY + 15 + i * 18} rx="4" ry="7"
              fill="none" stroke="#d97706" strokeWidth="1.5" />
          </g>
        ))}

        {/* Left pan */}
        <g>
          <ellipse cx="210" cy={beamY + 90} rx="75" ry="14"
            fill="url(#panGrad)" stroke="#4b5563" strokeWidth="1" />
          {/* Pan rim highlight */}
          <ellipse cx="210" cy={beamY + 87} rx="70" ry="10"
            fill="none" stroke="#6b7280" strokeWidth="0.5" opacity="0.4" />

          {/* Coins in left pan */}
          {leftCoins.map((coinIdx, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const cx = 180 + col * 20 - (leftCoins.length > 4 ? 0 : (4 - leftCoins.length) * 10);
            const cy = beamY + 80 - row * 15;
            return (
              <g key={`lcoin-${coinIdx}`} transform={`translate(${cx}, ${cy}) scale(0.55)`}>
                <circle r="18" fill="url(#goldCoinFill)" stroke="#b45309" strokeWidth="1.5" />
                <text textAnchor="middle" y="5" fontSize="12" fontWeight="bold" fill="#78350f">
                  {coinIdx + 1}
                </text>
              </g>
            );
          })}
        </g>

        {/* Right pan */}
        <g>
          <ellipse cx="590" cy={beamY + 90} rx="75" ry="14"
            fill="url(#panGrad)" stroke="#4b5563" strokeWidth="1" />
          <ellipse cx="590" cy={beamY + 87} rx="70" ry="10"
            fill="none" stroke="#6b7280" strokeWidth="0.5" opacity="0.4" />

          {/* Coins in right pan */}
          {rightCoins.map((coinIdx, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const cx = 560 + col * 20 - (rightCoins.length > 4 ? 0 : (4 - rightCoins.length) * 10);
            const cy = beamY + 80 - row * 15;
            return (
              <g key={`rcoin-${coinIdx}`} transform={`translate(${cx}, ${cy}) scale(0.55)`}>
                <circle r="18" fill="url(#goldCoinFill)" stroke="#b45309" strokeWidth="1.5" />
                <text textAnchor="middle" y="5" fontSize="12" fontWeight="bold" fill="#78350f">
                  {coinIdx + 1}
                </text>
              </g>
            );
          })}
        </g>
      </motion.g>
    </g>
  );
}

/* ── Main component ─────────────────────────────────────────── */

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

  const tiltAngle = lastResult
    ? lastResult.result === 'left-heavy' ? 6
    : lastResult.result === 'right-heavy' ? -6
    : 0
    : 0;

  /* Layout for coin grid in SVG */
  const coinsPerRow = Math.min(puzzle.coinCount, 8);
  const coinSpacing = Math.min(56, 640 / coinsPerRow);
  const coinRows = Math.ceil(puzzle.coinCount / coinsPerRow);
  const coinGridStartX = (800 - (coinsPerRow - 1) * coinSpacing) / 2;

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
          <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="12" y1="6" x2="12" y2="20" />
            <path d="M6,6 L3,14 Q6,17 9,14 Z" /><path d="M18,6 L15,14 Q18,17 21,14 Z" />
          </svg>
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

      {/* ── Alchemist Lab Scale SVG ── */}
      <svg viewBox="0 0 800 380" className="w-full rounded-2xl overflow-hidden" style={{ maxHeight: '45vh' }}>
        <defs>
          <linearGradient id="scaleBeam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          <radialGradient id="panGrad" cx="0.4" cy="0.3">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#1f2937" />
          </radialGradient>

          <radialGradient id="goldCoinFill" cx="0.35" cy="0.35">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>

          {/* Potion bottle gradient */}
          <linearGradient id="potionGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="potionPurple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="potionRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Lab background */}
        <rect width="800" height="380" fill="#1a1025" />

        {/* Stone wall texture lines */}
        <line x1="0" y1="60" x2="800" y2="60" stroke="#2d1f3d" strokeWidth="0.5" />
        <line x1="0" y1="120" x2="800" y2="120" stroke="#2d1f3d" strokeWidth="0.5" />
        <rect x="0" y="340" width="800" height="40" fill="#15101e" />

        {/* Shelf */}
        <rect x="20" y="50" width="160" height="8" fill="#3d2814" rx="2" />
        <rect x="620" y="50" width="160" height="8" fill="#3d2814" rx="2" />

        {/* Potion bottles on left shelf */}
        <g transform="translate(50, 15)">
          {/* Tall bottle */}
          <rect x="-4" y="20" width="8" height="4" fill="#4b5563" rx="1" />
          <rect x="-6" y="24" width="12" height="20" rx="3" fill="url(#potionGreen)" />
          <motion.ellipse cx="0" cy="30" rx="4" ry="3" fill="#6ee7b7" opacity="0.3"
            animate={{ opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 3, repeat: Infinity }} />
        </g>
        <g transform="translate(90, 20)">
          {/* Round flask */}
          <rect x="-3" y="14" width="6" height="6" fill="#4b5563" rx="1" />
          <circle cx="0" cy="30" r="10" fill="url(#potionPurple)" />
          <motion.circle cx="-3" cy="27" r="2" fill="#c4b5fd" opacity="0.3"
            animate={{ cy: [27, 24, 27] }}
            transition={{ duration: 2, repeat: Infinity }} />
        </g>
        <g transform="translate(140, 18)">
          <rect x="-3" y="18" width="6" height="4" fill="#4b5563" rx="1" />
          <rect x="-5" y="22" width="10" height="16" rx="2" fill="url(#potionRed)" />
        </g>

        {/* Potion bottles on right shelf */}
        <g transform="translate(660, 20)">
          <rect x="-3" y="14" width="6" height="6" fill="#4b5563" rx="1" />
          <circle cx="0" cy="30" r="10" fill="url(#potionGreen)" />
        </g>
        <g transform="translate(720, 15)">
          <rect x="-4" y="20" width="8" height="4" fill="#4b5563" rx="1" />
          <rect x="-6" y="24" width="12" height="20" rx="3" fill="url(#potionPurple)" />
        </g>

        {/* Mystical particles */}
        {[
          { cx: 50, cy: 150, delay: 0 },
          { cx: 750, cy: 200, delay: 1.5 },
          { cx: 100, cy: 280, delay: 3 },
          { cx: 680, cy: 300, delay: 0.5 },
        ].map((p, i) => (
          <motion.circle
            key={`particle-${i}`}
            cx={p.cx} cy={p.cy} r="1.5"
            fill="#a78bfa"
            animate={{ opacity: [0, 0.5, 0], cy: [p.cy, p.cy - 30, p.cy - 60] }}
            transition={{ duration: 4, repeat: Infinity, delay: p.delay }}
          />
        ))}

        {/* The scale */}
        <AlchemyScale tiltAngle={tiltAngle} leftCoins={leftPan} rightCoins={rightPan} />

        {/* Left pan label */}
        <text x="210" y="375" textAnchor="middle" fontSize="11" fontWeight="bold"
          fill="#60a5fa" opacity="0.7">왼쪽</text>
        {/* Right pan label */}
        <text x="590" y="375" textAnchor="middle" fontSize="11" fontWeight="bold"
          fill="#fb923c" opacity="0.7">오른쪽</text>
      </svg>

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
          {/* Coins grid */}
          <div className="text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-3 tracking-widest">
              동전 선택 (탭: 왼쪽 / 길게 누르기: 오른쪽)
            </div>

            {/* SVG coin grid */}
            <svg viewBox={`0 0 800 ${coinRows * 56 + 10}`} className="w-full" style={{ maxHeight: '20vh' }}>
              <defs>
                <radialGradient id="goldCoinGrid" cx="0.35" cy="0.35">
                  <stop offset="0%" stopColor="#fcd34d" />
                  <stop offset="60%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </radialGradient>
              </defs>
              {Array.from({ length: puzzle.coinCount }, (_, i) => {
                const row = Math.floor(i / coinsPerRow);
                const col = i % coinsPerRow;
                const itemsInRow = Math.min(coinsPerRow, puzzle.coinCount - row * coinsPerRow);
                const rowStartX = (800 - (itemsInRow - 1) * coinSpacing) / 2;
                const cx = rowStartX + col * coinSpacing;
                const cy = 28 + row * 56;
                const inLeft = leftPan.includes(i);
                const inRight = rightPan.includes(i);
                return (
                  <g key={i} transform={`translate(${cx}, ${cy})`}>
                    <GoldCoin
                      index={i}
                      selected={inLeft || inRight}
                      side={inLeft ? 'left' : inRight ? 'right' : undefined}
                      onClick={() => {
                        if (inLeft) {
                          toggleCoin(i, 'left');
                        } else if (inRight) {
                          toggleCoin(i, 'right');
                        } else {
                          toggleCoin(i, 'left');
                        }
                      }}
                    />
                    {/* Right-click area for mobile (context menu) */}
                    <rect x={-22} y={-22} width={44} height={44} fill="transparent"
                      onContextMenu={(e) => { e.preventDefault(); toggleCoin(i, 'right'); }}
                    />
                  </g>
                );
              })}
            </svg>

            <div className="flex gap-2 justify-center mt-2">
              <span className="text-xs text-slate-500 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                좌클릭 = 왼쪽 | 우클릭 = 오른쪽
              </span>
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
            <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
            </svg>
            <span className="text-sm font-bold text-indigo-400">가짜 동전 지목</span>
          </div>

          {/* Coin selection for answer - SVG */}
          <svg viewBox={`0 0 800 ${coinRows * 56 + 10}`} className="w-full" style={{ maxHeight: '20vh' }}>
            <defs>
              <radialGradient id="goldCoinAnswer" cx="0.35" cy="0.35">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="60%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </radialGradient>
            </defs>
            {Array.from({ length: puzzle.coinCount }, (_, i) => {
              const row = Math.floor(i / coinsPerRow);
              const col = i % coinsPerRow;
              const itemsInRow = Math.min(coinsPerRow, puzzle.coinCount - row * coinsPerRow);
              const rowStartX = (800 - (itemsInRow - 1) * coinSpacing) / 2;
              const cx = rowStartX + col * coinSpacing;
              const cy = 28 + row * 56;
              return (
                <g key={i} transform={`translate(${cx}, ${cy})`}>
                  <GoldCoin
                    index={i}
                    selected={answerCoin === i}
                    side="answer"
                    onClick={() => { playClick(); setAnswerCoin(i); }}
                  />
                </g>
              );
            })}
          </svg>

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
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          되돌리기
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleReset}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-sm text-slate-400 font-semibold hover:bg-white/10 transition-all border border-white/5">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
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
