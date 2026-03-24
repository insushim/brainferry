'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateWaterJug } from '@/engines/water-jug/generator';
import {
  createInitialState,
  applyMove,
  undo,
  type WaterJugState,
} from '@/engines/water-jug/engine';
import { useAudio } from '@/hooks/useAudio';
import { ArrowRight } from 'lucide-react';

interface WaterJugBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

/* ── SVG Workshop Background ─────────────────────────────────── */
function WorkshopScene({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden">
      <svg
        viewBox="0 0 800 500"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          {/* Stone wall texture */}
          <pattern id="wj-stoneWall" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="#2a2035" />
            <rect x="0" y="0" width="18" height="18" rx="2" fill="#352940" opacity="0.5" />
            <rect x="20" y="20" width="18" height="18" rx="2" fill="#3a2d45" opacity="0.4" />
            <rect x="22" y="2" width="14" height="14" rx="2" fill="#302540" opacity="0.3" />
            <rect x="2" y="24" width="12" height="12" rx="2" fill="#2e2340" opacity="0.35" />
          </pattern>

          {/* Ambient glow */}
          <radialGradient id="wj-ambientGlow" cx="0.5" cy="0.6" r="0.6">
            <stop offset="0%" stopColor="#4a1d8a" stopOpacity="0.12" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* Candle glow filter */}
          <filter id="wj-candleGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Wood grain */}
          <pattern id="wj-woodGrain" width="200" height="10" patternUnits="userSpaceOnUse">
            <rect width="200" height="10" fill="#5c3d2e" />
            <line x1="0" y1="2" x2="200" y2="3" stroke="#4a3225" strokeWidth="0.5" opacity="0.4" />
            <line x1="0" y1="6" x2="200" y2="5.5" stroke="#6b4a3a" strokeWidth="0.3" opacity="0.3" />
            <line x1="0" y1="8" x2="200" y2="8.5" stroke="#4a3225" strokeWidth="0.4" opacity="0.25" />
          </pattern>
        </defs>

        {/* Background */}
        <rect width="800" height="500" fill="url(#wj-stoneWall)" />
        <rect width="800" height="500" fill="url(#wj-ambientGlow)" />

        {/* Spider web in corner */}
        <g opacity="0.06" stroke="white" strokeWidth="0.5" fill="none">
          <path d="M0,0 Q40,25 0,50" />
          <path d="M0,0 Q25,8 50,0" />
          <path d="M0,0 Q20,18 25,40" />
          <path d="M0,0 Q12,12 10,30" />
          <line x1="8" y1="8" x2="30" y2="12" />
          <line x1="5" y1="18" x2="22" y2="24" />
        </g>

        {/* Wooden shelf */}
        <rect x="30" y="300" width="740" height="18" rx="3" fill="url(#wj-woodGrain)" />
        <rect x="30" y="312" width="740" height="6" fill="#3d2418" opacity="0.6" />
        {/* Shelf shadow */}
        <rect x="30" y="318" width="740" height="8" fill="black" opacity="0.15" rx="4" />
        {/* Shelf brackets */}
        <rect x="100" y="305" width="6" height="40" rx="1" fill="#4a3225" />
        <rect x="694" y="305" width="6" height="40" rx="1" fill="#4a3225" />

        {/* Left candle */}
        <rect x="68" y="268" width="10" height="32" fill="#f5e6d3" rx="3" />
        <rect x="70" y="270" width="2" height="28" fill="#e8d5c0" opacity="0.5" />
        <line x1="73" y1="268" x2="73" y2="252" stroke="#444" strokeWidth="0.8" />
        <ellipse cx="73" cy="248" rx="6" ry="12" fill="#fbbf24" filter="url(#wj-candleGlow)" opacity="0.7">
          <animate attributeName="ry" values="12;10;12;11;12" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0.5;0.7;0.6;0.7" dur="2.5s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="73" cy="250" rx="2" ry="5" fill="#fff7ed" opacity="0.9">
          <animate attributeName="ry" values="5;4;5;4.5;5" dur="2s" repeatCount="indefinite" />
        </ellipse>

        {/* Right candle */}
        <rect x="718" y="272" width="8" height="28" fill="#f0dcc8" rx="2" />
        <line x1="722" y1="272" x2="722" y2="258" stroke="#444" strokeWidth="0.7" />
        <ellipse cx="722" cy="254" rx="5" ry="10" fill="#f59e0b" filter="url(#wj-candleGlow)" opacity="0.6">
          <animate attributeName="ry" values="10;8;10;9;10" dur="2.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.45;0.6;0.5;0.6" dur="3.2s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="722" cy="256" rx="1.5" ry="4" fill="#fffbeb" opacity="0.8">
          <animate attributeName="ry" values="4;3;4;3.5;4" dur="2.2s" repeatCount="indefinite" />
        </ellipse>

        {/* Decorative bottles on shelf (left) */}
        <g transform="translate(120, 258)">
          <rect x="0" y="8" width="14" height="34" rx="4" fill="rgba(120,60,180,0.15)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <ellipse cx="7" cy="8" rx="5" ry="4" fill="rgba(120,60,180,0.1)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <rect x="5" y="0" width="4" height="8" rx="2" fill="rgba(120,60,180,0.08)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        </g>

        {/* Decorative bottles on shelf (right) */}
        <g transform="translate(660, 260)">
          <rect x="0" y="12" width="20" height="28" rx="6" fill="rgba(60,180,120,0.12)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <circle cx="10" cy="10" r="8" fill="rgba(60,180,120,0.08)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <rect x="8" y="0" width="4" height="6" rx="2" fill="rgba(60,180,120,0.06)" />
        </g>

        {/* Floating dust particles */}
        <circle cx="150" cy="120" r="1" fill="#fbbf24" opacity="0.15">
          <animate attributeName="cy" values="120;100;120" dur="6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.15;0.05;0.15" dur="6s" repeatCount="indefinite" />
        </circle>
        <circle cx="450" cy="80" r="0.8" fill="#fbbf24" opacity="0.1">
          <animate attributeName="cy" values="80;65;80" dur="8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.1;0.03;0.1" dur="8s" repeatCount="indefinite" />
        </circle>
        <circle cx="620" cy="150" r="1.2" fill="#c084fc" opacity="0.12">
          <animate attributeName="cy" values="150;130;150" dur="7s" repeatCount="indefinite" />
        </circle>

        {/* Stone floor */}
        <rect x="0" y="360" width="800" height="140" fill="#1a1525" />
        <rect x="0" y="360" width="800" height="4" fill="#2a2035" opacity="0.6" />
      </svg>

      {/* Content overlay */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ── SVG Crystal Jug ──────────────────────────────────────────── */
function CrystalJug({
  jugId,
  label,
  level,
  capacity,
  isSelected,
  isTarget,
  isLeaky,
  color,
  targetAmount,
  onClick,
  onFill,
  onEmpty,
  isComplete,
}: {
  jugId: string;
  label: string;
  level: number;
  capacity: number;
  isSelected: boolean;
  isTarget: boolean;
  isLeaky: boolean;
  color?: string;
  targetAmount: number;
  onClick: () => void;
  onFill: () => void;
  onEmpty: () => void;
  isComplete: boolean;
}) {
  const fillPercent = capacity > 0 ? level / capacity : 0;
  const jugHeight = 180;
  const jugWidth = 90;
  const waterY = jugHeight * (1 - fillPercent);

  // Potion colors
  let liquidColor1 = '#60a5fa';
  let liquidColor2 = '#3b82f6';
  let liquidGlow = '#3b82f6';
  if (color === 'red') {
    liquidColor1 = '#f87171';
    liquidColor2 = '#ef4444';
    liquidGlow = '#ef4444';
  } else if (color === 'blue') {
    liquidColor1 = '#818cf8';
    liquidColor2 = '#6366f1';
    liquidGlow = '#6366f1';
  }
  if (isTarget) {
    liquidColor1 = '#34d399';
    liquidColor2 = '#10b981';
    liquidGlow = '#10b981';
  }

  const uid = `jug-${jugId}`;
  const targetY = jugHeight * (1 - targetAmount / capacity);

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex flex-col items-center cursor-pointer select-none"
    >
      {/* Label */}
      <div
        className={`text-xs font-bold mb-2 px-3 py-1 rounded-lg transition-all ${
          isSelected
            ? 'bg-blue-500/25 text-blue-300 shadow-lg shadow-blue-500/20'
            : 'text-slate-400'
        }`}
      >
        {label}
        {isLeaky && <span className="ml-1 text-amber-400">💧</span>}
      </div>

      {/* SVG Jug */}
      <svg
        width={jugWidth + 40}
        height={jugHeight + 30}
        viewBox={`-20 -10 ${jugWidth + 40} ${jugHeight + 30}`}
        className="overflow-visible"
      >
        <defs>
          {/* Glass gradient */}
          <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="30%" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="70%" stopColor="rgba(255,255,255,0.02)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
          </linearGradient>

          {/* Liquid gradient */}
          <linearGradient id={`${uid}-liquid`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={liquidColor1} stopOpacity="0.85" />
            <stop offset="100%" stopColor={liquidColor2} stopOpacity="0.6" />
          </linearGradient>

          {/* Liquid glow */}
          <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Water clip path */}
          <clipPath id={`${uid}-waterClip`}>
            <rect x="6" y="0" width={jugWidth - 12} height={jugHeight} rx="4" />
          </clipPath>

          {/* Selected pulsing glow */}
          {isSelected && (
            <filter id={`${uid}-selectGlow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* Selected highlight ring */}
        {isSelected && (
          <rect
            x="-2"
            y="-2"
            width={jugWidth + 4}
            height={jugHeight + 4}
            rx="14"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2"
            filter={`url(#${uid}-selectGlow)`}
            opacity="0.6"
          >
            <animate
              attributeName="opacity"
              values="0.3;0.7;0.3"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </rect>
        )}

        {/* Target achieved ring */}
        {isTarget && (
          <rect
            x="-3"
            y="-3"
            width={jugWidth + 6}
            height={jugHeight + 6}
            rx="15"
            fill="none"
            stroke="#34d399"
            strokeWidth="2.5"
            opacity="0.5"
          >
            <animate
              attributeName="opacity"
              values="0.3;0.6;0.3"
              dur="2s"
              repeatCount="indefinite"
            />
          </rect>
        )}

        {/* Jug body (glass) */}
        <rect
          x="0"
          y="0"
          width={jugWidth}
          height={jugHeight}
          rx="12"
          fill={`url(#${uid}-glass)`}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
        />

        {/* Inner shadow for depth */}
        <rect
          x="3"
          y="3"
          width={jugWidth - 6}
          height={jugHeight - 6}
          rx="10"
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1"
        />

        {/* Water fill area */}
        <g clipPath={`url(#${uid}-waterClip)`}>
          {/* Water body */}
          <motion.rect
            x="6"
            width={jugWidth - 12}
            height={jugHeight}
            fill={`url(#${uid}-liquid)`}
            animate={{ y: waterY }}
            transition={{ type: 'spring', stiffness: 180, damping: 18 }}
          />

          {/* Water surface wave */}
          {level > 0 && (
            <motion.g animate={{ y: waterY }} transition={{ type: 'spring', stiffness: 180, damping: 18 }}>
              <ellipse
                cx={jugWidth / 2}
                cy="0"
                rx={(jugWidth - 12) / 2}
                ry="3"
                fill={liquidColor1}
                opacity="0.4"
              >
                <animate
                  attributeName="ry"
                  values="3;2;3;2.5;3"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </ellipse>
              {/* Shimmer line */}
              <line
                x1="14"
                y1="0"
                x2={jugWidth - 14}
                y2="0"
                stroke="white"
                strokeWidth="0.8"
                opacity="0.25"
              >
                <animate
                  attributeName="opacity"
                  values="0.25;0.12;0.25"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </line>
            </motion.g>
          )}

          {/* Bubbles */}
          {level > 0 && (
            <motion.g animate={{ y: waterY }} transition={{ type: 'spring', stiffness: 180, damping: 18 }}>
              <circle cx="25" cy="40" r="2" fill="white" opacity="0.15">
                <animate attributeName="cy" values="60;20;60" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.15;0;0.15" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="50" cy="80" r="1.5" fill="white" opacity="0.12">
                <animate attributeName="cy" values="100;30;100" dur="4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.12;0;0.12" dur="4s" repeatCount="indefinite" />
              </circle>
              <circle cx="65" cy="50" r="1" fill="white" opacity="0.1">
                <animate attributeName="cy" values="70;15;70" dur="3.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.1;0;0.1" dur="3.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="35" cy="120" r="1.8" fill="white" opacity="0.1">
                <animate attributeName="cy" values="130;50;130" dur="5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.1;0;0.1" dur="5s" repeatCount="indefinite" />
              </circle>
            </motion.g>
          )}

          {/* Glass shine / refraction */}
          <rect
            x="10"
            y="0"
            width="8"
            height={jugHeight}
            fill="white"
            opacity="0.06"
            rx="4"
          />
          <rect
            x={jugWidth - 22}
            y="0"
            width="4"
            height={jugHeight}
            fill="white"
            opacity="0.03"
            rx="2"
          />
        </g>

        {/* Measurement marks */}
        {Array.from({ length: capacity + 1 }, (_, i) => {
          const markY = jugHeight * (1 - i / capacity);
          const isMajor = i > 0 && i < capacity;
          return (
            <g key={i}>
              <line
                x1="0"
                y1={markY}
                x2={isMajor ? 12 : 6}
                y2={markY}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={isMajor ? 1 : 0.5}
              />
              {isMajor && (
                <text
                  x="-6"
                  y={markY + 3}
                  fill="rgba(255,255,255,0.25)"
                  fontSize="8"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {i}
                </text>
              )}
            </g>
          );
        })}

        {/* Target line (magical glowing line) */}
        {targetAmount <= capacity && (
          <g>
            <line
              x1="-8"
              y1={targetY}
              x2={jugWidth + 8}
              y2={targetY}
              stroke={liquidGlow}
              strokeWidth="1.5"
              strokeDasharray="4,3"
              opacity="0.5"
              filter={`url(#${uid}-glow)`}
            >
              <animate
                attributeName="opacity"
                values="0.3;0.6;0.3"
                dur="2s"
                repeatCount="indefinite"
              />
            </line>
            <text
              x={jugWidth + 12}
              y={targetY + 3}
              fill={liquidGlow}
              fontSize="9"
              fontWeight="bold"
              opacity="0.6"
            >
              {targetAmount}L
            </text>
          </g>
        )}

        {/* Level number */}
        <text
          x={jugWidth / 2}
          y={jugHeight / 2 + 6}
          fill="white"
          fontSize="22"
          fontWeight="900"
          textAnchor="middle"
          opacity="0.9"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
        >
          {level}
        </text>
      </svg>

      {/* Capacity label */}
      <span className="text-sm font-bold mt-1 tabular-nums text-slate-400">{capacity}L</span>

      {/* Action buttons */}
      <div className="flex gap-2 mt-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onFill();
          }}
          disabled={level === capacity || isComplete}
          className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold disabled:opacity-20 transition-colors min-h-[44px] bg-gradient-to-b from-blue-500/20 to-blue-600/10 text-blue-300 border border-blue-500/20 hover:from-blue-500/30 hover:to-blue-600/20"
          title="Fill"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 2v6l-3 3h6l-3-3z" />
            <path d="M6 14c0 4 2.5 6 6 6s6-2 6-6c0-3-6-8-6-8S6 11 6 14z" />
          </svg>
          채우기
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onEmpty();
          }}
          disabled={level === 0 || isComplete}
          className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold disabled:opacity-20 transition-colors min-h-[44px] bg-gradient-to-b from-red-500/20 to-red-600/10 text-red-300 border border-red-500/20 hover:from-red-500/30 hover:to-red-600/20"
          title="Empty"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
          비우기
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
export function WaterJugBoard({ difficulty, seed, onComplete, onFail }: WaterJugBoardProps) {
  const puzzle = useMemo(() => generateWaterJug(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<WaterJugState>(() => createInitialState(puzzle));
  const [selectedJug, setSelectedJug] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { playPour, playError, playClick, playSuccess } = useAudio();

  const capacityMap = useMemo(
    () => new Map(puzzle.jugs.map((j) => [j.id, j.capacity])),
    [puzzle.jugs],
  );

  const jugLabel = useCallback(
    (id: string) => {
      const idx = puzzle.jugs.findIndex((j) => j.id === id);
      return String.fromCharCode(65 + idx); // A, B, C...
    },
    [puzzle.jugs],
  );

  useEffect(() => {
    if (state.isComplete) {
      playSuccess();
      onComplete(state.steps, puzzle.optimalSteps);
    }
  }, [state.isComplete, state.steps, puzzle.optimalSteps, onComplete, playSuccess]);

  // Auto-clear error message
  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 2000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const doMove = useCallback(
    (move: Parameters<typeof applyMove>[1]) => {
      const result = applyMove(state, move, puzzle);
      if ('error' in result) {
        playError();
        setErrorMsg(result.error);
        onFail?.(result.error);
        return;
      }
      playPour();
      setState(result);
    },
    [state, puzzle, playPour, playError, onFail],
  );

  const handleFill = useCallback(
    (jugId: string) => {
      setSelectedJug(null);
      doMove({ action: 'fill', jugId });
    },
    [doMove],
  );

  const handleEmpty = useCallback(
    (jugId: string) => {
      setSelectedJug(null);
      doMove({ action: 'empty', jugId });
    },
    [doMove],
  );

  const handleJugClick = useCallback(
    (jugId: string) => {
      playClick();
      if (selectedJug === null) {
        setSelectedJug(jugId);
      } else if (selectedJug === jugId) {
        setSelectedJug(null);
      } else {
        doMove({ action: 'pour', from: selectedJug, to: jugId });
        setSelectedJug(null);
      }
    },
    [selectedJug, doMove, playClick],
  );

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
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/15 bg-gradient-to-br from-[#1e1530] to-[#15101f] p-4 text-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
        <p className="font-medium mb-3 text-slate-100 relative">{puzzle.story}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-400/20 relative">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-blue-400">
            <path
              d="M12 2C6 12 4 15 4 18a8 8 0 0016 0c0-3-2-6-8-16z"
              fill="currentColor"
              opacity="0.3"
            />
            <path
              d="M12 2C6 12 4 15 4 18a8 8 0 0016 0c0-3-2-6-8-16z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
          <span className="font-bold text-blue-400">
            목표: 정확히 <span className="text-xl tabular-nums">{puzzle.target}</span>리터
            {puzzle.targetJug && (
              <span className="ml-1 text-sm">({jugLabel(puzzle.targetJug)}통에)</span>
            )}
          </span>
        </div>
      </div>

      {/* Pour indicator */}
      <AnimatePresence>
        {selectedJug && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-blue-500/10 border border-blue-400/20 rounded-2xl p-3 text-center text-sm backdrop-blur-md"
          >
            <span className="text-blue-400 font-semibold flex items-center justify-center gap-2">
              <span className="px-2 py-0.5 bg-blue-500/20 rounded-lg text-blue-300 font-bold">
                {jugLabel(selectedJug)} ({state.levels[selectedJug]}L)
              </span>
              <ArrowRight className="w-4 h-4" />
              다른 물통을 클릭하면 부어집니다
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-500/10 border border-red-400/20 rounded-2xl p-3 text-center text-sm backdrop-blur-md text-red-400 font-medium"
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workshop Scene with Jugs */}
      <WorkshopScene>
        <div className="flex flex-wrap gap-4 sm:gap-8 justify-center py-8 px-4">
          {puzzle.jugs.map((jug) => {
            const level = state.levels[jug.id] ?? 0;
            const isSelected = selectedJug === jug.id;
            const isTarget = puzzle.targetJug
              ? jug.id === puzzle.targetJug && level === puzzle.target
              : level === puzzle.target;
            const isLeaky = puzzle.leakyJugId === jug.id;

            return (
              <CrystalJug
                key={jug.id}
                jugId={jug.id}
                label={`${jugLabel(jug.id)}통`}
                level={level}
                capacity={jug.capacity}
                isSelected={isSelected}
                isTarget={isTarget}
                isLeaky={isLeaky}
                color={jug.color}
                targetAmount={puzzle.target}
                onClick={() => handleJugClick(jug.id)}
                onFill={() => handleFill(jug.id)}
                onEmpty={() => handleEmpty(jug.id)}
                isComplete={state.isComplete}
              />
            );
          })}
        </div>
      </WorkshopScene>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleUndo}
          disabled={state.moveHistory.length === 0}
          className="px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-sm text-slate-400 font-semibold disabled:opacity-30 hover:bg-white/10 transition-all border border-white/5"
        >
          되돌리기
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleReset}
          className="px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-sm text-slate-400 font-semibold hover:bg-white/10 transition-all border border-white/5"
        >
          처음부터
        </motion.button>
      </div>

      {/* Steps pill */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-sm">
          <span className="text-slate-400">이동</span>
          <span className="font-bold text-slate-100 tabular-nums">{state.steps}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">최적</span>
          <span className="font-bold text-blue-400 tabular-nums">{puzzle.optimalSteps}</span>
        </div>
      </div>
    </div>
  );
}
