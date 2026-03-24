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

/* ── SVG Background: Night City with Bridge ── */
function NightCityScene() {
  return (
    <svg viewBox="0 0 1200 420" className="w-full h-auto block" preserveAspectRatio="xMidYMid slice">
      <defs>
        {/* Night sky */}
        <linearGradient id="bg-nightSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0e1a" />
          <stop offset="50%" stopColor="#111827" />
          <stop offset="100%" stopColor="#1a1f35" />
        </linearGradient>

        {/* Dark river */}
        <linearGradient id="bg-darkRiver" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f1728" />
          <stop offset="50%" stopColor="#0a1020" />
          <stop offset="100%" stopColor="#060a15" />
        </linearGradient>

        {/* Building gradients */}
        <linearGradient id="bg-building1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
        <linearGradient id="bg-building2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Neon glow filters */}
        <filter id="bg-neonCyan">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="bg-neonPink">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="bg-neonPurple">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Street lamp glow */}
        <filter id="bg-lampGlow">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Window glow */}
        <filter id="bg-winGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Water reflection */}
        <filter id="bg-waterReflect">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.08" numOctaves="3" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="5" />
        </filter>
      </defs>

      {/* Sky */}
      <rect width="1200" height="420" fill="url(#bg-nightSky)" />

      {/* Distant stars */}
      <circle cx="100" cy="20" r="1" fill="white" opacity="0.4" />
      <circle cx="250" cy="35" r="0.8" fill="white" opacity="0.3" />
      <circle cx="400" cy="15" r="1.2" fill="white" opacity="0.35">
        <animate attributeName="opacity" values="0.35;0.15;0.35" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="550" cy="28" r="0.8" fill="white" opacity="0.3" />
      <circle cx="700" cy="10" r="1" fill="white" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.15;0.4" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="850" cy="22" r="0.9" fill="white" opacity="0.25" />
      <circle cx="1000" cy="18" r="1.1" fill="white" opacity="0.35" />
      <circle cx="1100" cy="38" r="0.7" fill="white" opacity="0.3" />

      {/* ── Left side buildings (Skyline) ── */}
      {/* Tall building 1 */}
      <rect x="30" y="80" width="50" height="230" fill="url(#bg-building1)" />
      <rect x="32" y="76" width="46" height="6" fill="#374151" />
      {/* Windows */}
      <rect x="38" y="92" width="6" height="8" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="50" y="92" width="6" height="8" fill="#fbbf24" opacity="0.25" filter="url(#bg-winGlow)" />
      <rect x="62" y="92" width="6" height="8" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />
      <rect x="38" y="112" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="50" y="112" width="6" height="8" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="62" y="112" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="38" y="132" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="50" y="132" width="6" height="8" fill="#fbbf24" opacity="0.1" />
      <rect x="62" y="132" width="6" height="8" fill="#22d3ee" opacity="0.2" filter="url(#bg-winGlow)" />
      <rect x="38" y="152" width="6" height="8" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />
      <rect x="62" y="152" width="6" height="8" fill="#fbbf24" opacity="0.25" />
      <rect x="38" y="172" width="6" height="8" fill="#22d3ee" opacity="0.15" />
      <rect x="50" y="172" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="38" y="192" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="62" y="192" width="6" height="8" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="50" y="212" width="6" height="8" fill="#fbbf24" opacity="0.25" />
      <rect x="38" y="232" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="62" y="232" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="50" y="252" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="38" y="272" width="6" height="8" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />
      {/* Antenna */}
      <line x1="55" y1="76" x2="55" y2="60" stroke="#4b5563" strokeWidth="1.5" />
      <circle cx="55" cy="58" r="2" fill="#ef4444" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
      </circle>

      {/* Building 2 - medium */}
      <rect x="90" y="140" width="45" height="170" fill="url(#bg-building2)" />
      <rect x="96" y="150" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="108" y="150" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="120" y="150" width="6" height="8" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="96" y="170" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="108" y="170" width="6" height="8" fill="#22d3ee" opacity="0.2" filter="url(#bg-winGlow)" />
      <rect x="120" y="170" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="96" y="190" width="6" height="8" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="108" y="190" width="6" height="8" fill="#fbbf24" opacity="0.1" />
      <rect x="96" y="210" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="120" y="210" width="6" height="8" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />
      <rect x="108" y="230" width="6" height="8" fill="#fbbf24" opacity="0.25" />
      <rect x="96" y="250" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="120" y="250" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="108" y="270" width="6" height="8" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />

      {/* Building 3 - short */}
      <rect x="145" y="190" width="55" height="120" fill="url(#bg-building1)" />
      <rect x="152" y="200" width="7" height="9" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />
      <rect x="166" y="200" width="7" height="9" fill="#fbbf24" opacity="0.2" />
      <rect x="180" y="200" width="7" height="9" fill="#f472b6" opacity="0.2" filter="url(#bg-winGlow)" />
      <rect x="152" y="220" width="7" height="9" fill="#fbbf24" opacity="0.15" />
      <rect x="166" y="220" width="7" height="9" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="180" y="220" width="7" height="9" fill="#fbbf24" opacity="0.25" />
      <rect x="152" y="240" width="7" height="9" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="166" y="240" width="7" height="9" fill="#fbbf24" opacity="0.1" />
      <rect x="180" y="240" width="7" height="9" fill="#22d3ee" opacity="0.15" filter="url(#bg-winGlow)" />
      <rect x="152" y="260" width="7" height="9" fill="#fbbf24" opacity="0.2" />
      <rect x="180" y="260" width="7" height="9" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />

      {/* Building 4 - tall again */}
      <rect x="210" y="110" width="50" height="200" fill="url(#bg-building2)" />
      <rect x="216" y="120" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="228" y="120" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="240" y="120" width="6" height="8" fill="#22d3ee" opacity="0.25" filter="url(#bg-winGlow)" />
      <rect x="216" y="140" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="228" y="140" width="6" height="8" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="240" y="140" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="216" y="160" width="6" height="8" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />
      <rect x="240" y="160" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="228" y="180" width="6" height="8" fill="#fbbf24" opacity="0.25" />
      <rect x="216" y="200" width="6" height="8" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="240" y="200" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="228" y="220" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="216" y="240" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="240" y="240" width="6" height="8" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />
      <rect x="228" y="260" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="216" y="280" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <line x1="235" y1="110" x2="235" y2="90" stroke="#4b5563" strokeWidth="1.5" />
      <circle cx="235" cy="88" r="2" fill="#ef4444" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Building 5 */}
      <rect x="270" y="165" width="40" height="145" fill="url(#bg-building1)" />
      <rect x="276" y="175" width="6" height="8" fill="#fbbf24" opacity="0.25" />
      <rect x="288" y="175" width="6" height="8" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="276" y="195" width="6" height="8" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />
      <rect x="288" y="195" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="276" y="215" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="288" y="215" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="276" y="235" width="6" height="8" fill="#22d3ee" opacity="0.2" filter="url(#bg-winGlow)" />
      <rect x="288" y="235" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="276" y="255" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="288" y="275" width="6" height="8" fill="#fbbf24" opacity="0.2" />

      {/* Neon sign on building 3 */}
      <rect x="148" y="192" width="50" height="3" rx="1" fill="#f472b6" opacity="0.5" filter="url(#bg-neonPink)">
        <animate attributeName="opacity" values="0.5;0.3;0.5" dur="2s" repeatCount="indefinite" />
      </rect>

      {/* Neon sign on building 5 */}
      <rect x="272" y="167" width="36" height="3" rx="1" fill="#22d3ee" opacity="0.4" filter="url(#bg-neonCyan)">
        <animate attributeName="opacity" values="0.4;0.2;0.4" dur="2.5s" repeatCount="indefinite" />
      </rect>

      {/* ── Right side buildings ── */}
      <rect x="910" y="100" width="55" height="210" fill="url(#bg-building2)" />
      <rect x="916" y="112" width="7" height="9" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="930" y="112" width="7" height="9" fill="#fbbf24" opacity="0.2" />
      <rect x="944" y="112" width="7" height="9" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="916" y="134" width="7" height="9" fill="#fbbf24" opacity="0.15" />
      <rect x="930" y="134" width="7" height="9" fill="#22d3ee" opacity="0.2" filter="url(#bg-winGlow)" />
      <rect x="944" y="134" width="7" height="9" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />
      <rect x="916" y="156" width="7" height="9" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="944" y="156" width="7" height="9" fill="#fbbf24" opacity="0.2" />
      <rect x="930" y="178" width="7" height="9" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="916" y="200" width="7" height="9" fill="#fbbf24" opacity="0.25" />
      <rect x="944" y="200" width="7" height="9" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />
      <rect x="930" y="222" width="7" height="9" fill="#fbbf24" opacity="0.15" />
      <rect x="916" y="244" width="7" height="9" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="944" y="244" width="7" height="9" fill="#fbbf24" opacity="0.2" />
      <rect x="930" y="266" width="7" height="9" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <line x1="937" y1="100" x2="937" y2="78" stroke="#4b5563" strokeWidth="1.5" />
      <circle cx="937" cy="76" r="2" fill="#ef4444" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.8s" repeatCount="indefinite" />
      </circle>

      <rect x="975" y="155" width="45" height="155" fill="url(#bg-building1)" />
      <rect x="981" y="165" width="6" height="8" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />
      <rect x="993" y="165" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="1005" y="165" width="6" height="8" fill="#f472b6" opacity="0.2" filter="url(#bg-winGlow)" />
      <rect x="981" y="185" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="993" y="185" width="6" height="8" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="1005" y="185" width="6" height="8" fill="#fbbf24" opacity="0.25" />
      <rect x="981" y="205" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="1005" y="205" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="993" y="225" width="6" height="8" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />
      <rect x="981" y="245" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="1005" y="245" width="6" height="8" fill="#22d3ee" opacity="0.2" filter="url(#bg-winGlow)" />
      <rect x="993" y="265" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />

      <rect x="1030" y="120" width="50" height="190" fill="url(#bg-building2)" />
      <rect x="1036" y="130" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="1048" y="130" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="1060" y="130" width="6" height="8" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="1036" y="150" width="6" height="8" fill="#22d3ee" opacity="0.2" filter="url(#bg-winGlow)" />
      <rect x="1048" y="150" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="1060" y="150" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="1036" y="170" width="6" height="8" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />
      <rect x="1060" y="170" width="6" height="8" fill="#fbbf24" opacity="0.25" />
      <rect x="1048" y="190" width="6" height="8" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="1036" y="210" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="1060" y="210" width="6" height="8" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />
      <rect x="1048" y="230" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="1036" y="250" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="1060" y="250" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="1048" y="270" width="6" height="8" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <line x1="1055" y1="120" x2="1055" y2="95" stroke="#4b5563" strokeWidth="1.5" />
      <circle cx="1055" cy="93" r="2" fill="#ef4444" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.2s" repeatCount="indefinite" />
      </circle>

      <rect x="1090" y="180" width="45" height="130" fill="url(#bg-building1)" />
      <rect x="1096" y="190" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="1108" y="190" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="1120" y="190" width="6" height="8" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="1096" y="210" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="1108" y="210" width="6" height="8" fill="#fbbf24" opacity="0.35" filter="url(#bg-winGlow)" />
      <rect x="1120" y="210" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="1096" y="230" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />
      <rect x="1120" y="230" width="6" height="8" fill="#fbbf24" opacity="0.15" />
      <rect x="1108" y="250" width="6" height="8" fill="#fbbf24" opacity="0.4" filter="url(#bg-winGlow)" />
      <rect x="1096" y="270" width="6" height="8" fill="#fbbf24" opacity="0.2" />
      <rect x="1120" y="270" width="6" height="8" fill="#fbbf24" opacity="0.3" filter="url(#bg-winGlow)" />

      {/* Neon sign on right buildings */}
      <rect x="912" y="102" width="50" height="3" rx="1" fill="#a855f7" opacity="0.4" filter="url(#bg-neonPurple)">
        <animate attributeName="opacity" values="0.4;0.2;0.4" dur="3s" repeatCount="indefinite" />
      </rect>
      <rect x="1032" y="122" width="46" height="3" rx="1" fill="#22d3ee" opacity="0.35" filter="url(#bg-neonCyan)">
        <animate attributeName="opacity" values="0.35;0.15;0.35" dur="2.8s" repeatCount="indefinite" />
      </rect>

      {/* ── Ground / Street level ── */}
      <rect x="0" y="310" width="380" height="110" fill="#1a1f2e" />
      <rect x="820" y="310" width="380" height="110" fill="#1a1f2e" />

      {/* Sidewalk edge */}
      <rect x="0" y="308" width="380" height="4" fill="#374151" />
      <rect x="820" y="308" width="380" height="4" fill="#374151" />

      {/* ── River ── */}
      <rect x="380" y="280" width="440" height="140" fill="url(#bg-darkRiver)" />

      {/* Water wave animations */}
      <path d="M380,300 Q460,293 540,300 T700,300 T820,300" fill="none" stroke="rgba(34,211,238,0.08)" strokeWidth="1.5">
        <animate attributeName="d" values="M380,300 Q460,293 540,300 T700,300 T820,300;M380,300 Q460,307 540,300 T700,300 T820,300;M380,300 Q460,293 540,300 T700,300 T820,300" dur="4s" repeatCount="indefinite" />
      </path>
      <path d="M380,330 Q480,324 580,330 T780,330 T820,330" fill="none" stroke="rgba(168,85,247,0.06)" strokeWidth="1.2">
        <animate attributeName="d" values="M380,330 Q480,324 580,330 T780,330 T820,330;M380,330 Q480,336 580,330 T780,330 T820,330;M380,330 Q480,324 580,330 T780,330 T820,330" dur="5s" repeatCount="indefinite" />
      </path>
      <path d="M380,360 Q500,355 600,360 T800,360 T820,360" fill="none" stroke="rgba(34,211,238,0.05)" strokeWidth="1">
        <animate attributeName="d" values="M380,360 Q500,355 600,360 T800,360 T820,360;M380,360 Q500,365 600,360 T800,360 T820,360;M380,360 Q500,355 600,360 T800,360 T820,360" dur="6s" repeatCount="indefinite" />
      </path>

      {/* Building reflections in water (distorted) */}
      <rect x="30" y="320" width="50" height="60" fill="#1f2937" opacity="0.1" filter="url(#bg-waterReflect)" />
      <rect x="210" y="320" width="50" height="50" fill="#1e293b" opacity="0.08" filter="url(#bg-waterReflect)" />
      <rect x="910" y="320" width="55" height="60" fill="#1e293b" opacity="0.1" filter="url(#bg-waterReflect)" />
      <rect x="1030" y="320" width="50" height="55" fill="#1f2937" opacity="0.08" filter="url(#bg-waterReflect)" />

      {/* Neon reflections in water */}
      <ellipse cx="170" cy="340" rx="20" ry="15" fill="#f472b6" opacity="0.03" filter="url(#bg-waterReflect)" />
      <ellipse cx="290" cy="345" rx="15" ry="12" fill="#22d3ee" opacity="0.025" filter="url(#bg-waterReflect)" />
      <ellipse cx="937" cy="340" rx="20" ry="15" fill="#a855f7" opacity="0.025" filter="url(#bg-waterReflect)" />

      {/* ── Bridge ── */}
      {/* Bridge deck */}
      <rect x="380" y="272" width="440" height="12" rx="2" fill="#374151" />
      <rect x="380" y="270" width="440" height="4" fill="#4b5563" />
      {/* Bridge railing posts */}
      <rect x="400" y="255" width="4" height="18" fill="#6b7280" />
      <rect x="440" y="255" width="4" height="18" fill="#6b7280" />
      <rect x="480" y="255" width="4" height="18" fill="#6b7280" />
      <rect x="520" y="255" width="4" height="18" fill="#6b7280" />
      <rect x="560" y="255" width="4" height="18" fill="#6b7280" />
      <rect x="600" y="255" width="4" height="18" fill="#6b7280" />
      <rect x="640" y="255" width="4" height="18" fill="#6b7280" />
      <rect x="680" y="255" width="4" height="18" fill="#6b7280" />
      <rect x="720" y="255" width="4" height="18" fill="#6b7280" />
      <rect x="760" y="255" width="4" height="18" fill="#6b7280" />
      <rect x="796" y="255" width="4" height="18" fill="#6b7280" />
      {/* Railing bars */}
      <line x1="400" y1="258" x2="800" y2="258" stroke="#6b7280" strokeWidth="1.5" />
      <line x1="400" y1="264" x2="800" y2="264" stroke="#6b7280" strokeWidth="1" />

      {/* ── Street Lamps ── */}
      {/* Left lamp */}
      <rect x="348" y="225" width="4" height="85" fill="#4b5563" />
      <path d="M340,225 Q350,218 360,225" fill="none" stroke="#6b7280" strokeWidth="2" />
      <ellipse cx="350" cy="222" rx="10" ry="6" fill="#fbbf24" opacity="0.5" filter="url(#bg-lampGlow)" />
      <ellipse cx="350" cy="220" rx="5" ry="3" fill="#fef3c7" opacity="0.8" />
      {/* Lamp light cone */}
      <path d="M340,226 L320,310 L380,310 L360,226" fill="#fef3c7" opacity="0.02" />

      {/* Right lamp */}
      <rect x="848" y="225" width="4" height="85" fill="#4b5563" />
      <path d="M840,225 Q850,218 860,225" fill="none" stroke="#6b7280" strokeWidth="2" />
      <ellipse cx="850" cy="222" rx="10" ry="6" fill="#fbbf24" opacity="0.5" filter="url(#bg-lampGlow)" />
      <ellipse cx="850" cy="220" rx="5" ry="3" fill="#fef3c7" opacity="0.8" />
      <path d="M840,226 L820,310 L880,310 L860,226" fill="#fef3c7" opacity="0.02" />

      {/* Center bridge lamp */}
      <rect x="598" y="235" width="4" height="38" fill="#4b5563" />
      <ellipse cx="600" cy="232" rx="8" ry="5" fill="#22d3ee" opacity="0.4" filter="url(#bg-neonCyan)" />
      <ellipse cx="600" cy="231" rx="4" ry="2.5" fill="#ecfeff" opacity="0.6" />
    </svg>
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
            <li key={i} className="flex gap-2"><span className="text-cyan-400">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Protection pairs */}
      <div className="bg-cyan-500/10 border border-cyan-400/20 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">보호 관계</span>
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

      {/* SVG Illustration */}
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-white/5">
        <NightCityScene />
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
          <div className="absolute inset-0 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 200 400">
              <defs>
                <linearGradient id="bg-river-mid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f1728" />
                  <stop offset="50%" stopColor="#0a1020" />
                  <stop offset="100%" stopColor="#060a15" />
                </linearGradient>
              </defs>
              <rect width="200" height="400" fill="url(#bg-river-mid)" />
              <path d="M0,80 Q50,72 100,80 T200,80" fill="none" stroke="rgba(34,211,238,0.06)" strokeWidth="1.2">
                <animate attributeName="d" values="M0,80 Q50,72 100,80 T200,80;M0,80 Q50,88 100,80 T200,80;M0,80 Q50,72 100,80 T200,80" dur="4s" repeatCount="indefinite" />
              </path>
              <path d="M0,200 Q50,194 100,200 T200,200" fill="none" stroke="rgba(168,85,247,0.05)" strokeWidth="1">
                <animate attributeName="d" values="M0,200 Q50,194 100,200 T200,200;M0,200 Q50,206 100,200 T200,200;M0,200 Q50,194 100,200 T200,200" dur="5s" repeatCount="indefinite" />
              </path>
              <path d="M0,320 Q50,315 100,320 T200,320" fill="none" stroke="rgba(34,211,238,0.04)" strokeWidth="1">
                <animate attributeName="d" values="M0,320 Q50,315 100,320 T200,320;M0,320 Q50,325 100,320 T200,320;M0,320 Q50,315 100,320 T200,320" dur="6s" repeatCount="indefinite" />
              </path>
            </svg>
          </div>
          <motion.div
            animate={{ x: state.boatPosition === 'left' ? -15 : 15 }}
            transition={{ type: 'spring', stiffness: 100, damping: 18 }}
            className="relative z-10 animate-boat-rock"
          >
            <div
              className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-3 border border-cyan-500/20 shadow-2xl shadow-cyan-500/10"
            >
              <div className="text-xl text-center drop-shadow-lg">
                <svg width="32" height="22" viewBox="0 0 40 28" className="mx-auto">
                  <path d="M5,20 Q8,24 20,24 Q32,24 35,20 L32,12 Q28,8 20,8 Q12,8 8,12Z" fill="#475569" stroke="#334155" strokeWidth="1" />
                  <path d="M5,20 Q8,24 20,24 Q32,24 35,20" fill="none" stroke="#64748b" strokeWidth="1.5" />
                </svg>
              </div>
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
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 shadow-cyan-500/25 animate-pulse-button'
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
          <span className="font-bold text-cyan-400 tabular-nums">{puzzle.optimalSteps}</span>
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
      ? 'bg-gradient-to-b from-slate-800/90 to-slate-900/95'
      : 'bg-gradient-to-b from-slate-900/70 to-slate-950/80'
    }`}>
      {/* Subtle city texture */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
      }} />

      {/* Neon accent line at top */}
      {active && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      )}

      <span className="text-[11px] font-bold text-cyan-300/60 uppercase tracking-widest z-10">{label}</span>
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
                  ? 'bg-cyan-500/20 border border-cyan-400/40 ring-2 ring-cyan-400/30 shadow-lg shadow-cyan-500/15'
                  : entity.role === 'protector'
                    ? 'bg-white/10 backdrop-blur-md border border-cyan-400/20 shadow-lg shadow-black/10 hover:border-cyan-400/40'
                    : 'bg-white/10 backdrop-blur-md border border-white/10 shadow-lg shadow-black/10 hover:border-white/20'
                }`}
              >
                <span className="text-2xl drop-shadow-md">{entity.emoji}</span>
                <span className="text-[10px] font-semibold mt-0.5 text-slate-200">{entity.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full mt-0.5 font-semibold ${
                  entity.role === 'protector'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20'
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
