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
import { Power } from 'lucide-react';

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
    <div className="space-y-5">
      {/* Story */}
      <div className="glass-card rounded-2xl p-4 text-sm">
        <p className="font-medium mb-2">{puzzle.story}</p>
        <ul className="space-y-1 text-[var(--text-secondary)]">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-primary">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Goal */}
      <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-2xl p-4 backdrop-blur-sm">
        <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">목표: </span>
        <div className="flex gap-2 mt-2">
          {puzzle.goalState.map((on, i) => (
            <span key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              on
                ? 'bg-gradient-to-b from-yellow-300 to-amber-400 text-amber-900 shadow-lg shadow-yellow-400/40'
                : 'bg-gray-700 text-gray-500 border border-gray-600'
            }`}>
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      {/* Lights */}
      <div className="text-center">
        <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3 tracking-wider">전등</div>
        <div className="flex flex-wrap gap-4 justify-center">
          {state.lightStates.map((on, i) => (
            <motion.div
              key={i}
              animate={{
                scale: on ? 1.05 : 1,
                boxShadow: on
                  ? '0 0 30px rgba(250, 204, 21, 0.5), 0 0 60px rgba(250, 204, 21, 0.2)'
                  : '0 0 0 rgba(0,0,0,0)',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-3 transition-all ${
                on
                  ? 'bg-gradient-to-b from-yellow-300 to-amber-400 border-yellow-400'
                  : 'bg-gray-800/80 border-gray-600 dark:bg-gray-900/80'
              }`}
            >
              {on ? '💡' : '⚫'}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Connection matrix */}
      <div className="glass-card rounded-2xl p-4">
        <div className="font-bold text-[var(--text-secondary)] text-xs mb-3 uppercase tracking-wider">연결 관계</div>
        <div className="overflow-x-auto">
          <table className="mx-auto">
            <thead>
              <tr>
                <th className="px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]" />
                {Array.from({ length: puzzle.lightCount }, (_, i) => (
                  <th key={i} className="px-3 py-2 text-center text-xs font-semibold text-[var(--text-secondary)]">
                    전등{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: puzzle.switchCount }, (_, si) => (
                <tr key={si} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-semibold text-xs">스위치{si + 1}</td>
                  {Array.from({ length: puzzle.lightCount }, (_, li) => (
                    <td key={li} className="px-3 py-2 text-center">
                      {puzzle.connections[si][li] ? (
                        <span className="inline-flex w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 items-center justify-center text-xs font-bold">O</span>
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
        <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3 tracking-wider">스위치</div>
        <div className="flex flex-wrap gap-3 justify-center">
          {Array.from({ length: puzzle.switchCount }, (_, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.08, y: -3 }}
              onClick={() => handleSwitch(i)}
              disabled={state.isComplete}
              className="w-[60px] h-[60px] rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-white/30 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 transition-all disabled:opacity-50 shadow-md shadow-black/5"
            >
              <Power className="w-6 h-6 text-blue-500" />
              <span className="text-xs font-bold mt-0.5">{i + 1}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
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
        스위치 조작: <span className="font-bold text-[var(--text)]">{state.steps}</span>
        {' / 최적: '}
        <span className="font-bold text-primary">{puzzle.optimalSteps}</span>
      </div>
    </div>
  );
}
