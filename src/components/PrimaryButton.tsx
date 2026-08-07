import React from "react";
import { motion } from "motion/react";
import { playTap } from "../lib/sound";
import { cn } from "../lib/utils";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "reward";
}

/**
 * Framer animates only `y` here. The shadow is handled by CSS `:hover`/`:active`
 * and snaps rather than interpolating — animating box-shadow through Framer
 * repaints the element every frame of the press, which is exactly the kind of
 * work a low-end phone cannot absorb.
 *
 * There is no collision with Framer's inline transform: that trap only applies
 * to transform-vs-transform, and box-shadow is neither.
 */
const VARIANTS = {
  primary:   "bg-red text-white shadow-[0_6px_0_0_var(--color-red-deep)] hover:shadow-[0_8px_0_0_var(--color-red-deep)] active:shadow-none",
  secondary: "bg-paper-deep text-ink shadow-[0_6px_0_0_var(--color-ink)] hover:shadow-[0_8px_0_0_var(--color-ink)] active:shadow-none",
  reward:    "bg-brass text-ink shadow-[0_6px_0_0_var(--color-brass-deep)] hover:shadow-[0_8px_0_0_var(--color-brass-deep)] active:shadow-none",
} as const;

export function PrimaryButton({
  children,
  variant = "primary",
  className,
  onClick,
  ...props
}: PrimaryButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playTap();
    if (onClick) onClick(e);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={{ y: -2 }}
      whileTap={{ y: 6 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "ink tap flex cursor-pointer select-none items-center justify-center gap-2 rounded-btn px-6 py-3",
        "font-display text-[18px] font-extrabold uppercase tracking-wide",
        "disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}
