import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../lib/utils";
import React from "react";
import { soundTap } from "../lib/sound";

interface PressableProps extends HTMLMotionProps<"button"> {
  /** Round icon button on white — the standard header/back affordance. */
  icon?: boolean;
}

export function Pressable({ icon, className, disabled, onClick, ...props }: PressableProps) {
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
        "tap inline-flex items-center justify-center select-none outline-none",
        "transition-[transform,box-shadow] duration-75",
        "focus-visible:ring-2 focus-visible:ring-csi-red focus-visible:ring-offset-2 focus-visible:ring-offset-off-white",
        !disabled && "active:translate-y-1.5 active:shadow-chunk-none cursor-pointer",
        disabled && "disabled:opacity-40 disabled:shadow-none",
        icon &&
          "h-14 w-14 rounded-pill bg-white text-charcoal shadow-chunk-white",
        className
      )}
      {...props}
    />
  );
}
