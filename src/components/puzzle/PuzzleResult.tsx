'use client';

import { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Star, Trophy, Clock, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAudio } from '@/hooks/useAudio';
import { STAR_THRESHOLDS } from '@/lib/utils/constants';

interface PuzzleResultProps {
  steps: number;
  optimalSteps: number;
  elapsedTime: number;
  onNewPuzzle: () => void;
  onBack: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function computeStars(steps: number, optimal: number): number {
  if (optimal === 0) return 3;
  const ratio = steps / optimal;
  if (ratio <= STAR_THRESHOLDS.three) return 3;
  if (ratio <= STAR_THRESHOLDS.two) return 2;
  if (ratio <= STAR_THRESHOLDS.one) return 1;
  return 1;
}

const CONFETTI_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

export function PuzzleResult({ steps, optimalSteps, elapsedTime, onNewPuzzle, onBack }: PuzzleResultProps) {
  const { playSuccess } = useAudio();
  const stars = useMemo(() => computeStars(steps, optimalSteps), [steps, optimalSteps]);

  // Play success sound on mount
  useMemo(() => {
    playSuccess();
  }, [playSuccess]);

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 2}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 8,
        duration: `${2 + Math.random() * 2}s`,
      })),
    [],
  );

  const handleShare = useCallback(async () => {
    const text = `BrainFerry 퍼즐 클리어!\n${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}\n이동: ${steps}/${optimalSteps}\n시간: ${formatTime(elapsedTime)}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback - do nothing
    }
  }, [stars, steps, optimalSteps, elapsedTime]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Confetti */}
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece rounded-sm"
          style={{
            left: piece.left,
            backgroundColor: piece.color,
            width: piece.size,
            height: piece.size,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
          }}
        />
      ))}

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative z-10 bg-[var(--card)] rounded-3xl border border-[var(--border)] p-8 max-w-sm w-full text-center shadow-2xl"
      >
        <div className="mb-6">
          <Trophy className="w-12 h-12 text-warning mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-2">퍼즐 완료!</h2>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="animate-star-pop"
              style={{ animationDelay: `${i * 0.2}s`, opacity: 0 }}
            >
              <Star
                className={`w-10 h-10 ${
                  i <= stars ? 'text-warning fill-warning' : 'text-[var(--border)]'
                }`}
              />
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
            <div className="text-sm text-[var(--text-secondary)] mb-1">이동 횟수</div>
            <div className="text-xl font-bold">
              {steps} <span className="text-sm font-normal text-[var(--text-secondary)]">/ {optimalSteps}</span>
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
            <div className="text-sm text-[var(--text-secondary)] mb-1 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> 소요 시간
            </div>
            <div className="text-xl font-bold">{formatTime(elapsedTime)}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button onClick={onNewPuzzle} size="md" className="w-full">
            새 퍼즐
          </Button>
          <Link href={onBack} className="w-full">
            <Button variant="secondary" size="md" className="w-full">
              카테고리로 돌아가기
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleShare} className="w-full gap-2">
            <Share2 className="w-4 h-4" />
            결과 공유
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
