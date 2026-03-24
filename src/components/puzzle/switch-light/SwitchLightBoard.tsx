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
  const [hoveredSwitch, setHoveredSwitch] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { playToggle, playError, playClick, playSuccess } = useAudio();

  useEffect(() => {
    if (state.isComplete) {
      playSuccess();
      onComplete(state.steps, puzzle.optimalSteps);
    }
  }, [state.isComplete, state.steps, puzzle.optimalSteps, onComplete, playSuccess]);

  // Auto-clear error
  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 2000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  // Which lights are connected to the hovered switch
  const highlightedLights = useMemo(() => {
    if (hoveredSwitch === null) return new Set<number>();
    const set = new Set<number>();
    for (let li = 0; li < puzzle.lightCount; li++) {
      if (puzzle.connections[hoveredSwitch][li]) {
        set.add(li);
      }
    }
    return set;
  }, [hoveredSwitch, puzzle.connections, puzzle.lightCount]);

  const handleSwitch = useCallback(
    (switchIdx: number) => {
      if (state.isComplete) return;
      const result = pressSwitch(state, switchIdx, puzzle);
      if ('error' in result) {
        playError();
        setErrorMsg(result.error);
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
      </div>

      {/* Goal state */}
      <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-4 backdrop-blur-md">
        <span className="font-semibold text-emerald-400 text-sm">목표 상태</span>
        <div className="flex gap-3 mt-2 flex-wrap">
          {puzzle.goalState.map((on, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all border-2 ${
                on
                  ? 'bg-gradient-to-b from-yellow-300 to-amber-400 text-amber-900 shadow-lg shadow-yellow-400/30 border-yellow-300/50'
                  : 'bg-slate-800/80 text-slate-600 border-slate-700'
              }`}>
                {i + 1}
              </div>
              <span className="text-[10px] text-slate-500">{on ? 'ON' : 'OFF'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lights - current state */}
      <div className="text-center">
        <div className="text-[11px] font-bold text-slate-500 uppercase mb-3 tracking-widest">현재 전등 상태</div>
        <div className="flex flex-wrap gap-4 justify-center">
          {state.lightStates.map((on, i) => {
            const isHighlighted = highlightedLights.has(i);
            const matchesGoal = on === puzzle.goalState[i];
            return (
              <motion.div
                key={i}
                animate={{
                  scale: on ? 1.05 : 1,
                  boxShadow: on
                    ? '0 0 30px rgba(250, 204, 21, 0.4), 0 0 60px rgba(250, 204, 21, 0.15)'
                    : '0 0 0 rgba(0,0,0,0)',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex flex-col items-center gap-1.5"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold border-2 transition-all relative ${
                  on
                    ? 'bg-gradient-to-b from-yellow-300 to-amber-400 border-yellow-300/50 text-amber-900'
                    : 'bg-slate-800/80 border-slate-700 text-slate-600'
                } ${isHighlighted ? 'ring-2 ring-blue-400/60 ring-offset-2 ring-offset-slate-900' : ''}`}>
                  {/* Glow effect for on state */}
                  {on && (
                    <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-pulse" />
                  )}
                  <span className="relative z-10">{i + 1}</span>
                </div>
                <div className={`text-[10px] font-bold ${matchesGoal ? 'text-emerald-400' : 'text-red-400'}`}>
                  {on ? 'ON' : 'OFF'}
                </div>
              </motion.div>
            );
          })}
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
                  <th key={i} className={`px-3 py-2 text-center text-xs font-semibold ${
                    highlightedLights.has(i) ? 'text-blue-400' : 'text-slate-500'
                  }`}>
                    전등{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: puzzle.switchCount }, (_, si) => (
                <tr key={si} className={`border-t border-white/5 ${
                  hoveredSwitch === si ? 'bg-blue-500/5' : ''
                }`}>
                  <td className="px-3 py-2 font-semibold text-xs text-slate-400">스위치{si + 1}</td>
                  {Array.from({ length: puzzle.lightCount }, (_, li) => (
                    <td key={li} className="px-3 py-2 text-center">
                      {puzzle.connections[si][li] ? (
                        <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold border ${
                          hoveredSwitch === si
                            ? 'bg-blue-500/30 text-blue-300 border-blue-500/30'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/20'
                        }`}>O</span>
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
        {/* Chain connections info */}
        {puzzle.variant === 'toggle-chain' && puzzle.chainConnections && (
          <div className="mt-3 space-y-1">
            {puzzle.chainConnections.map((chained, si) =>
              chained.length > 0 ? (
                <div key={si} className="text-xs text-amber-400/80">
                  ⚡ 스위치 {si + 1} → 연쇄: 스위치 {chained.map(c => c + 1).join(', ')}
                </div>
              ) : null
            )}
          </div>
        )}
        {/* Timer info */}
        {puzzle.variant === 'timer' && puzzle.timerLights && (
          <div className="mt-3 space-y-1">
            {puzzle.timerLights.map((t, i) => (
              <div key={i} className="text-xs text-amber-400/80">
                ⏱ 전등 {t.lightIndex + 1}: {t.interval}번째 동작마다 자동 전환
              </div>
            ))}
          </div>
        )}
        {/* Sequence info */}
        {puzzle.variant === 'sequence' && puzzle.requiredOrder && (
          <div className="mt-3 text-xs text-amber-400/80">
            🔢 순서: {puzzle.requiredOrder.map(i => i + 1).join(' → ')}
            {state.sequenceIndex > 0 && (
              <span className="ml-2 text-emerald-400">
                (현재 {state.sequenceIndex}/{puzzle.requiredOrder.length}번째)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Switches */}
      <div className="text-center">
        <div className="text-[11px] font-bold text-slate-500 uppercase mb-3 tracking-widest">스위치</div>
        <div className="flex flex-wrap gap-3 justify-center">
          {Array.from({ length: puzzle.switchCount }, (_, i) => {
            const wasPressed = state.switchesPressed.includes(i);
            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.88 }}
                whileHover={{ scale: 1.08, y: -3 }}
                onClick={() => handleSwitch(i)}
                onMouseEnter={() => setHoveredSwitch(i)}
                onMouseLeave={() => setHoveredSwitch(null)}
                disabled={state.isComplete}
                className={`w-[64px] h-[64px] rounded-2xl backdrop-blur-md border flex flex-col items-center justify-center cursor-pointer transition-all disabled:opacity-40 shadow-lg shadow-black/10 ${
                  wasPressed
                    ? 'bg-blue-500/20 border-blue-400/30 hover:border-blue-400/50'
                    : 'bg-white/10 border-white/10 hover:border-blue-400/40'
                } hover:shadow-lg hover:shadow-blue-500/10`}
              >
                <Power className={`w-6 h-6 ${wasPressed ? 'text-blue-300' : 'text-blue-400'}`} />
                <span className="text-xs font-bold mt-0.5 text-slate-300">{i + 1}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-400/20 rounded-2xl p-3 text-center text-sm backdrop-blur-md text-red-400 font-medium"
        >
          {errorMsg}
        </motion.div>
      )}

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
