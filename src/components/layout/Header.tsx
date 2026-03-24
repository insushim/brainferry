'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, Volume2, VolumeX, Brain } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

const NAV_ITEMS = [
  { href: '/', label: '홈' },
  { href: '/play', label: '퍼즐' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const theme = useUIStore((s) => s.theme);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const toggleSound = useUIStore((s) => s.toggleSound);

  const isDark = theme === 'dark';

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-accent to-primary bg-[length:200%_auto] flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <Brain className="w-5 h-5 text-white" />
          </motion.div>
          <span className="text-xl font-bold gradient-text-animated">
            BrainFerry
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <span
                className={
                  isActive(item.href)
                    ? 'text-[var(--text)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                }
              >
                {item.label}
              </span>
              {isActive(item.href) && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-primary to-accent rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleSound}
            className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={soundEnabled ? '사운드 끄기' : '사운드 켜기'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 opacity-50" />}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={isDark ? '라이트 모드' : '다크 모드'}
          >
            <AnimatePresence mode="wait">
              {isDark ? (
                <motion.div
                  key="sun"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="메뉴"
          >
            <AnimatePresence mode="wait">
              {menuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Menu className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden border-t border-white/[0.06]"
          >
            <div className="p-3 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl font-medium transition-colors min-h-[44px] flex items-center ${
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
