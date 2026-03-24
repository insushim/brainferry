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

interface SequenceSortBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

/* ── Book color palettes for SVG ── */
const BOOK_COLORS: { spine: string; spineLight: string; cover: string; text: string }[] = [
  { spine: '#dc2626', spineLight: '#ef4444', cover: '#b91c1c', text: '#fecaca' },
  { spine: '#ea580c', spineLight: '#f97316', cover: '#c2410c', text: '#fed7aa' },
  { spine: '#d97706', spineLight: '#f59e0b', cover: '#b45309', text: '#fef3c7' },
  { spine: '#16a34a', spineLight: '#22c55e', cover: '#15803d', text: '#bbf7d0' },
  { spine: '#2563eb', spineLight: '#3b82f6', cover: '#1d4ed8', text: '#bfdbfe' },
  { spine: '#4f46e5', spineLight: '#6366f1', cover: '#4338ca', text: '#c7d2fe' },
  { spine: '#9333ea', spineLight: '#a855f7', cover: '#7e22ce', text: '#e9d5ff' },
  { spine: '#db2777', spineLight: '#ec4899', cover: '#be185d', text: '#fbcfe8' },
  { spine: '#0d9488', spineLight: '#14b8a6', cover: '#0f766e', text: '#99f6e4' },
  { spine: '#0891b2', spineLight: '#06b6d4', cover: '#0e7490', text: '#a5f3fc' },
];

/* ── SVG sub-components ─────────────────────────────────────── */

function BookSpine({ value, label, index, isCorrect, isSelected, isHidden, onClick, bookWidth }: {
  value: number; label: string; index: number; isCorrect: boolean;
  isSelected: boolean; isHidden: boolean; onClick: () => void; bookWidth: number;
}) {
  const colorIdx = (value - 1) % BOOK_COLORS.length;
  const colors = BOOK_COLORS[colorIdx];
  const bookHeight = 130;
  const baseY = 10;

  return (
    <motion.g
      onClick={onClick}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.95 }}
      style={{ cursor: 'pointer' }}
      layout
    >
      {/* Selection glow */}
      {isSelected && (
        <motion.rect
          x={-2} y={baseY - 4}
          width={bookWidth + 4} height={bookHeight + 8}
          rx="4"
          fill="none" stroke="#fbbf24" strokeWidth="2.5"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}

      {/* Book body - main spine */}
      <rect x={0} y={baseY} width={bookWidth} height={bookHeight}
        rx="2"
        fill={isHidden ? '#374151' : colors.spine}
        stroke={isHidden ? '#4b5563' : colors.cover}
        strokeWidth="1"
      />

      {/* Spine highlight (left edge) */}
      <rect x={0} y={baseY} width={3} height={bookHeight}
        fill={isHidden ? '#4b5563' : colors.spineLight}
        rx="1"
      />

      {/* Page edges (right side) */}
      <rect x={bookWidth - 4} y={baseY + 3} width={4} height={bookHeight - 6}
        fill="#e2e0d6" rx="1" />
      {/* Individual page lines */}
      {[0, 1, 2, 3, 4].map(i => (
        <line key={`page-${i}`}
          x1={bookWidth - 3} y1={baseY + 8 + i * ((bookHeight - 16) / 4)}
          x2={bookWidth - 1} y2={baseY + 8 + i * ((bookHeight - 16) / 4)}
          stroke="#c8c4b8" strokeWidth="0.5"
        />
      ))}

      {/* Decorative band top */}
      <rect x={4} y={baseY + 10} width={bookWidth - 8} height="2"
        fill={isHidden ? '#4b5563' : colors.spineLight} opacity="0.6" rx="1" />

      {/* Decorative band bottom */}
      <rect x={4} y={baseY + bookHeight - 12} width={bookWidth - 8} height="2"
        fill={isHidden ? '#4b5563' : colors.spineLight} opacity="0.6" rx="1" />

      {/* Title / value on spine (rotated) */}
      <text
        x={bookWidth / 2}
        y={baseY + bookHeight / 2 + 4}
        textAnchor="middle"
        fontSize={bookWidth > 40 ? "16" : "13"}
        fontWeight="bold"
        fill={isHidden ? '#6b7280' : colors.text}
      >
        {isHidden ? '?' : label}
      </text>

      {/* Position number at bottom */}
      <text
        x={bookWidth / 2}
        y={baseY + bookHeight + 16}
        textAnchor="middle"
        fontSize="10"
        fill="#6b7280"
      >
        {index + 1}
      </text>

      {/* Correct badge */}
      {isCorrect && !isHidden && (
        <g transform={`translate(${bookWidth - 4}, ${baseY - 2})`}>
          <circle r="7" fill="#22c55e" stroke="#15101e" strokeWidth="1.5" />
          <text textAnchor="middle" y="3.5" fontSize="8" fontWeight="bold" fill="white">✓</text>
        </g>
      )}
    </motion.g>
  );
}

