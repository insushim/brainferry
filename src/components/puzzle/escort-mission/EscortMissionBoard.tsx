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
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-sm">
        <p className="font-medium mb-2">{puzzle.story}</p>
        <ul className="space-y-1 text-[var(--text-secondary)]">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-primary">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col md:flex-row items-stretch gap-4 min-h-[200px]">
        {/* Left Bank */}
        <BankDisplay
          label="이쪽"
          groupA={puzzle.groupA}
          groupB={puzzle.groupB}
          countA={state.leftA}
          countB={state.leftB}
          active={state.boatPosition === 'left'}
          failed={state.isFailed}
        />

        {/* River + Boat Selection */}
        <div className="flex-shrink-0 relative flex flex-col items-center justify-center md:w-44 h-40 md:h-auto gap-2">
          <div className="absolute inset-0 water-surface rounded-xl" />
          <motion.div
            animate={{ x: state.boatPosition === 'left' ? -15 : 15 }}
            className="relative z-10 bg-amber-800/90 rounded-xl p-3 border-2 border-amber-700 text-white text-center min-w-[120px]"
          >
            <div className="text-lg mb-2">🚣 보트</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>{puzzle.groupA.emoji}</span>
                <select
                  value={selectedA}
                  onChange={(e) => {
                    setSelectedA(Number(e.target.value));
                    setSelectedB(0);
                  }}
                  className="bg-amber-700 rounded px-2 py-0.5 text-white"
                >
                  {Array.from({ length: maxA + 1 }, (_, i) => (
                    <option key={i} value={i}>{i}명</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>{puzzle.groupB.emoji}</span>
                <select
                  value={selectedB}
                  onChange={(e) => setSelectedB(Number(e.target.value))}
                  className="bg-amber-700 rounded px-2 py-0.5 text-white"
                >
                  {Array.from({ length: maxB + 1 }, (_, i) => (
                    <option key={i} value={i}>{i}명</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Bank */}
        <BankDisplay
          label="저쪽"
          groupA={puzzle.groupA}
          groupB={puzzle.groupB}
          countA={state.rightA}
          countB={state.rightB}
          active={state.boatPosition === 'right'}
          failed={state.isFailed}
        />
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={handleSail}
          disabled={isMoving || (selectedA + selectedB === 0) || state.isComplete}
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

function BankDisplay({
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
    <div className={`flex-1 rounded-xl p-4 flex flex-col items-center justify-center gap-2 min-h-[80px] ${
      failed && active ? 'animate-shake animate-red-flash' : ''
    } ${active ? 'bg-green-500/10 border-2 border-green-500/30' : 'bg-[var(--bg-secondary)] border-2 border-transparent'}`}>
      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">{label}</span>
      <div className="flex gap-4">
        <div className="text-center">
          <div className="text-2xl">{groupA.emoji}</div>
          <div className="text-lg font-bold">{countA}</div>
          <div className="text-xs text-[var(--text-secondary)]">{groupA.name}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl">{groupB.emoji}</div>
          <div className="text-lg font-bold">{countB}</div>
          <div className="text-xs text-[var(--text-secondary)]">{groupB.name}</div>
        </div>
      </div>
    </div>
  );
}
