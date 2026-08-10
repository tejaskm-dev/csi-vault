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
  /**
   * The live tile is the LOWEST unsolved vault, found by looking.
   *
   * It used to be `i === unlockedVaults.length`, which is the same answer only
   * while the solved vaults are an unbroken prefix — true for as long as
   * nothing could ever un-solve one.
   *
   * Evidence review can. Reject the photo in vault 3 while 1, 2, 4 and 5 are
   * done and the list is ["1","2","4","5"]: length is 4, so index 2 is neither
   * solved nor `=== 4` and renders LOCKED, while index 4 is already solved and
   * never gets the active state either. The board ends up with no live tile at
   * all and the player has nowhere to tap.
   */
  const solved = new Set(unlockedVaults);
  let activeTaken = false;

  return Array.from({ length: 9 }, (_, i) => {
    if (solved.has(String(i + 1))) return "solved";
    if (!activeTaken) { activeTaken = true; return "active"; }
    return "locked";
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
