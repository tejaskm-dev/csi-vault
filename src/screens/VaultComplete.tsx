import { useNavigate } from "react-router-dom";
import { PrimaryButton } from "../components/PrimaryButton";
import { StatBlock } from "../components/StatBlock";
import { VaultTile } from "../components/VaultTile";
import { useGame } from "../context/GameContext";
import { formatClock } from "../lib/utils";

/** The climax of the run. The one screen allowed to break from the base canvas. */
export function VaultComplete() {
  const navigate = useNavigate();
  const { unlockedVaults, elapsedSeconds, bonusSolved } = useGame();

  return (
    <div>
      <p>Mission accomplished</p>
      <h1>Vault Unlocked</h1>

      <div>[vault door swinging open]</div>

      <div>
        {Array.from({ length: 9 }, (_, i) => (
          <VaultTile
            key={i}
            digit={i + 1}
            state={unlockedVaults.includes(String(i + 1)) ? "solved" : "locked"}
            size="compact"
          />
        ))}
      </div>

      <div>
        <StatBlock tone="dark" number={`${unlockedVaults.length}/9`} label="Digits found" />
        <StatBlock tone="dark" number={formatClock(elapsedSeconds)} label="Run time" />
        <StatBlock tone="dark" number={bonusSolved ? "1" : "0"} label="Bonus" />
      </div>

      <PrimaryButton variant="reward" onClick={() => navigate("/leaderboard")}>
        VIEW LEADERBOARD
      </PrimaryButton>
    </div>
  );
}
