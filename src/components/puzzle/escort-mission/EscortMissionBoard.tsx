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
      <div className="glass-card rounded-2xl p-4 text-sm">
        <p className="font-medium mb-2">{puzzle.story}</p>
        <ul className="space-y-1 text-[var(--text-secondary)]">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-primary">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Board */}
      <div className="flex flex-col md:flex-row items-stretch gap-0 min-h-[220px] rounded-2xl overflow-hidden shadow-lg shadow-black/5">
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
        <div className="flex-shrink-0 relative flex flex-col items-center justify-center md:w-52 h-44 md:h-auto">
          <div className="absolute inset-0 water-surface" />
          <motion.div
            animate={{ x: state.boatPosition === 'left' ? -15 : 15 }}
            transition={{ type: 'spring', stiffness: 100, damping: 18 }}
            className="relative z-10 animate-boat-rock"
          >
            <div
              className="bg-gradient-to-b from-amber-700 to-amber-900 rounded-xl p-4 border-2 border-amber-600/60 shadow-2xl text-white text-center min-w-[140px]"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(0,0,0,0.06) 14px, rgba(0,0,0,0.06) 16px)',
              }}
            >
              <div className="text-xl mb-3">🚣 보트</div>
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
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold disabled:opacity-40 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25 transition-all"
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

      {/* Steps */}
      <div className="text-center text-sm text-[var(--text-secondary)]">
        이동: <span className="font-bold text-[var(--text)]">{state.steps}</span>
        {' / 최적: '}
        <span className="font-bold text-primary">{puzzle.optimalSteps}</span>
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
      <span className="text-lg">{emoji}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-8 text-center font-bold text-lg">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors"
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
    <div className={`flex-1 p-5 flex flex-col items-center justify-center gap-3 min-h-[100px] transition-all duration-300 ${
      failed && active ? 'animate-shake' : ''
    } ${active
      ? 'grass-bank shadow-inner'
      : 'bg-gradient-to-b from-green-900/30 to-green-800/20 dark:from-green-950/30'
    }`}>
      <span className="text-xs font-bold text-white/70 uppercase tracking-wider">{label}</span>
      <div className="flex gap-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex items-center justify-center text-3xl shadow-lg shadow-black/5 border border-white/30 dark:border-white/10 mb-1">
            {groupA.emoji}
          </div>
          <motion.div
            key={countA}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-xl font-bold text-white drop-shadow"
          >
            {countA}
          </motion.div>
          <div className="text-xs text-white/60">{groupA.name}</div>
        </div>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex items-center justify-center text-3xl shadow-lg shadow-black/5 border border-white/30 dark:border-white/10 mb-1">
            {groupB.emoji}
          </div>
          <motion.div
            key={countB}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-xl font-bold text-white drop-shadow"
          >
            {countB}
          </motion.div>
          <div className="text-xs text-white/60">{groupB.name}</div>
        </div>
      </div>
    </div>
  );
}
