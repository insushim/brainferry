'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateRiverCrossing } from '@/engines/river-crossing/generator';
import {
  createInitialState,
  boardEntity,
  unboardEntity,
  sail,
  undo,
  type RiverState,
} from '@/engines/river-crossing/engine';
import { useAudio } from '@/hooks/useAudio';

interface RiverCrossingBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

export function RiverCrossingBoard({ difficulty, seed, onComplete, onFail }: RiverCrossingBoardProps) {
  const puzzle = useMemo(() => generateRiverCrossing(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<RiverState>(() => createInitialState(puzzle));
  const [shakeBank, setShakeBank] = useState(false);
  const [isBoatMoving, setIsBoatMoving] = useState(false);
  const { playSplash, playError, playClick, playSuccess } = useAudio();

  const entityMap = useMemo(
    () => new Map(puzzle.entities.map((e) => [e.id, e])),
    [puzzle.entities],
  );

  const getEntity = useCallback(
    (id: string) => entityMap.get(id) ?? { id, name: id, emoji: '❓' },
    [entityMap],
  );

  // Check completion
  useEffect(() => {
    if (state.isComplete) {
      playSuccess();
      onComplete(state.steps, puzzle.optimalSteps);
    }
  }, [state.isComplete, state.steps, puzzle.optimalSteps, onComplete, playSuccess]);

  // Check failure
  useEffect(() => {
    if (state.isFailed && state.failReason) {
      playError();
      setShakeBank(true);
      onFail?.(state.failReason);
      setTimeout(() => setShakeBank(false), 500);
    }
  }, [state.isFailed, state.failReason, onFail, playError]);

  const handleClickEntity = useCallback(
    (entityId: string) => {
      if (isBoatMoving || state.isComplete) return;
      playClick();

      if (state.boatContents.includes(entityId)) {
        const result = unboardEntity(state, entityId);
        if ('error' in result) return;
        setState(result);
      } else {
        if (state.boatContents.length >= puzzle.boatCapacity + 1) return;
        const result = boardEntity(state, entityId);
        if ('error' in result) return;
        setState(result);
      }
    },
    [isBoatMoving, state, puzzle.boatCapacity, playClick],
  );

  const handleSail = useCallback(() => {
    if (isBoatMoving || state.isComplete) return;

    const result = sail(state, puzzle);
    if ('error' in result) {
      playError();
      onFail?.(result.error);
      setShakeBank(true);
      setTimeout(() => setShakeBank(false), 500);
      return;
    }

    playSplash();
    setIsBoatMoving(true);
    setTimeout(() => {
      setState(result);
      setIsBoatMoving(false);
    }, 600);
  }, [isBoatMoving, state, puzzle, playSplash, playError, onFail]);

  const handleUndo = useCallback(() => {
    if (isBoatMoving || state.moveHistory.length === 0) return;
    playClick();
    setState(undo(state));
  }, [isBoatMoving, state, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
  }, [puzzle, playClick]);

  const currentBank = state.boatPosition === 'left' ? state.leftBank : state.rightBank;

  return (
    <div className="space-y-4">
      {/* Story & Rules */}
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-sm">
        <p className="font-medium mb-2">{puzzle.story}</p>
        <ul className="space-y-1 text-[var(--text-secondary)]">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-primary">•</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Hints */}
      {puzzle.hints.length > 0 && (
        <details className="bg-warning/10 border border-warning/20 rounded-xl p-3">
          <summary className="text-sm font-semibold text-warning cursor-pointer">힌트 보기</summary>
          <ul className="mt-2 space-y-1">
            {puzzle.hints.map((hint, i) => (
              <li key={i} className="text-sm text-[var(--text-secondary)]">{hint}</li>
            ))}
          </ul>
        </details>
      )}

      {/* Board - Responsive layout */}
      <div className="flex flex-col md:flex-row items-stretch gap-4 min-h-[240px]">
        {/* Left Bank */}
        <Bank
          label="이쪽 강변"
          entities={state.leftBank}
          getEntity={getEntity}
          active={state.boatPosition === 'left' && !isBoatMoving}
          onClickEntity={handleClickEntity}
          shake={shakeBank && state.isFailed && state.boatPosition === 'left'}
        />

        {/* River + Boat */}
        <div className="flex-shrink-0 relative flex items-center justify-center md:w-36 h-32 md:h-auto">
          <div className="absolute inset-0 water-surface rounded-xl" />
          <motion.div
            animate={{
              x: state.boatPosition === 'left' ? -20 : 20,
              y: state.boatPosition === 'left' ? 0 : 0,
            }}
            transition={{ type: 'spring', stiffness: 120, damping: 15 }}
            className="relative z-10"
          >
            <motion.div
              className="bg-amber-800/90 rounded-xl px-4 py-3 border-2 border-amber-700 shadow-lg animate-boat-rock"
            >
              <div className="text-xl text-center mb-1">🚣</div>
              <div className="flex gap-1 justify-center min-h-[32px]">
                <AnimatePresence>
                  {state.boatContents.map((id) => (
                    <motion.button
                      key={id}
                      layout
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={() => handleClickEntity(id)}
                      className="w-9 h-9 rounded-full bg-amber-700/50 flex items-center justify-center text-lg cursor-pointer hover:bg-amber-600/50 transition-colors"
                      title={getEntity(id).name}
                    >
                      {getEntity(id).emoji}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Right Bank */}
        <Bank
          label="저쪽 강변"
          entities={state.rightBank}
          getEntity={getEntity}
          active={state.boatPosition === 'right' && !isBoatMoving}
          onClickEntity={handleClickEntity}
          shake={shakeBank && state.isFailed && state.boatPosition === 'right'}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={handleSail}
          disabled={isBoatMoving || state.boatContents.length === 0 || state.isComplete}
          className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold disabled:opacity-40 hover:bg-primary-dark transition-colors"
        >
          출발! 🚣
        </button>
        <button
          onClick={handleUndo}
          disabled={isBoatMoving || state.moveHistory.length === 0}
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

      {/* Steps counter */}
      <div className="text-center text-sm text-[var(--text-secondary)]">
        이동: <span className="font-bold text-[var(--text)]">{state.steps}</span>
        {' / 최적: '}
        <span className="font-bold text-primary">{puzzle.optimalSteps}</span>
      </div>
    </div>
  );
}

function Bank({
  label,
  entities,
  getEntity,
  active,
  onClickEntity,
  shake,
}: {
  label: string;
  entities: string[];
  getEntity: (id: string) => { id: string; name: string; emoji: string };
  active: boolean;
  onClickEntity: (id: string) => void;
  shake: boolean;
}) {
  return (
    <div
      className={`flex-1 rounded-xl p-4 flex flex-col items-center justify-center gap-3 min-h-[100px] transition-all ${
        shake ? 'animate-shake animate-red-flash' : ''
      } ${active ? 'bg-green-500/10 border-2 border-green-500/30' : 'bg-[var(--bg-secondary)] border-2 border-transparent'}`}
    >
      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap gap-2 justify-center">
        <AnimatePresence>
          {entities.map((id) => {
            const entity = getEntity(id);
            return (
              <motion.button
                key={id}
                layout
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={active ? { scale: 1.15 } : undefined}
                whileTap={active ? { scale: 0.9 } : undefined}
                onClick={() => active && onClickEntity(id)}
                className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all ${
                  active
                    ? 'bg-[var(--card)] border-2 border-primary/30 cursor-pointer hover:border-primary hover:shadow-lg'
                    : 'bg-[var(--card)] border-2 border-transparent opacity-70'
                }`}
                title={entity.name}
              >
                <span className="text-2xl leading-none">{entity.emoji}</span>
                <span className="text-[10px] font-medium text-[var(--text-secondary)] mt-0.5 leading-none">
                  {entity.name}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
