'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CATEGORIES, type CategoryId } from '@/engines/types';
import { ChevronRight, Sparkles } from 'lucide-react';

/* ─── Difficulty Labels ─── */

const DIFFICULTY_LABELS: Record<number, string> = {
  1: '매우 쉬움',
  2: '쉬움',
  3: '약간 쉬움',
  4: '보통 이하',
  5: '보통',
  6: '약간 어려움',
  7: '어려움',
  8: '매우 어려움',
  9: '극한',
  10: '지옥',
};

/* ─── Animation Variants ─── */

const containerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 24, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

/* ─── Difficulty Dot Selector ─── */

function DifficultySelector({
  value,
  onChange,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div className="mt-4 pt-4 border-t border-[var(--border)]/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">난이도</span>
        <span className="text-xs font-bold" style={{ color }}>
          {DIFFICULTY_LABELS[value]}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((dot) => (
          <button
            key={dot}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(dot);
            }}
            className={`difficulty-dot ${dot <= value ? 'active' : ''}`}
            style={{ '--dot-color': color } as React.CSSProperties}
            aria-label={`난이도 ${dot}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-[var(--text-secondary)]">쉬움</span>
        <span className="text-[10px] text-[var(--text-secondary)]">어려움</span>
      </div>
    </div>
  );
}

/* ─── Daily Challenge Card ─── */

function DailyChallenge({ difficulties }: { difficulties: Record<CategoryId, number> }) {
  // Pseudo-random daily category based on date
  const dailyCategory = useMemo(() => {
    const today = new Date();
    const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % CATEGORIES.length;
    return CATEGORIES[dayIndex];
  }, []);

  const diff = difficulties[dailyCategory.id] || 5;

  return (
    <Link href={`/play/${dailyCategory.id}?difficulty=${diff}`}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01, y: -2 }}
        className="relative glass-card rounded-2xl p-6 overflow-hidden cursor-pointer card-hover-lift"
        style={{ borderLeftColor: dailyCategory.color, borderLeftWidth: '4px' }}
      >
        {/* Subtle background glow */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            background: `radial-gradient(ellipse at 30% 50%, ${dailyCategory.color}, transparent 70%)`,
          }}
        />

        <div className="relative flex items-center gap-4">
          <div className="text-5xl animate-float">{dailyCategory.emoji}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">오늘의 퍼즐</span>
            </div>
            <h2 className="text-xl font-bold">{dailyCategory.name}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{dailyCategory.description}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-primary font-semibold">
            도전하기
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

/* ─── Main Page ─── */

export default function PlayPage() {
  const [difficulties, setDifficulties] = useState<Record<CategoryId, number>>(
    () => Object.fromEntries(CATEGORIES.map((c) => [c.id, 1])) as Record<CategoryId, number>
  );

  const setDifficulty = (catId: CategoryId, value: number) => {
    setDifficulties((prev) => ({ ...prev, [catId]: value }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">퍼즐 카테고리</h1>
        <p className="text-[var(--text-secondary)]">카테고리를 선택하고 난이도를 설정하세요</p>
      </motion.div>

      {/* Daily Challenge */}
      <div className="mb-8">
        <DailyChallenge difficulties={difficulties} />
      </div>

      {/* Category Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {CATEGORIES.map((cat) => (
          <motion.div
            key={cat.id}
            variants={itemVariants}
            transition={{ duration: 0.4 }}
          >
            <div
              className="glass-card rounded-2xl p-6 h-full group relative overflow-hidden card-hover-lift"
              style={{ borderLeftColor: cat.color, borderLeftWidth: '3px' }}
            >
              {/* Background glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 50% 50%, ${cat.color}, transparent 70%)`,
                }}
              />

              <div className="relative">
                {/* Emoji + Name */}
                <div className="flex items-start gap-4 mb-3">
                  <motion.div
                    className="text-5xl"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity, delay: CATEGORIES.indexOf(cat) * 0.2 }}
                  >
                    {cat.emoji}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold mb-1">{cat.name}</h2>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                </div>

                {/* Per-card Difficulty Selector */}
                <DifficultySelector
                  value={difficulties[cat.id]}
                  onChange={(v) => setDifficulty(cat.id, v)}
                  color={cat.color}
                />

                {/* Play Button */}
                <Link href={`/play/${cat.id}?difficulty=${difficulties[cat.id]}`}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.97 }}
                    className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white cursor-pointer transition-all btn-ripple min-h-[44px]"
                    style={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.color}dd)` }}
                  >
                    시작하기
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
