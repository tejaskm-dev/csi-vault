import { useNavigate } from "react-router-dom";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { VaultBoard } from "../components/VaultBoard";
import { useGame } from "../context/GameContext";
import type { VaultState } from "../components/VaultTile";

export function Home() {
  const navigate = useNavigate();
  const { username, unlockedVaults, bonusSolved, leaderboard } = useGame();

  const progress = unlockedVaults.length;
  /** Hero illustration earns its space only at the two ends of the run. */
  const showHero = progress === 0 || progress === 9;

  const handleSelect = (digit: number, state: VaultState) => {
    if (state === "locked") {
      navigate("/vault");
      return;
    }
    navigate(`/challenge/${digit}`);
  };

  return (
    <div>
      <header>
        <span>CSI ASIET</span>
        <span>{leaderboard.length} playing</span>
      </header>

      <h1>Operation Vault</h1>
      <p>9 Challenges. 1 Mission. Infinite Fun.</p>
      <p>Hey {username || "Recruit"}! Tap any vault to start unlocking digits.</p>

      {showHero ? (
        <div>{progress === 9 ? "[vault open]" : "[vault closed]"}</div>
      ) : (
        <VaultBoard unlockedVaults={unlockedVaults} onSelect={handleSelect} />
      )}

      <div>
        <span>{progress}/9 Digits</span>
        <span>{bonusSolved ? "1 Bonus" : "0 Bonus"}</span>
      </div>

      <PrimaryButton
        onClick={() => navigate(progress === 9 ? "/vault-complete" : "/vault")}
      >
        {progress === 9
          ? "OPEN THE VAULT"
          : progress > 0
            ? "RESUME MISSION"
            : "ENTER THE VAULT"}
      </PrimaryButton>

      <Pressable onClick={() => navigate("/leaderboard")}>
        View leaderboard
      </Pressable>
    </div>
  );
}
