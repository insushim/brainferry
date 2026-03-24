'use client';

import { useMemo, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Share2, RotateCw, Home, Clock } from 'lucide-react';
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

const CONFETTI_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];
const CONFETTI_SHAPES = ['circle', 'rect', 'star'] as const;

function getRandomShape() {
  return CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)];
}

/* SVG star with golden gradient */
function StarIcon({ filled, index }: { filled: boolean; index: number }) {
  const id = `star-grad-${index}`;
  return (
    <motion.div
      initial={{ scale: 0, rotate: -30, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{
        delay: 0.8 + index * 0.25,
        type: 'spring',
        stiffness: 400,
        damping: 15,
      }}
      className={filled ? 'animate-star-glow' : ''}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
        {filled && (
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FCD34D" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
        )}
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill={filled ? `url(#${id})` : 'none'}
          stroke={filled ? '#D97706' : 'var(--border)'}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}

export function PuzzleResult({ steps, optimalSteps, elapsedTime, onNewPuzzle, onBack }: PuzzleResultProps) {
  const { playSuccess } = useAudio();
  const stars = useMemo(() => computeStars(steps, optimalSteps), [steps, optimalSteps]);
  const [displaySteps, setDisplaySteps] = useState(0);
  const [copied, setCopied] = useState(false);

  // Play success sound on mount
  useEffect(() => {
    playSuccess();
  }, [playSuccess]);

  // Animated step counter
  useEffect(() => {
    if (steps === 0) { setDisplaySteps(0); return; }
    const duration = 800;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplaySteps(Math.round(eased * steps));
      if (progress < 1) requestAnimationFrame(animate);
    };
    const timer = setTimeout(() => requestAnimationFrame(animate), 1200);
    return () => clearTimeout(timer);
  }, [steps]);

  // Generate confetti pieces (60+)
  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 1.5}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 14,
        duration: `${2.5 + Math.random() * 2.5}s`,
        shape: getRandomShape(),
        rotation: Math.random() * 360,
      })),
    [],
  );

  const handleShare = useCallback(async () => {
    const text = `BrainFerry 퍼즐 클리어!\n${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}\n이동: ${steps}/${optimalSteps}\n시간: ${formatTime(elapsedTime)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback - do nothing
    }
  }, [stars, steps, optimalSteps, elapsedTime]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />

      {/* Confetti burst */}
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: piece.left,
            backgroundColor: piece.color,
            width: piece.size,
            height: piece.shape === 'rect' ? piece.size * 0.6 : piece.size,
            borderRadius: piece.shape === 'circle' ? '50%' : piece.shape === 'star' ? '2px' : '2px',
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            transform: `rotate(${piece.rotation}deg)`,
          }}
        />
      ))}

      {/* Result Card */}
      <motion.div
        initial={{ scale: 0.8, y: 60, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, y: 60, opacity: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 25 }}
        className="relative z-10 glass-card rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl"
      >
        {/* Title */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-5"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-1">퍼즐 완료!</h2>
          <p className="text-sm text-[var(--text-secondary)]">축하합니다</p>
        </motion.div>

        {/* Stars */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2].map((i) => (
            <StarIcon key={i} filled={i < stars} index={i} />
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl p-4"
          >
            <div className="text-xs text-[var(--text-secondary)] mb-1">이동 횟수</div>
            <div className="text-2xl font-bold tabular-nums">
              {displaySteps}
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">
              최적: <span className="font-semibold text-primary">{optimalSteps}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.7 }}
            className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl p-4"
          >
            <div className="text-xs text-[var(--text-secondary)] mb-1 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> 소요 시간
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums">
              {formatTime(elapsedTime)}
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9 }}
          className="grid grid-cols-2 gap-2.5"
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onNewPuzzle}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all"
          >
            <RotateCw className="w-4 h-4" />
            새 퍼즐
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--border)] font-semibold text-sm transition-all border border-[var(--border)]"
          >
            <Share2 className="w-4 h-4" />
            {copied ? '복사됨!' : '공유'}
          </motion.button>

          <Link href={onBack} className="col-span-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl hover:bg-[var(--bg-secondary)] font-semibold text-sm text-[var(--text-secondary)] transition-all"
            >
              <Home className="w-4 h-4" />
              카테고리로 돌아가기
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

