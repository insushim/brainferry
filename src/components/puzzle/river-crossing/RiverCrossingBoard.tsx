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

/* ── Animated SVG wave layers ── */
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
      whileHover={active ? { scale: 1.08, y: -4 } : undefined}
      whileTap={active ? { scale: 0.92 } : undefined}
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center
        w-14 h-[68px] sm:w-[72px] sm:h-[84px]
        rounded-2xl transition-all duration-200
        ${active
          ? 'cursor-pointer'
          : 'cursor-default opacity-60'
        }
        ${onBoat
          ? 'bg-blue-500/20 backdrop-blur-md border border-blue-400/40 shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/40'
          : 'bg-white/10 backdrop-blur-md border border-white/10 shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-blue-500/10 hover:border-white/20'
        }
      `}
      title={entity.name}
    >
      <span className="text-[32px] sm:text-[40px] leading-none drop-shadow-md">{entity.emoji}</span>
      <span className="text-[10px] sm:text-xs font-semibold text-slate-300 mt-0.5 leading-none truncate max-w-full px-1">
        {entity.name}
      </span>
    </motion.button>
  );
}

/* ── Bank (grass area with texture) ── */
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
        h-full rounded-none p-4 sm:p-5 flex flex-col items-center justify-center gap-3
        min-h-[120px] md:min-h-0 relative overflow-hidden transition-all duration-300
        ${shake ? 'ring-2 ring-red-500/50 ring-inset' : ''}
        ${active
          ? 'bg-gradient-to-b from-emerald-900/80 to-emerald-950/90'
          : 'bg-gradient-to-b from-emerald-950/60 to-emerald-950/80'
        }
      `}
    >
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
      }} />

      {/* Grass edge decorations */}
      {active && (
        <>
          <div className="absolute bottom-0 left-2 w-3 h-8 bg-emerald-600/30 rounded-t-full animate-[grass-sway_3s_ease-in-out_infinite]" />
          <div className="absolute bottom-0 left-7 w-2 h-6 bg-emerald-500/20 rounded-t-full animate-[grass-sway_2.5s_ease-in-out_infinite_0.5s]" />
          <div className="absolute bottom-0 right-4 w-3 h-7 bg-emerald-600/30 rounded-t-full animate-[grass-sway_3.5s_ease-in-out_infinite_1s]" />
          <div className="absolute bottom-0 right-9 w-2 h-5 bg-emerald-500/20 rounded-t-full animate-[grass-sway_2s_ease-in-out_infinite_0.3s]" />
        </>
      )}

      {/* Red flash overlay on failure */}
      <AnimatePresence>
        {shake && (
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-red-500/30 pointer-events-none z-10"
          />
        )}
      </AnimatePresence>

      <span className="text-[11px] font-bold text-emerald-300/70 uppercase tracking-widest z-10 drop-shadow-sm">
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
        <span className="text-[10px] text-emerald-400/40 z-10 mt-1">
          클릭하여 보트에 태우기
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

  useEffect(() => {
    if (state.isComplete) {
      playSuccess();
      onComplete(state.steps, puzzle.optimalSteps);
    }
  }, [state.isComplete, state.steps, puzzle.optimalSteps, onComplete, playSuccess]);

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
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-red-500/90 backdrop-blur-md text-white font-semibold text-sm shadow-2xl shadow-red-500/30 max-w-[90vw] text-center border border-red-400/30"
          >
            {violationToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop Layout ── */}
      <div className="hidden md:flex items-stretch gap-0 min-h-[300px] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-white/5">
        {/* Left Bank - 35% */}
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

        {/* River - 30% */}
        <div className="w-[30%] relative flex flex-col items-center justify-center">
          {/* Deep water background */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-800 via-blue-900 to-indigo-900">
            <WaveLayer speed={8} opacity={0.12} yOffset={5} color="rgba(147,197,253,0.2)" />
            <WaveLayer speed={6} opacity={0.08} yOffset={35} color="rgba(165,180,252,0.15)" />
            <WaveLayer speed={10} opacity={0.06} yOffset={65} color="rgba(199,210,254,0.12)" />

            {/* Shimmer highlights */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.03] animate-[water-shimmer_4s_ease-in-out_infinite]" />
          </div>

          {/* Boat */}
          <motion.div
            animate={{
              x: state.boatPosition === 'left' ? '-25%' : '25%',
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
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-36 h-3 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full blur-sm"
                />
              )}
            </AnimatePresence>

            <motion.div className="animate-boat-rock">
              {/* Boat body - warm wood tone */}
              <div
                className={`relative bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl px-5 py-3 shadow-2xl shadow-black/40 min-w-[140px] transition-all duration-300 ${
                  boatHasPassengers
                    ? 'border border-amber-400/40 ring-1 ring-amber-400/20'
                    : 'border border-amber-700/60'
                }`}
                style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 12px, rgba(0,0,0,0.06) 12px, rgba(0,0,0,0.06) 14px)',
                }}
              >
                {/* Glow when ready to sail */}
                {boatHasPassengers && (
                  <div className="absolute inset-0 rounded-2xl bg-amber-400/10 animate-pulse pointer-events-none" />
                )}

                <div className="text-2xl text-center mb-1.5 drop-shadow-lg relative z-10">🚣</div>
                <div className="flex gap-1.5 justify-center min-h-[40px] items-center relative z-10">
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
                        className="w-10 h-10 rounded-xl bg-blue-500/20 backdrop-blur-sm flex items-center justify-center text-xl cursor-pointer hover:bg-blue-500/30 transition-colors border border-blue-400/20 shadow-md"
                        title={getEntity(id).name}
                      >
                        {getEntity(id).emoji}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                  {state.boatContents.length === 0 && (
                    <span className="text-amber-400/30 text-xs">비어있음</span>
                  )}
                </div>

                {/* Small wave ripples under boat */}
                <div className="absolute -bottom-1.5 left-2 right-2 h-1.5 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent rounded-full" />
              </div>
            </motion.div>
          </motion.div>

          {/* Sail button inside river */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleSail}
            disabled={isBoatMoving || !boatHasPassengers || state.isComplete}
            className={`
              relative z-10 mt-4 px-7 py-2.5 rounded-2xl font-bold text-white text-sm
              shadow-lg transition-all duration-200
              disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none
              ${boatHasPassengers && !state.isComplete
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 shadow-blue-500/30 animate-pulse-button'
                : 'bg-white/10 backdrop-blur-sm border border-white/10'
              }
            `}
          >
            출발!
          </motion.button>
        </div>

        {/* Right Bank - 35% */}
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
      <div className="md:hidden space-y-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-white/5">
        {/* Left Bank - top */}
        <div className="min-h-[28vh]">
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

        {/* River + Boat - middle */}
        <div className="relative min-h-[25vh] flex flex-col items-center justify-center py-4">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-800 via-blue-900 to-indigo-900">
            <WaveLayer speed={8} opacity={0.12} yOffset={10} color="rgba(147,197,253,0.2)" />
            <WaveLayer speed={6} opacity={0.08} yOffset={50} color="rgba(165,180,252,0.15)" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.03] animate-[water-shimmer_4s_ease-in-out_infinite]" />
          </div>

          <motion.div
            animate={{ y: state.boatPosition === 'left' ? -8 : 8 }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
            className="relative z-10 animate-boat-rock"
          >
            <div
              className={`relative bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl px-5 py-3 shadow-2xl shadow-black/40 ${
                boatHasPassengers
                  ? 'border border-amber-400/40'
                  : 'border border-amber-700/60'
              }`}
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 12px, rgba(0,0,0,0.06) 12px, rgba(0,0,0,0.06) 14px)',
              }}
            >
              {boatHasPassengers && (
                <div className="absolute inset-0 rounded-2xl bg-amber-400/10 animate-pulse pointer-events-none" />
              )}
              <div className="text-2xl text-center mb-1.5 relative z-10">🚣</div>
              <div className="flex gap-1.5 justify-center min-h-[36px] items-center relative z-10">
                <AnimatePresence mode="popLayout">
                  {state.boatContents.map((id) => (
                    <motion.button
                      key={id}
                      layout
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={() => handleClickEntity(id)}
                      className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center text-lg cursor-pointer hover:bg-blue-500/30 transition-colors border border-blue-400/20"
                      title={getEntity(id).name}
                    >
                      {getEntity(id).emoji}
                    </motion.button>
                  ))}
                </AnimatePresence>
                {state.boatContents.length === 0 && (
                  <span className="text-amber-400/30 text-xs">비어있음</span>
                )}
              </div>
              <div className="absolute -bottom-1.5 left-2 right-2 h-1.5 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent rounded-full" />
            </div>
          </motion.div>

          {/* Sail button inside river (mobile) */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleSail}
            disabled={isBoatMoving || !boatHasPassengers || state.isComplete}
            className={`
              relative z-10 mt-3 px-7 py-2.5 rounded-2xl font-bold text-white text-sm
              shadow-lg transition-all duration-200
              disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none
              ${boatHasPassengers && !state.isComplete
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/30 animate-pulse-button'
                : 'bg-white/10 backdrop-blur-sm border border-white/10'
              }
            `}
          >
            출발!
          </motion.button>
        </div>

        {/* Right Bank - bottom */}
        <div className="min-h-[28vh]">
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

      {/* Step counter pill */}
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
