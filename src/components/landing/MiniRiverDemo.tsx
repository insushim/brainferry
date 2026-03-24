'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ENTITIES = [
  { id: 'farmer', emoji: '👨‍🌾', name: '농부' },
  { id: 'wolf', emoji: '🐺', name: '늑대' },
  { id: 'sheep', emoji: '🐑', name: '양' },
  { id: 'cabbage', emoji: '🥬', name: '양배추' },
];

export function MiniRiverDemo() {
  const [leftBank, setLeftBank] = useState(['farmer', 'wolf', 'sheep', 'cabbage']);
  const [rightBank, setRightBank] = useState<string[]>([]);
  const [boatPos, setBoatPos] = useState<'left' | 'right'>('left');
  const [boatContents, setBoatContents] = useState<string[]>([]);
  const [isMoving, setIsMoving] = useState(false);

  const getEntity = (id: string) => ENTITIES.find((e) => e.id === id)!;

  const currentBank = boatPos === 'left' ? leftBank : rightBank;

  const handleClickEntity = useCallback((id: string) => {
    if (isMoving) return;
    if (boatContents.includes(id)) {
      setBoatContents((prev) => prev.filter((e) => e !== id));
      if (boatPos === 'left') {
        setLeftBank((prev) => [...prev, id]);
      } else {
        setRightBank((prev) => [...prev, id]);
      }
    } else if (currentBank.includes(id)) {
      if (!boatContents.includes('farmer') && id !== 'farmer') return;
      if (boatContents.length >= 2) return;
      if (boatPos === 'left') {
        setLeftBank((prev) => prev.filter((e) => e !== id));
      } else {
        setRightBank((prev) => prev.filter((e) => e !== id));
      }
      setBoatContents((prev) => [...prev, id]);
    }
  }, [isMoving, boatContents, currentBank, boatPos]);

  const handleSail = useCallback(() => {
    if (isMoving || boatContents.length === 0 || !boatContents.includes('farmer')) return;
    setIsMoving(true);
    setTimeout(() => {
      const newPos = boatPos === 'left' ? 'right' as const : 'left' as const;
      if (newPos === 'right') {
        setRightBank((prev) => [...prev, ...boatContents]);
      } else {
        setLeftBank((prev) => [...prev, ...boatContents]);
      }
      setBoatContents([]);
      setBoatPos(newPos);
      setIsMoving(false);
    }, 800);
  }, [isMoving, boatContents, boatPos]);

  const handleReset = useCallback(() => {
    setLeftBank(['farmer', 'wolf', 'sheep', 'cabbage']);
    setRightBank([]);
    setBoatPos('left');
    setBoatContents([]);
    setIsMoving(false);
  }, []);

  const isComplete = leftBank.length === 0 && boatContents.length === 0;

  return (
    <div className="relative bg-[var(--card)] rounded-3xl border border-[var(--border)] p-6 shadow-2xl max-w-md mx-auto">
      <div className="text-center mb-4">
        <span className="text-sm font-semibold text-[var(--text-secondary)]">미니 체험</span>
      </div>

      <div className="flex items-stretch gap-2 min-h-[180px]">
        {/* Left Bank */}
        <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex flex-col items-center justify-center gap-2 min-w-[80px]">
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">이쪽</span>
          <div className="flex flex-wrap gap-1 justify-center">
            <AnimatePresence>
              {leftBank.map((id) => (
                <motion.button
                  key={id}
                  layout
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  onClick={() => boatPos === 'left' && handleClickEntity(id)}
                  className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-2xl cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  title={getEntity(id).name}
                >
                  {getEntity(id).emoji}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* River + Boat */}
        <div className="w-24 relative flex flex-col items-center justify-center">
          <div className="absolute inset-0 water-bg rounded-xl opacity-40" />
          <motion.div
            animate={{ y: boatPos === 'left' ? -30 : 30 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            className="relative z-10 bg-amber-800 rounded-lg px-2 py-2 flex flex-col items-center gap-1 animate-boat-rock"
          >
            <span className="text-lg">🚣</span>
            <div className="flex gap-0.5">
              {boatContents.map((id) => (
                <motion.button
                  key={id}
                  layout
                  onClick={() => handleClickEntity(id)}
                  className="w-8 h-8 rounded-full bg-amber-700/50 flex items-center justify-center text-base cursor-pointer"
                >
                  {getEntity(id).emoji}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Bank */}
        <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex flex-col items-center justify-center gap-2 min-w-[80px]">
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">저쪽</span>
          <div className="flex flex-wrap gap-1 justify-center">
            <AnimatePresence>
              {rightBank.map((id) => (
                <motion.button
                  key={id}
                  layout
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  onClick={() => boatPos === 'right' && handleClickEntity(id)}
                  className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-2xl cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  title={getEntity(id).name}
                >
                  {getEntity(id).emoji}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-center mt-4">
        <button
          onClick={handleSail}
          disabled={isMoving || boatContents.length === 0 || !boatContents.includes('farmer')}
          className="px-4 py-2 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-40 hover:bg-primary-dark transition-colors"
        >
          출발!
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold text-sm hover:bg-[var(--border)] transition-colors"
        >
          초기화
        </button>
      </div>

      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-3xl backdrop-blur-sm z-20"
          >
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-white font-bold text-lg">성공!</p>
              <button
                onClick={handleReset}
                className="mt-3 px-4 py-2 bg-white text-black rounded-xl font-semibold text-sm"
              >
                다시하기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
