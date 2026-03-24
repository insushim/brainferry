'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateBodyguard } from '@/engines/bodyguard/generator';
import {
  createInitialState,
  applyMove,
  undo,
  type BodyguardState,
} from '@/engines/bodyguard/engine';
import { useAudio } from '@/hooks/useAudio';
import { Shield, ArrowRight } from 'lucide-react';

interface BodyguardBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

/* ── Animated wave layer ── */
function WaveLayer({ speed, opacity, yOffset, color }: { speed: number; opacity: number; yOffset: number; color: string }) {
  return (
    <div className="absolute left-0 right-0 overflow-hidden pointer-events-none" style={{ top: `${yOffset}%`, height: '40%', opacity }}>
      <motion.svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-[200%] h-full" animate={{ x: [0, '-50%'] }} transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}>
        <path d="M0,60 C150,90 350,30 500,60 C650,90 850,30 1000,60 C1050,75 1150,45 1200,60 L1200,120 L0,120Z" fill={color} />
      </motion.svg>
    </div>
  );
}

export function BodyguardBoard({ difficulty, seed, onComplete, onFail }: BodyguardBoardProps) {
  const puzzle = useMemo(() => generateBodyguard(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<BodyguardState>(() => createInitialState(puzzle));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isMoving, setIsMoving] = useState(false);
  const { playSplash, playError, playClick, playSuccess } = useAudio();

  const entityMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; emoji: string; role: 'protector' | 'charge'; pairIdx: number }>();
    for (let i = 0; i < puzzle.pairs.length; i++) {
      const pair = puzzle.pairs[i];
      map.set(pair.protector.id, { ...pair.protector, role: 'protector', pairIdx: i });
      map.set(pair.charge.id, { ...pair.charge, role: 'charge', pairIdx: i });
    }
    return map;
  }, [puzzle.pairs]);

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

  const currentBank = state.boatPosition === 'left' ? state.leftSide : state.rightSide;

  const toggleSelect = useCallback((id: string) => {
    if (state.isComplete || isMoving) return;
    if (!currentBank.includes(id)) return;
    playClick();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= puzzle.boatCapacity) return prev;
        next.add(id);
      }
      return next;
    });
  }, [currentBank, puzzle.boatCapacity, playClick, state.isComplete, isMoving]);

  const handleSail = useCallback(() => {
    if (isMoving || selected.size === 0 || state.isComplete) return;
    const direction = state.boatPosition === 'left' ? 'left-to-right' as const : 'right-to-left' as const;
    const result = applyMove(state, { passengers: [...selected], direction }, puzzle);
    if ('error' in result) {
      playError();
      onFail?.(result.error);
      return;
    }
    playSplash();
    setIsMoving(true);
    setTimeout(() => {
      setState(result);
      setSelected(new Set());
      setIsMoving(false);
    }, 600);
  }, [isMoving, selected, state, puzzle, playSplash, playError, onFail]);

  const handleUndo = useCallback(() => {
    if (state.moveHistory.length === 0) return;
    playClick();
    setState(undo(state));
    setSelected(new Set());
  }, [state, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
    setSelected(new Set());
  }, [puzzle, playClick]);

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

      {/* Protection pairs */}
      <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">보호 관계</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {puzzle.pairs.map((pair, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-sm bg-white/10 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10 shadow-sm">
              <span className="text-lg">{pair.protector.emoji}</span>
              <span className="font-medium text-slate-200">{pair.protector.name}</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
              <span className="text-lg">{pair.charge.emoji}</span>
              <span className="font-medium text-slate-200">{pair.charge.name}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="flex flex-col md:flex-row items-stretch gap-0 min-h-[260px] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-white/5">
        <EntityBank
          label="이쪽"
          entities={state.leftSide}
          entityMap={entityMap}
          active={state.boatPosition === 'left' && !isMoving}
          selected={selected}
          onToggle={state.boatPosition === 'left' && !isMoving ? toggleSelect : undefined}
          failed={state.isFailed}
        />

        {/* River + Boat */}
        <div className="flex-shrink-0 relative flex items-center justify-center md:w-40 h-36 md:h-auto">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-800 via-blue-900 to-indigo-900">
            <WaveLayer speed={8} opacity={0.12} yOffset={10} color="rgba(147,197,253,0.2)" />
            <WaveLayer speed={6} opacity={0.08} yOffset={50} color="rgba(165,180,252,0.15)" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.03] animate-[water-shimmer_4s_ease-in-out_infinite]" />
          </div>
          <motion.div
            animate={{ x: state.boatPosition === 'left' ? -15 : 15 }}
            transition={{ type: 'spring', stiffness: 100, damping: 18 }}
            className="relative z-10 animate-boat-rock"
          >
            <div
              className="bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl p-3 border border-amber-600/40 shadow-2xl shadow-black/40"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 12px, rgba(0,0,0,0.06) 12px, rgba(0,0,0,0.06) 14px)',
              }}
            >
              <div className="text-xl text-center drop-shadow-lg">🚣</div>
              <div className="flex gap-1 justify-center mt-1.5 min-h-[32px] flex-wrap max-w-[100px]">
                {[...selected].map((id) => {
                  const entity = entityMap.get(id);
                  return entity ? (
                    <span key={id} className="text-lg drop-shadow">{entity.emoji}</span>
                  ) : null;
                })}
              </div>
            </div>
          </motion.div>
        </div>

        <EntityBank
          label="저쪽"
          entities={state.rightSide}
          entityMap={entityMap}
          active={state.boatPosition === 'right' && !isMoving}
          selected={selected}
          onToggle={state.boatPosition === 'right' && !isMoving ? toggleSelect : undefined}
          failed={state.isFailed}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSail}
          disabled={isMoving || selected.size === 0 || state.isComplete}
          className={`px-8 py-3 rounded-2xl text-white font-bold disabled:opacity-30 shadow-lg transition-all ${
            selected.size > 0 && !state.isComplete
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

function EntityBank({
  label,
  entities,
  entityMap,
  active,
  selected,
  onToggle,
  failed,
}: {
  label: string;
  entities: string[];
  entityMap: Map<string, { id: string; name: string; emoji: string; role: 'protector' | 'charge'; pairIdx: number }>;
  active: boolean;
  selected: Set<string>;
  onToggle?: (id: string) => void;
  failed: boolean;
}) {
  return (
    <div className={`flex-1 p-5 flex flex-col items-center justify-center gap-3 min-h-[100px] transition-all duration-300 relative overflow-hidden ${
      failed ? 'animate-shake' : ''
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
      <div className="flex flex-wrap gap-2.5 justify-center z-10">
        <AnimatePresence>
          {entities.map((id) => {
            const entity = entityMap.get(id);
            if (!entity) return null;
            const isSelected = selected.has(id);
            return (
              <motion.button
                key={id}
                layout
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                whileHover={onToggle ? { scale: 1.08, y: -3 } : undefined}
                whileTap={onToggle ? { scale: 0.92 } : undefined}
                onClick={() => onToggle?.(id)}
                disabled={!onToggle}
                className={`flex flex-col items-center p-2 rounded-2xl transition-all duration-200 min-w-[60px] ${
                  onToggle ? 'cursor-pointer' : 'cursor-default opacity-60'
                } ${isSelected
                  ? 'bg-blue-500/20 border border-blue-400/40 ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/15'
                  : entity.role === 'protector'
                    ? 'bg-white/10 backdrop-blur-md border border-emerald-400/30 shadow-lg shadow-black/10 hover:border-emerald-400/50'
                    : 'bg-white/10 backdrop-blur-md border border-white/10 shadow-lg shadow-black/10 hover:border-white/20'
                }`}
              >
                <span className="text-2xl drop-shadow-md">{entity.emoji}</span>
                <span className="text-[10px] font-semibold mt-0.5 text-slate-200">{entity.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full mt-0.5 font-semibold ${
                  entity.role === 'protector'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                    : 'bg-white/5 text-slate-400 border border-white/5'
                }`}>
                  {entity.role === 'protector' ? '보디가드' : '피보호'}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
