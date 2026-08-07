import { cn } from "../lib/utils";
import { motion } from "motion/react";

interface BackdropProps {
  variant?: "default" | "challenge" | "dark" | "green" | "yellow";
}

export function Backdrop({ variant = "default" }: BackdropProps) {
  const isDark = variant === "dark";
  const isChallenge = variant === "challenge";
  const isGreen = variant === "green";
  const isYellow = variant === "yellow";

  return (
    <div
      className={cn(
        "absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none -z-10 transition-colors duration-500",
        isDark ? "bg-ink" : isGreen ? "bg-green" : isYellow ? "bg-yellow" : "bg-paper"
      )}
    >
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Dot pattern */}
        <defs>
          <pattern id="dotPattern" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle
              cx="14"
              cy="14"
              r="2.5"
              fill={isDark ? "var(--color-white)" : isGreen || isYellow ? "var(--color-white)" : "var(--color-ink)"}
              opacity={isDark ? "0.14" : isGreen || isYellow ? "0.15" : "0.09"}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotPattern)" />

        {/* Big irregular blobs (closed beziers) */}
        {variant === "default" && (
          <>
            {/* Top-left blob (Blue) */}
            <motion.path
              d="M-80 -80 Q90 60 210 -30 Q330 -120 250 -220 Q180 -330 -30 -250 Z"
              fill="var(--color-blue)"
              opacity="0.40"
              animate={{
                y: [-12, 12, -12],
                rotate: [-2.5, 2.5, -2.5]
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ transformOrigin: "80px -80px" }}
            />
            {/* Right-middle blob (Pink) */}
            <motion.path
              d="M440 200 Q280 290 310 450 Q340 610 470 580 Q600 550 550 320 Q500 110 440 200 Z"
              fill="var(--color-pink)"
              opacity="0.38"
              animate={{
                y: [15, -15, 15],
                rotate: [3, -3, 3]
              }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ transformOrigin: "420px 380px" }}
            />
            {/* Bottom-left blob (Green) */}
            <motion.path
              d="M-90 650 Q110 610 120 780 Q130 950 -50 970 Q-230 1000 -190 800 Z"
              fill="var(--color-green)"
              opacity="0.42"
              animate={{
                y: [-10, 10, -10],
                rotate: [-2, 2, -2]
              }}
              transition={{
                duration: 13,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ transformOrigin: "-50px 800px" }}
            />
          </>
        )}

        {isChallenge && (
          <>
            {/* Top-right blob (Yellow) */}
            <motion.path
              d="M490 -40 Q390 130 290 70 Q190 10 250 -100 Q310 -220 450 -160 Z"
              fill="var(--color-yellow)"
              opacity="0.42"
              animate={{
                y: [-10, 10, -10],
                rotate: [-2, 2, -2]
              }}
              transition={{
                duration: 14,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ transformOrigin: "350px -50px" }}
            />
            {/* Bottom-right blob (Orange) */}
            <motion.path
              d="M470 700 Q340 630 300 780 Q260 930 390 970 Q520 1010 500 810 Z"
              fill="var(--color-orange)"
              opacity="0.38"
              animate={{
                y: [12, -12, 12],
                rotate: [2.5, -2.5, 2.5]
              }}
              transition={{
                duration: 16,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ transformOrigin: "400px 800px" }}
            />
            {/* Left-middle blob (Purple) */}
            <motion.path
              d="M-100 350 Q70 310 80 460 Q90 610 -70 630 Q-240 660 -200 470 Z"
              fill="var(--color-purple)"
              opacity="0.40"
              animate={{
                y: [-12, 12, -12],
                rotate: [-3, 3, -3]
              }}
              transition={{
                duration: 17,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ transformOrigin: "-50px 480px" }}
            />
          </>
        )}

        {isGreen && (
          <>
            {/* Success screen visual support: rotating-looking background shapes */}
            <motion.path
              d="M-80 -80 Q90 60 210 -30 Q330 -120 250 -220 Q180 -330 -30 -250 Z"
              fill="var(--color-yellow)"
              opacity="0.35"
              animate={{
                y: [-12, 12, -12],
                rotate: [-2, 2, -2]
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ transformOrigin: "80px -80px" }}
            />
            <motion.path
              d="M440 200 Q280 290 310 450 Q340 610 470 580 Q600 550 550 320 Q500 110 440 200 Z"
              fill="var(--color-blue)"
              opacity="0.30"
              animate={{
                y: [15, -15, 15],
                rotate: [3, -3, 3]
              }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ transformOrigin: "420px 380px" }}
            />
          </>
        )}

        {isYellow && (
          <>
            {/* Bonus / Bonus Found screen visual support */}
            <motion.path
              d="M-80 -80 Q90 60 210 -30 Q330 -120 250 -220 Q180 -330 -30 -250 Z"
              fill="var(--color-pink)"
              opacity="0.35"
              animate={{
                y: [-12, 12, -12],
                rotate: [-2, 2, -2]
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ transformOrigin: "80px -80px" }}
            />
            <motion.path
              d="M-100 350 Q70 310 80 460 Q90 610 -70 630 Q-240 660 -200 470 Z"
              fill="var(--color-purple)"
              opacity="0.30"
              animate={{
                y: [15, -15, 15],
                rotate: [3, -3, 3]
              }}
              transition={{
                duration: 17,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ transformOrigin: "-50px 480px" }}
            />
          </>
        )}

        {isDark && (
          <>
            {/* Center-glow blob (Gold/Red) */}
            <motion.path
              d="M110 220 Q210 170 310 320 Q410 470 260 620 Q110 770 20 520 Q-70 270 110 220 Z"
              fill="var(--color-yellow)"
              opacity="0.14"
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 2, 0]
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ transformOrigin: "210px 470px" }}
            />
            <motion.path
              d="M210 370 Q310 320 360 420 Q410 520 310 570 Q210 620 160 500 Z"
              fill="var(--color-red)"
              opacity="0.12"
              animate={{
                scale: [1, 0.96, 1],
                rotate: [0, -2, 0]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ transformOrigin: "310px 470px" }}
            />
          </>
        )}

        {/* Thick hand-drawn style arc strokes */}
        <motion.path
          d="M 60 130 A 190 190 0 0 1 310 240"
          fill="none"
          stroke={isDark || isGreen || isYellow ? "var(--color-white)" : "var(--color-ink)"}
          strokeWidth="6.5"
          strokeLinecap="round"
          opacity={isDark || isGreen || isYellow ? "0.15" : "0.12"}
          animate={{ strokeDashoffset: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M -30 520 A 260 260 0 0 0 190 780"
          fill="none"
          stroke={isDark || isGreen || isYellow ? "var(--color-white)" : "var(--color-ink)"}
          strokeWidth="7.5"
          strokeLinecap="round"
          opacity={isDark || isGreen || isYellow ? "0.15" : "0.12"}
          animate={{ strokeDashoffset: [0, -15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}
