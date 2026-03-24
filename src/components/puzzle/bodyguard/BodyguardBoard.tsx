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
import { Shield, ArrowRight } from 'lucide-react';

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
      {/* Story */}
      <div className="glass-card rounded-2xl p-4 text-sm">
        <p className="font-medium mb-2">{puzzle.story}</p>
        <ul className="space-y-1 text-[var(--text-secondary)]">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-primary">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Protection pairs */}
      <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-2xl p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">보호 관계</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {puzzle.pairs.map((pair, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/30 dark:border-white/10 shadow-sm">
              <span className="text-lg">{pair.protector.emoji}</span>
              <span className="font-medium">{pair.protector.name}</span>
              <ArrowRight className="w-3 h-3 text-[var(--text-secondary)]" />
              <span className="text-lg">{pair.charge.emoji}</span>
              <span className="font-medium">{pair.charge.name}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="flex flex-col md:flex-row items-stretch gap-0 min-h-[220px] rounded-2xl overflow-hidden shadow-lg shadow-black/5">
        <EntityBank
          label="이쪽"
          entities={state.leftSide}
          entityMap={entityMap}
          active={state.boatPosition === 'left' && !isMoving}
          selected={selected}
          onToggle={state.boatPosition === 'left' ? toggleSelect : undefined}
          failed={state.isFailed && state.boatPosition !== 'left'}
        />

        {/* River + Boat */}
        <div className="flex-shrink-0 relative flex items-center justify-center md:w-36 h-32 md:h-auto">
          <div className="absolute inset-0 water-surface" />
          <motion.div
            animate={{ x: state.boatPosition === 'left' ? -15 : 15 }}
            transition={{ type: 'spring', stiffness: 100, damping: 18 }}
            className="relative z-10 animate-boat-rock"
          >
            <div
              className="bg-gradient-to-b from-amber-700 to-amber-900 rounded-xl p-3 border-2 border-amber-600/60 shadow-2xl"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(0,0,0,0.06) 14px, rgba(0,0,0,0.06) 16px)',
              }}
            >
              <div className="text-xl text-center">🚣</div>
              <div className="flex gap-1 justify-center mt-1.5 min-h-[32px]">
                {[...selected].map((id) => {
                  const entity = entityMap.get(id);
                  return entity ? (
                    <span key={id} className="text-lg">{entity.emoji}</span>
                  ) : null;
                })}
              </div>
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

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSail}
          disabled={isMoving || selected.size === 0 || state.isComplete}
          className={`px-8 py-3 rounded-xl text-white font-bold disabled:opacity-40 shadow-lg transition-all ${
            selected.size > 0 && !state.isComplete
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25 animate-pulse-button'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/25'
          }`}
        >
          출발! 🚣
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
    <div className={`flex-1 p-5 flex flex-col items-center justify-center gap-3 min-h-[100px] transition-all duration-300 ${
      failed ? 'animate-shake' : ''
    } ${active
      ? 'grass-bank shadow-inner'
      : 'bg-gradient-to-b from-green-900/30 to-green-800/20 dark:from-green-950/30'
    }`}>
      <span className="text-xs font-bold text-white/70 uppercase tracking-wider">{label}</span>
      <div className="flex flex-wrap gap-2.5 justify-center">
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
                whileHover={onToggle ? { scale: 1.08, y: -3 } : undefined}
                whileTap={onToggle ? { scale: 0.92 } : undefined}
                onClick={() => onToggle?.(id)}
                className={`flex flex-col items-center p-2 rounded-2xl transition-all duration-200 min-w-[56px] ${
                  onToggle ? 'cursor-pointer' : 'cursor-default'
                } ${isSelected
                  ? 'bg-blue-500/20 border-2 border-blue-400 ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/10'
                  : entity.role === 'protector'
                    ? 'bg-white/80 dark:bg-slate-800/80 border-2 border-emerald-400/40 backdrop-blur-sm shadow-md'
                    : 'bg-white/80 dark:bg-slate-800/80 border-2 border-white/30 dark:border-white/10 backdrop-blur-sm shadow-md'
                }`}
              >
                <span className="text-2xl">{entity.emoji}</span>
                <span className="text-[10px] font-semibold mt-0.5">{entity.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full mt-0.5 font-semibold ${
                  entity.role === 'protector'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}>
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
