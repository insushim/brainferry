'use client';

import { type ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Lightbulb, RefreshCw, Clock, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePuzzleStore } from '@/stores/puzzle-store';
import { useAudio } from '@/hooks/useAudio';
import { Button } from '@/components/ui/Button';
import { PuzzleResult } from '@/components/puzzle/PuzzleResult';
import { DIFFICULTY_LABELS } from '@/lib/utils/constants';
import type { CategoryInfo } from '@/engines/types';

interface PuzzleShellProps {
  categoryInfo: CategoryInfo;
  children: ReactNode;
  result: { steps: number; optimal: number } | null;
  failReason: string | null;
  onNewPuzzle: () => void;
  onReset: () => void;
  onDismissFail: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function PuzzleShell({
  categoryInfo,
  children,
  result,
  failReason,
  onNewPuzzle,
  onReset,
  onDismissFail,
}: PuzzleShellProps) {
  const elapsedTime = usePuzzleStore((s) => s.elapsedTime);
  const difficulty = usePuzzleStore((s) => s.currentDifficulty);
  const setDifficulty = usePuzzleStore((s) => s.setDifficulty);
  const showHint = usePuzzleStore((s) => s.showHint);
  const currentHintIndex = usePuzzleStore((s) => s.currentHintIndex);
  const useHintAction = usePuzzleStore((s) => s.useHint);
  const hideHint = usePuzzleStore((s) => s.hideHint);
  const { playClick, playHint } = useAudio();

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

  const diffLabel = DIFFICULTY_LABELS[difficulty] || `레벨 ${difficulty}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link href="/play" className="text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{categoryInfo.emoji}</span>
          <h1 className="text-xl font-bold">{categoryInfo.name}</h1>
        </div>
        <span
          className="px-3 py-1 rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: categoryInfo.color }}
        >
          {diffLabel}
        </span>
        <div className="ml-auto flex items-center gap-2 text-[var(--text-secondary)]">
          <Clock className="w-4 h-4" />
          <span className="font-mono text-sm">{formatTime(elapsedTime)}</span>
        </div>
      </div>

      {/* Difficulty slider */}
      <div className="mb-4 flex items-center gap-4">
        <label className="text-sm text-[var(--text-secondary)] font-medium whitespace-nowrap">
          난이도 {difficulty}
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          className="flex-1 h-1.5 bg-[var(--bg-secondary)] rounded-full appearance-none cursor-pointer accent-primary"
        />
      </div>

      {/* Control buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="secondary" size="sm" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" />
          초기화
        </Button>
        <Button variant="secondary" size="sm" onClick={handleHint}>
          <Lightbulb className="w-4 h-4" />
          힌트
        </Button>
        <Button variant="secondary" size="sm" onClick={handleNewPuzzle}>
          <RefreshCw className="w-4 h-4" />
          새 퍼즐
        </Button>
      </div>

      {/* Hint panel */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-warning" />
                <span className="font-semibold text-warning text-sm">힌트 #{currentHintIndex + 1}</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                힌트가 퍼즐 내부에서 제공됩니다. 보드 위 힌트를 확인하세요.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fail banner */}
      <AnimatePresence>
        {failReason && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6"
          >
            <div className="bg-error/10 border border-error/30 rounded-xl p-4 flex items-center justify-between animate-shake">
              <p className="text-error font-semibold text-sm">{failReason}</p>
              <button
                onClick={onDismissFail}
                className="text-error hover:text-error/70 text-sm font-medium ml-4"
              >
                닫기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Puzzle board */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 sm:p-6">
        {children}
      </div>

      {/* Result modal */}
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
