'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  accentColor?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, accentColor, hoverable = false, onClick }: CardProps) {
  return (
    <motion.div
      whileHover={hoverable ? { scale: 1.03, y: -4 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        'bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 transition-shadow duration-300',
        hoverable && 'cursor-pointer hover:shadow-xl',
        onClick && 'cursor-pointer',
        className
      )}
      style={accentColor ? { borderTopColor: accentColor, borderTopWidth: '3px' } : undefined}
    >
      {children}
    </motion.div>
  );
}
