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

/* ── SVG Background: Medieval Castle with Moat ── */
function CastleMoatScene() {
  return (
    <svg viewBox="0 0 1200 420" className="w-full h-auto block" preserveAspectRatio="xMidYMid slice">
      <defs>
        {/* Twilight sky */}
        <linearGradient id="em-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a0a2e" />
          <stop offset="40%" stopColor="#2d1b4e" />
          <stop offset="70%" stopColor="#4a2066" />
          <stop offset="100%" stopColor="#6b2c7b" />
        </linearGradient>

        {/* Castle stone */}
        <linearGradient id="em-stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a4458" />
          <stop offset="100%" stopColor="#2d2640" />
        </linearGradient>

        {/* Tower stone darker */}
        <linearGradient id="em-towerStone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3d3650" />
          <stop offset="100%" stopColor="#252038" />
        </linearGradient>

        {/* Moat water */}
        <linearGradient id="em-moat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a3048" />
          <stop offset="50%" stopColor="#122540" />
          <stop offset="100%" stopColor="#0a1830" />
        </linearGradient>

        {/* Courtyard ground */}
        <linearGradient id="em-courtyard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5c4f3a" />
          <stop offset="100%" stopColor="#3a3228" />
        </linearGradient>

        {/* Village meadow */}
        <linearGradient id="em-meadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a5c2e" />
          <stop offset="100%" stopColor="#0d3319" />
        </linearGradient>

        {/* Warm torch glow */}
        <filter id="em-torchGlow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Window glow */}
        <filter id="em-windowGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Star glow */}
        <filter id="em-starGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Fog */}
        <filter id="em-fog">
          <feGaussianBlur stdDeviation="15" />
        </filter>
      </defs>

      {/* Sky */}
      <rect width="1200" height="420" fill="url(#em-sky)" />

      {/* Stars */}
      <circle cx="100" cy="30" r="1.5" fill="white" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.25;0.6" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="250" cy="55" r="1" fill="white" opacity="0.5" />
      <circle cx="400" cy="20" r="1.8" fill="white" opacity="0.45">
        <animate attributeName="opacity" values="0.45;0.15;0.45" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="550" cy="40" r="1.2" fill="white" opacity="0.4" />
      <circle cx="680" cy="15" r="1.5" fill="#c4b5fd" opacity="0.35">
        <animate attributeName="opacity" values="0.35;0.12;0.35" dur="3.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="800" cy="50" r="1" fill="white" opacity="0.5" />
      <circle cx="950" cy="25" r="1.6" fill="white" opacity="0.55">
        <animate attributeName="opacity" values="0.55;0.2;0.55" dur="4.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="1050" cy="45" r="1" fill="white" opacity="0.35" />
      <circle cx="1150" cy="18" r="1.3" fill="#93c5fd" opacity="0.3" />
      <circle cx="150" cy="70" r="0.8" fill="white" opacity="0.3" />
      <circle cx="750" cy="35" r="1.4" fill="white" opacity="0.4" />
      <circle cx="350" cy="65" r="0.9" fill="white" opacity="0.35" />

      {/* Moon (rising, larger, warm) */}
      <circle cx="1050" cy="80" r="32" fill="#fde68a" filter="url(#em-torchGlow)" opacity="0.85" />
      <circle cx="1064" cy="72" r="28" fill="#1a0a2e" />

      {/* Castle left side */}
      {/* Left tower */}
      <rect x="60" y="120" width="60" height="200" fill="url(#em-towerStone)" />
      <polygon points="50,120 90,70 130,120" fill="#3d3650" stroke="#2d2640" strokeWidth="1" />
      {/* Tower flag */}
      <line x1="90" y1="70" x2="90" y2="50" stroke="#5a4f6f" strokeWidth="1.5" />
      <path d="M90,50 L110,56 L90,62" fill="#dc2626" opacity="0.8">
        <animate attributeName="d" values="M90,50 L110,56 L90,62;M90,50 L108,58 L90,62;M90,50 L110,56 L90,62" dur="2s" repeatCount="indefinite" />
      </path>
      {/* Tower windows */}
      <rect x="80" y="145" width="12" height="18" rx="6" fill="#fbbf24" opacity="0.5" filter="url(#em-windowGlow)" />
      <rect x="80" y="190" width="12" height="18" rx="6" fill="#fbbf24" opacity="0.35" filter="url(#em-windowGlow)" />
      {/* Tower battlements */}
      <rect x="56" y="112" width="12" height="10" fill="#4a4458" />
      <rect x="76" y="112" width="12" height="10" fill="#4a4458" />
      <rect x="96" y="112" width="12" height="10" fill="#4a4458" />
      <rect x="116" y="112" width="12" height="10" fill="#4a4458" />

      {/* Castle wall */}
      <rect x="120" y="160" width="200" height="160" fill="url(#em-stone)" />
      {/* Wall battlements */}
      <rect x="120" y="150" width="18" height="14" fill="#4a4458" />
      <rect x="148" y="150" width="18" height="14" fill="#4a4458" />
      <rect x="176" y="150" width="18" height="14" fill="#4a4458" />
      <rect x="204" y="150" width="18" height="14" fill="#4a4458" />
      <rect x="232" y="150" width="18" height="14" fill="#4a4458" />
      <rect x="260" y="150" width="18" height="14" fill="#4a4458" />
      <rect x="288" y="150" width="18" height="14" fill="#4a4458" />

      {/* Castle windows on wall */}
      <rect x="150" y="185" width="14" height="20" rx="7" fill="#fbbf24" opacity="0.3" filter="url(#em-windowGlow)" />
      <rect x="200" y="185" width="14" height="20" rx="7" fill="#fbbf24" opacity="0.4" filter="url(#em-windowGlow)" />
      <rect x="250" y="185" width="14" height="20" rx="7" fill="#fbbf24" opacity="0.25" filter="url(#em-windowGlow)" />
      <rect x="175" y="240" width="10" height="14" rx="5" fill="#fbbf24" opacity="0.2" filter="url(#em-windowGlow)" />
      <rect x="230" y="240" width="10" height="14" rx="5" fill="#fbbf24" opacity="0.3" filter="url(#em-windowGlow)" />

      {/* Right tower */}
      <rect x="320" y="130" width="55" height="190" fill="url(#em-towerStone)" />
      <polygon points="312,130 347,85 382,130" fill="#3d3650" stroke="#2d2640" strokeWidth="1" />
      <line x1="347" y1="85" x2="347" y2="65" stroke="#5a4f6f" strokeWidth="1.5" />
      <path d="M347,65 L367,71 L347,77" fill="#dc2626" opacity="0.7">
        <animate attributeName="d" values="M347,65 L367,71 L347,77;M347,65 L365,73 L347,77;M347,65 L367,71 L347,77" dur="2.3s" repeatCount="indefinite" />
      </path>
      <rect x="337" y="155" width="12" height="18" rx="6" fill="#fbbf24" opacity="0.45" filter="url(#em-windowGlow)" />
      <rect x="337" y="200" width="12" height="18" rx="6" fill="#fbbf24" opacity="0.3" filter="url(#em-windowGlow)" />
      {/* Tower battlements */}
      <rect x="316" y="122" width="11" height="10" fill="#4a4458" />
      <rect x="333" y="122" width="11" height="10" fill="#4a4458" />
      <rect x="350" y="122" width="11" height="10" fill="#4a4458" />
      <rect x="367" y="122" width="11" height="10" fill="#4a4458" />

      {/* Gate / Drawbridge opening */}
      <rect x="160" y="260" width="90" height="60" rx="45" fill="#1a1425" />
      <rect x="165" y="265" width="80" height="55" rx="40" fill="#0f0d18" />
      {/* Portcullis lines */}
      <line x1="180" y1="260" x2="180" y2="320" stroke="#5a4f6f" strokeWidth="1.5" opacity="0.4" />
      <line x1="200" y1="260" x2="200" y2="320" stroke="#5a4f6f" strokeWidth="1.5" opacity="0.4" />
      <line x1="220" y1="260" x2="220" y2="320" stroke="#5a4f6f" strokeWidth="1.5" opacity="0.4" />

      {/* Courtyard ground */}
      <rect x="0" y="320" width="380" height="100" fill="url(#em-courtyard)" />
      {/* Cobblestone texture hints */}
      <ellipse cx="80" cy="340" rx="15" ry="6" fill="#4a4030" opacity="0.3" />
      <ellipse cx="200" cy="350" rx="12" ry="5" fill="#4a4030" opacity="0.25" />
      <ellipse cx="300" cy="335" rx="10" ry="4" fill="#4a4030" opacity="0.2" />

      {/* Torch on castle wall */}
      <rect x="140" y="235" width="4" height="12" fill="#78350f" />
      <ellipse cx="142" cy="232" rx="6" ry="8" fill="#f59e0b" opacity="0.6" filter="url(#em-torchGlow)">
        <animate attributeName="ry" values="8;10;8" dur="0.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0.8;0.6" dur="0.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="142" cy="230" rx="3" ry="5" fill="#fbbf24" opacity="0.8">
        <animate attributeName="ry" values="5;7;5" dur="0.6s" repeatCount="indefinite" />
      </ellipse>

      {/* Torch on right tower */}
      <rect x="360" y="248" width="4" height="12" fill="#78350f" />
      <ellipse cx="362" cy="245" rx="6" ry="8" fill="#f59e0b" opacity="0.5" filter="url(#em-torchGlow)">
        <animate attributeName="ry" values="8;10;8" dur="0.7s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="362" cy="243" rx="3" ry="5" fill="#fbbf24" opacity="0.7">
        <animate attributeName="ry" values="5;6;5" dur="0.5s" repeatCount="indefinite" />
      </ellipse>

      {/* Moat */}
      <rect x="380" y="280" width="440" height="140" fill="url(#em-moat)" />
      {/* Moat wave animations */}
      <path d="M380,300 Q460,292 540,300 T700,300 T820,300" fill="none" stroke="rgba(147,197,253,0.1)" strokeWidth="1.5">
        <animate attributeName="d" values="M380,300 Q460,292 540,300 T700,300 T820,300;M380,300 Q460,308 540,300 T700,300 T820,300;M380,300 Q460,292 540,300 T700,300 T820,300" dur="4s" repeatCount="indefinite" />
      </path>
      <path d="M380,330 Q480,324 580,330 T780,330 T820,330" fill="none" stroke="rgba(165,180,252,0.07)" strokeWidth="1.2">
        <animate attributeName="d" values="M380,330 Q480,324 580,330 T780,330 T820,330;M380,330 Q480,336 580,330 T780,330 T820,330;M380,330 Q480,324 580,330 T780,330 T820,330" dur="5s" repeatCount="indefinite" />
      </path>
      <path d="M380,360 Q500,355 600,360 T800,360 T820,360" fill="none" stroke="rgba(199,210,254,0.05)" strokeWidth="1">
        <animate attributeName="d" values="M380,360 Q500,355 600,360 T800,360 T820,360;M380,360 Q500,365 600,360 T800,360 T820,360;M380,360 Q500,355 600,360 T800,360 T820,360" dur="6s" repeatCount="indefinite" />
      </path>

      {/* Drawbridge over moat */}
      <rect x="440" y="295" width="120" height="12" rx="2" fill="#78350f" />
      <line x1="450" y1="295" x2="450" y2="307" stroke="#5c2d0e" strokeWidth="2" />
      <line x1="480" y1="295" x2="480" y2="307" stroke="#5c2d0e" strokeWidth="2" />
      <line x1="510" y1="295" x2="510" y2="307" stroke="#5c2d0e" strokeWidth="2" />
      <line x1="540" y1="295" x2="540" y2="307" stroke="#5c2d0e" strokeWidth="2" />
      {/* Drawbridge chains */}
      <path d="M440,295 Q435,285 380,270" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d="M560,295 Q565,285 620,270" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4 3" />

      {/* Right side: Village meadow */}
      <path d="M820,280 Q880,270 950,278 Q1020,268 1100,275 Q1150,272 1200,278 L1200,420 L820,420Z" fill="url(#em-meadow)" />

      {/* Village houses */}
      {/* House 1 */}
      <rect x="870" y="275" width="40" height="30" fill="#5c4f3a" />
      <polygon points="865,275 890,255 915,275" fill="#78350f" />
      <rect x="882" y="288" width="10" height="17" fill="#3a3228" />
      <rect x="875" y="282" width="8" height="8" fill="#fbbf24" opacity="0.3" filter="url(#em-windowGlow)" />
      {/* Chimney */}
      <rect x="900" y="258" width="6" height="15" fill="#4a4030" />
      <ellipse cx="903" cy="255" rx="5" ry="3" fill="#6b7280" opacity="0.3">
        <animate attributeName="ry" values="3;5;3" dur="3s" repeatCount="indefinite" />
        <animate attributeName="cy" values="255;248;255" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="4s" repeatCount="indefinite" />
      </ellipse>

      {/* House 2 */}
      <rect x="940" y="270" width="35" height="28" fill="#5c4f3a" />
      <polygon points="935,270 957,252 980,270" fill="#78350f" />
      <rect x="950" y="284" width="8" height="14" fill="#3a3228" />
      <rect x="942" y="276" width="7" height="7" fill="#fbbf24" opacity="0.35" filter="url(#em-windowGlow)" />

      {/* House 3 */}
      <rect x="1010" y="268" width="45" height="32" fill="#5c4f3a" />
      <polygon points="1005,268 1032,245 1060,268" fill="#78350f" />
      <rect x="1024" y="282" width="10" height="18" fill="#3a3228" />
      <rect x="1015" y="275" width="8" height="8" fill="#fbbf24" opacity="0.25" filter="url(#em-windowGlow)" />
      <rect x="1040" y="275" width="8" height="8" fill="#fbbf24" opacity="0.4" filter="url(#em-windowGlow)" />

      {/* Village grass and trees */}
      <ellipse cx="860" cy="305" rx="16" ry="7" fill="#1a6030" opacity="0.5" />
      <ellipse cx="990" cy="302" rx="12" ry="6" fill="#186028" opacity="0.45" />
      <ellipse cx="1100" cy="298" rx="14" ry="6" fill="#1a6030" opacity="0.4" />

      {/* Trees */}
      <rect x="1098" y="260" width="6" height="20" fill="#5c4030" />
      <ellipse cx="1101" cy="252" rx="14" ry="16" fill="#166534" opacity="0.7" />
      <ellipse cx="1101" cy="248" rx="10" ry="12" fill="#15803d" opacity="0.5" />

      <rect x="848" y="268" width="5" height="16" fill="#5c4030" />
      <ellipse cx="850" cy="262" rx="12" ry="14" fill="#166534" opacity="0.6" />

      {/* Grass blades on meadow */}
      <line x1="840" y1="285" x2="838" y2="272" stroke="#2d8a4e" strokeWidth="2" strokeLinecap="round" opacity="0.6">
        <animate attributeName="x2" values="838;841;838" dur="3s" repeatCount="indefinite" />
      </line>
      <line x1="920" y1="283" x2="918" y2="270" stroke="#1f7a3f" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="1060" y1="282" x2="1058" y2="268" stroke="#2d8a4e" strokeWidth="1.8" strokeLinecap="round" opacity="0.55">
        <animate attributeName="x2" values="1058;1061;1058" dur="3.5s" repeatCount="indefinite" />
      </line>
      <line x1="1140" y1="280" x2="1138" y2="266" stroke="#24924a" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="1170" y1="278" x2="1168" y2="264" stroke="#1f7a3f" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />

      {/* Small flowers */}
      <circle cx="880" cy="300" r="2" fill="#f472b6" opacity="0.3" />
      <circle cx="1050" cy="296" r="2.5" fill="#fbbf24" opacity="0.3" />
      <circle cx="1130" cy="293" r="2" fill="#60a5fa" opacity="0.25" />

      {/* Fog over moat */}
      <ellipse cx="600" cy="290" rx="150" ry="10" fill="white" opacity="0.03" filter="url(#em-fog)">
        <animate attributeName="cx" values="600;650;600" dur="12s" repeatCount="indefinite" />
      </ellipse>
    </svg>
  );
}

