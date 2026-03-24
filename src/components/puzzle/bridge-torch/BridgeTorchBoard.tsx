'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateBridgeTorch } from '@/engines/bridge-torch/generator';
import {
  createInitialState,
  applyMove,
  undo,
  type BridgeTorchState,
} from '@/engines/bridge-torch/engine';
import { useAudio } from '@/hooks/useAudio';

interface BridgeTorchBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

export function BridgeTorchBoard({ difficulty, seed, onComplete, onFail }: BridgeTorchBoardProps) {
  const puzzle = useMemo(() => generateBridgeTorch(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<BridgeTorchState>(() => createInitialState(puzzle));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { playClick, playError, playSuccess } = useAudio();

  const speedMap = useMemo(
    () => new Map(puzzle.people.map((p) => [p.id, p])),
    [puzzle.people],
  );

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

  const toggleSelect = useCallback((id: string) => {
    playClick();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        const maxSelect = state.torchPosition === 'left' ? puzzle.bridgeCapacity : 1;
        if (next.size >= maxSelect) return prev;
        next.add(id);
      }
      return next;
    });
  }, [playClick, state.torchPosition, puzzle.bridgeCapacity]);

  const handleMove = useCallback(() => {
    if (selected.size === 0) return;
    const direction = state.torchPosition === 'left' ? 'forward' as const : 'back' as const;
    const result = applyMove(state, { people: [...selected], direction, time: 0 }, puzzle);
    if ('error' in result) {
      playError();
      onFail?.(result.error);
      return;
    }
    setState(result);
    setSelected(new Set());
  }, [selected, state, puzzle, playError, onFail]);

  const handleUndo = useCallback(() => {
    if (state.moveHistory.length === 0) return;
    playClick();
    setState(undo(state));
    setSelected(new Set());
  }, [state, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
    setSelected(new Set());
  }, [puzzle, playClick]);

  const timePercent = Math.min(100, (state.elapsedTime / puzzle.timeLimit) * 100);
  const timeWarning = timePercent > 80;

  return (
    <div className="space-y-4">
      {/* Story */}
      <div className="glass-card rounded-2xl p-4 text-sm">
        <p className="font-medium mb-2">{puzzle.story}</p>
        <ul className="space-y-1 text-[var(--text-secondary)]">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-primary">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Time bar */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span>경과: <strong className="text-lg tabular-nums">{state.elapsedTime}분</strong></span>
          <span>제한: <strong className={`text-lg tabular-nums ${timeWarning ? 'text-error' : ''}`}>{puzzle.timeLimit}분</strong></span>
        </div>
        <div className="w-full h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-colors ${timeWarning ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`}
            animate={{ width: `${timePercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Board */}
      <div className="flex flex-col md:flex-row items-stretch gap-0 min-h-[220px] rounded-2xl overflow-hidden shadow-lg shadow-black/5">
        <PersonGroup
          label="이쪽"
          people={state.leftSide}
          speedMap={speedMap}
          hasTorch={state.torchPosition === 'left'}
          selected={selected}
          onToggle={state.torchPosition === 'left' ? toggleSelect : undefined}
        />

        {/* Bridge */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center md:w-28 h-20 md:h-auto bg-gradient-to-b from-stone-700 to-stone-800 dark:from-stone-800 dark:to-stone-900 relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          <div className="text-3xl mb-1">🌉</div>
          <div className="text-xs text-stone-400 font-semibold">다리</div>
          <motion.div
            animate={{ x: state.torchPosition === 'left' ? -8 : 8 }}
            className="text-xs text-amber-400 font-bold mt-1"
          >
            {state.torchPosition === 'left' ? '→' : '←'}
          </motion.div>
        </div>

        <PersonGroup
          label="저쪽"
          people={state.rightSide}
          speedMap={speedMap}
          hasTorch={state.torchPosition === 'right'}
          selected={selected}
          onToggle={state.torchPosition === 'right' ? toggleSelect : undefined}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleMove}
          disabled={selected.size === 0 || state.isComplete || state.isFailed}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold disabled:opacity-40 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25 transition-all"
        >
          {state.torchPosition === 'left' ? '건너기 →' : '← 돌아오기'}
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleUndo} disabled={state.moveHistory.length === 0}
          className="px-5 py-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold disabled:opacity-40 hover:bg-[var(--border)] transition-colors">
          되돌리기
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleReset}
          className="px-5 py-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--border)] transition-colors">
          처음부터
        </motion.button>
      </div>

      <div className="text-center text-sm text-[var(--text-secondary)]">
        이동: <span className="font-bold text-[var(--text)]">{state.steps}</span>
        {' / 최적: '}
        <span className="font-bold text-primary">{puzzle.optimalSteps}</span>
      </div>
    </div>
  );
}

function PersonGroup({
  label,
  people,
  speedMap,
  hasTorch,
  selected,
  onToggle,
}: {
  label: string;
  people: string[];
  speedMap: Map<string, { id: string; name: string; emoji: string; speed: number }>;
  hasTorch: boolean;
  selected: Set<string>;
  onToggle?: (id: string) => void;
}) {
  return (
    <div className={`flex-1 p-5 flex flex-col items-center justify-center gap-3 min-h-[100px] transition-all duration-300 ${
      hasTorch
        ? 'bg-gradient-to-b from-amber-800/40 to-amber-700/20 dark:from-amber-900/40'
        : 'bg-gradient-to-b from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900'
    }`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
        {hasTorch && <span className="text-lg animate-pulse">🔦</span>}
      </div>
      <div className="flex flex-wrap gap-2.5 justify-center">
        <AnimatePresence>
          {people.map((id) => {
            const person = speedMap.get(id);
            if (!person) return null;
            const isSelected = selected.has(id);
            return (
              <motion.button
                key={id}
                layout
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                whileHover={onToggle ? { scale: 1.08, y: -3 } : undefined}
                whileTap={onToggle ? { scale: 0.92 } : undefined}
                onClick={() => onToggle?.(id)}
                className={`flex flex-col items-center p-2.5 rounded-2xl transition-all duration-200 min-w-[60px] ${
                  onToggle ? 'cursor-pointer' : 'cursor-default'
                } ${isSelected
                  ? 'bg-blue-500/20 border-2 border-blue-400 ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/10'
                  : 'bg-white/80 dark:bg-slate-800/80 border-2 border-white/30 dark:border-white/10 backdrop-blur-sm shadow-md shadow-black/5'
                }`}
              >
                <span className="text-2xl">{person.emoji}</span>
                <span className="text-xs font-semibold mt-0.5">{person.name}</span>
                <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-full px-2 py-0.5 mt-1 font-mono">{person.speed}분</span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
