'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, Volume2, VolumeX, Brain } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = useUIStore((s) => s.theme);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const toggleSound = useUIStore((s) => s.toggleSound);

  const isDark = theme === 'dark';

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg)]/80 border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            BrainFerry
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors font-medium">
            홈
          </Link>
          <Link href="/play" className="text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors font-medium">
            퍼즐
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            aria-label={soundEnabled ? '사운드 끄기' : '사운드 켜기'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            aria-label={isDark ? '라이트 모드' : '다크 모드'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            aria-label="메뉴"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-[var(--border)]"
          >
            <div className="p-4 flex flex-col gap-2">
              <Link href="/" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-[var(--bg-secondary)] font-medium">
                홈
              </Link>
              <Link href="/play" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-[var(--bg-secondary)] font-medium">
                퍼즐
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
