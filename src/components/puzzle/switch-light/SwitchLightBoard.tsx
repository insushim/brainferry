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
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-sm">
        <p className="font-medium mb-2 text-slate-100">{puzzle.story}</p>
        <ul className="space-y-1 text-slate-400">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-blue-400">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Goal */}
      <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-4 backdrop-blur-md">
        <span className="font-semibold text-emerald-400 text-sm">목표: </span>
        <div className="flex gap-2 mt-2">
          {puzzle.goalState.map((on, i) => (
            <span key={i} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all border ${
              on
                ? 'bg-gradient-to-b from-yellow-300 to-amber-400 text-amber-900 shadow-lg shadow-yellow-400/30 border-yellow-300/50'
                : 'bg-slate-800/80 text-slate-600 border-slate-700'
            }`}>
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      {/* Lights */}
      <div className="text-center">
        <div className="text-[11px] font-bold text-slate-500 uppercase mb-3 tracking-widest">전등</div>
        <div className="flex flex-wrap gap-4 justify-center">
          {state.lightStates.map((on, i) => (
            <motion.div
              key={i}
              animate={{
                scale: on ? 1.05 : 1,
                boxShadow: on
                  ? '0 0 30px rgba(250, 204, 21, 0.4), 0 0 60px rgba(250, 204, 21, 0.15)'
                  : '0 0 0 rgba(0,0,0,0)',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 transition-all ${
                on
                  ? 'bg-gradient-to-b from-yellow-300 to-amber-400 border-yellow-300/50'
                  : 'bg-slate-800/80 border-slate-700'
              }`}
            >
              {on ? '💡' : '⚫'}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Connection matrix */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
        <div className="font-bold text-slate-500 text-[11px] mb-3 uppercase tracking-widest">연결 관계</div>
        <div className="overflow-x-auto">
          <table className="mx-auto">
            <thead>
              <tr>
                <th className="px-3 py-2 text-xs font-semibold text-slate-500" />
                {Array.from({ length: puzzle.lightCount }, (_, i) => (
                  <th key={i} className="px-3 py-2 text-center text-xs font-semibold text-slate-500">
                    전등{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: puzzle.switchCount }, (_, si) => (
                <tr key={si} className="border-t border-white/5">
                  <td className="px-3 py-2 font-semibold text-xs text-slate-400">스위치{si + 1}</td>
                  {Array.from({ length: puzzle.lightCount }, (_, li) => (
                    <td key={li} className="px-3 py-2 text-center">
                      {puzzle.connections[si][li] ? (
                        <span className="inline-flex w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 items-center justify-center text-xs font-bold border border-blue-500/20">O</span>
                      ) : (
                        <span className="text-slate-700">-</span>
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
        <div className="text-[11px] font-bold text-slate-500 uppercase mb-3 tracking-widest">스위치</div>
        <div className="flex flex-wrap gap-3 justify-center">
          {Array.from({ length: puzzle.switchCount }, (_, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.08, y: -3 }}
              onClick={() => handleSwitch(i)}
              disabled={state.isComplete}
              className="w-[64px] h-[64px] rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/10 transition-all disabled:opacity-40 shadow-lg shadow-black/10"
            >
              <Power className="w-6 h-6 text-blue-400" />
              <span className="text-xs font-bold mt-0.5 text-slate-300">{i + 1}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
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
          <span className="text-slate-400">스위치 조작</span>
          <span className="font-bold text-slate-100 tabular-nums">{state.steps}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">최적</span>
          <span className="font-bold text-blue-400 tabular-nums">{puzzle.optimalSteps}</span>
        </div>
      </div>
    </div>
  );
}
