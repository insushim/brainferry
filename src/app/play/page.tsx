'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CATEGORIES } from '@/engines/types';
import { usePuzzleStore } from '@/stores/puzzle-store';

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function PlayPage() {
  const difficulty = usePuzzleStore((s) => s.currentDifficulty);
  const setDifficulty = usePuzzleStore((s) => s.setDifficulty);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Difficulty Selector */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6">퍼즐 카테고리</h1>
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 mb-6">
          <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-3">
            난이도: <span className="text-primary text-lg">{difficulty}</span> / 10
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="w-full h-2 bg-[var(--bg-secondary)] rounded-full appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
            <span>쉬움</span>
            <span>보통</span>
            <span>어려움</span>
            <span>극한</span>
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="initial"
        animate="animate"
        transition={{ staggerChildren: 0.05 }}
      >
        {CATEGORIES.map((cat) => (
          <motion.div key={cat.id} variants={staggerItem} transition={{ duration: 0.4 }}>
            <Link href={`/play/${cat.id}`}>
              <motion.div
                whileHover={{ scale: 1.03, y: -6 }}
                whileTap={{ scale: 0.97 }}
                className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 cursor-pointer hover:shadow-xl transition-shadow h-full"
                style={{ borderTopColor: cat.color, borderTopWidth: '3px' }}
              >
                <div className="text-5xl mb-4">{cat.emoji}</div>
                <h2 className="text-xl font-bold mb-2">{cat.name}</h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {cat.description}
                </p>
                <div className="mt-4 flex items-center gap-2 text-primary text-sm font-semibold">
                  플레이
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
