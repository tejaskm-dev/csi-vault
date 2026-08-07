import React from "react";
import { motion } from "motion/react";
import { playTap } from "../lib/sound";
import { cn } from "../lib/utils";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "reward";
}

export function PrimaryButton({ children, variant = "primary", className, onClick, ...props }: PrimaryButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playTap();
    if (onClick) onClick(e);
  };

  const variantStyles = {
    primary: {
      className: "bg-red text-white",
      shadowHover: "0 8px 0 0 var(--color-red-deep)",
      shadowNormal: "0 6px 0 0 var(--color-red-deep)",
      shadowTap: "0 0px 0 0 transparent"
    },
    secondary: {
      className: "bg-paper-deep text-ink",
      shadowHover: "0 8px 0 0 var(--color-ink)",
      shadowNormal: "0 6px 0 0 var(--color-ink)",
      shadowTap: "0 0px 0 0 transparent"
    },
    reward: {
      className: "bg-brass text-ink",
      shadowHover: "0 8px 0 0 var(--color-brass-deep)",
      shadowNormal: "0 6px 0 0 var(--color-brass-deep)",
      shadowTap: "0 0px 0 0 transparent"
    },
  };

  const currentStyle = variantStyles[variant];

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      initial={{ boxShadow: currentStyle.shadowNormal, y: 0 }}
      whileHover={{ y: -2, boxShadow: currentStyle.shadowHover }}
      whileTap={{ y: 6, boxShadow: currentStyle.shadowTap }}
      transition={{ duration: 0.1 }}
      className={cn(
        "ink tap rounded-btn font-display font-extrabold text-[18px] uppercase tracking-wide px-6 py-3 select-none disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2",
        currentStyle.className,
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}
