'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateBodyguard } from '@/engines/bodyguard/generator';
import {
  createInitialState,
  applyMove,
  undo,
  type BodyguardState,
} from '@/engines/bodyguard/engine';
import { useAudio } from '@/hooks/useAudio';

interface BodyguardBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

export function BodyguardBoard({ difficulty, seed, onComplete, onFail }: BodyguardBoardProps) {
  const puzzle = useMemo(() => generateBodyguard(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<BodyguardState>(() => createInitialState(puzzle));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isMoving, setIsMoving] = useState(false);
  const { playSplash, playError, playClick, playSuccess } = useAudio();

  const entityMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; emoji: string; role: 'protector' | 'charge' }>();
    for (const pair of puzzle.pairs) {
      map.set(pair.protector.id, { ...pair.protector, role: 'protector' });
      map.set(pair.charge.id, { ...pair.charge, role: 'charge' });
    }
    return map;
  }, [puzzle.pairs]);

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

  const currentBank = state.boatPosition === 'left' ? state.leftSide : state.rightSide;

  const toggleSelect = useCallback((id: string) => {
    if (!currentBank.includes(id)) return;
    playClick();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= puzzle.boatCapacity) return prev;
        next.add(id);
      }
      return next;
    });
  }, [currentBank, puzzle.boatCapacity, playClick]);

  const handleSail = useCallback(() => {
    if (isMoving || selected.size === 0 || state.isComplete) return;
    const direction = state.boatPosition === 'left' ? 'left-to-right' as const : 'right-to-left' as const;
    const result = applyMove(state, { passengers: [...selected], direction }, puzzle);
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
  }, [isMoving, selected, state, puzzle, playSplash, playError, onFail]);

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

      {/* Pair relationships */}
      <div className="bg-accent/10 border border-accent/20 rounded-xl p-3">
        <span className="text-xs font-bold text-accent">보호 관계:</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {puzzle.pairs.map((pair, i) => (
            <span key={i} className="text-sm bg-[var(--bg-secondary)] rounded-lg px-2 py-1">
              {pair.protector.emoji}{pair.protector.name} → {pair.charge.emoji}{pair.charge.name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch gap-4 min-h-[200px]">
        <EntityBank
          label="이쪽"
          entities={state.leftSide}
          entityMap={entityMap}
          active={state.boatPosition === 'left' && !isMoving}
          selected={selected}
          onToggle={state.boatPosition === 'left' ? toggleSelect : undefined}
          failed={state.isFailed && state.boatPosition !== 'left'}
        />

        <div className="flex-shrink-0 relative flex items-center justify-center md:w-32 h-28 md:h-auto">
          <div className="absolute inset-0 water-surface rounded-xl" />
          <motion.div
            animate={{ x: state.boatPosition === 'left' ? -15 : 15 }}
            className="relative z-10 bg-amber-800/90 rounded-xl p-3 border-2 border-amber-700"
          >
            <div className="text-xl text-center">🚣</div>
            <div className="flex gap-1 justify-center mt-1 min-h-[28px]">
              {[...selected].map((id) => {
                const entity = entityMap.get(id);
                return entity ? (
                  <span key={id} className="text-lg">{entity.emoji}</span>
                ) : null;
              })}
            </div>
          </motion.div>
        </div>

        <EntityBank
          label="저쪽"
          entities={state.rightSide}
          entityMap={entityMap}
          active={state.boatPosition === 'right' && !isMoving}
          selected={selected}
          onToggle={state.boatPosition === 'right' ? toggleSelect : undefined}
          failed={state.isFailed && state.boatPosition !== 'right'}
        />
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={handleSail}
          disabled={isMoving || selected.size === 0 || state.isComplete}
          className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold disabled:opacity-40 hover:bg-primary-dark transition-colors"
        >
          출발! 🚣
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

function EntityBank({
  label,
  entities,
  entityMap,
  active,
  selected,
  onToggle,
  failed,
}: {
  label: string;
  entities: string[];
  entityMap: Map<string, { id: string; name: string; emoji: string; role: 'protector' | 'charge' }>;
  active: boolean;
  selected: Set<string>;
  onToggle?: (id: string) => void;
  failed: boolean;
}) {
  return (
    <div className={`flex-1 rounded-xl p-4 flex flex-col items-center justify-center gap-2 min-h-[80px] ${
      failed ? 'animate-shake animate-red-flash' : ''
    } ${active ? 'bg-green-500/10 border-2 border-green-500/30' : 'bg-[var(--bg-secondary)] border-2 border-transparent'}`}>
      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">{label}</span>
      <div className="flex flex-wrap gap-2 justify-center">
        <AnimatePresence>
          {entities.map((id) => {
            const entity = entityMap.get(id);
            if (!entity) return null;
            const isSelected = selected.has(id);
            return (
              <motion.button
                key={id}
                layout
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={() => onToggle?.(id)}
                className={`flex flex-col items-center p-1.5 rounded-xl transition-all ${
                  onToggle ? 'cursor-pointer' : 'cursor-default'
                } ${isSelected
                  ? 'bg-primary/20 border-2 border-primary'
                  : entity.role === 'protector'
                    ? 'bg-[var(--card)] border-2 border-success/40'
                    : 'bg-[var(--card)] border-2 border-[var(--border)]'
                }`}
              >
                <span className="text-xl">{entity.emoji}</span>
                <span className="text-[10px] font-medium">{entity.name}</span>
                <span className={`text-[9px] ${entity.role === 'protector' ? 'text-success' : 'text-[var(--text-secondary)]'}`}>
                  {entity.role === 'protector' ? '보디가드' : '피보호'}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