export function EscortMissionBoard({ difficulty, seed, onComplete, onFail }: EscortMissionBoardProps) {
  const puzzle = useMemo(() => generateEscort(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<EscortState>(() => createInitialState(puzzle));
  const [selectedA, setSelectedA] = useState(0);
  const [selectedB, setSelectedB] = useState(0);
  const [selectedC, setSelectedC] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const { playSplash, playError, playClick, playSuccess } = useAudio();

  const hasGroupC = !!puzzle.groupC;

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
    const move = {
      groupA: selectedA,
      groupB: selectedB,
      ...(hasGroupC ? { groupC: selectedC } : {}),
      direction,
    };
    const result = applyMove(state, move, puzzle);
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
      setSelectedC(0);
      setIsMoving(false);
    }, 600);
  }, [isMoving, state, selectedA, selectedB, selectedC, hasGroupC, puzzle, playSplash, playError, onFail]);

  const handleUndo = useCallback(() => {
    if (state.moveHistory.length === 0) return;
    playClick();
    setState(undo(state, puzzle));
    setSelectedA(0);
    setSelectedB(0);
    setSelectedC(0);
  }, [state, puzzle, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
    setSelectedA(0);
    setSelectedB(0);
    setSelectedC(0);
  }, [puzzle, playClick]);

  const currentA = state.boatPosition === 'left' ? state.leftA : state.rightA;
  const currentB = state.boatPosition === 'left' ? state.leftB : state.rightB;
  const currentC = state.boatPosition === 'left' ? state.leftC : state.rightC;
  const totalSelected = selectedA + selectedB + selectedC;
  const maxA = Math.min(currentA, puzzle.boatCapacity);
  const maxB = Math.min(currentB, puzzle.boatCapacity - selectedA);
  const maxC = hasGroupC ? Math.min(currentC, puzzle.boatCapacity - selectedA - selectedB) : 0;

  return (
    <div className="space-y-4">
      {/* Story */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-sm">
        <p className="font-medium mb-2 text-slate-100">{puzzle.story}</p>
        <ul className="space-y-1 text-slate-400">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-purple-400">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* SVG Illustration */}
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-white/5">
        <CastleMoatScene />
      </div>

      {/* Board */}
      <div className="flex flex-col md:flex-row items-stretch gap-0 min-h-[260px] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-white/5">
        {/* Left Bank - Castle Courtyard */}
        <GroupBank
          label="성 안쪽"
          groupA={puzzle.groupA}
          groupB={puzzle.groupB}
          groupC={puzzle.groupC}
          countA={state.leftA}
          countB={state.leftB}
          countC={state.leftC}
          active={state.boatPosition === 'left'}
          failed={state.isFailed}
          theme="castle"
        />

        {/* River / Moat + Boat */}
        <div className="flex-shrink-0 relative flex flex-col items-center justify-center md:w-56 h-48 md:h-auto">
          {/* Moat water background */}
          <div className="absolute inset-0 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 300 400">
              <defs>
                <linearGradient id="em-moat-bg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a3048" />
                  <stop offset="50%" stopColor="#122540" />
                  <stop offset="100%" stopColor="#0a1830" />
                </linearGradient>
              </defs>
              <rect width="300" height="400" fill="url(#em-moat-bg)" />
              <path d="M0,80 Q75,70 150,80 T300,80" fill="none" stroke="rgba(147,197,253,0.08)" strokeWidth="1.5">
                <animate attributeName="d" values="M0,80 Q75,70 150,80 T300,80;M0,80 Q75,90 150,80 T300,80;M0,80 Q75,70 150,80 T300,80" dur="4s" repeatCount="indefinite" />
              </path>
              <path d="M0,180 Q75,172 150,180 T300,180" fill="none" stroke="rgba(165,180,252,0.06)" strokeWidth="1.2">
                <animate attributeName="d" values="M0,180 Q75,172 150,180 T300,180;M0,180 Q75,188 150,180 T300,180;M0,180 Q75,172 150,180 T300,180" dur="5s" repeatCount="indefinite" />
              </path>
              <path d="M0,280 Q75,274 150,280 T300,280" fill="none" stroke="rgba(199,210,254,0.05)" strokeWidth="1">
                <animate attributeName="d" values="M0,280 Q75,274 150,280 T300,280;M0,280 Q75,286 150,280 T300,280;M0,280 Q75,274 150,280 T300,280" dur="6s" repeatCount="indefinite" />
              </path>
            </svg>
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
              <div className="text-xl mb-3 drop-shadow-lg">
                <svg width="36" height="24" viewBox="0 0 40 28" className="mx-auto">
                  <path d="M5,20 Q8,24 20,24 Q32,24 35,20 L32,12 Q28,8 20,8 Q12,8 8,12Z" fill="#92400e" stroke="#78350f" strokeWidth="1" />
                  <path d="M5,20 Q8,24 20,24 Q32,24 35,20" fill="none" stroke="#b45309" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="space-y-3">
                <NumberPicker
                  emoji={puzzle.groupA.emoji}
                  label={puzzle.groupA.name}
                  value={selectedA}
                  max={maxA}
                  onChange={(v) => { setSelectedA(v); setSelectedB(0); setSelectedC(0); }}
                />
                <NumberPicker
                  emoji={puzzle.groupB.emoji}
                  label={puzzle.groupB.name}
                  value={selectedB}
                  max={maxB}
                  onChange={(v) => { setSelectedB(v); setSelectedC(0); }}
                />
                {hasGroupC && puzzle.groupC && (
                  <NumberPicker
                    emoji={puzzle.groupC.emoji}
                    label={puzzle.groupC.name}
                    value={selectedC}
                    max={maxC}
                    onChange={setSelectedC}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Bank - Village meadow */}
        <GroupBank
          label="성 바깥"
          groupA={puzzle.groupA}
          groupB={puzzle.groupB}
          groupC={puzzle.groupC}
          countA={state.rightA}
          countB={state.rightB}
          countC={state.rightC}
          active={state.boatPosition === 'right'}
          failed={state.isFailed}
          theme="meadow"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSail}
          disabled={isMoving || totalSelected === 0 || state.isComplete}
          className={`px-8 py-3 rounded-2xl text-white font-bold disabled:opacity-30 shadow-lg transition-all ${
            totalSelected > 0 && !state.isComplete
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 shadow-purple-500/25 animate-pulse-button'
              : 'bg-white/10 backdrop-blur-sm border border-white/10'
          }`}
        >
          출발!
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
          <span className="font-bold text-purple-400 tabular-nums">{puzzle.optimalSteps}</span>
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
          onClick={(e) => { e.stopPropagation(); onChange(Math.max(0, value - 1)); }}
          disabled={value <= 0}
          className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 flex items-center justify-center transition-colors border border-white/5 active:scale-90"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-8 text-center font-bold text-lg tabular-nums">{value}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onChange(Math.min(max, value + 1)); }}
          disabled={value >= max}
          className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 flex items-center justify-center transition-colors border border-white/5 active:scale-90"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function GroupBank({
  label,
  groupA,
  groupB,
  groupC,
  countA,
  countB,
  countC,
  active,
  failed,
  theme,
}: {
  label: string;
  groupA: { name: string; emoji: string };
  groupB: { name: string; emoji: string };
  groupC?: { name: string; emoji: string; count: number };
  countA: number;
  countB: number;
  countC: number;
  active: boolean;
  failed: boolean;
  theme: 'castle' | 'meadow';
}) {
  const bgClass = theme === 'castle'
    ? active
      ? 'bg-gradient-to-b from-amber-900/50 to-amber-950/60'
      : 'bg-gradient-to-b from-stone-900/60 to-stone-950/70'
    : active
      ? 'bg-gradient-to-b from-emerald-900/70 to-emerald-950/80'
      : 'bg-gradient-to-b from-emerald-950/50 to-emerald-950/70';

  const accentColor = theme === 'castle' ? 'text-amber-300/70' : 'text-emerald-300/70';

  return (
    <div className={`flex-1 p-5 flex flex-col items-center justify-center gap-3 min-h-[100px] transition-all duration-300 relative overflow-hidden ${
      failed && active ? 'animate-shake' : ''
    } ${bgClass}`}>
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
      }} />

      {/* Theme-specific top decoration */}
      {theme === 'castle' && active && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      )}
      {theme === 'meadow' && active && (
        <>
          <div className="absolute top-0 left-3 w-2 h-5 bg-emerald-600/40 rounded-b-full animate-[grass-sway_3s_ease-in-out_infinite]" />
          <div className="absolute top-0 left-8 w-1.5 h-4 bg-emerald-500/30 rounded-b-full animate-[grass-sway_2.5s_ease-in-out_infinite_0.5s]" />
          <div className="absolute top-0 right-5 w-2 h-5 bg-emerald-600/35 rounded-b-full animate-[grass-sway_3.5s_ease-in-out_infinite_1s]" />
        </>
      )}

      <span className={`text-[11px] font-bold ${accentColor} uppercase tracking-widest z-10`}>{label}</span>
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
        {groupC && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl shadow-lg shadow-black/10 border border-white/10 mb-1">
              {groupC.emoji}
            </div>
            <motion.div
              key={countC}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-xl font-bold text-slate-100 drop-shadow tabular-nums"
            >
              {countC}
            </motion.div>
            <div className="text-xs text-slate-400">{groupC.name}</div>
          </div>
        )}
      </div>
    </div>
  );
}
