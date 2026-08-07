import React from "react";
import { cn } from "../lib/utils";

interface BackdropProps {
  variant?: "default" | "challenge" | "dark";
  className?: string;
}

export function Backdrop({ variant = "default", className }: BackdropProps) {
  const isDark = variant === "dark";
  const isChallenge = variant === "challenge";

  const blobFills = isDark
    ? ["#2E2724", "#352D2A", "#26201E"]
    : isChallenge
      ? ["#FDE9EA", "#E6F0FB", "#FDF3E0"]
      : ["#FDE9EA", "#E6F0FB", "#E7F4EC"];

  return (
    <div
      className={cn(
        "absolute inset-0 z-0 overflow-hidden pointer-events-none select-none",
        className
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 390 844"
        fill="none"
        className="h-full w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        {/* Layer 1: Soft bezier blobs bleeding off edges */}
        <g opacity={isDark ? "0.45" : "0.65"}>
          {/* Top-left blob */}
          <path
            d="M-40 -30C20 -50 140 -20 120 80C100 180 -30 160 -60 100Z"
            fill={blobFills[0]}
          />
          {/* Top-right blob */}
          <path
            d="M260 -40C330 -60 420 10 410 110C400 210 300 180 250 100Z"
            fill={blobFills[1]}
          />
          {/* Mid-bottom blob */}
          <path
            d="M-50 520C30 480 160 550 130 680C100 810 -40 820 -70 700Z"
            fill={blobFills[2]}
          />
        </g>

        {/* Layer 2: Sparse dot field over upper third (~40px grid) */}
        <g fill={isDark ? "#4C433C" : "#E4DFD7"} opacity={isDark ? "0.35" : "0.5"}>
          {Array.from({ length: 9 }, (_, col) =>
            Array.from({ length: 7 }, (_, row) => (
              <circle
                key={`dot-${col}-${row}`}
                cx={25 + col * 42}
                cy={30 + row * 40}
                r="2"
              />
            ))
          )}
        </g>

        {/* Layer 3: Thin decorative arc strokes */}
        <g stroke={isDark ? "#4C433C" : "#E4DFD7"} strokeWidth="3" strokeLinecap="round" opacity="0.6">
          <path d="M-20 220Q180 180 410 320" />
          <path d="M-10 610Q200 550 400 680" />
        </g>
      </svg>
    </div>
  );
}
