import React from "react";
import { cn } from "../lib/utils";

interface StarburstProps {
  className?: string;
  fillColor?: string;
}

export function Starburst({ className, fillColor = "var(--color-yellow)" }: StarburstProps) {
  return (
    <svg
      className={cn("w-full h-full select-none pointer-events-none overflow-visible", className)}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M50 0 
           L59 28 L88 12 L73 38 L98 50 L73 62 L88 88 L59 72 L50 100 L41 72 L12 88 L27 62 L2 50 L27 38 L12 12 L41 28 Z"
        fill={fillColor}
        stroke="var(--color-ink)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
