'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateBridgeTorch } from '@/engines/bridge-torch/generator';
import {
  createInitialState,
  applyMove,
  undo,
  type BridgeTorchState,
} from '@/engines/bridge-torch/engine';
import { useAudio } from '@/hooks/useAudio';

interface BridgeTorchBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

/* ── SVG Background: Dark Cave with Rope Bridge ── */
function CaveBridgeScene() {
  return (
    <svg viewBox="0 0 1200 440" className="w-full h-auto block" preserveAspectRatio="xMidYMid slice">
      <defs>
        {/* Cave darkness gradient */}
        <linearGradient id="bt-caveBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0a0f" />
          <stop offset="40%" stopColor="#0f0e18" />
          <stop offset="100%" stopColor="#12101e" />
        </linearGradient>

        {/* Abyss gradient */}
        <linearGradient id="bt-abyss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0812" />
          <stop offset="50%" stopColor="#050408" />
          <stop offset="100%" stopColor="#020204" />
        </linearGradient>

        {/* Cave wall left */}
        <linearGradient id="bt-wallL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a2435" />
          <stop offset="100%" stopColor="#1a1525" />
        </linearGradient>

        {/* Cave wall right */}
        <linearGradient id="bt-wallR" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#282238" />
          <stop offset="100%" stopColor="#181322" />
        </linearGradient>

        {/* Torch fire glow */}
        <filter id="bt-fireGlow">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Smaller glow */}
        <filter id="bt-smallGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Firefly glow */}
        <filter id="bt-fireflyGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Ambient fog */}
        <filter id="bt-fog">
          <feGaussianBlur stdDeviation="18" />
        </filter>

        {/* Rock texture */}
        <filter id="bt-rockTex">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" seed="13" />
          <feColorMatrix type="saturate" values="0" />
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>

        {/* Radial torch light */}
        <radialGradient id="bt-torchLight" cx="0.5" cy="0.3" r="0.6">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.12" />
          <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Cave background */}
      <rect width="1200" height="440" fill="url(#bt-caveBg)" />

      {/* ── Cave ceiling (stalactites) ── */}
      {/* Main cave arch */}
      <path d="M0,0 L0,120 Q100,140 200,100 Q300,80 400,130 Q500,160 600,140 Q700,110 800,150 Q900,120 1000,100 Q1100,130 1200,110 L1200,0Z" fill="#1a1525" opacity="0.8" />

      {/* Stalactites from ceiling */}
      <path d="M120,90 L125,145 L130,90" fill="#2a2438" stroke="#1f1a2f" strokeWidth="0.5" />
      <path d="M180,85 L184,155 L188,85" fill="#252035" stroke="#1f1a2f" strokeWidth="0.5" />
      <path d="M250,95 L253,130 L256,95" fill="#2a2438" />
      <path d="M350,110 L354,170 L358,110" fill="#2a2438" stroke="#1f1a2f" strokeWidth="0.5" />
      <path d="M420,125 L423,160 L426,125" fill="#252035" />
      <path d="M500,135 L504,185 L508,135" fill="#2a2438" stroke="#1f1a2f" strokeWidth="0.5" />
      <path d="M560,130 L563,165 L566,130" fill="#252035" />
      <path d="M650,115 L654,175 L658,115" fill="#2a2438" stroke="#1f1a2f" strokeWidth="0.5" />
      <path d="M720,140 L723,175 L726,140" fill="#252035" />
      <path d="M800,125 L804,180 L808,125" fill="#2a2438" stroke="#1f1a2f" strokeWidth="0.5" />
      <path d="M870,120 L873,155 L876,120" fill="#252035" />
      <path d="M950,95 L953,145 L956,95" fill="#2a2438" stroke="#1f1a2f" strokeWidth="0.5" />
      <path d="M1020,100 L1024,160 L1028,100" fill="#252035" />
      <path d="M1080,115 L1083,155 L1086,115" fill="#2a2438" />

      {/* Thicker stalactites with drip effect */}
      <path d="M290,90 Q295,130 292,160 Q290,165 288,160 Q285,130 290,90" fill="#2d2740" />
      <circle cx="292" cy="165" r="2" fill="#4a90c4" opacity="0.3">
        <animate attributeName="cy" values="165;185;165" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="4s" repeatCount="indefinite" />
      </circle>

      <path d="M750,100 Q755,145 752,180 Q750,185 748,180 Q745,145 750,100" fill="#2d2740" />
      <circle cx="752" cy="185" r="2" fill="#4a90c4" opacity="0.25">
        <animate attributeName="cy" values="185;210;185" dur="5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.25;0;0.25" dur="5s" repeatCount="indefinite" />
      </circle>

      {/* ── Left cave wall / ledge ── */}
      <path d="M0,120 Q50,160 100,180 Q160,220 220,240 Q280,260 340,280 L340,440 L0,440Z" fill="url(#bt-wallL)" />
      {/* Rock texture detail */}
      <ellipse cx="100" cy="260" rx="40" ry="15" fill="#221d30" opacity="0.5" />
      <ellipse cx="200" cy="300" rx="30" ry="10" fill="#252035" opacity="0.4" />
      <ellipse cx="60" cy="320" rx="25" ry="12" fill="#221d30" opacity="0.35" />
      {/* Stalagmites on left ledge */}
      <path d="M160,280 L165,250 L170,280" fill="#2d2740" />
      <path d="M230,300 L234,265 L238,300" fill="#2a2438" />
      <path d="M300,310 L303,280 L306,310" fill="#2d2740" />
      {/* Small crystals */}
      <path d="M120,270 L124,255 L128,270" fill="#7c3aed" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.15;0.25" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M125,272 L128,260 L131,272" fill="#a78bfa" opacity="0.2">
        <animate attributeName="opacity" values="0.2;0.1;0.2" dur="4s" repeatCount="indefinite" />
      </path>

      {/* ── Right cave wall / ledge ── */}
      <path d="M1200,110 Q1150,155 1100,175 Q1040,210 980,235 Q920,255 860,275 L860,440 L1200,440Z" fill="url(#bt-wallR)" />
      {/* Rock texture detail */}
      <ellipse cx="1100" cy="255" rx="35" ry="14" fill="#201b30" opacity="0.5" />
      <ellipse cx="1000" cy="290" rx="28" ry="11" fill="#232035" opacity="0.4" />
      <ellipse cx="1140" cy="315" rx="25" ry="10" fill="#201b30" opacity="0.35" />
      {/* Stalagmites on right ledge */}
      <path d="M900,295 L904,262 L908,295" fill="#2d2740" />
      <path d="M970,280 L974,248 L978,280" fill="#2a2438" />
      <path d="M1040,270 L1043,240 L1046,270" fill="#2d2740" />
      {/* Small crystals on right */}
      <path d="M1070,265 L1074,250 L1078,265" fill="#7c3aed" opacity="0.2">
        <animate attributeName="opacity" values="0.2;0.1;0.2" dur="3.5s" repeatCount="indefinite" />
      </path>
      <path d="M1075,267 L1078,255 L1081,267" fill="#a78bfa" opacity="0.15">
        <animate attributeName="opacity" values="0.15;0.08;0.15" dur="4.5s" repeatCount="indefinite" />
      </path>

      {/* ── Abyss below ── */}
      <rect x="340" y="320" width="520" height="120" fill="url(#bt-abyss)" />
      {/* Abyss fog */}
      <ellipse cx="600" cy="380" rx="200" ry="30" fill="#1a1528" opacity="0.3" filter="url(#bt-fog)">
        <animate attributeName="rx" values="200;220;200" dur="8s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="500" cy="360" rx="100" ry="15" fill="#151020" opacity="0.25" filter="url(#bt-fog)">
        <animate attributeName="cx" values="500;530;500" dur="10s" repeatCount="indefinite" />
      </ellipse>

      {/* ── Torch (left side) ── */}
      {/* Torch bracket on wall */}
      <rect x="310" y="240" width="6" height="20" fill="#5c4030" rx="1" />
      <rect x="305" y="235" width="16" height="6" fill="#6b5040" rx="1" />

      {/* Torch flame - animated */}
      <ellipse cx="313" cy="226" rx="10" ry="16" fill="#f59e0b" opacity="0.6" filter="url(#bt-fireGlow)">
        <animate attributeName="ry" values="16;20;16" dur="0.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0.8;0.6" dur="0.4s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="313" cy="222" rx="6" ry="12" fill="#fbbf24" opacity="0.8">
        <animate attributeName="ry" values="12;15;12" dur="0.5s" repeatCount="indefinite" />
        <animate attributeName="rx" values="6;7;6" dur="0.3s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="313" cy="218" rx="3" ry="7" fill="#fef3c7" opacity="0.9">
        <animate attributeName="ry" values="7;9;7" dur="0.4s" repeatCount="indefinite" />
      </ellipse>
      {/* Smoke wisps from torch */}
      <ellipse cx="315" cy="205" rx="4" ry="3" fill="#6b7280" opacity="0.1">
        <animate attributeName="cy" values="205;190;205" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.1;0;0.1" dur="3s" repeatCount="indefinite" />
      </ellipse>

      {/* Torch light area illumination */}
      <ellipse cx="313" cy="270" rx="120" ry="80" fill="url(#bt-torchLight)" />

      {/* ── Torch (right side) ── */}
      <rect x="884" y="235" width="6" height="20" fill="#5c4030" rx="1" />
      <rect x="879" y="230" width="16" height="6" fill="#6b5040" rx="1" />

      <ellipse cx="887" cy="221" rx="10" ry="16" fill="#f59e0b" opacity="0.5" filter="url(#bt-fireGlow)">
        <animate attributeName="ry" values="16;19;16" dur="0.7s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.7;0.5" dur="0.45s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="887" cy="217" rx="6" ry="12" fill="#fbbf24" opacity="0.7">
        <animate attributeName="ry" values="12;14;12" dur="0.55s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="887" cy="213" rx="3" ry="7" fill="#fef3c7" opacity="0.85">
        <animate attributeName="ry" values="7;8;7" dur="0.45s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="889" cy="200" rx="4" ry="3" fill="#6b7280" opacity="0.08">
        <animate attributeName="cy" values="200;185;200" dur="3.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.08;0;0.08" dur="3.5s" repeatCount="indefinite" />
      </ellipse>

      {/* Right torch light area */}
      <ellipse cx="887" cy="265" rx="120" ry="80" fill="url(#bt-torchLight)" opacity="0.8" />

      {/* ── Rope Bridge ── */}
      {/* Left anchor post */}
      <rect x="330" y="268" width="12" height="30" fill="#5c4030" rx="2" />
      <rect x="328" y="265" width="16" height="6" rx="2" fill="#6b5040" />

      {/* Right anchor post */}
      <rect x="858" y="263" width="12" height="30" fill="#5c4030" rx="2" />
      <rect x="856" y="260" width="16" height="6" rx="2" fill="#6b5040" />

      {/* Top rope (handrail) */}
      <path d="M342,268 Q450,285 600,290 Q750,285 858,263" fill="none" stroke="#8B7355" strokeWidth="2.5">
        <animate attributeName="d" values="M342,268 Q450,285 600,290 Q750,285 858,263;M342,268 Q450,287 600,292 Q750,287 858,263;M342,268 Q450,285 600,290 Q750,285 858,263" dur="4s" repeatCount="indefinite" />
      </path>
      {/* Bottom rope */}
      <path d="M342,290 Q450,308 600,312 Q750,308 858,285" fill="none" stroke="#8B7355" strokeWidth="2.5">
        <animate attributeName="d" values="M342,290 Q450,308 600,312 Q750,308 858,285;M342,290 Q450,310 600,314 Q750,310 858,285;M342,290 Q450,308 600,312 Q750,308 858,285" dur="4s" repeatCount="indefinite" />
      </path>

      {/* Wooden planks on bridge */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((i) => {
        const t = (i + 0.5) / 20;
        const x = 350 + t * 500;
        const topY = 290 + Math.sin(t * Math.PI) * 22;
        const botY = topY + 3;
        return (
          <rect
            key={`plank-${i}`}
            x={x - 8}
            y={topY}
            width="16"
            height={botY - topY + 2}
            rx="1"
            fill="#6b5040"
            stroke="#5c4030"
            strokeWidth="0.5"
            opacity={0.8 + (i % 3) * 0.05}
          />
        );
      })}

      {/* Vertical rope ties between handrail and planks */}
      {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18].map((i) => {
        const t = (i + 0.5) / 20;
        const x = 350 + t * 500;
        const topRopeY = 268 + Math.sin(t * Math.PI) * 22;
        const plankY = 290 + Math.sin(t * Math.PI) * 22;
        return (
          <line
            key={`tie-${i}`}
            x1={x}
            y1={topRopeY}
            x2={x}
            y2={plankY}
            stroke="#8B7355"
            strokeWidth="1"
            opacity="0.6"
          />
        );
      })}

      {/* ── Fireflies ── */}
      <circle cx="200" cy="200" r="3" fill="#bbf7d0" opacity="0.4" filter="url(#bt-fireflyGlow)">
        <animate attributeName="cx" values="200;215;200" dur="6s" repeatCount="indefinite" />
        <animate attributeName="cy" values="200;190;200" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="450" cy="250" r="2.5" fill="#fef08a" opacity="0.35" filter="url(#bt-fireflyGlow)">
        <animate attributeName="cx" values="450;440;450" dur="5s" repeatCount="indefinite" />
        <animate attributeName="cy" values="250;240;250" dur="3.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0.08;0.35" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="700" cy="230" r="2" fill="#bbf7d0" opacity="0.3" filter="url(#bt-fireflyGlow)">
        <animate attributeName="cx" values="700;710;700" dur="7s" repeatCount="indefinite" />
        <animate attributeName="cy" values="230;220;230" dur="4.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.05;0.3" dur="3.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="550" cy="200" r="2.5" fill="#fef08a" opacity="0.25" filter="url(#bt-fireflyGlow)">
        <animate attributeName="cx" values="550;560;550" dur="5.5s" repeatCount="indefinite" />
        <animate attributeName="cy" values="200;188;200" dur="4.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.25;0.05;0.25" dur="2.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="850" cy="210" r="2" fill="#bbf7d0" opacity="0.2" filter="url(#bt-fireflyGlow)">
        <animate attributeName="cx" values="850;860;850" dur="6.5s" repeatCount="indefinite" />
        <animate attributeName="cy" values="210;200;210" dur="3.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0.05;0.2" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="380" cy="190" r="1.8" fill="#fef08a" opacity="0.3" filter="url(#bt-fireflyGlow)">
        <animate attributeName="cy" values="190;178;190" dur="5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.08;0.3" dur="3.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="1000" cy="220" r="2.2" fill="#bbf7d0" opacity="0.25" filter="url(#bt-fireflyGlow)">
        <animate attributeName="cx" values="1000;1010;1000" dur="5.8s" repeatCount="indefinite" />
        <animate attributeName="cy" values="220;208;220" dur="4.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.25;0.06;0.25" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="150" cy="250" r="2" fill="#fef08a" opacity="0.2" filter="url(#bt-fireflyGlow)">
        <animate attributeName="cy" values="250;238;250" dur="4.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0.05;0.2" dur="3.8s" repeatCount="indefinite" />
      </circle>

      {/* ── Ambient fog wisps ── */}
      <ellipse cx="300" cy="300" rx="100" ry="12" fill="white" opacity="0.015" filter="url(#bt-fog)">
        <animate attributeName="cx" values="300;340;300" dur="15s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="800" cy="290" rx="80" ry="10" fill="white" opacity="0.012" filter="url(#bt-fog)">
        <animate attributeName="cx" values="800;770;800" dur="12s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="600" cy="340" rx="180" ry="20" fill="#1a1528" opacity="0.15" filter="url(#bt-fog)">
        <animate attributeName="ry" values="20;25;20" dur="8s" repeatCount="indefinite" />
      </ellipse>
    </svg>
  );
}

