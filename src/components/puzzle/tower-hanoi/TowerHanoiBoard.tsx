'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateHanoi } from '@/engines/tower-hanoi/generator';
import {
  createInitialState,
  applyMove,
  undo,
  type HanoiState,
} from '@/engines/tower-hanoi/engine';
import { useAudio } from '@/hooks/useAudio';

interface TowerHanoiBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

/* ── Gemstone disc color palette ──────────────────────────────── */
const GEM_COLORS = [
  { base: '#dc2626', light: '#fca5a5', dark: '#991b1b', name: 'ruby' },       // 1
  { base: '#f59e0b', light: '#fde68a', dark: '#b45309', name: 'amber' },       // 2
  { base: '#10b981', light: '#6ee7b7', dark: '#065f46', name: 'emerald' },     // 3
  { base: '#3b82f6', light: '#93c5fd', dark: '#1e3a8a', name: 'sapphire' },    // 4
  { base: '#8b5cf6', light: '#c4b5fd', dark: '#5b21b6', name: 'amethyst' },    // 5
  { base: '#ec4899', light: '#f9a8d4', dark: '#9d174d', name: 'rose' },        // 6
  { base: '#06b6d4', light: '#67e8f9', dark: '#155e75', name: 'aqua' },        // 7
  { base: '#eab308', light: '#fef08a', dark: '#854d0e', name: 'topaz' },       // 8
];

