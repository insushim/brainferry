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

/* ── SVG sub-components ─────────────────────────────────────── */

function SteampunkBulb({ on, index, highlighted, matchesGoal }: {
  on: boolean; index: number; highlighted: boolean; matchesGoal: boolean;
}) {
  const cx = 0;
  const cy = 0;
  return (
    <motion.g
      animate={{ scale: on ? 1.05 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ originX: '0px', originY: '0px' }}
    >
      {/* Glow halo for ON state */}
      {on && (
        <motion.circle
          cx={cx} cy={cy} r="38"
          fill="url(#bulbOnGlow)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Highlight ring when hovered switch connects */}
      {highlighted && (
        <circle cx={cx} cy={cy} r="36" fill="none" stroke="#60a5fa" strokeWidth="2.5"
          strokeDasharray="4 3" opacity="0.7" />
      )}

      {/* Brass mounting ring */}
      <circle cx={cx} cy={cy - 18} r="10" fill="url(#brass)" />
      <rect x={cx - 3} y={cy - 12} width="6" height="8" fill="url(#brass)" rx="1" />

      {/* Bulb glass */}
      <ellipse cx={cx} cy={cy + 4} rx="22" ry="26"
        fill={on ? 'url(#bulbOnFill)' : '#1e293b'}
        stroke={on ? '#fbbf24' : '#334155'}
        strokeWidth="1.5"
        filter={on ? 'url(#lightGlow)' : undefined}
      />

      {/* Filament */}
      <path
        d={`M${cx - 6},${cy + 10} Q${cx - 3},${cy - 2} ${cx},${cy + 8} Q${cx + 3},${cy - 2} ${cx + 6},${cy + 10}`}
        fill="none"
        stroke={on ? '#fef3c7' : '#475569'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Filament support wires */}
      <line x1={cx - 6} y1={cy + 10} x2={cx - 4} y2={cy + 20} stroke={on ? '#fbbf24' : '#475569'} strokeWidth="0.8" />
      <line x1={cx + 6} y1={cy + 10} x2={cx + 4} y2={cy + 20} stroke={on ? '#fbbf24' : '#475569'} strokeWidth="0.8" />

      {/* Glass reflection */}
      <ellipse cx={cx - 8} cy={cy - 4} rx="4" ry="8"
        fill="white" opacity={on ? 0.15 : 0.06} transform={`rotate(-20, ${cx - 8}, ${cy - 4})`} />

      {/* Label */}
      <text x={cx} y={cy + 38} textAnchor="middle" fontSize="11" fontWeight="bold"
        fill={matchesGoal ? '#34d399' : '#f87171'}
      >
        {index + 1}
      </text>
      <text x={cx} y={cy + 49} textAnchor="middle" fontSize="8"
        fill={matchesGoal ? '#34d399' : '#f87171'} opacity="0.7"
      >
        {on ? 'ON' : 'OFF'}
      </text>
    </motion.g>
  );
}

function SteampunkSwitch({ index, wasPressed, disabled, onPress, onHoverStart, onHoverEnd }: {
  index: number; wasPressed: boolean; disabled: boolean;
  onPress: () => void; onHoverStart: () => void; onHoverEnd: () => void;
}) {
  const [isDown, setIsDown] = useState(false);
  const leverAngle = isDown ? 25 : -25;

  return (
    <motion.g
      whileHover={{ scale: 1.08 }}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      onClick={() => {
        if (disabled) return;
        setIsDown(d => !d);
        onPress();
      }}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}
    >
      {/* Switch base plate */}
      <rect x={-30} y={-35} width={60} height={70} rx="6"
        fill="url(#metalPanel)" stroke="url(#brass)" strokeWidth="2" />

      {/* Decorative rivets */}
      <circle cx={-20} cy={-25} r="2.5" fill="#4b5563" />
      <circle cx={-20} cy={-25} r="1.2" fill="#6b7280" />
      <circle cx={20} cy={-25} r="2.5" fill="#4b5563" />
      <circle cx={20} cy={-25} r="1.2" fill="#6b7280" />
      <circle cx={-20} cy={25} r="2.5" fill="#4b5563" />
      <circle cx={-20} cy={25} r="1.2" fill="#6b7280" />
      <circle cx={20} cy={25} r="2.5" fill="#4b5563" />
      <circle cx={20} cy={25} r="1.2" fill="#6b7280" />

      {/* Lever slot */}
      <rect x={-4} y={-20} width={8} height={40} rx="4"
        fill="#111827" stroke="#374151" strokeWidth="1" />

      {/* Lever arm */}
      <motion.g
        animate={{ rotate: leverAngle }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        style={{ originX: '0px', originY: '0px' }}
      >
        <rect x={-5} y={-22} width={10} height={22} rx="3" fill="url(#brass)" />
        {/* Lever knob */}
        <circle cx={0} cy={-22} r="7" fill="url(#brassKnob)" stroke="#92400e" strokeWidth="1" />
        <circle cx={-2} cy={-24} r="2" fill="white" opacity="0.15" />
      </motion.g>

      {/* Spark effect on press */}
      {wasPressed && (
        <motion.g
          initial={{ opacity: 1, scale: 0.5 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.4 }}
        >
          <line x1={-12} y1={-30} x2={-18} y2={-38} stroke="#fbbf24" strokeWidth="1.5" />
          <line x1={12} y1={-30} x2={18} y2={-38} stroke="#fbbf24" strokeWidth="1.5" />
          <line x1={0} y1={-33} x2={0} y2={-42} stroke="#fbbf24" strokeWidth="1.5" />
        </motion.g>
      )}

      {/* Label */}
      <text x={0} y={50} textAnchor="middle" fontSize="11" fontWeight="bold"
        fill={wasPressed ? '#93c5fd' : '#94a3b8'}
      >
        {index + 1}
      </text>
    </motion.g>
  );
}

/* ── Main component ─────────────────────────────────────────── */

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

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 2000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

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

  /* ── Layout math ── */
  const lightSpacing = Math.min(100, 700 / puzzle.lightCount);
  const switchSpacing = Math.min(100, 700 / puzzle.switchCount);
  const lightsStartX = (800 - (puzzle.lightCount - 1) * lightSpacing) / 2;
  const switchesStartX = (800 - (puzzle.switchCount - 1) * switchSpacing) / 2;
  const svgHeight = 340;

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

      {/* ── Steampunk SVG board ── */}
      <svg
        viewBox={`0 0 800 ${svgHeight}`}
        className="w-full rounded-2xl overflow-hidden"
        style={{ maxHeight: '50vh' }}
      >
        <defs>
          {/* Metal panel texture */}
          <linearGradient id="metalPanel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="50%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          {/* Brass / copper */}
          <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          <radialGradient id="brassKnob" cx="0.35" cy="0.35">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="60%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </radialGradient>

          {/* Bulb glow (on) */}
          <radialGradient id="bulbOnGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="bulbOnFill" cx="0.45" cy="0.4">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>

          {/* Glow filter */}
          <filter id="lightGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Rivet pattern */}
          <pattern id="rivets" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="2" fill="#4b5563" />
            <circle cx="5" cy="5" r="1" fill="#6b7280" />
          </pattern>
        </defs>

        {/* Metal wall background */}
        <rect width="800" height={svgHeight} fill="url(#metalPanel)" />
        <rect width="800" height={svgHeight} fill="url(#rivets)" opacity="0.3" />

        {/* Top brass pipe */}
        <line x1="0" y1="20" x2="800" y2="20" stroke="url(#brass)" strokeWidth="8" />
        <circle cx="50" cy="20" r="8" fill="url(#brass)" />
        <circle cx="400" cy="20" r="8" fill="url(#brass)" />
        <circle cx="750" cy="20" r="8" fill="url(#brass)" />

        {/* Bottom brass pipe */}
        <line x1="0" y1={svgHeight - 20} x2="800" y2={svgHeight - 20} stroke="url(#brass)" strokeWidth="6" />
        <circle cx="100" cy={svgHeight - 20} r="6" fill="url(#brass)" />
        <circle cx="700" cy={svgHeight - 20} r="6" fill="url(#brass)" />

        {/* Steam wisps */}
        <motion.path
          d="M650,300 Q660,275 655,250 Q665,225 658,200"
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4"
          animate={{ opacity: [0.02, 0.06, 0.02] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.path
          d="M120,310 Q130,285 125,260 Q135,235 128,210"
          fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3"
          animate={{ opacity: [0.03, 0.07, 0.03] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        />

        {/* Connection wires from switches to lights */}
        {Array.from({ length: puzzle.switchCount }, (_, si) =>
          Array.from({ length: puzzle.lightCount }, (_, li) => {
            if (!puzzle.connections[si][li]) return null;
            const sx = switchesStartX + si * switchSpacing;
            const sy = 245;
            const lx = lightsStartX + li * lightSpacing;
            const ly = 110;
            const midY = (sy + ly) / 2;
            const isActive = hoveredSwitch === si;
            return (
              <motion.path
                key={`wire-${si}-${li}`}
                d={`M${sx},${sy} C${sx},${midY} ${lx},${midY} ${lx},${ly}`}
                fill="none"
                stroke={isActive ? '#60a5fa' : '#374151'}
                strokeWidth={isActive ? 2 : 1}
                strokeDasharray={isActive ? undefined : '4 4'}
                animate={{ opacity: isActive ? 0.9 : 0.3 }}
                transition={{ duration: 0.2 }}
              />
            );
          })
        )}

        {/* Light bulbs row */}
        {state.lightStates.map((on, i) => (
          <g key={`bulb-${i}`} transform={`translate(${lightsStartX + i * lightSpacing}, 75)`}>
            <SteampunkBulb
              on={on}
              index={i}
              highlighted={highlightedLights.has(i)}
              matchesGoal={on === puzzle.goalState[i]}
            />
          </g>
        ))}

        {/* Switch levers row */}
        {Array.from({ length: puzzle.switchCount }, (_, i) => (
          <g key={`switch-${i}`} transform={`translate(${switchesStartX + i * switchSpacing}, 265)`}>
            <SteampunkSwitch
              index={i}
              wasPressed={state.switchesPressed.includes(i)}
              disabled={state.isComplete}
              onPress={() => handleSwitch(i)}
              onHoverStart={() => setHoveredSwitch(i)}
              onHoverEnd={() => setHoveredSwitch(null)}
            />
          </g>
        ))}
      </svg>

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
