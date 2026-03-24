'use client';

import { type ReactNode, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  Lightbulb,
  Clock,
  ChevronLeft,
  Undo2,
  Sparkles,
  ChevronDown,
  Settings,
  X,
  BookOpen,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePuzzleStore } from '@/stores/puzzle-store';
import { useAudio } from '@/hooks/useAudio';
import { PuzzleResult } from '@/components/puzzle/PuzzleResult';
import { DIFFICULTY_LABELS, MAX_FREE_DAILY_HINTS } from '@/lib/utils/constants';
import type { CategoryInfo } from '@/engines/types';

interface PuzzleShellProps {
  categoryInfo: CategoryInfo;
  children: ReactNode;
  story?: string;
  rules?: string[];
  hints?: string[];
  variant?: string;
  result: { steps: number; optimal: number } | null;
  failReason: string | null;
  onNewPuzzle: () => void;
  onReset: () => void;
  onUndo?: () => void;
  onDismissFail: () => void;
}

const VARIANT_LABELS: Record<string, string> = {
  // river-crossing
  'basic': '기본',
  'weight-limit': '무게 제한',
  'one-way': '일방통행',
  'two-boats': '두 척 보트',
  'island': '섬 경유',
  // escort-mission
  'vip-escort': 'VIP 호위',
  'traitor': '배신자',
  'three-groups': '3그룹',
  // bridge-torch
  'bridge-durability': '다리 내구도',
  'two-bridges': '두 개 다리',
  'battery-drain': '배터리 소모',
  // water-jug
  'basic-2': '2통 기본',
  'basic-3': '3통 기본',
  'leaky': '누수',
  'mixing': '혼합 금지',
  // tower-hanoi
  'classic': '클래식',
  'color-restrict': '색상 제한',
  'detour': '우회',
  'dual-tower': '듀얼 타워',
  // bodyguard
  'exclusive': '배타적',
  'double-agent': '이중 스파이',
  'hierarchy': '계층 구조',
  // logic-grid
  'ordering': '순서 배치',
  'liar': '거짓말쟁이',
  'conditional': '조건부',
  // switch-light
  'toggle-chain': '연쇄 토글',
  'timer': '타이머',
  'sequence': '시퀀스',
  // balance-scale
  'unknown-weight': '미지 무게',
  'multiple-fake': '다중 가짜',
  'broken-scale': '고장 저울',
  // sequence-sort
  'limited-ops': '제한 연산',
  'blind': '블라인드',
  'multi-target': '다중 목표',
};

