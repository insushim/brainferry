'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateSwitchLight } from '@/engines/switch-light/generator';
import {
  createInitialState,
  pressSwitch,
  undo,
  type SwitchLightState,
} from '@/engines/switch-light/engine';
import { useAudio } from '@/hooks/useAudio';

interface SwitchLightBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

export function SwitchLightBoard({ difficulty, seed, onComplete, onFail }: SwitchLightBoardProps) {
  const puzzle = useMemo(() => generateSwitchLight(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<SwitchLightState>(() => createInitialState(puzzle));
  const { playToggle, playError, playClick, playSuccess } = useAudio();

  useEffect(() => {
    if (state.isComplete) {
      playSuccess();
      onComplete(state.steps, puzzle.optimalSteps);
    }
  }, [state.isComplete, state.steps, puzzle.optimalSteps, onComplete, playSuccess]);

  const handleSwitch = useCallback(
    (switchIdx: number) => {
      if (state.isComplete) return;
      const result = pressSwitch(state, switchIdx, puzzle);
      if ('error' in result) {
        playError();
        onFail?.(result.error);
        return;
      }
      playToggle();
      setState(result);
    },
    [state, puzzle, playToggle, playError, onFail],
  );

  const handleUndo = useCallback(() => {
    if (state.moveHistory.length === 0) return;
    playClick();
    setState(undo(state, puzzle));
  }, [state, puzzle, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
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

      {/* Goal display */}
      <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-sm">
        <span className="font-semibold text-success">목표: </span>
        <span className="flex gap-1 mt-1">
          {puzzle.goalState.map((on, i) => (
            <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${
              on ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-700 text-gray-400'
            }`}>
              {i + 1}
            </span>
          ))}
        </span>
      </div>

      {/* Lights */}
      <div className="text-center">
        <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">전등</div>
        <div className="flex flex-wrap gap-3 justify-center">
          {state.lightStates.map((on, i) => (
            <motion.div
              key={i}
              animate={{ scale: on ? 1.1 : 1 }}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl border-2 transition-all ${
                on
                  ? 'bg-yellow-400 border-yellow-500 shadow-lg shadow-yellow-400/50'
                  : 'bg-gray-800 border-gray-600'
              }`}
            >
              {on ? '💡' : '⚫'}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Connection matrix */}
      <div className="bg-[var(--bg-secondary)] rounded-xl p-3 text-xs">
        <div className="font-bold text-[var(--text-secondary)] mb-2">연결 관계:</div>
        <div className="overflow-x-auto">
          <table className="mx-auto">
            <thead>
              <tr>
                <th className="px-2 py-1" />
                {Array.from({ length: puzzle.lightCount }, (_, i) => (
                  <th key={i} className="px-2 py-1 text-center">전등{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: puzzle.switchCount }, (_, si) => (
                <tr key={si}>
                  <td className="px-2 py-1 font-medium">스위치{si + 1}</td>
                  {Array.from({ length: puzzle.lightCount }, (_, li) => (
                    <td key={li} className="px-2 py-1 text-center">
                      {puzzle.connections[si][li] ? (
                        <span className="text-primary font-bold">O</span>
                      ) : (
                        <span className="text-[var(--border)]">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Switches */}
      <div className="text-center">
        <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">스위치</div>
        <div className="flex flex-wrap gap-3 justify-center">
          {Array.from({ length: puzzle.switchCount }, (_, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => handleSwitch(i)}
              disabled={state.isComplete}
              className="w-16 h-16 rounded-xl bg-[var(--card)] border-2 border-[var(--border)] flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:shadow-lg transition-all disabled:opacity-50"
            >
              <span className="text-2xl">🔘</span>
              <span className="text-xs font-bold">{i + 1}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
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
        스위치 조작: <span className="font-bold text-[var(--text)]">{state.steps}</span>
        {' / 최적: '}
        <span className="font-bold text-primary">{puzzle.optimalSteps}</span>
      </div>
    </div>
  );
}
