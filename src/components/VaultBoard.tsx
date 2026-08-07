import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { VaultTile, type VaultState } from "./VaultTile";
import { GLYPHS, type GlyphKey } from "./art/Glyphs";
import { SETTLE_STAGGER, BOUNCE_IN, WIGGLE } from "../lib/motion";
import { useGame } from "../context/GameContext";
import { soundUnlock } from "../lib/sound";
import { cn } from "../lib/utils";

const OPEN_WINDOW = 3;

export function vaultStates(unlockedVaults: string[]): VaultState[] {
  const solvedCount = unlockedVaults.length;
  return Array.from({ length: 9 }, (_, i) => {
    const digit = String(i + 1);
    if (unlockedVaults.includes(digit)) return "solved";
    return i < solvedCount + OPEN_WINDOW ? "active" : "locked";
  });
}

interface VaultBoardProps {
  unlockedVaults: string[];
  onSelect: (digit: number, state: VaultState) => void;
  className?: string;
}

export function VaultBoard({ unlockedVaults, onSelect, className }: VaultBoardProps) {
  const { challenges } = useGame();
  const states = vaultStates(unlockedVaults);

  // Find index of first active (playable) tile to trigger WIGGLE on idle
  const firstActiveIndex = states.findIndex((s) => s === "active");
  const [wigglingIndex, setWigglingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (firstActiveIndex === -1) return;
    const interval = setInterval(() => {
      setWigglingIndex(firstActiveIndex);
      const timer = setTimeout(() => setWigglingIndex(null), 600);
      return () => clearTimeout(timer);
    }, 5000);
    return () => clearInterval(interval);
  }, [firstActiveIndex]);

  const handleTileClick = (digit: number, state: VaultState) => {
    if (state === "solved") soundUnlock();
    onSelect(digit, state);
  };

  return (
    <motion.div
      variants={SETTLE_STAGGER}
      initial="hidden"
      animate="show"
      className={cn("grid grid-cols-3 gap-3.5", className)}
    >
      {states.map((state, i) => {
        const digit = i + 1;
        const challenge = challenges[i];
        const glyphKey: GlyphKey = challenge?.glyph || "star";
        const GlyphComponent = GLYPHS[glyphKey] || GLYPHS.star;
        const tilt = i % 3 === 0 ? -1.5 : i % 3 === 1 ? 0.75 : -0.5;
        const isWiggling = wigglingIndex === i;

        return (
          <motion.div
            key={digit}
            variants={BOUNCE_IN}
            animate={isWiggling ? WIGGLE : undefined}
          >
            <VaultTile
              digit={digit}
              state={state}
              tilt={tilt}
              icon={<GlyphComponent className="h-9 w-9" />}
              onClick={() => handleTileClick(digit, state)}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