const VARIANT_EMOJIS: Record<string, string> = {
  'basic': '',
  'weight-limit': '⚖️',
  'one-way': '⚡',
  'two-boats': '🚣',
  'island': '🏝️',
  'vip-escort': '👑',
  'traitor': '🗡️',
  'three-groups': '👥',
  'bridge-durability': '🔨',
  'two-bridges': '🌉',
  'battery-drain': '🔋',
  'basic-2': '',
  'basic-3': '',
  'leaky': '💧',
  'mixing': '🎨',
  'classic': '',
  'color-restrict': '🎨',
  'detour': '🔄',
  'dual-tower': '🏗️',
  'exclusive': '🚫',
  'double-agent': '🕵️',
  'hierarchy': '📊',
  'ordering': '📐',
  'liar': '🤥',
  'conditional': '❓',
  'toggle-chain': '🔗',
  'timer': '⏱️',
  'sequence': '🔢',
  'unknown-weight': '❓',
  'multiple-fake': '💰',
  'broken-scale': '🔧',
  'limited-ops': '🔒',
  'blind': '🙈',
  'multi-target': '🎯',
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function PuzzleShell({
  categoryInfo,
  children,
  story,
  rules,
  hints,
  variant,
  result,
  failReason,
  onNewPuzzle,
  onReset,
  onUndo,
  onDismissFail,
}: PuzzleShellProps) {
  const elapsedTime = usePuzzleStore((s) => s.elapsedTime);
  const difficulty = usePuzzleStore((s) => s.currentDifficulty);
  const setDifficulty = usePuzzleStore((s) => s.setDifficulty);
  const showHint = usePuzzleStore((s) => s.showHint);
  const currentHintIndex = usePuzzleStore((s) => s.currentHintIndex);
  const hintsUsed = usePuzzleStore((s) => s.hintsUsed);
  const useHintAction = usePuzzleStore((s) => s.useHint);
  const hideHint = usePuzzleStore((s) => s.hideHint);
  const { playClick, playHint } = useAudio();

  const [storyOpen, setStoryOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const diffLabel = DIFFICULTY_LABELS[difficulty] || `레벨 ${difficulty}`;

  const variantLabel = variant && variant !== 'basic' && variant !== 'classic'
    ? VARIANT_LABELS[variant] || variant
    : null;
  const variantEmoji = variant ? (VARIANT_EMOJIS[variant] || '') : '';

  const handleHint = useCallback(() => {
    playHint();
    if (showHint) {
      hideHint();
    } else {
      useHintAction();
    }
  }, [showHint, hideHint, useHintAction, playHint]);

  const handleReset = useCallback(() => {
    playClick();
    onReset();
  }, [playClick, onReset]);

  const handleNewPuzzle = useCallback(() => {
    playClick();
    onNewPuzzle();
  }, [playClick, onNewPuzzle]);

  const handleUndo = useCallback(() => {
    playClick();
    onUndo?.();
  }, [playClick, onUndo]);

  const timeDisplay = useMemo(() => formatTime(elapsedTime), [elapsedTime]);
  const colonVisible = elapsedTime % 2 === 0;

  // Split rules into constraint rules (containing emoji) and general rules
  const { generalRules, constraintRules } = useMemo(() => {
    if (!rules) return { generalRules: [], constraintRules: [] };
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;
    const constraint: string[] = [];
    const general: string[] = [];
    for (const rule of rules) {
      // Rules with predator/prey patterns or warning emoji go to constraints
      if (rule.startsWith('\u26A0\uFE0F') || (rule.includes('\uC744(\uB97C)') && emojiRegex.test(rule))) {
        constraint.push(rule);
      } else {
        general.push(rule);
      }
    }
    return { generalRules: general, constraintRules: constraint };
  }, [rules]);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 pb-24 sm:pb-28">
      {/* ── Sticky Top Bar ── */}
      <div className="sticky top-0 z-40 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-3 pb-2 mb-4">
        <div className="glass-card rounded-2xl px-4 py-3 shadow-lg shadow-black/5">
          {/* Row 1: Nav + Title + Timer */}
          <div className="flex items-center gap-3">
            <Link
              href="/play"
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--border)] transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)]" />
            </Link>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xl">{categoryInfo.emoji}</span>
              <h1 className="text-base sm:text-lg font-bold truncate">{categoryInfo.name}</h1>
              <span
                className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: categoryInfo.color }}
              >
                {diffLabel}
              </span>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-1.5 font-mono text-base sm:text-lg font-bold text-[var(--text)]">
              <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
              <span>{timeDisplay.slice(0, 2)}</span>
              <span className={colonVisible ? 'opacity-100' : 'opacity-30'}>:</span>
              <span>{timeDisplay.slice(3)}</span>
            </div>

            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Settings dropdown ── */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="glass-card rounded-2xl p-4 shadow-lg shadow-black/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold">난이도 설정</span>
                <button onClick={() => setSettingsOpen(false)}>
                  <X className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--text-secondary)] font-medium whitespace-nowrap min-w-[60px]">
                  {diffLabel}
                </span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={difficulty}
                  onChange={(e) => setDifficulty(Number(e.target.value))}
                  className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full appearance-none cursor-pointer accent-primary"
                />
                <span className="text-sm font-mono font-bold w-6 text-center">{difficulty}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Story Section (collapsible) ── */}
      <div className="mb-4">
        <button
          onClick={() => setStoryOpen(!storyOpen)}
          className="w-full flex items-center gap-2 text-left mb-1"
        >
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-500 to-purple-600" />
          <span className="text-sm font-bold flex-1">이야기 & 규칙</span>
          {variantLabel && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              {variantEmoji} {variantLabel}
            </span>
          )}
          <motion.div animate={{ rotate: storyOpen ? 180 : 0 }}>
            <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {storyOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="glass-card rounded-2xl p-4 border-l-4 border-l-blue-500 space-y-3">
                {/* Story */}
                {story ? (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">이야기</span>
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--text)]">
                      {story}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">
                    퍼즐 보드 위의 이야기를 확인하세요
                  </p>
                )}

                {/* General Rules */}
                {generalRules.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">규칙</span>
                    </div>
                    <ul className="space-y-1">
                      {generalRules.map((rule, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text)]">
                          <span className="text-emerald-500 mt-0.5 shrink-0">{'•'}</span>
                          <span className="leading-relaxed">{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Constraint Rules (danger zone) */}
                {constraintRules.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs font-bold text-red-500 dark:text-red-400">위험 조합</span>
                    </div>
                    <ul className="space-y-1">
                      {constraintRules.map((rule, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text)]">
                          <span className="text-red-400 mt-0.5 shrink-0">{'•'}</span>
                          <span className="leading-relaxed">{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Hint Panel ── */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-400/30 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                  힌트 #{currentHintIndex + 1}
                </span>
                <span className="text-xs text-[var(--text-secondary)] ml-auto">
                  {hintsUsed}/{MAX_FREE_DAILY_HINTS}
                </span>
              </div>
              {hints && hints.length > 0 ? (
                <p className="text-sm text-[var(--text)]">
                  {hints[currentHintIndex % hints.length]}
                </p>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  힌트가 퍼즐 내부에서 제공됩니다. 보드 위 힌트를 확인하세요.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fail Banner ── */}
      <AnimatePresence>
        {failReason && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="mb-4"
          >
            <div className="bg-gradient-to-r from-red-500/15 to-red-400/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between backdrop-blur-sm">
              <p className="text-red-500 dark:text-red-400 font-semibold text-sm flex-1">{failReason}</p>
              <div className="flex gap-2 ml-3 shrink-0">
                <button
                  onClick={onDismissFail}
                  className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-500 text-xs font-semibold hover:bg-red-500/30 transition-colors"
                >
                  닫기
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                >
                  다시 시도
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Puzzle Board ── */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 shadow-xl shadow-black/5">
        {children}
      </div>

      {/* ── Fixed Bottom Toolbar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-3 sm:px-4 pb-3 pt-2">
        <div className="max-w-5xl mx-auto">
          <div className="glass-card rounded-2xl px-2 py-2 shadow-xl shadow-black/10 flex items-center justify-around gap-1">
            <ToolbarButton
              icon={<Lightbulb className="w-5 h-5" />}
              label="힌트"
              badge={`${hintsUsed}/${MAX_FREE_DAILY_HINTS}`}
              onClick={handleHint}
              active={showHint}
            />
            {onUndo && (
              <ToolbarButton
                icon={<Undo2 className="w-5 h-5" />}
                label="되돌리기"
                onClick={handleUndo}
              />
            )}
            <ToolbarButton
              icon={<RotateCcw className="w-5 h-5" />}
              label="리셋"
              onClick={handleReset}
            />
            <ToolbarButton
              icon={<Sparkles className="w-5 h-5" />}
              label="새퍼즐"
              onClick={handleNewPuzzle}
            />
          </div>
        </div>
      </div>

      {/* ── Result Modal ── */}
      <AnimatePresence>
        {result && (
          <PuzzleResult
            steps={result.steps}
            optimalSteps={result.optimal}
            elapsedTime={elapsedTime}
            onNewPuzzle={handleNewPuzzle}
            onBack="/play"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Toolbar Button ── */
function ToolbarButton({
  icon,
  label,
  badge,
  onClick,
  active,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  badge?: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex flex-col items-center justify-center gap-0.5
        min-w-[56px] h-14 rounded-xl transition-all duration-200
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${active
          ? 'bg-primary/15 text-primary'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
        }
      `}
    >
      {icon}
      <span className="text-[10px] font-semibold leading-none">{label}</span>
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.5 rounded-full bg-primary text-white text-[8px] font-bold leading-none">
          {badge}
        </span>
      )}
    </motion.button>
  );
}
