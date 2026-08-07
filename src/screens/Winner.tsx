import { useNavigate } from "react-router-dom";
import { PrimaryButton } from "../components/PrimaryButton";
import { useGame } from "../context/GameContext";
import type { LeaderboardEntry } from "../data/mockData";

/** Podium order on screen: 2nd, 1st, 3rd. */
const SLOTS = [2, 1, 3];

export function Winner() {
  const navigate = useNavigate();
  const { leaderboard } = useGame();

  return (
    <div>
      <h1>We have a winner</h1>

      <div>
        {SLOTS.map((rank) => {
          const entry: LeaderboardEntry | undefined = leaderboard[rank - 1];
          return (
            <div key={rank} data-rank={rank}>
              <span>{entry?.initials ?? "–"}</span>
              <span>{entry?.name ?? "Open"}</span>
              <span>{rank}</span>
            </div>
          );
        })}
      </div>

      <PrimaryButton onClick={() => navigate("/leaderboard")}>
        FULL LEADERBOARD
      </PrimaryButton>
    </div>
  );
}
