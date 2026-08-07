import { VaultTile, type VaultState } from "./VaultTile";
import { useGame } from "../context/GameContext";

/**
 * How many tiles are playable at once. A strictly sequential board lets one
 * hard question stall a player for the whole event; a fully open board means
 * the locked state never appears. A rolling window of three keeps both.
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

export function VaultBoard({ unlockedVaults, onSelect }: VaultBoardProps) {
  const { challenges } = useGame();
  const states = vaultStates(unlockedVaults);

  return (
    <div>
      {states.map((state, i) => (
        <VaultTile
          key={i + 1}
          digit={i + 1}
          state={state}
          icon={<span>{challenges[i]?.glyph ?? "star"}</span>}
          onClick={() => onSelect(i + 1, state)}
        />
      ))}
    </div>
  );
}
