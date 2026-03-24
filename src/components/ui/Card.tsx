'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  accentColor?: string;
  accentPosition?: 'top' | 'left';
  hoverable?: boolean;
  glass?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className,
  accentColor,
  accentPosition = 'top',
  hoverable = false,
  glass = false,
  glow = false,
  onClick,
}: CardProps) {
  const accentStyle = accentColor
    ? accentPosition === 'left'
      ? { borderLeftColor: accentColor, borderLeftWidth: '3px' }
      : { borderTopColor: accentColor, borderTopWidth: '3px' }
    : undefined;

  return (
    <motion.div
      whileHover={
        hoverable
          ? {
              scale: 1.03,
              y: -6,
              transition: { type: 'spring', stiffness: 300, damping: 20 },
            }
          : undefined
      }
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        'rounded-2xl p-6 transition-all duration-300',
        glass
          ? 'glass-card'
          : 'bg-[var(--card)] border border-[var(--border)]',
        hoverable && 'cursor-pointer hover:shadow-xl',
        glow && 'entity-glow',
        onClick && 'cursor-pointer',
        className
      )}
      style={accentStyle}
    >
      {children}
    </motion.div>
  );
}
