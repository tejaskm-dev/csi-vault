import React, { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";
import { playTap, playUnlock } from "../lib/sound";
import { Art } from "./Art";
import { cn } from "../lib/utils";

export type VaultState = "locked" | "active" | "solved";

interface VaultTileProps {
  digit: number;
  state: VaultState;
  icon?: React.ReactNode;
  onClick?: () => void;
  size?: "grid" | "compact";
  tilt?: number;
  className?: string;
}

export function VaultTile({ digit, state, icon, onClick, size = "grid", tilt, className }: VaultTileProps) {
  const isCompact = size === "compact";
  
  // Track solving state transition for the unlock animation
  const prev = useRef(state);
  const [justSolved, setJustSolved] = useState(false);

  if (prev.current !== state) {
    const unlocking = state === "solved" && prev.current !== "solved";
    prev.current = state;
    if (unlocking) {
      setJustSolved(true);
      playUnlock();
    }
  }

  // Extract glyph name if passed as <span>glyph</span>
  let glyphName = "";
  if (React.isValidElement(icon)) {
    const children = (icon.props as any).children;
    if (typeof children === "string") {
      glyphName = children;
    }
  }

  const handlePress = () => {
    if (state === "locked" || !onClick) return;
    playTap();
    onClick();
  };

  // Determine background tile color for active state
  const bgClasses: Record<number, string> = {
    1: "bg-tile-1",
    2: "bg-tile-2",
    3: "bg-tile-3",
    4: "bg-tile-4",
    5: "bg-tile-5",
    6: "bg-tile-6",
    7: "bg-tile-7",
    8: "bg-tile-8",
    9: "bg-tile-9",
  };
  const activeColor = bgClasses[digit] || "bg-yellow";

  // Build motion states
  const isLocked = state === "locked";
  const isSolved = state === "solved";
  const isActive = state === "active";

  // Animation values
  let tileAnimate: any = { scale: 1, y: 0 };
  let tileTransition: any = {};

  if (isActive && !isCompact) {
    // Bob gently on a loop
    tileAnimate = {
      y: [0, -4, 0],
    };
    tileTransition = {
      y: {
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut",
        delay: digit * 0.15,
      },
    };
  } else if (isSolved && justSolved && !isCompact) {
    // Squash-and-pop
    tileAnimate = {
      scale: [1, 0.92, 1.08, 1],
      y: 0,
    };
    tileTransition = {
      scale: {
        duration: 0.4,
        ease: "easeOut",
      },
    };
  }

  // Custom tilt
  const rotationStyle = tilt ? { rotate: `${tilt}deg` } : {};

  if (isCompact) {
    return (
      <div
        className={cn(
          "w-12 h-12 flex items-center justify-center ink rounded-btn select-none font-bold text-[14px]",
          isSolved ? "bg-green text-white" : "bg-paper-deep text-ink/30",
          className
        )}
        style={{
          boxShadow: isSolved ? "var(--shadow-ink-sm)" : "none",
        }}
      >
        <span className="pixel text-[11px]">{digit}</span>
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={handlePress}
      disabled={isLocked || !onClick}
      animate={tileAnimate}
      transition={tileTransition}
      whileTap={isLocked ? undefined : { x: 5, y: 5, boxShadow: "0px 0px 0px 0px #14110F" }}
      className={cn(
        "relative w-full aspect-square ink rounded-card select-none text-ink text-left transition-[box-shadow] duration-75 overflow-visible cursor-pointer disabled:cursor-not-allowed",
        isLocked
          ? "bg-paper-deep shadow-ink-sm"
          : "shadow-ink",
        className
      )}
      style={{
        ...rotationStyle,
        boxShadow: isLocked
          ? "var(--shadow-ink-sm)"
          : "var(--shadow-ink)",
      }}
    >
      {/* Inner background clip mask */}
      <div className="absolute inset-0 rounded-[25px] overflow-hidden z-0 bg-paper-deep">
        {/* Active bg fill */}
        {isActive && <div className={cn("absolute inset-0", activeColor)} />}
        
        {/* Solved green wipe up */}
        {isSolved && (
          <motion.div
            initial={{ scaleY: justSolved ? 0 : 1 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 bg-green origin-bottom overflow-hidden"
          >
            {/* Sheen sweep */}
            {justSolved && (
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-[200%] -top-[50%] -skew-x-[20deg]"
                style={{ animation: "sheen 0.7s 0.3s ease-out both" }}
              />
            )}
          </motion.div>
        )}
      </div>

      {/* Grid Content Layout */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-3.5">
        {/* Header line: Digit + Status badge */}
        <div className="flex justify-between items-center w-full">
          <span className={cn(
            "pixel text-[14px] font-extrabold",
            isLocked ? "opacity-30" : isSolved ? "text-white" : "text-ink"
          )}>
            {digit}
          </span>

          {/* Status icon badge */}
          {isActive && (
            <div className="w-5 h-5 rounded-pill border-2 border-ink bg-white/20" />
          )}
          {isLocked && (
            <div className="w-5 h-5 rounded-pill bg-ink/10 border-2 border-ink flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-ink/30 stroke-[3.5px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          )}
        </div>

        {/* Center icon / Lock */}
        <div className="flex justify-center items-center grow my-2">
          {isLocked ? (
            <div className="bg-ink/5 rounded-btn p-2">
              <Art name="lock" alt="Locked" className="w-12 h-12 object-contain opacity-30" />
            </div>
          ) : (
            glyphName && (
              <div className="rounded-btn p-1.5 bg-white/20">
                <Art name={glyphName} alt={`Challenge ${digit}`} className="w-12 h-12 object-contain" />
              </div>
            )
          )}
        </div>
      </div>

      {/* Overhanging Check Badge for Solved */}
      {isSolved && (
        <motion.div
          initial={{ scale: justSolved ? 0 : 1 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 18, delay: justSolved ? 0.12 : 0 }}
          className="absolute -top-3 -right-3 z-20 w-8 h-8 rounded-pill bg-white text-ink ink shadow-ink-sm flex items-center justify-center font-extrabold text-[15px]"
        >
          <svg className="w-4 h-4 text-ink stroke-[3.5px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
}
