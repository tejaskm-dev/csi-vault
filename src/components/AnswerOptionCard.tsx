import React from "react";
import { motion } from "motion/react";
import { playTap } from "../lib/sound";
import { Art } from "./Art";
import { cn } from "../lib/utils";

interface AnswerOptionCardProps {
  label: string;
  icon?: React.ReactNode;
  isSelected?: boolean;
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
  const handleClick = () => {
    playTap();
    onClick();
  };

  // Extract glyph name if passed as <span>glyph</span>
  let glyphName = "";
  if (React.isValidElement(icon)) {
    const children = (icon.props as any).children;
    if (typeof children === "string") {
      glyphName = children;
    }
  }

  // Variants for wrong answer shake
  const cardVariants = {
    default: { x: 0, y: 0 },
    shake: {
      x: [0, -8, 8, -8, 8, -8, 8, 0],
      transition: { duration: 0.36 },
    },
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      variants={cardVariants}
      animate={isWrong ? "shake" : "default"}
      whileTap={disabled ? undefined : { x: 5, y: 5, boxShadow: "0px 0px 0px 0px #14110F" }}
      className={cn(
        "ink rounded-card select-none text-ink text-left transition-[background-color,color] shadow-ink flex items-center gap-4 cursor-pointer disabled:pointer-events-none",
        variant === "image"
          ? "flex-col items-center text-center p-6 w-full"
          : "p-4 w-full flex-row",
        isSelected
          ? "bg-blue text-white"
          : isWrong
          ? "bg-red text-white"
          : "bg-white hover:bg-paper-deep"
      )}
      style={{
        boxShadow: isSelected || isWrong ? "5px 5px 0 0 #14110F" : "5px 5px 0 0 #14110F",
      }}
    >
      {glyphName ? (
        <div className={cn(
          "flex items-center justify-center rounded-btn p-2",
          isSelected || isWrong ? "bg-white/20" : "bg-paper-deep"
        )}>
          <Art name={glyphName} alt={label} className="w-12 h-12 object-contain" />
        </div>
      ) : (
        icon && (
          <div className="flex items-center justify-center bg-paper-deep rounded-btn p-2">
            {icon}
          </div>
        )
      )}
      <span className={cn(
        "font-body font-bold text-lg leading-snug",
        isSelected || isWrong ? "text-white" : "text-ink"
      )}>
        {label}
      </span>
    </motion.button>
  );
}
