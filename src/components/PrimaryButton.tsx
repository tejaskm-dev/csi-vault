import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../lib/utils";
import React from "react";
import { soundTap } from "../lib/sound";

interface PrimaryButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  /** primary = red fill · secondary = white card · reward = gold */
  variant?: "primary" | "secondary" | "reward";
  className?: string;
}

export function PrimaryButton({
  children,
  variant = "primary",
  className,
  disabled,
  onClick,
  ...props
}: PrimaryButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) soundTap();
    if (onClick) onClick(e);
  };
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "tap w-full px-6 py-4 rounded-btn font-display font-extrabold text-lg",
        "flex items-center justify-center gap-2",
        "transition-[transform,box-shadow] duration-75 outline-none",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-off-white",
        !disabled && "active:translate-y-1.5 active:shadow-chunk-none cursor-pointer",
        variant === "primary" &&
          "bg-csi-red text-white shadow-chunk-red focus-visible:ring-csi-red disabled:bg-light-gray disabled:text-muted disabled:shadow-none",
        variant === "secondary" &&
          "bg-white text-csi-red shadow-chunk-white focus-visible:ring-csi-red disabled:text-muted disabled:shadow-none",
        variant === "reward" &&
          "bg-reward-yellow text-charcoal shadow-chunk-yellow focus-visible:ring-reward-yellow disabled:bg-light-gray disabled:text-muted disabled:shadow-none",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
