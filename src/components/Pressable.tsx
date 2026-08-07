import React from "react";
import { motion } from "motion/react";
import { playTap } from "../lib/sound";
import { cn } from "../lib/utils";

interface PressableProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: boolean;
}

export function Pressable({ icon, children, className, onClick, ...props }: PressableProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playTap();
    if (onClick) onClick(e);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      // Shadow via CSS so Framer never repaints it per frame.
      whileHover={{ y: -2 }}
      whileTap={{ y: 6 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "shadow-[0_6px_0_0_var(--color-ink)] hover:shadow-[0_8px_0_0_var(--color-ink)] active:shadow-none",
        "ink tap select-none flex items-center justify-center cursor-pointer font-bold disabled:opacity-40 disabled:pointer-events-none text-ink bg-paper-deep",
        icon 
          ? "rounded-btn p-3 aspect-square" 
          : "rounded-pill px-5 py-2 text-[14px] uppercase tracking-wider",
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}
