import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PrimaryButton } from "../components/PrimaryButton";
import { VaultTile } from "../components/VaultTile";
import { useGame } from "../context/GameContext";

export function Success() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { unlockVault, unlockedVaults } = useGame();

  const isBonus = id === "bonus";
  const digit = parseInt(id ?? "1", 10);

  // Mount the tile open, then flip it, so the unlock plays in front of the
  // player instead of arriving pre-solved.
  const [tileSolved, setTileSolved] = useState(false);
  const committed = useRef(false);

  useEffect(() => {
    if (!committed.current && !isBonus && id) {
      unlockVault(id);
      committed.current = true;
    }
    const t = setTimeout(() => setTileSolved(true), 260);
    return () => clearTimeout(t);
  }, [id, isBonus, unlockVault]);

  const remaining = 9 - unlockedVaults.length;
  const allDone = remaining === 0;

  return (
    <div>
      <h1>{isBonus ? "BONUS!" : "WOOHOO!"}</h1>

      {!isBonus && <VaultTile digit={digit} state={tileSolved ? "solved" : "active"} />}

      <p>{isBonus ? "Bonus cleared" : "Digit unlocked"}</p>
      <p>{isBonus ? "Nice spotting!" : `Digit ${digit} is yours`}</p>

      {/* This slot deliberately holds no XP counter — progression was cut. */}
      <p>
        {allDone
          ? "All 9 digits recovered"
          : `${remaining} ${remaining === 1 ? "vault" : "vaults"} left`}
      </p>

      <PrimaryButton onClick={() => navigate(allDone ? "/vault-complete" : "/vault")}>
        {allDone ? "OPEN THE VAULT" : "CONTINUE"}
      </PrimaryButton>
    </div>
  );
}
