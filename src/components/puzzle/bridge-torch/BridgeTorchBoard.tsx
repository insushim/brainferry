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
  const [isMoving, setIsMoving] = useState(false);
  const { playClick, playError, playSuccess, playSplash } = useAudio();

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

  const currentSide = state.torchPosition === 'left' ? state.leftSide : state.rightSide;

  const toggleSelect = useCallback((id: string) => {
    if (state.isComplete || state.isFailed || isMoving) return;
    if (!currentSide.includes(id)) return;
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
  }, [playClick, state.torchPosition, state.isComplete, state.isFailed, isMoving, puzzle.bridgeCapacity, currentSide]);

  const handleMove = useCallback(() => {
    if (selected.size === 0 || isMoving || state.isComplete || state.isFailed) return;
    const direction = state.torchPosition === 'left' ? 'forward' as const : 'back' as const;
    const result = applyMove(state, { people: [...selected], direction, time: 0 }, puzzle);
    if ('error' in result) {
      playError();
      onFail?.(result.error);
      return;
    }
    playSplash();
    setIsMoving(true);
    setTimeout(() => {
      setState(result);
      setSelected(new Set());
      setIsMoving(false);
    }, 600);
  }, [selected, state, puzzle, playError, playSplash, onFail, isMoving]);

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
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-sm">
        <p className="font-medium mb-2 text-slate-100">{puzzle.story}</p>
        <ul className="space-y-1 text-slate-400">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-blue-400">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Time bar */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">경과: <strong className="text-lg tabular-nums text-slate-100">{state.elapsedTime}분</strong></span>
          <span className="text-slate-400">제한: <strong className={`text-lg tabular-nums ${timeWarning ? 'text-red-400' : 'text-slate-100'}`}>{puzzle.timeLimit}분</strong></span>
        </div>
        <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
          <motion.div
            className={`h-full rounded-full transition-colors ${timeWarning ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`}
            animate={{ width: `${timePercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Board */}
      <div className="flex flex-col md:flex-row items-stretch gap-0 min-h-[260px] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-white/5">
        {/* Left side */}
        <PersonGroup
          label="이쪽"
          people={state.leftSide}
          speedMap={speedMap}
          hasTorch={state.torchPosition === 'left'}
          selected={selected}
          onToggle={state.torchPosition === 'left' && !isMoving ? toggleSelect : undefined}
        />

        {/* Bridge */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center md:w-32 h-24 md:h-auto bg-gradient-to-b from-stone-800 to-stone-900 relative border-x border-white/5">
          {/* Torchlight glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          <div className="text-4xl mb-1 drop-shadow-lg">🌉</div>
          <div className="text-xs text-stone-500 font-semibold">다리</div>
          <motion.div
            animate={{ x: state.torchPosition === 'left' ? -8 : 8 }}
            className="text-xs text-amber-400 font-bold mt-1.5"
          >
            {state.torchPosition === 'left' ? '→' : '←'}
          </motion.div>
          {/* Show selected people on bridge during move */}
          {isMoving && (
            <div className="flex gap-1 mt-1">
              {[...selected].map((id) => {
                const person = speedMap.get(id);
                return person ? (
                  <motion.span
                    key={id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-lg"
                  >
                    {person.emoji}
                  </motion.span>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* Right side */}
        <PersonGroup
          label="저쪽"
          people={state.rightSide}
          speedMap={speedMap}
          hasTorch={state.torchPosition === 'right'}
          selected={selected}
          onToggle={state.torchPosition === 'right' && !isMoving ? toggleSelect : undefined}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleMove}
          disabled={selected.size === 0 || state.isComplete || state.isFailed || isMoving}
          className={`px-8 py-3 rounded-2xl text-white font-bold disabled:opacity-30 shadow-lg transition-all ${
            selected.size > 0 && !state.isComplete && !state.isFailed
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 shadow-blue-500/25 animate-pulse-button'
              : 'bg-white/10 backdrop-blur-sm border border-white/10'
          }`}
        >
          {state.torchPosition === 'left' ? '건너기 →' : '← 돌아오기'}
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
    <div className={`flex-1 p-5 flex flex-col items-center justify-center gap-3 min-h-[100px] transition-all duration-300 relative overflow-hidden ${
      hasTorch
        ? 'bg-gradient-to-b from-amber-900/40 to-amber-950/30'
        : 'bg-gradient-to-b from-slate-800/80 to-slate-900/90'
    }`}>
      {/* Torch light effect */}
      {hasTorch && (
        <div className="absolute inset-0 bg-gradient-radial from-amber-500/10 via-transparent to-transparent pointer-events-none" />
      )}
      <div className="flex items-center gap-2 z-10">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        {hasTorch && <span className="text-lg animate-pulse drop-shadow-lg">🔦</span>}
      </div>
      <div className="flex flex-wrap gap-2.5 justify-center z-10">
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
                disabled={!onToggle}
                className={`flex flex-col items-center p-2.5 rounded-2xl transition-all duration-200 min-w-[64px] ${
                  onToggle ? 'cursor-pointer' : 'cursor-default opacity-60'
                } ${isSelected
                  ? 'bg-blue-500/20 border border-blue-400/40 ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/15'
                  : 'bg-white/10 backdrop-blur-md border border-white/10 shadow-lg shadow-black/10 hover:border-white/20 hover:bg-white/15'
                }`}
              >
                <span className="text-2xl drop-shadow-md">{person.emoji}</span>
                <span className="text-xs font-semibold mt-0.5 text-slate-200">{person.name}</span>
                <span className="text-[10px] text-slate-400 bg-white/5 backdrop-blur-sm rounded-full px-2 py-0.5 mt-1 font-mono border border-white/5">
                  {person.speed}분
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
      {people.length === 0 && (
        <div className="text-slate-600 text-sm z-10">비어 있음</div>
      )}
    </div>
  );
}