export function BridgeTorchBoard({ difficulty, seed, onComplete, onFail }: BridgeTorchBoardProps) {
  const puzzle = useMemo(() => generateBridgeTorch(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<BridgeTorchState>(() => createInitialState(puzzle));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isMoving, setIsMoving] = useState(false);
  const { playClick, playError, playSuccess, playSplash } = useAudio();

  const speedMap = useMemo(
    () => new Map(puzzle.people.map((p) => [p.id, p])),
    [puzzle.people],
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
      onFail?.(state.failReason);
    }
  }, [state.isFailed, state.failReason, onFail, playError]);

  const currentSide = state.torchPosition === 'left' ? state.leftSide : state.rightSide;

  const toggleSelect = useCallback((id: string) => {
    if (state.isComplete || state.isFailed || isMoving) return;
    if (!currentSide.includes(id)) return;
    playClick();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        const maxSelect = state.torchPosition === 'left' ? puzzle.bridgeCapacity : 1;
        if (next.size >= maxSelect) return prev;
        next.add(id);
      }
      return next;
    });
  }, [playClick, state.torchPosition, state.isComplete, state.isFailed, isMoving, puzzle.bridgeCapacity, currentSide]);

  const handleMove = useCallback(() => {
    if (selected.size === 0 || isMoving || state.isComplete || state.isFailed) return;
    const direction = state.torchPosition === 'left' ? 'forward' as const : 'back' as const;
    const result = applyMove(state, { people: [...selected], direction, time: 0 }, puzzle);
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
  }, [selected, state, puzzle, playError, playSplash, onFail, isMoving]);

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

  const timePercent = Math.min(100, (state.elapsedTime / puzzle.timeLimit) * 100);
  const timeWarning = timePercent > 80;

  return (
    <div className="space-y-4">
      {/* Story */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-sm">
        <p className="font-medium mb-2 text-slate-100">{puzzle.story}</p>
        <ul className="space-y-1 text-slate-400">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-amber-400">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Time bar */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">경과: <strong className="text-lg tabular-nums text-slate-100">{state.elapsedTime}분</strong></span>
          <span className="text-slate-400">제한: <strong className={`text-lg tabular-nums ${timeWarning ? 'text-red-400' : 'text-slate-100'}`}>{puzzle.timeLimit}분</strong></span>
        </div>
        <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
          <motion.div
            className={`h-full rounded-full transition-colors ${timeWarning ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
            animate={{ width: `${timePercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* SVG Illustration */}
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-white/5">
        <CaveBridgeScene />
      </div>

      {/* Board */}
      <div className="flex flex-col md:flex-row items-stretch gap-0 min-h-[260px] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-white/5">
        {/* Left side */}
        <PersonGroup
          label="이쪽"
          people={state.leftSide}
          speedMap={speedMap}
          hasTorch={state.torchPosition === 'left'}
          selected={selected}
          onToggle={state.torchPosition === 'left' && !isMoving ? toggleSelect : undefined}
        />

        {/* Bridge center */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center md:w-32 h-24 md:h-auto relative overflow-hidden">
          {/* Cave bridge background */}
          <div className="absolute inset-0">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 160 300">
              <defs>
                <linearGradient id="bt-bridgeBg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a1525" />
                  <stop offset="50%" stopColor="#0f0e18" />
                  <stop offset="100%" stopColor="#08070e" />
                </linearGradient>
                <radialGradient id="bt-bridgeTorchLt" cx="0.5" cy="0.3" r="0.5">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="160" height="300" fill="url(#bt-bridgeBg)" />
              <rect width="160" height="300" fill="url(#bt-bridgeTorchLt)" />
              {/* Rope lines */}
              <line x1="0" y1="80" x2="160" y2="80" stroke="#8B7355" strokeWidth="1.5" opacity="0.3" />
              <line x1="0" y1="220" x2="160" y2="220" stroke="#8B7355" strokeWidth="1.5" opacity="0.3" />
              {/* Plank lines */}
              <rect x="10" y="130" width="140" height="4" fill="#6b5040" opacity="0.4" rx="1" />
              <rect x="10" y="145" width="140" height="4" fill="#6b5040" opacity="0.35" rx="1" />
              <rect x="10" y="160" width="140" height="4" fill="#6b5040" opacity="0.4" rx="1" />
            </svg>
          </div>

          {/* Torch glow overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-amber-500/3 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

          {/* Torch SVG icon */}
          <div className="relative z-10 mb-1">
            <svg width="32" height="48" viewBox="0 0 32 48" className="mx-auto">
              <rect x="13" y="22" width="6" height="20" fill="#78350f" rx="1" />
              <rect x="11" y="20" width="10" height="4" fill="#92400e" rx="1" />
              <ellipse cx="16" cy="14" rx="8" ry="12" fill="#f59e0b" opacity="0.5">
                <animate attributeName="ry" values="12;15;12" dur="0.6s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="16" cy="12" rx="5" ry="8" fill="#fbbf24" opacity="0.7">
                <animate attributeName="ry" values="8;10;8" dur="0.5s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="16" cy="10" rx="2.5" ry="5" fill="#fef3c7" opacity="0.9">
                <animate attributeName="ry" values="5;6;5" dur="0.4s" repeatCount="indefinite" />
              </ellipse>
            </svg>
          </div>
          <div className="text-xs text-amber-400/70 font-semibold z-10">다리</div>
          <motion.div
            animate={{ x: state.torchPosition === 'left' ? -8 : 8 }}
            className="text-xs text-amber-400 font-bold mt-1.5 z-10"
          >
            {state.torchPosition === 'left' ? '→' : '←'}
          </motion.div>
          {/* Show selected on bridge during move */}
          {isMoving && (
            <div className="flex gap-1 mt-1 z-10">
              {[...selected].map((id) => {
                const person = speedMap.get(id);
                return person ? (
                  <motion.span
                    key={id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-lg"
                  >
                    {person.emoji}
                  </motion.span>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* Right side */}
        <PersonGroup
          label="저쪽"
          people={state.rightSide}
          speedMap={speedMap}
          hasTorch={state.torchPosition === 'right'}
          selected={selected}
          onToggle={state.torchPosition === 'right' && !isMoving ? toggleSelect : undefined}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleMove}
          disabled={selected.size === 0 || state.isComplete || state.isFailed || isMoving}
          className={`px-8 py-3 rounded-2xl text-white font-bold disabled:opacity-30 shadow-lg transition-all ${
            selected.size > 0 && !state.isComplete && !state.isFailed
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-amber-500/25 animate-pulse-button'
              : 'bg-white/10 backdrop-blur-sm border border-white/10'
          }`}
        >
          {state.torchPosition === 'left' ? '건너기 →' : '← 돌아오기'}
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
          <span className="font-bold text-amber-400 tabular-nums">{puzzle.optimalSteps}</span>
        </div>
      </div>
    </div>
  );
}

function PersonGroup({
  label,
  people,
  speedMap,
  hasTorch,
  selected,
  onToggle,
}: {
  label: string;
  people: string[];
  speedMap: Map<string, { id: string; name: string; emoji: string; speed: number }>;
  hasTorch: boolean;
  selected: Set<string>;
  onToggle?: (id: string) => void;
}) {
  return (
    <div className={`flex-1 p-5 flex flex-col items-center justify-center gap-3 min-h-[100px] transition-all duration-300 relative overflow-hidden ${
      hasTorch
        ? 'bg-gradient-to-b from-amber-950/40 to-stone-950/50'
        : 'bg-gradient-to-b from-slate-900/80 to-slate-950/90'
    }`}>
      {/* Cave-like texture */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
      }} />

      {/* Torch light radial effect */}
      {hasTorch && (
        <div className="absolute inset-0 bg-gradient-radial from-amber-500/8 via-transparent to-transparent pointer-events-none" />
      )}

      {/* Warm accent when torch is here */}
      {hasTorch && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
      )}

      <div className="flex items-center gap-2 z-10">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        {hasTorch && (
          <span className="text-lg drop-shadow-lg">
            <svg width="14" height="20" viewBox="0 0 14 20" className="inline-block align-text-bottom">
              <rect x="5" y="10" width="4" height="8" fill="#78350f" rx="0.5" />
              <ellipse cx="7" cy="6" rx="5" ry="7" fill="#f59e0b" opacity="0.6">
                <animate attributeName="ry" values="7;9;7" dur="0.6s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="7" cy="5" rx="3" ry="4" fill="#fbbf24" opacity="0.8">
                <animate attributeName="ry" values="4;5;4" dur="0.5s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="7" cy="4" rx="1.5" ry="2.5" fill="#fef3c7" opacity="0.9">
                <animate attributeName="ry" values="2.5;3;2.5" dur="0.4s" repeatCount="indefinite" />
              </ellipse>
            </svg>
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2.5 justify-center z-10">
        <AnimatePresence>
          {people.map((id) => {
            const person = speedMap.get(id);
            if (!person) return null;
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
                className={`flex flex-col items-center p-2.5 rounded-2xl transition-all duration-200 min-w-[64px] ${
                  onToggle ? 'cursor-pointer' : 'cursor-default opacity-60'
                } ${isSelected
                  ? 'bg-amber-500/20 border border-amber-400/40 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/15'
                  : 'bg-white/10 backdrop-blur-md border border-white/10 shadow-lg shadow-black/10 hover:border-amber-400/20 hover:bg-white/15'
                }`}
              >
                <span className="text-2xl drop-shadow-md">{person.emoji}</span>
                <span className="text-xs font-semibold mt-0.5 text-slate-200">{person.name}</span>
                <span className="text-[10px] text-amber-300/70 bg-amber-500/10 backdrop-blur-sm rounded-full px-2 py-0.5 mt-1 font-mono border border-amber-500/10">
                  {person.speed}분
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
      {people.length === 0 && (
        <div className="text-slate-600 text-sm z-10">비어 있음</div>
      )}
    </div>
  );
}
