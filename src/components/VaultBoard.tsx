import { VaultTile, type VaultState } from "./VaultTile";
import { useGame } from "../context/GameContext";
import { cn } from "../lib/utils";

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

export function VaultBoard({ unlockedVaults, onSelect, className }: VaultBoardProps) {
  const { challenges } = useGame();
  const states = vaultStates(unlockedVaults);

  // Tiles alternate tilt by position
  const tilts = [-2, 1.5, -1, 2, -1.5, 1, -2, 1.5, -1];

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-3.5 w-full p-4 bg-paper-deep ink rounded-card shadow-ink select-none",
        className
      )}
    >
      {states.map((state, i) => (
        <VaultTile
          key={i + 1}
          digit={i + 1}
          state={state}
          icon={<span>{challenges[i]?.glyph ?? "star"}</span>}
          onClick={() => onSelect(i + 1, state)}
          tilt={tilts[i]}
        />
      ))}
    </div>
  );
}
