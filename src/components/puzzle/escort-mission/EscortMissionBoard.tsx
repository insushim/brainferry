'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateEscort } from '@/engines/escort-mission/generator';
import {
  createInitialState,
  applyMove,
  undo,
  type EscortState,
} from '@/engines/escort-mission/engine';
import { useAudio } from '@/hooks/useAudio';
import { Minus, Plus } from 'lucide-react';

interface EscortMissionBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

/* ── Animated wave layer for river ── */
function WaveLayer({ speed, opacity, yOffset, color }: { speed: number; opacity: number; yOffset: number; color: string }) {
  return (
    <div className="absolute left-0 right-0 overflow-hidden pointer-events-none" style={{ top: `${yOffset}%`, height: '40%', opacity }}>
      <motion.svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-[200%] h-full" animate={{ x: [0, '-50%'] }} transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}>
        <path d="M0,60 C150,90 350,30 500,60 C650,90 850,30 1000,60 C1050,75 1150,45 1200,60 L1200,120 L0,120Z" fill={color} />
      </motion.svg>
    </div>
  );
}

export function EscortMissionBoard({ difficulty, seed, onComplete, onFail }: EscortMissionBoardProps) {
  const puzzle = useMemo(() => generateEscort(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<EscortState>(() => createInitialState(puzzle));
  const [selectedA, setSelectedA] = useState(0);
  const [selectedB, setSelectedB] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const { playSplash, playError, playClick, playSuccess } = useAudio();

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

  const handleSail = useCallback(() => {
    if (isMoving || state.isComplete) return;
    const direction = state.boatPosition === 'left' ? 'left-to-right' as const : 'right-to-left' as const;
    const result = applyMove(state, { groupA: selectedA, groupB: selectedB, direction }, puzzle);
    if ('error' in result) {
      playError();
      onFail?.(result.error);
      return;
    }
    playSplash();
    setIsMoving(true);
    setTimeout(() => {
      setState(result);
      setSelectedA(0);
      setSelectedB(0);
      setIsMoving(false);
    }, 600);
  }, [isMoving, state, selectedA, selectedB, puzzle, playSplash, playError, onFail]);

  const handleUndo = useCallback(() => {
    if (state.moveHistory.length === 0) return;
    playClick();
    setState(undo(state, puzzle));
  }, [state, puzzle, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
    setSelectedA(0);
    setSelectedB(0);
  }, [puzzle, playClick]);

  const currentA = state.boatPosition === 'left' ? state.leftA : state.rightA;
  const currentB = state.boatPosition === 'left' ? state.leftB : state.rightB;
  const maxA = Math.min(currentA, puzzle.boatCapacity);
  const maxB = Math.min(currentB, puzzle.boatCapacity - selectedA);

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

      {/* Board */}
      <div className="flex flex-col md:flex-row items-stretch gap-0 min-h-[260px] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-white/5">
        {/* Left Bank */}
        <GroupBank
          label="이쪽"
          groupA={puzzle.groupA}
          groupB={puzzle.groupB}
          countA={state.leftA}
          countB={state.leftB}
          active={state.boatPosition === 'left'}
          failed={state.isFailed}
        />

        {/* River + Boat */}
        <div className="flex-shrink-0 relative flex flex-col items-center justify-center md:w-56 h-48 md:h-auto">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-800 via-blue-900 to-indigo-900">
            <WaveLayer speed={8} opacity={0.12} yOffset={10} color="rgba(147,197,253,0.2)" />
            <WaveLayer speed={6} opacity={0.08} yOffset={45} color="rgba(165,180,252,0.15)" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.03] animate-[water-shimmer_4s_ease-in-out_infinite]" />
          </div>
          <motion.div
            animate={{ x: state.boatPosition === 'left' ? -15 : 15 }}
            transition={{ type: 'spring', stiffness: 100, damping: 18 }}
            className="relative z-10 animate-boat-rock"
          >
            <div
              className="bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl p-4 border border-amber-600/40 shadow-2xl shadow-black/40 text-white text-center min-w-[150px]"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 12px, rgba(0,0,0,0.06) 12px, rgba(0,0,0,0.06) 14px)',
              }}
            >
              <div className="text-xl mb-3 drop-shadow-lg">🚣 보트</div>
              <div className="space-y-3">
                <NumberPicker
                  emoji={puzzle.groupA.emoji}
                  label={puzzle.groupA.name}
                  value={selectedA}
                  max={maxA}
                  onChange={(v) => { setSelectedA(v); setSelectedB(0); }}
                />
                <NumberPicker
                  emoji={puzzle.groupB.emoji}
                  label={puzzle.groupB.name}
                  value={selectedB}
                  max={maxB}
                  onChange={setSelectedB}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Bank */}
        <GroupBank
          label="저쪽"
          groupA={puzzle.groupA}
          groupB={puzzle.groupB}
          countA={state.rightA}
          countB={state.rightB}
          active={state.boatPosition === 'right'}
          failed={state.isFailed}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSail}
          disabled={isMoving || (selectedA + selectedB === 0) || state.isComplete}
          className={`px-8 py-3 rounded-2xl text-white font-bold disabled:opacity-30 shadow-lg transition-all ${
            (selectedA + selectedB > 0) && !state.isComplete
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 shadow-blue-500/25 animate-pulse-button'
              : 'bg-white/10 backdrop-blur-sm border border-white/10'
          }`}
        >
          출발! 🚣
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

/* Number picker with +/- buttons */
function NumberPicker({
  emoji,
  label,
  value,
  max,
  onChange,
}: {
  emoji: string;
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-lg drop-shadow">{emoji}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 flex items-center justify-center transition-colors border border-white/5"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-8 text-center font-bold text-lg tabular-nums">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 flex items-center justify-center transition-colors border border-white/5"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function GroupBank({
  label,
  groupA,
  groupB,
  countA,
  countB,
  active,
  failed,
}: {
  label: string;
  groupA: { name: string; emoji: string };
  groupB: { name: string; emoji: string };
  countA: number;
  countB: number;
  active: boolean;
  failed: boolean;
}) {
  return (
    <div className={`flex-1 p-5 flex flex-col items-center justify-center gap-3 min-h-[100px] transition-all duration-300 relative overflow-hidden ${
      failed && active ? 'animate-shake' : ''
    } ${active
      ? 'bg-gradient-to-b from-emerald-900/80 to-emerald-950/90'
      : 'bg-gradient-to-b from-emerald-950/60 to-emerald-950/80'
    }`}>
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
      }} />

      <span className="text-[11px] font-bold text-emerald-300/70 uppercase tracking-widest z-10">{label}</span>
      <div className="flex gap-6 z-10">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl shadow-lg shadow-black/10 border border-white/10 mb-1">
            {groupA.emoji}
          </div>
          <motion.div
            key={countA}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-xl font-bold text-slate-100 drop-shadow tabular-nums"
          >
            {countA}
          </motion.div>
          <div className="text-xs text-slate-400">{groupA.name}</div>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl shadow-lg shadow-black/10 border border-white/10 mb-1">
            {groupB.emoji}
          </div>
          <motion.div
            key={countB}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-xl font-bold text-slate-100 drop-shadow tabular-nums"
          >
            {countB}
          </motion.div>
          <div className="text-xs text-slate-400">{groupB.name}</div>
        </div>
      </div>
    </div>
  );
}
