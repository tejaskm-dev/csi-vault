import { VaultTile, type VaultState } from "./VaultTile";
import { cn } from "../lib/utils";

/**
 * How many positions are playable at once. Strictly sequential lets one hard
 * question stall a player for the whole event; fully open means the locked
 * state never appears. A rolling window of three keeps both.
 */
const OPEN_WINDOW = 3;

export function vaultStates(unlockedVaults: string[]): VaultState[] {
  const solvedCount = unlockedVaults.length;
  return Array.from({ length: 9 }, (_, i) => {
    if (unlockedVaults.includes(String(i + 1))) return "solved";
    return i < solvedCount + OPEN_WINDOW ? "active" : "locked";
  });
}

interface VaultBoardProps {
  unlockedVaults: string[];
  onSelect: (digit: number, state: VaultState) => void;
  className?: string;
}

/** Slight per-position tilt so the grid never reads as machine-set. */
const TILTS = [-2, 1.5, -1, 2, -1.5, 1, -2, 1.5, -1];

export function VaultBoard({ unlockedVaults, onSelect, className }: VaultBoardProps) {
  const states = vaultStates(unlockedVaults);

  return (
    <div
      className={cn(
        "ink grid w-full select-none grid-cols-3 gap-3 rounded-plate bg-paper-deep p-3.5",
        className
      )}
      style={{ boxShadow: "var(--shadow-plate-ink)" }}
    >
      {states.map((state, i) => (
        <VaultTile
          key={i + 1}
          digit={i + 1}
          state={state}
          onClick={() => onSelect(i + 1, state)}
          tilt={TILTS[i]}
        />
      ))}
    </div>
  );
}
