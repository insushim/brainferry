'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateRiverCrossing } from '@/engines/river-crossing/generator';
import {
  createInitialState,
  boardEntity,
  unboardEntity,
  sail,
  undo,
  type RiverState,
} from '@/engines/river-crossing/engine';
import { useAudio } from '@/hooks/useAudio';
import { RotateCcw, RefreshCw } from 'lucide-react';

interface RiverCrossingBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

/* ── SVG Background Scene: Moonlit Riverside ── */
function RiversideScene() {
  return (
    <svg viewBox="0 0 1200 400" className="w-full h-auto block" preserveAspectRatio="xMidYMid slice">
      <defs>
        {/* Sky gradient */}
        <linearGradient id="rc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c1445" />
          <stop offset="60%" stopColor="#1a1b4b" />
          <stop offset="100%" stopColor="#1e2a5a" />
        </linearGradient>

        {/* Water gradient */}
        <linearGradient id="rc-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="40%" stopColor="#0f2847" />
          <stop offset="100%" stopColor="#0a1929" />
        </linearGradient>

        {/* Left grass */}
        <linearGradient id="rc-grassL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a5c2e" />
          <stop offset="100%" stopColor="#0d3319" />
        </linearGradient>

        {/* Right grass */}
        <linearGradient id="rc-grassR" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#165a28" />
          <stop offset="100%" stopColor="#0b3015" />
        </linearGradient>

        {/* Moon glow */}
        <filter id="rc-moonGlow">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Soft glow for stars */}
        <filter id="rc-starGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Water reflection distortion */}
        <filter id="rc-waterReflect">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.06" numOctaves="3" seed="42" />
          <feDisplacementMap in="SourceGraphic" scale="6" />
        </filter>

        {/* Fog filter */}
        <filter id="rc-fog">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>

      {/* Sky */}
      <rect width="1200" height="400" fill="url(#rc-sky)" />

      {/* Stars - scattered across the sky */}
      <circle cx="80" cy="25" r="1.5" fill="white" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.3;0.7" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="200" cy="55" r="1" fill="white" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="320" cy="18" r="1.8" fill="white" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.25;0.6" dur="3.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="440" cy="42" r="1.2" fill="white" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.15;0.4" dur="5s" repeatCount="indefinite" />
      </circle>
      <circle cx="520" cy="12" r="1" fill="white" opacity="0.55" />
      <circle cx="650" cy="35" r="1.5" fill="white" opacity="0.45">
        <animate attributeName="opacity" values="0.45;0.2;0.45" dur="4.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="750" cy="8" r="1.3" fill="white" opacity="0.6" />
      <circle cx="830" cy="52" r="1" fill="white" opacity="0.35">
        <animate attributeName="opacity" values="0.35;0.15;0.35" dur="3.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="1050" cy="28" r="1.6" fill="white" opacity="0.5" />
      <circle cx="1100" cy="50" r="1" fill="white" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="4.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="150" cy="65" r="0.8" fill="white" opacity="0.3" />
      <circle cx="380" cy="70" r="1.1" fill="white" opacity="0.4" />
      <circle cx="580" cy="58" r="0.9" fill="white" opacity="0.5" />
      <circle cx="700" cy="20" r="1.4" fill="white" opacity="0.35" />
      <circle cx="1000" cy="15" r="1.2" fill="white" opacity="0.55" />
      <circle cx="900" cy="68" r="0.7" fill="white" opacity="0.3" />
      <circle cx="270" cy="38" r="1" fill="#c4b5fd" opacity="0.3" />
      <circle cx="490" cy="30" r="0.8" fill="#93c5fd" opacity="0.25" />

      {/* Crescent Moon */}
      <circle cx="950" cy="60" r="28" fill="#fef3c7" filter="url(#rc-moonGlow)" opacity="0.9" />
      <circle cx="962" cy="52" r="24" fill="#0c1445" />

      {/* Moon halo */}
      <circle cx="950" cy="60" r="50" fill="none" stroke="#fef3c7" strokeWidth="0.5" opacity="0.15" />
      <circle cx="950" cy="60" r="70" fill="none" stroke="#fef3c7" strokeWidth="0.3" opacity="0.08" />

      {/* Distant mountain/tree silhouette */}
      <path d="M0,195 Q80,170 160,185 Q240,165 350,182 Q420,155 530,175 Q620,150 720,170 Q800,145 880,168 Q960,150 1050,165 Q1130,155 1200,175 L1200,220 L0,220Z" fill="#0a2015" opacity="0.5" />

      {/* Distant tree line */}
      <path d="M0,200 Q60,188 120,195 L125,180 L130,195 Q180,192 220,198 L225,178 L230,198 Q280,190 340,196 L345,176 L350,196 Q400,185 460,192 L465,172 L470,192 Q540,188 600,194 L605,175 L610,194 Q670,186 740,193 L745,170 L750,193 Q800,188 860,195 L865,178 L870,195 Q930,185 1000,192 L1005,175 L1010,192 Q1060,188 1120,196 L1125,178 L1130,196 Q1170,190 1200,195 L1200,220 L0,220Z" fill="#0d2a18" opacity="0.4" />

      {/* Left Bank (grass area) */}
      <path d="M0,200 Q60,188 130,195 Q180,190 250,198 Q290,192 340,205 L340,400 L0,400Z" fill="url(#rc-grassL)" />

      {/* Left bank detail: small hill */}
      <ellipse cx="100" cy="210" rx="80" ry="12" fill="#1a6030" opacity="0.5" />

      {/* Grass blades on left bank */}
      <line x1="30" y1="200" x2="27" y2="183" stroke="#2d8a4e" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
        <animate attributeName="x2" values="27;30;27" dur="3s" repeatCount="indefinite" />
      </line>
      <line x1="55" y1="196" x2="53" y2="178" stroke="#1f7a3f" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <animate attributeName="x2" values="53;56;53" dur="2.5s" repeatCount="indefinite" />
      </line>
      <line x1="80" y1="195" x2="78" y2="180" stroke="#2d8a4e" strokeWidth="1.8" strokeLinecap="round" opacity="0.6">
        <animate attributeName="x2" values="78;81;78" dur="3.5s" repeatCount="indefinite" />
      </line>
      <line x1="110" y1="198" x2="109" y2="184" stroke="#24924a" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
      <line x1="145" y1="196" x2="143" y2="180" stroke="#1f7a3f" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
      <line x1="170" y1="194" x2="168" y2="178" stroke="#2d8a4e" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="200" y1="197" x2="198" y2="183" stroke="#24924a" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <line x1="240" y1="198" x2="238" y2="185" stroke="#1f7a3f" strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
      <line x1="280" y1="200" x2="278" y2="186" stroke="#2d8a4e" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="310" y1="202" x2="308" y2="190" stroke="#24924a" strokeWidth="2" strokeLinecap="round" opacity="0.55" />

      {/* Small flowers on left bank */}
      <circle cx="60" cy="208" r="3" fill="#3b9b5f" opacity="0.5" />
      <circle cx="62" cy="206" r="2" fill="#fbbf24" opacity="0.4" />
      <circle cx="140" cy="203" r="2.5" fill="#4ade80" opacity="0.4" />
      <circle cx="220" cy="206" r="2" fill="#38bdf8" opacity="0.35" />
      <circle cx="180" cy="210" r="3.5" fill="#3b9b5f" opacity="0.4" />

      {/* Small bush/shrub on left bank */}
      <ellipse cx="90" cy="205" rx="18" ry="8" fill="#1a6030" opacity="0.6" />
      <ellipse cx="260" cy="207" rx="14" ry="6" fill="#186028" opacity="0.5" />

      {/* River */}
      <rect x="340" y="200" width="520" height="200" fill="url(#rc-water)" />

      {/* Animated wave paths */}
      <path d="M340,225 Q420,215 500,225 T660,225 T860,225" fill="none" stroke="rgba(147,197,253,0.15)" strokeWidth="2">
        <animate attributeName="d" values="M340,225 Q420,215 500,225 T660,225 T860,225;M340,225 Q420,235 500,225 T660,225 T860,225;M340,225 Q420,215 500,225 T660,225 T860,225" dur="4s" repeatCount="indefinite" />
      </path>
      <path d="M340,255 Q440,245 540,255 T740,255 T860,255" fill="none" stroke="rgba(165,180,252,0.12)" strokeWidth="1.8">
        <animate attributeName="d" values="M340,255 Q440,245 540,255 T740,255 T860,255;M340,255 Q440,265 540,255 T740,255 T860,255;M340,255 Q440,245 540,255 T740,255 T860,255" dur="5s" repeatCount="indefinite" />
      </path>
      <path d="M340,285 Q460,278 560,285 T760,285 T860,285" fill="none" stroke="rgba(199,210,254,0.08)" strokeWidth="1.5">
        <animate attributeName="d" values="M340,285 Q460,278 560,285 T760,285 T860,285;M340,285 Q460,292 560,285 T760,285 T860,285;M340,285 Q460,278 560,285 T760,285 T860,285" dur="6s" repeatCount="indefinite" />
      </path>
      <path d="M340,315 Q430,308 530,315 T700,315 T860,315" fill="none" stroke="rgba(147,197,253,0.06)" strokeWidth="1.2">
        <animate attributeName="d" values="M340,315 Q430,308 530,315 T700,315 T860,315;M340,315 Q430,322 530,315 T700,315 T860,315;M340,315 Q430,308 530,315 T700,315 T860,315" dur="7s" repeatCount="indefinite" />
      </path>
      <path d="M340,350 Q450,344 560,350 T770,350 T860,350" fill="none" stroke="rgba(165,180,252,0.05)" strokeWidth="1">
        <animate attributeName="d" values="M340,350 Q450,344 560,350 T770,350 T860,350;M340,350 Q450,356 560,350 T770,350 T860,350;M340,350 Q450,344 560,350 T770,350 T860,350" dur="5.5s" repeatCount="indefinite" />
      </path>

      {/* Moon reflection on water */}
      <ellipse cx="950" cy="260" rx="12" ry="50" fill="#fef3c7" opacity="0.04" filter="url(#rc-waterReflect)" />
      <ellipse cx="950" cy="300" rx="6" ry="30" fill="#fef3c7" opacity="0.06">
        <animate attributeName="ry" values="30;35;30" dur="3s" repeatCount="indefinite" />
      </ellipse>

      {/* Fog wisps over the river */}
      <ellipse cx="500" cy="210" rx="120" ry="8" fill="white" opacity="0.03" filter="url(#rc-fog)">
        <animate attributeName="cx" values="500;550;500" dur="12s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="700" cy="230" rx="80" ry="6" fill="white" opacity="0.025" filter="url(#rc-fog)">
        <animate attributeName="cx" values="700;660;700" dur="10s" repeatCount="indefinite" />
      </ellipse>

      {/* Right Bank */}
      <path d="M860,205 Q920,192 980,200 Q1050,188 1120,196 Q1160,190 1200,198 L1200,400 L860,400Z" fill="url(#rc-grassR)" />

      {/* Right bank hill */}
      <ellipse cx="1020" cy="212" rx="70" ry="10" fill="#1a6030" opacity="0.5" />

      {/* Grass blades on right bank */}
      <line x1="880" y1="206" x2="878" y2="190" stroke="#2d8a4e" strokeWidth="2.2" strokeLinecap="round" opacity="0.7">
        <animate attributeName="x2" values="878;881;878" dur="3.2s" repeatCount="indefinite" />
      </line>
      <line x1="920" y1="200" x2="918" y2="183" stroke="#1f7a3f" strokeWidth="1.8" strokeLinecap="round" opacity="0.65" />
      <line x1="960" y1="202" x2="958" y2="187" stroke="#24924a" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <animate attributeName="x2" values="958;961;958" dur="2.8s" repeatCount="indefinite" />
      </line>
      <line x1="1000" y1="204" x2="998" y2="189" stroke="#2d8a4e" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="1040" y1="200" x2="1038" y2="184" stroke="#1f7a3f" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
      <line x1="1080" y1="198" x2="1078" y2="183" stroke="#24924a" strokeWidth="1.8" strokeLinecap="round" opacity="0.6">
        <animate attributeName="x2" values="1078;1081;1078" dur="3.6s" repeatCount="indefinite" />
      </line>
      <line x1="1120" y1="199" x2="1118" y2="186" stroke="#2d8a4e" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <line x1="1150" y1="196" x2="1148" y2="182" stroke="#1f7a3f" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

      {/* Right bank flowers */}
      <circle cx="940" cy="210" r="2.5" fill="#f472b6" opacity="0.35" />
      <circle cx="1060" cy="207" r="3" fill="#3b9b5f" opacity="0.45" />
      <circle cx="1100" cy="210" r="2" fill="#fbbf24" opacity="0.35" />

      {/* Right bank shrub */}
      <ellipse cx="1000" cy="208" rx="16" ry="7" fill="#1a6030" opacity="0.55" />
      <ellipse cx="1140" cy="205" rx="12" ry="5" fill="#186028" opacity="0.45" />

      {/* Small rocks at riverbanks */}
      <ellipse cx="330" cy="215" rx="8" ry="4" fill="#374151" opacity="0.4" />
      <ellipse cx="345" cy="225" rx="5" ry="3" fill="#4b5563" opacity="0.3" />
      <ellipse cx="865" cy="218" rx="7" ry="3.5" fill="#374151" opacity="0.4" />
      <ellipse cx="855" cy="228" rx="4" ry="2.5" fill="#4b5563" opacity="0.3" />

      {/* Firefly/particle effects */}
      <circle cx="400" cy="195" r="2" fill="#fef08a" opacity="0.3" filter="url(#rc-starGlow)">
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
        <animate attributeName="cy" values="195;190;195" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="750" cy="190" r="1.5" fill="#fef08a" opacity="0.25" filter="url(#rc-starGlow)">
        <animate attributeName="opacity" values="0.25;0.08;0.25" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="cy" values="190;186;190" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="180" cy="188" r="1.8" fill="#bbf7d0" opacity="0.2" filter="url(#rc-starGlow)">
        <animate attributeName="opacity" values="0.2;0.05;0.2" dur="3.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="1060" cy="192" r="1.5" fill="#fef08a" opacity="0.22" filter="url(#rc-starGlow)">
        <animate attributeName="opacity" values="0.22;0.06;0.22" dur="2.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ── Entity token card with glass morphism ── */
function EntityToken({
  entity,
  active,
  onBoat,
  onClick,
}: {
  entity: { id: string; name: string; emoji: string };
  active: boolean;
  onBoat: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={active ? { scale: 1.08, y: -4 } : undefined}
      whileTap={active ? { scale: 0.92 } : undefined}
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center
        w-14 h-[68px] sm:w-[72px] sm:h-[84px]
        rounded-2xl transition-all duration-200
        ${active
          ? 'cursor-pointer'
          : 'cursor-default opacity-60'
        }
        ${onBoat
          ? 'bg-blue-500/20 backdrop-blur-md border border-blue-400/40 shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/40'
          : 'bg-white/10 backdrop-blur-md border border-white/10 shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-blue-500/10 hover:border-white/20'
        }
      `}
      title={entity.name}
    >
      <span className="text-[32px] sm:text-[40px] leading-none drop-shadow-md">{entity.emoji}</span>
      <span className="text-[10px] sm:text-xs font-semibold text-slate-300 mt-0.5 leading-none truncate max-w-full px-1">
        {entity.name}
      </span>
    </motion.button>
  );
}

/* ── Bank overlay (positioned on top of SVG) ── */
function Bank({
  label,
  side,
  entities,
  getEntity,
  active,
  onClickEntity,
  shake,
}: {
  label: string;
  side: 'left' | 'right';
  entities: string[];
  getEntity: (id: string) => { id: string; name: string; emoji: string };
  active: boolean;
  onClickEntity: (id: string) => void;
  shake: boolean;
}) {
  return (
    <motion.div
      animate={shake ? { x: [0, -6, 6, -6, 6, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      className={`
        h-full rounded-none p-4 sm:p-5 flex flex-col items-center justify-center gap-3
        min-h-[120px] md:min-h-0 relative overflow-hidden transition-all duration-300
        ${shake ? 'ring-2 ring-red-500/50 ring-inset' : ''}
        ${active
          ? 'bg-gradient-to-b from-emerald-900/70 to-emerald-950/80'
          : 'bg-gradient-to-b from-emerald-950/50 to-emerald-950/70'
        }
      `}
    >
      {/* Subtle grass texture overlay */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
      }} />

      {/* Grass blades along the top edge */}
      {active && (
        <>
          <div className="absolute top-0 left-3 w-2 h-6 bg-emerald-600/40 rounded-b-full animate-[grass-sway_3s_ease-in-out_infinite]" />
          <div className="absolute top-0 left-8 w-1.5 h-5 bg-emerald-500/30 rounded-b-full animate-[grass-sway_2.5s_ease-in-out_infinite_0.5s]" />
          <div className="absolute top-0 right-5 w-2 h-6 bg-emerald-600/40 rounded-b-full animate-[grass-sway_3.5s_ease-in-out_infinite_1s]" />
          <div className="absolute top-0 right-10 w-1.5 h-4 bg-emerald-500/25 rounded-b-full animate-[grass-sway_2s_ease-in-out_infinite_0.3s]" />
        </>
      )}

      {/* Red flash overlay on failure */}
      <AnimatePresence>
        {shake && (
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-red-500/30 pointer-events-none z-10"
          />
        )}
      </AnimatePresence>

      <span className="text-[11px] font-bold text-emerald-300/70 uppercase tracking-widest z-10 drop-shadow-sm">
        {label}
      </span>

      <div className="flex flex-wrap gap-2 sm:gap-3 justify-center z-10">
        <AnimatePresence mode="popLayout">
          {entities.map((id) => {
            const entity = getEntity(id);
            return (
              <EntityToken
                key={id}
                entity={entity}
                active={active}
                onBoat={false}
                onClick={() => active && onClickEntity(id)}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {active && entities.length > 0 && (
        <span className="text-[10px] text-emerald-400/40 z-10 mt-1">
          클릭하여 보트에 태우기
        </span>
      )}
    </motion.div>
  );
}

/* ── Main Board ── */
export function RiverCrossingBoard({ difficulty, seed, onComplete, onFail }: RiverCrossingBoardProps) {
  const puzzle = useMemo(() => generateRiverCrossing(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<RiverState>(() => createInitialState(puzzle));
  const [shakeBank, setShakeBank] = useState<'left' | 'right' | null>(null);
  const [isBoatMoving, setIsBoatMoving] = useState(false);
  const [violationToast, setViolationToast] = useState<string | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { playSplash, playError, playClick, playSuccess } = useAudio();

  const entityMap = useMemo(
    () => new Map(puzzle.entities.map((e) => [e.id, e])),
    [puzzle.entities],
  );

  const getEntity = useCallback(
    (id: string) => entityMap.get(id) ?? { id, name: id, emoji: '?' },
    [entityMap],
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
      const arrivalSide = state.boatPosition === 'left' ? 'left' : 'right';
      setShakeBank(arrivalSide);
      setViolationToast(state.failReason);
      onFail?.(state.failReason);

      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => {
        setShakeBank(null);
        setViolationToast(null);
      }, 3000);
    }
  }, [state.isFailed, state.failReason, state.boatPosition, onFail, playError]);

  const showError = useCallback((msg: string) => {
    setViolationToast(msg);
    playError();
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setViolationToast(null), 3000);
  }, [playError]);

  const handleClickEntity = useCallback(
    (entityId: string) => {
      if (isBoatMoving || state.isComplete || state.isFailed) return;
      playClick();

      if (state.boatContents.includes(entityId)) {
        const result = unboardEntity(state, entityId);
        if ('error' in result) {
          showError(result.error);
          return;
        }
        setState(result);
      } else {
        if (state.boatContents.length >= puzzle.boatCapacity + 1) {
          showError(`보트는 ${puzzle.ownerName} 외에 ${puzzle.boatCapacity}명만 태울 수 있습니다.`);
          return;
        }
        const result = boardEntity(state, entityId);
        if ('error' in result) {
          showError(result.error);
          return;
        }
        setState(result);
      }
    },
    [isBoatMoving, state, puzzle.boatCapacity, puzzle.ownerName, playClick, showError],
  );

  const handleSail = useCallback(() => {
    if (isBoatMoving || state.isComplete || state.isFailed) return;

    const result = sail(state, puzzle);
    if ('error' in result) {
      showError(result.error);
      return;
    }

    playSplash();
    setIsBoatMoving(true);
    setTimeout(() => {
      setState(result);
      setIsBoatMoving(false);
    }, 800);
  }, [isBoatMoving, state, puzzle, playSplash, showError]);

  const handleUndo = useCallback(() => {
    if (isBoatMoving || state.moveHistory.length === 0) return;
    playClick();
    setState(undo(state));
    setShakeBank(null);
    setViolationToast(null);
  }, [isBoatMoving, state, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
    setShakeBank(null);
    setViolationToast(null);
  }, [puzzle, playClick]);

  const boatHasPassengers = state.boatContents.length > 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Violation toast */}
      <AnimatePresence>
        {violationToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-red-500/90 backdrop-blur-md text-white font-semibold text-sm shadow-2xl shadow-red-500/30 max-w-[90vw] text-center border border-red-400/30"
          >
            {violationToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Story & Rules */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-sm">
        <p className="font-medium mb-2 text-slate-100">{puzzle.story}</p>
        <ul className="space-y-1 text-slate-400">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-blue-400">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* ── SVG Illustration Scene ── */}
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-white/5">
        <RiversideScene />
      </div>

      {/* ── Desktop Layout ── */}
      <div className="hidden md:flex items-stretch gap-0 min-h-[300px] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-white/5">
        {/* Left Bank - 35% */}
        <div className="w-[35%]">
          <Bank
            label="이쪽 강변"
            side="left"
            entities={state.leftBank.filter(id => !state.boatContents.includes(id))}
            getEntity={getEntity}
            active={state.boatPosition === 'left' && !isBoatMoving && !state.isFailed}
            onClickEntity={handleClickEntity}
            shake={shakeBank === 'left'}
          />
        </div>

        {/* River - 30% */}
        <div className="w-[30%] relative flex flex-col items-center justify-center">
          {/* Deep water background with SVG */}
          <div className="absolute inset-0 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 400">
              <defs>
                <linearGradient id="rc-river-bg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e3a5f" />
                  <stop offset="40%" stopColor="#0f2847" />
                  <stop offset="100%" stopColor="#0a1929" />
                </linearGradient>
              </defs>
              <rect width="400" height="400" fill="url(#rc-river-bg)" />
              {/* Subtle wave lines */}
              <path d="M0,60 Q100,50 200,60 T400,60" fill="none" stroke="rgba(147,197,253,0.08)" strokeWidth="1.5">
                <animate attributeName="d" values="M0,60 Q100,50 200,60 T400,60;M0,60 Q100,70 200,60 T400,60;M0,60 Q100,50 200,60 T400,60" dur="4s" repeatCount="indefinite" />
              </path>
              <path d="M0,140 Q100,130 200,140 T400,140" fill="none" stroke="rgba(165,180,252,0.06)" strokeWidth="1.2">
                <animate attributeName="d" values="M0,140 Q100,130 200,140 T400,140;M0,140 Q100,150 200,140 T400,140;M0,140 Q100,130 200,140 T400,140" dur="5s" repeatCount="indefinite" />
              </path>
              <path d="M0,220 Q100,212 200,220 T400,220" fill="none" stroke="rgba(199,210,254,0.05)" strokeWidth="1">
                <animate attributeName="d" values="M0,220 Q100,212 200,220 T400,220;M0,220 Q100,228 200,220 T400,220;M0,220 Q100,212 200,220 T400,220" dur="6s" repeatCount="indefinite" />
              </path>
              <path d="M0,300 Q100,294 200,300 T400,300" fill="none" stroke="rgba(147,197,253,0.04)" strokeWidth="1">
                <animate attributeName="d" values="M0,300 Q100,294 200,300 T400,300;M0,300 Q100,306 200,300 T400,300;M0,300 Q100,294 200,300 T400,300" dur="7s" repeatCount="indefinite" />
              </path>
            </svg>
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.03] animate-[water-shimmer_4s_ease-in-out_infinite]" />
          </div>

          {/* Boat */}
          <motion.div
            animate={{
              x: state.boatPosition === 'left' ? '-25%' : '25%',
            }}
            transition={{ type: 'spring', stiffness: 80, damping: 18, duration: 0.8 }}
            className="relative z-10"
          >
            {/* Wake effect */}
            <AnimatePresence>
              {isBoatMoving && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 0.3, scaleX: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-36 h-3 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full blur-sm"
                />
              )}
            </AnimatePresence>

            <motion.div className="animate-boat-rock">
              {/* Boat body - warm wood */}
              <div
                className={`relative bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl px-5 py-3 shadow-2xl shadow-black/40 min-w-[140px] transition-all duration-300 ${
                  boatHasPassengers
                    ? 'border border-amber-400/40 ring-1 ring-amber-400/20'
                    : 'border border-amber-700/60'
                }`}
                style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 12px, rgba(0,0,0,0.06) 12px, rgba(0,0,0,0.06) 14px)',
                }}
              >
                {boatHasPassengers && (
                  <div className="absolute inset-0 rounded-2xl bg-amber-400/10 animate-pulse pointer-events-none" />
                )}

                <div className="text-2xl text-center mb-1.5 drop-shadow-lg relative z-10">
                  <svg width="40" height="28" viewBox="0 0 40 28" className="mx-auto">
                    <path d="M5,20 Q8,24 20,24 Q32,24 35,20 L32,12 Q28,8 20,8 Q12,8 8,12Z" fill="#92400e" stroke="#78350f" strokeWidth="1" />
                    <path d="M5,20 Q8,24 20,24 Q32,24 35,20" fill="none" stroke="#b45309" strokeWidth="1.5" />
                    <line x1="20" y1="4" x2="20" y2="12" stroke="#78350f" strokeWidth="1.5" />
                    <path d="M20,4 Q26,6 24,10 L20,8Z" fill="#fef3c7" opacity="0.6" />
                  </svg>
                </div>
                <div className="flex gap-1.5 justify-center min-h-[40px] items-center relative z-10">
                  <AnimatePresence mode="popLayout">
                    {state.boatContents.map((id) => (
                      <motion.button
                        key={id}
                        layout
                        initial={{ scale: 0, y: -20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        onClick={() => handleClickEntity(id)}
                        className="w-10 h-10 rounded-xl bg-blue-500/20 backdrop-blur-sm flex items-center justify-center text-xl cursor-pointer hover:bg-blue-500/30 transition-colors border border-blue-400/20 shadow-md"
                        title={getEntity(id).name}
                      >
                        {getEntity(id).emoji}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                  {state.boatContents.length === 0 && (
                    <span className="text-amber-400/30 text-xs">비어있음</span>
                  )}
                </div>

                <div className="absolute -bottom-1.5 left-2 right-2 h-1.5 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent rounded-full" />
              </div>
            </motion.div>
          </motion.div>

          {/* Sail button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleSail}
            disabled={isBoatMoving || !boatHasPassengers || state.isComplete || state.isFailed}
            className={`
              relative z-10 mt-4 px-7 py-2.5 rounded-2xl font-bold text-white text-sm
              shadow-lg transition-all duration-200
              disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none
              ${boatHasPassengers && !state.isComplete && !state.isFailed
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 shadow-blue-500/30 animate-pulse-button'
                : 'bg-white/10 backdrop-blur-sm border border-white/10'
              }
            `}
          >
            출발!
          </motion.button>
        </div>

        {/* Right Bank - 35% */}
        <div className="w-[35%]">
          <Bank
            label="저쪽 강변"
            side="right"
            entities={state.rightBank.filter(id => !state.boatContents.includes(id))}
            getEntity={getEntity}
            active={state.boatPosition === 'right' && !isBoatMoving && !state.isFailed}
            onClickEntity={handleClickEntity}
            shake={shakeBank === 'right'}
          />
        </div>
      </div>

      {/* ── Mobile Layout (vertical) ── */}
      <div className="md:hidden space-y-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-white/5">
        <div className="min-h-[28vh]">
          <Bank
            label="이쪽 강변"
            side="left"
            entities={state.leftBank.filter(id => !state.boatContents.includes(id))}
            getEntity={getEntity}
            active={state.boatPosition === 'left' && !isBoatMoving && !state.isFailed}
            onClickEntity={handleClickEntity}
            shake={shakeBank === 'left'}
          />
        </div>

        {/* River + Boat - middle */}
        <div className="relative min-h-[25vh] flex flex-col items-center justify-center py-4">
          <div className="absolute inset-0 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 300">
              <defs>
                <linearGradient id="rc-river-mob" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e3a5f" />
                  <stop offset="40%" stopColor="#0f2847" />
                  <stop offset="100%" stopColor="#0a1929" />
                </linearGradient>
              </defs>
              <rect width="400" height="300" fill="url(#rc-river-mob)" />
              <path d="M0,50 Q100,40 200,50 T400,50" fill="none" stroke="rgba(147,197,253,0.08)" strokeWidth="1.5">
                <animate attributeName="d" values="M0,50 Q100,40 200,50 T400,50;M0,50 Q100,60 200,50 T400,50;M0,50 Q100,40 200,50 T400,50" dur="4s" repeatCount="indefinite" />
              </path>
              <path d="M0,120 Q100,112 200,120 T400,120" fill="none" stroke="rgba(165,180,252,0.06)" strokeWidth="1.2">
                <animate attributeName="d" values="M0,120 Q100,112 200,120 T400,120;M0,120 Q100,128 200,120 T400,120;M0,120 Q100,112 200,120 T400,120" dur="5.5s" repeatCount="indefinite" />
              </path>
              <path d="M0,200 Q100,193 200,200 T400,200" fill="none" stroke="rgba(199,210,254,0.05)" strokeWidth="1">
                <animate attributeName="d" values="M0,200 Q100,193 200,200 T400,200;M0,200 Q100,207 200,200 T400,200;M0,200 Q100,193 200,200 T400,200" dur="6.5s" repeatCount="indefinite" />
              </path>
            </svg>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.03] animate-[water-shimmer_4s_ease-in-out_infinite]" />
          </div>

          <motion.div
            animate={{ y: state.boatPosition === 'left' ? -8 : 8 }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
            className="relative z-10 animate-boat-rock"
          >
            <div
              className={`relative bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl px-5 py-3 shadow-2xl shadow-black/40 ${
                boatHasPassengers
                  ? 'border border-amber-400/40'
                  : 'border border-amber-700/60'
              }`}
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 12px, rgba(0,0,0,0.06) 12px, rgba(0,0,0,0.06) 14px)',
              }}
            >
              {boatHasPassengers && (
                <div className="absolute inset-0 rounded-2xl bg-amber-400/10 animate-pulse pointer-events-none" />
              )}
              <div className="text-2xl text-center mb-1.5 relative z-10">
                <svg width="36" height="24" viewBox="0 0 40 28" className="mx-auto">
                  <path d="M5,20 Q8,24 20,24 Q32,24 35,20 L32,12 Q28,8 20,8 Q12,8 8,12Z" fill="#92400e" stroke="#78350f" strokeWidth="1" />
                  <path d="M5,20 Q8,24 20,24 Q32,24 35,20" fill="none" stroke="#b45309" strokeWidth="1.5" />
                  <line x1="20" y1="4" x2="20" y2="12" stroke="#78350f" strokeWidth="1.5" />
                  <path d="M20,4 Q26,6 24,10 L20,8Z" fill="#fef3c7" opacity="0.6" />
                </svg>
              </div>
              <div className="flex gap-1.5 justify-center min-h-[36px] items-center relative z-10">
                <AnimatePresence mode="popLayout">
                  {state.boatContents.map((id) => (
                    <motion.button
                      key={id}
                      layout
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={() => handleClickEntity(id)}
                      className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center text-lg cursor-pointer hover:bg-blue-500/30 transition-colors border border-blue-400/20"
                      title={getEntity(id).name}
                    >
                      {getEntity(id).emoji}
                    </motion.button>
                  ))}
                </AnimatePresence>
                {state.boatContents.length === 0 && (
                  <span className="text-amber-400/30 text-xs">비어있음</span>
                )}
              </div>
              <div className="absolute -bottom-1.5 left-2 right-2 h-1.5 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent rounded-full" />
            </div>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleSail}
            disabled={isBoatMoving || !boatHasPassengers || state.isComplete || state.isFailed}
            className={`
              relative z-10 mt-3 px-7 py-2.5 rounded-2xl font-bold text-white text-sm
              shadow-lg transition-all duration-200
              disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none
              ${boatHasPassengers && !state.isComplete && !state.isFailed
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/30 animate-pulse-button'
                : 'bg-white/10 backdrop-blur-sm border border-white/10'
              }
            `}
          >
            출발!
          </motion.button>
        </div>

        <div className="min-h-[28vh]">
          <Bank
            label="저쪽 강변"
            side="right"
            entities={state.rightBank.filter(id => !state.boatContents.includes(id))}
            getEntity={getEntity}
            active={state.boatPosition === 'right' && !isBoatMoving && !state.isFailed}
            onClickEntity={handleClickEntity}
            shake={shakeBank === 'right'}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleUndo} disabled={isBoatMoving || state.moveHistory.length === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-sm text-slate-400 font-semibold disabled:opacity-30 hover:bg-white/10 transition-all border border-white/5">
          <RotateCcw className="w-4 h-4" />
          되돌리기
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleReset}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-sm text-slate-400 font-semibold hover:bg-white/10 transition-all border border-white/5">
          <RefreshCw className="w-4 h-4" />
          처음부터
        </motion.button>
      </div>

      {/* Step counter pill */}
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
