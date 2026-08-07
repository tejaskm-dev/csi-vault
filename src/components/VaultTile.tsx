import React from "react";
import { motion } from "motion/react";
import { playTap } from "../lib/sound";
import { Safe, type SafeState } from "./Safe";
import { cn } from "../lib/utils";

export type VaultState = "locked" | "active" | "solved";

interface VaultTileProps {
  digit: number;
  state: VaultState;
  /** Kept for call-site compatibility; the board shows safes, not glyphs. */
  icon?: React.ReactNode;
  onClick?: () => void;
  size?: "grid" | "compact";
  tilt?: number;
  className?: string;
}

const TO_SAFE: Record<VaultState, SafeState> = {
  active: "available",
  solved: "solved",
  locked: "locked",
};

/**
 * A board position. Thin wrapper: the Safe owns every visual state and the
 * whole unlock sequence, so this only handles press, sound and the idle bob.
 */
export function VaultTile({
  digit,
  state,
  onClick,
  size = "grid",
  tilt,
  className,
}: VaultTileProps) {
  const isCompact = size === "compact";
  const isLocked = state === "locked";
  const isActive = state === "active";

  const handlePress = () => {
    if (isLocked || !onClick) return;
    playTap();
    onClick();
  };

  if (isCompact) {
    return (
      <div className={cn("h-12 w-12", className)}>
        <Safe digit={digit} state={TO_SAFE[state]} />
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={handlePress}
      disabled={isLocked || !onClick}
      aria-label={`Vault ${digit}, ${state}`}
      // Playable tiles breathe on a stagger so the board ripples rather than
      // pulsing in unison. Locked and solved sit still.
      animate={isActive ? { y: [0, -4, 0], rotate: tilt ?? 0 } : { y: 0, rotate: tilt ?? 0 }}
      transition={
        isActive
          ? { y: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: digit * 0.15 } }
          : { duration: 0.2 }
      }
      whileTap={isLocked ? undefined : { scale: 0.94 }}
      className={cn(
        "relative aspect-square w-full select-none",
        isLocked ? "cursor-not-allowed" : "cursor-pointer",
        className
      )}
    >
      <Safe digit={digit} state={TO_SAFE[state]} />
    </motion.button>
  );
}
