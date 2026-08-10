import { memo } from "react";
import { motion } from "motion/react";
import { VaultTile, type VaultState } from "./VaultTile";
import { boardStagger, riseIn } from "../lib/motion";
import { cn } from "../lib/utils";

/**
 * Vaults open one at a time, in order.
 *
 * This used to be a rolling window of three, on the reasoning that a strict
 * sequence lets one hard vault stall a player for the whole event. That
 * reasoning does not survive contact with the actual board: three tiles glowing
 * at once with 0/9 solved gives a first-year no idea where to start, and the
 * ramp — easy tutorial vaults first, hard ones later — is meaningless if you
 * can skip straight to vault 3.
 *
 * The stall risk is handled by making vaults 1 and 2 genuinely easy instead,
 * and by every challenge having a hint.
 */
export function vaultStates(unlockedVaults: string[]): VaultState[] {
  const solvedCount = unlockedVaults.length;
  return Array.from({ length: 9 }, (_, i) => {
    if (unlockedVaults.includes(String(i + 1))) return "solved";
    // Exactly one live target: the first unsolved position.
    return i === solvedCount ? "active" : "locked";
  });
}

interface VaultBoardProps {
  unlockedVaults: string[];
  onSelect: (digit: number, state: VaultState) => void;
  className?: string;
}

/** Slight per-position tilt so the grid never reads as machine-set. */
const TILTS = [-2, 1.5, -1, 2, -1.5, 1, -2, 1.5, -1];

function VaultBoardBase({ unlockedVaults, onSelect, className }: VaultBoardProps) {
  const states = vaultStates(unlockedVaults);

  return (
    <motion.div
      variants={boardStagger}
      initial="initial"
      animate="animate"
      className={cn(
        "ink grid w-full select-none grid-cols-3 gap-3 rounded-plate bg-paper-deep p-3.5",
        className
      )}
      style={{ boxShadow: "var(--shadow-plate-ink)" }}
    >
      {states.map((state, i) => (
        // The wrapper carries the entrance so the tile keeps its own tilt —
        // two transforms on one element and Framer's inline style wins.
        <motion.div key={i + 1} variants={riseIn}>
          <VaultTile digit={i + 1} state={state} onSelect={onSelect} tilt={TILTS[i]} />
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Memoised — Wraps the nine tiles. */
export const VaultBoard = memo(VaultBoardBase);
