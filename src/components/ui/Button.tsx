'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { forwardRef, useRef, type ButtonHTMLAttributes, type ReactNode, type MouseEvent } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  glow?: boolean;
}

const variantClasses = {
  primary: 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/25 btn-glow-blue',
  secondary: 'bg-[var(--bg-secondary)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border)]',
  ghost: 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]',
  danger: 'bg-gradient-to-r from-error to-red-600 text-white shadow-lg shadow-error/25',
  success: 'bg-gradient-to-r from-success to-emerald-600 text-white shadow-lg shadow-success/25 btn-glow-green',
  gradient: 'bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] text-white shadow-lg shadow-accent/25 btn-glow-purple',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm rounded-lg min-h-[36px]',
  md: 'px-5 py-2.5 text-base rounded-xl min-h-[44px]',
  lg: 'px-8 py-3.5 text-lg rounded-2xl min-h-[48px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, iconLeft, iconRight, glow, className, children, disabled, onClick, ...props }, ref) => {
    const rippleRef = useRef<HTMLSpanElement>(null);

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      // Ripple effect
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.4);
        left: ${x}px;
        top: ${y}px;
        transform: scale(0);
        pointer-events: none;
      `;
      ripple.animate(
        [
          { transform: 'scale(0)', opacity: '0.5' },
          { transform: 'scale(80)', opacity: '0' },
        ],
        { duration: 600, easing: 'ease-out' }
      );
      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);

      if (onClick) onClick(e);
    };

    return (
      <motion.button
        ref={ref}
        whileTap={!disabled && !loading ? { scale: 0.96 } : undefined}
        whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 cursor-pointer overflow-hidden',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          variantClasses[variant],
          sizeClasses[size],
          glow && 'animate-pulse-glow',
          className
        )}
        disabled={disabled || loading}
        onClick={handleClick}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        <span ref={rippleRef} />
        {loading && (
          <span className="loading-spinner" />
        )}
        {!loading && iconLeft}
        <span className={loading ? 'opacity-0' : undefined}>
          {children}
        </span>
        {!loading && iconRight}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
