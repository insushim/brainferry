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

  const currentSide = state.torchPosition === 'left' ? state.leftSide : state.rightSide;

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

      {/* Time bar */}
      <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
        <div className="flex justify-between text-sm mb-1">
          <span>경과 시간: <strong>{state.elapsedTime}분</strong></span>
          <span>제한 시간: <strong className="text-error">{puzzle.timeLimit}분</strong></span>
        </div>
        <div className="w-full h-3 bg-[var(--border)] rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              state.elapsedTime > puzzle.timeLimit * 0.8 ? 'bg-error' : 'bg-primary'
            }`}
            animate={{ width: `${Math.min(100, (state.elapsedTime / puzzle.timeLimit) * 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch gap-4 min-h-[200px]">
        {/* Left Side */}
        <PersonGroup
          label="이쪽"
          people={state.leftSide}
          speedMap={speedMap}
          hasTorch={state.torchPosition === 'left'}
          selected={selected}
          onToggle={state.torchPosition === 'left' ? toggleSelect : undefined}
        />

        {/* Bridge */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center md:w-24">
          <div className="text-2xl mb-2">🌉</div>
          <div className="text-sm text-[var(--text-secondary)] font-medium">다리</div>
          <div className="text-xs text-[var(--text-secondary)]">
            {state.torchPosition === 'left' ? '→' : '←'}
          </div>
        </div>

        {/* Right Side */}
        <PersonGroup
          label="저쪽"
          people={state.rightSide}
          speedMap={speedMap}
          hasTorch={state.torchPosition === 'right'}
          selected={selected}
          onToggle={state.torchPosition === 'right' ? toggleSelect : undefined}
        />
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={handleMove}
          disabled={selected.size === 0 || state.isComplete || state.isFailed}
          className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold disabled:opacity-40 hover:bg-primary-dark transition-colors"
        >
          {state.torchPosition === 'left' ? '건너기 →' : '← 돌아오기'}
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
    <div className={`flex-1 rounded-xl p-4 flex flex-col items-center justify-center gap-3 min-h-[80px] ${
      hasTorch ? 'bg-amber-500/10 border-2 border-amber-500/30' : 'bg-[var(--bg-secondary)] border-2 border-transparent'
    }`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">{label}</span>
        {hasTorch && <span className="text-lg">🔦</span>}
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
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
                onClick={() => onToggle?.(id)}
                className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                  onToggle ? 'cursor-pointer' : 'cursor-default'
                } ${isSelected
                  ? 'bg-primary/20 border-2 border-primary ring-2 ring-primary/30'
                  : 'bg-[var(--card)] border-2 border-[var(--border)]'
                }`}
              >
                <span className="text-2xl">{person.emoji}</span>
                <span className="text-xs font-medium">{person.name}</span>
                <span className="text-xs text-[var(--text-secondary)]">{person.speed}분</span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
