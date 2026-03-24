'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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

/* ── Wave SVG for animated river ── */
function WaveLayer({ speed, opacity, yOffset, color }: { speed: number; opacity: number; yOffset: number; color: string }) {
  return (
    <div
      className="absolute left-0 right-0 overflow-hidden pointer-events-none"
      style={{ top: `${yOffset}%`, height: '40%', opacity }}
    >
      <motion.svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className="w-[200%] h-full"
        animate={{ x: [0, '-50%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
      >
        <path
          d="M0,60 C150,90 350,30 500,60 C650,90 850,30 1000,60 C1050,75 1150,45 1200,60 L1200,120 L0,120Z"
          fill={color}
        />
      </motion.svg>
    </div>
  );
}

/* ── Entity token card with glass morphism ── */
function EntityToken({
  entity,
  active,
  onBoat,
  onClick,
}: {
  entity: { id: string; name: string; emoji: string };
  active: boolean;
  onBoat: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={active ? { scale: 1.1, y: -4 } : undefined}
      whileTap={active ? { scale: 0.92 } : undefined}
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center
        w-16 h-16 sm:w-[72px] sm:h-[72px]
        rounded-2xl transition-all duration-200
        ${active
          ? 'cursor-pointer hover:shadow-xl hover:shadow-blue-500/10'
          : 'cursor-default opacity-70'
        }
        ${onBoat
          ? 'bg-blue-500/20 dark:bg-blue-400/15 border-2 border-blue-400 shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/30'
          : 'bg-white/80 dark:bg-slate-800/80 border-2 border-white/40 dark:border-white/10 shadow-lg shadow-black/5'
        }
        backdrop-blur-sm
      `}
      title={entity.name}
    >
      <span className="text-[32px] sm:text-[36px] leading-none">{entity.emoji}</span>
      <span className="text-[10px] sm:text-xs font-semibold text-[var(--text-secondary)] mt-0.5 leading-none truncate max-w-full px-1">
        {entity.name}
      </span>
    </motion.button>
  );
}

/* ── Bank (grass area) ── */
function Bank({
  label,
  side,
  entities,
  getEntity,
  active,
  onClickEntity,
  shake,
}: {
  label: string;
  side: 'left' | 'right';
  entities: string[];
  getEntity: (id: string) => { id: string; name: string; emoji: string };
  active: boolean;
  onClickEntity: (id: string) => void;
  shake: boolean;
}) {
  return (
    <motion.div
      animate={shake ? { x: [0, -6, 6, -6, 6, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      className={`
        flex-1 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center gap-3
        min-h-[120px] md:min-h-[200px] relative overflow-hidden transition-all duration-300
        ${shake ? 'ring-2 ring-red-500/50' : ''}
        ${active
          ? 'grass-bank shadow-inner'
          : 'bg-gradient-to-b from-green-900/40 to-green-800/30 dark:from-green-950/40 dark:to-green-900/30'
        }
      `}
    >
      {/* Grass edge decorations */}
      {active && (
        <>
          <div className="absolute bottom-0 left-2 w-3 h-8 bg-green-600/40 rounded-t-full animate-[grass-sway_3s_ease-in-out_infinite]" />
          <div className="absolute bottom-0 left-6 w-2 h-6 bg-green-500/30 rounded-t-full animate-[grass-sway_2.5s_ease-in-out_infinite_0.5s]" />
          <div className="absolute bottom-0 right-3 w-3 h-7 bg-green-600/40 rounded-t-full animate-[grass-sway_3.5s_ease-in-out_infinite_1s]" />
          <div className="absolute bottom-0 right-8 w-2 h-5 bg-green-500/30 rounded-t-full animate-[grass-sway_2s_ease-in-out_infinite_0.3s]" />
        </>
      )}

      {/* Red flash overlay */}
      <AnimatePresence>
        {shake && (
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-red-500/30 rounded-2xl pointer-events-none z-10"
          />
        )}
      </AnimatePresence>

      <span className="text-xs font-bold text-white/80 uppercase tracking-wider z-10 drop-shadow-sm">
        {label}
      </span>

      <div className="flex flex-wrap gap-2 sm:gap-3 justify-center z-10">
        <AnimatePresence mode="popLayout">
          {entities.map((id) => {
            const entity = getEntity(id);
            return (
              <EntityToken
                key={id}
                entity={entity}
                active={active}
                onBoat={false}
                onClick={() => active && onClickEntity(id)}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {active && entities.length > 0 && (
        <span className="text-[10px] text-white/50 z-10 mt-1">
          {side === 'left' ? '클릭하여 보트에 태우기' : '클릭하여 보트에 태우기'}
        </span>
      )}
    </motion.div>
  );
}

/* ── Main Board ── */
export function RiverCrossingBoard({ difficulty, seed, onComplete, onFail }: RiverCrossingBoardProps) {
  const puzzle = useMemo(() => generateRiverCrossing(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<RiverState>(() => createInitialState(puzzle));
  const [shakeBank, setShakeBank] = useState<'left' | 'right' | null>(null);
  const [isBoatMoving, setIsBoatMoving] = useState(false);
  const [violationToast, setViolationToast] = useState<string | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { playSplash, playError, playClick, playSuccess } = useAudio();

  const entityMap = useMemo(
    () => new Map(puzzle.entities.map((e) => [e.id, e])),
    [puzzle.entities],
  );

  const getEntity = useCallback(
    (id: string) => entityMap.get(id) ?? { id, name: id, emoji: '?' },
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
      const failSide = state.boatPosition;
      setShakeBank(failSide === 'left' ? 'right' : 'left');
      setViolationToast(state.failReason);
      onFail?.(state.failReason);

      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => {
        setShakeBank(null);
        setViolationToast(null);
      }, 3000);
    }
  }, [state.isFailed, state.failReason, state.boatPosition, onFail, playError]);

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
      setViolationToast(result.error);
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setViolationToast(null), 3000);
      return;
    }

    playSplash();
    setIsBoatMoving(true);
    setTimeout(() => {
      setState(result);
      setIsBoatMoving(false);
    }, 800);
  }, [isBoatMoving, state, puzzle, playSplash, playError, onFail]);

  const handleUndo = useCallback(() => {
    if (isBoatMoving || state.moveHistory.length === 0) return;
    playClick();
    setState(undo(state));
  }, [isBoatMoving, state, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
    setShakeBank(null);
    setViolationToast(null);
  }, [puzzle, playClick]);

  const boatHasPassengers = state.boatContents.length > 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Violation toast */}
      <AnimatePresence>
        {violationToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-red-500 text-white font-semibold text-sm shadow-2xl shadow-red-500/30 max-w-[90vw] text-center"
          >
            {violationToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop Layout ── */}
      <div className="hidden md:flex items-stretch gap-0 min-h-[280px] rounded-2xl overflow-hidden shadow-xl shadow-black/10">
        {/* Left Bank */}
        <div className="w-[35%]">
          <Bank
            label="이쪽 강변"
            side="left"
            entities={state.leftBank.filter(id => !state.boatContents.includes(id))}
            getEntity={getEntity}
            active={state.boatPosition === 'left' && !isBoatMoving}
            onClickEntity={handleClickEntity}
            shake={shakeBank === 'left'}
          />
        </div>

        {/* River */}
        <div className="w-[30%] relative flex items-center justify-center">
          {/* Water background */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900 via-blue-700 to-blue-600 dark:from-blue-950 dark:via-blue-900 dark:to-blue-800">
            <WaveLayer speed={8} opacity={0.15} yOffset={10} color="rgba(147,197,253,0.3)" />
            <WaveLayer speed={6} opacity={0.1} yOffset={40} color="rgba(191,219,254,0.2)" />
            <WaveLayer speed={10} opacity={0.08} yOffset={65} color="rgba(219,234,254,0.15)" />

            {/* Shimmer highlights */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 animate-[water-shimmer_4s_ease-in-out_infinite]" />
          </div>

          {/* Boat */}
          <motion.div
            animate={{
              x: state.boatPosition === 'left' ? '-30%' : '30%',
            }}
            transition={{ type: 'spring', stiffness: 80, damping: 18, duration: 0.8 }}
            className="relative z-10"
          >
            {/* Wake effect */}
            <AnimatePresence>
              {isBoatMoving && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 0.3, scaleX: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-3 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full blur-sm"
                />
              )}
            </AnimatePresence>

            <motion.div
              className="animate-boat-rock"
            >
              {/* Boat body */}
              <div className="bg-gradient-to-b from-amber-700 to-amber-900 rounded-xl px-5 py-3 border-2 border-amber-600/60 shadow-2xl shadow-black/30 min-w-[130px]"
                style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(0,0,0,0.08) 14px, rgba(0,0,0,0.08) 16px)',
                }}
              >
                <div className="text-2xl text-center mb-1.5 drop-shadow-lg">🚣</div>
                <div className="flex gap-1.5 justify-center min-h-[40px] items-center">
                  <AnimatePresence mode="popLayout">
                    {state.boatContents.map((id) => (
                      <motion.button
                        key={id}
                        layout
                        initial={{ scale: 0, y: -20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        onClick={() => handleClickEntity(id)}
                        className="w-10 h-10 rounded-xl bg-amber-600/40 backdrop-blur-sm flex items-center justify-center text-xl cursor-pointer hover:bg-amber-500/50 transition-colors border border-amber-500/30"
                        title={getEntity(id).name}
                      >
                        {getEntity(id).emoji}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                  {state.boatContents.length === 0 && (
                    <span className="text-amber-400/40 text-xs">비어있음</span>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Right Bank */}
        <div className="w-[35%]">
          <Bank
            label="저쪽 강변"
            side="right"
            entities={state.rightBank.filter(id => !state.boatContents.includes(id))}
            getEntity={getEntity}
            active={state.boatPosition === 'right' && !isBoatMoving}
            onClickEntity={handleClickEntity}
            shake={shakeBank === 'right'}
          />
        </div>
      </div>

      {/* ── Mobile Layout (vertical) ── */}
      <div className="md:hidden space-y-0 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
        {/* Left Bank */}
        <Bank
          label="이쪽 강변"
          side="left"
          entities={state.leftBank.filter(id => !state.boatContents.includes(id))}
          getEntity={getEntity}
          active={state.boatPosition === 'left' && !isBoatMoving}
          onClickEntity={handleClickEntity}
          shake={shakeBank === 'left'}
        />

        {/* River + Boat */}
        <div className="relative h-36 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900 via-blue-700 to-blue-600 dark:from-blue-950 dark:via-blue-900 dark:to-blue-800">
            <WaveLayer speed={8} opacity={0.15} yOffset={10} color="rgba(147,197,253,0.3)" />
            <WaveLayer speed={6} opacity={0.1} yOffset={50} color="rgba(191,219,254,0.2)" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 animate-[water-shimmer_4s_ease-in-out_infinite]" />
          </div>

          <motion.div
            animate={{ y: state.boatPosition === 'left' ? -10 : 10 }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
            className="relative z-10 animate-boat-rock"
          >
            <div
              className="bg-gradient-to-b from-amber-700 to-amber-900 rounded-xl px-5 py-3 border-2 border-amber-600/60 shadow-2xl shadow-black/30"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(0,0,0,0.08) 14px, rgba(0,0,0,0.08) 16px)',
              }}
            >
              <div className="text-2xl text-center mb-1.5">🚣</div>
              <div className="flex gap-1.5 justify-center min-h-[36px] items-center">
                <AnimatePresence mode="popLayout">
                  {state.boatContents.map((id) => (
                    <motion.button
                      key={id}
                      layout
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={() => handleClickEntity(id)}
                      className="w-9 h-9 rounded-xl bg-amber-600/40 flex items-center justify-center text-lg cursor-pointer hover:bg-amber-500/50 transition-colors border border-amber-500/30"
                      title={getEntity(id).name}
                    >
                      {getEntity(id).emoji}
                    </motion.button>
                  ))}
                </AnimatePresence>
                {state.boatContents.length === 0 && (
                  <span className="text-amber-400/40 text-xs">비어있음</span>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Bank */}
        <Bank
          label="저쪽 강변"
          side="right"
          entities={state.rightBank.filter(id => !state.boatContents.includes(id))}
          getEntity={getEntity}
          active={state.boatPosition === 'right' && !isBoatMoving}
          onClickEntity={handleClickEntity}
          shake={shakeBank === 'right'}
        />
      </div>

      {/* Sail button */}
      <div className="flex justify-center pt-1">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleSail}
          disabled={isBoatMoving || !boatHasPassengers || state.isComplete}
          className={`
            px-8 py-3.5 rounded-2xl font-bold text-white text-base
            shadow-lg transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
            ${boatHasPassengers && !state.isComplete
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25 animate-pulse-button'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/25'
            }
          `}
        >
          출발! 🚀
        </motion.button>
      </div>
    </div>
  );
}
