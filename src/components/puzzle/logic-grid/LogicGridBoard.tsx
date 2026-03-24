'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateLogicGrid } from '@/engines/logic-grid/generator';
import {
  createInitialState,
  setMark,
  undo,
  type LogicGridState,
  type CellMark,
} from '@/engines/logic-grid/engine';
import { useAudio } from '@/hooks/useAudio';

interface LogicGridBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

/* ── SVG Icons ────────────────────────────────────────────────── */
function CheckMark({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" className={className} fill="none">
      <path
        d="M4 10.5l4 4 8-9"
        stroke="#16a34a"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))' }}
      />
    </svg>
  );
}

function CrossMark({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" className={className} fill="none">
      <path
        d="M5 5l10 10M15 5l-10 10"
        stroke="#dc2626"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
        style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.15))' }}
      />
    </svg>
  );
}

function MagnifyingGlass({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" />
      <line x1="15" y1="15" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Detective Desk Background ────────────────────────────────── */
function DeskScene({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden">
      <svg
        viewBox="0 0 1000 200"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          {/* Wood grain pattern */}
          <pattern id="lg-woodGrain" width="200" height="200" patternUnits="userSpaceOnUse">
            <rect width="200" height="200" fill="#2c1810" />
            <path d="M0,10 Q50,8 100,12 Q150,9 200,11" stroke="#3a2218" strokeWidth="0.8" fill="none" opacity="0.5" />
            <path d="M0,30 Q60,28 120,33 Q160,29 200,31" stroke="#3d2419" strokeWidth="0.6" fill="none" opacity="0.4" />
            <path d="M0,55 Q40,53 90,57 Q140,54 200,56" stroke="#351d14" strokeWidth="0.5" fill="none" opacity="0.3" />
            <path d="M0,80 Q70,78 130,82 Q170,79 200,81" stroke="#3a2218" strokeWidth="0.7" fill="none" opacity="0.35" />
            <path d="M0,105 Q55,103 110,107 Q155,104 200,106" stroke="#3d2419" strokeWidth="0.5" fill="none" opacity="0.3" />
            <path d="M0,130 Q45,128 95,132 Q145,129 200,131" stroke="#351d14" strokeWidth="0.6" fill="none" opacity="0.25" />
            <path d="M0,160 Q65,158 125,162 Q165,159 200,161" stroke="#3a2218" strokeWidth="0.5" fill="none" opacity="0.3" />
            <path d="M0,185 Q50,183 100,187 Q150,184 200,186" stroke="#3d2419" strokeWidth="0.4" fill="none" opacity="0.2" />
          </pattern>

          {/* Desk surface gradient */}
          <linearGradient id="lg-deskSurface" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2218" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1a0e08" stopOpacity="0.4" />
          </linearGradient>

          {/* Warm lamp light */}
          <radialGradient id="lg-lampLight" cx="0.5" cy="0.1" r="0.7">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.06" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Desk base */}
        <rect width="1000" height="200" fill="url(#lg-woodGrain)" />
        <rect width="1000" height="200" fill="url(#lg-deskSurface)" />
        <rect width="1000" height="200" fill="url(#lg-lampLight)" />

        {/* Desk edge */}
        <rect x="0" y="0" width="1000" height="3" fill="#4a2e1c" opacity="0.6" />
        <rect x="0" y="197" width="1000" height="3" fill="#1a0e08" opacity="0.5" />

        {/* Coffee stain (subtle) */}
        <circle cx="920" cy="160" r="22" fill="none" stroke="#5a3320" strokeWidth="2" opacity="0.08" />
        <circle cx="920" cy="160" r="18" fill="#5a3320" opacity="0.03" />

        {/* Paper clip */}
        <g transform="translate(40, 150) rotate(-15)" opacity="0.12">
          <path
            d="M0,0 L0,16 Q0,20 4,20 L4,4 Q4,0 8,0 L8,18 Q8,24 2,24 L-2,24 Q-4,24 -4,20 L-4,2"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
        </g>

        {/* Pencil */}
        <g transform="translate(850, 30) rotate(25)" opacity="0.1">
          <rect x="0" y="0" width="80" height="6" rx="1" fill="#fbbf24" />
          <polygon points="80,0 80,6 88,3" fill="#f59e0b" />
          <rect x="0" y="0" width="8" height="6" rx="1" fill="#ec4899" />
        </g>
      </svg>

      {/* Content overlay */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ── Clue Card (Sticky Note) ──────────────────────────────────── */
const STICKY_COLORS = [
  { bg: 'bg-yellow-100/90', border: 'border-yellow-300/50', text: 'text-yellow-900' },
  { bg: 'bg-amber-100/90', border: 'border-amber-300/50', text: 'text-amber-900' },
  { bg: 'bg-orange-50/90', border: 'border-orange-200/50', text: 'text-orange-900' },
  { bg: 'bg-lime-50/90', border: 'border-lime-200/50', text: 'text-lime-900' },
  { bg: 'bg-sky-50/90', border: 'border-sky-200/50', text: 'text-sky-900' },
];

/* ── Main Component ───────────────────────────────────────────── */
export function LogicGridBoard({ difficulty, seed, onComplete, onFail }: LogicGridBoardProps) {
  const puzzle = useMemo(() => generateLogicGrid(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<LogicGridState>(() => createInitialState(puzzle));
  const [highlightedClue, setHighlightedClue] = useState<number | null>(null);
  const { playClick, playSuccess, playPlace } = useAudio();

  useEffect(() => {
    if (state.isComplete) {
      playSuccess();
      onComplete(state.steps, puzzle.optimalSteps);
    }
  }, [state.isComplete, state.steps, puzzle.optimalSteps, onComplete, playSuccess]);

  // Get highlighted cells from a clue
  const highlightedCells = useMemo(() => {
    if (highlightedClue === null) return new Set<string>();
    const clue = puzzle.clues[highlightedClue];
    if (!clue) return new Set<string>();
    const cells = new Set<string>();
    const d = clue.data;
    if (d.catA && d.itemA && d.catB && d.itemB) {
      cells.add(`${d.catA}:${d.catB}:${d.itemA}:${d.itemB}`);
      cells.add(`${d.catB}:${d.catA}:${d.itemB}:${d.itemA}`);
    }
    return cells;
  }, [highlightedClue, puzzle.clues]);

  const isCellHighlighted = useCallback(
    (catA: string, itemA: string, catB: string, itemB: string) => {
      return highlightedCells.has(`${catA}:${catB}:${itemA}:${itemB}`);
    },
    [highlightedCells],
  );

  // Cycle: unknown -> true (check) -> false (X) -> unknown
  const handleCellClick = useCallback(
    (catA: string, itemA: string, catB: string, itemB: string, currentMark: CellMark) => {
      if (state.isComplete) return;
      playClick();
      const nextMark: CellMark =
        currentMark === 'unknown'
          ? 'true'
          : currentMark === 'true'
            ? 'false'
            : 'unknown';
      setState(setMark(state, catA, itemA, catB, itemB, nextMark, puzzle));
    },
    [state, puzzle, playClick],
  );

  // Right-click: quick toggle to false (X)
  const handleCellRightClick = useCallback(
    (
      e: React.MouseEvent,
      catA: string,
      itemA: string,
      catB: string,
      itemB: string,
      currentMark: CellMark,
    ) => {
      e.preventDefault();
      if (state.isComplete) return;
      playPlace();
      const nextMark: CellMark = currentMark === 'false' ? 'unknown' : 'false';
      setState(setMark(state, catA, itemA, catB, itemB, nextMark, puzzle));
    },
    [state, puzzle, playPlace],
  );

  const handleUndo = useCallback(() => {
    if (state.moveHistory.length === 0) return;
    playClick();
    setState(undo(state));
  }, [state, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
  }, [puzzle, playClick]);

  const gridPairs = useMemo(() => {
    const pairs: {
      key: string;
      catA: (typeof puzzle.categories)[0];
      catB: (typeof puzzle.categories)[0];
    }[] = [];
    for (let i = 0; i < puzzle.categories.length; i++) {
      for (let j = i + 1; j < puzzle.categories.length; j++) {
        const key = `${puzzle.categories[i].id}:${puzzle.categories[j].id}`;
        pairs.push({
          key,
          catA: puzzle.categories[i],
          catB: puzzle.categories[j],
        });
      }
    }
    return pairs;
  }, [puzzle.categories]);

  return (
    <div className="space-y-4">
      {/* Story */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-[#1f1510] to-[#15100a] p-4 text-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
        <p className="font-medium mb-2 text-slate-100 relative">{puzzle.story}</p>
        <ul className="space-y-1 text-slate-400 relative">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-amber-400">
                <svg width="8" height="8" viewBox="0 0 8 8" className="mt-1.5">
                  <circle cx="4" cy="4" r="3" fill="currentColor" opacity="0.6" />
                </svg>
              </span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Clues (Sticky Notes style) */}
      <DeskScene>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MagnifyingGlass className="text-amber-400" />
            <h3 className="font-bold text-amber-300 text-sm uppercase tracking-wider">단서</h3>
          </div>
          <div className="space-y-1.5">
            {puzzle.clues.map((clue, i) => {
              const stickyColor = STICKY_COLORS[i % STICKY_COLORS.length];
              const isActive = highlightedClue === i;

              return (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.01, x: 2 }}
                  onClick={() => setHighlightedClue(highlightedClue === i ? null : i)}
                  className={`flex gap-2 text-sm leading-relaxed cursor-pointer rounded-lg px-3 py-1.5 transition-all border ${
                    isActive
                      ? `${stickyColor.bg} ${stickyColor.border} ${stickyColor.text} shadow-md`
                      : 'text-slate-400 hover:bg-white/5 border-transparent'
                  }`}
                  style={
                    isActive
                      ? {
                          transform: `rotate(${(i % 3 - 1) * 0.3}deg)`,
                          fontFamily: "'Georgia', serif",
                        }
                      : { fontFamily: "'Georgia', serif" }
                  }
                >
                  <span
                    className={`font-bold tabular-nums min-w-[24px] text-right ${
                      isActive ? stickyColor.text : 'text-slate-600'
                    }`}
                  >
                    {i + 1}.
                  </span>
                  <span className="flex-1">{clue.text}</span>
                  {isActive && (
                    <MagnifyingGlass className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </DeskScene>

      {/* Grid tables (Notepad style) */}
      <div className="space-y-6 overflow-x-auto pb-2">
        {gridPairs.map(({ key, catA, catB }) => {
          const subGrid = state.grid[key];
          if (!subGrid) return null;

          return (
            <div key={key} className="inline-block min-w-full">
              {/* Grid header */}
              <div className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <circle cx="5" cy="5" r="4" fill="#ef4444" />
                  <circle cx="5" cy="5" r="2" fill="#fca5a5" />
                </svg>
                {catA.name} vs {catB.name}
              </div>

              {/* Paper/notepad container */}
              <div className="relative rounded-xl overflow-hidden border border-amber-900/20 shadow-lg">
                {/* Paper background */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#fefce8] to-[#fef9c3] opacity-[0.97]" />
                {/* Ruled lines */}
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <pattern id={`lg-ruled-${key}`} width="100%" height="48" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="47" x2="100%" y2="47" stroke="#d1d5db" strokeWidth="0.5" opacity="0.4" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#lg-ruled-${key})`} />
                  {/* Red margin line */}
                  <line x1="96" y1="0" x2="96" y2="100%" stroke="#fca5a5" strokeWidth="0.8" opacity="0.3" />
                </svg>

                {/* Thumbtack at top */}
                <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 z-20">
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <circle cx="7" cy="7" r="6" fill="#ef4444" stroke="#dc2626" strokeWidth="0.5" />
                    <circle cx="6" cy="6" r="2.5" fill="#fca5a5" opacity="0.7" />
                  </svg>
                </div>

                <table className="relative z-10 border-collapse w-full">
                  <thead>
                    <tr>
                      <th className="w-24 p-2" />
                      {catB.items.map((item) => (
                        <th
                          key={item}
                          className="p-2 text-xs font-semibold text-center border-b whitespace-nowrap"
                          style={{
                            color: '#78716c',
                            borderColor: 'rgba(168,162,158,0.2)',
                            fontFamily: "'Georgia', serif",
                          }}
                        >
                          {item}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catA.items.map((rowItem) => (
                      <tr key={rowItem} className="border-b last:border-b-0" style={{ borderColor: 'rgba(168,162,158,0.15)' }}>
                        <td
                          className="p-2 text-xs font-semibold text-right pr-3 whitespace-nowrap"
                          style={{
                            color: '#78716c',
                            fontFamily: "'Georgia', serif",
                          }}
                        >
                          {rowItem}
                        </td>
                        {catB.items.map((colItem) => {
                          const mark = subGrid[rowItem]?.[colItem] ?? 'unknown';
                          const isHighlighted = isCellHighlighted(catA.id, rowItem, catB.id, colItem);

                          return (
                            <td key={colItem} className="p-1 text-center">
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                whileHover={{ scale: 1.08 }}
                                onClick={() =>
                                  handleCellClick(catA.id, rowItem, catB.id, colItem, mark)
                                }
                                onContextMenu={(e) =>
                                  handleCellRightClick(
                                    e,
                                    catA.id,
                                    rowItem,
                                    catB.id,
                                    colItem,
                                    mark,
                                  )
                                }
                                className={`w-12 h-12 rounded-lg border flex items-center justify-center transition-all duration-200 ${
                                  mark === 'true'
                                    ? 'bg-emerald-100/80 border-emerald-400/50 shadow-sm shadow-emerald-200/30'
                                    : mark === 'false'
                                      ? 'bg-red-50/60 border-red-300/30'
                                      : isHighlighted
                                        ? 'bg-amber-100/50 border-amber-400/50 hover:bg-amber-100/70'
                                        : 'bg-white/40 border-stone-300/30 hover:border-amber-400/50 hover:bg-amber-50/30'
                                }`}
                              >
                                {mark === 'true' && <CheckMark />}
                                {mark === 'false' && <CrossMark />}
                              </motion.button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

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
          <span className="text-slate-400">마크</span>
          <span className="font-bold text-slate-100 tabular-nums">{state.steps}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">최적</span>
          <span className="font-bold text-blue-400 tabular-nums">{puzzle.optimalSteps}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-lg bg-white/5 border border-white/10 inline-block" />{' '}
          미확인
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 inline-flex items-center justify-center">
            <CheckMark className="w-3 h-3" />
          </span>{' '}
          맞음
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-lg bg-red-500/10 border border-red-400/20 inline-flex items-center justify-center">
            <CrossMark className="w-3 h-3" />
          </span>{' '}
          아님
        </span>
      </div>
    </div>
  );
}