type ActiveOp = 'swap' | 'flip' | 'rotate' | null;

/* ── Main component ─────────────────────────────────────────── */

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

  /* ── Layout math for bookshelf SVG ── */
  const itemCount = state.order.length;
  const bookGap = 6;
  const shelfPadding = 40;
  const availableWidth = 800 - shelfPadding * 2;
  const bookWidth = Math.min(60, Math.max(30, (availableWidth - (itemCount - 1) * bookGap) / itemCount));
  const totalBooksWidth = itemCount * bookWidth + (itemCount - 1) * bookGap;
  const booksStartX = (800 - totalBooksWidth) / 2;
  const shelfY = 160;
  const svgHeight = 200;

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
        <svg viewBox={`0 0 800 40`} className="w-full mt-2" style={{ maxHeight: '40px' }}>
          {puzzle.goalOrder.map((val, i) => {
            const colorIdx = (val - 1) % BOOK_COLORS.length;
            const colors = BOOK_COLORS[colorIdx];
            const w = Math.min(36, (700 / puzzle.goalOrder.length));
            const totalW = puzzle.goalOrder.length * w + (puzzle.goalOrder.length - 1) * 4;
            const startX = (800 - totalW) / 2;
            return (
              <g key={i} transform={`translate(${startX + i * (w + 4)}, 2)`}>
                <rect width={w} height="30" rx="3"
                  fill={colors.spine} stroke={colors.cover} strokeWidth="0.8" opacity="0.6" />
                <text x={w / 2} y="20" textAnchor="middle" fontSize="12" fontWeight="bold"
                  fill={colors.text} opacity="0.8">{val}</text>
              </g>
            );
          })}
        </svg>
        {puzzle.variant === 'multi-target' && puzzle.alternateGoals && (
          <div className="mt-2">
            <span className="text-xs text-emerald-400/60">또는: </span>
            {puzzle.alternateGoals.map((goal, gi) => (
              <svg key={gi} viewBox={`0 0 800 30`} className="w-full mt-1" style={{ maxHeight: '30px' }}>
                {goal.map((val, i) => {
                  const colorIdx = (val - 1) % BOOK_COLORS.length;
                  const colors = BOOK_COLORS[colorIdx];
                  const w = Math.min(28, (700 / goal.length));
                  const totalW = goal.length * w + (goal.length - 1) * 3;
                  const startX = (800 - totalW) / 2;
                  return (
                    <g key={i} transform={`translate(${startX + i * (w + 3)}, 2)`}>
                      <rect width={w} height="22" rx="2"
                        fill={colors.spine} stroke={colors.cover} strokeWidth="0.5" opacity="0.4" />
                      <text x={w / 2} y="15" textAnchor="middle" fontSize="9" fontWeight="bold"
                        fill={colors.text} opacity="0.6">{val}</text>
                    </g>
                  );
                })}
              </svg>
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
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
                </svg>
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
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
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
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
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

      {/* ── Library Bookshelf SVG ── */}
      <div className="text-center py-2">
        <div className="text-[11px] font-bold text-slate-500 uppercase mb-4 tracking-widest">현재 순서</div>

        <svg viewBox={`0 0 800 ${svgHeight}`} className="w-full rounded-2xl overflow-hidden" style={{ maxHeight: '35vh' }}>
          {/* Dark wood background */}
          <rect width="800" height={svgHeight} fill="#1c1008" />

          {/* Side panels */}
          <rect x="0" y="0" width="18" height={svgHeight} fill="#2d1c0e" />
          <rect x="782" y="0" width="18" height={svgHeight} fill="#2d1c0e" />
          {/* Side panel grain */}
          <line x1="6" y1="0" x2="6" y2={svgHeight} stroke="#3d2814" strokeWidth="0.5" opacity="0.5" />
          <line x1="12" y1="0" x2="12" y2={svgHeight} stroke="#3d2814" strokeWidth="0.5" opacity="0.5" />
          <line x1="788" y1="0" x2="788" y2={svgHeight} stroke="#3d2814" strokeWidth="0.5" opacity="0.5" />
          <line x1="794" y1="0" x2="794" y2={svgHeight} stroke="#3d2814" strokeWidth="0.5" opacity="0.5" />

          {/* Shelf board */}
          <rect x="15" y={shelfY} width="770" height="14" fill="#3d2814" rx="2" />
          {/* Wood grain on shelf */}
          <line x1="15" y1={shelfY + 3} x2="785" y2={shelfY + 3} stroke="#4a3219" strokeWidth="0.5" />
          <line x1="15" y1={shelfY + 7} x2="785" y2={shelfY + 7} stroke="#4a3219" strokeWidth="0.5" />
          <line x1="15" y1={shelfY + 11} x2="785" y2={shelfY + 11} stroke="#2d1c0e" strokeWidth="0.5" />
          {/* Shelf shadow */}
          <rect x="15" y={shelfY + 14} width="770" height="4" fill="#0f0a04" opacity="0.3" rx="1" />

          {/* Left bookend */}
          <path d={`M${booksStartX - 15},${shelfY} L${booksStartX - 15},${shelfY - 40} L${booksStartX - 5},${shelfY - 40} L${booksStartX - 5},${shelfY}`}
            fill="#6b4226" stroke="#8b5e34" strokeWidth="1" />
          <line x1={booksStartX - 12} y1={shelfY - 35} x2={booksStartX - 8} y2={shelfY - 35}
            stroke="#8b5e34" strokeWidth="0.8" />

          {/* Right bookend */}
          <path d={`M${booksStartX + totalBooksWidth + 5},${shelfY} L${booksStartX + totalBooksWidth + 5},${shelfY - 40} L${booksStartX + totalBooksWidth + 15},${shelfY - 40} L${booksStartX + totalBooksWidth + 15},${shelfY}`}
            fill="#6b4226" stroke="#8b5e34" strokeWidth="1" />

          {/* Ambient dust particles */}
          {[
            { cx: 120, cy: 50, d: 0 },
            { cx: 350, cy: 30, d: 1 },
            { cx: 600, cy: 60, d: 2 },
            { cx: 700, cy: 40, d: 0.5 },
          ].map((p, i) => (
            <motion.circle
              key={`dust-${i}`}
              cx={p.cx} cy={p.cy} r="1"
              fill="#d4a574"
              animate={{ opacity: [0, 0.3, 0], cx: [p.cx, p.cx + 10, p.cx + 20] }}
              transition={{ duration: 6, repeat: Infinity, delay: p.d }}
            />
          ))}

          {/* Books */}
          <AnimatePresence mode="popLayout">
            {state.order.map((val, idx) => {
              const item = itemMap.get(val);
              const isCorrect = puzzle.goalOrder[idx] === val;
              const isSelected = selectedIndex === idx;
              const isHidden = puzzle.variant === 'blind' && !state.visiblePositions[idx];
              const x = booksStartX + idx * (bookWidth + bookGap);

              return (
                <motion.g
                  key={val}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  transform={`translate(${x}, ${shelfY - 150})`}
                >
                  <BookSpine
                    value={val}
                    label={item?.label ?? String(val)}
                    index={idx}
                    isCorrect={isCorrect}
                    isSelected={isSelected}
                    isHidden={isHidden}
                    onClick={() => handleItemClick(idx)}
                    bookWidth={bookWidth}
                  />
                </motion.g>
              );
            })}
          </AnimatePresence>
        </svg>
      </div>

      {/* Quick operation buttons */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="text-[11px] font-bold text-slate-500 uppercase mb-2 tracking-widest">빠른 연산</div>

        {puzzle.allowedOps.includes('flip') && (
          <div>
            <div className="flex items-center gap-2 text-sm mb-2">
              <svg className="w-4 h-4 text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
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
              <svg className="w-4 h-4 text-teal-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
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
            <svg className="w-4 h-4 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
            </svg>
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
