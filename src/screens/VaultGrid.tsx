import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { VaultBoard } from "../components/VaultBoard";
import { Modal } from "../components/Modal";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { useGame } from "../context/GameContext";
import type { VaultState } from "../components/VaultTile";

export function VaultGrid() {
  const navigate = useNavigate();
  const { unlockedVaults, bonusSolved } = useGame();
  const [lockedDigit, setLockedDigit] = useState<number | null>(null);

  const progress = unlockedVaults.length;
  const complete = progress === 9;

  const handleSelect = (digit: number, state: VaultState) => {
    if (state === "locked") {
      setLockedDigit(digit);
      return;
    }
    navigate(`/challenge/${digit}`);
  };

  return (
    <div>
      <header>
        <Pressable onClick={() => navigate("/home")} aria-label="Back">
          Back
        </Pressable>
        <h1>Your Vault</h1>
        <p>Complete challenges to unlock digits!</p>
      </header>

      <div>
        <span>Status</span>
        <span>{complete ? "Vault ready to open" : `${progress} of 9 found`}</span>
      </div>

      <VaultBoard unlockedVaults={unlockedVaults} onSelect={handleSelect} />

      {complete ? (
        <PrimaryButton variant="reward" onClick={() => navigate("/vault-complete")}>
          OPEN THE VAULT
        </PrimaryButton>
      ) : (
        <Pressable onClick={() => navigate("/bonus-found")} disabled={bonusSolved}>
          {bonusSolved ? "Bonus complete" : "Complete all 9 to unlock the mega reward"}
        </Pressable>
      )}

      <Modal isOpen={lockedDigit !== null} onClose={() => setLockedDigit(null)}>
        <h2>Not yet</h2>
        <p>
          Digit {lockedDigit} opens as you clear the tiles ahead of it. Three are
          always available — pick whichever looks easiest.
        </p>
        <PrimaryButton onClick={() => setLockedDigit(null)}>GOT IT</PrimaryButton>
      </Modal>
    </div>
  );
}
