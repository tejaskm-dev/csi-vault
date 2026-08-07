import React from "react";
import { cn } from "../lib/utils";

interface WavyDividerProps {
  className?: string;
}

export function WavyDivider({ className }: WavyDividerProps) {
  return (
    <svg
      className={cn("w-full h-4 overflow-visible select-none pointer-events-none", className)}
      viewBox="0 0 120 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 6 C 10 12, 20 0, 30 6 C 40 12, 50 0, 60 6 C 70 12, 80 0, 90 6 C 100 12, 110 0, 120 6"
        stroke="var(--color-ink)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