/* ── Temple Background SVG ────────────────────────────────────── */
function TempleScene({
  pegCount,
  maxDiscs,
  pegHeight,
  children,
}: {
  pegCount: number;
  maxDiscs: number;
  pegHeight: number;
  children: React.ReactNode;
}) {
  const svgWidth = 900;
  const svgHeight = pegHeight + 120;
  const floorY = svgHeight - 60;
  const pegSpacing = svgWidth / (pegCount + 1);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          {/* Night sky / nebula gradient */}
          <radialGradient id="th-nebula" cx="0.3" cy="0.2" r="0.8">
            <stop offset="0%" stopColor="#1a0533" />
            <stop offset="40%" stopColor="#0f0a22" />
            <stop offset="100%" stopColor="#070710" />
          </radialGradient>

          {/* Secondary nebula accent */}
          <radialGradient id="th-nebula2" cx="0.7" cy="0.3" r="0.5">
            <stop offset="0%" stopColor="#1e1040" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* Stone floor */}
          <linearGradient id="th-stoneFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* Stone floor texture */}
          <pattern id="th-floorTex" width="60" height="30" patternUnits="userSpaceOnUse">
            <rect width="60" height="30" fill="#2d3748" />
            <rect x="0" y="0" width="28" height="14" rx="1" fill="#374151" opacity="0.4" />
            <rect x="30" y="15" width="28" height="14" rx="1" fill="#3d4f65" opacity="0.3" />
          </pattern>

          {/* Stone column gradient */}
          <linearGradient id="th-column" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="30%" stopColor="#9ca3af" />
            <stop offset="50%" stopColor="#d1d5db" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>

          {/* Peg glow */}
          <filter id="th-pegGlow" x="-50%" y="-10%" width="200%" height="120%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Star glow */}
          <filter id="th-starGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {/* Night sky */}
        <rect width={svgWidth} height={svgHeight} fill="url(#th-nebula)" />
        <rect width={svgWidth} height={svgHeight} fill="url(#th-nebula2)" />

        {/* Stars */}
        {[
          { x: 80, y: 30, r: 1.2, d: '4s' },
          { x: 200, y: 55, r: 0.8, d: '5s' },
          { x: 350, y: 20, r: 1.5, d: '3.5s' },
          { x: 500, y: 45, r: 1, d: '6s' },
          { x: 650, y: 25, r: 0.9, d: '4.5s' },
          { x: 780, y: 50, r: 1.3, d: '5.5s' },
          { x: 140, y: 70, r: 0.6, d: '7s' },
          { x: 420, y: 65, r: 0.7, d: '3s' },
          { x: 700, y: 75, r: 1.1, d: '4.2s' },
          { x: 550, y: 15, r: 0.5, d: '6.5s' },
          { x: 300, y: 80, r: 0.4, d: '5.2s' },
          { x: 820, y: 40, r: 0.6, d: '4.8s' },
        ].map((star, i) => (
          <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="white" filter="url(#th-starGlow)">
            <animate
              attributeName="opacity"
              values="0.6;0.2;0.6"
              dur={star.d}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {/* Moon */}
        <circle cx="750" cy="60" r="25" fill="#fef3c7" opacity="0.15" />
        <circle cx="758" cy="55" r="22" fill="#070710" opacity="0.8" />

        {/* Stone floor */}
        <rect x="0" y={floorY} width={svgWidth} height={svgHeight - floorY} fill="url(#th-stoneFloor)" />
        <rect x="0" y={floorY} width={svgWidth} height={svgHeight - floorY} fill="url(#th-floorTex)" opacity="0.3" />
        {/* Floor edge highlight */}
        <line x1="0" y1={floorY} x2={svgWidth} y2={floorY} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

        {/* Stone columns (pegs) */}
        {Array.from({ length: pegCount }, (_, i) => {
          const cx = pegSpacing * (i + 1);
          const colWidth = 14;
          const colHeight = pegHeight - 40;
          const baseY = floorY;

          return (
            <g key={i}>
              {/* Column shadow */}
              <ellipse
                cx={cx}
                cy={baseY + 2}
                rx={colWidth + 8}
                ry="4"
                fill="black"
                opacity="0.2"
              />

              {/* Column base (ornate) */}
              <rect
                x={cx - colWidth - 10}
                y={baseY - 10}
                width={(colWidth + 10) * 2}
                height="12"
                rx="3"
                fill="#6b7280"
              />
              <rect
                x={cx - colWidth - 6}
                y={baseY - 14}
                width={(colWidth + 6) * 2}
                height="6"
                rx="2"
                fill="#9ca3af"
                opacity="0.6"
              />

              {/* Column shaft */}
              <rect
                x={cx - colWidth / 2}
                y={baseY - 10 - colHeight}
                width={colWidth}
                height={colHeight}
                rx="3"
                fill="url(#th-column)"
                opacity="0.6"
              />

              {/* Column fluting lines */}
              <line
                x1={cx - 3}
                y1={baseY - 10 - colHeight}
                x2={cx - 3}
                y2={baseY - 10}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="0.5"
              />
              <line
                x1={cx + 3}
                y1={baseY - 10 - colHeight}
                x2={cx + 3}
                y2={baseY - 10}
                stroke="rgba(0,0,0,0.15)"
                strokeWidth="0.5"
              />

              {/* Column capital (top) */}
              <rect
                x={cx - colWidth - 4}
                y={baseY - 14 - colHeight}
                width={(colWidth + 4) * 2}
                height="6"
                rx="2"
                fill="#9ca3af"
                opacity="0.5"
              />
              <rect
                x={cx - colWidth - 8}
                y={baseY - 10 - colHeight}
                width={(colWidth + 8) * 2}
                height="4"
                rx="2"
                fill="#6b7280"
                opacity="0.4"
              />
            </g>
          );
        })}

        {/* Atmospheric fog at base */}
        <rect
          x="0"
          y={floorY - 30}
          width={svgWidth}
          height="40"
          fill="url(#th-nebula)"
          opacity="0.3"
        >
          <animate
            attributeName="opacity"
            values="0.2;0.35;0.2"
            dur="8s"
            repeatCount="indefinite"
          />
        </rect>
      </svg>

      {/* Content overlay */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ── Gemstone Disc Component ──────────────────────────────────── */
function GemDisc({
  disc,
  maxDiscs,
  isLifted,
  isTop,
}: {
  disc: number;
  maxDiscs: number;
  isLifted: boolean;
  isTop: boolean;
}) {
  const width = 40 + disc * 18;
  const colorIdx = (disc - 1) % GEM_COLORS.length;
  const gem = GEM_COLORS[colorIdx];
  const uid = `disc-${disc}`;

  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0, y: -30 }}
      animate={{
        scale: 1,
        opacity: 1,
        y: isLifted ? -16 : 0,
      }}
      exit={{ scale: 0.8, opacity: 0, y: -30 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="flex items-center justify-center mb-0.5"
      style={{ width: `${width}px`, height: '30px' }}
    >
      <svg width={width} height="30" viewBox={`0 0 ${width} 30`} className="overflow-visible">
        <defs>
          {/* Gem body gradient */}
          <linearGradient id={`${uid}-gem`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gem.light} stopOpacity="0.9" />
            <stop offset="40%" stopColor={gem.base} />
            <stop offset="100%" stopColor={gem.dark} />
          </linearGradient>

          {/* Gem shine */}
          <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="50%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          {/* Glow filter for lifted disc */}
          {isLifted && (
            <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* Shadow */}
        <ellipse
          cx={width / 2}
          cy="28"
          rx={width / 2 - 2}
          ry="3"
          fill="black"
          opacity={isLifted ? 0.15 : 0.25}
        />

        {/* Disc body */}
        <rect
          x="2"
          y="2"
          width={width - 4}
          height="24"
          rx="12"
          fill={`url(#${uid}-gem)`}
          stroke={gem.light}
          strokeWidth="0.8"
          strokeOpacity="0.4"
          {...(isLifted ? { filter: `url(#${uid}-glow)` } : {})}
        />

        {/* Inner facet highlight (top) */}
        <rect
          x="6"
          y="4"
          width={width - 12}
          height="10"
          rx="5"
          fill={`url(#${uid}-shine)`}
        />

        {/* Center gem sparkle */}
        <ellipse
          cx={width / 2}
          cy="12"
          rx="3"
          ry="2"
          fill="white"
          opacity="0.35"
        />

        {/* Edge bevel (bottom) */}
        <rect
          x="4"
          y="18"
          width={width - 8}
          height="6"
          rx="3"
          fill={gem.dark}
          opacity="0.4"
        />

        {/* Disc number */}
        <text
          x={width / 2}
          y="17"
          fill="white"
          fontSize="11"
          fontWeight="bold"
          textAnchor="middle"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
        >
          {disc}
        </text>

        {/* Lifted glow halo */}
        {isLifted && (
          <rect
            x="0"
            y="0"
            width={width}
            height="28"
            rx="14"
            fill="none"
            stroke={gem.light}
            strokeWidth="2"
            opacity="0.4"
          >
            <animate
              attributeName="opacity"
              values="0.2;0.5;0.2"
              dur="1s"
              repeatCount="indefinite"
            />
          </rect>
        )}
      </svg>
    </motion.div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
export function TowerHanoiBoard({ difficulty, seed, onComplete, onFail }: TowerHanoiBoardProps) {
  const puzzle = useMemo(() => generateHanoi(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<HanoiState>(() => createInitialState(puzzle));
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [errorPeg, setErrorPeg] = useState<number | null>(null);
  const { playPlace, playError, playClick, playSuccess } = useAudio();

  useEffect(() => {
    if (state.isComplete) {
      playSuccess();
      onComplete(state.steps, puzzle.optimalSteps);
    }
  }, [state.isComplete, state.steps, puzzle.optimalSteps, onComplete, playSuccess]);

  const handlePegClick = useCallback(
    (pegIndex: number) => {
      if (state.isComplete) return;

      if (selectedPeg === null) {
        // Select: only if peg has discs
        if (state.pegs[pegIndex].length === 0) return;
        playClick();
        setSelectedPeg(pegIndex);
      } else if (selectedPeg === pegIndex) {
        // Deselect
        playClick();
        setSelectedPeg(null);
      } else {
        // Try to move
        const disc = state.pegs[selectedPeg][state.pegs[selectedPeg].length - 1];
        const result = applyMove(state, { from: selectedPeg, to: pegIndex, disc }, puzzle);
        if ('error' in result) {
          playError();
          onFail?.(result.error);
          setErrorPeg(pegIndex);
          setTimeout(() => setErrorPeg(null), 500);
          setSelectedPeg(null);
          return;
        }
        playPlace();
        setState(result);
        setSelectedPeg(null);
      }
    },
    [state, selectedPeg, puzzle, playClick, playPlace, playError, onFail],
  );

  const handleUndo = useCallback(() => {
    if (state.moveHistory.length === 0) return;
    playClick();
    setState(undo(state));
    setSelectedPeg(null);
  }, [state, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
    setSelectedPeg(null);
  }, [puzzle, playClick]);

  const maxDiscs = puzzle.discCount;
  const pegHeight = maxDiscs * 34 + 60;

  return (
    <div className="space-y-4">
      {/* Story */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/15 bg-gradient-to-br from-[#0f0a22] to-[#1a0533] p-4 text-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
        <p className="font-medium mb-2 text-slate-100 relative">{puzzle.story}</p>
        <ul className="space-y-1 text-slate-400 relative">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-indigo-400">
                <svg width="8" height="8" viewBox="0 0 8 8" className="mt-1.5">
                  <circle cx="4" cy="4" r="3" fill="currentColor" opacity="0.6" />
                </svg>
              </span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Goal */}
      <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-3 text-sm backdrop-blur-md">
        <span className="font-semibold text-emerald-400">목표: </span>
        <span className="text-slate-400">
          {puzzle.goalState
            .map((peg, i) =>
              peg.length > 0 ? `기둥 ${i + 1}: [${peg.join(',')}]` : null,
            )
            .filter(Boolean)
            .join(' / ')}
        </span>
      </div>

      {/* Temple Scene with Pegs */}
      <TempleScene pegCount={state.pegs.length} maxDiscs={maxDiscs} pegHeight={pegHeight}>
        <div className="flex justify-center gap-4 sm:gap-8 py-6 px-2">
          {state.pegs.map((peg, pegIdx) => {
            const isSelected = selectedPeg === pegIdx;
            const isError = errorPeg === pegIdx;
            const isGoalPeg = puzzle.goalState[pegIdx].length > 0;
            const isSourcePeg = selectedPeg !== null && selectedPeg === pegIdx;

            return (
              <motion.div
                key={pegIdx}
                animate={isError ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                transition={isError ? { duration: 0.4 } : {}}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePegClick(pegIdx)}
                className={`flex flex-col items-center cursor-pointer p-3 rounded-2xl transition-all duration-200 select-none ${
                  isSelected
                    ? 'ring-2 ring-blue-400/60 bg-blue-500/10 shadow-lg shadow-blue-500/15'
                    : isError
                      ? 'bg-red-500/10 ring-2 ring-red-400/40'
                      : isGoalPeg
                        ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10'
                        : 'hover:bg-white/5 border border-transparent'
                }`}
                style={{ minWidth: `${40 + maxDiscs * 20}px` }}
              >
                {/* Peg label */}
                <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                  기둥 {pegIdx + 1}
                </div>

                {/* Peg visual area */}
                <div
                  className="relative flex flex-col items-center justify-end"
                  style={{ height: `${pegHeight}px` }}
                >
                  {/* The column rod is drawn by the SVG background */}

                  {/* Discs stacked from bottom */}
                  <div className="relative z-10 flex flex-col-reverse items-center mb-2.5">
                    <AnimatePresence mode="popLayout">
                      {peg.map((disc, stackIdx) => {
                        const isTopDisc = stackIdx === peg.length - 1;
                        const isLifted = isSourcePeg && isTopDisc;

                        return (
                          <GemDisc
                            key={`disc-${disc}`}
                            disc={disc}
                            maxDiscs={maxDiscs}
                            isLifted={isLifted}
                            isTop={isTopDisc}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Ornate base */}
                  <div
                    className="absolute bottom-0 w-full h-3 rounded-full"
                    style={{
                      background:
                        'linear-gradient(to right, #4b5563, #6b7280, #9ca3af, #6b7280, #4b5563)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </TempleScene>

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
