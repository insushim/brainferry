'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const ENTITIES = [
  { id: 'farmer', emoji: '👨‍🌾', name: '농부' },
  { id: 'wolf', emoji: '🐺', name: '늑대' },
  { id: 'sheep', emoji: '🐑', name: '양' },
  { id: 'cabbage', emoji: '🥬', name: '양배추' },
];

// Conflict rules: if farmer is absent, wolf eats sheep, sheep eats cabbage
const CONFLICTS: [string, string][] = [
  ['wolf', 'sheep'],
  ['sheep', 'cabbage'],
];

function checkConflict(bank: string[]): boolean {
  if (bank.includes('farmer')) return false;
  return CONFLICTS.some(([a, b]) => bank.includes(a) && bank.includes(b));
}

export function MiniRiverDemo() {
  const [leftBank, setLeftBank] = useState(['farmer', 'wolf', 'sheep', 'cabbage']);
  const [rightBank, setRightBank] = useState<string[]>([]);
  const [boatPos, setBoatPos] = useState<'left' | 'right'>('left');
  const [boatContents, setBoatContents] = useState<string[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  const getEntity = (id: string) => ENTITIES.find((e) => e.id === id)!;

  const currentBank = boatPos === 'left' ? leftBank : rightBank;

  const handleClickEntity = useCallback((id: string) => {
    if (isMoving || isFailed) return;

    if (boatContents.includes(id)) {
      // Remove from boat back to current bank
      setBoatContents((prev) => prev.filter((e) => e !== id));
      if (boatPos === 'left') {
        setLeftBank((prev) => [...prev, id]);
      } else {
        setRightBank((prev) => [...prev, id]);
      }
    } else if (currentBank.includes(id)) {
      // Add to boat
      if (!boatContents.includes('farmer') && id !== 'farmer') return;
      if (boatContents.length >= 2) return;
      if (boatPos === 'left') {
        setLeftBank((prev) => prev.filter((e) => e !== id));
      } else {
        setRightBank((prev) => prev.filter((e) => e !== id));
      }
      setBoatContents((prev) => [...prev, id]);
    }
  }, [isMoving, isFailed, boatContents, currentBank, boatPos]);

  const handleSail = useCallback(() => {
    if (isMoving || boatContents.length === 0 || !boatContents.includes('farmer') || isFailed) return;
    setIsMoving(true);
    setMoveCount((p) => p + 1);

    setTimeout(() => {
      const newPos = boatPos === 'left' ? 'right' as const : 'left' as const;
      let newLeft = [...leftBank];
      let newRight = [...rightBank];

      if (newPos === 'right') {
        newRight = [...newRight, ...boatContents];
      } else {
        newLeft = [...newLeft, ...boatContents];
      }

      // Check for conflicts on the bank we're leaving
      const leavingBank = newPos === 'right' ? newLeft : newRight;
      if (checkConflict(leavingBank)) {
        setIsFailed(true);
      }

      setLeftBank(newLeft);
      setRightBank(newRight);
      setBoatContents([]);
      setBoatPos(newPos);
      setIsMoving(false);
    }, 700);
  }, [isMoving, boatContents, boatPos, leftBank, rightBank, isFailed]);

  const handleReset = useCallback(() => {
    setLeftBank(['farmer', 'wolf', 'sheep', 'cabbage']);
    setRightBank([]);
    setBoatPos('left');
    setBoatContents([]);
    setIsMoving(false);
    setIsFailed(false);
    setMoveCount(0);
  }, []);

  const isComplete = rightBank.length === 4 && boatContents.length === 0 && !isFailed;

  return (
    <div className="relative glass-card rounded-3xl p-5 sm:p-6 shadow-2xl max-w-md mx-auto overflow-hidden">
      {/* Floating decorative particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="particle text-blue-400/20 text-xs" style={{ left: '10%', top: '20%', '--particle-duration': '6s', '--particle-delay': '0s', '--drift-x': '20px' } as React.CSSProperties}>~</div>
        <div className="particle text-blue-400/20 text-xs" style={{ left: '80%', top: '60%', '--particle-duration': '8s', '--particle-delay': '2s', '--drift-x': '-30px' } as React.CSSProperties}>~</div>
      </div>

      {/* Header */}
      <div className="text-center mb-4 relative">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          🎮 미니 체험 — 강건너기
        </span>
        {moveCount > 0 && !isComplete && !isFailed && (
          <span className="ml-2 text-xs text-[var(--text-secondary)]">{moveCount}수</span>
        )}
      </div>

      {/* Game Board */}
      <div className="flex items-stretch gap-2 min-h-[180px]">
        {/* Left Bank */}
        <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex flex-col items-center justify-center gap-2 min-w-[80px]">
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">이쪽</span>
          <div className="flex flex-wrap gap-1.5 justify-center">
            <AnimatePresence>
              {leftBank.map((id) => (
                <motion.button
                  key={id}
                  layout
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileHover={boatPos === 'left' ? { scale: 1.15 } : undefined}
                  whileTap={boatPos === 'left' ? { scale: 0.9 } : undefined}
                  onClick={() => boatPos === 'left' && handleClickEntity(id)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all min-w-[44px] min-h-[44px] ${
                    boatPos === 'left'
                      ? 'cursor-pointer bg-[var(--bg-secondary)] hover:ring-2 hover:ring-primary entity-glow'
                      : 'cursor-default bg-[var(--bg-secondary)]/50 opacity-60'
                  }`}
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
          <div className="absolute inset-0 water-premium rounded-xl" />
          {/* Wave overlay */}
          <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
            <div className="absolute inset-x-0 top-1/4 h-px bg-white/10 animate-wave" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/10 animate-wave" style={{ animationDelay: '0.5s' }} />
            <div className="absolute inset-x-0 top-3/4 h-px bg-white/10 animate-wave" style={{ animationDelay: '1s' }} />
          </div>

          <motion.div
            animate={{ y: boatPos === 'left' ? -30 : 30 }}
            transition={{ type: 'spring', stiffness: 120, damping: 15 }}
            className="relative z-10 bg-gradient-to-b from-amber-700 to-amber-900 rounded-lg px-2 py-2 flex flex-col items-center gap-1 animate-boat-rock shadow-lg"
          >
            <span className="text-lg">🚣</span>
            <div className="flex gap-0.5">
              <AnimatePresence>
                {boatContents.map((id) => (
                  <motion.button
                    key={id}
                    layout
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => handleClickEntity(id)}
                    className="w-8 h-8 rounded-full bg-amber-600/40 flex items-center justify-center text-base cursor-pointer min-w-[32px] min-h-[32px]"
                  >
                    {getEntity(id).emoji}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Right Bank */}
        <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex flex-col items-center justify-center gap-2 min-w-[80px]">
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">저쪽</span>
          <div className="flex flex-wrap gap-1.5 justify-center">
            <AnimatePresence>
              {rightBank.map((id) => (
                <motion.button
                  key={id}
                  layout
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileHover={boatPos === 'right' ? { scale: 1.15 } : undefined}
                  whileTap={boatPos === 'right' ? { scale: 0.9 } : undefined}
                  onClick={() => boatPos === 'right' && handleClickEntity(id)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all min-w-[44px] min-h-[44px] ${
                    boatPos === 'right'
                      ? 'cursor-pointer bg-[var(--bg-secondary)] hover:ring-2 hover:ring-primary entity-glow'
                      : 'cursor-default bg-[var(--bg-secondary)]/50 opacity-60'
                  }`}
                  title={getEntity(id).name}
                >
                  {getEntity(id).emoji}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 justify-center mt-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSail}
          disabled={isMoving || boatContents.length === 0 || !boatContents.includes('farmer') || isFailed}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-semibold text-sm disabled:opacity-30 transition-all btn-ripple btn-glow-blue min-h-[44px]"
        >
          출발! 🚣
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleReset}
          className="px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold text-sm hover:bg-[var(--border)] transition-colors min-h-[44px]"
        >
          초기화
        </motion.button>
      </div>

      {/* Success Overlay */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center rounded-3xl backdrop-blur-md z-20"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-center p-6"
            >
              <motion.div
                className="text-6xl mb-3"
                animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                🎉
              </motion.div>
              <p className="text-white font-bold text-xl mb-1">성공!</p>
              <p className="text-white/70 text-sm mb-4">{moveCount}수 만에 클리어</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 bg-white text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors min-h-[44px]"
                >
                  다시 하기
                </button>
                <Link
                  href="/play"
                  className="px-5 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-semibold text-sm text-center hover:opacity-90 transition-opacity min-h-[44px] flex items-center justify-center"
                >
                  더 많은 퍼즐 도전하기 →
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Failure Overlay */}
      <AnimatePresence>
        {isFailed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center rounded-3xl backdrop-blur-md z-20"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-center p-6"
            >
              <div className="text-5xl mb-3">😱</div>
              <p className="text-white font-bold text-lg mb-1">이런!</p>
              <p className="text-white/70 text-sm mb-4">혼자 남겨진 동물이 위험해요</p>
              <button
                onClick={handleReset}
                className="px-5 py-2.5 bg-white text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors min-h-[44px]"
              >
                다시 도전
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
