import { motion, AnimatePresence } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { VaultDoorLocked } from "./art/Props";
import { CustomIcons } from "./Icons";
import {
  UNLOCK_MS,
  UNLOCK_WIPE,
  UNLOCK_ICON_IN,
  UNLOCK_TILE_POP,
} from "../lib/motion";

export type VaultState = "locked" | "active" | "solved";

interface VaultTileProps {
  digit: number;
  state: VaultState;
  /** Challenge glyph shown in active/solved state. */
  icon?: React.ReactNode;
  onClick?: () => void;
  /** Compact variant for summary strips (Success, Vault Complete). */
  size?: "grid" | "compact";
  /** Tilt angle in degrees (scoped to board only). */
  tilt?: number;
  className?: string;
}

const TILE_PASTEL_CLASSES = [
  "bg-tile-1",
  "bg-tile-2",
  "bg-tile-3",
  "bg-tile-4",
  "bg-tile-5",
  "bg-tile-6",
  "bg-tile-7",
  "bg-tile-8",
  "bg-tile-9",
];

export function VaultTile({
  digit,
  state,
  icon,
  onClick,
  size = "grid",
  tilt = 0,
  className,
}: VaultTileProps) {
  const solved = state === "solved";
  const locked = state === "locked";
  const active = state === "active";

  const prev = useRef<VaultState>(state);
  const [justSolved, setJustSolved] = useState(false);

  if (prev.current !== state) {
    const unlocking = state === "solved" && prev.current !== "solved";
    prev.current = state;
    if (unlocking) setJustSolved(true);
  }

  useEffect(() => {
    if (!justSolved) return;
    const t = setTimeout(() => setJustSolved(false), UNLOCK_MS + 150);
    return () => clearTimeout(t);
  }, [justSolved]);

  const interactive = Boolean(onClick);
  const compact = size === "compact";
  const pastelClass = TILE_PASTEL_CLASSES[(digit - 1) % 9];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      aria-label={`Digit ${digit} — ${locked ? "locked" : active ? "ready" : "unlocked"}`}
      whileTap={
        interactive
          ? { y: 6, boxShadow: "0 0 0 0 rgba(0,0,0,0)" }
          : undefined
      }
      transition={{ type: "spring", stiffness: 900, damping: 32, mass: 0.5 }}
      animate={{
        rotate: tilt,
        ...(justSolved ? UNLOCK_TILE_POP : { scale: 1 }),
      }}
      className={cn(
        "relative rounded-card w-full text-left",
        compact ? "aspect-square min-h-0 min-w-0" : "tap aspect-[4/5]",
        locked ? "bg-light-gray shadow-none" : pastelClass,
        active && "shadow-chunk-gray",
        solved && "shadow-chunk-green ring-2 ring-success-green",
        interactive ? "cursor-pointer" : "cursor-default",
        "outline-none focus-visible:ring-2 focus-visible:ring-csi-red focus-visible:ring-offset-2",
        className
      )}
    >
      {/* Inner clipped container for wipe overlay and pastels */}
      <div className="absolute inset-0 overflow-hidden rounded-card pointer-events-none">
        <motion.div
          aria-hidden
          className="absolute inset-0 bg-success-green/18 origin-bottom"
          initial={false}
          animate={{ scaleY: solved ? 1 : 0 }}
          transition={justSolved ? UNLOCK_WIPE : { duration: 0 }}
        />
        {locked && (
          <div className="absolute inset-0 rounded-card ring-1 ring-inset ring-hairline" />
        )}
      </div>

      {/* OVERHANG BADGE: hangs OUTSIDE top-right corner */}
      {!compact && solved && (
        <motion.span
          initial={justSolved ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={justSolved ? UNLOCK_ICON_IN : { duration: 0.15 }}
          className="absolute -top-2.5 -right-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-pill bg-success-green text-white ring-4 ring-white shadow-chunk-green"
        >
          <CustomIcons.Check className="h-4 w-4" />
        </motion.span>
      )}

      {/* Active breathing ring indicator (top right) */}
      {!compact && active && (
        <span className="absolute top-2.5 right-2.5 z-20 block h-5 w-5 rounded-pill border-2 border-charcoal/25" />
      )}

      {/* Content layout */}
      <div
        className={cn(
          "relative z-10 flex h-full w-full flex-col justify-between",
          compact ? "p-1.5" : "p-3"
        )}
      >
        <span
          className={cn(
            "numeral leading-none text-charcoal",
            compact ? "text-sm font-bold" : "text-[30px]"
          )}
        >
          {digit}
        </span>

        {/* Center icon well */}
        <div className="relative flex flex-1 items-center justify-center">
          {/* No tinted disc behind the glyph — these are full-colour emoji now,
              and a red wash underneath muddies them. The empty ring badge in the
              corner already carries the "open, not yet solved" signal. */}
          {locked ? (
            <VaultDoorLocked digit={digit} className={compact ? "h-6 w-6" : "h-11 w-11"} />
          ) : (
            <motion.span
              className={cn(
                "block",
                compact ? "[&_svg]:h-6 [&_svg]:w-6" : "[&_svg]:h-12 [&_svg]:w-12"
              )}
              animate={active && !compact ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={
                active && !compact
                  ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.2 }
              }
            >
              {icon}
            </motion.span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
