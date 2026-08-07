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
      initial={{ boxShadow: "0 6px 0 0 var(--color-ink)", y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 8px 0 0 var(--color-ink)" }}
      whileTap={{ y: 6, boxShadow: "0 0px 0 0 transparent" }}
      transition={{ duration: 0.1 }}
      className={cn(
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
