import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import React from "react";
import { SHAKE } from "../lib/motion";

interface AnswerOptionCardProps {
  label: string;
  icon?: React.ReactNode;
  isSelected?: boolean;
  /** Wrong answer: pale-red fill + the SHAKE primitive on this card only. */
  isWrong?: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant?: "text" | "image";
}

export function AnswerOptionCard({
  label,
  icon,
  isSelected,
  isWrong,
  disabled,
  onClick,
  variant = "text",
}: AnswerOptionCardProps) {
  return (
    <motion.button
      type="button"
      whileTap={
        disabled
          ? undefined
          : { y: 6, boxShadow: "0 0 0 0 rgba(0,0,0,0)" }
      }
      animate={isWrong ? SHAKE : { x: 0 }}
      transition={
        isWrong
          ? SHAKE.transition
          : { type: "spring", stiffness: 900, damping: 32, mass: 0.5 }
      }
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "tap flex w-full flex-col items-center justify-center rounded-card border-2",
        "transition-colors duration-150 outline-none select-none",
        "focus-visible:ring-2 focus-visible:ring-csi-red focus-visible:ring-offset-2",
        variant === "text" ? "p-4 min-h-[72px]" : "p-4 aspect-square",
        isWrong
          ? "border-csi-red bg-red-tint text-csi-red shadow-chunk-red"
          : isSelected
            ? "border-csi-red bg-white text-csi-red shadow-chunk-white ring-2 ring-csi-red"
            : "border-transparent bg-white text-charcoal shadow-chunk-white",
        disabled && !isSelected && !isWrong && "opacity-60 shadow-none",
        !disabled && "cursor-pointer"
      )}
    >
      {icon && <div className="mb-2">{icon}</div>}
      <span className="text-[15px] font-semibold leading-snug text-center">
        {label}
      </span>
    </motion.button>
  );
}
